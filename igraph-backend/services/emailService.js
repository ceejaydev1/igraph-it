const https = require('https');

const sendVerificationEmail = async (toEmail, fullName, otp) => {
  const apiKey = process.env.EMAIL_PASS;
  const senderEmail = process.env.EMAIL_USER;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    console.log(`📧 [${isProduction ? 'BREVO_MISSING' : 'DEV_MODE'}] Verification OTP for ${toEmail}: ${otp}`);
    
    if (isProduction && (!apiKey || apiKey === 'your_brevo_api_key_here')) {
      console.error('🚨 CRITICAL: Brevo API key missing in production!');
    }
    
    return true;
  }

  if (!senderEmail || !senderEmail.includes('@')) {
    console.error('❌ Invalid sender email:', senderEmail);
    console.log(`📧 [FALLBACK] Verification OTP for ${toEmail}: ${otp}`);
    return true;
  }

  const emailData = {
    sender: { email: senderEmail, name: 'iGraph IT' },
    to: [{ email: toEmail, name: fullName || 'User' }],
    subject: `Verify your iGraph IT account`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #eef2ff;
            margin: 0;
            padding: 20px;
          }
          
          .container {
            max-width: 500px;
            margin: 0 auto;
            position: relative;
          }
          
          /* Grid Background */
          .grid-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: radial-gradient(circle at 2px 2px, #4c6fff 1px, transparent 1px);
            background-size: 32px 32px;
            opacity: 0.12;
            border-radius: 28px;
            pointer-events: none;
          }
          
          /* Card */
          .card {
            background-color: #ffffff;
            border-radius: 28px;
            padding: 40px 32px;
            position: relative;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
            border: 1px solid #f1f5ff;
          }
          
          /* Header */
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          
          /* Content */
          .content {
            text-align: center;
          }
          
          h2 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
          }
          
          .message {
            font-size: 14px;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          
          /* OTP Box */
          .otp-box {
            background-color: #f8faff;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }
          
          .otp-code {
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #4c6fff;
            font-family: 'Courier New', monospace;
          }
          
          .expiry {
            font-size: 12px;
            color: #8896b3;
            margin-top: 12px;
          }
          
          .expiry strong {
            color: #4c6fff;
          }
          
          /* Footer */
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eef2ff;
          }
          
          .footer p {
            font-size: 11px;
            color: #94a3b8;
          }
          
          /* Responsive */
          @media (max-width: 480px) {
            .card {
              padding: 28px 20px;
            }
            .otp-code {
              font-size: 32px;
              letter-spacing: 6px;
            }
            h2 {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="grid-bg"></div>
          
          <div class="card">
            <div class="header">
              <div class="logo">iGraph IT</div>
            </div>
            
            <div class="content">
              <h2>Verify Your Email</h2>
              <p class="message">Hi ${fullName || 'User'},<br>Enter this code to verify your account.</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">Expires in <strong>5 minutes</strong></div>
              </div>
            </div>
            
            <div class="footer">
              <p>iGraph IT — Learn SDLC & Create UML Diagrams</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const data = JSON.stringify(emailData);

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    timeout: 8000,
    headers: {
      Accept: 'application/json',
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode === 201) {
          console.log(`✅ Verification email sent to ${toEmail} (${duration}ms)`);
          resolve(true);
        } else {
          console.error(`⚠️ Brevo API error ${res.statusCode}:`, responseData.substring(0, 200));
          console.log(`📧 [BACKUP] Verification OTP for ${toEmail}: ${otp}`);
          resolve(true);
        }
      });
    });

    req.on('timeout', () => {
      console.error(`⏱️ Brevo timeout after 8s - OTP: ${otp}`);
      req.destroy();
      console.log(`📧 [BACKUP] Verification OTP for ${toEmail}: ${otp}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.error(`❌ Brevo connection error: ${err.message}`);
      console.log(`📧 [BACKUP] Verification OTP for ${toEmail}: ${otp}`);
      resolve(true);
    });

    req.write(data);
    req.end();
  });
};

const sendPasswordResetEmail = async (toEmail, fullName, otp) => {
  const apiKey = process.env.EMAIL_PASS;
  const senderEmail = process.env.EMAIL_USER;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    console.log(`📧 [${isProduction ? 'BREVO_MISSING' : 'DEV_MODE'}] Reset OTP for ${toEmail}: ${otp}`);
    
    if (isProduction && (!apiKey || apiKey === 'your_brevo_api_key_here')) {
      console.error('🚨 CRITICAL: Brevo API key missing in production!');
    }
    
    return true;
  }

  if (!senderEmail || !senderEmail.includes('@')) {
    console.error('❌ Invalid sender email:', senderEmail);
    console.log(`📧 [FALLBACK] Reset OTP for ${toEmail}: ${otp}`);
    return true;
  }

  const emailData = {
    sender: { email: senderEmail, name: 'iGraph IT' },
    to: [{ email: toEmail, name: fullName || 'User' }],
    subject: `Reset your iGraph IT password`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #eef2ff;
            margin: 0;
            padding: 20px;
          }
          
          .container {
            max-width: 500px;
            margin: 0 auto;
            position: relative;
          }
          
          /* Grid Background */
          .grid-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: radial-gradient(circle at 2px 2px, #4c6fff 1px, transparent 1px);
            background-size: 32px 32px;
            opacity: 0.12;
            border-radius: 28px;
            pointer-events: none;
          }
          
          /* Card */
          .card {
            background-color: #ffffff;
            border-radius: 28px;
            padding: 40px 32px;
            position: relative;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
            border: 1px solid #f1f5ff;
          }
          
          /* Header */
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          
          /* Content */
          .content {
            text-align: center;
          }
          
          h2 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
          }
          
          .message {
            font-size: 14px;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          
          /* OTP Box */
          .otp-box {
            background-color: #f8faff;
            border: 2px solid #fee2e2;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }
          
          .otp-code {
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #ef4444;
            font-family: 'Courier New', monospace;
          }
          
          .expiry {
            font-size: 12px;
            color: #8896b3;
            margin-top: 12px;
          }
          
          .expiry strong {
            color: #ef4444;
          }
          
          /* Footer */
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eef2ff;
          }
          
          .footer p {
            font-size: 11px;
            color: #94a3b8;
          }
          
          /* Responsive */
          @media (max-width: 480px) {
            .card {
              padding: 28px 20px;
            }
            .otp-code {
              font-size: 32px;
              letter-spacing: 6px;
            }
            h2 {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="grid-bg"></div>
          
          <div class="card">
            <div class="header">
              <div class="logo">iGraph IT</div>
            </div>
            
            <div class="content">
              <h2>Reset Password</h2>
              <p class="message">Hi ${fullName || 'User'},<br>Use this code to reset your password.</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">Expires in <strong>5 minutes</strong></div>
              </div>
              
              <p class="message" style="font-size: 12px; margin-top: 16px;">Didn't request this? You can ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>iGraph IT — Learn SDLC & Create UML Diagrams</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const data = JSON.stringify(emailData);

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    timeout: 8000,
    headers: {
      Accept: 'application/json',
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode === 201) {
          console.log(`✅ Reset email sent to ${toEmail} (${duration}ms)`);
          resolve(true);
        } else {
          console.error(`⚠️ Brevo API error ${res.statusCode}:`, responseData.substring(0, 200));
          console.log(`📧 [BACKUP] Reset OTP for ${toEmail}: ${otp}`);
          resolve(true);
        }
      });
    });

    req.on('timeout', () => {
      console.error(`⏱️ Brevo timeout after 8s - OTP: ${otp}`);
      req.destroy();
      console.log(`📧 [BACKUP] Reset OTP for ${toEmail}: ${otp}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.error(`❌ Brevo connection error: ${err.message}`);
      console.log(`📧 [BACKUP] Reset OTP for ${toEmail}: ${otp}`);
      resolve(true);
    });

    req.write(data);
    req.end();
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };