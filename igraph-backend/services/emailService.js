const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 (disable IPv6)
dns.setDefaultResultOrder('ipv4first');

// Brevo SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.sendinblue.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Force IPv4
  family: 4,
  // Connection settings
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error.message);
  } else {
    console.log('✅ Email service ready (Brevo - IPv4 forced)');
  }
});

const sendVerificationEmail = async (toEmail, fullName, otp) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} - Verify your ${process.env.APP_NAME} account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 10px; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
          .app-name { color: #1a73e8; font-size: 28px; font-weight: bold; margin: 0; }
          .otp-box { background: #f0f7ff; border: 2px dashed #1a73e8; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #1a73e8; margin: 0; }
          .expiry { color: #e74c3c; font-weight: bold; }
          .footer { margin-top: 30px; color: #888; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p class="app-name">📊 iGraph IT</p>
          </div>
          <p>Hi <strong>${fullName}</strong>,</p>
          <p>Welcome to <strong>iGraph IT</strong>! Use the OTP code below to verify your account:</p>
          <div class="otp-box">
            <p class="otp-code">${otp}</p>
          </div>
          <p>⏰ This code expires in <span class="expiry">5 minutes</span>.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} iGraph IT - Learn SDLC and Create UML Diagrams</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (toEmail, fullName, otp) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} - Reset your ${process.env.APP_NAME} password`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 10px; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px; }
          .app-name { color: #e74c3c; font-size: 28px; font-weight: bold; margin: 0; }
          .otp-box { background: #fff5f5; border: 2px dashed #e74c3c; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #e74c3c; margin: 0; }
          .expiry { color: #e74c3c; font-weight: bold; }
          .footer { margin-top: 30px; color: #888; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p class="app-name">📊 iGraph IT</p>
          </div>
          <p>Hi <strong>${fullName}</strong>,</p>
          <p>We received a request to reset your password. Use the OTP code below:</p>
          <div class="otp-box">
            <p class="otp-code">${otp}</p>
          </div>
          <p>⏰ This code expires in <span class="expiry">5 minutes</span>.</p>
          <p>⚠️ If you did not request a password reset, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} iGraph IT — Dominican College of Tarlac</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };