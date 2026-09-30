const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const JSZip = require('jszip');
const store = require('./lib/store');
const { generarPDF } = require('./lib/pdf');
const { nombreCompleto } = require('./config/documentos');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cipsa2026';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD no configurada: se usa la contraseña por defecto "cipsa2026". Cámbiala antes de publicar.');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '300kb' }));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'same-origin'); next(); });
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---------- Formulario configurable ----------
const FORM_DEFAULT = path.join(__dirname, 'config', 'formulario.json');
const FORM_CUSTOM = path.join(store.DATA_DIR, 'formulario.json');
function leerFormulario() {
  const f = fs.existsSync(FORM_CUSTOM) ? FORM_CUSTOM : FORM_DEFAULT;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
app.get('/api/formulario', (req, res) => res.json(leerFormulario()));

// ---------- Validación ----------
const visible = (campo, datos) => {
  const v = campo.visibleSi; if (!v) return true;
  const val = datos[v.campo] || '';
  if (v.igual !== undefined) return val === v.igual;
  if (v.contiene !== undefined) return val.includes(v.contiene);
  return true;
};
const vacio = (x) => x === undefined || x === null || (typeof x === 'string' && !x.trim());

function validar(datos, form) {
  const errores = [];
  const limpio = {};
  for (const sec of form.secciones) {
    for (const c of sec.campos) {
      if (!visible(c, datos)) continue;
      const val = datos[c.key];
      if (c.tipo === 'grupo') {
        const filas = (Array.isArray(val) ? val : []).slice(0, c.max || 10).map((fila) => {
          const o = {};
          for (const sc of c.campos) o[sc.key] = (fila && typeof fila[sc.key] === 'string') ? fila[sc.key].trim().slice(0, 200) : '';
          return o;
        }).filter((o) => Object.values(o).some((x) => x));
        if (c.requerido && filas.length < (c.min || 1)) errores.push(`${c.label}: agrega al menos ${c.min || 1}.`);
        filas.forEach((o, i) => c.campos.forEach((sc) => { if (sc.requerido && vacio(o[sc.key])) errores.push(`${c.label} ${i + 1}: falta "${sc.label}".`); }));
        limpio[c.key] = filas;
      } else if (c.tipo === 'casilla') {
        limpio[c.key] = !!val;
      } else {
        const s = typeof val === 'string' ? val.trim().slice(0, 250) : '';
        if (c.requerido && !s) { errores.push(`Falta: ${c.label}.`); continue; }
        if (s && c.opciones && !c.opciones.includes(s)) { errores.push(`Valor no válido en: ${c.label}.`); continue; }
        if (s && c.tipo === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errores.push('El correo electrónico no es válido.');
        if (s && c.tipo === 'fecha' && !/^\d{4}-\d{2}-\d{2}$/.test(s)) errores.push(`Fecha no válida en: ${c.label}.`);
        limpio[c.key] = s;
      }
    }
  }
  if (limpio.tipoDocumento === 'DNI' && limpio.numeroDocumento && !/^\d{8}$/.test(limpio.numeroDocumento)) errores.push('El DNI debe tener 8 dígitos.');
  return { errores, limpio };
}

// Límite simple de envíos por IP
const envios = new Map();
function limite(req, res, next) {
  const ip = req.ip; const ahora = Date.now();
  const lista = (envios.get(ip) || []).filter((t) => ahora - t < 3600e3);
  if (lista.length >= 30) return res.status(429).json({ error: 'Demasiados envíos desde esta conexión. Intenta más tarde.' });
  lista.push(ahora); envios.set(ip, lista); next();
}

app.post('/api/registros', limite, async (req, res) => {
  try {
    const form = leerFormulario();
    const datos = req.body && req.body.datos;
    if (!datos || typeof datos !== 'object') return res.status(400).json({ error: 'Datos incompletos.' });
    if (!req.body.acepta) return res.status(400).json({ error: 'Debes aceptar la declaración para enviar.' });
    const { errores, limpio } = validar(datos, form);
    if (errores.length) return res.status(400).json({ error: 'Revisa los datos marcados.', errores });
    if (store.existeDocumento(limpio.numeroDocumento)) {
      return res.status(409).json({ error: 'Ya existe un registro con este número de documento. Si necesitas corregir tus datos, comunícate con Recursos Humanos.' });
    }
    const r = await store.crear(limpio);
    res.json({ codigo: r.codigo, nombre: nombreCompleto(r.datos), fecha: r.fechaRegistro });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'No se pudo guardar el registro. Intenta nuevamente.' });
  }
});

// ---------- Sesión de administrador ----------
function firmar(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('hex'); }
function crearToken() { const exp = Date.now() + 8 * 3600e3; return `${exp}.${firmar(String(exp))}`; }
function tokenValido(t) {
  if (!t) return false; const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const esperado = firmar(exp);
  return sig.length === esperado.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
}
function cookie(req, nombre) {
  const c = (req.headers.cookie || '').split(';').map((x) => x.trim()).find((x) => x.startsWith(nombre + '='));
  return c ? decodeURIComponent(c.slice(nombre.length + 1)) : null;
}
function soloAdmin(req, res, next) {
  if (tokenValido(cookie(req, 'cipsa_admin'))) return next();
  res.status(401).json({ error: 'Sesión no válida.' });
}
const intentos = new Map();
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip; const a = intentos.get(ip) || { n: 0, t: 0 };
  if (a.n >= 8 && Date.now() - a.t < 15 * 60e3) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
  const pass = (req.body && req.body.password) || '';
  const ok = pass.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
  if (!ok) { intentos.set(ip, { n: a.n + 1, t: Date.now() }); return res.status(401).json({ error: 'Contraseña incorrecta.' }); }
  intentos.delete(ip);
  const secure = req.secure ? '; Secure' : '';
  res.set('Set-Cookie', `cipsa_admin=${encodeURIComponent(crearToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { res.set('Set-Cookie', 'cipsa_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/admin/sesion', (req, res) => res.json({ ok: tokenValido(cookie(req, 'cipsa_admin')) }));

// ---------- Panel ----------
app.get('/api/admin/registros', soloAdmin, (req, res) => {
  const q = (req.query.q || '').toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lista = store.listar().map((r) => ({
    codigo: r.codigo, nombre: nombreCompleto(r.datos), documento: r.datos.numeroDocumento,
    cargo: r.datos.cargoPostula, fecha: r.fechaRegistro, estado: r.estado,
  })).filter((r) => !q || (r.codigo + ' ' + r.nombre + ' ' + r.documento).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  res.json(lista);
});
app.get('/api/admin/registros/:codigo', soloAdmin, (req, res) => {
  const r = store.buscar(req.params.codigo);
  if (!r) return res.status(404).json({ error: 'No encontrado.' });
  res.json({ ...r, nombre: nombreCompleto(r.datos) });
});
app.delete('/api/admin/registros/:codigo', soloAdmin, async (req, res) => {
  res.json({ ok: await store.eliminar(req.params.codigo) });
});
app.get('/api/admin/registros/:codigo/pdf', soloAdmin, async (req, res) => {
  const r = store.buscar(req.params.codigo);
  if (!r) return res.status(404).send('No encontrado');
  try {
    const pdf = await generarPDF(r);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `${req.query.ver ? 'inline' : 'attachment'}; filename="${r.codigo}.pdf"`);
    res.send(pdf);
  } catch (e) { console.error(e); res.status(500).send('No se pudo generar el PDF.'); }
});
app.post('/api/admin/zip', soloAdmin, async (req, res) => {
  const codigos = Array.isArray(req.body && req.body.codigos) ? req.body.codigos.slice(0, 500) : [];
  if (!codigos.length) return res.status(400).json({ error: 'Selecciona al menos un registro.' });
  const zip = new JSZip();
  for (const c of codigos) {
    const r = store.buscar(c); if (!r) continue;
    zip.file(`${r.codigo}.pdf`, await generarPDF(r));
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="Documentos_CIPSA_${new Date().toISOString().slice(0, 10)}.zip"`);
  res.send(buf);
});
app.get('/api/admin/exportar.csv', soloAdmin, (req, res) => {
  const form = leerFormulario();
  const simples = form.secciones.flatMap((s) => s.campos).filter((c) => c.tipo !== 'grupo');
  const esc = (v) => `"${(v === undefined || v === null ? '' : String(v)).replace(/"/g, '""')}"`;
  const filas = [['Código', 'Fecha de registro', ...simples.map((c) => c.label)].map(esc).join(';')];
  for (const r of store.listar()) {
    const fecha = new Date(r.fechaRegistro).toLocaleString('es-PE', { timeZone: 'America/Lima' });
    filas.push([r.codigo, fecha, ...simples.map((c) => (typeof r.datos[c.key] === 'boolean' ? (r.datos[c.key] ? 'Sí' : 'No') : r.datos[c.key]))].map(esc).join(';'));
  }
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="registros_cipsa.csv"');
  res.send('\ufeff' + filas.join('\r\n'));
});
// Editar formulario
app.get('/api/admin/formulario', soloAdmin, (req, res) => res.json(leerFormulario()));
app.put('/api/admin/formulario', soloAdmin, (req, res) => {
  const f = req.body;
  const ok = f && Array.isArray(f.secciones) && f.secciones.every((s) => s.id && s.titulo && Array.isArray(s.campos) && s.campos.every((c) => c.key && c.label && c.tipo));
  if (!ok) return res.status(400).json({ error: 'Estructura no válida: cada sección necesita id, titulo y campos; cada campo necesita key, label y tipo.' });
  fs.writeFileSync(FORM_CUSTOM, JSON.stringify(f, null, 2));
  res.json({ ok: true });
});
app.delete('/api/admin/formulario', soloAdmin, (req, res) => { if (fs.existsSync(FORM_CUSTOM)) fs.unlinkSync(FORM_CUSTOM); res.json({ ok: true }); });

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.listen(PORT, () => console.log(`CIPSA – Registro de personal en http://localhost:${PORT}  (panel: /admin)`));
