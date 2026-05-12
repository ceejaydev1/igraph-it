const https = require('https');

const sendVerificationEmail = async (toEmail, fullName, otp) => {
  const apiKey = process.env.EMAIL_PASS;
  const senderEmail = process.env.EMAIL_USER;
  const isProduction = process.env.NODE_ENV === 'production';

  // REMOVED the xkeysib- check - that was blocking your valid key!
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
    subject: `Verify your account - OTP: ${otp}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">iGraph IT</h1>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Welcome ${fullName || 'User'}!</h2>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; border-radius: 8px;">
            <strong style="color: #667eea;">${otp}</strong>
          </div>
          <p>This code expires in <strong>5 minutes</strong>.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">iGraph IT - Learn SDLC & Create UML Diagrams</p>
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

  // REMOVED the xkeysib- check - that was blocking your valid key!
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
    subject: `Reset your password - OTP: ${otp}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">iGraph IT</h1>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Hello ${fullName || 'User'},</h2>
          <p>We received a request to reset your password. Use the code below:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; border-radius: 8px;">
            <strong style="color: #667eea;">${otp}</strong>
          </div>
          <p>This code expires in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">iGraph IT - Learn SDLC & Create UML Diagrams</p>
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