(() => {
  const BORRADOR = 'cipsa_ficha_borrador_v1';
  let form = null;
  let datos = {};
  let paso = 0;
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...hijos) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of hijos.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };

  const visible = (c) => {
    const v = c.visibleSi; if (!v) return true;
    const val = datos[v.campo] || '';
    if (v.igual !== undefined) return val === v.igual;
    if (v.contiene !== undefined) return val.includes(v.contiene);
    return true;
  };
  const guardar = () => { try { localStorage.setItem(BORRADOR, JSON.stringify({ datos, paso })); $('#guardado').hidden = false; } catch (e) {} };
  const pasos = () => [...form.secciones.map((s) => s.titulo), 'Revisión y envío'];

  async function iniciar() {
    form = await (await fetch('/api/formulario')).json();
    $('#titulo').textContent = form.titulo;
    $('#subtitulo').textContent = form.subtitulo || '';
    for (const s of form.secciones) for (const c of s.campos) if (c.valorInicial && datos[c.key] === undefined) datos[c.key] = c.valorInicial;
    try {
      const b = JSON.parse(localStorage.getItem(BORRADOR) || 'null');
      if (b && b.datos) { datos = { ...datos, ...b.datos }; paso = Math.min(b.paso || 0, form.secciones.length); $('#guardado').hidden = false; }
    } catch (e) {}
    pintar();
  }

  function pintarPasos() {
    const ol = $('#pasos'); ol.innerHTML = '';
    pasos().forEach((t, i) => {
      ol.append(h('li', { class: i === paso ? 'activo' : (i < paso ? 'hecho' : ''), onclick: () => { if (i <= paso || validarHasta(i)) { paso = i; pintar(); } } },
        h('span', { class: 'n' }, h('span', {}, String(i + 1))), h('span', { class: 'txt' }, t)));
    });
    const pr = h('div', { class: 'barra-prog' }, h('b', { style: `width:${Math.round((paso / form.secciones.length) * 100)}%` }));
    ol.append(pr);
  }

  // ---------- Campos ----------
  function control(c, valor, alCambiar, idBase) {
    const id = idBase || `f_${c.key}`;
    if (c.tipo === 'seleccion') {
      const sel = h('select', { id, onchange: (e) => alCambiar(e.target.value) }, h('option', { value: '' }, 'Selecciona…'), ...c.opciones.map((o) => h('option', { value: o, selected: o === valor }, o)));
      return sel;
    }
    if (c.tipo === 'opciones') {
      return h('div', { class: 'opciones', role: 'radiogroup', id },
        ...c.opciones.map((o) => h('label', { class: 'opcion' }, h('input', { type: 'radio', name: id, value: o, checked: o === valor, onchange: () => alCambiar(o) }), h('span', {}, o))));
    }
    if (c.tipo === 'casilla') {
      return h('label', { class: 'casilla' }, h('input', { type: 'checkbox', id, checked: !!valor, onchange: (e) => alCambiar(e.target.checked) }), h('span', {}, c.label));
    }
    const tipos = { texto: 'text', correo: 'email', telefono: 'tel', fecha: 'date' };
    return h('input', {
      id, type: tipos[c.tipo] || 'text', value: valor || '', placeholder: c.placeholder || '',
      inputmode: c.tipo === 'telefono' ? 'tel' : (c.validacion === 'documento' && datos.tipoDocumento === 'DNI' ? 'numeric' : null),
      autocomplete: { nombres: 'given-name', email: 'email', celular: 'tel' }[c.key] || 'off',
      maxlength: 200, oninput: (e) => alCambiar(e.target.value),
    });
  }

  function campo(c) {
    if (c.tipo === 'grupo') return grupo(c);
    const wrap = h('div', { class: `campo ${c.ancho === 'completo' || c.tipo === 'opciones' || c.tipo === 'casilla' ? 'completo' : ''}`, 'data-key': c.key });
    if (c.tipo !== 'casilla') wrap.append(h(c.tipo === 'opciones' ? 'span' : 'label', { class: c.tipo === 'opciones' ? 'etq' : '', for: `f_${c.key}` }, c.label, c.requerido ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null));
    wrap.append(control(c, datos[c.key], (v) => {
      datos[c.key] = v; wrap.classList.remove('error'); guardar();
      if (form.secciones.some((s) => s.campos.some((x) => x.visibleSi && x.visibleSi.campo === c.key))) pintarPaso();
    }));
    if (c.ayuda) wrap.append(h('span', { class: 'ayuda' }, c.ayuda));
    wrap.append(h('span', { class: 'msg' }, 'Este dato es obligatorio.'));
    return wrap;
  }

  function grupo(c) {
    if (!Array.isArray(datos[c.key])) datos[c.key] = [];
    const filas = datos[c.key];
    if (c.requerido && filas.length < (c.min || 1)) while (filas.length < (c.min || 1)) filas.push({});
    const caja = h('div', { class: 'grupo', 'data-key': c.key });
    const max = c.max || 5;
    caja.append(h('div', { class: 'grupo-cab' }, h('h3', {}, c.label, c.requerido ? h('span', { class: 'req' }, ' *') : null), h('span', { class: 'contador' }, max > 1 ? `${filas.length} de ${max}` : '')));
    filas.forEach((f, i) => {
      const fila = h('div', { class: 'fila' });
      if (max > 1) fila.append(h('div', { class: 'num' }, `${c.label.replace(/\(.*\)/, '').trim()} ${i + 1}`));
      if (!(c.requerido && filas.length <= (c.min || 1))) fila.append(h('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar', onclick: () => { filas.splice(i, 1); guardar(); pintarPaso(); } }, '✕ Quitar'));
      const rej = h('div', { class: 'rejilla' });
      c.campos.forEach((sc) => {
        const w = h('div', { class: 'campo', 'data-key': `${c.key}.${i}.${sc.key}` },
          h('label', { for: `f_${c.key}_${i}_${sc.key}` }, sc.label, sc.requerido ? h('span', { class: 'req' }, '*') : null),
          control(sc, f[sc.key], (v) => { f[sc.key] = v; w.classList.remove('error'); guardar(); }, `f_${c.key}_${i}_${sc.key}`),
          h('span', { class: 'msg' }, 'Este dato es obligatorio.'));
        rej.append(w);
      });
      fila.append(rej); caja.append(fila);
    });
    if (filas.length < max) {
      caja.append(h('button', { type: 'button', class: 'agregar', onclick: () => { filas.push({}); guardar(); pintarPaso(); } },
        filas.length ? `+ Agregar otro` : `+ Agregar ${c.label.toLowerCase().replace(/\(.*\)/, '').trim()}`));
    }
    return caja;
  }

  // ---------- Validación en cliente ----------
  function erroresSeccion(s) {
    const errs = [];
    for (const c of s.campos) {
      if (!visible(c)) continue;
      if (c.tipo === 'grupo') {
        const filas = (datos[c.key] || []);
        const llenas = filas.filter((f) => Object.values(f).some((v) => (v || '').toString().trim()));
        if (c.requerido && llenas.length < (c.min || 1)) errs.push({ key: `${c.key}.0.${c.campos.find((x) => x.requerido)?.key || c.campos[0].key}`, txt: `${c.label}: completa al menos ${c.min || 1}.` });
        filas.forEach((f, i) => {
          const tiene = Object.values(f).some((v) => (v || '').toString().trim());
          if (!tiene && !(c.requerido && i < (c.min || 1))) return;
          c.campos.forEach((sc) => { if (sc.requerido && !(f[sc.key] || '').trim()) errs.push({ key: `${c.key}.${i}.${sc.key}`, txt: `${c.label} ${i + 1}: falta ${sc.label.toLowerCase()}.` }); });
        });
        continue;
      }
      const v = datos[c.key];
      if (c.requerido && (v === undefined || v === null || (typeof v === 'string' && !v.trim()))) { errs.push({ key: c.key, txt: `Falta: ${c.label}.` }); continue; }
      if (c.tipo === 'correo' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs.push({ key: c.key, txt: 'Revisa tu correo electrónico.' });
      if (c.key === 'numeroDocumento' && datos.tipoDocumento === 'DNI' && v && !/^\d{8}$/.test(v.trim())) errs.push({ key: c.key, txt: 'El DNI debe tener 8 dígitos.' });
    }
    return errs;
  }
  function validarHasta(i) { for (let k = 0; k < i && k < form.secciones.length; k++) if (erroresSeccion(form.secciones[k]).length) return false; return true; }

  function mostrarErrores(errs) {
    const caja = $('#paso');
    caja.querySelectorAll('.aviso').forEach((x) => x.remove());
    errs.forEach((e) => { const el = caja.querySelector(`[data-key="${CSS.escape(e.key)}"]`); if (el) { el.classList.add('error'); const m = el.querySelector('.msg'); if (m) m.textContent = e.txt.replace(/^Falta: .*/, 'Este dato es obligatorio.'); } });
    const av = h('div', { class: 'aviso', role: 'alert' }, 'Revisa los siguientes datos antes de continuar:', h('ul', {}, ...errs.slice(0, 8).map((e) => h('li', {}, e.txt))));
    caja.querySelector('header').after(av);
    av.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Pantallas ----------
  function pintar() { pintarPasos(); pintarPaso(); }
  function pintarPaso() {
    const caja = $('#paso'); caja.innerHTML = '';
    const total = form.secciones.length + 1;
    if (paso < form.secciones.length) {
      const s = form.secciones[paso];
      caja.append(h('header', {}, h('h2', {}, s.titulo), h('span', { class: 'paso-de' }, `Paso ${paso + 1} de ${total}`)));
      if (s.descripcion) caja.append(h('p', { class: 'desc' }, s.descripcion));
      const rej = h('div', { class: 'rejilla' });
      s.campos.filter(visible).forEach((c) => rej.append(campo(c)));
      caja.append(rej);
      caja.append(h('div', { class: 'acciones' },
        paso > 0 ? h('button', { type: 'button', class: 'btn btn-sec', onclick: () => { paso--; guardar(); pintar(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, '← Anterior') : h('span'),
        h('button', { type: 'button', class: 'btn btn-pri', onclick: () => {
          const errs = erroresSeccion(s);
          if (errs.length) return mostrarErrores(errs);
          paso++; guardar(); pintar(); window.scrollTo({ top: 0, behavior: 'smooth' });
        } }, 'Continuar →')));
    } else revision(caja, total);
  }

  function valorTexto(c, v) {
    if (c.tipo === 'casilla') return v ? 'Sí' : 'No';
    if (c.tipo === 'fecha' && v) { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; }
    return v || '—';
  }
  function revision(caja, total) {
    caja.append(h('header', {}, h('h2', {}, 'Revisa tus datos'), h('span', { class: 'paso-de' }, `Paso ${total} de ${total}`)));
    caja.append(h('p', { class: 'desc' }, 'Confirma que todo esté correcto. Luego de enviar recibirás tu código de registro.'));
    form.secciones.forEach((s, i) => {
      const dl = h('dl');
      s.campos.filter(visible).forEach((c) => {
        if (c.tipo === 'grupo') {
          const filas = (datos[c.key] || []).filter((f) => Object.values(f).some((v) => (v || '').toString().trim()));
          if (!filas.length) return;
          filas.forEach((f, k) => dl.append(h('dt', {}, `${c.label}${filas.length > 1 ? ' ' + (k + 1) : ''}`), h('dd', {}, c.campos.map((sc) => valorTexto(sc, f[sc.key])).filter((x) => x !== '—').join(' · '))));
        } else dl.append(h('dt', {}, c.label), h('dd', {}, valorTexto(c, datos[c.key])));
      });
      caja.append(h('div', { class: 'resumen-sec' }, h('h3', {}, s.titulo, h('button', { type: 'button', onclick: () => { paso = i; pintar(); window.scrollTo({ top: 0 }); } }, 'Editar')), dl));
    });
    const acepta = h('input', { type: 'checkbox', id: 'acepta' });
    caja.append(h('div', { class: 'resumen-sec' }, h('label', { class: 'casilla' }, acepta, h('span', {}, form.consentimiento))));
    const enviar = h('button', { type: 'button', class: 'btn btn-pri', onclick: async () => {
      caja.querySelectorAll('.aviso').forEach((x) => x.remove());
      if (!acepta.checked) { const av = h('div', { class: 'aviso', role: 'alert' }, 'Marca la casilla de declaración para poder enviar.'); caja.querySelector('header').after(av); av.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      for (let k = 0; k < form.secciones.length; k++) { const e = erroresSeccion(form.secciones[k]); if (e.length) { paso = k; pintar(); return mostrarErrores(e); } }
      enviar.disabled = true; enviar.textContent = 'Enviando…';
      try {
        const r = await fetch('/api/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos, acepta: true }) });
        const j = await r.json();
        if (!r.ok) throw j;
        localStorage.removeItem(BORRADOR);
        exito(j);
      } catch (e) {
        enviar.disabled = false; enviar.textContent = 'Enviar ficha';
        const av = h('div', { class: 'aviso', role: 'alert' }, e.error || 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', e.errores ? h('ul', {}, ...e.errores.slice(0, 8).map((x) => h('li', {}, x))) : null);
        caja.querySelector('header').after(av); av.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } }, 'Enviar ficha');
    caja.append(h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'btn btn-sec', onclick: () => { paso--; pintar(); } }, '← Anterior'), enviar));
  }

  function exito(j) {
    const app = $('#app');
    app.className = '';
    const fecha = new Date(j.fecha).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' });
    app.innerHTML = '';
    app.append(h('div', { class: 'exito tarjeta' },
      h('div', { class: 'sello' }, '✓'),
      h('h1', {}, '¡Registro completado!'),
      h('p', {}, `Gracias, ${j.nombre}. Tu ficha se registró el ${fecha}`),
      h('div', { class: 'codigo' }, j.codigo),
      h('p', {}, 'Este es tu código de registro. Guárdalo: Recursos Humanos lo usará para identificar tus documentos de ingreso.'),
      h('p', {}, 'Ya puedes cerrar esta ventana.')));
    window.scrollTo({ top: 0 });
  }

  iniciar().catch(() => { $('#paso').innerHTML = '<div class="aviso">No se pudo cargar el formulario. Recarga la página.</div>'; });
})();
