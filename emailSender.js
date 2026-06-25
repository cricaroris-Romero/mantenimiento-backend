const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'distribuidora.beerman@gmail.com';

sgMail.setApiKey(SENDGRID_API_KEY);

async function sendEmail({ to, subject, text, attachment }) {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY no configurado. Simulando env\u00edo de email.');
    console.log(`Enviando a: ${to.join(', ')}`);
    console.log(`Asunto: ${subject}`);
    if (attachment) {
      console.log(`Archivo: ${attachment.filename} (${(attachment.content.length / 1024).toFixed(0)} KB)`);
    }
    return { success: true, simulated: true };
  }

  const msg = {
    to,
    bcc: FROM_EMAIL,
    from: FROM_EMAIL,
    subject,
    text,
    attachments: attachment ? [
      {
        content: attachment.content.toString('base64'),
        filename: attachment.filename,
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ] : []
  };

  await sgMail.send(msg);
  return { success: true };
}

module.exports = { sendEmail };
