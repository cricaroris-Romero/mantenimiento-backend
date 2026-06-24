const PDFDocument = require('pdfkit');

function generatePDF({ tecnico, fecha, datosEquipo, fotos }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    const pageWidth = doc.page.width - 100;
    const accentColor = '#0f3460';
    const primaryColor = '#e94560';

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    function getFoto(key) {
      const raw = fotos
        ? Array.isArray(fotos)
          ? fotos[{ antes: 0, durante: 1, despues: 2 }[key]]
          : fotos[key]
        : null;
      if (!raw) return null;
      try {
        const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        return buf.length > 50 ? buf : null;
      } catch { return null; }
    }

    function drawHeader(text, y) {
      doc.rect(50, y - 4, pageWidth, 22).fill(accentColor);
      doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold').text(text, 55, y);
      doc.fillColor('#000');
    }

    function drawFooter(text) {
      doc.fontSize(8).fillColor('#aaa').font('Helvetica')
        .text(text || 'Mantenimiento Preventivo', 50, doc.page.height - 30, { align: 'center' });
    }

    function placeImage(imgBuf, maxW, maxH, yOffset) {
      let w = Math.max(100, Math.min(maxW, doc.page.width - 100));
      let h = (w / 4) * 3;
      const availH = Math.max(50, maxH);
      if (h > availH) { h = availH; w = (h / 3) * 4; }
      const x = Math.max(25, (doc.page.width - w) / 2);
      doc.image(imgBuf, x, yOffset, { fit: [w, h], align: 'center', valign: 'center' });
    }

    try {
      // ====== PAGE 1: Header + Data + ANTES photo ======
      // Top bar
      doc.rect(0, 0, doc.page.width, 8).fill(primaryColor);
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold')
        .text('MANTENIMIENTO PREVENTIVO', 50, 30, { align: 'center' });
      doc.fillColor('#555').fontSize(10).font('Helvetica')
        .text(`Fecha: ${fecha}    |    Técnico: ${tecnico}`, { align: 'center' });
      doc.moveDown(1.5);

      // Separator
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
      let y = doc.y + 8;

      // Equipment table
      drawHeader('DATOS DEL EQUIPO', y + 2);
      y += 28;

      const fields = [
        ['SERIAL', datosEquipo.serial],
        ['SEDE', datosEquipo.sede],
        ['TIPO EQUIPO', datosEquipo.tipoEquipo],
        ['MARCA', datosEquipo.marca],
        ['MODELO', datosEquipo.modelo],
        ['NOMBRE CÁMARA', datosEquipo.nombreCam],
        ['IP CÁMARA', datosEquipo.ipCamara],
        ['UBICACIÓN', datosEquipo.ubicacion],
        ['SERVICIO', datosEquipo.servicio],
        ['ESTADO', datosEquipo.estado],
        ['SUPERVISOR', datosEquipo.supervisor]
      ];

      const tLeft = 55;
      const tRight = doc.page.width - 55;
      const tRowH = 16;

      fields.forEach(([label, value], i) => {
        if (i % 2 === 1) {
          doc.rect(tLeft, y, tRight - tLeft, tRowH).fill('#f5f5f5');
        }
        doc.fillColor(i % 2 === 1 ? '#333' : '#000').fontSize(8).font('Helvetica-Bold')
          .text(label, tLeft + 6, y + 4);
        doc.font('Helvetica').text(value || 'N/A', tLeft + (tRight - tLeft) / 2 + 6, y + 4);
        y += tRowH;
      });

      y += 10;

      // ANTES photo
      const antesImg = getFoto('antes');
      if (antesImg) {
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#4CAF50').lineWidth(1).stroke();
        y += 6;
        doc.fillColor('#4CAF50').fontSize(12).font('Helvetica-Bold').text('ANTES', 50, y, { align: 'center' });
        y += 18;
          const remainH = Math.max(50, doc.page.height - y - 40);
          placeImage(antesImg, pageWidth, remainH, y);
      }

      drawFooter();

      // ====== PAGE 2: DURANTE + DESPUÉS ======
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 8).fill('#FF9800');
      doc.fillColor('#FF9800').fontSize(18).font('Helvetica-Bold')
        .text('FOTOS', 50, 30, { align: 'center' });
      doc.moveDown(1.5);

      // DURANTE
      y = doc.y + 10;
      const durImg = getFoto('durante');
      if (durImg) {
        doc.fillColor('#FF9800').fontSize(12).font('Helvetica-Bold').text('DURANTE', 50, y, { align: 'center', width: pageWidth });
        y = doc.y + 10;
        const halfPageH = Math.max(50, (doc.page.height - y - 80) / 2);
        placeImage(durImg, pageWidth, halfPageH, y);
        y += halfPageH + 20;
      }

      // Separator
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#ddd').lineWidth(1).stroke();
      y += 16;

      // DESPUÉS
      const despImg = getFoto('despues');
      if (despImg) {
        doc.fillColor('#2196F3').fontSize(12).font('Helvetica-Bold').text('DESPUÉS', 50, y, { align: 'center', width: pageWidth });
        y = doc.y + 10;
        const remainH = Math.max(50, doc.page.height - y - 40);
        placeImage(despImg, pageWidth, remainH, y);
      }

      drawFooter();

    } catch (err) {
      try { doc.end(); } catch (e) { }
      return reject(err);
    }

    try { doc.end(); } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
