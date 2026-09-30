(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => (s === undefined || s === null ? '' : String(s)).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fecha = (iso) => new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(el._t); el._t = setTimeout(() => (el.style.display = 'none'), 2600); };
  let lista = []; let form = null; const sel = new Set();

  async function api(url, opt = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
    if (r.status === 401) { mostrarLogin(); throw new Error('401'); }
    return r;
  }
  function mostrarLogin() { $('#login').hidden = false; $('#panel').hidden = true; $('#salir-wrap').hidden = true; $('#pass').focus(); }
  async function mostrarPanel() {
    $('#login').hidden = true; $('#panel').hidden = false; $('#salir-wrap').hidden = false;
    form = await (await fetch('/api/formulario')).json();
    $('#enlace').textContent = location.origin + '/';
    cargar();
  }

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pass').value }) });
    const j = await r.json();
    if (!r.ok) { $('#login-err').hidden = false; $('#login-err').textContent = j.error; return; }
    $('#pass').value = ''; mostrarPanel();
  });
  $('#salir').addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST' }); mostrarLogin(); });

  let tq;
  $('#q').addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(cargar, 200); });

  async function cargar() {
    const r = await api('/api/admin/registros?q=' + encodeURIComponent($('#q').value));
    lista = await r.json();
    const hoy = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
    if (!$('#q').value) { $('#c-total').textContent = lista.length; $('#c-hoy').textContent = lista.filter((x) => new Date(x.fecha).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) === hoy).length; }
    const tb = $('#filas'); tb.innerHTML = '';
    $('#vacio').hidden = lista.length > 0;
    if (!lista.length && $('#q').value) { $('#vacio').hidden = false; $('#vacio').textContent = 'No se encontraron registros con esa búsqueda.'; }
    for (const x of lista) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="checkbox" class="chk" data-c="${esc(x.codigo)}" ${sel.has(x.codigo) ? 'checked' : ''} aria-label="Seleccionar"></td>
        <td class="cod">${esc(x.codigo)}</td>
        <td><div class="nom">${esc(x.nombre)}</div><div class="sub">${esc(x.documento)}${x.cargo ? ' · ' + esc(x.cargo) : ''}</div></td>
        <td>${esc(fecha(x.fecha))}</td>
        <td><span class="estado">${esc(x.estado)}</span></td>
        <td><div class="acc"><button class="ico" data-ver="${esc(x.codigo)}">Ver datos</button><a class="ico" href="/api/admin/registros/${encodeURIComponent(x.codigo)}/pdf?ver=1" target="_blank" rel="noopener">Imprimir</a><a class="ico pri" href="/api/admin/registros/${encodeURIComponent(x.codigo)}/pdf">Descargar PDF</a></div></td>`;
      tb.append(tr);
    }
    actualizarSel();
  }
  $('#filas').addEventListener('change', (e) => { const c = e.target.dataset.c; if (!c) return; e.target.checked ? sel.add(c) : sel.delete(c); actualizarSel(); });
  $('#sel-todo').addEventListener('change', (e) => { lista.forEach((x) => (e.target.checked ? sel.add(x.codigo) : sel.delete(x.codigo))); cargar(); });
  function actualizarSel() { $('#zip-sel').disabled = sel.size === 0; $('#zip-sel').textContent = sel.size ? `Descargar ${sel.size} seleccionado(s) (ZIP)` : 'Descargar seleccionados (ZIP)'; }
  $('#zip-sel').addEventListener('click', async () => {
    const b = $('#zip-sel'); b.disabled = true; b.textContent = 'Preparando ZIP…';
    try {
      const r = await api('/api/admin/zip', { method: 'POST', body: JSON.stringify({ codigos: [...sel] }) });
      const blob = await r.blob(); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = (r.headers.get('Content-Disposition') || '').split('filename="')[1]?.replace('"', '') || 'documentos.zip'; a.click();
    } finally { actualizarSel(); }
  });

  // ---- Detalle ----
  $('#filas').addEventListener('click', async (e) => { const c = e.target.dataset.ver; if (c) abrir(c); });
  async function abrir(codigo) {
    const r = await (await api('/api/admin/registros/' + encodeURIComponent(codigo))).json();
    $('#m-cod').textContent = r.codigo; $('#m-nom').textContent = r.nombre; $('#m-fecha').textContent = 'Registrado el ' + fecha(r.fechaRegistro);
    const val = (c, v) => (c.tipo === 'casilla' ? (v ? 'Sí' : 'No') : c.tipo === 'fecha' && v ? v.split('-').reverse().join('/') : v || '—');
    let html = `<div class="docs"><div><div class="arch">${esc(r.codigo)}.pdf</div><div class="sub">8 documentos en un solo archivo: consentimiento, confidencialidad, salud, información del trabajador, pensiones, domicilio, CTS y abono de haberes en ${esc(r.datos.bancoHaberes || '—')}</div></div>
      <div class="acc"><a class="ico" target="_blank" rel="noopener" href="/api/admin/registros/${encodeURIComponent(r.codigo)}/pdf?ver=1">Ver / imprimir</a><a class="ico pri" href="/api/admin/registros/${encodeURIComponent(r.codigo)}/pdf">Descargar PDF</a></div></div>`;
    const conocidas = new Set();
    for (const s of form.secciones) {
      html += `<div class="resumen-sec"><h3>${esc(s.titulo)}</h3><dl>`;
      for (const c of s.campos) {
        conocidas.add(c.key);
        const v = r.datos[c.key];
        if (c.tipo === 'grupo') {
          const filas = Array.isArray(v) ? v : [];
          if (!filas.length) continue;
          filas.forEach((f, i) => { html += `<dt>${esc(c.label)}${filas.length > 1 ? ' ' + (i + 1) : ''}</dt><dd>${esc(c.campos.map((sc) => val(sc, f[sc.key])).filter((x) => x !== '—').join(' · '))}</dd>`; });
        } else if (v !== undefined && v !== '') html += `<dt>${esc(c.label)}</dt><dd>${esc(val(c, v))}</dd>`;
      }
      html += '</dl></div>';
    }
    const extra = Object.keys(r.datos).filter((k) => !conocidas.has(k));
    if (extra.length) html += `<div class="resumen-sec"><h3>Otros datos</h3><dl>${extra.map((k) => `<dt>${esc(k)}</dt><dd>${esc(typeof r.datos[k] === 'object' ? JSON.stringify(r.datos[k]) : r.datos[k])}</dd>`).join('')}</dl></div>`;
    html += `<div class="acciones"><button class="ico" id="borrar" style="color:var(--rojo-osc)">Eliminar registro</button><span></span></div>`;
    $('#m-cuerpo').innerHTML = html;
    $('#borrar').onclick = async () => {
      if (!confirm(`¿Eliminar el registro ${r.codigo} de ${r.nombre}? Esta acción no se puede deshacer.`)) return;
      await api('/api/admin/registros/' + encodeURIComponent(r.codigo), { method: 'DELETE' });
      sel.delete(r.codigo); cerrar(); cargar(); toast('Registro eliminado');
    };
    $('#modal').classList.add('abierto');
  }
  const cerrar = () => $('#modal').classList.remove('abierto');
  $('#cerrar').addEventListener('click', cerrar);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });

  // ---- Pestañas ----
  document.querySelectorAll('.pestanas button').forEach((b) => b.addEventListener('click', async () => {
    document.querySelectorAll('.pestanas button').forEach((x) => x.classList.toggle('on', x === b));
    ['lista', 'config', 'enlace'].forEach((t) => ($('#tab-' + t).hidden = t !== b.dataset.tab));
    if (b.dataset.tab === 'config') $('#json').value = JSON.stringify(await (await api('/api/admin/formulario')).json(), null, 2);
  }));
  $('#guardar-json').addEventListener('click', async () => {
    let obj; try { obj = JSON.parse($('#json').value); } catch (e) { return alert('El texto no es un JSON válido: ' + e.message); }
    const r = await api('/api/admin/formulario', { method: 'PUT', body: JSON.stringify(obj) });
    const j = await r.json(); if (!r.ok) return alert(j.error);
    form = obj; toast('Formulario actualizado');
  });
  $('#restaurar').addEventListener('click', async () => {
    if (!confirm('¿Volver al formulario original?')) return;
    await api('/api/admin/formulario', { method: 'DELETE' });
    form = await (await fetch('/api/formulario')).json(); $('#json').value = JSON.stringify(form, null, 2); toast('Formulario restaurado');
  });
  $('#copiar').addEventListener('click', () => { navigator.clipboard.writeText($('#enlace').textContent).then(() => toast('Enlace copiado')); });

  fetch('/api/admin/sesion').then((r) => r.json()).then((j) => (j.ok ? mostrarPanel() : mostrarLogin()));
})();
