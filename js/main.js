// main.js — Logica principal: controles, estado y conexion con el backend

const API_URL = 'http://localhost:8000';

// Estado actual de los parametros
const state = {
  tipo:     'roble',
  altura:   80,
  tronco:   5,
  ramas:    4,
  densidad: 7,
  escala:   87,
  angulo:   30,
  correo:   '',
  stlUrl:   null,
};

// Referencias a elementos del DOM
const els = {
  tipo:         document.getElementById('tipo'),
  altura:       document.getElementById('altura'),
  tronco:       document.getElementById('tronco'),
  ramas:        document.getElementById('ramas'),
  densidad:     document.getElementById('densidad'),
  escala:       document.getElementById('escala'),
  correo:       document.getElementById('correo'),
  btnGenerar:   document.getElementById('btn-generar'),
  btnDescargar: document.getElementById('btn-descargar'),
  status:       document.getElementById('status'),
  badgeEspecie: document.getElementById('badge-especie'),
  badgeEscala:  document.getElementById('badge-escala'),
  badgeAltura:  document.getElementById('badge-altura'),
  canvas:       document.getElementById('canvas3d'),
};

// Nombres legibles para badges
const tipoLabels = {
  roble:     'Roble',
  pino:      'Pino insigne',
  sauce:     'Sauce llorón',
  muerto:    'Árbol muerto',
  palmera:   'Palmera cocotera',   // Cocos nucifera
  araucaria: 'Araucaria',          // Araucaria araucana
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

// Conecta sliders con estado, vista e inputs numericos
function bindSlider(id, key, min, max) {
  const range  = document.getElementById(id);
  const label  = document.getElementById('val-' + id);
  const numIn  = document.getElementById('num-' + id);

  // Slider → numero + vista
  range.addEventListener('input', () => {
    const v = Number(range.value);
    state[key] = v;
    label.textContent = v;
    if (numIn) numIn.value = v;
    TreeViewer.drawTree(state);
    updateBadges();
    state.stlUrl = null;
    els.btnDescargar.disabled = true;
  });

  // Input numerico → slider + vista (change: solo al salir del campo)
  if (numIn) {
    numIn.addEventListener('change', () => {
      let v = Number(numIn.value);
      v = Math.max(min, Math.min(max, v));
      numIn.value = v;
      range.value = v;
      state[key] = v;
      label.textContent = v;
      TreeViewer.drawTree(state);
      updateBadges();
      state.stlUrl = null;
      els.btnDescargar.disabled = true;
    });
  }
}

bindSlider('altura',   'altura',   20, 200);
bindSlider('tronco',   'tronco',   1,  20);
bindSlider('ramas',    'ramas',    1,  6);
bindSlider('densidad', 'densidad', 0,  10);

els.tipo.addEventListener('change', () => {
  state.tipo = els.tipo.value;
  TreeViewer.drawTree(state);
  updateBadges();
  state.stlUrl = null;
  els.btnDescargar.disabled = true;
});

els.escala.addEventListener('change', () => {
  state.escala = Number(els.escala.value);
  updateBadges();
});

els.correo.addEventListener('input', () => {
  state.correo = els.correo.value;
});

// Actualiza los badges de la vista
function updateBadges() {
  els.badgeEspecie.textContent = tipoLabels[state.tipo] || state.tipo;
  els.badgeEscala.textContent  = escalaLabels[state.escala] || `1:${state.escala}`;
  els.badgeAltura.textContent  = `${state.altura}mm`;
}

updateBadges();

// Muestra un mensaje de estado
function setStatus(msg, type = 'loading') {
  els.status.textContent = msg;
  els.status.className = `status ${type}`;
}

function clearStatus() {
  els.status.className = 'status hidden';
}

// Boton Generar — llama al backend
els.btnGenerar.addEventListener('click', async () => {
  els.btnGenerar.disabled = true;
  els.btnDescargar.disabled = true;
  setStatus('⟳ Generando modelo STL en el servidor...', 'loading');

  try {
    const res = await fetch(`${API_URL}/generar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:     state.tipo,
        altura:   state.altura,
        tronco:   state.tronco,
        ramas:    state.ramas,
        densidad: state.densidad,
        escala:   state.escala,
        correo:   state.correo,
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

// Boton Descargar
els.btnDescargar.addEventListener('click', () => {
  if (!state.stlUrl) return;
  const a = document.createElement('a');
  a.href = state.stlUrl;
  a.download = `arbol_${state.tipo}_${state.altura}mm.stl`;
  a.click();
});
