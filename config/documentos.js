/**
 * MAPEO DE LOS 11 DOCUMENTOS
 * --------------------------------------------------------------------------
 * Cada documento usa su PDF original (carpeta /templates) y solo se escribe
 * texto encima, en las posiciones de las líneas o recuadros del formato.
 *
 * Coordenadas en puntos PDF medidas desde la ESQUINA SUPERIOR IZQUIERDA:
 *   x0, x1  -> inicio y fin horizontal del espacio a completar
 *   base    -> línea base del texto (distancia desde el borde superior)
 *   size    -> tamaño de letra máximo (se reduce solo si el texto no cabe)
 *   align   -> 'left' | 'center'
 *   v       -> función que recibe el contexto (datos + fecha) y devuelve el texto
 *   check   -> si es true, dibuja una "X" centrada en (x0..x1, base)
 *
 * Campos que se dejan intencionalmente en blanco (para llenar a mano o por RR. HH.):
 * firmas, huellas, foto, casilla "CÓDIGO", sección "Admisión" de la ficha de
 * información del trabajador y las respuestas del cuestionario de salud.
 */

const up = (s) => (s || '').toString().trim().toUpperCase();
const nombreCompleto = (d) => up([d.nombres, d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(' '));
const apellidos = (d) => up([d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(' '));
const docId = (d) => up(d.numeroDocumento);
const arr = (d, k) => (Array.isArray(d[k]) ? d[k] : []);
const item = (d, k, i, f) => up((arr(d, k)[i] || {})[f]);
const fechaDMY = (iso) => {
  if (!iso) return '';
  const [y, m, dd] = iso.split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : iso;
};
const itemFecha = (d, k, i, f) => fechaDMY((arr(d, k)[i] || {})[f]);
const direccionCompleta = (d) => up(d.direccion);
const bancoCTS = (d) => up(d.bancoCTS === 'Otro' ? d.bancoCTSOtro : d.bancoCTS);
const ES_AFP = (d) => (d.opcionPension || '').includes('AFP');

// Utilidad para filas de tablas
function filas(key, n, tops, cols) {
  const out = [];
  for (let i = 0; i < n; i++) {
    for (const c of cols) {
      out.push({ x0: c.x0, x1: c.x1, base: tops[i], size: c.size || 8, align: c.align || 'left',
        v: (ctx) => (c.fecha ? itemFecha(ctx.d, key, i, c.f) : item(ctx.d, key, i, c.f)) });
    }
  }
  return out;
}

const DOCUMENTOS = [
  {
    id: '01', nombre: 'Consentimiento para el uso de datos personales', archivo: '01_consentimiento.pdf',
    paginas: [
      { p: 0, campos: [0, 1, 2, 3, 4].map((i) => ({
          x0: 105, x1: 500, base: [632.2, 652.3, 672.5, 692.7, 709.0][i], size: 10,
          v: (ctx) => { const h = arr(ctx.d, 'hijos')[i]; return h ? up([h.nombres, h.apellidos].filter(Boolean).join(' ')) : ''; } })) },
      { p: 1, campos: [
        { x0: 295, x1: 481, base: 423.4, size: 10, v: (c) => nombreCompleto(c.d) },
        { x0: 148, x1: 260, base: 461.4, size: 10, v: (c) => docId(c.d) },
        { x0: 145, x1: 177, base: 591.0, size: 10, align: 'center', v: (c) => c.f.dia },
        { x0: 204, x1: 261, base: 591.0, size: 10, align: 'center', v: (c) => c.f.mes },
        { x0: 292, x1: 355, base: 591.0, size: 10, align: 'center', v: (c) => c.f.anio },
      ] },
    ],
  },
  {
    id: '02', nombre: 'Compromiso de confidencialidad', archivo: '02_confidencialidad.pdf',
    paginas: [{ p: 0, campos: [
      { x0: 95, x1: 522, base: 191.2, size: 10, v: (c) => nombreCompleto(c.d) },
      { x0: 127, x1: 300, base: 219.9, size: 10, v: (c) => docId(c.d) },
      { x0: 393, x1: 524, base: 219.9, size: 10, v: (c) => up(c.d.cargoPostula) },
      { x0: 91.5, x1: 147, base: 588.0, size: 10, align: 'center', v: (c) => c.f.dia },
      { x0: 161, x1: 244, base: 588.0, size: 10, align: 'center', v: (c) => c.f.mes },
      { x0: 274.4, x1: 296.6, base: 588.0, size: 10, align: 'center', v: (c) => c.f.anio2 },
    ] }],
  },
  {
    id: '03', nombre: 'Cuestionario de antecedentes de salud', archivo: '03_salud.pdf',
    paginas: [{ p: 0, campos: [
      { x0: 102, x1: 176, base: 660.2, size: 7, v: (c) => c.f.ddmmyyyy },
    ] }],
  },
  {
    id: '04', nombre: 'Información del trabajador', archivo: '04_info_trabajador.pdf',
    paginas: [
      { p: 0, campos: [
        // Datos personales
        { x0: 44, x1: 205, base: 184, size: 9, v: (c) => up(c.d.apellidoPaterno) },
        { x0: 212, x1: 397, base: 184, size: 9, v: (c) => up(c.d.apellidoMaterno) },
        { x0: 404, x1: 582, base: 184, size: 9, v: (c) => up(c.d.nombres) },
        { x0: 44, x1: 205, base: 228, size: 9, v: (c) => up(`${c.d.tipoDocumento === 'DNI' ? '' : (c.d.tipoDocumento || '') + ' '}${c.d.numeroDocumento || ''}`) },
        { x0: 212, x1: 330, base: 228, size: 9, v: (c) => up(c.d.nacionalidad) },
        { x0: 337, x1: 468, base: 228, size: 9, v: (c) => up(c.d.estadoCivil) },
        { x0: 507, x1: 517, base: 228.4, size: 8, check: true, v: (c) => c.d.sexo === 'Masculino' },
        { x0: 547, x1: 557, base: 228.4, size: 8, check: true, v: (c) => c.d.sexo === 'Femenino' },
        // Lugar y fecha de nacimiento
        { x0: 43, x1: 156, base: 283, size: 9, v: (c) => up(c.d.nacDepartamento) },
        { x0: 163, x1: 270, base: 283, size: 9, v: (c) => up(c.d.nacProvincia) },
        { x0: 277, x1: 397, base: 283, size: 9, v: (c) => up(c.d.nacDistrito) },
        { x0: 401, x1: 457, base: 283, size: 9, align: 'center', v: (c) => (c.d.fechaNacimiento || '').split('-')[2] || '' },
        { x0: 458, x1: 535, base: 283, size: 9, align: 'center', v: (c) => (c.d.fechaNacimiento || '').split('-')[1] || '' },
        { x0: 536, x1: 585, base: 283, size: 9, align: 'center', v: (c) => (c.d.fechaNacimiento || '').split('-')[0] || '' },
        // Contacto
        { x0: 42, x1: 149, base: 344, size: 9, v: (c) => up(c.d.telefonoFijo) },
        { x0: 156, x1: 319, base: 344, size: 9, v: (c) => up(c.d.celular) },
        { x0: 326, x1: 581, base: 344, size: 9, v: (c) => (c.d.email || '').trim().toLowerCase() },
        { x0: 42, x1: 581, base: 377, size: 9, v: (c) => direccionCompleta(c.d) },
        { x0: 42, x1: 156, base: 411, size: 9, v: (c) => up(c.d.distrito) },
        { x0: 163, x1: 269, base: 411, size: 9, v: (c) => up(c.d.provincia) },
        { x0: 276, x1: 397, base: 411, size: 9, v: (c) => up(c.d.departamento) },
        { x0: 404, x1: 489, base: 411, size: 9, v: (c) => up(c.d.numeroPasaporte) },
        { x0: 496, x1: 581, base: 411, size: 9, v: (c) => up(c.d.brevete) },
        // Tiempo de experiencia (el resto de "Admisión" lo completa RR. HH.)
        { x0: 42, x1: 199, base: 667, size: 9, v: (c) => up(c.d.tiempoExperiencia) },
      ] },
      { p: 1, campos: [
        // Padre / Madre
        ...['padre', 'madre'].flatMap((k, i) => filas(k, 1, [[75, 96][i]], [
          { f: 'apellidos', x0: 93, x1: 234 }, { f: 'nombres', x0: 240, x1: 354 },
          { f: 'fechaNac', x0: 360, x1: 481, fecha: true, align: 'center' }, { f: 'documento', x0: 487, x1: 579, align: 'center' }])),
        // Hermanos
        ...filas('hermanos', 4, [117, 138, 160, 182], [
          { f: 'apellidos', x0: 93, x1: 234 }, { f: 'nombres', x0: 240, x1: 354 },
          { f: 'fechaNac', x0: 360, x1: 481, fecha: true, align: 'center' }, { f: 'documento', x0: 487, x1: 579, align: 'center' }]),
        // Cónyuge
        ...filas('conyuge', 1, [237], [
          { f: 'apellidos', x0: 94, x1: 239 }, { f: 'nombres', x0: 245, x1: 350 }, { f: 'sexo', x0: 353, x1: 394, align: 'center' },
          { f: 'fechaNac', x0: 397, x1: 518, fecha: true, align: 'center' }, { f: 'documento', x0: 523, x1: 580, align: 'center', size: 7.5 }]),
        // Hijos
        ...filas('hijos', 5, [258, 280, 301, 323, 345], [
          { f: 'apellidos', x0: 94, x1: 239 }, { f: 'nombres', x0: 245, x1: 350 }, { f: 'sexo', x0: 353, x1: 394, align: 'center' },
          { f: 'fechaNac', x0: 397, x1: 518, fecha: true, align: 'center' }, { f: 'documento', x0: 523, x1: 580, align: 'center', size: 7.5 }]),
        // Emergencia
        ...filas('emergencia', 2, [480, 504], [
          { f: 'nombre', x0: 41, x1: 191 }, { f: 'telefono', x0: 197, x1: 355 }, { f: 'direccion', x0: 361, x1: 581 }]),
        // Estudios escolares
        ...['primaria', 'secundaria', 'comercial'].flatMap((k, i) => filas(k, 1, [[575, 596, 618][i]], [
          { f: 'centro', x0: 125, x1: 431 }, { f: 'fechas', x0: 437, x1: 579, align: 'center' }])),
        // Estudios técnicos
        ...filas('tecnicos', 2, [689, 710], [
          { f: 'carrera', x0: 40, x1: 211 }, { f: 'grado', x0: 217, x1: 331 }, { f: 'institucion', x0: 337, x1: 480 }, { f: 'fechas', x0: 486, x1: 579, align: 'center' }]),
      ] },
      { p: 2, campos: [
        ...filas('universitarios', 2, [69, 91], [
          { f: 'carrera', x0: 40, x1: 211 }, { f: 'grado', x0: 217, x1: 331 }, { f: 'institucion', x0: 337, x1: 480 }, { f: 'fechas', x0: 486, x1: 579, align: 'center' }]),
        ...filas('otrosEstudios', 3, [157, 178, 200], [
          { f: 'curso', x0: 40, x1: 174 }, { f: 'institucion', x0: 180, x1: 380 }, { f: 'fechas', x0: 386, x1: 579, align: 'center' }]),
        ...filas('idiomas', 2, [258, 280], [
          { f: 'idioma', x0: 40, x1: 174 }, { f: 'institucion', x0: 180, x1: 380 }, { f: 'nivel', x0: 386, x1: 579, align: 'center' }]),
        ...filas('experiencias', 4, [344, 365, 387, 409], [
          { f: 'empresa', x0: 40, x1: 174 }, { f: 'cargo', x0: 180, x1: 380 }, { f: 'fechas', x0: 386, x1: 579, align: 'center' }]),
        ...filas('referencias', 3, [471, 493, 514], [
          { f: 'nombre', x0: 40, x1: 218 }, { f: 'empresa', x0: 224, x1: 346 }, { f: 'cargo', x0: 352, x1: 452 }, { f: 'telefono', x0: 458, x1: 579, align: 'center' }]),
        // "Lima ___ de ______ de ____"
        { x0: 63, x1: 95, base: 540, size: 8, align: 'center', v: (c) => c.f.dia },
        { x0: 110, x1: 199, base: 540, size: 8, align: 'center', v: (c) => c.f.mes },
        { x0: 213, x1: 255, base: 540, size: 8, align: 'center', v: (c) => c.f.anio },
      ] },
    ],
  },
  {
    id: '05', nombre: 'Elección del sistema de pensiones', archivo: '05_pensiones.pdf',
    paginas: [{ p: 0, campos: [
      { x0: 70, x1: 354, base: 261.4, size: 10, v: (c) => nombreCompleto(c.d) },
      { x0: 416, x1: 515, base: 261.4, size: 10, v: (c) => docId(c.d) },
      { x0: 73.4, x1: 96.4, base: 323.4, size: 10, check: true, v: (c) => !!c.d.recibioBoletin },
      { x0: 73.4, x1: 96.4, base: 434.6, size: 10, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Afiliarme al Sistema Privado') },
      { x0: 73.4, x1: 96.4, base: 471.7, size: 10, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Permanecer en la AFP') },
      { x0: 73.4, x1: 96.4, base: 508.6, size: 10, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Afiliarme al Sistema Nacional') },
      { x0: 73.4, x1: 96.4, base: 545.7, size: 10, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Permanecer en el Sistema Nacional') },
      { x0: 474.2, x1: 508.9, base: 434.6, size: 9, check: true, v: (c) => ES_AFP(c.d) && c.d.afp === 'PRIMA' },
      { x0: 474.2, x1: 508.9, base: 447.0, size: 9, check: true, v: (c) => ES_AFP(c.d) && c.d.afp === 'INTEGRA' },
      { x0: 474.2, x1: 508.9, base: 459.3, size: 9, check: true, v: (c) => ES_AFP(c.d) && c.d.afp === 'PROFUTURO' },
      { x0: 474.2, x1: 508.9, base: 471.7, size: 9, check: true, v: (c) => ES_AFP(c.d) && c.d.afp === 'HABITAT' },
      { x0: 474.2, x1: 508.9, base: 508.6, size: 9, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Afiliarme al Sistema Nacional') },
      { x0: 474.2, x1: 508.9, base: 545.7, size: 9, check: true, v: (c) => (c.d.opcionPension || '').startsWith('Permanecer en el Sistema Nacional') },
      { x0: 80.8, x1: 106.1, base: 632.0, size: 10, align: 'center', v: (c) => c.f.dia },
      { x0: 118.3, x1: 156.4, base: 632.0, size: 10, align: 'center', v: (c) => c.f.mes },
      { x0: 191.8, x1: 217.2, base: 632.0, size: 10, align: 'center', v: (c) => c.f.anio2 },
    ] }],
  },
  {
    id: '06', nombre: 'Declaración jurada de domicilio', archivo: '06_domicilio.pdf',
    paginas: [{ p: 0, campos: [
      { x0: 106, x1: 498, base: 148.0, size: 10, v: (c) => nombreCompleto(c.d) },
      { x0: 168, x1: 332, base: 172.4, size: 10, v: (c) => up(c.d.nacionalidad) },
      { x0: 422, x1: 504, base: 172.4, size: 10, align: 'center', v: (c) => up(c.d.tipoDocumento) },
      { x0: 127, x1: 221, base: 196.6, size: 10, v: (c) => docId(c.d) },
      { x0: 359, x1: 510, base: 196.6, size: 10, v: (c) => c.dir[0] },
      { x0: 86, x1: 301, base: 221.0, size: 10, v: (c) => c.dir[1] },
      { x0: 368, x1: 506, base: 221.0, size: 10, v: (c) => up(c.d.distrito) },
      { x0: 197, x1: 342, base: 245.2, size: 10, v: (c) => up(c.d.provincia) },
      { x0: 86, x1: 301, base: 269.6, size: 10, v: (c) => up(c.d.departamento) },
      { x0: 139.6, x1: 203.1, base: 488.3, size: 10, align: 'center', v: (c) => c.f.dia },
      { x0: 285.4, x1: 406, base: 488.3, size: 10, align: 'center', v: (c) => c.f.mes },
      { x0: 441.1, x1: 466.5, base: 488.3, size: 10, align: 'center', v: (c) => c.f.anio2 },
    ] }],
    // La dirección se reparte en dos líneas del formato
    preparar: (ctx, medir) => { ctx.dir = partir(direccionCompleta(ctx.d), medir, 151, 215); },
  },
  {
    id: '07', nombre: 'Depositario de la CTS', archivo: '07_cts.pdf',
    paginas: [{ p: 0, campos: [
      { x0: 355.8, x1: 387.6, base: 66.4, size: 10, align: 'center', v: (c) => c.f.dia },
      { x0: 406.8, x1: 476.8, base: 66.4, size: 10, align: 'center', v: (c) => c.f.mes },
      { x0: 511.5, x1: 537, base: 66.4, size: 10, align: 'center', v: (c) => c.f.anio2 },
      { x0: 116, x1: 285, base: 297.4, size: 10, v: (c) => bancoCTS(c.d) },
      { x0: 179, x1: 285, base: 333.9, size: 10, v: (c) => up(c.d.monedaCTS) },
      { x0: 188, x1: 485, base: 455.4, size: 10, v: (c) => nombreCompleto(c.d) },
      { x0: 101, x1: 284, base: 491.9, size: 10, v: (c) => docId(c.d) },
    ] }],
  },
  ...[
    ['08', 'Abono de haberes – BCP', '08_bcp.pdf', 168, 488, [214.4, 243.4, 272.5, 301.5]],
    ['09', 'Abono de haberes – BBVA', '09_bbva.pdf', 148, 515, [211.8, 240.3, 268.9, 297.5]],
    ['10', 'Abono de haberes – Interbank', '10_interbank.pdf', 170, 488, [224.2, 253.2, 282.2, 311.2]],
    ['11', 'Abono de haberes – Scotiabank', '11_scotiabank.pdf', 168, 488, [211.5, 240.5, 269.6, 298.6]],
  ].map(([id, nombre, archivo, x0, x1, b]) => ({
    id, nombre, archivo, banco: nombre.split('– ')[1],
    paginas: [{ p: 0, campos: [
      { x0, x1, base: b[0], size: 10, v: (c) => up(c.d.nombres) },
      { x0, x1, base: b[1], size: 10, v: (c) => apellidos(c.d) },
      { x0, x1, base: b[2], size: 10, v: (c) => up([c.d.direccion, c.d.distrito].filter(Boolean).join(', ')) },
      { x0, x1, base: b[3], size: 10, v: (c) => docId(c.d) },
      // "CÓDIGO" se deja en blanco a pedido
    ] }],
  })),
];

// Parte un texto en dos tramos según el ancho disponible de cada línea
function partir(texto, medir, w1, w2) {
  const palabras = (texto || '').split(/\s+/).filter(Boolean);
  let a = '';
  let i = 0;
  while (i < palabras.length) {
    const t = a ? `${a} ${palabras[i]}` : palabras[i];
    if (medir(t) > w1) break;
    a = t; i++;
  }
  return [a, palabras.slice(i).join(' ')];
}

module.exports = { DOCUMENTOS, nombreCompleto };
