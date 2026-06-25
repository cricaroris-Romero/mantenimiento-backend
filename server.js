require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generatePDF } = require('./pdfGenerator');
const { sendEmail } = require('./emailSender');
const { uploadToDrive } = require('./driveUploader');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const reportStatus = {};

app.post('/api/send-report', async (req, res) => {
  const { tecnico, fecha, datosEquipo, fotos, correos } = req.body;

  if (!tecnico || !fecha || !datosEquipo || !correos || correos.length === 0) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
  }

  const reportId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const ubicacion = datosEquipo.ubicacion || 'SIN_UBICACION';
  const nombreArchivo = `Mantenimiento_Preventivo_${ubicacion.replace(/[^a-zA-Z0-9]/g, '_')}_${fecha.replace(/-/g, '')}.pdf`;

  reportStatus[reportId] = { status: 'processing', message: 'Generando PDF...' };

  res.json({
    success: true,
    reportId,
    message: 'Reporte recibido. El procesamiento toma hasta 2 minutos. Revisa tu correo y Google Drive.'
  });

  setTimeout(async () => {
    try {
      reportStatus[reportId] = { status: 'processing', message: 'Generando PDF...' };
      const pdfBuffer = await generatePDF({ tecnico, fecha, datosEquipo, fotos });
      console.log(`[${reportId}] PDF generado: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

      reportStatus[reportId] = { status: 'processing', message: 'Enviando correo...' };
      const emailPromise = sendEmail({
        to: correos,
        subject: `Mantenimiento Preventivo - ${ubicacion} - ${fecha}`,
        text: `Adjunto encontrará el reporte de mantenimiento preventivo para ${ubicacion} realizado el ${fecha} por ${tecnico}.`,
        attachment: { filename: nombreArchivo, content: pdfBuffer }
      });
      const emailTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout al enviar correo (Gmail SMTP no respondió en 90s)')), 90000)
      );
      await Promise.race([emailPromise, emailTimeout]);
      console.log(`[${reportId}] Correo enviado a: ${correos.join(', ')}`);

      reportStatus[reportId] = { status: 'processing', message: 'Subiendo a Drive...' };
      const driveResult = await uploadToDrive({
        pdfBuffer,
        fileName: nombreArchivo,
        folderId: process.env.DRIVE_FOLDER_ID || '1fAScp71hOnFGQjsaKbIhnNEAVTnPkJzV'
      });
      console.log(`[${reportId}] Drive: ${driveResult.webViewLink || 'OK (simulado)'}`);

      reportStatus[reportId] = { status: 'done', message: 'Reporte enviado correctamente' };
    } catch (error) {
      console.error(`[${reportId}] Error:`, error.message);
      reportStatus[reportId] = { status: 'error', message: error.message };
    }
  }, 100);
});

app.get('/api/report-status/:id', (req, res) => {
  const status = reportStatus[req.params.id] || { status: 'not_found', message: 'Reporte no encontrado' };
  if (status.status === 'done' || status.status === 'error') {
    setTimeout(() => delete reportStatus[req.params.id], 60000);
  }
  res.json(status);
});

/* ======= SYNC (progreso compartido entre dispositivos) ======= */
const fs = require('fs');
const SYNC_FILE = './sync-data.json';

function readSync() {
  try {
    return JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
  } catch {
    return { sent: {}, drafts: {} };
  }
}

function writeSync(data) {
  fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/sync', (req, res) => {
  res.json(readSync());
});

app.post('/api/sync', (req, res) => {
  try {
    const { sent, drafts } = req.body;
    const current = readSync();
    if (sent !== undefined) current.sent = sent;
    if (drafts !== undefined) current.drafts = drafts;
    writeSync(current);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/reports', (req, res) => {
  res.json(reportStatus);
});

app.post('/api/test-email', async (req, res) => {
  try {
    const testResult = await sendEmail({
      to: ['distribuidora.beerman@gmail.com'],
      subject: 'Test desde Render',
      text: 'Si recibís esto, el email funciona desde Render.',
      attachment: null
    });
    res.json({ success: true, simulated: !!testResult.simulated });
  } catch (err) {
    res.json({ success: false, error: err.message, code: err.code });
  }
});

app.get('/api/diagnose', (req, res) => {
  const fs = require('fs');
  const hasGmailUser = !!process.env.GMAIL_USER;
  const hasGmailPass = !!process.env.GMAIL_APP_PASSWORD;
  const hasDriveFolder = !!process.env.DRIVE_FOLDER_ID;
  const hasOauthClient = !!process.env.OAUTH_CLIENT_JSON;
  const hasOauthTokens = !!process.env.OAUTH_TOKENS_JSON;
  const hasServiceAccount = fs.existsSync('./service-account.json');
  const hasOauthFiles = fs.existsSync('./oauth-client.json') && fs.existsSync('./tokens.json');

  const driveMethod = hasOauthClient && hasOauthTokens ? 'env vars' :
    hasOauthFiles ? 'local files' :
    hasServiceAccount ? 'service account' :
    'NOT CONFIGURED';

  res.json({
    email: {
      user: hasGmailUser ? '✓' : '✗',
      appPassword: hasGmailPass ? '✓' : '✗'
    },
    drive: {
      folderId: hasDriveFolder ? '✓' : '✗',
      method: driveMethod
    },
    driveWillWork: (hasOauthClient && hasOauthTokens) || hasOauthFiles || hasServiceAccount,
    emailWillWork: hasGmailPass
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_APP_PASSWORD no configurada. Los correos se simularán.');
  }
  const fs = require('fs');
  const saPath = process.env.SERVICE_ACCOUNT_PATH || './service-account.json';
  if (!fs.existsSync(saPath)) {
    console.warn(`${saPath} no encontrado. La subida a Drive se simulará.`);
  }
});

server.timeout = 300000;
