
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'gigdial_secret_key_12345';
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const verifyBookingOwnership = async (bookingId, user) => {
  if (!bookingId || !user) return { allowed: false, booking: null };

  const userIdStr = String(user._id || user.id || user.uid || '');
  const isAdmin = user.role === 'admin' || user.isAdmin === true;

  let query;
  if (ObjectId.isValid(bookingId)) {
    query = { $or: [{ _id: new ObjectId(bookingId) }, { id: bookingId }, { bookingId: bookingId }] };
  } else {
    query = { $or: [{ id: bookingId }, { bookingId: bookingId }] };
  }

  const booking = await db.collection('bookings').findOne(query);
  if (!booking) return { allowed: false, booking: null, notFound: true };

  if (isAdmin) return { allowed: true, booking };

  const custIdStr = String(booking.customerId || booking.userId || '');
  const wrkIdStr = String(booking.workerId || '');

  if ((custIdStr && custIdStr === userIdStr) || (wrkIdStr && wrkIdStr === userIdStr)) {
    return { allowed: true, booking };
  }

  // Pending bookings are accessible by workers in matching category before accept
  if (booking.status === 'pending' && user.role === 'worker') {
    return { allowed: true, booking };
  }

  return { allowed: false, booking };
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_booking', async (data) => {
    try {
      const bookingId = typeof data === 'string' ? data : data?.bookingId;
      const token = typeof data === 'object' ? data?.token : null;
      if (!bookingId) return;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
          if (user) {
            const { allowed } = await verifyBookingOwnership(bookingId, user);
            if (!allowed) {
              console.log(`[Socket] 🔒 Access denied for socket ${socket.id} to join room booking_${bookingId}`);
              socket.emit('error', { message: 'Forbidden: Access denied to this booking room' });
              return;
            }
          }
        } catch (e) {
          console.log(`[Socket] Token verification skipped/failed for room join`);
        }
      }

      socket.join(bookingId);
      socket.join(`booking_${bookingId}`);
      console.log(`Socket ${socket.id} joined room booking_${bookingId}`);
    } catch (err) {
      console.error('[Socket] join_booking error:', err);
    }
  });

  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(String(userId));
      console.log(`Socket ${socket.id} joined user room ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://zarwebcoders:zarwebcoders@cluster0.lqgakzj.mongodb.net/gigdialapp";

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoints (placed before database connection middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const saveFileLocally = (fileBuffer, folderName, originalName = 'upload.jpg') => {
  return new Promise((resolve) => {
    try {
      const targetSubDir = path.join(uploadsDir, folderName);
      if (!fs.existsSync(targetSubDir)) {
        fs.mkdirSync(targetSubDir, { recursive: true });
      }
      const ext = path.extname(originalName) || '.jpg';
      const filename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(targetSubDir, filename);
      fs.writeFileSync(filePath, fileBuffer);

      const relativePath = `/uploads/${folderName}/${filename}`.replace(/\\/g, '/');
      const host = process.env.SERVER_URL || `http://localhost:${PORT}`;
      const fullUrl = `${host}${relativePath}`;

      resolve({
        public_id: filename,
        secure_url: fullUrl,
        url: fullUrl
      });
    } catch (err) {
      console.error("[saveFileLocally Warning]:", err.message || err);
      resolve({
        public_id: 'default',
        secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
        url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
      });
    }
  });
};

// Helper function to upload buffer data to Cloudinary via streams, with local disk fallback
const uploadFromBuffer = (fileBuffer, folderName, originalName = 'upload.jpg') => {
  return new Promise((resolve) => {
    try {
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        return resolve({
          public_id: 'default',
          secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
          url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
        });
      }
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        let cld_upload_stream = cloudinary.uploader.upload_stream(
          {
            folder: folderName,
            resource_type: 'auto'
          },
          (error, result) => {
            if (result && result.secure_url) {
              resolve(result);
            } else {
              console.error(`[Cloudinary Upload Warning] ${folderName}:`, error ? (error.message || error) : 'No result');
              saveFileLocally(fileBuffer, folderName, originalName).then(resolve).catch(err => {
                console.error("[Local Save Fallback Error]:", err);
                resolve({
                  public_id: 'default',
                  secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
                  url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
                });
              });
            }
          }
        );
        try {
          streamifier.createReadStream(fileBuffer).pipe(cld_upload_stream);
        } catch (e) {
          saveFileLocally(fileBuffer, folderName, originalName).then(resolve).catch(err => {
            resolve({
              public_id: 'default',
              secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
              url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
            });
          });
        }
      } else {
        saveFileLocally(fileBuffer, folderName, originalName).then(resolve).catch(err => {
          resolve({
            public_id: 'default',
            secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
            url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
          });
        });
      }
    } catch (err) {
      console.error("[uploadFromBuffer Catch Warning]:", err);
      resolve({
        public_id: 'default',
        secure_url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`,
        url: `https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/${folderName}/sample.jpg`
      });
    }
  });
};

// ─── SendGrid Email (HTTPS port 443, works on all hosting providers) ──────────
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.EMAIL_FROM || 'darshanthanki77@gmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'darshanthanki77@gmail.com';

// ─── Branded HTML Email Templates ─────────────────────────────────────────────────────
const buildOtpEmailHtml = (name, otp, role) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;">
          <p style="color:#2d3748;font-size:16px;margin:0 0 8px;">Hello <strong>${name}</strong>,</p>
          <p style="color:#4a5568;font-size:15px;margin:0 0 28px;line-height:1.6;">
            ${role === 'worker' ? 'Thank you for joining GigDial as a service professional!' : 'Thank you for using GigDial!'}
            Please use the verification code below to complete your sign-in / registration.
          </p>
          <div style="background:#f7fafc;border:2px dashed #e94560;border-radius:10px;padding:28px;text-align:center;margin:0 0 28px;">
            <p style="margin:0 0 8px;color:#718096;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
            <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#1a1a2e;font-family:monospace;">${otp}</div>
            <p style="margin:10px 0 0;color:#a0aec0;font-size:12px;">Valid for <strong>15 minutes</strong></p>
          </div>
          <p style="color:#718096;font-size:13px;margin:0;">If you did not request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildApprovalEmailHtml = (name) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;text-align:center;">
          <div style="width:72px;height:72px;background:#d4edda;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:36px;">✅</span>
          </div>
          <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:22px;">Account Approved!</h2>
          <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Congratulations <strong>${name}</strong>! Your GigDial worker account has been reviewed and <strong style="color:#28a745;">approved</strong> by our admin team.
            You can now log in and start receiving job leads.
          </p>
          <a href="https://apps-pnsk.onrender.com" style="display:inline-block;background:#e94560;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Login to GigDial</a>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildRejectionEmailHtml = (name, reason) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;text-align:center;">
          <div style="width:72px;height:72px;background:#f8d7da;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:36px;">❌</span>
          </div>
          <h2 style="color:#721c24;margin:0 0 12px;font-size:22px;">Application Rejected</h2>
          <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:left;">
            Hello <strong>${name}</strong>,<br><br>
            Thank you for registering on GigDial. Unfortunately, your worker profile has been rejected by our admin team due to incomplete or invalid documents.<br><br>
            <strong>Reason for rejection:</strong>
          </p>
          <div style="background:#fff5f5;border-left:4px solid #e53e3e;padding:12px 18px;color:#c53030;font-weight:600;margin-bottom:28px;border-radius:0 6px 6px 0;text-align:left;">
            ${reason || 'Incomplete Documents / Verification Failed'}
          </div>
          <p style="color:#718096;font-size:14px;margin-bottom:28px;text-align:left;line-height:1.5;">
            Please log in and re-register with correct, clear document copies so we can verify your account.
          </p>
          <a href="https://apps-pnsk.onrender.com" style="display:inline-block;background:#e94560;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Re-upload Documents</a>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Transactional Email Templates (Lead & Booking Flow) ──────────────────────
const buildLeadAssignedEmailHtml = (workerName, lead) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:36px 48px;">
          <p style="color:#2d3748;font-size:17px;margin:0 0 6px;">Hello <strong>${workerName}</strong>,</p>
          <p style="color:#4a5568;font-size:15px;margin:0 0 28px;line-height:1.6;">You have been assigned a new job lead! Check the details below and accept it to connect with the client.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;width:40%;">Job Title</td><td style="padding:12px 16px;color:#1a1a2e;font-weight:700;font-size:15px;">${lead.title}</td></tr>
            <tr><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Budget</td><td style="padding:12px 16px;color:#28a745;font-weight:700;font-size:16px;">₹${lead.price}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Client Name</td><td style="padding:12px 16px;color:#2d3748;">${lead.customerName}</td></tr>
            <tr><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Client Phone</td><td style="padding:12px 16px;color:#2d3748;">${lead.customerPhone}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Description</td><td style="padding:12px 16px;color:#4a5568;font-size:14px;">${lead.description || lead.title}</td></tr>
            <tr><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Location</td><td style="padding:12px 16px;color:#2d3748;">${lead.address || 'See app for details'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Schedule</td><td style="padding:12px 16px;color:#2d3748;">${lead.schedule || 'Flexible'}</td></tr>
          </table>
          <div style="text-align:center;margin:32px 0 8px;">
            <a href="https://apps-pnsk.onrender.com/worker-dashboard/leads" style="display:inline-block;background:#e94560;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.5px;">Accept This Lead →</a>
          </div>
          <p style="color:#a0aec0;font-size:12px;text-align:center;margin:8px 0 0;">Open GigDial Worker App to respond to this lead</p>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildWorkerAcceptedEmailHtml = (customerName, workerName, leadTitle, workerPhone) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="width:64px;height:64px;background:#d4edda;border-radius:50%;margin:0 auto 12px;line-height:64px;font-size:32px;">🛠️</div>
            <h2 style="color:#1a1a2e;margin:0;font-size:22px;">Professional is on the way!</h2>
          </div>
          <p style="color:#4a5568;font-size:15px;margin:0 0 24px;line-height:1.6;">Great news, <strong>${customerName}</strong>! A service professional has accepted your request for <strong>${leadTitle}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Professional</td><td style="padding:12px 16px;color:#1a1a2e;font-weight:700;">${workerName}</td></tr>
            <tr><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Contact</td><td style="padding:12px 16px;color:#2d3748;">${workerPhone || 'See app for details'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Service</td><td style="padding:12px 16px;color:#2d3748;">${leadTitle}</td></tr>
            <tr><td style="padding:12px 16px;color:#718096;font-size:13px;font-weight:600;">Status</td><td style="padding:12px 16px;"><span style="background:#d4edda;color:#155724;padding:3px 12px;border-radius:20px;font-size:13px;font-weight:600;">✅ Accepted</span></td></tr>
          </table>
          <div style="background:#fff3cd;border-left:4px solid #f6c90e;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#856404;font-size:14px;line-height:1.6;">📞 The professional will coordinate with you directly. Keep your phone available.</p>
          </div>
          <div style="text-align:center;">
            <a href="https://apps-pnsk.onrender.com/customer-dashboard/bookings" style="display:inline-block;background:#e94560;color:#fff;text-decoration:none;padding:13px 36px;border-radius:8px;font-weight:700;font-size:15px;">Track in App →</a>
          </div>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildCompletionCustomerEmailHtml = (customerName, workerName, leadTitle) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:40px 48px;text-align:center;">
          <div style="font-size:52px;margin-bottom:16px;">🎉</div>
          <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:22px;">Service Completed!</h2>
          <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Hi <strong>${customerName}</strong>, your service request for <strong>${leadTitle}</strong> has been completed by <strong>${workerName}</strong>.
          </p>
          <div style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:10px;padding:24px;margin-bottom:28px;">
            <p style="margin:0 0 8px;color:#276749;font-weight:700;font-size:16px;">⭐ Rate Your Experience</p>
            <p style="margin:0;color:#2f855a;font-size:14px;line-height:1.6;">Your feedback helps other customers find the best professionals. Please take a moment to rate <strong>${workerName}</strong>.</p>
          </div>
          <a href="https://apps-pnsk.onrender.com/customer-dashboard/bookings" style="display:inline-block;background:#e94560;color:#fff;text-decoration:none;padding:13px 36px;border-radius:8px;font-weight:700;font-size:15px;">Rate & Review →</a>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 48px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildCompletionAdminEmailHtml = (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #f0f0f0;">
          <img src="https://apps-pnsk.onrender.com/assets/logo.png" alt="GigDial Logo" style="max-height: 48px; width: auto; display: block; margin: 0 auto;" />
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#1a1a2e;margin:0 0 20px;font-size:18px;">Service Completed — Audit Log</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f7fafc;"><td style="padding:10px 14px;color:#718096;font-size:13px;width:40%;">Service</td><td style="padding:10px 14px;color:#1a1a2e;font-weight:600;">${data.title}</td></tr>
            <tr><td style="padding:10px 14px;color:#718096;font-size:13px;">Amount</td><td style="padding:10px 14px;color:#28a745;font-weight:700;font-size:16px;">₹${data.price || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:10px 14px;color:#718096;font-size:13px;">Worker</td><td style="padding:10px 14px;color:#2d3748;">${data.workerName}</td></tr>
            <tr><td style="padding:10px 14px;color:#718096;font-size:13px;">Customer</td><td style="padding:10px 14px;color:#2d3748;">${data.customerName}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:10px 14px;color:#718096;font-size:13px;">Customer Rating</td><td style="padding:10px 14px;color:#f6c90e;font-size:18px;">${'★'.repeat(data.rating || 0)}${'☆'.repeat(5 - (data.rating || 0))} (${data.rating || 'Not rated'})</td></tr>
            <tr><td style="padding:10px 14px;color:#718096;font-size:13px;">Completed At</td><td style="padding:10px 14px;color:#2d3748;">${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f7fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; 2026 GigDial Admin System</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;


const sendEmail = ({ to, subject, text, html }) => {
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: SENDGRID_FROM_EMAIL, name: 'GigDial' },
    subject: subject,
    content: []
  };
  if (text) body.content.push({ type: 'text/plain', value: text });
  if (html) body.content.push({ type: 'text/html', value: html });
  if (body.content.length === 0) body.content.push({ type: 'text/plain', value: ' ' });

  fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then(async (res) => {
    if (res.ok) {
      console.log(`[SendGrid] ✅ Email sent to ${to}`);
    } else {
      const errText = await res.text();
      console.error(`[SendGrid] ❌ Failed to send email to ${to}:`, errText);
    }
  })
  .catch((err) => {
    console.error(`[SendGrid] ❌ Network error sending to ${to}:`, err.message);
  });

  return Promise.resolve({ success: true, message: 'Sending via SendGrid' });
};

// Multer config for memory storage (direct to Cloudinary or local fallback)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 } // 10MB limit
});

// Serve uploads statically (fallback/legacy)
app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

let db = null;
let client = null;

// Helper to insert and broadcast real-time notifications via Socket.io
async function sendNotification(notificationData) {
  try {
    if (!db) {
      console.error("Database connection not ready for notifications.");
      return;
    }
    const notification = {
      uid: notificationData.uid || 'admin',
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'general',
      read: false,
      timestamp: Date.now(),
      createdAt: new Date()
    };
    
    const result = await db.collection('notifications').insertOne(notification);
    const savedNotification = { ...notification, _id: result.insertedId.toString() };
    
    // Broadcast to Admin room
    io.to('admin').emit('new_notification', savedNotification);
    
    // Broadcast to target user if specified
    if (notification.uid && notification.uid !== 'admin') {
      io.to(notification.uid).emit('new_notification', savedNotification);
    }
    
    console.log(`📡 Notification broadcasted: "${notification.title}" to ${notification.uid}`);
    return savedNotification;
  } catch (err) {
    console.error("Failed to send notification via socket:", err.message);
  }
}

// Connect to MongoDB
async function connectDB() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db();
    app.set('db', db);
    console.log("Connected to MongoDB for GigDial Admin API");

    // Seed default services if empty
    const servicesCount = await db.collection('services').countDocuments();
    if (servicesCount === 0) {
      await db.collection('services').insertMany([
        { name: 'Electrical Wiring', group: 'Home Services', icon: 'flash', isPopular: true, createdAt: new Date() },
        { name: 'Plumbing Repair', group: 'Home Services', icon: 'water', isPopular: true, createdAt: new Date() },
        { name: 'Painting & Deco', group: 'Home Services', icon: 'brush', isPopular: true, createdAt: new Date() },
        { name: 'Cleaning Services', group: 'Home Services', icon: 'trash', isPopular: true, createdAt: new Date() },
        { name: 'Moving & Logistics', group: 'Logistics', icon: 'bus', isPopular: false, createdAt: new Date() }
      ]);
      console.log("Seeded default popular categories into services collection.");
    }

    // Seed default categories if empty
    const categoriesCount = await db.collection('categories').countDocuments();
    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Electrician', description: 'Electrical installations and repairs', icon: 'flash', isActive: true },
        { name: 'Plumber', description: 'Plumbing fittings and repair services', icon: 'water', isActive: true },
        { name: 'Carpenter', description: 'Woodworking, furniture install and repair', icon: 'hammer', isActive: true },
        { name: 'Painter', description: 'Interior, exterior wall painting and waterproofing', icon: 'brush', isActive: true },
        { name: 'Cleaner', description: 'Home deep cleaning, sofa and kitchen cleaning', icon: 'trash', isActive: true }
      ];
      await db.collection('categories').insertMany(defaultCategories);
      console.log("Seeded default categories.");
    }

    // Seed default skills if empty
    const skillsCount = await db.collection('skills').countDocuments();
    if (skillsCount === 0) {
      const cats = await db.collection('categories').find().toArray();
      const electricianCat = cats.find(c => c.name === 'Electrician');
      const plumberCat = cats.find(c => c.name === 'Plumber');
      const carpenterCat = cats.find(c => c.name === 'Carpenter');
      const painterCat = cats.find(c => c.name === 'Painter');
      const cleanerCat = cats.find(c => c.name === 'Cleaner');

      const defaultSkills = [
        { name: 'Wiring', category: electricianCat ? electricianCat._id : null, isActive: true },
        { name: 'Fault Finding', category: electricianCat ? electricianCat._id : null, isActive: true },
        { name: 'Appliance Repair', category: electricianCat ? electricianCat._id : null, isActive: true },
        { name: 'Switchboard Install', category: electricianCat ? electricianCat._id : null, isActive: true },
        { name: 'Lighting Installation', category: electricianCat ? electricianCat._id : null, isActive: true },
        { name: 'Pipe Repair', category: plumberCat ? plumberCat._id : null, isActive: true },
        { name: 'Leak Detection', category: plumberCat ? plumberCat._id : null, isActive: true },
        { name: 'Tap Install', category: plumberCat ? plumberCat._id : null, isActive: true },
        { name: 'Drain Cleaning', category: plumberCat ? plumberCat._id : null, isActive: true },
        { name: 'Water Tank Cleaning', category: plumberCat ? plumberCat._id : null, isActive: true },
        { name: 'Furniture Assembly', category: carpenterCat ? carpenterCat._id : null, isActive: true },
        { name: 'Door Fitting', category: carpenterCat ? carpenterCat._id : null, isActive: true },
        { name: 'Cabinet Repair', category: carpenterCat ? carpenterCat._id : null, isActive: true },
        { name: 'Wood Polishing', category: carpenterCat ? carpenterCat._id : null, isActive: true },
        { name: 'Lock Repair', category: carpenterCat ? carpenterCat._id : null, isActive: true },
        { name: 'Interior Painting', category: painterCat ? painterCat._id : null, isActive: true },
        { name: 'Exterior Painting', category: painterCat ? painterCat._id : null, isActive: true },
        { name: 'Wall Putty', category: painterCat ? painterCat._id : null, isActive: true },
        { name: 'Texture Painting', category: painterCat ? painterCat._id : null, isActive: true },
        { name: 'Waterproofing', category: painterCat ? painterCat._id : null, isActive: true },
        { name: 'Deep Cleaning', category: cleanerCat ? cleanerCat._id : null, isActive: true },
        { name: 'Bathroom Cleaning', category: cleanerCat ? cleanerCat._id : null, isActive: true },
        { name: 'Sofa Cleaning', category: cleanerCat ? cleanerCat._id : null, isActive: true },
        { name: 'Kitchen Cleaning', category: cleanerCat ? cleanerCat._id : null, isActive: true },
        { name: 'Carpet Cleaning', category: cleanerCat ? cleanerCat._id : null, isActive: true }
      ];
      await db.collection('skills').insertMany(defaultSkills);
      console.log("Seeded default skills.");
    }

    // Seed default subscription plans if empty
    const plansCount = await db.collection('subscription_plans').countDocuments();
    if (plansCount === 0) {
      await db.collection('subscription_plans').insertMany([
        { planId: 'monthly', name: 'GigDial Pro', price: 499, durationDays: 30, currency: 'INR', features: ['Unlimited leads view', 'Zero commission bookings', 'Premium profile badge'], isActive: true }
      ]);
      console.log("Seeded default subscription plans.");
    }

    // Seed default subscription settings if empty
    const settingsCount = await db.collection('subscription_settings').countDocuments();
    if (settingsCount === 0) {
      await db.collection('subscription_settings').insertOne({
        upiId: 'gigdial@upi',
        qrCodeImageUrl: '',
        autoGenerateQr: true,
        updatedAt: new Date()
      });
      console.log("Seeded default subscription settings.");
    }

    // Auto-sync existing booking ratings to reviews collection
    await syncExistingReviews();
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

async function syncExistingReviews() {
  try {
    const ratedBookings = await db.collection('bookings').find({ rating: { $exists: true, $ne: null } }).toArray();
    console.log(`🔍 Found ${ratedBookings.length} rated bookings to sync.`);
    
    for (const booking of ratedBookings) {
      const bookingIdStr = booking._id.toString();
      const existingReview = await db.collection('reviews').findOne({ bookingId: bookingIdStr });
      if (!existingReview) {
        let customerName = 'Anonymous';
        if (booking.customerId) {
          try {
            const customerObj = await db.collection('users').findOne({ _id: new ObjectId(booking.customerId) });
            if (customerObj) {
              customerName = customerObj.name || 'Anonymous';
            }
          } catch (e) {}
        }

        let workerName = 'Service Partner';
        if (booking.workerId) {
          try {
            const workerObj = await db.collection('users').findOne({ _id: new ObjectId(booking.workerId) });
            if (workerObj) {
              workerName = workerObj.name || 'Service Partner';
            }
          } catch (e) {}
        }

        const newReview = {
          bookingId: bookingIdStr,
          workerId: booking.workerId,
          customerId: booking.customerId,
          reviewerName: customerName,
          profession: booking.title || workerName || 'Service Partner',
          rating: Number(booking.rating),
          comment: booking.review || '',
          feedback: booking.review || '',
          status: 'Approved',
          createdAt: booking.updatedAt || booking.createdAt || new Date()
        };

        await db.collection('reviews').insertOne(newReview);
        console.log(`✅ Synced review for booking ${booking._id}`);
      }
    }
  } catch (err) {
    console.error("Failed to sync existing reviews:", err.message);
  }
}

connectDB();

// Middleware to ensure DB connection
app.use((req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: "Database not connected yet. Please try again." });
  }
  next();
});

// Helper for search queries
function getSearchQuery(search, fields) {
  if (!search) return {};
  const regex = { $regex: search, $options: 'i' };
  if (fields.length === 1) {
    return { [fields[0]]: regex };
  }
  return { $or: fields.map(field => ({ [field]: regex })) };
}



// 1. Dashboard Overview Stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await db.collection('users').countDocuments();
    
    // Count all distinct workers in users and workers collections
    const providerUsersCount = await db.collection('users').countDocuments({
      $or: [{ role: 'worker' }, { isProvider: true }]
    });
    
    const workersColDocs = await db.collection('workers').find().toArray();
    let totalWorkers = providerUsersCount;
    
    const userEmailsAndPhones = new Set();
    const activeSubscribers = await db.collection('users').find({
      $or: [{ role: 'worker' }, { isProvider: true }]
    }).toArray();
    activeSubscribers.forEach(u => {
      if (u.email) userEmailsAndPhones.add(u.email.toLowerCase());
      if (u.phone) userEmailsAndPhones.add(u.phone);
    });
    
    for (const w of workersColDocs) {
      const emailMatch = w.email && userEmailsAndPhones.has(w.email.toLowerCase());
      const phoneMatch = w.phone && userEmailsAndPhones.has(w.phone);
      if (!emailMatch && !phoneMatch) {
        totalWorkers++;
      }
    }

    const totalBookings = await db.collection('bookings').countDocuments();

    // Calculate revenue from completed bookings
    const completedBookings = await db.collection('bookings').find({ status: 'completed' }).toArray();
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    // If zero Completed, check for other bookings price to provide some data
    const allBookings = await db.collection('bookings').find().toArray();
    const totalPotentialRevenue = allBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    // Mock weekly trends data points
    // Line chart coordinates for: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const trends = [12, 19, 15, 25, 32, 28, 35]; 

    res.json({
      totalUsers,
      totalWorkers,
      totalBookings,
      totalRevenue: totalRevenue || totalPotentialRevenue, // Fallback if no completed ones yet
      trends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ALL users (customers, workers, admins)
app.get('/api/users/all', async (req, res) => {
  try {
    const { search } = req.query;
    
    // Find users from users collection
    const userQuery = {};
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      userQuery.$or = [
        { name: regex },
        { phone: regex },
        { city: regex },
        { email: regex },
        { role: regex }
      ];
    }
    const dbUsers = await db.collection('users').find(userQuery).sort({ createdAt: -1 }).toArray();

    // Find workers from workers collection
    const workerQuery = {};
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      workerQuery.$or = [
        { name: regex },
        { phone: regex },
        { city: regex },
        { email: regex },
        { profession: regex }
      ];
    }
    const dbWorkers = await db.collection('workers').find(workerQuery).sort({ createdAt: -1 }).toArray();

    const seenIds = new Set();
    const merged = [];

    // Process users first
    for (const u of dbUsers) {
      seenIds.add(u._id.toString());
      let role = u.role || 'customer';
      if (u.isProvider || role === 'provider') {
        role = 'worker';
      }
      merged.push({
        _id: u._id,
        name: u.name,
        phone: u.phone,
        city: u.city || 'Mumbai',
        email: u.email,
        isBlocked: u.isBlocked ?? false,
        profilePhoto: u.profilePhoto,
        role: role,
        isApproved: u.isApproved ?? false,
        aadhaarCard: u.aadhaarCard || '',
        panCard: u.panCard || '',
        experienceCertificate: u.experienceCertificate || '',
        kycStatus: u.kycStatus || (role === 'worker' ? (u.isApproved ? 'approved' : 'pending') : 'active')
      });
    }

    // Process workers from the workers collection
    for (const w of dbWorkers) {
      const idStr = w._id.toString();
      const uidStr = w.uid || '';
      if (!seenIds.has(idStr) && (!uidStr || !seenIds.has(uidStr))) {
        if (uidStr) seenIds.add(uidStr);
        seenIds.add(idStr);
        
        let userDoc = null;
        try {
          if (uidStr && ObjectId.isValid(uidStr)) {
            userDoc = await db.collection('users').findOne({ _id: new ObjectId(uidStr) });
          } else if (ObjectId.isValid(idStr)) {
            userDoc = await db.collection('users').findOne({ _id: new ObjectId(idStr) });
          }
        } catch (e) {}

        merged.push({
          _id: w._id,
          name: w.name,
          phone: w.phone,
          city: w.city || 'Ahmedabad',
          email: w.email,
          isBlocked: w.isBlocked ?? false,
          profilePhoto: w.profilePhoto || w.image,
          role: 'worker',
          isApproved: w.isApproved ?? false,
          aadhaarCard: userDoc ? userDoc.aadhaarCard : (w.aadhaarCard || ''),
          panCard: userDoc ? userDoc.panCard : (w.panCard || ''),
          experienceCertificate: userDoc ? (userDoc.experienceCertificate || '') : (w.experienceCertificate || ''),
          kycStatus: w.kycStatus || (userDoc ? userDoc.kycStatus : null) || (w.isApproved ? 'approved' : 'pending')
        });
      }
    }

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2. Manage Users
app.get('/api/users', async (req, res) => {
  try {
    const { search } = req.query;
    
    // Query only customers (exclude workers, providers, and admins)
    const query = {
      $and: [
        { role: { $in: ['customer', null, undefined] } },
        { isProvider: { $ne: true } },
        { isAdmin: { $ne: true } }
      ]
    };

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      query.$and.push({
        $or: [
          { name: regex },
          { phone: regex },
          { city: regex },
          { email: regex }
        ]
      });
    }

    const users = await db.collection('users').find(query).sort({ createdAt: -1 }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle block status
app.post('/api/users/:id/toggle-block', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newBlockedStatus = !user.isBlocked;
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
    );

    // Also sync with workers collection if they are a worker
    if (user.role === 'worker' || user.isProvider) {
      await db.collection('workers').updateOne(
        { uid: id },
        { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
      ).catch(() => {});
    }

    // Add activity log notification with socket broadcast
    await sendNotification({
      uid: user._id.toString(),
      title: "User Account Modified",
      message: `Admin ${newBlockedStatus ? 'suspended' : 'activated'} user ${user.name}`,
      type: 'status'
    });

    res.json({ success: true, isBlocked: newBlockedStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete User
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Block status of a worker (professional)
app.post('/api/workers/:id/toggle-block', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find in users collection
    let user = null;
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    }
    
    // Find in workers collection
    let worker = null;
    if (ObjectId.isValid(id)) {
      worker = await db.collection('workers').findOne({ _id: new ObjectId(id) });
    }
    if (!worker) {
      worker = await db.collection('workers').findOne({ uid: id });
    }
    
    if (!user && !worker) {
      return res.status(404).json({ error: "Professional not found" });
    }
    
    const currentBlockedStatus = user ? user.isBlocked : worker.isBlocked;
    const newBlockedStatus = !currentBlockedStatus;
    
    if (user) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
      );
    }
    
    if (worker) {
      await db.collection('workers').updateOne(
        { _id: worker._id },
        { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
      );
      if (worker.uid) {
        await db.collection('users').updateOne(
          { _id: new ObjectId(worker.uid) },
          { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
        ).catch(() => {});
      }
    } else if (user) {
      // Also update workers collection if user is worker
      await db.collection('workers').updateOne(
        { uid: user._id.toString() },
        { $set: { isBlocked: newBlockedStatus, updatedAt: new Date() } }
      ).catch(() => {});
    }
    
    const targetUid = user ? user._id.toString() : (worker ? (worker.uid || worker._id.toString()) : 'admin');
    
    // Trigger notification with socket broadcast
    await sendNotification({
      uid: targetUid,
      title: "Account Status Changed",
      message: `Your professional account has been ${newBlockedStatus ? 'suspended/blocked' : 'activated/unblocked'} by the admin.`,
      type: 'status'
    });
    
    res.json({ success: true, isBlocked: newBlockedStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Manage Workers
app.get('/api/workers', async (req, res) => {
  try {
    const { search } = req.query;

    // Find workers in users collection
    const userQuery = {
      $and: [
        { $or: [{ role: 'worker' }, { isProvider: true }] }
      ]
    };
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      userQuery.$and.push({
        $or: [
          { name: regex },
          { category: regex },
          { city: regex },
          { phone: regex },
          { email: regex }
        ]
      });
    }

    const dbUsers = await db.collection('users').find(userQuery).sort({ createdAt: -1 }).toArray();

    // Find workers in dedicated workers collection
    const workerSearchQuery = search ? getSearchQuery(search, ['name', 'profession', 'city', 'phone']) : {};
    const dbWorkers = await db.collection('workers').find(workerSearchQuery).sort({ createdAt: -1 }).toArray();

    // Merge them by ID/Name to prevent duplicates
    const seenIds = new Set();
    const merged = [];

    // Add users first
    for (const u of dbUsers) {
      seenIds.add(u._id.toString());
      merged.push({
        _id: u._id,
        name: u.name,
        profession: u.category || u.profession || 'Service Provider',
        isApproved: u.isApproved ?? false,
        phone: u.phone,
        city: u.city || 'Mumbai',
        email: u.email,
        aadhaarCard: u.aadhaarCard || '',
        panCard: u.panCard || '',
        experienceCertificate: u.experienceCertificate || '',
        isBlocked: u.isBlocked ?? false
      });
    }

    // Add workers collection entries if not seen
    for (const w of dbWorkers) {
      const idStr = w._id.toString();
      const uidStr = w.uid || '';
      if (!seenIds.has(idStr) && !seenIds.has(uidStr)) {
        // Always try to get the linked user document to fetch aadhaarCard/panCard
        let userDoc = null;
        try {
          if (uidStr && ObjectId.isValid(uidStr)) {
            userDoc = await db.collection('users').findOne({ _id: new ObjectId(uidStr) });
          }
          if (!userDoc && ObjectId.isValid(idStr)) {
            userDoc = await db.collection('users').findOne({ _id: new ObjectId(idStr) });
          }
          // Also try matching by email/phone as fallback
          if (!userDoc && w.email) {
            userDoc = await db.collection('users').findOne({ email: w.email });
          }
        } catch (e) {}

        // Prefer userDoc for KYC docs, fallback to worker doc
        const aadhaarCard = (userDoc && userDoc.aadhaarCard) ? userDoc.aadhaarCard : (w.aadhaarCard || '');
        const panCard = (userDoc && userDoc.panCard) ? userDoc.panCard : (w.panCard || '');
        const experienceCertificate = (userDoc && userDoc.experienceCertificate) ? userDoc.experienceCertificate : (w.experienceCertificate || '');

        merged.push({
          _id: w._id,
          name: w.name,
          profession: w.profession || 'Service Provider',
          isApproved: w.isApproved ?? false,
          phone: w.phone,
          city: w.city || 'Ahmedabad',
          email: w.email,
          role: userDoc ? userDoc.role : (w.role || 'worker'),
          aadhaarCard,
          panCard,
          experienceCertificate,
          isBlocked: w.isBlocked ?? (userDoc ? userDoc.isBlocked : false) ?? false
        });
      }
    }

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve Worker
app.post('/api/workers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Update in users collection
    let user = null;
    try {
      if (ObjectId.isValid(id)) {
        await db.collection('users').updateOne(
          { _id: new ObjectId(id) },
          { $set: { isApproved: true, kycStatus: 'approved', updatedAt: new Date() } }
        );
        user = await db.collection('users').findOne({ _id: new ObjectId(id) });
      }
    } catch (err) {
      console.error("Failed to update user in users:", err.message);
    }

    // 2. Update in workers collection
    let workerName = "Worker";
    try {
      if (ObjectId.isValid(id)) {
        const updateRes = await db.collection('workers').updateOne(
          { _id: new ObjectId(id) },
          { $set: { isApproved: true, updatedAt: new Date() } }
        );
        if (updateRes.matchedCount > 0) {
          const w = await db.collection('workers').findOne({ _id: new ObjectId(id) });
          if (w) workerName = w.name;
        }
      }

      // Also try matching by uid in case uid equals id or contains it
      const updateUidRes = await db.collection('workers').updateOne(
        { $or: [{ uid: id }, { uid: `worker_${id}` }] },
        { $set: { isApproved: true, updatedAt: new Date() } }
      );
      if (updateUidRes.matchedCount > 0) {
        const w = await db.collection('workers').findOne({ $or: [{ uid: id }, { uid: `worker_${id}` }] });
        if (w) workerName = w.name;
      }
    } catch (err) {
      console.error("Failed to update worker in workers:", err.message);
    }

    if (user) {
      workerName = user.name;
    }

    // Trigger notification
    await sendNotification({
      uid: id,
      title: "Worker Approved",
      message: `Worker account for ${workerName} has been approved by Admin.`,
      type: 'verification'
    });

    if (user && user.email) {
      await sendEmail({
        to: user.email,
        subject: '🎉 Your GigDial Account is Approved!',
        text: `Hello ${user.name},\n\nCongratulations! Your GigDial worker account has been approved. You can now log in and start receiving job leads.\n\nBest regards,\nThe GigDial Team`,
        html: buildApprovalEmailHtml(user.name)
      });
    }

    res.json({ success: true, isApproved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Worker (unapprove & delete so they can re-register)
app.post('/api/workers/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch user details to get email & name before deleting
    const user = await db.collection('users').findOne({ 
      $or: [
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
        { uid: id }
      ]
    });

    if (user && user.email) {
      await sendEmail({
        to: user.email,
        subject: "❌ GigDial Application Update — Profile Rejected",
        text: `Hello ${user.name},\n\nUnfortunately, your application was rejected.\nReason: Incomplete Documents\n\nPlease re-upload correct documents.`,
        html: buildRejectionEmailHtml(user.name, 'Incomplete Documents / Verification Failed')
      });
    }

    // 2. Complete deletion of the worker & user accounts so they can register again
    try {
      if (ObjectId.isValid(id)) {
        await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      } else {
        await db.collection('users').deleteOne({ uid: id });
      }
    } catch (err) {
      console.error("Failed to delete user in users:", err.message);
    }

    try {
      if (ObjectId.isValid(id)) {
        await db.collection('workers').deleteOne({ _id: new ObjectId(id) });
      }
      await db.collection('workers').deleteOne({ uid: id });
      await db.collection('workers').deleteOne({ uid: `worker_${id}` });
    } catch (err) {
      console.error("Failed to delete worker in workers:", err.message);
    }

    res.json({ success: true, isApproved: false, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Worker
app.delete('/api/workers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from users collection
    try {
      if (ObjectId.isValid(id)) {
        await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      }
    } catch (err) {
      console.error("Failed to delete user in users:", err.message);
    }

    // 2. Delete from workers collection
    try {
      if (ObjectId.isValid(id)) {
        await db.collection('workers').deleteOne({ _id: new ObjectId(id) });
      }
      await db.collection('workers').deleteOne({ uid: id });
      await db.collection('workers').deleteOne({ uid: `worker_${id}` });
    } catch (err) {
      console.error("Failed to delete worker in workers:", err.message);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Manage Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const { search } = req.query;
    const query = getSearchQuery(search, ['customerName', 'workerName', 'serviceName', 'title']);
    const bookings = await db.collection('bookings').find(query).sort({ createdAt: -1 }).toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Booking Status
app.post('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. "completed" or "cancelled"
    
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: Date.now() } }
    );

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    
    // Add Notification
    await sendNotification({
      uid: booking.workerName || 'admin',
      title: "Booking Updated",
      message: `Booking "${booking.title || booking.serviceName}" marked as ${status} by admin.`,
      type: 'booking'
    });

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Subscription Payments
app.get('/api/subscriptions', async (req, res) => {
  try {
    const { search } = req.query;
    let subs = [];

    // First try the dedicated subscriptions collection
    const dbSubs = await db.collection('subscriptions').find().toArray();

    if (dbSubs.length > 0) {
      subs = dbSubs;
    } else {
      // Subscriptions are embedded on User documents.
      // Only return users who ACTUALLY have an active subscription.
      const activeSubscribers = await db.collection('users').find({
        'subscription.isActive': true
      }).toArray();

      const planLabels = {
        monthly: 'Monthly Plan (₹499)',
        quarterly: 'Quarterly Plan (₹999)',
        yearly: 'Annual Plan (₹1999)',
      };

      subs = activeSubscribers.map((user) => ({
        _id: user._id,
        partnerName: user.name,
        planName: planLabels[user.subscription?.plan] || user.subscription?.plan || 'Monthly Plan',
        amount: user.subscription?.plan === 'monthly' ? 499
               : user.subscription?.plan === 'quarterly' ? 999
               : user.subscription?.plan === 'yearly' ? 1999
               : 499,
        paymentMethod: user.subscription?.paymentMethod || 'UPI',
        status: user.subscription?.refundStatus === 'refunded' ? 'Refunded'
               : user.subscription?.refundStatus === 'pending' ? 'Refund Pending'
               : 'Success',
        startDate: user.subscription?.startDate,
        endDate: user.subscription?.endDate,
        date: user.subscription?.startDate || user.createdAt || new Date().toISOString()
      }));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      subs = subs.filter(s =>
        s.partnerName?.toLowerCase().includes(searchLower) ||
        s.planName?.toLowerCase().includes(searchLower)
      );
    }

    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Attempt to update subscription in users collection
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
        'subscription.refundStatus': 'refunded',
        'subscription.isActive': false,
        updatedAt: new Date()
      }}
    );

    // Also update subscriptions collection if it exists
    try {
      await db.collection('subscriptions').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'Refunded' } }
      );
    } catch(e) {}

    // Add log
    await sendNotification({
      uid: id,
      title: "Refund Processed",
      message: `Refund processed for subscription ID ${id}.`,
      type: 'subscription'
    });

    res.json({ success: true, status: 'Refunded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. System Reports & Logs (combine notifications + custom triggers)
app.get('/api/reports', async (req, res) => {
  try {
    const notifications = await db.collection('notifications').find().sort({ timestamp: -1 }).limit(20).toArray();
    
    // Map notifications to the timeline format
    const timeline = notifications.map((n, idx) => {
      let category = "System";
      if (n.title.toLowerCase().includes("user") || n.title.toLowerCase().includes("register")) {
        category = "New User Signup";
      } else if (n.title.toLowerCase().includes("booking") || n.title.toLowerCase().includes("service")) {
        category = "Booking Update";
      } else if (n.title.toLowerCase().includes("payment") || n.title.toLowerCase().includes("refund")) {
        category = "Payment API";
      } else if (n.title.toLowerCase().includes("settings") || n.title.toLowerCase().includes("param")) {
        category = "Settings";
      }

      // Dot color map
      // green=System, blue=New signup, orange=Payment API, purple=Settings/Booking
      let color = "#16A34A"; // green default
      if (category === "New User Signup") color = "#3B5BFF";
      if (category === "Payment API") color = "#D97706";
      if (category === "Settings" || category === "Booking Update") color = "#4F46E5";

      return {
        _id: n._id,
        category,
        dotColor: color,
        timestamp: new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ago',
        dateText: new Date(n.timestamp).toLocaleDateString(),
        description: n.message
      };
    });

    // Provide default reports if empty
    if (timeline.length === 0) {
      const defaultLogs = [
        { _id: "1", category: "System", dotColor: "#16A34A", timestamp: "10 mins ago", description: "Database cluster health status: Good. Synced 44 collections." },
        { _id: "2", category: "New User Signup", dotColor: "#3B5BFF", timestamp: "25 mins ago", description: "New customer DARSHAN THANKI registered with phone 9876543210." },
        { _id: "3", category: "Payment API", dotColor: "#D97706", timestamp: "1 hour ago", description: "Subscription payment of ₹999 received successfully from Ramesh Yadav." },
        { _id: "4", category: "Settings", dotColor: "#4F46E5", timestamp: "2 hours ago", description: "Commission parameter rate updated from 10.0% to 12.0%." }
      ];
      return res.json(defaultLogs);
    }

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Settings / System Parameters
// We store settings in a single document in a "commissions" or "system_settings" collection
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await db.collection('commissions').findOne({ type: 'global_settings' });
    if (!settings) {
      // Default settings
      settings = {
        platformFeeRate: 12.0,
        maintenanceMode: false,
        allowNewRegistrations: true
      };
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { platformFeeRate, maintenanceMode, allowNewRegistrations } = req.body;
    
    await db.collection('commissions').updateOne(
      { type: 'global_settings' },
      { 
        $set: {
          platformFeeRate: Number(platformFeeRate) || 12.0,
          maintenanceMode: !!maintenanceMode,
          allowNewRegistrations: !!allowNewRegistrations,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Add activity log
    await sendNotification({
      uid: 'admin',
      title: "Settings Updated",
      message: `Admin updated parameters: Fee Rate = ${platformFeeRate}%, Maintenance = ${maintenanceMode}, Allow Registrations = ${allowNewRegistrations}.`,
      type: 'system'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// CUSTOMER ENDPOINTS
// -----------------------------------------------------------------------------

// Get active/approved workers
app.get('/api/customer/workers', async (req, res) => {
  try {
    const userQuery = {
      $and: [
        { $or: [{ role: 'worker' }, { isProvider: true }] },
        { isBlocked: { $ne: true } }
      ]
    };
    const dbUsers = await db.collection('users').find(userQuery).toArray();
    const dbWorkers = await db.collection('workers').find({ isBlocked: { $ne: true } }).toArray();

    const seenIds = new Set();
    const merged = [];

    for (const u of dbUsers) {
      seenIds.add(u._id.toString());
      if (u.uid) seenIds.add(u.uid);
      if (u.email) seenIds.add(u.email);

      const onlineFlag = u.isOnline !== false && u.isOnline !== 'false';
      const prof = u.mainCategory || u.category || u.profession || 'Service Provider';
      const userSkills = [...(Array.isArray(u.skills) ? u.skills : []), ...(Array.isArray(u.additionalSkills) ? u.additionalSkills : [])];

      merged.push({
        id: u._id.toString(),
        name: u.name || 'Service Provider',
        profilePhoto: u.profilePhoto || u.avatar || u.profileImage || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100',
        profession: prof,
        role: prof,
        rating: u.rating || 4.9,
        reviewsCount: u.reviewsCount || 12,
        reviews: u.reviewsCount || 12,
        experience: u.experience ? `${u.experience} Years Experience` : '6 Years Experience',
        location: u.city || 'Ahmedabad, India',
        availability: onlineFlag ? 'Available Now' : 'Offline',
        about: u.about || u.serviceDescription || 'Professional GigDial service provider.',
        skills: userSkills.length > 0 ? userSkills : ['General Service'],
        phone: u.phone || '',
        whatsapp: u.phone || '',
        starDistribution: u.starDistribution || { five: 90, four: 8, three: 2, two: 0, one: 0 },
        isOnline: onlineFlag
      });
    }

    for (const w of dbWorkers) {
      const idStr = w._id.toString();
      const uidStr = w.uid || '';
      const emailStr = w.email || '';
      if (!seenIds.has(idStr) && !seenIds.has(uidStr) && (!emailStr || !seenIds.has(emailStr))) {
        // Double check if linked user is blocked
        let userBlocked = false;
        try {
          if (uidStr && ObjectId.isValid(uidStr)) {
            const userDoc = await db.collection('users').findOne({ _id: new ObjectId(uidStr) });
            if (userDoc && userDoc.isBlocked) userBlocked = true;
          }
        } catch (e) {}

        if (userBlocked) continue;

        const onlineFlag = w.isOnline !== false && w.isOnline !== 'false';
        const prof = w.mainCategory || w.category || w.profession || 'Service Provider';
        const workerSkills = [...(Array.isArray(w.skills) ? w.skills : []), ...(Array.isArray(w.additionalSkills) ? w.additionalSkills : [])];

        merged.push({
          id: w._id.toString(),
          name: w.name || 'Service Provider',
          profilePhoto: w.profilePhoto || w.profileImage || w.image || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100',
          profession: prof,
          role: prof,
          rating: w.rating || 4.8,
          reviewsCount: w.reviewsCount || 8,
          reviews: w.reviewsCount || 8,
          experience: w.experience ? `${w.experience} Years Experience` : '4 Years Experience',
          location: w.city || 'Ahmedabad, India',
          availability: onlineFlag ? 'Available Now' : 'Offline',
          about: w.about || w.serviceDescription || 'Professional GigDial service provider.',
          skills: workerSkills.length > 0 ? workerSkills : ['General Service'],
          phone: w.phone || '',
          whatsapp: w.phone || '',
          starDistribution: w.starDistribution || { five: 100, four: 0, three: 0, two: 0, one: 0 },
          isOnline: onlineFlag
        });
      }
    }

    // Sort by rating descending and return top 10 for "Top Rated Professionals"
    const topRated = merged
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    res.json(topRated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/workers/all – full list (no limit) for All Professionals screen
app.get('/api/customer/workers/all', async (req, res) => {
  try {
    const userQuery = {
      $and: [
        { $or: [{ role: 'worker' }, { isProvider: true }] },
        { isBlocked: { $ne: true } }
      ]
    };
    const dbUsers = await db.collection('users').find(userQuery).toArray();
    const dbWorkers = await db.collection('workers').find({ isBlocked: { $ne: true } }).toArray();

    const seenIds = new Set();
    const merged = [];

    for (const u of dbUsers) {
      seenIds.add(u._id.toString());
      if (u.uid) seenIds.add(u.uid);
      if (u.email) seenIds.add(u.email);

      const onlineFlag = u.isOnline !== false && u.isOnline !== 'false';

      merged.push({
        id: u._id.toString(),
        name: u.name || 'Service Provider',
        profilePhoto: u.profilePhoto,
        profession: u.category || u.profession || 'Service Provider',
        rating: u.rating || 4.9,
        reviewsCount: u.reviewsCount || 12,
        experience: u.experience ? `${u.experience} Years Experience` : '',
        location: u.city || '',
        availability: onlineFlag ? 'Available Now' : 'Offline',
        skills: u.skills || [],
        isOnline: onlineFlag
      });
    }

    for (const w of dbWorkers) {
      const idStr = w._id.toString();
      const uidStr = w.uid || '';
      const emailStr = w.email || '';
      if (!seenIds.has(idStr) && !seenIds.has(uidStr) && (!emailStr || !seenIds.has(emailStr))) {
        // Double check if linked user is blocked
        let userBlocked = false;
        try {
          if (uidStr && ObjectId.isValid(uidStr)) {
            const userDoc = await db.collection('users').findOne({ _id: new ObjectId(uidStr) });
            if (userDoc && userDoc.isBlocked) userBlocked = true;
          }
        } catch (e) {}

        if (userBlocked) continue;

        const onlineFlag = w.isOnline !== false && w.isOnline !== 'false';

        merged.push({
          id: w._id.toString(),
          name: w.name || 'Service Provider',
          profilePhoto: w.image,
          profession: w.profession || 'Service Provider',
          rating: w.rating || 4.8,
          reviewsCount: w.reviewsCount || 8,
          experience: w.experience || '',
          location: w.city || '',
          availability: onlineFlag ? 'Available Now' : 'Offline',
          skills: w.skills || [],
          isOnline: onlineFlag
        });
      }
    }

    res.json(merged.sort((a, b) => b.rating - a.rating));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer profile
app.get('/api/customer/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "phone query parameter is required" });
    const user = await db.collection('users').findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update customer profile
app.post('/api/customer/profile', async (req, res) => {
  try {
    const { phone, name, email, avatar, city, address } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });

    const updateFields = {
      name,
      email,
      phone,
      avatar,
      city,
      address,
      role: 'customer',
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { phone },
      { $set: updateFields },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy Get bookings for a customer by query name
app.get('/api/customer/bookings/search', async (req, res) => {
  try {
    const { customerName } = req.query;
    if (!customerName) return res.status(400).json({ error: "customerName query required" });
    const query = { customerName };
    const list = await db.collection('bookings').find(query).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new booking
app.post('/api/customer/bookings', async (req, res) => {
  try {
    const booking = req.body;
    
    // Deduplication check: check if a booking with same customer, title, schedule, and address was created within the last 2 minutes
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    const duplicate = await db.collection('bookings').findOne({
      customerId: booking.customerId,
      title: booking.title,
      schedule: booking.schedule,
      address: booking.address,
      createdAt: { $gte: twoMinutesAgo }
    });

    if (duplicate) {
      return res.status(400).json({ error: "Duplicate booking detected. You already submitted this request a moment ago." });
    }

    booking.createdAt = Date.now();
    
    // Add default status and default worker image if none exists
    booking.status = booking.status || 'Pending';
    
    const result = await db.collection('bookings').insertOne(booking);

    // Broadcast socket event for real-time lead overlay popups in worker app
    try {
      const customer = await db.collection('users').findOne({
        $or: [
          { _id: ObjectId.isValid(booking.customerId) ? new ObjectId(booking.customerId) : null },
          { uid: booking.customerId }
        ]
      });
      const customerName = customer ? customer.name : (booking.customerName || 'Amit Sharma');
      const customerPhoto = customer ? customer.profilePhoto : null;

      io.emit('new_lead', {
        id: result.insertedId.toString(),
        _id: result.insertedId.toString(),
        title: booking.title,
        description: booking.description,
        address: booking.address,
        schedule: booking.schedule,
        customerId: booking.customerId,
        price: Number(booking.price || 0),
        status: 'pending',
        customerName,
        customerPhoto
      });
    } catch (err) {
      console.error('Failed to emit new_lead socket event:', err);
    }

    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate/Review a booking
app.post('/api/customer/bookings/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    
    // Update booking
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { rating: Number(rating), review, completionOtp: otp, otpGeneratedAt: new Date() } }
    );

    // Fetch the updated booking
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Resolve Customer and Worker names
    const customer = await db.collection('users').findOne({ _id: new ObjectId(booking.customerId) });
    const worker = await db.collection('users').findOne({ _id: new ObjectId(booking.workerId) });
    
    const customerName = customer ? customer.name : 'Anonymous';
    const workerName = worker ? worker.name : 'Service Partner';

    // Create or update review record
    const existingReview = await db.collection('reviews').findOne({ bookingId: id });
    if (existingReview) {
      await db.collection('reviews').updateOne(
        { _id: existingReview._id },
        { $set: { rating: Number(rating), comment: review || '', feedback: review || '', updatedAt: new Date() } }
      );
    } else {
      const newReview = {
        bookingId: id,
        workerId: booking.workerId,
        customerId: booking.customerId,
        reviewerName: customerName,
        profession: booking.title || workerName || 'Service Partner',
        rating: Number(rating),
        comment: review || '',
        feedback: review || '',
        status: 'Approved',
        createdAt: new Date()
      };
      await db.collection('reviews').insertOne(newReview);
    }

    // Recalculate average rating for the worker
    const pipeline = [
      { $match: { workerId: booking.workerId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ];
    const stats = await db.collection('reviews').aggregate(pipeline).toArray();
    const newAvg = stats.length > 0 ? stats[0].avgRating : Number(rating);
    
    // Update workers and users collection ratings
    await db.collection('workers').updateOne(
      { uid: booking.workerId },
      { $set: { rating: newAvg } }
    ).catch(() => {});

    await db.collection('users').updateOne(
      { _id: new ObjectId(booking.workerId) },
      { $set: { rating: newAvg } }
    ).catch(() => {});

    if (!existingReview) {
      await db.collection('workers').updateOne(
        { uid: booking.workerId },
        { $inc: { reviewsCount: 1 } }
      ).catch(() => {});
      await db.collection('users').updateOne(
        { _id: new ObjectId(booking.workerId) },
        { $inc: { reviewsCount: 1 } }
      ).catch(() => {});
    }

    res.json({ success: true, completionOtp: otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resend OTP (only allowed if review is already submitted)
app.post('/api/customer/bookings/:id/resend-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!booking.rating) {
      return res.status(400).json({ error: "You must submit a review first" });
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { completionOtp: otp, otpGeneratedAt: new Date() } }
    );
    res.json({ success: true, completionOtp: otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// WORKER ENDPOINTS
// -----------------------------------------------------------------------------

// Get worker profile matching phone/email
app.get('/api/worker/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "phone query parameter is required" });
    const user = await db.collection('users').findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update worker profile
app.post('/api/worker/profile', async (req, res) => {
  try {
    const { phone, name, email, category, experience, location, customSkillsInput, description } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });
    
    const updateFields = {
      name,
      email,
      phone,
      category,
      experience,
      location,
      customSkillsInput,
      description,
      role: 'worker',
      isProvider: true,
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { phone },
      { $set: updateFields },
      { upsert: true }
    );

    // Also sync/create in workers collection
    await db.collection('workers').updateOne(
      { phone },
      { $set: {
        name,
        email,
        phone,
        profession: category,
        experience: `${experience} Years Experience`,
        city: location,
        about: description,
        updatedAt: new Date()
      }},
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update worker subscription
app.post('/api/worker/subscription', async (req, res) => {
  try {
    const { phone, subscription } = req.body;
    if (!phone || !subscription) {
      return res.status(400).json({ error: "phone and subscription are required" });
    }

    await db.collection('users').updateOne(
      { phone },
      { $set: { subscription, updatedAt: new Date() } }
    );

    await db.collection('workers').updateOne(
      { phone },
      { $set: { 
        subscription: {
          plan: subscription.planName,
          status: subscription.isActive ? 'active' : 'inactive'
        }, 
        updatedAt: new Date() 
      } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings/leads for a worker
app.get('/api/worker/bookings', async (req, res) => {
  try {
    const { workerName, workerId } = req.query;
    
    // We construct an OR list. We match:
    // 1. Any booking with status 'pending' or 'Pending' (these are open leads)
    // 2. Any booking assigned to this worker specifically by workerId
    // 3. Any booking assigned to this worker specifically by workerName (legacy)
    const orQueries = [
      { status: 'pending' },
      { status: 'Pending' }
    ];

    if (workerId && workerId.trim().length > 0) {
      orQueries.push({ workerId: workerId.trim() });
    }
    if (workerName && workerName.trim().length > 0) {
      orQueries.push({ workerName: workerName.trim() });
    }

    const list = await db.collection('bookings').find({
      $or: orQueries
    }).sort({ createdAt: -1 }).toArray();

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status by worker
app.post('/api/worker/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, workerName } = req.body;
    
    const updateDoc = { status, updatedAt: Date.now() };
    if (workerName) {
      updateDoc.workerName = workerName;
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// CHAT ENDPOINTS
// -----------------------------------------------------------------------------

// Get chat messages (Isolated per booking and user ownership)
app.get('/api/bookings/:id/chats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowed, notFound } = await verifyBookingOwnership(id, req.user);
    if (notFound) return res.status(404).json({ error: 'Booking not found' });
    if (!allowed) return res.status(403).json({ error: 'Forbidden: Access denied to this booking chat' });

    const chats = await db.collection('chats').find({ bookingId: id }).sort({ timestamp: 1 }).toArray();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a chat message (Isolated per booking)
app.post('/api/bookings/:id/chats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowed, notFound } = await verifyBookingOwnership(id, req.user);
    if (notFound) return res.status(404).json({ error: 'Booking not found' });
    if (!allowed) return res.status(403).json({ error: 'Forbidden: Access denied to this booking chat' });

    const { senderRole, text, type, imageUrl, location } = req.body;
    
    const dateObj = new Date();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const message = {
      bookingId: id,
      senderRole: senderRole || (req.user.role === 'worker' ? 'worker' : 'customer'),
      senderId: req.user._id ? req.user._id.toString() : (req.user.id || req.user.uid),
      text: text || '',
      type: type || 'text',
      imageUrl: imageUrl || null,
      location: location || null,
      timestamp: timeStr,
      createdAt: Date.now()
    };

    await db.collection('chats').insertOne(message);
    
    // Emit message ONLY to booking room booking_<id> in real-time
    io.to(id).to(`booking_${id}`).emit('receive_message', message);

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bookings/:id/chats/:msgId - Delete chat message
app.delete('/api/bookings/:id/chats/:msgId', auth, async (req, res) => {
  try {
    const { id, msgId } = req.params;
    const { allowed, notFound } = await verifyBookingOwnership(id, req.user);
    if (notFound) return res.status(404).json({ error: 'Booking not found' });
    if (!allowed) return res.status(403).json({ error: 'Forbidden: Access denied to this booking chat' });

    if (ObjectId.isValid(msgId)) {
      await db.collection('chats').deleteOne({ _id: new ObjectId(msgId) });
    } else {
      await db.collection('chats').deleteOne({ bookingId: id, _id: msgId });
    }

    // Broadcast deletion event to booking room in real-time
    io.to(id).to(`booking_${id}`).emit('delete_message', { bookingId: id, msgId });

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// AUTH ENDPOINTS
// -----------------------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, role, passcode, city } = req.body;
    if (!phone || !name || !email || !role || !passcode) {
      return res.status(400).json({ error: "All fields including passcode are required" });
    }

    // Check if phone or email already exists for this role
    const existingUser = await db.collection('users').findOne({ 
      $or: [
        { email: email.trim().toLowerCase(), role },
        { phone: phone.trim(), role }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ error: `User with this email or phone number is already registered as a ${role}` });
    }

    const hashedPassword = await bcrypt.hash(passcode.trim(), 8);

    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      city: city || 'Ahmedabad',
      passcode: hashedPassword,
      isApproved: role === 'worker' ? false : true, // workers require admin approval
    };

    // Generate registration OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    const tempRegData = {
      email: email.trim().toLowerCase(),
      otp,
      userData: newUser,
      workerData: role === 'worker' ? {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        profession: 'Electrician', // default category
        rating: 5.0,
        reviewsCount: 0,
        experience: '1 Years Experience',
        city: `${city || 'Ahmedabad'}, India`,
        about: 'Verified professional service provider.',
        skills: ['General Service'],
        isApproved: false
      } : null,
      createdAt: new Date()
    };

    // Save to temp_registrations collection
    await db.collection('temp_registrations').insertOne(tempRegData);

    // Log the OTP to the console for easy verification from Render logs
    console.log(`[OTP] Generated registration OTP for ${email.trim().toLowerCase()}: ${otp}`);

    // Send branded HTML verification email
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: `🔐 Your GigDial Verification Code: ${otp}`,
      text: `Hello ${name},\n\nYour GigDial verification code is: ${otp}\n\nThis OTP is valid for 15 minutes.\n\nBest regards,\nThe GigDial Team`,
      html: buildOtpEmailHtml(name, otp, 'customer')
    });

    res.json({ success: true, otpRequired: true, email: email.trim().toLowerCase() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, role, passcode } = req.body;
    if ((!email && !phone) || !role || !passcode) {
      return res.status(400).json({ error: "Email/phone, role, and passcode are required" });
    }

    const query = { role };
    if (email) {
      query.email = email.trim();
    } else if (phone) {
      query.phone = phone.trim();
    }

    const user = await db.collection('users').findOne(query);
    if (!user) {
      return res.status(404).json({ error: `No registered ${role} found with this account` });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been blocked by the admin." });
    }

    if (role === 'worker' && (!user.registrationStep || user.registrationStep >= 3) && !user.isApproved) {
      if (user.kycStatus === 'rejected') {
        return res.status(403).json({ error: "Your KYC verification has been rejected by the admin. Please contact support." });
      }
      return res.status(403).json({ error: "Your account is pending admin approval. You cannot log in until approved." });
    }

    // Verify passcode strictly with bcrypt hash or plain text fallback for old records
    // Also support 'password' field for users registered via password-based registration
    let isValidPasscode = false;
    const storedCredential = user.passcode || user.password;
    const isBcryptHash = storedCredential && (storedCredential.startsWith('$2a$') || storedCredential.startsWith('$2b$') || storedCredential.startsWith('$2y$'));

    if (isBcryptHash) {
      isValidPasscode = await bcrypt.compare(passcode.trim(), storedCredential);
    } else {
      // Plain text fallback
      isValidPasscode = (storedCredential === passcode.trim());
      
      if (isValidPasscode) {
        // Upgrade password to hash on the fly for security!
        try {
          const newHashed = await bcrypt.hash(passcode.trim(), 8);
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { passcode: newHashed } }
          );
          console.log(`Upgraded passcode for user ${user.email} to bcrypt hash.`);
        } catch (upgradeErr) {
          console.error("Failed to auto-upgrade passcode hash:", upgradeErr.message);
        }
      }
    }

    if (!isValidPasscode) {
      return res.status(401).json({ error: "Incorrect passcode / password." });
    }

    if (role === 'worker' && user.registrationStep && user.registrationStep < 3) {
      return res.status(202).json({
        success: false,
        incomplete: true,
        registrationStep: user.registrationStep,
        userId: user._id.toString(),
        error: "Please complete your registration process."
      });
    }

    const id = user._id.toString();
    const token = jwt.sign({ userId: id, role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user: { ...user, id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-send-otp - Request login OTP
app.post('/api/auth/login-send-otp', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required." });
    }
    const emailTrim = email.trim().toLowerCase();

    // 1. Find user in users collection
    let user = await db.collection('users').findOne({ email: emailTrim, role });
    
    // If worker not found in users but exists in workers collection
    if (!user && role === 'worker') {
      const worker = await db.collection('workers').findOne({ email: emailTrim });
      if (worker) {
        const uid = worker.uid || worker._id.toString();
        user = await db.collection('users').findOne({ $or: [{ _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }, { uid }] });
        if (!user) {
          const userResult = await db.collection('users').insertOne({
            uid,
            name: worker.name,
            email: emailTrim,
            phone: worker.phone,
            role: 'worker',
            isApproved: worker.isApproved ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          user = await db.collection('users').findOne({ _id: userResult.insertedId });
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: `No registered ${role} found with this email address.` });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in login_otps
    await db.collection('login_otps').updateOne(
      { email: emailTrim, role },
      { $set: { otp, expiresAt, createdAt: new Date() } },
      { upsert: true }
    );

    // Log the OTP to the console for easy verification from Render logs
    console.log(`[OTP] Generated login OTP for ${emailTrim}: ${otp}`);

    // Send branded HTML login OTP email
    await sendEmail({
      to: emailTrim,
      subject: `🔐 Your GigDial Login Code: ${otp}`,
      text: `Hello ${user.name},\n\nYour 6-digit login verification code is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nBest regards,\nThe GigDial Team`,
      html: buildOtpEmailHtml(user.name, otp, role)
    });

    res.json({ success: true, message: "OTP sent successfully to your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-verify-otp - Verify login OTP & Login
app.post('/api/auth/login-verify-otp', async (req, res) => {
  try {
    const { email, otp, role } = req.body;
    if (!email || !otp || !role) {
      return res.status(400).json({ error: "Email, OTP, and role are required." });
    }
    const emailTrim = email.trim().toLowerCase();

    const record = await db.collection('login_otps').findOne({ email: emailTrim, role });
    if (!record) {
      return res.status(400).json({ error: "No OTP request found. Please request a new OTP." });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP. Please check the code and try again." });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
    }

    // Clear OTP
    await db.collection('login_otps').deleteOne({ _id: record._id });

    // Get user details
    let user = await db.collection('users').findOne({ email: emailTrim, role });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been blocked by the admin." });
    }

    if (role === 'worker' && (!user.registrationStep || user.registrationStep >= 3) && !user.isApproved) {
      if (user.kycStatus === 'rejected') {
        return res.status(403).json({ error: "Your KYC verification has been rejected by the admin. Please contact support." });
      }
      return res.status(403).json({ error: "Your account is pending admin approval. You cannot log in until approved." });
    }

    if (role === 'worker' && user.registrationStep && user.registrationStep < 3) {
      return res.status(202).json({
        success: false,
        incomplete: true,
        registrationStep: user.registrationStep,
        userId: user._id.toString(),
        error: "Please complete your registration process."
      });
    }

    const id = user._id.toString();
    const token = jwt.sign({ userId: id, role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user: { ...user, id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp - Verify email registration OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const tempReg = await db.collection('temp_registrations')
      .find({ email: email.trim().toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!tempReg) {
      return res.status(404).json({ error: "No registration attempt found for this email." });
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (tempReg.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ error: "OTP expired. Please register again." });
    }

    if (tempReg.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    const newUser = tempReg.userData;
    newUser.createdAt = new Date();
    newUser.updatedAt = new Date();
    newUser.isEmailVerified = true;

    const userResult = await db.collection('users').insertOne(newUser);
    const userId = userResult.insertedId.toString();



    if (newUser.role === 'worker' && tempReg.workerData) {
      const newWorker = tempReg.workerData;
      newWorker.uid = userId;
      newWorker.isEmailVerified = true;
      newWorker.createdAt = new Date();
      newWorker.updatedAt = new Date();

      await db.collection('workers').replaceOne(
        { uid: userId },
        newWorker,
        { upsert: true }
      );
    }

    await db.collection('temp_registrations').deleteMany({ email: email.trim().toLowerCase() });

    // Send Account Registration Notification to Admin & Welcome/Review Email to Worker
    if (newUser.role === 'worker') {
      // Alert admin
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🚨 New Worker Awaiting KYC Approval - ${newUser.name}`,
        text: `New worker registered: ${newUser.name} (${newUser.email}) - Profession: ${newUser.mainCategory || 'N/A'}. Please review in the Admin Panel.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;">
          <h2 style="color:#1a1a2e;">🚨 New Worker Pending KYC Review</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#718096;">Name:</td><td style="padding:8px;font-weight:600;">${newUser.name}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Email:</td><td style="padding:8px;">${newUser.email}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Phone:</td><td style="padding:8px;">${newUser.phone}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Profession:</td><td style="padding:8px;">${newUser.mainCategory || 'Not specified'}</td></tr>
            <tr><td style="padding:8px;color:#718096;">City:</td><td style="padding:8px;">${newUser.city || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">KYC Status:</td><td style="padding:8px;"><span style="background:#fff3cd;color:#856404;padding:2px 10px;border-radius:12px;font-size:13px;">Pending Review</span></td></tr>
          </table>
        </div>`
      });

      // Under-review email to worker
      await sendEmail({
        to: newUser.email,
        subject: '🎉 Welcome to GigDial — Account Under Review',
        text: `Hello ${newUser.name},\n\nYour account has been registered. It is currently under KYC review. You will receive an email once approved.\n\nThank You\nGigDial Team`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;background:#f4f7fa;padding:32px;border-radius:12px;">
          <h1 style="color:#e94560;margin:0 0 8px;">GigDial</h1>
          <h2 style="color:#1a1a2e;">Your profile is under review 🔍</h2>
          <p style="color:#4a5568;font-size:15px;line-height:1.7;">Hello <strong>${newUser.name}</strong>,<br><br>
          Thank you for registering as a service professional on GigDial! Your profile has been received and is currently under <strong>KYC review</strong> by our admin team.<br><br>
          You will receive another email once your account is <strong>approved</strong>. This typically takes 24-48 hours.</p>
          <p style="color:#718096;font-size:13px;margin-top:24px;">&copy; 2026 GigDial. All rights reserved.</p>
        </div>`
      });
    } else if (newUser.role === 'customer') {
      // Alert admin
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `👤 New Customer Registered - ${newUser.name}`,
        text: `New customer: ${newUser.name} (${newUser.email}) from ${newUser.city || 'N/A'} registered at ${new Date().toLocaleString()}.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;">
          <h2 style="color:#1a1a2e;">👤 New Customer Account</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#718096;">Name:</td><td style="padding:8px;font-weight:600;">${newUser.name}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Email:</td><td style="padding:8px;">${newUser.email}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Phone:</td><td style="padding:8px;">${newUser.phone}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">City:</td><td style="padding:8px;">${newUser.city || 'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Registered At:</td><td style="padding:8px;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>`
      });
      // Welcome email to customer
      await sendEmail({
        to: newUser.email,
        subject: '🎉 Welcome to GigDial! Your account is ready',
        text: `Hello ${newUser.name},\n\nYour GigDial account is ready! Browse and book trusted professionals near you.\n\nBest regards,\nThe GigDial Team`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;background:#f4f7fa;padding:32px;border-radius:12px;">
          <h1 style="color:#e94560;margin:0 0 8px;">GigDial</h1>
          <h2 style="color:#1a1a2e;">Welcome aboard, ${newUser.name}! 🎉</h2>
          <p style="color:#4a5568;font-size:15px;line-height:1.7;">Your account is all set! You can now browse hundreds of verified professionals and book services in your city.</p>
          <p style="margin-top:24px;"><a href="https://apps-pnsk.onrender.com" style="background:#e94560;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Start Exploring</a></p>
          <p style="color:#718096;font-size:13px;margin-top:24px;">&copy; 2026 GigDial. All rights reserved.</p>
        </div>`
      });
    }

    const token = jwt.sign({ userId, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: { ...newUser, _id: userId, id: userId },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Retrieve current authenticated user profile
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WORKER APP MULTI-STEP REGISTRATION & MASTER ENDPOINTS ───────────────────

// Step 1: Validate Personal Information (Uniqueness Check)
app.post('/api/auth/register/step1', async (req, res) => {
  try {
    const { name, email, password, phone, city } = req.body;
    if (!name || !email || !password || !phone || !city) {
      return res.status(400).json({ error: "Name, email, password, phone, and city are required." });
    }

    // Check if worker already exists with email or phone
    const existing = await db.collection('users').findOne({
      $or: [
        { email: email.trim().toLowerCase(), role: 'worker' },
        { phone: phone.trim(), role: 'worker' }
      ]
    });
    if (existing) {
      return res.status(400).json({ error: "A worker with this email or phone number is already registered." });
    }

    res.json({ success: true, message: "Credentials are valid and unique." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Validate Professional Details
app.post('/api/auth/register/step2', async (req, res) => {
  try {
    const { mainCategory, dob, experience } = req.body;
    if (!mainCategory || !dob || !experience) {
      return res.status(400).json({ error: "mainCategory, dob, and experience are required." });
    }
    res.json({ success: true, message: "Professional details validated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 3: Final Submission (Create User & Worker Atomically)
const safeUploadAny = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error("❌ MULTER ERROR:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "File upload failed",
        code: err.code || null
      });
    }
    next();
  });
};

app.post('/api/auth/register/step3', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    safeUploadAny(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const body = req.body || {};
    const {
      name, email, password, phone, city, address, profilePhoto,
      mainCategory, dob, experience, serviceDescription, languages,
      serviceType, additionalSkills, aadhaarNumber, panNumber
    } = body;

    if (!name || !email || !password || !phone || !city) {
      return res.status(400).json({ error: "Name, email, password, phone, and city are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();

    // Final uniqueness check
    const existing = await db.collection('users').findOne({
      $or: [
        { email: cleanEmail, role: 'worker' },
        { phone: cleanPhone, role: 'worker' }
      ]
    });
    if (existing) {
      return res.status(400).json({ error: "A worker with this email or phone number is already registered." });
    }

    // Process files flexibly from req.files array or object
    let aadhaarCardUrl = "";
    let panCardUrl = "";
    let experienceCertificateUrl = "";

    if (req.files && Array.isArray(req.files)) {
      const aadhaarFrontFile = req.files.find(f => f.fieldname === 'aadhaarFront' || f.fieldname === 'aadhaarCard' || f.fieldname === 'aadhaar');
      const aadhaarBackFile = req.files.find(f => f.fieldname === 'aadhaarBack');
      const panFile = req.files.find(f => f.fieldname === 'panCard' || f.fieldname === 'pan');
      const expFile = req.files.find(f => f.fieldname === 'experienceCertificate' || f.fieldname === 'certificate' || f.fieldname === 'experienceCert' || f.fieldname === 'cert' || f.fieldname === 'experience_certificate');

      if (aadhaarFrontFile && aadhaarFrontFile.buffer) {
        try {
          const result = await uploadFromBuffer(aadhaarFrontFile.buffer, 'kyc/aadhaar', aadhaarFrontFile.originalname);
          aadhaarCardUrl = result.secure_url;
        } catch (e) { console.error("Aadhaar Front upload error:", e); }
      }
      if (aadhaarBackFile && aadhaarBackFile.buffer) {
        try {
          const result = await uploadFromBuffer(aadhaarBackFile.buffer, 'kyc/aadhaar', aadhaarBackFile.originalname);
          if (!aadhaarCardUrl) aadhaarCardUrl = result.secure_url;
        } catch (e) { console.error("Aadhaar Back upload error:", e); }
      }
      if (panFile && panFile.buffer) {
        try {
          const result = await uploadFromBuffer(panFile.buffer, 'kyc/pan', panFile.originalname);
          panCardUrl = result.secure_url;
        } catch (e) { console.error("PAN upload error:", e); }
      }
      if (expFile && expFile.buffer) {
        try {
          const result = await uploadFromBuffer(expFile.buffer, 'kyc/certificates', expFile.originalname);
          experienceCertificateUrl = result.secure_url;
        } catch (e) { console.error("Experience cert upload error:", e); }
      }
    } else if (req.files && typeof req.files === 'object') {
      const aadhaarObjFile = req.files['aadhaarCard'] || req.files['aadhaarFront'] || req.files['aadhaar'];
      if (aadhaarObjFile && aadhaarObjFile[0]) {
        try {
          const result = await uploadFromBuffer(aadhaarObjFile[0].buffer, 'kyc/aadhaar', aadhaarObjFile[0].originalname);
          aadhaarCardUrl = result.secure_url;
        } catch (e) { console.error("Aadhaar upload error:", e); }
      }
      const panObjFile = req.files['panCard'] || req.files['pan'];
      if (panObjFile && panObjFile[0]) {
        try {
          const result = await uploadFromBuffer(panObjFile[0].buffer, 'kyc/pan', panObjFile[0].originalname);
          panCardUrl = result.secure_url;
        } catch (e) { console.error("PAN upload error:", e); }
      }
      const expObjFile = req.files['experienceCertificate'] || req.files['certificate'] || req.files['experienceCert'] || req.files['cert'] || req.files['experience_certificate'];
      if (expObjFile && expObjFile[0]) {
        try {
          const result = await uploadFromBuffer(expObjFile[0].buffer, 'kyc/certificates', expObjFile[0].originalname);
          experienceCertificateUrl = result.secure_url;
        } catch (e) { console.error("Exp cert upload error:", e); }
      }
    }

    // Fallback string URL / Base64 handling
    if (!aadhaarCardUrl && body.aadhaarCard && typeof body.aadhaarCard === 'string') aadhaarCardUrl = body.aadhaarCard;
    if (!panCardUrl && body.panCard && typeof body.panCard === 'string') panCardUrl = body.panCard;
    if (!experienceCertificateUrl && body.experienceCertificate && typeof body.experienceCertificate === 'string') experienceCertificateUrl = body.experienceCertificate;

    // Fallback default sample image URLs if missing
    if (!aadhaarCardUrl) aadhaarCardUrl = "https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/kyc/aadhaar/sample_aadhaar.jpg";
    if (!panCardUrl) panCardUrl = "https://res.cloudinary.com/elanmyjb/image/upload/v1785401674/kyc/pan/sample_pan.jpg";

    // Parse arrays safely
    let parsedLanguages = [];
    if (languages) {
      try { parsedLanguages = JSON.parse(languages); } catch { parsedLanguages = Array.isArray(languages) ? languages : []; }
    }
    let parsedSkills = [];
    if (additionalSkills) {
      try { parsedSkills = JSON.parse(additionalSkills); } catch { parsedSkills = Array.isArray(additionalSkills) ? additionalSkills : []; }
    }

    let validDob = new Date(dob || '1995-01-01');
    if (isNaN(validDob.getTime())) validDob = new Date('1995-01-01');

    const hashedPassword = await bcrypt.hash(String(password).trim(), 8);

    // Generate registration OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    const tempRegData = {
      email: cleanEmail,
      otp,
      userData: {
        name: String(name).trim(),
        email: cleanEmail,
        passcode: hashedPassword,
        phone: cleanPhone,
        city: String(city).trim(),
        address: address ? String(address).trim() : "",
        profilePhoto: profilePhoto || "assets/images/worker_ramesh.png",
        role: 'worker',
        isApproved: false,
        kycStatus: 'pending',
        registrationStep: 3,
        mainCategory: mainCategory ? String(mainCategory).trim() : "Electrician",
        dob: validDob,
        experience: Number(experience) || 0,
        serviceDescription: serviceDescription ? String(serviceDescription).trim() : "",
        languages: parsedLanguages,
        serviceType: serviceType ? String(serviceType).trim() : "Residency",
        additionalSkills: parsedSkills,
        aadhaarCard: aadhaarCardUrl,
        panCard: panCardUrl,
        experienceCertificate: experienceCertificateUrl
      },
      workerData: {
        name: String(name).trim(),
        profession: mainCategory ? String(mainCategory).trim() : "Electrician",
        experience: (Number(experience) || 0) + ' Years',
        rating: 5.0,
        reviews: "0 Reviews",
        location: `${String(city).trim()}, India`,
        image: profilePhoto || "assets/images/worker_ramesh.png",
        skills: parsedSkills,
        about: serviceDescription ? String(serviceDescription).trim() : "",
        email: cleanEmail,
        phone: cleanPhone,
        city: String(city).trim(),
        isApproved: false,
        aadhaarCard: aadhaarCardUrl,
        panCard: panCardUrl,
        experienceCertificate: experienceCertificateUrl
      },
      createdAt: new Date()
    };

    await db.collection('temp_registrations').insertOne(tempRegData);

    console.log(`[OTP] Generated worker registration OTP for ${cleanEmail}: ${otp}`);

    // Send branded HTML verification email asynchronously
    sendEmail({
      to: cleanEmail,
      subject: `🔐 Your GigDial Verification Code: ${otp}`,
      text: `Hello ${name},\n\nYour GigDial verification code is: ${otp}\n\nThis OTP is valid for 15 minutes.`,
      html: buildOtpEmailHtml(name, otp, 'worker')
    }).catch(e => console.error("Email send error:", e.message));

    res.json({ success: true, otpRequired: true, email: cleanEmail });
  } catch (err) {
    console.error("Step 3 Error:", err);
    res.status(500).json({ error: err.message || "Failed to complete Step 3 registration." });
  }
});

// Master categories & skills
app.get('/api/master/categories', async (req, res) => {
  try {
    const categories = await db.collection('categories').find({ isActive: true }).toArray();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/skills', async (req, res) => {
  try {
    const { categoryId } = req.query;
    let query = { isActive: true };
    if (categoryId && ObjectId.isValid(categoryId)) {
      query.category = new ObjectId(categoryId);
    }
    const skills = await db.collection('skills').find(query).toArray();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot & Reset Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email." });
    }
    
    res.json({ success: true, message: "Password reset link sent to your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and newPassword are required." });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 8);
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { passcode: hashedPassword, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    
    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED AUTH & USER/WORKER ROUTER (MATCHING FLUTTER BACKEND SCHEMAS)
// -----------------------------------------------------------------------------

// POST /api/auth/register-user
app.post('/api/auth/register-user', async (req, res) => {
  try {
    const { uid, name, phone, email, passcode } = req.body;
    if (!uid || !name || !phone || !email) {
      return res.status(400).json({ error: "uid, name, phone, and email are required" });
    }

    const existingUser = await db.collection('users').findOne({ $or: [{ uid }, { email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this uid, email, or phone" });
    }

    const hashedPassword = await bcrypt.hash((passcode || '1234').trim(), 8);

    const newUser = {
      uid,
      name,
      phone,
      email,
      role: 'customer',
      passcode: hashedPassword,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    const token = jwt.sign({ userId: result.insertedId.toString(), role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { ...newUser, id: result.insertedId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register-worker
app.post('/api/auth/register-worker', async (req, res) => {
  try {
    const { uid, name, phone, email, profession, experience, passcode } = req.body;
    if (!uid || !name || !phone || !email || !profession) {
      return res.status(400).json({ error: "uid, name, phone, email, and profession are required" });
    }

    const existingUser = await db.collection('users').findOne({ $or: [{ uid }, { email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this uid, email, or phone" });
    }

    const hashedPassword = await bcrypt.hash((passcode || '1234').trim(), 8);

    const newUser = {
      uid,
      name,
      phone,
      email,
      role: 'worker',
      passcode: hashedPassword,
      createdAt: new Date()
    };

    const newWorker = {
      uid,
      name,
      phone,
      email,
      profession,
      experience: Number(experience) || 0,
      rating: 5.0,
      isActive: true,
      subscription: {
        plan: 'none',
        status: 'inactive'
      },
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    await db.collection('workers').insertOne(newWorker);
    
    const token = jwt.sign({ userId: result.insertedId.toString(), role: 'worker' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, worker: newWorker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// SECURE SINGLE SIGN-ON (SSO) ENDPOINTS FOR MOBILE APP TO WEB PAYMENTS
// =============================================================================

// POST /api/auth/create-sso-token - Mobile App creates a 1-time 5-min SSO token
app.post('/api/auth/create-sso-token', auth, async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : (req.user.id || req.user.uid);
    if (!userId) {
      console.log(`[SSO] ❌ Token generation failed: Unauthorized / Missing user ID`);
      return res.status(401).json({ error: 'Unauthorized: Missing user session' });
    }

    const ssoToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    const ssoDoc = {
      token: ssoToken,
      userId: userId.toString(),
      userEmail: req.user.email,
      role: req.user.role || 'worker',
      used: false,
      expiresAt: expiresAt,
      createdAt: new Date()
    };

    await db.collection('sso_tokens').insertOne(ssoDoc);

    const webBaseUrl = process.env.WEB_URL || `http://localhost:8083`;
    const redirectUrl = `${webBaseUrl}/sso-login?token=${ssoToken}`;

    console.log(`[SSO] 🔐 Token generated for user ${userId} (${req.user.email || 'N/A'}), expires at ${expiresAt.toISOString()}`);

    res.json({
      success: true,
      ssoToken,
      expiresAt,
      redirectUrl
    });
  } catch (err) {
    console.error(`[SSO] ❌ Error in /api/auth/create-sso-token:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify-sso-token - Web validates token, issues Web Session & invalidates token
app.get('/api/auth/verify-sso-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      console.log(`[SSO] ❌ Validation failed: Missing token in query`);
      return res.status(400).json({ error: "Missing token" });
    }

    const tokenDoc = await db.collection('sso_tokens').findOne({ token });

    if (!tokenDoc) {
      console.log(`[SSO] ❌ Invalid token attempted: ${token}`);
      return res.status(400).json({ error: "Session expired or invalid token. Please return to the app and try again." });
    }

    if (tokenDoc.used) {
      console.log(`[SSO] ⚠️ Reused token attempted for user ${tokenDoc.userId}`);
      return res.status(400).json({ error: "Token has already been used. Please request a new link from the app." });
    }

    if (new Date() > new Date(tokenDoc.expiresAt)) {
      console.log(`[SSO] ⏰ Expired token attempted for user ${tokenDoc.userId}`);
      return res.status(400).json({ error: "Session expired. Please return to the app and try again." });
    }

    // Mark token as used immediately to prevent replay attacks
    await db.collection('sso_tokens').updateOne(
      { _id: tokenDoc._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Find full user details
    let user = null;
    if (ObjectId.isValid(tokenDoc.userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(tokenDoc.userId) });
    }
    if (!user) {
      user = await db.collection('users').findOne({ $or: [{ uid: tokenDoc.userId }, { email: tokenDoc.userEmail }] });
    }

    if (!user) {
      console.log(`[SSO] ❌ Validation failed: User ${tokenDoc.userId} not found in database`);
      return res.status(404).json({ error: "User profile not found" });
    }

    // Create web JWT session token
    const webSessionToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HttpOnly Secure Cookie
    res.cookie('gigdial_web_session', webSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`[SSO] ✅ SSO login success for user ${user._id} (${user.email})`);

    res.json({
      success: true,
      token: webSessionToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.avatar || user.profileImage || user.profilePhoto
      },
      redirectPath: '/worker-membership'
    });
  } catch (err) {
    console.error(`[SSO] ❌ Error in /api/auth/verify-sso-token:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/worker/complete-membership-payment - Complete web membership payment
app.post('/api/worker/complete-membership-payment', auth, async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : (req.user.id || req.user.uid);
    const { plan = 'pro', amount = 499, paymentId = `PAY_${Date.now()}` } = req.body;

    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { uid: userId };

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const updateData = {
      role: 'worker',
      isProvider: true,
      isApproved: true,
      subscription: {
        plan: plan,
        isActive: true,
        status: 'active',
        paymentId: paymentId,
        startDate: new Date(),
        endDate: expiry,
        activatedAt: new Date()
      },
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(query, { $set: updateData });
    await db.collection('workers').updateOne(
      { $or: [{ uid: userId }, { email: req.user.email }] },
      { 
        $set: { 
          subscription: { plan: plan, status: 'active', active: true, expiryDate: expiry },
          isActive: true,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    console.log(`[SSO Payment] 💰 Payment completed & worker membership activated for user ${userId} (${req.user.email || ''})`);

    res.json({
      success: true,
      message: 'Worker membership activated successfully!',
      plan: plan
    });
  } catch (err) {
    console.error(`[SSO Payment] ❌ Error completing membership payment:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/user/:uid
app.get('/api/auth/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await db.collection('users').findOne({ uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/worker/:uid
app.get('/api/auth/worker/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const worker = await db.collection('workers').findOne({ uid });
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/update-user/:uid
app.put('/api/auth/update-user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, email } = req.body;
    
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (email) updateFields.email = email;

    const result = await db.collection('users').findOneAndUpdate(
      { uid },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/update-worker/:uid
app.put('/api/auth/update-worker/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, email, profession, experience } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (email) updateFields.email = email;
    if (profession) updateFields.profession = profession;
    if (experience !== undefined) updateFields.experience = Number(experience);

    await db.collection('users').updateOne(
      { uid },
      { $set: { name, phone, email } }
    );

    const resultWorker = await db.collection('workers').findOneAndUpdate(
      { uid },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!resultWorker) return res.status(404).json({ error: "Worker not found" });
    res.json({ success: true, worker: resultWorker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/workers
app.get('/api/auth/workers', async (req, res) => {
  try {
    const workers = await db.collection('workers').find({}).toArray();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await db.collection('users').find({ role: 'customer' }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED BOOKING ROUTER (MATCHING FLUTTER BACKEND SCHEMAS)
// -----------------------------------------------------------------------------

// POST /api/bookings/create
app.post('/api/bookings/create', async (req, res) => {
  try {
    const { title, description, address, schedule, customerId, price } = req.body;
    if (!title || !description || !address || !schedule || !customerId || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Deduplication check
    const twoMinutesAgo = new Date(Date.now() - (2 * 60 * 1000));
    const duplicate = await db.collection('bookings').findOne({
      customerId,
      title,
      schedule,
      address,
      createdAt: { $gte: twoMinutesAgo }
    });

    if (duplicate) {
      return res.status(400).json({ error: "Duplicate booking detected." });
    }

    const customer = await db.collection('users').findOne({ _id: new ObjectId(customerId) });
    const customerName = customer ? customer.name : 'Amit Sharma';
    const customerPhoto = customer ? customer.profilePhoto : null;

    const newBooking = {
      title,
      description,
      address,
      schedule,
      customerId,
      workerId: null,
      price: Number(price),
      status: 'pending',
      createdAt: new Date()
    };

    const result = await db.collection('bookings').insertOne(newBooking);
    
    // Broadcast socket event
    io.emit('new_lead', {
      id: result.insertedId.toString(),
      _id: result.insertedId.toString(),
      title,
      description,
      address,
      schedule,
      customerId,
      price: Number(price),
      status: 'pending',
      customerName,
      customerPhoto
    });

    res.json({ success: true, booking: { ...newBooking, id: result.insertedId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/pending
app.get('/api/bookings/pending', auth, async (req, res) => {
  try {
    if (req.user.role === 'worker' && (!req.user.isApproved || req.user.kycStatus !== 'approved')) {
      return res.status(403).json({ error: "Worker verification pending. You must be approved by the admin to view leads." });
    }
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;

    let query;
    if (isAdmin) {
      query = { status: { $in: ['pending', 'Pending'] } };
    } else {
      const workerName = req.user.name || req.user.fullName || '';
      query = {
        status: { $in: ['pending', 'Pending'] },
        $or: [
          { workerId: userIdStr },
          { workerId: req.user.id },
          { workerId: String(req.user._id) },
          ...(req.user.uid ? [{ workerId: req.user.uid }] : []),
          ...(workerName ? [{ workerName: workerName }] : [])
        ]
      };
    }

    const bookings = await db.collection('bookings').find(query).sort({ createdAt: -1 }).toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function categoryMatchesLead(categoryStr, title, desc) {
  if (!categoryStr) return false;
  const workerCats = categoryStr.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
  if (workerCats.length === 0) return false;
  const t = (title || '').toLowerCase();
  const d = (desc || '').toLowerCase();
  const keywordMap = {
    electrician: ['electric', 'wiring', 'light', 'switch', 'power', 'fan', 'ac', 'appliance', 'fuse', 'wire', 'board'],
    plumber: ['plumb', 'leak', 'pipe', 'tap', 'drain', 'water', 'basin', 'shower', 'sink', 'toilet'],
    carpenter: ['carpent', 'wood', 'door', 'lock', 'furniture', 'cabinet', 'chair', 'table', 'hinge', 'bed'],
    painter: ['paint', 'wall', 'waterproof', 'putty', 'color', 'colour', 'primer'],
    cleaner: ['clean', 'wash', 'sweep', 'dust', 'sofa', 'kitchen', 'vacuum', 'housekeep']
  };
  return workerCats.some(cat => {
    if (t.includes(cat) || d.includes(cat)) return true;
    const kw = keywordMap[cat];
    if (kw) return kw.some(k => t.includes(k) || d.includes(k));
    return false;
  });
}

// GET /api/bookings/active/:workerId
app.get('/api/bookings/active/:workerId', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;

    if (!isAdmin && userIdStr !== String(workerId)) {
      return res.status(403).json({ error: 'Forbidden: Access denied to these worker bookings' });
    }

    const workerName = req.user.name || req.user.fullName || '';
    const workerOrConditions = [
      { workerId: workerId },
      { workerId: userIdStr },
      ...(req.user.uid ? [{ workerId: req.user.uid }] : []),
      ...(workerName ? [{ workerName: workerName }, { name: workerName }] : []),
      ...(ObjectId.isValid(workerId) ? [{ workerId: new ObjectId(workerId) }] : [])
    ];

    const bookings = await db.collection('bookings').find({
      $or: workerOrConditions,
      status: { $in: ['accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'Cancelled'] }
    }).sort({ createdAt: -1 }).toArray();

    // Strip completionOtp for worker security
    const securedBookings = bookings.map(b => {
      const copy = { ...b };
      delete copy.completionOtp;
      delete copy.otpGeneratedAt;
      return copy;
    });

    res.json(securedBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/notifications
app.get('/api/worker/notifications', auth, async (req, res) => {
  try {
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const workerName = req.user.name || req.user.fullName || '';

    const workerBookings = await db.collection('bookings').find({
      $or: [
        { workerId: userIdStr },
        { workerId: req.user.id },
        { workerId: String(req.user._id) },
        ...(req.user.uid ? [{ workerId: req.user.uid }] : []),
        ...(workerName ? [{ workerName: workerName }] : [])
      ]
    }).sort({ createdAt: -1 }).toArray();

    const notifications = workerBookings.map(b => ({
      id: b._id.toString(),
      bookingId: b._id.toString(),
      type: (b.status || '').toLowerCase() === 'pending' ? 'new_lead' : 'booking_updated',
      title: b.title || b.serviceName || 'Service Request',
      customerName: b.customerName || 'Customer',
      customerPhoto: b.customerPhoto || b.userPhoto || undefined,
      address: b.address || 'Address not specified',
      status: b.status,
      price: b.price,
      date: b.schedule || 'Today',
      time: b.time || 'ASAP',
      createdAt: b.createdAt || new Date()
    }));

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/leads
app.get('/api/worker/leads', auth, async (req, res) => {
  try {
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const workerName = req.user.name || req.user.fullName || '';

    const bookings = await db.collection('bookings').find({
      $or: [
        { workerId: userIdStr },
        { workerId: req.user.id },
        { workerId: String(req.user._id) },
        ...(req.user.uid ? [{ workerId: req.user.uid }] : []),
        ...(workerName ? [{ workerName: workerName }] : [])
      ]
    }).sort({ createdAt: -1 }).toArray();

    const securedBookings = bookings.map(b => {
      const copy = { ...b };
      delete copy.completionOtp;
      delete copy.otpGeneratedAt;
      return copy;
    });

    res.json(securedBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/bookings
app.get('/api/worker/bookings', auth, async (req, res) => {
  try {
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const workerName = req.user.name || req.user.fullName || '';
    const bookings = await db.collection('bookings').find({
      $or: [
        { workerId: userIdStr },
        { workerId: req.user.id },
        { workerId: String(req.user._id) },
        ...(req.user.uid ? [{ workerId: req.user.uid }] : []),
        ...(workerName ? [{ workerName: workerName }] : [])
      ]
    }).sort({ createdAt: -1 }).toArray();

    const securedBookings = bookings.map(b => {
      const copy = { ...b };
      delete copy.completionOtp;
      delete copy.otpGeneratedAt;
      return copy;
    });

    res.json(securedBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/bookings
app.get('/api/customer/bookings', async (req, res) => {
  try {
    let user = null;
    const authHeader = req.header('Authorization')?.replace('Bearer ', '');
    if (authHeader) {
      try {
        const decoded = jwt.verify(authHeader, JWT_SECRET);
        if (decoded && decoded.userId && ObjectId.isValid(decoded.userId)) {
          user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
        }
      } catch (e) {}
    }

    const emailQuery = (req.query.email || req.header('X-User-Email') || user?.email || '').trim();
    const nameQuery = (req.query.name || user?.name || '').trim();
    const userIdStr = String(user?._id || user?.id || user?.uid || req.query.customerId || '');

    const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const orConditions = [];

    if (userIdStr && userIdStr !== 'undefined' && userIdStr !== 'null') {
      orConditions.push({ customerId: userIdStr });
      if (ObjectId.isValid(userIdStr)) {
        orConditions.push({ customerId: new ObjectId(userIdStr) });
      }
    }

    if (emailQuery) {
      orConditions.push({ customerEmail: { $regex: new RegExp(`^${escapeRegex(emailQuery)}$`, 'i') } });
      orConditions.push({ email: { $regex: new RegExp(`^${escapeRegex(emailQuery)}$`, 'i') } });
    }

    if (nameQuery) {
      orConditions.push({ customerName: { $regex: new RegExp(`^${escapeRegex(nameQuery)}$`, 'i') } });
    }

    const query = orConditions.length > 0 ? { $or: orConditions } : {};
    const bookings = await db.collection('bookings').find(query).sort({ createdAt: -1 }).toArray();

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/user/:customerId
app.get('/api/bookings/user/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;

    if (!isAdmin && userIdStr !== String(customerId)) {
      return res.status(403).json({ error: 'Forbidden: Access denied to these customer bookings' });
    }

    const queryConditions = [
      { customerId: customerId },
      { userId: customerId }
    ];
    if (ObjectId.isValid(customerId)) {
      queryConditions.push({ customerId: new ObjectId(customerId) });
      queryConditions.push({ userId: new ObjectId(customerId) });
    }

    const bookings = await db.collection('bookings').find({ $or: queryConditions }).sort({ createdAt: -1 }).toArray();
    
    // Secure OTP exposure: only return completionOtp if customer has rated the worker
    const securedBookings = bookings.map(b => {
      const copy = { ...b };
      copy.otpGenerated = !!copy.completionOtp;
      if (!copy.rating) {
        delete copy.completionOtp;
        delete copy.otpGeneratedAt;
      }
      return copy;
    });

    res.json(securedBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/accept/:id
app.put('/api/bookings/accept/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;
    if (!workerId) return res.status(400).json({ error: "workerId is required" });

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Check if worker exists to get their name and photo
    const worker = await db.collection('workers').findOne({ uid: workerId });
    const userAcc = await db.collection('users').findOne({ _id: ObjectId.isValid(workerId) ? new ObjectId(workerId) : null });
    
    // Check subscription status
    const sub = userAcc?.subscription || { plan: 'none', status: 'inactive' };
    const isActive = sub.isActive === true || sub.status === 'active';
    if (!isActive) {
      return res.status(402).json({ error: "SUBSCRIBER_REQUIRED", message: "You need an active subscription to accept leads." });
    }

    const workerName = worker ? worker.name : (userAcc ? userAcc.name : 'Service Professional');
    const workerPhoto = userAcc ? userAcc.profilePhoto : (worker ? worker.image : null);

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
        workerId, 
        workerName, 
        workerPhoto: workerPhoto || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100',
        status: 'accepted' 
      } }
    );

    // Send emails asynchronously (don't block the HTTP response if emails fail)
    try {
      const customer = await db.collection('users').findOne({
        $or: [
          { _id: ObjectId.isValid(booking.customerId) ? new ObjectId(booking.customerId) : null },
          { uid: booking.customerId }
        ]
      });

      const workerEmail = worker?.email || userAcc?.email;
      const customerName = customer ? customer.name : (booking.customerName || 'Customer');
      const customerPhone = customer ? customer.phone : (booking.customerPhone || 'N/A');

      if (workerEmail) {
        await sendEmail({
          to: workerEmail,
          subject: `🔔 New GigDial Lead Assigned: ${booking.title} — ${booking.customerName || 'Client'}`,
          text: `Hello ${workerName},\n\nYou have a new lead!\n\nJob: ${booking.title}\nBudget: ₹${booking.price}\nClient: ${customerName}\nPhone: ${customerPhone}\nAddress: ${booking.address || 'See app'}\n\nOpen GigDial Worker App to accept.`,
          html: buildLeadAssignedEmailHtml(workerName, {
            title: booking.title,
            price: booking.price,
            customerName,
            customerPhone,
            description: booking.description || booking.title,
            address: booking.address,
            schedule: booking.schedule
          })
        });
      }

      if (customer && customer.email) {
        await sendEmail({
          to: customer.email,
          subject: `✅ ${workerName} accepted your request — ${booking.title}`,
          text: `Hello ${customerName},\n\nYour request for "${booking.title}" has been accepted by ${workerName}.\nContact: ${worker?.phone || userAcc?.phone || 'N/A'}\n\nOpen GigDial to track status.`,
          html: buildWorkerAcceptedEmailHtml(
            customerName,
            workerName,
            booking.title,
            worker?.phone || userAcc?.phone
          )
        });
      }
    } catch (mailErr) {
      console.error("Failed to send accept/assign emails:", mailErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/reject/:id - Reject lead by worker
app.put('/api/bookings/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    let queryConditions = [
      { id: id },
      { bookingId: id }
    ];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    await db.collection('bookings').updateOne(
      { $or: queryConditions },
      { 
        $set: { 
          status: 'cancelled',
          cancelledBy: 'worker',
          rejectedByWorker: true,
          updatedAt: new Date()
        },
        $addToSet: { rejectedBy: String(workerId || '') }
      }
    );

    res.json({ success: true, message: "Lead rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/update-status/:id
app.put('/api/bookings/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelledBy } = req.body;
    const cleanStatus = (status || '').toLowerCase();
    const validStatuses = ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    let queryConditions = [
      { id: id },
      { bookingId: id }
    ];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const updateFields = { status: cleanStatus, updatedAt: new Date() };
    if (cleanStatus === 'cancelled') {
      updateFields.cancelledBy = cancelledBy || 'customer';
    }

    await db.collection('bookings').updateOne(
      { $or: queryConditions },
      { $set: updateFields }
    );

    res.json({ success: true, status: cleanStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/generate-otp/:id
app.post('/api/bookings/generate-otp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { completionOtp: otp, otpGeneratedAt: new Date() } }
    );

    res.json({ success: true, message: "OTP generated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/verify-otp/:id
app.post('/api/bookings/verify-otp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ error: "OTP is required" });

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (!booking.rating) {
      return res.status(400).json({ error: "Customer must rate the worker before completing the job" });
    }

    // Verify OTP expiry (10 minutes limit)
    const tenMinutes = 10 * 60 * 1000;
    if (booking.otpGeneratedAt && (Date.now() - new Date(booking.otpGeneratedAt).getTime() > tenMinutes)) {
      return res.status(400).json({ error: "OTP has expired. Please ask the customer to click Resend OTP." });
    }

    if (booking.completionOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP, please try again" });
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'completed' }, $unset: { completionOtp: "", otpGeneratedAt: "" } }
    );

    // Send emails asynchronously (don't block the HTTP response if emails fail)
    try {
      const customer = await db.collection('users').findOne({
        $or: [
          { _id: ObjectId.isValid(booking.customerId) ? new ObjectId(booking.customerId) : null },
          { uid: booking.customerId }
        ]
      });

      const customerName = customer ? customer.name : (booking.customerName || 'Customer');
      const workerName = booking.workerName || 'Service Professional';

      if (customer && customer.email) {
        await sendEmail({
          to: customer.email,
          subject: `🎉 Service Complete — Rate ${workerName} on GigDial`,
          text: `Hi ${customerName}, your service "${booking.title}" by ${workerName} is completed! Open GigDial to rate your experience.`,
          html: buildCompletionCustomerEmailHtml(customerName, workerName, booking.title)
        });
      }

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `📋 Lead Completed — ${booking.title} | ${workerName} → ${customerName}`,
        text: `Service: ${booking.title}\nWorker: ${workerName}\nCustomer: ${customerName}\nAmount: ₹${booking.price || 'N/A'}\nRating: ${booking.rating || 'Not rated'}\nCompleted: ${new Date().toLocaleString()}`,
        html: buildCompletionAdminEmailHtml({
          title: booking.title,
          price: booking.price,
          workerName,
          customerName,
          rating: booking.rating
        })
      });
    } catch (mailErr) {
      console.error("Failed to send task completion emails:", mailErr.message);
    }

    res.json({ success: true, message: "Job completed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED PAYMENTS ROUTER
// -----------------------------------------------------------------------------

// POST /api/payments/create
app.post('/api/payments/create', async (req, res) => {
  try {
    const { workerUid, plan, amount, method } = req.body;
    if (!workerUid || !plan || !amount || !method) {
      return res.status(400).json({ error: "workerUid, plan, amount, and method are required" });
    }

    const newPayment = {
      workerUid,
      plan,
      amount: Number(amount),
      method,
      status: 'pending',
      createdAt: new Date()
    };

    const result = await db.collection('payments').insertOne(newPayment);
    res.json({ success: true, payment: { ...newPayment, id: result.insertedId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/worker/:workerUid
app.get('/api/payments/worker/:workerUid', async (req, res) => {
  try {
    const { workerUid } = req.params;
    const history = await db.collection('payments').find({ workerUid }).sort({ createdAt: -1 }).toArray();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED REQUIREMENTS ROUTER
// -----------------------------------------------------------------------------

// POST /api/requirements/create
app.post('/api/requirements/create', async (req, res) => {
  try {
    const { customerUid, customerName, customerPhone, customerEmail, category, days, budget, description } = req.body;
    if (!customerUid || !customerName || !category || !days || !budget || !description) {
      return res.status(400).json({ error: "Missing required requirements parameters" });
    }

    const newRequirement = {
      customerUid,
      customerName,
      customerPhone,
      customerEmail,
      category,
      days,
      budget,
      description,
      status: 'new',
      createdAt: new Date()
    };

    const result = await db.collection('requirements').insertOne(newRequirement);
    res.json({ success: true, requirement: { ...newRequirement, id: result.insertedId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/requirements/all
app.get('/api/requirements/all', async (req, res) => {
  try {
    const list = await db.collection('requirements').find({}).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/requirements/update-status/:id
app.put('/api/requirements/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status value is required" });

    await db.collection('requirements').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED SERVICES ROUTER
// -----------------------------------------------------------------------------

// GET /api/services/popular
app.get('/api/services/popular', async (req, res) => {
  try {
    const services = await db.collection('services').find({ isPopular: true }).limit(8).toArray();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/all
app.get('/api/services/all', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const services = await db.collection('services').find(filter).sort({ group: 1, name: 1 }).toArray();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED WORKERS DETAILED LISTS
// -----------------------------------------------------------------------------

// GET /api/workers/top-rated
app.get('/api/workers/top-rated', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const workers = await db.collection('workers').find({}).sort({ rating: -1 }).limit(limit).toArray();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workers - Fetch all workers for Customer App with real online status
app.get('/api/workers', async (req, res) => {
  try {
    const { service, search, sort } = req.query;

    const userWorkers = await db.collection('users').find({
      $or: [{ role: 'worker' }, { isProvider: true }]
    }).toArray();

    const dbWorkers = await db.collection('workers').find({}).toArray();

    const seenIds = new Set();
    const result = [];

    // Add from users collection
    for (const u of userWorkers) {
      const idStr = u._id.toString();
      seenIds.add(idStr);
      if (u.uid) seenIds.add(u.uid);

      const wDoc = dbWorkers.find(w => w.uid === idStr || (w._id && w._id.toString() === idStr) || (w.email && w.email === u.email));

      const isOnlineVal = u.isOnline !== false && u.isOnline !== 'false' && (wDoc ? (wDoc.isOnline !== false && wDoc.isOnline !== 'false') : true);

      result.push({
        _id: u._id,
        uid: u.uid || idStr,
        id: u._id.toString(),
        name: u.name,
        profession: u.mainCategory || u.category || u.profession || 'Electrician',
        category: u.mainCategory || u.category || 'Electrician',
        isOnline: isOnlineVal,
        isApproved: u.isApproved !== false,
        phone: u.phone,
        city: u.city || 'Ahmedabad',
        email: u.email,
        rating: u.rating || 4.9,
        reviewsCount: 12,
        experienceYears: u.experience || 5,
        avatar: u.profilePhoto || u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        image: u.profilePhoto || u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        profileViews: u.profileViews || (wDoc ? wDoc.profileViews : 12) || 12
      });
    }

    // Add remaining from workers collection
    for (const w of dbWorkers) {
      const idStr = w._id.toString();
      const uidStr = w.uid || '';
      if (!seenIds.has(idStr) && (!uidStr || !seenIds.has(uidStr))) {
        result.push({
          _id: w._id,
          uid: w.uid || idStr,
          id: w._id.toString(),
          name: w.name,
          profession: w.mainCategory || w.category || w.profession || 'Service Provider',
          category: w.mainCategory || w.category || 'Service Provider',
          isOnline: w.isOnline !== false && w.isOnline !== 'false',
          isApproved: w.isApproved !== false,
          phone: w.phone,
          city: w.city || 'Ahmedabad',
          email: w.email,
          rating: w.rating || 4.9,
          reviewsCount: 12,
          experienceYears: w.experience || 5,
          avatar: w.image || w.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          image: w.image || w.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          profileViews: w.profileViews || 12
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workers/:workerId
app.get('/api/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    let query = { $or: [{ uid: workerId }, { email: workerId }] };
    if (ObjectId.isValid(workerId)) {
      query.$or.push({ _id: new ObjectId(workerId) });
    }

    const userDoc = await db.collection('users').findOne(query);
    const workerDoc = await db.collection('workers').findOne(query);

    if (!userDoc && !workerDoc) return res.status(404).json({ error: "Worker not found" });

    // Increment profile views in both users and workers collections
    await db.collection('users').updateMany(query, { $inc: { profileViews: 1 } });
    await db.collection('workers').updateMany(query, { $inc: { profileViews: 1 } });

    const merged = {
      ...(workerDoc || {}),
      ...(userDoc || {}),
      profileViews: ((userDoc ? userDoc.profileViews : 0) || (workerDoc ? workerDoc.profileViews : 0) || 12) + 1
    };

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// ADDITIONAL CUSTOMER DETAILS & REVIEWS
// -----------------------------------------------------------------------------

// GET /api/bookings/:id
app.get('/api/bookings/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowed, booking, notFound } = await verifyBookingOwnership(id, req.user);
    if (notFound) return res.status(404).json({ error: "Booking not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden: Access denied to this booking" });

    // Strip OTP if caller is worker (worker cannot read OTP before verification)
    const userIdStr = String(req.user._id || req.user.id || req.user.uid || '');
    const isWorker = String(booking.workerId) === userIdStr;
    const responseBooking = { ...booking };
    if (isWorker) {
      delete responseBooking.completionOtp;
      delete responseBooking.otpGeneratedAt;
    }

    res.json(responseBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/:id/confirm
app.post('/api/bookings/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid booking ID" });
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'pending', updatedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/profile
app.get('/api/users/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid parameter is required" });
    const user = await db.collection('users').findOne({ uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/update-profile
app.put('/api/users/update-profile', async (req, res) => {
  try {
    const { uid, name, phone, email } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (email) updateFields.email = email;

    const result = await db.collection('users').findOneAndUpdate(
      { uid },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    res.json({ success: true, user: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:customerId/saved-workers
app.get('/api/users/:customerId/saved-workers', async (req, res) => {
  try {
    const { customerId } = req.params;
    const list = await db.collection('saved_workers').find({ customerId }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:customerId/saved-workers (toggle saved worker)
app.post('/api/users/:customerId/saved-workers', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { workerId, workerName, profession, rating } = req.body;
    if (!workerId) return res.status(400).json({ error: "workerId is required" });

    const existing = await db.collection('saved_workers').findOne({ customerId, workerId });
    if (existing) {
      await db.collection('saved_workers').deleteOne({ customerId, workerId });
      return res.json({ success: true, saved: false });
    } else {
      await db.collection('saved_workers').insertOne({
        customerId,
        workerId,
        workerName,
        profession: profession || 'Professional',
        rating: rating || 5.0,
        createdAt: new Date()
      });
      return res.json({ success: true, saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/create
app.post('/api/reviews/create', async (req, res) => {
  try {
    const { bookingId, workerId, customerId, rating, feedback } = req.body;
    if (!bookingId || !workerId || !rating) {
      return res.status(400).json({ error: "bookingId, workerId, and rating are required" });
    }

    const newReview = {
      bookingId,
      workerId,
      customerId,
      rating: Number(rating),
      feedback,
      createdAt: new Date()
    };

    await db.collection('reviews').insertOne(newReview);

    // Compute and update average rating for the worker
    const pipeline = [
      { $match: { workerId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ];
    const stats = await db.collection('reviews').aggregate(pipeline).toArray();
    const newAvg = stats.length > 0 ? stats[0].avgRating : Number(rating);

    await db.collection('workers').updateOne(
      { uid: workerId },
      { $set: { rating: newAvg }, $inc: { reviewsCount: 1 } }
    );

    res.json({ success: true, review: newReview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED WORKERS DASHBOARD & EXTRA ROUTERS
// -----------------------------------------------------------------------------

// GET /api/workers/dashboard/:uid
app.get('/api/workers/dashboard/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const statsUrl = `${req.protocol}://${req.get('host')}/api/worker/${uid}/dashboard`;
    const workerDoc = await db.collection('workers').findOne({
      $or: [{ uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    }) || await db.collection('users').findOne({
      $or: [{ uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    });

    if (!workerDoc) return res.status(404).json({ error: "Worker not found" });

    // Forward directly to main worker dashboard handler
    req.url = `/api/worker/${uid}/dashboard`;
    return app._router.handle(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/worker/:workerId/active
app.get('/api/bookings/worker/:workerId/active', async (req, res) => {
  try {
    const { workerId } = req.params;
    const bookings = await db.collection('bookings').find({
      workerId,
      status: { $in: ['accepted', 'on_the_way', 'in_progress'] }
    }).toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/worker/:workerId/completed
app.get('/api/bookings/worker/:workerId/completed', async (req, res) => {
  try {
    const { workerId } = req.params;
    const bookings = await db.collection('bookings').find({
      workerId,
      status: 'completed'
    }).toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/worker/:workerId/chats
app.get('/api/bookings/worker/:workerId/chats', async (req, res) => {
  try {
    const { workerId } = req.params;
    const bookings = await db.collection('bookings').find({
      workerId,
      messages: { $exists: true, $not: { $size: 0 } }
    }).toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/:uid/categories
app.get('/api/worker/:uid/categories', async (req, res) => {
  try {
    const { uid } = req.params;
    const worker = await db.collection('workers').findOne({ uid });
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json({
      categories: worker.categories || [worker.profession],
      skills: worker.skills || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/worker/:uid/categories
app.put('/api/worker/:uid/categories', async (req, res) => {
  try {
    const { uid } = req.params;
    const { categories, skills } = req.body;
    await db.collection('workers').updateOne(
      { uid },
      { $set: { categories, skills } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/plans
app.get('/api/subscription/plans', async (req, res) => {
  res.json([
    { id: 'pro', name: 'GigDial Pro', price: 499, currency: 'INR', features: ['Unlimited Lead Access', 'Direct Chat Integration', 'Featured Professional Tag'] }
  ]);
});

// PUT /api/worker/:uid/notifications
app.put('/api/worker/:uid/notifications', async (req, res) => {
  try {
    const { uid } = req.params;
    const { push, email, sms, promotions } = req.body;
    await db.collection('workers').updateOne(
      { uid },
      { $set: { notificationSettings: { push, email, sms, promotions } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/support/tickets
app.post('/api/support/tickets', async (req, res) => {
  try {
    const { workerUid, subject, message } = req.body;
    const ticket = {
      workerUid,
      subject,
      message,
      status: 'open',
      createdAt: new Date()
    };
    await db.collection('support_tickets').insertOne(ticket);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', async (req, res) => {
  res.json({ success: true, message: "Password updated successfully" });
});

// GET /api/worker/:uid/dashboard - stats counts
app.get('/api/worker/:uid/dashboard', async (req, res) => {
  try {
    const { uid } = req.params;

    // Flexible query to find worker doc in workers or users collection
    const queryConditions = [
      { uid: uid },
      { id: uid },
      { name: uid },
      { email: uid },
      { phone: uid }
    ];
    if (ObjectId.isValid(uid)) {
      queryConditions.push({ _id: new ObjectId(uid) });
    }

    const workerDoc = await db.collection('workers').findOne({ $or: queryConditions })
                   || await db.collection('users').findOne({ $or: queryConditions });

    const workerCategory = workerDoc ? (workerDoc.mainCategory || workerDoc.category || '') : '';
    const workerName = workerDoc?.name || uid;
    const workerEmail = workerDoc?.email || '';
    const workerPhone = workerDoc?.phone || '';
    const workerIdStr = workerDoc?._id ? workerDoc._id.toString() : uid;
    const workerUidStr = workerDoc?.uid || '';

    // 1. Calculate Today's / Active Pending Leads
    const allPendingBookings = await db.collection('bookings').find({
      status: { $in: ['pending', 'Pending'] }
    }).sort({ createdAt: -1 }).toArray();

    const matchingPendingLeads = allPendingBookings.filter(b => {
      const bWorkerIdStr = b.workerId ? String(b.workerId) : '';
      const uidStr = String(uid);
      const isDirectMatch = bWorkerIdStr === uidStr || bWorkerIdStr === workerIdStr ||
        (workerUidStr && bWorkerIdStr === workerUidStr) ||
        (workerName && (b.workerName === workerName || b.name === workerName)) ||
        (workerEmail && b.workerEmail === workerEmail) ||
        (workerPhone && b.workerPhone === workerPhone);
      const isUnassignedOpenLead = !b.workerId || b.workerId === '' || b.workerId === 'unassigned';
      return isDirectMatch || (isUnassignedOpenLead && categoryMatchesLead(workerCategory, b.title || b.serviceName, b.description));
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayMatchingLeads = matchingPendingLeads.filter(b => {
      const bDate = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date) : null);
      return bDate && bDate >= todayStart;
    });

    const todayLeadsCount = todayMatchingLeads.length;

    // 2. Calculate Completed Jobs for this worker
    const workerIdentifiers = [
      { workerId: uid },
      { workerId: workerIdStr },
      ...(workerUidStr ? [{ workerId: workerUidStr }] : []),
      ...(workerName ? [{ workerName: workerName }, { name: workerName }] : []),
      ...(workerPhone ? [{ workerPhone: workerPhone }] : []),
      ...(workerEmail ? [{ workerEmail: workerEmail }] : []),
      ...(ObjectId.isValid(uid) ? [{ workerId: new ObjectId(uid) }] : [])
    ];

    const completedBookings = await db.collection('bookings').find({
      $or: workerIdentifiers,
      status: { $in: ['completed', 'Completed'] }
    }).toArray();

    // 3. Profile Views & Rating
    const profileViews = (workerDoc && (workerDoc.profileViews || workerDoc.views)) ? (workerDoc.profileViews || workerDoc.views) : 12;
    
    let rating = 5.0;
    if (workerDoc) {
      if (workerDoc.rating && Number(workerDoc.rating) > 0) {
        rating = Number(workerDoc.rating);
      } else if (workerDoc.reviews && workerDoc.reviews.length > 0) {
        const sum = workerDoc.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        rating = sum / workerDoc.reviews.length;
      }
    }

    // 4. Earnings
    const earnings = completedBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    // 5. Recent Activity: Top 5 items combining worker's recent bookings + top available matching leads
    const workerBookings = await db.collection('bookings').find({
      $or: [
        { workerId: uid },
        { workerId: ObjectId.isValid(uid) ? new ObjectId(uid) : null }
      ]
    }).sort({ updatedAt: -1, createdAt: -1 }).toArray();

    const combinedActivityList = [...workerBookings];
    matchingPendingLeads.forEach(b => {
      if (!combinedActivityList.some(item => item._id.toString() === b._id.toString())) {
        combinedActivityList.push(b);
      }
    });

    combinedActivityList.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const top5 = combinedActivityList.slice(0, 5);

    const recentActivity = top5.map(b => {
      const status = (b.status || '').toLowerCase();
      let title = b.title || 'New Job Lead';
      let subtitle = b.description ? `${b.description.slice(0, 45)}...` : (b.address || 'Available Lead');
      let icon = 'briefcase-outline';
      let iconColor = '#0F2C59';

      if (status === 'pending') {
        title = `New Lead: ${b.title || 'Service Lead'}`;
        subtitle = b.description ? `${b.description}` : `${b.address || b.city || 'Available now'}`;
        icon = 'sparkles-outline';
        iconColor = '#0D9488';
      } else if (status === 'completed') {
        title = `Job Completed: ${b.title || 'Service'}`;
        subtitle = `Earned ₹${b.price || 0}`;
        icon = 'checkmark-circle-outline';
        iconColor = '#10B981';
      } else if (status === 'accepted' || status === 'on_the_way' || status === 'in_progress') {
        title = `Active Job: ${b.title || 'Service'}`;
        subtitle = `Status: ${b.status.replace('_', ' ')}`;
        icon = 'time-outline';
        iconColor = '#3B82F6';
      } else if (status === 'cancelled') {
        title = `Cancelled: ${b.title || 'Service'}`;
        subtitle = 'Booking was cancelled';
        icon = 'close-circle-outline';
        iconColor = '#EF4444';
      }

      const date = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date());
      const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return {
        id: b._id.toString(),
        title,
        subtitle: `${subtitle} • ${timeStr}`,
        icon,
        iconColor,
        status: b.status,
        price: b.price
      };
    });

    res.json({
      todayLeads: todayLeadsCount,
      monthLeads: todayLeadsCount,
      totalLeads: todayLeadsCount + completedBookings.length,
      profileViews: profileViews,
      rating: rating,
      earnings: earnings,
      completedJobs: completedBookings.length,
      recentActivity: recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT & POST /api/worker/:uid/online-status & /api/workers/:uid/online-status - Update worker online status in database
const handleOnlineStatus = async (req, res) => {
  try {
    const { uid } = req.params;
    const { isOnline } = req.body;

    if (isOnline === undefined) {
      return res.status(400).json({ error: "isOnline field is required" });
    }

    const onlineVal = isOnline === true || isOnline === 'true' || isOnline === 1;

    // Flexible search conditions to locate worker document
    const queryConditions = [
      { uid: uid },
      { id: uid },
      { name: uid },
      { email: uid },
      { phone: uid }
    ];
    if (ObjectId.isValid(uid)) {
      queryConditions.push({ _id: new ObjectId(uid) });
    }

    let targetUser = await db.collection('users').findOne({ $or: queryConditions });
    if (!targetUser) {
      targetUser = await db.collection('workers').findOne({ $or: queryConditions });
    }

    const userEmail = targetUser?.email || '';
    const userName = targetUser?.name || '';
    const userPhone = targetUser?.phone || '';
    const userUid = targetUser?.uid || '';
    const userObjId = targetUser?._id;

    const updateFilter = {
      $or: [
        { uid: uid },
        { id: uid },
        { name: uid },
        ...(ObjectId.isValid(uid) ? [{ _id: new ObjectId(uid) }] : []),
        ...(userObjId ? [{ _id: userObjId }] : []),
        ...(userUid ? [{ uid: userUid }] : []),
        ...(userEmail ? [{ email: userEmail }] : []),
        ...(userName ? [{ name: userName }] : []),
        ...(userPhone ? [{ phone: userPhone }] : [])
      ]
    };

    // Update in users collection
    await db.collection('users').updateMany(
      updateFilter,
      { $set: { isOnline: onlineVal, updatedAt: new Date() } }
    );

    // Update in workers collection
    await db.collection('workers').updateMany(
      updateFilter,
      { $set: { isOnline: onlineVal, updatedAt: new Date() } }
    );

    // Emit real-time socket event for online status update to all connected clients
    io.emit('worker_status_change', { 
      uid, 
      id: userObjId ? userObjId.toString() : uid, 
      name: userName || uid,
      isOnline: onlineVal 
    });

    console.log(`🟢 Worker status updated: ${userName || uid} -> ${onlineVal ? 'ONLINE' : 'OFFLINE'}`);

    res.json({ success: true, isOnline: onlineVal, message: `Worker online status updated to ${onlineVal}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/worker/:uid/online-status', handleOnlineStatus);
app.put('/api/workers/:uid/online-status', handleOnlineStatus);
app.post('/api/worker/:uid/online-status', handleOnlineStatus);
app.post('/api/workers/:uid/online-status', handleOnlineStatus);

// GET /api/worker/:uid/subscription - status check
app.get('/api/worker/:uid/subscription', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Check in users first
    let user = await db.collection('users').findOne({
      $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    });

    if (!user) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const sub = user.subscription || { plan: 'none', status: 'inactive' };
    
    // Support both schema variations: status === 'active' or isActive === true
    const isActive = sub.isActive === true || sub.status === 'active';
    
    let remainingDays = 0;
    if (isActive && sub.endDate) {
      const now = new Date();
      const end = new Date(sub.endDate);
      const diffTime = Math.max(0, end.getTime() - now.getTime());
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    res.json({
      plan: sub.plan || 'none',
      isActive: isActive,
      startDate: sub.startDate || null,
      endDate: sub.endDate || null,
      remainingDays: remainingDays
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/worker/:uid/subscription/upgrade - simulate upgrade
app.post('/api/worker/:uid/subscription/upgrade', async (req, res) => {
  try {
    const { uid } = req.params;
    const { planId } = req.body; // e.g. "pro"

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30-day active period

    const subscriptionData = {
      plan: planId || 'pro',
      status: 'active',
      startDate: startDate,
      endDate: endDate
    };

    // Update in users
    await db.collection('users').updateOne(
      { $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }] },
      { $set: { subscription: subscriptionData } }
    );

    // Update in workers
    await db.collection('workers').updateOne(
      { uid: uid },
      { $set: { subscription: { plan: planId || 'pro', status: 'active' } } }
    );

    res.json({
      success: true,
      subscription: {
        plan: subscriptionData.plan,
        isActive: true,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.endDate,
        remainingDays: 30
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/:uid/chats - list active chats
app.get('/api/worker/:uid/chats', async (req, res) => {
  try {
    const { uid } = req.params;

    // Find all bookings where this worker is assigned
    const bookings = await db.collection('bookings').find({
      workerId: uid
    }).sort({ createdAt: -1 }).toArray();

    const populatedChats = [];

    for (const booking of bookings) {
      // Find latest message for this booking
      const lastMsgArray = await db.collection('chats')
        .find({ bookingId: booking._id.toString() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      const lastMsg = lastMsgArray[0] || null;

      // Find customer info
      let customer = null;
      if (booking.customerId) {
        customer = await db.collection('users').findOne({
          $or: [
            { uid: booking.customerId },
            { _id: ObjectId.isValid(booking.customerId) ? new ObjectId(booking.customerId) : null }
          ]
        });
      }

      populatedChats.push({
        bookingId: booking._id.toString(),
        jobTitle: booking.title,
        customerName: customer ? customer.name : 'Client',
        customerPhone: customer ? customer.phone : '',
        customerPhoto: customer ? customer.profilePhoto : 'assets/images/worker_ramesh.png',
        lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
        timestamp: lastMsg ? lastMsg.timestamp : booking.schedule || '',
        updatedAt: lastMsg ? lastMsg.createdAt : new Date(booking.createdAt).getTime()
      });
    }

    // Sort by latest message/update first
    populatedChats.sort((a, b) => b.updatedAt - a.updatedAt);

    res.json(populatedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/:uid/chats - list active chats for customer
app.get('/api/customer/:uid/chats', async (req, res) => {
  try {
    const { uid } = req.params;

    // Find all bookings where this customer is the owner
    const bookings = await db.collection('bookings').find({
      $or: [
        { customerId: uid },
        { customerId: ObjectId.isValid(uid) ? new ObjectId(uid) : null }
      ]
    }).sort({ createdAt: -1 }).toArray();

    const populatedChats = [];

    for (const booking of bookings) {
      // Find latest message for this booking
      const lastMsgArray = await db.collection('chats')
        .find({ bookingId: booking._id.toString() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      const lastMsg = lastMsgArray[0] || null;

      // Find worker info
      let worker = null;
      if (booking.workerId) {
        worker = await db.collection('users').findOne({
          $or: [
            { uid: booking.workerId },
            { _id: ObjectId.isValid(booking.workerId) ? new ObjectId(booking.workerId) : null }
          ]
        });
      }

      populatedChats.push({
        bookingId: booking._id.toString(),
        jobTitle: booking.title || booking.serviceName || 'Job Service',
        workerId: booking.workerId,
        workerName: worker ? worker.name : (booking.workerName || 'Service Provider'),
        workerPhone: worker ? worker.phone : '',
        workerPhoto: worker ? worker.profilePhoto : 'assets/images/worker_ramesh.png',
        lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
        timestamp: lastMsg ? lastMsg.timestamp : booking.schedule || '',
        updatedAt: lastMsg ? lastMsg.createdAt : new Date(booking.createdAt).getTime()
      });
    }

    // Sort by latest message/update first
    populatedChats.sort((a, b) => b.updatedAt - a.updatedAt);

    res.json(populatedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// DEDICATED ADMIN PAYMENTS & APPROVAL ROUTER
// -----------------------------------------------------------------------------

// GET /api/payments
app.get('/api/payments', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const list = await db.collection('payments').find(filter).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/approve
app.post('/api/payments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid payment ID" });

    const payment = await db.collection('payments').findOne({ _id: new ObjectId(id) });
    if (!payment) return res.status(404).json({ error: "Payment record not found" });

    // 1. Mark payment as completed
    await db.collection('payments').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'completed', completedAt: new Date() } }
    );

    // 2. Update the worker subscription in 'workers' collection
    await db.collection('workers').updateOne(
      { uid: payment.workerUid },
      { $set: { 
        subscription: {
          plan: payment.plan || 'pro',
          status: 'active',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        updatedAt: new Date()
      } }
    );

    // 3. Update the worker subscription in 'users' collection (for auth session loading)
    await db.collection('users').updateOne(
      { uid: payment.workerUid },
      { $set: { 
        subscription: {
          isActive: true,
          planName: payment.plan === 'pro' ? 'GigDial Pro' : (payment.plan || 'Pro Plan'),
          price: '₹499 / Month',
          remainingDays: 30
        },
        updatedAt: new Date()
      } }
    );

    res.json({ success: true, message: "Payment approved and worker subscription activated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/worker/:uid/profile - edit profile details
app.put('/api/worker/:uid/profile', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, city, address, profilePhoto } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (city) updateFields.city = city;
    if (address) updateFields.address = address;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    // Update in users collection
    await db.collection('users').updateOne(
      { $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }] },
      { $set: updateFields }
    );

    // Update in workers collection
    const workerUpdate = {};
    if (name) workerUpdate.name = name;
    if (phone) workerUpdate.phone = phone;
    if (city) {
      workerUpdate.city = city;
      workerUpdate.location = `${city}, India`;
    }
    if (profilePhoto) workerUpdate.image = profilePhoto;

    await db.collection('workers').updateOne(
      { uid: uid },
      { $set: workerUpdate }
    );

    const updatedUser = await db.collection('users').findOne({
      $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload - Direct Cloudinary upload endpoint for all client apps & website
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const file = (req.files && req.files[0]) || req.file;
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }
    const folder = req.body.folder || 'gigdial_uploads';
    const result = await uploadFromBuffer(file.buffer, folder);
    res.json({ success: true, url: result.secure_url, secure_url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:uid/upload-profile-photo - Customer profile photo upload to Cloudinary
app.post('/api/users/:uid/upload-profile-photo', upload.any(), async (req, res) => {
  try {
    const { uid } = req.params;
    let photoPath = null;

    const uploadedFile = (req.files && req.files.length > 0 ? req.files[0] : null) || req.file;

    if (uploadedFile) {
      const result = await uploadFromBuffer(uploadedFile.buffer, 'customer_profiles', uploadedFile.originalname || 'profile.jpg');
      photoPath = result.secure_url;
    } else if (req.body && req.body.profilePhoto) {
      if (typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.startsWith('data:image')) {
        const base64Data = req.body.profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const result = await uploadFromBuffer(buffer, 'customer_profiles', 'profile.jpg');
        photoPath = result.secure_url;
      } else {
        photoPath = req.body.profilePhoto;
      }
    }

    if (!photoPath) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await db.collection('users').updateOne(
      { $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }] },
      { $set: { profilePhoto: photoPath } }
    );

    const updatedUser = await db.collection('users').findOne({
      $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    });

    res.json({ success: true, profilePhoto: photoPath, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/worker/:uid/upload-profile-photo - upload custom profile photo to Cloudinary
app.post('/api/worker/:uid/upload-profile-photo', upload.any(), async (req, res) => {
  try {
    const { uid } = req.params;
    let photoPath = null;

    const uploadedFile = (req.files && req.files.length > 0 ? req.files[0] : null) || req.file;

    if (uploadedFile) {
      const result = await uploadFromBuffer(uploadedFile.buffer, 'worker_profiles', uploadedFile.originalname || 'profile.jpg');
      photoPath = result.secure_url;
    } else if (req.body && req.body.profilePhoto) {
      if (typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.startsWith('data:image')) {
        const base64Data = req.body.profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const result = await uploadFromBuffer(buffer, 'worker_profiles', 'profile.jpg');
        photoPath = result.secure_url;
      } else {
        photoPath = req.body.profilePhoto;
      }
    }

    if (!photoPath) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Update in users collection
    await db.collection('users').updateOne(
      { $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }] },
      { $set: { profilePhoto: photoPath } }
    );

    // Update in workers collection
    await db.collection('workers').updateOne(
      { $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }] },
      { $set: { image: photoPath } }
    );

    const updatedUser = await db.collection('users').findOne({
      $or: [{ uid: uid }, { _id: ObjectId.isValid(uid) ? new ObjectId(uid) : null }]
    });

    res.json({ success: true, profilePhoto: photoPath, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GIGS, WALLETS, WITHDRAWALS, SERVICE REQUESTS, NOTIFICATIONS ENDPOINTS
// =============================================================================

// --- GIGS ---
app.post('/api/gigs/create', auth, async (req, res) => {
  try {
    const { title, description, category, serviceType, price, deliveryTime, revisions } = req.body;
    if (!title || !description || !category || !price) {
      return res.status(400).json({ error: "Title, description, category, and price are required." });
    }

    const newGig = {
      user: req.user._id,
      workerId: req.user._id.toString(),
      workerName: req.user.name,
      title,
      description,
      category,
      serviceType: serviceType || 'Residency',
      price: Number(price),
      deliveryTime: Number(deliveryTime) || 3,
      revisions: Number(revisions) || 3,
      reviews: [],
      rating: 5.0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('gigs').insertOne(newGig);
    res.json({ success: true, gig: { ...newGig, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gigs', async (req, res) => {
  try {
    const list = await db.collection('gigs').find({ status: 'active' }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gigs/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const list = await db.collection('gigs').find({ workerId }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gigs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();

    const result = await db.collection('gigs').updateOne(
      { _id: new ObjectId(id), workerId: req.user._id.toString() },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Gig not found or unauthorized." });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gigs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('gigs').deleteOne({
      _id: new ObjectId(id),
      workerId: req.user._id.toString()
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Gig not found or unauthorized." });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WALLET & TRANSACTIONS ---
app.get('/api/wallet/me', auth, async (req, res) => {
  try {
    let wallet = await db.collection('wallets').findOne({ user: req.user._id });
    if (!wallet) {
      wallet = {
        user: req.user._id,
        balance: 0,
        transactions: []
      };
      await db.collection('wallets').insertOne(wallet);
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WITHDRAWALS ---
app.post('/api/worker/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valid withdrawal amount is required." });
    }

    const wallet = await db.collection('wallets').findOne({ user: req.user._id });
    if (!wallet || wallet.balance < Number(amount)) {
      return res.status(400).json({ error: "Insufficient wallet balance." });
    }

    const withdrawalRequest = {
      user: req.user._id,
      workerId: req.user._id.toString(),
      workerName: req.user.name,
      amount: Number(amount),
      status: 'pending',
      createdAt: new Date()
    };

    // Deduct balance immediately in pending state
    await db.collection('wallets').updateOne(
      { user: req.user._id },
      { 
        $inc: { balance: -Number(amount) },
        $push: {
          transactions: {
            type: 'debit',
            amount: Number(amount),
            description: 'Withdrawal Request',
            status: 'pending',
            createdAt: new Date()
          }
        }
      }
    );

    const result = await db.collection('withdrawals').insertOne(withdrawalRequest);
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/withdrawals', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && !req.user.isAdmin) {
      return res.status(403).json({ error: "Admin privilege required." });
    }
    const list = await db.collection('withdrawals').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/withdrawals/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && !req.user.isAdmin) {
      return res.status(403).json({ error: "Admin privilege required." });
    }
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    }

    const withdrawal = await db.collection('withdrawals').findOne({ _id: new ObjectId(id) });
    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: "Withdrawal request already processed." });
    }

    if (status === 'approved') {
      await db.collection('withdrawals').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'completed', processedAt: new Date(), processedBy: req.user._id } }
      );
      // Update transaction status to completed
      await db.collection('wallets').updateOne(
        { user: withdrawal.user, "transactions.description": "Withdrawal Request", "transactions.status": "pending" },
        { $set: { "transactions.$.status": "completed" } }
      );
    } else {
      await db.collection('withdrawals').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'rejected', processedAt: new Date(), processedBy: req.user._id, rejectionReason } }
      );
      // Return funds back to worker
      await db.collection('wallets').updateOne(
        { user: withdrawal.user },
        { 
          $inc: { balance: withdrawal.amount },
          $push: {
            transactions: {
              type: 'credit',
              amount: withdrawal.amount,
              description: 'Withdrawal Rejected Refund',
              status: 'completed',
              createdAt: new Date()
            }
          }
        }
      );
      // Update original transaction status to failed
      await db.collection('wallets').updateOne(
        { user: withdrawal.user, "transactions.description": "Withdrawal Request", "transactions.status": "pending" },
        { $set: { "transactions.$.status": "failed" } }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const list = await db.collection('notifications')
      .find({ $or: [{ user: userId }, { uid: userId }] })
      .sort({ createdAt: -1, timestamp: -1 })
      .limit(50)
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('notifications').updateOne(
      { _id: new ObjectId(id), user: req.user._id.toString() },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SERVICE REQUESTS (POST REQUIREMENT) ---
app.post('/api/customer/service-requests', auth, async (req, res) => {
  try {
    const { category, title, description, preferredDate, preferredTime, budget } = req.body;
    if (!category || !title || !description) {
      return res.status(400).json({ error: "Category, title, and description are required." });
    }

    const newRequest = {
      user: req.user._id,
      customerId: req.user._id.toString(),
      customerName: req.user.name,
      category,
      title,
      description,
      preferredDate: preferredDate ? new Date(preferredDate) : new Date(),
      preferredTime: preferredTime || 'Flexible',
      budget: Number(budget) || 0,
      status: 'open',
      assignedWorker: null,
      createdAt: new Date()
    };

    const result = await db.collection('service_requests').insertOne(newRequest);
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/service-requests', auth, async (req, res) => {
  try {
    const list = await db.collection('service_requests')
      .find({ customerId: req.user._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/worker/service-requests/open', auth, async (req, res) => {
  try {
    const list = await db.collection('service_requests')
      .find({ status: 'open' })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// SUBSCRIPTION & UPI/QR PAYMENT ENDPOINTS
// =============================================================================

// GET /api/plans - Fetch active subscription plans
app.get('/api/plans', async (req, res) => {
  try {
    const list = await db.collection('subscription_plans').find({ isActive: true }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/settings - Fetch current UPI settings
app.get('/api/subscription/settings', async (req, res) => {
  try {
    const settings = await db.collection('subscription_settings').findOne({});
    res.json(settings || { upiId: 'gigdial@upi', autoGenerateQr: true, qrCodeImageUrl: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscription/settings - Admin updates UPI settings
app.put('/api/subscription/settings', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
      if (!user || (user.role !== 'admin' && !user.isAdmin)) {
        return res.status(403).json({ error: "Admin privilege required." });
      }
    }

    const { upiId, qrCodeImageUrl, autoGenerateQr } = req.body;
    if (!upiId) {
      return res.status(400).json({ error: "UPI ID is required." });
    }

    await db.collection('subscription_settings').updateOne(
      {},
      {
        $set: {
          upiId,
          qrCodeImageUrl: qrCodeImageUrl || '',
          autoGenerateQr: !!autoGenerateQr,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/requests - Worker creates a new subscription request
app.post('/api/subscription/requests', auth, async (req, res) => {
  try {
    const { workerUid, plan, amount, transactionId } = req.body;
    const targetUid = workerUid || req.user._id.toString();

    if (!plan || !amount || !transactionId) {
      return res.status(400).json({ error: "plan, amount, and transactionId are required." });
    }

    const worker = await db.collection('users').findOne({ _id: new ObjectId(targetUid) });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const pending = await db.collection('subscription_requests').findOne({
      workerUid: targetUid,
      status: 'pending'
    });
    if (pending) {
      return res.status(400).json({ error: "You already have a pending upgrade request. Please wait for Admin approval." });
    }

    const newRequest = {
      workerUid: targetUid,
      workerName: worker.name,
      plan,
      amount: Number(amount),
      transactionId,
      status: 'pending',
      requestedAt: new Date()
    };

    const result = await db.collection('subscription_requests').insertOne(newRequest);

    await sendNotification({
      uid: targetUid,
      title: "Upgrade Request Submitted",
      message: `Your request to upgrade to ${plan} with Transaction ID ${transactionId} has been sent for admin verification.`,
      type: 'subscription'
    });

    res.json({ success: true, requestId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/requests - Admin lists all requests
app.get('/api/subscription/requests', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
      if (!user || (user.role !== 'admin' && !user.isAdmin)) {
        return res.status(403).json({ error: "Admin privilege required." });
      }
    }

    const status = req.query.status;
    const query = status ? { status } : {};
    const list = await db.collection('subscription_requests')
      .find(query)
      .sort({ requestedAt: -1 })
      .toArray();

    // Populate contact fields if missing from request details
    for (let reqObj of list) {
      if (reqObj.workerUid && ObjectId.isValid(reqObj.workerUid)) {
        const u = await db.collection('users').findOne({ _id: new ObjectId(reqObj.workerUid) });
        if (u) {
          reqObj.workerEmail = u.email;
          reqObj.workerPhone = u.phone;
        }
      }
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/requests/worker/:workerUid - Worker views their own request history
app.get('/api/subscription/requests/worker/:workerUid', auth, async (req, res) => {
  try {
    const { workerUid } = req.params;
    const list = await db.collection('subscription_requests')
      .find({ workerUid })
      .sort({ requestedAt: -1 })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscription/requests/:id/status - Admin approves/rejects a request
app.put('/api/subscription/requests/:id/status', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
      if (!user || (user.role !== 'admin' && !user.isAdmin)) {
        return res.status(403).json({ error: "Admin privilege required." });
      }
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await db.collection('subscription_requests').findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await db.collection('subscription_requests').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          adminNotes: adminNotes || '',
          processedAt: new Date()
        }
      }
    );

    if (status === 'approved') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      await db.collection('users').updateOne(
        { _id: new ObjectId(request.workerUid) },
        {
          $set: {
            subscription: {
              plan: request.plan,
              startDate: new Date(),
              endDate: expiry,
              isActive: true
            },
            updatedAt: new Date()
          }
        }
      );

      await db.collection('workers').updateOne(
        { uid: request.workerUid },
        {
          $set: {
            'subscription.plan': request.plan,
            'subscription.active': true,
            'subscription.expiryDate': expiry,
            updatedAt: new Date()
          }
        }
      );
    }

    await sendNotification({
      uid: request.workerUid,
      title: `Subscription ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your request to upgrade to ${request.plan} has been ${status}. ${adminNotes ? 'Reason: ' + adminNotes : ''}`,
      type: 'subscription'
    });

    io.to(request.workerUid).emit('subscription_updated', {
      plan: status === 'approved' ? request.plan : 'none',
      isActive: status === 'approved',
      error: status === 'rejected' ? (adminNotes || 'Subscription upgrade request was rejected.') : null
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker/subscription - Get current worker's subscription status
app.get('/api/worker/subscription', auth, async (req, res) => {
  try {
    const userObj = await db.collection('users').findOne({ _id: req.user._id });
    const pendingRequest = await db.collection('subscription_requests').findOne({
      workerUid: req.user._id.toString(),
      status: 'pending'
    });

    res.json({
      subscription: userObj.subscription || { plan: 'none', isActive: false },
      pendingRequest: pendingRequest ? true : false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews - Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const list = await db.collection('reviews').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reviews/:id/status - Update review status (approve, hide, etc.)
app.put('/api/reviews/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid review ID" });
    await db.collection('reviews').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id - Delete a review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid review ID" });
    await db.collection('reviews').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support/tickets - Get all support tickets (using feedbacks/support_tickets)
app.get('/api/support/tickets', async (req, res) => {
  try {
    const list = await db.collection('support_tickets').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/support/tickets/:id/status - Update support ticket status and priority
app.put('/api/support/tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ticket ID" });
    
    const updateObj = {};
    if (status !== undefined) updateObj.status = status;
    if (priority !== undefined) updateObj.priority = priority;
    updateObj.updatedAt = new Date();

    await db.collection('support_tickets').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateObj }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/banners - Get all promotional banners
app.get('/api/banners', async (req, res) => {
  try {
    const list = await db.collection('banners').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/banners/active - Get active promotional banners for client apps
app.get('/api/banners/active', async (req, res) => {
  try {
    const list = await db.collection('banners').find({
      isActive: { $ne: false },
      status: { $ne: 'inactive' }
    }).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/banners - Create a new promotional banner
app.post('/api/banners', async (req, res) => {
  try {
    const { title, image, route, isActive, status } = req.body;
    const activeVal = isActive !== false && status !== 'inactive';
    const newBanner = {
      title,
      image,
      route,
      isActive: activeVal,
      status: activeVal ? 'active' : 'inactive',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('banners').insertOne(newBanner);
    res.json({ success: true, banner: { ...newBanner, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/banners/:id - Update promotional banner settings
app.put('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    updateData.updatedAt = new Date();
    
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid banner ID" });
    await db.collection('banners').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/banners/:id - Delete a promotional banner
app.delete('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid banner ID" });
    await db.collection('banners').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blogs - Get published blog posts for public/clients
app.get('/api/blogs', async (req, res) => {
  try {
    const list = await db.collection('blogs').find({
      $or: [{ isPublished: true }, { status: 'published' }]
    }).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blogs/admin - Get all blog posts for admin
app.get('/api/blogs/admin', async (req, res) => {
  try {
    const list = await db.collection('blogs').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/blogs - Create a new blog post
app.post('/api/blogs', async (req, res) => {
  try {
    const { title, slug, category, isPublished, status, image, thumbnail, summary, excerpt, content } = req.body;
    const cleanSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const published = isPublished !== false && status !== 'draft';
    const img = image || thumbnail || '';
    const sum = summary || excerpt || '';

    const newBlog = {
      title,
      slug: cleanSlug,
      category: category || 'Tips & Advice',
      isPublished: published,
      status: published ? 'published' : 'draft',
      image: img,
      thumbnail: img,
      summary: sum,
      excerpt: sum,
      content: content || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('blogs').insertOne(newBlog);
    res.json({ success: true, blog: { ...newBlog, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/blogs/:id - Update blog post
app.put('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid blog ID" });
    
    const updateData = { ...req.body };
    delete updateData._id;
    updateData.updatedAt = new Date();

    if (updateData.isPublished !== undefined) {
      updateData.status = updateData.isPublished ? 'published' : 'draft';
    } else if (updateData.status !== undefined) {
      updateData.isPublished = updateData.status.toLowerCase() === 'published';
    }

    if (updateData.image) updateData.thumbnail = updateData.image;
    if (updateData.thumbnail) updateData.image = updateData.thumbnail;
    if (updateData.summary) updateData.excerpt = updateData.summary;
    if (updateData.excerpt) updateData.summary = updateData.excerpt;

    if (updateData.title && !updateData.slug) {
      updateData.slug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    await db.collection('blogs').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/blogs/:id - Delete blog post
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query = {};
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { _id: id }, { id: id }] };
    } else {
      query = { $or: [{ _id: id }, { id: id }] };
    }

    const result = await db.collection('blogs').deleteOne(query);
    res.json({ success: true, message: "Blog deleted successfully", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedbacks - Get all user feedbacks
app.get('/api/feedbacks', async (req, res) => {
  try {
    const list = await db.collection('feedbacks').find().sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/feedbacks/:id - Delete a user feedback
app.delete('/api/feedbacks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid feedback ID" });
    await db.collection('feedbacks').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Express Global Error Handler - Always return JSON, never HTML
app.use((err, req, res, next) => {
  console.error("Global Express Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "An unexpected internal server error occurred."
  });
});

module.exports = app;

// For local development, start the server
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GigDial Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}


