const PDFDocument = require('pdfkit');

function generatePDF({ tecnico, fecha, datosEquipo, fotos }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    try {
      const pageWidth = doc.page.width - 100;

      doc.fontSize(18).font('Helvetica-Bold').text('MANTENIMIENTO PREVENTIVO', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Fecha: ${fecha}`, { align: 'center' });
      doc.text(`Técnico: ${tecnico}`, { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(14).font('Helvetica-Bold').text('Datos del Equipo');
      doc.moveDown(0.5);

      const fields = [
        ['SERIAL EQ', datosEquipo.serial],
        ['SEDE', datosEquipo.sede],
        ['TIPO EQUIPO', datosEquipo.tipoEquipo],
        ['MARCA', datosEquipo.marca],
        ['MODELO', datosEquipo.modelo],
        ['NOMBRE CAM', datosEquipo.nombreCam],
        ['IP CAMARA', datosEquipo.ipCamara],
        ['UBICACIÓN', datosEquipo.ubicacion],
        ['SERVICIO', datosEquipo.servicio],
        ['ESTADO', datosEquipo.estado],
        ['SUPERVISOR', datosEquipo.supervisor]
      ];

      const col1X = 50;
      const col2X = 200;
      let y = doc.y;

      doc.fontSize(10);
      fields.forEach(([label, value]) => {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = 50;
        }
        doc.font('Helvetica-Bold').text(label, col1X, y);
        doc.font('Helvetica').text(value || 'N/A', col2X, y);
        y += 20;
      });

      doc.y = y + 10;
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(1);

      const sections = [
        { label: 'ANTES', key: 'antes' },
        { label: 'DURANTE', key: 'durante' },
        { label: 'DESPUÉS', key: 'despues' }
      ];

      for (const section of sections) {
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }

        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').text(section.label, { align: 'center' });
        doc.moveDown(0.5);

        const fotoBase64 = fotos && fotos[section.key];
        if (fotoBase64) {
          try {
            const raw = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(raw, 'base64');
            if (imgBuffer.length > 50) {
              const imgWidth = Math.min(400, pageWidth);
              const imgHeight = (imgWidth / 4) * 3;
              doc.image(imgBuffer, doc.page.width / 2 - imgWidth / 2, doc.y, {
                fit: [imgWidth, imgHeight],
                align: 'center',
                valign: 'center'
              });
              doc.moveDown(imgHeight / doc.currentLineHeight() + 2);
            } else {
              doc.fontSize(10).font('Helvetica').text('(Imagen vacía)', { align: 'center' });
              doc.moveDown(1);
            }
          } catch (imgErr) {
            doc.fontSize(10).font('Helvetica').text('(Error al cargar imagen)', { align: 'center' });
            doc.moveDown(1);
          }
        } else {
          doc.fontSize(10).font('Helvetica').text('(Sin foto)', { align: 'center' });
          doc.moveDown(1);
        }

        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      }

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica').text(
        `Firma del Técnico: ___________________________`,
        { align: 'center' }
      );
      doc.text(tecnico, { align: 'center' });
    } catch (err) {
      try { doc.end(); } catch (e) {}
      return reject(err);
    }

    try { doc.end(); } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
