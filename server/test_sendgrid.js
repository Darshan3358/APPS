require('dotenv').config();

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error("Error: SENDGRID_API_KEY is not defined in environment/dotenv.");
  process.exit(1);
}

const toEmail = process.argv[2] || 'darshanthakar5@gmail.com'; // Default to user's email if possible, or pass as arg

console.log(`Sending test email to ${toEmail} via SendGrid API...`);

const fromEmail = process.env.EMAIL_FROM || 'darshanthanki77@gmail.com';

const body = {
  personalizations: [{ to: [{ email: toEmail }] }],
  from: { email: fromEmail, name: 'GigDial Test' },
  subject: 'Test Email - SendGrid Integration',
  content: [
    { type: 'text/plain', value: 'This is a test email sent from the GigDial server via SendGrid!' },
    { type: 'text/html', value: '<h3>This is a test email sent from the GigDial server via SendGrid!</h3>' }
  ]
};

fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})
.then(async (res) => {
  if (res.ok) {
    console.log(`✅ Success! Email sent successfully to ${toEmail}`);
    process.exit(0);
  } else {
    const errText = await res.text();
    console.error(`❌ SendGrid API Error:`, errText);
    process.exit(1);
  }
})
.catch((err) => {
  console.error(`❌ Fetch Error:`, err.message);
  process.exit(1);
});
