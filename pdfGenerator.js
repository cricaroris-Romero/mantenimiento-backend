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

    try {
      // ====== PAGE 1: Header + Datos del Equipo ======
      // Accent bar top
      doc.rect(0, 0, doc.page.width, 8).fill(accentColor);
      doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold')
        .text('MANTENIMIENTO PREVENTIVO', 50, 30, { align: 'center' });
      doc.fillColor('#555').fontSize(11).font('Helvetica')
        .text(`Fecha: ${fecha}    |    Técnico: ${tecnico}`, { align: 'center' });
      doc.moveDown(2);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#ccc').lineWidth(1).stroke();
      doc.moveDown(1.5);

      // Section title with background
      doc.rect(50, doc.y - 4, pageWidth, 22).fill(accentColor);
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
        .text('DATOS DEL EQUIPO', 60, doc.y - 2);
      doc.fillColor('#000');
      doc.moveDown(1.5);

      // Table header
      const tLeft = 55;
      const tRight = doc.page.width - 55;
      const tRowH = 18;
      let yStart = doc.y;

      doc.rect(tLeft, yStart, (tRight - tLeft) / 2 - 1, 20).fill('#1a1a2e');
      doc.rect(tLeft + (tRight - tLeft) / 2 + 1, yStart, (tRight - tLeft) / 2 - 1, 20).fill('#1a1a2e');
      doc.fillColor('#e94560').fontSize(9).font('Helvetica-Bold')
        .text('CAMPO', tLeft + 8, yStart + 5)
        .text('VALOR', tLeft + (tRight - tLeft) / 2 + 10, yStart + 5);
      yStart += 20;

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

      doc.fillColor('#000');
      fields.forEach(([label, value], i) => {
        if (yStart > doc.page.height - 60) {
          doc.addPage();
          yStart = 50;
        }
        if (i % 2 === 1) {
          doc.rect(tLeft, yStart, tRight - tLeft, tRowH).fill('#f5f5f5');
        }
        doc.fillColor(i % 2 === 1 ? '#333' : '#000').fontSize(9).font('Helvetica-Bold')
          .text(label, tLeft + 8, yStart + 4);
        doc.font('Helvetica')
          .text(value || 'N/A', tLeft + (tRight - tLeft) / 2 + 10, yStart + 4);
        yStart += tRowH;
      });

      doc.y = yStart + 10;
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#ccc').lineWidth(1).stroke();

      // Footer
      doc.fontSize(8).fillColor('#aaa').font('Helvetica')
        .text('Documento generado automáticamente — Mantenimiento Preventivo', 50, doc.page.height - 30, { align: 'center' });

      // ====== PHOTO PAGES ======
      const sections = [
        { label: 'ANTES', key: 'antes', color: '#4CAF50' },
        { label: 'DURANTE', key: 'durante', color: '#FF9800' },
        { label: 'DESPUÉS', key: 'despues', color: '#2196F3' }
      ];

      for (const section of sections) {
        doc.addPage();

        // Top accent bar
        doc.rect(0, 0, doc.page.width, 60).fill(section.color);
        doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
          .text(`FOTO: ${section.label}`, 0, 18, { align: 'center' });

        // Subtle background rectangle
        doc.rect(30, 80, doc.page.width - 60, doc.page.height - 140).fill('#fafafa');

        const fotoBase64 = fotos
          ? Array.isArray(fotos)
            ? fotos[{ antes: 0, durante: 1, despues: 2 }[section.key]]
            : fotos[section.key]
          : null;

        if (fotoBase64) {
          try {
            const raw = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(raw, 'base64');
            if (imgBuffer.length > 50) {
              const maxW = doc.page.width - 120;
              const maxH = doc.page.height - 200;
              let imgW = maxW;
              let imgH = (imgW / 4) * 3;
              if (imgH > maxH) {
                imgH = maxH;
                imgW = (imgH / 3) * 4;
              }
              const imgX = (doc.page.width - imgW) / 2;
              const imgY = (doc.page.height - imgH) / 2 + 10;
              doc.image(imgBuffer, imgX, imgY, { fit: [imgW, imgH], align: 'center', valign: 'center' });
            } else {
              doc.fillColor('#999').fontSize(11).font('Helvetica')
                .text('(Imagen vacía)', 0, doc.page.height / 2 - 10, { align: 'center' });
            }
          } catch (imgErr) {
            doc.fillColor('#e94560').fontSize(11).font('Helvetica')
              .text('(Error al cargar la imagen)', 0, doc.page.height / 2 - 10, { align: 'center' });
          }
        } else {
          doc.fillColor('#999').fontSize(11).font('Helvetica')
            .text('(Sin foto)', 0, doc.page.height / 2 - 10, { align: 'center' });
        }

        doc.fontSize(8).fillColor('#aaa').font('Helvetica')
          .text(`Mantenimiento Preventivo — ${section.label}`, 50, doc.page.height - 30, { align: 'center' });
      }

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
