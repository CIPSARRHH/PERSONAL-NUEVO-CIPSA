const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { DOCUMENTOS, nombreCompleto } = require('../config/documentos');

const TEMPLATES = path.join(__dirname, '..', 'templates');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TINTA = rgb(0.05, 0.07, 0.2);
const cache = {};

function plantilla(archivo) {
  if (!cache[archivo]) cache[archivo] = fs.readFileSync(path.join(TEMPLATES, archivo));
  return cache[archivo];
}

// Fecha de registro en hora de Lima
function partesFecha(iso) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
  const get = (t) => f.find((p) => p.type === t).value;
  const dia = get('day'); const mesN = get('month'); const anio = get('year');
  return { dia, mes: MESES[parseInt(mesN, 10) - 1], mesN, anio, anio2: anio.slice(2), ddmmyyyy: `${dia}/${mesN}/${anio}` };
}

// Quita caracteres que la fuente estándar no puede dibujar
function limpiar(s) {
  return (s || '').toString().replace(/[\u2013\u2014]/g, '-').replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
}

async function generarPDF(registro, { documentos = null } = {}) {
  const salida = await PDFDocument.create();
  const font = await salida.embedFont(StandardFonts.Helvetica);
  const bold = await salida.embedFont(StandardFonts.HelveticaBold);
  const ctx = { d: registro.datos, f: partesFecha(registro.fechaRegistro), codigo: registro.codigo };
  const lista = (documentos ? DOCUMENTOS.filter((x) => documentos.includes(x.id)) : DOCUMENTOS)
    // De los 4 formatos de abono de haberes, solo se incluye el del banco elegido
    .filter((x) => !x.banco || x.banco === registro.datos.bancoHaberes);

  for (const doc of lista) {
    const src = await PDFDocument.load(plantilla(doc.archivo));
    if (doc.preparar) doc.preparar(ctx, (t) => font.widthOfTextAtSize(limpiar(t), 10));
    const paginas = await salida.copyPages(src, src.getPageIndices());
    paginas.forEach((pg) => salida.addPage(pg));
    for (const def of doc.paginas) {
      const page = paginas[def.p];
      const H = page.getHeight();
      for (const c of def.campos) {
        const val = c.v(ctx);
        if (c.check) {
          if (!val) continue;
          const s = c.size || 10; const w = bold.widthOfTextAtSize('X', s);
          page.drawText('X', { x: (c.x0 + c.x1) / 2 - w / 2, y: H - c.base, size: s, font: bold, color: TINTA });
          continue;
        }
        const texto = limpiar(val);
        if (!texto) continue;
        const ancho = c.x1 - c.x0;
        let size = c.size || 10;
        while (size > 5.5 && font.widthOfTextAtSize(texto, size) > ancho) size -= 0.25;
        let t = texto;
        while (font.widthOfTextAtSize(t, size) > ancho && t.length > 1) t = t.slice(0, -1);
        const w = font.widthOfTextAtSize(t, size);
        const x = c.align === 'center' ? c.x0 + (ancho - w) / 2 : c.x0;
        page.drawText(t, { x, y: H - c.base, size, font, color: TINTA });
      }
    }
  }
  const nombre = nombreCompleto(registro.datos);
  salida.setTitle(`${registro.codigo} - ${nombre} - Documentos de ingreso`);
  salida.setAuthor('Corporación de Industrias Plásticas S.A.');
  salida.setSubject(`Documentos de ingreso de ${nombre}`);
  salida.setKeywords([registro.codigo]);
  return Buffer.from(await salida.save());
}

module.exports = { generarPDF, DOCUMENTOS };
