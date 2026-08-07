const nodemailer = require('nodemailer');

/**
 * Utility function to send HTML emails using Nodemailer
 * @param {Object} options - { email, subject, message }
 */
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'E-Commerce Store'}" <${process.env.FROM_EMAIL || 'noreply@ecommerce.com'}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
