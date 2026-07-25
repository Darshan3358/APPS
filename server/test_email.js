const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'gigdial@gmail.com',
    pass: 'mdzjjkieybjxmlzk'
  }
});

console.log('Testing SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection failed:', error);
    process.exit(1);
  } else {
    console.log('SMTP Server is ready to take messages');
    process.exit(0);
  }
});
