const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || 'distribuidora.beerman@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  },
  connectionTimeout: 45000,
  greetingTimeout: 45000,
  socketTimeout: 120000
});

async function sendEmail({ to, subject, text, attachment }) {
  if (!GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_APP_PASSWORD no configurado. Simulando envío de email.');
    console.log(`Enviando a: ${to.join(', ')}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Archivo: ${attachment.filename} (${(attachment.content.length / 1024).toFixed(0)} KB)`);
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"Mantenimiento Preventivo" <${GMAIL_USER}>`,
    to: to.join(', '),
    bcc: GMAIL_USER,
    subject,
    text,
    attachments: attachment ? [
      {
        filename: attachment.filename,
        content: attachment.content
      }
    ] : []
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendEmail };
