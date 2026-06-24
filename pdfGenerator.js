const PDFDocument = require('pdfkit');

function generatePDF({ tecnico, fecha, datosEquipo, fotos }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    const pw = doc.page.width - 100;
    const accent = '#0f3460';
    const red = '#e94560';

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    function getBuf(key) {
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

    function hdr(text, color) {
      const y = doc.y;
      doc.rect(50, y, pw, 20).fill(color || accent);
      doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold').text(text, 55, y + 4);
      doc.fillColor('#000');
      doc.y = y + 24;
    }

    function img(imgBuf, maxH) {
      let w = pw, h = (w / 4) * 3;
      const avail = Math.min(maxH, doc.page.height - doc.y - 20);
      if (h > avail) { h = avail; w = (h / 3) * 4; }
      if (w > 0 && h > 0) {
        doc.image(imgBuf, (doc.page.width - w) / 2, doc.y, { fit: [w, h], align: 'center' });
        doc.y += h + 8;
      }
    }

    try {
      // ====== PAGE 1 ======
      doc.rect(0, 0, doc.page.width, 6).fill(red);
      doc.fillColor(red).fontSize(18).font('Helvetica-Bold')
        .text('MANTENIMIENTO PREVENTIVO', 50, 28, { align: 'center' });
      doc.fillColor('#555').fontSize(10).font('Helvetica')
        .text(`Fecha: ${fecha}    |    Técnico: ${tecnico}`, { align: 'center' });
      doc.moveDown(1.2);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
      doc.moveDown(0.8);

      hdr('DATOS DEL EQUIPO', accent);

      const fields = [
        ['SERIAL', datosEquipo.serial], ['SEDE', datosEquipo.sede],
        ['TIPO EQUIPO', datosEquipo.tipoEquipo], ['MARCA', datosEquipo.marca],
        ['MODELO', datosEquipo.modelo], ['NOMBRE CÁMARA', datosEquipo.nombreCam],
        ['IP CÁMARA', datosEquipo.ipCamara], ['UBICACIÓN', datosEquipo.ubicacion],
        ['SERVICIO', datosEquipo.servicio], ['ESTADO', datosEquipo.estado],
        ['SUPERVISOR', datosEquipo.supervisor]
      ];

      const tl = 55, tr = doc.page.width - 55, rh = 15;
      let y = doc.y;
      fields.forEach(([l, v], i) => {
        if (i % 2 === 1) doc.rect(tl, y, tr - tl, rh).fill('#f5f5f5');
        doc.fillColor(i % 2 === 1 ? '#333' : '#000').fontSize(8).font('Helvetica-Bold').text(l, tl + 6, y + 3);
        doc.font('Helvetica').text(v || 'N/A', tl + (tr - tl) / 2 + 6, y + 3);
        y += rh;
      });
      doc.y = y + 8;

      const antes = getBuf('antes');
      if (antes) {
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#4CAF50').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#4CAF50').fontSize(11).font('Helvetica-Bold').text('FOTO ANTES', { align: 'center' });
        doc.moveDown(0.3);
        img(antes, doc.page.height - doc.y - 20);
      }

      doc.fontSize(8).fillColor('#aaa').font('Helvetica')
        .text('Mantenimiento Preventivo', 50, doc.page.height - 25, { align: 'center' });

      // ====== PAGE 2 ======
      doc.addPage();

      const durante = getBuf('durante');
      if (durante) {
        doc.fillColor('#FF9800').fontSize(11).font('Helvetica-Bold').text('FOTO DURANTE', { align: 'center' });
        doc.moveDown(0.3);
        const half = (doc.page.height - doc.y - 50) / 2;
        img(durante, half);
      }

      const despues = getBuf('despues');
      if (despues) {
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#2196F3').fontSize(11).font('Helvetica-Bold').text('FOTO DESPUÉS', { align: 'center' });
        doc.moveDown(0.3);
        const remain = doc.page.height - doc.y - 30;
        img(despues, remain);
      }

      doc.fontSize(8).fillColor('#aaa').font('Helvetica')
        .text('Mantenimiento Preventivo', 50, doc.page.height - 25, { align: 'center' });

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
