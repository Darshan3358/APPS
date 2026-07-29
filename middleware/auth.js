const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'gigdial_secret_key_12345';
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://zarwebcoders:zarwebcoders@cluster0.lqgakzj.mongodb.net/gigdialapp";

let db = null;
let client = null;

async function connectDB() {
  if (db) return db;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db();
    return db;
  } catch (err) {
    console.error('DB connection error in auth:', err);
    return null;
  }
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const database = await connectDB();
    if (!database) {
      return res.status(503).json({ error: 'Database connection failed' });
    }

    const user = await database.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked by the admin' });
    }

    if (user.role === 'worker' && (!user.registrationStep || user.registrationStep >= 3) && !user.isApproved) {
      if (user.kycStatus === 'rejected') {
        return res.status(403).json({ error: 'Your KYC verification has been rejected by the admin. Please contact support.' });
      }
      return res.status(403).json({ error: 'Your account is pending admin approval. You cannot log in until approved.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
