// main.js — v3.2
// Cambios:
//   - Sliders recalculan solo al soltar el click (mouseup/touchend)
//   - Al cambiar especie se carga su JSON de parámetros desde /data/{especie}.json
//   - Export JSON sigue disponible para guardar configuración actual

const API_URL = 'http://localhost:8000';

const state = {
  tipo:        'roble',
  trunco_tipo: 'recto',
  altura:      80,
  tronco:      5,
  ramas:       5,
  densidad:    7,
  hojas:       true,
  escala:      87,
  correo:      '',
  stlBlobUrl:  null,
};

const ESPECIES_CON_TRONCO      = ['roble'];
const ESPECIES_CON_HOJAS_SWITCH = ['roble'];

const els = {
  tipo:          document.getElementById('tipo'),
  trunkGroup:    document.getElementById('trunk-type-group'),
  trunkButtons:  document.querySelectorAll('.switch-btn[data-trunk]'),
  hojasGroup:    document.getElementById('hojas-group'),
  hojasButtons:  document.querySelectorAll('.hojas-btn'),
  densidadGroup: document.getElementById('densidad-group'),
  altura:        document.getElementById('altura'),
  tronco:        document.getElementById('tronco'),
  ramas:         document.getElementById('ramas'),
  densidad:      document.getElementById('densidad'),
  escala:        document.getElementById('escala'),
  correo:        document.getElementById('correo'),
  btnGenerar:    document.getElementById('btn-generar'),
  btnDescargar:  document.getElementById('btn-descargar'),
  status:        document.getElementById('status'),
  badgeEspecie:  document.getElementById('badge-especie'),
  badgeEscala:   document.getElementById('badge-escala'),
  badgeAltura:   document.getElementById('badge-altura'),
  canvas:        document.getElementById('canvas3d'),
};

const tipoLabels = {
  roble:     'Roble',
  eucalipto: 'Eucalipto',
  pino:      'Pino insigne',
  muerto:    'Árbol muerto',
  palmera:   'Palmera cocotera',
  araucaria: 'Araucaria',
};

const escalaLabels = {
  87: '1:87 HO',
  72: '1:72',
  48: '1:48 O',
  35: '1:35',
};

// --------------------------------------------------
// Init
// --------------------------------------------------
TreeViewer.init(els.canvas);
// Doble rAF: garantiza que el browser ya calculó y pintó el layout
// antes de que Three.js lea clientWidth/clientHeight del canvas
requestAnimationFrame(() => requestAnimationFrame(() => {
  toggleTrunkSwitch();
  toggleHojasSwitch();
  updateBadges();
  TreeViewer.drawTree(state);
  cargarEspecie(state.tipo);
}));

// --------------------------------------------------
// Carga JSON de especie desde /data/{especie}.json
// Aplica los valores al estado y a los controles UI
// --------------------------------------------------
async function cargarEspecie(tipo) {
  try {
    const res = await fetch(`data/${tipo}.json`);
    if (!res.ok) throw new Error('no encontrado');
    const data = await res.json();

    // Aplicar parámetros del JSON al estado
    if (data.altura      !== undefined) _setSlider('altura',   data.altura);
    if (data.tronco      !== undefined) _setSlider('tronco',   data.tronco);
    if (data.ramas       !== undefined) _setSlider('ramas',    data.ramas);
    if (data.densidad    !== undefined) _setSlider('densidad', data.densidad);
    if (data.trunco_tipo !== undefined) {
      state.trunco_tipo = data.trunco_tipo;
      els.trunkButtons.forEach(b =>
        b.classList.toggle('active', b.dataset.trunk === data.trunco_tipo));
    }
    if (data.hojas !== undefined) {
      state.hojas = data.hojas;
      els.hojasButtons.forEach(b =>
        b.classList.toggle('active', b.dataset.hojas === String(data.hojas)));
    }

  } catch {
    // Si no existe el JSON de la especie, se mantienen los valores actuales
    console.warn(`No se encontró data/${tipo}.json — usando valores actuales`);
  }
}

// Actualiza un slider + su input numérico + el estado
function _setSlider(id, value) {
  const range = document.getElementById(id);
  const numIn = document.getElementById('num-' + id);
  const key   = id; // los ids coinciden con las keys del state
  if (range) range.value = value;
  if (numIn) numIn.value = value;
  state[key] = value;
}

// --------------------------------------------------
// Sliders — actualización SOLO al soltar el mouse
// Durante el arrastre solo actualiza el input numérico
// visualmente pero NO redibuja (evita lag)
// --------------------------------------------------
function bindSlider(id, key, min, max) {
  const range = document.getElementById(id);
  const numIn = document.getElementById('num-' + id);

  // Durante arrastre: solo actualiza el número visual
  range.addEventListener('input', () => {
    numIn.value = range.value;
    // Actualizar el state sin redibujar
    state[key] = Number(range.value);
  });

  // Al SOLTAR: redibuja
  range.addEventListener('change', () => {
    let v = Number(range.value);
    v = Math.max(min, Math.min(max, v));
    range.value = v;
    numIn.value = v;
    state[key] = v;
    redraw();
  });

  // Input numérico editado manualmente → redibuja al confirmar
  numIn.addEventListener('change', () => {
    let v = Number(numIn.value);
    if (Number.isNaN(v)) v = Number(range.value);
    v = Math.max(min, Math.min(max, v));
    numIn.value = v;
    range.value = v;
    state[key] = v;
    redraw();
  });
}

bindSlider('altura',   'altura',   20, 200);
bindSlider('tronco',   'tronco',   1,  20);
bindSlider('ramas',    'ramas',    3,  7);
bindSlider('densidad', 'densidad', 0,  10);

// --------------------------------------------------
// Especie — carga JSON y redibuja
// --------------------------------------------------
els.tipo.addEventListener('change', async () => {
  state.tipo = els.tipo.value;
  await cargarEspecie(state.tipo);
  toggleTrunkSwitch();
  toggleHojasSwitch();
  redraw();
});

// --------------------------------------------------
// Switch tipo de tronco
// --------------------------------------------------
els.trunkButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.trunk;
    state.trunco_tipo = v;
    els.trunkButtons.forEach(b => b.classList.toggle('active', b.dataset.trunk === v));
    redraw();
  });
});

function toggleTrunkSwitch() {
  const visible = ESPECIES_CON_TRONCO.includes(state.tipo);
  els.trunkGroup.hidden = !visible;
  if (!visible && state.trunco_tipo !== 'recto') {
    state.trunco_tipo = 'recto';
    els.trunkButtons.forEach(b => b.classList.toggle('active', b.dataset.trunk === 'recto'));
  }
}

// --------------------------------------------------
// Switch hojas on/off
// --------------------------------------------------
els.hojasButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.hojas === 'true';
    state.hojas = v;
    els.hojasButtons.forEach(b => b.classList.toggle('active', b.dataset.hojas === String(v)));
    redraw();
  });
});

function toggleHojasSwitch() {
  const esRoble = ESPECIES_CON_HOJAS_SWITCH.includes(state.tipo);
  els.hojasGroup.hidden    = !esRoble;
  els.densidadGroup.hidden =  esRoble;
}

// --------------------------------------------------
// Escala y correo
// --------------------------------------------------
els.escala.addEventListener('change', () => {
  state.escala = Number(els.escala.value);
  updateBadges();
});

els.correo.addEventListener('input', () => {
  state.correo = els.correo.value;
});

// --------------------------------------------------
// Helpers UI
// --------------------------------------------------
function redraw() {
  TreeViewer.drawTree(state);
  updateBadges();
  // Invalidar el STL anterior: ya no corresponde al árbol que se ve
  if (state.stlBlobUrl) {
    URL.revokeObjectURL(state.stlBlobUrl);
    state.stlBlobUrl = null;
  }
  els.btnDescargar.disabled = true;
}

function updateBadges() {
  els.badgeEspecie.textContent = tipoLabels[state.tipo] || state.tipo;
  els.badgeEscala.textContent  = escalaLabels[state.escala] || `1:${state.escala}`;
  els.badgeAltura.textContent  = `${state.altura}mm`;
}

function setStatus(msg, type = 'loading') {
  els.status.textContent = msg;
  els.status.className = `status ${type}`;
}

// Export current configuration as JSON
function descargarJSON() {
  const data = {
    tipo:          state.tipo,
    altura:        state.altura,
    tronco:        state.tronco,
    ramas:         state.ramas,
    hojas:         state.hojas,
    densidad:      state.densidad,
    escala:        escalaLabels[state.escala] || `1:${state.escala}`,
    escala_ratio:  state.escala,
    generado_en:   new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `arbol_${state.tipo}_${state.altura}mm.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --------------------------------------------------
// Inicialización — movida al requestAnimationFrame de arriba
// --------------------------------------------------

// --------------------------------------------------
// Botón Generar STL
// Exporta el árbol que se ve en el visor directamente a STL.
// Lo que ves es exactamente lo que se descarga.
// --------------------------------------------------
els.btnGenerar.addEventListener('click', () => {
  els.btnGenerar.disabled = true;
  els.btnDescargar.disabled = true;
  setStatus('⟳ Generando modelo STL...', 'loading');

  // requestAnimationFrame para que el navegador pinte el estado "loading"
  // antes de bloquearse generando la geometría
  requestAnimationFrame(() => {
    try {
      const resultado = TreeViewer.exportSTL();
      if (!resultado) throw new Error('No hay árbol para exportar');

      // Liberar URL anterior si existía
      if (state.stlBlobUrl) URL.revokeObjectURL(state.stlBlobUrl);
      state.stlBlobUrl = URL.createObjectURL(resultado.blob);

      const kb = (resultado.blob.size / 1024).toFixed(0);
      setStatus(`✓ Modelo generado · ${resultado.triangulos.toLocaleString()} triángulos · ${kb} KB`, 'success');
      els.btnDescargar.disabled = false;
    } catch (e) {
      setStatus(`✗ Error: ${e.message}`, 'error');
    } finally {
      els.btnGenerar.disabled = false;
    }
  });
});

// --------------------------------------------------
// Botón Descargar STL
// --------------------------------------------------
els.btnDescargar.addEventListener('click', () => {
  if (!state.stlBlobUrl) return;
  const a = document.createElement('a');
  a.href = state.stlBlobUrl;
  a.download = `arbol_${state.tipo}_${state.altura}mm.stl`;
  a.click();
});

