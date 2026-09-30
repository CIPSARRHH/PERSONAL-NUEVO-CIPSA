const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'registros.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

let db = { secuencia: 0, registros: [] };
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Escrituras en cola para no corromper el archivo con envíos simultáneos
let cola = Promise.resolve();
function guardar() {
  cola = cola.then(() => new Promise((res, rej) => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db, null, 1), (err) => {
      if (err) return rej(err);
      fs.rename(tmp, DB_FILE, (e) => (e ? rej(e) : res()));
    });
  }));
  return cola;
}

function slug(s) {
  return (s || '').toString().trim().split(/\s+/)[0]
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '').toUpperCase() || 'X';
}

async function crear(datos) {
  db.secuencia += 1;
  const n = String(db.secuencia).padStart(3, '0');
  const codigo = `${slug(datos.nombres)}-${slug(datos.apellidoPaterno)}-${n}`;
  const registro = {
    id: crypto.randomUUID(),
    codigo,
    fechaRegistro: new Date().toISOString(),
    estado: 'Completado',
    datos,
  };
  db.registros.push(registro);
  await guardar();
  return registro;
}

function listar() { return db.registros; }
function buscar(codigo) { return db.registros.find((r) => r.codigo === codigo); }
function existeDocumento(num) {
  const n = (num || '').toString().trim().toUpperCase();
  return db.registros.some((r) => (r.datos.numeroDocumento || '').toString().trim().toUpperCase() === n);
}
async function eliminar(codigo) {
  const i = db.registros.findIndex((r) => r.codigo === codigo);
  if (i < 0) return false;
  db.registros.splice(i, 1);
  await guardar();
  return true;
}

module.exports = { crear, listar, buscar, eliminar, existeDocumento, DATA_DIR };
