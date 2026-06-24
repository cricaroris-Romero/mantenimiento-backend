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

app.post('/api/send-report', async (req, res) => {
  const { tecnico, fecha, datosEquipo, fotos, correos } = req.body;

  if (!tecnico || !fecha || !datosEquipo || !correos || correos.length === 0) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
  }

  res.json({ success: true, message: 'Reporte recibido. Procesando en segundo plano...' });

  processReport({ tecnico, fecha, datosEquipo, fotos, correos }).catch(err => {
    console.error('Error en procesamiento de fondo:', err);
  });
});

async function processReport({ tecnico, fecha, datosEquipo, fotos, correos }) {
  try {
    const ubicacion = datosEquipo.ubicacion || 'SIN_UBICACION';
    const nombreArchivo = `Mantenimiento_Preventivo_${ubicacion.replace(/[^a-zA-Z0-9]/g, '_')}_${fecha.replace(/-/g, '')}.pdf`;

    const pdfBuffer = await generatePDF({ tecnico, fecha, datosEquipo, fotos });

    await sendEmail({
      to: correos,
      subject: `Mantenimiento Preventivo - ${ubicacion} - ${fecha}`,
      text: `Adjunto encontrará el reporte de mantenimiento preventivo para ${ubicacion} realizado el ${fecha} por ${tecnico}.`,
      attachment: { filename: nombreArchivo, content: pdfBuffer }
    });

    const driveResult = await uploadToDrive({
      pdfBuffer,
      fileName: nombreArchivo,
      folderId: process.env.DRIVE_FOLDER_ID || '1fAScp71hOnFGQjsaKbIhnNEAVTnPkJzV'
    });

    console.log(`Reporte ${nombreArchivo} procesado OK. Drive: ${driveResult.webViewLink || 'OK'}`);
  } catch (error) {
    console.error('Error procesando reporte:', error);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️  GMAIL_APP_PASSWORD no configurada. Los correos se simularán.');
  }
  const fs = require('fs');
  const saPath = process.env.SERVICE_ACCOUNT_PATH || './service-account.json';
  if (!fs.existsSync(saPath)) {
    console.warn(`⚠️  ${saPath} no encontrado. La subida a Drive se simulará.`);
  }
});
