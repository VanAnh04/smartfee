import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const secure = port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendOTPEmail = async (email, otp) => {
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực OTP - SmartFee</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">SmartFee</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Hệ thống quản lý học phí thông minh</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; text-align: center;">Mã xác thực OTP</h2>
              <p style="color: #6b7280; margin: 0 0 32px 0; text-align: center; font-size: 16px; line-height: 1.6;">
                Xin chào,<br>
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để xác thực.
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px;">Mã OTP của bạn:</p>
                <p style="color: #1e40af; margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</p>
              </div>
              
              <!-- Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>Lưu ý:</strong><br>
                  • Mã OTP có hiệu lực trong <strong>5 phút</strong><br>
                  • Không chia sẻ mã này với bất kỳ ai<br>
                  • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
                </p>
              </div>
              
              <!-- Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${frontendUrl}/verify-otp" style="display: inline-block; background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Xác thực ngay</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 32px; text-align: center;">
              <p style="color: #9ca3af; margin: 0 0 8px 0; font-size: 14px;">
                SmartFee - Hệ thống quản lý học phí thông minh
              </p>
              <p style="color: #d1d5db; margin: 0; font-size: 12px;">
                Email này được gửi tự động. Vui lòng không trả lời.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const mailOptions = {
    from: `"SmartFee" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Mã xác thực OTP - SmartFee',
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email đã được gửi đến ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Lỗi gửi email đến ${email}:`, error.message);
    throw error;
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chào mừng - SmartFee</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">SmartFee</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0;">Chào mừng ${name}!</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký SmartFee. Tài khoản của bạn đã sẵn sàng sử dụng.
              </p>
              <a href="${frontendUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Đăng nhập ngay</a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 32px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">SmartFee - Hệ thống quản lý học phí thông minh</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: `"SmartFee" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Chào mừng đến với SmartFee!',
      html: htmlContent
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Lỗi gửi email welcome đến ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

export const sendPasswordChangedEmail = async (email) => {
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Thông báo thay đổi mật khẩu - SmartFee</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Thay đổi mật khẩu thành công</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <p style="color: #374151; font-size: 16px;">Mật khẩu của bạn đã được thay đổi thành công.</p>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  <strong>Thông tin bảo mật:</strong><br>
                  • Tất cả các phiên đăng nhập trước đó đã bị vô hiệu hóa<br>
                  • Nếu không phải bạn thực hiện, vui lòng liên hệ hỗ trợ ngay
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 32px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">SmartFee</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await transporter.sendMail({
      from: `"SmartFee" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Mật khẩu đã được thay đổi - SmartFee',
      html: htmlContent
    });
    return { success: true };
  } catch (error) {
    console.error(`Lỗi gửi email thông báo đến ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail
};
