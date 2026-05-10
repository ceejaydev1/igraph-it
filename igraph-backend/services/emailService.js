// emailService.js - Brevo HTTP API (Production)
const https = require('https');

const sendVerificationEmail = async (toEmail, fullName, otp) => {
  const apiKey = process.env.EMAIL_PASS;
  const senderEmail = process.env.EMAIL_USER;

  const data = JSON.stringify({
    sender: { email: senderEmail, name: 'iGraph IT' },
    to: [{ email: toEmail, name: fullName }],
    subject: `Verify your iGraph IT account - OTP: ${otp}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4c6fff;">Welcome to iGraph IT!</h2>
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your verification code is:</p>
          <div style="background: #f0f4ff; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; border-radius: 10px;">
            <strong>${otp}</strong>
          </div>
          <p>This code expires in 5 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr>
          <p style="color: #888; font-size: 12px;">iGraph IT - Learn SDLC and Create UML Diagrams</p>
        </div>
      </body>
      </html>
    `
  });

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`✅ Email sent to ${toEmail}`);
          resolve(true);
        } else {
          console.error('Email error:', responseData);
          reject(new Error(`Email API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const sendPasswordResetEmail = async (toEmail, fullName, otp) => {
  const apiKey = process.env.EMAIL_PASS;
  const senderEmail = process.env.EMAIL_USER;

  const data = JSON.stringify({
    sender: { email: senderEmail, name: 'iGraph IT' },
    to: [{ email: toEmail, name: fullName }],
    subject: `Reset your password - OTP: ${otp}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e74c3c;">Reset Your Password</h2>
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your password reset code is:</p>
          <div style="background: #fff5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; border-radius: 10px;">
            <strong>${otp}</strong>
          </div>
          <p>This code expires in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #888; font-size: 12px;">iGraph IT - Learn SDLC and Create UML Diagrams</p>
        </div>
      </body>
      </html>
    `
  });

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`✅ Reset email sent to ${toEmail}`);
          resolve(true);
        } else {
          console.error('Reset email error:', responseData);
          reject(new Error(`Email API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };