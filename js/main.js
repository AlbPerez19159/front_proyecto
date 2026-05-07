// main.js — Logica principal: controles, estado y conexion con el backend
// Cambios v2.1:
//   - sauce reemplazado por eucalipto (decision botanica)
//   - switch de tipo de tronco (recto / natural) para roble y eucalipto
//   - num-input es el unico display del valor (eliminado span "val")
//   - minimo de niveles de ramas subido a 3 → arboles mas frondosos por defecto

const API_URL = 'http://localhost:8000';

// Estado actual de los parametros
const state = {
  tipo:         'roble',
  trunco_tipo:  'recto',   // recto | natural — solo aplica a roble y eucalipto
  altura:       80,
  tronco:       5,
  ramas:        5,         // antes 4, subido para mas follaje
  densidad:     7,
  escala:       87,
  correo:       '',
  stlUrl:       null,
};

// Especies que aceptan tipo de tronco curvo
const ESPECIES_CON_TRONCO = ['roble', 'eucalipto'];

// Referencias a elementos del DOM
const els = {
  tipo:           document.getElementById('tipo'),
  trunkGroup:     document.getElementById('trunk-type-group'),
  trunkButtons:   document.querySelectorAll('.switch-btn'),
  altura:         document.getElementById('altura'),
  tronco:         document.getElementById('tronco'),
  ramas:          document.getElementById('ramas'),
  densidad:       document.getElementById('densidad'),
  escala:         document.getElementById('escala'),
  correo:         document.getElementById('correo'),
  btnGenerar:     document.getElementById('btn-generar'),
  btnDescargar:   document.getElementById('btn-descargar'),
  status:         document.getElementById('status'),
  badgeEspecie:   document.getElementById('badge-especie'),
  badgeEscala:    document.getElementById('badge-escala'),
  badgeAltura:    document.getElementById('badge-altura'),
  canvas:         document.getElementById('canvas3d'),
};

// Nombres legibles para badges
const tipoLabels = {
  roble:     'Roble',
  eucalipto: 'Eucalipto',          // reemplaza al sauce
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

// Inicializa la escena 3D
TreeViewer.init(els.canvas);
TreeViewer.drawTree(state);

// --------------------------------------------------
// Slider <-> Input numerico
// El input numerico es el UNICO display del valor
// --------------------------------------------------
function bindSlider(id, key, min, max) {
  const range = document.getElementById(id);
  const numIn = document.getElementById('num-' + id);

  // Slider arrastrado → actualiza input + estado + vista
  range.addEventListener('input', () => {
    const v = Number(range.value);
    state[key] = v;
    numIn.value = v;
    redraw();
  });

  // Input numerico editado → actualiza slider + estado + vista
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
bindSlider('ramas',    'ramas',    3,  7);   // minimo subido a 3
bindSlider('densidad', 'densidad', 0,  10);

// --------------------------------------------------
// Especie
// --------------------------------------------------
els.tipo.addEventListener('change', () => {
  state.tipo = els.tipo.value;
  toggleTrunkSwitch();
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
  // Al cambiar a una especie sin switch, el tronco se considera recto
  if (!visible && state.trunco_tipo !== 'recto') {
    state.trunco_tipo = 'recto';
    els.trunkButtons.forEach(b => b.classList.toggle('active', b.dataset.trunk === 'recto'));
  }
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
// Helpers de UI
// --------------------------------------------------
function redraw() {
  TreeViewer.drawTree(state);
  updateBadges();
  state.stlUrl = null;
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

// Inicializacion
toggleTrunkSwitch();
updateBadges();

// --------------------------------------------------
// Boton Generar — llama al backend
// --------------------------------------------------
els.btnGenerar.addEventListener('click', async () => {
  els.btnGenerar.disabled = true;
  els.btnDescargar.disabled = true;
  setStatus('⟳ Generando modelo STL en el servidor...', 'loading');

  try {
    const res = await fetch(`${API_URL}/generar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:        state.tipo,
        trunco_tipo: state.trunco_tipo,
        altura:      state.altura,
        tronco:      state.tronco,
        ramas:       state.ramas,
        densidad:    state.densidad,
        escala:      state.escala,
        correo:      state.correo,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error del servidor');
    }

    const data = await res.json();
    state.stlUrl = `${API_URL}${data.url}`;

    setStatus(`✓ Modelo generado: ${data.filename}`, 'success');
    els.btnDescargar.disabled = false;

  } catch (e) {
    if (e.message.includes('fetch')) {
      setStatus('✗ No se pudo conectar al backend. ¿Está corriendo el servidor?', 'error');
    } else {
      setStatus(`✗ Error: ${e.message}`, 'error');
    }
  } finally {
    els.btnGenerar.disabled = false;
  }
});

// --------------------------------------------------
// Boton Descargar
// --------------------------------------------------
els.btnDescargar.addEventListener('click', () => {
  if (!state.stlUrl) return;
  const a = document.createElement('a');
  a.href = state.stlUrl;
  a.download = `arbol_${state.tipo}_${state.altura}mm.stl`;
  a.click();
});
