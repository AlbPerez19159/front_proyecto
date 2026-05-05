// tree.js — Generacion del arbol 3D con Three.js
// Mejorado con morfologia botanica documentada (Resumen Ejecutivo)
// Especies: roble, pino, sauce, muerto, palmera, araucaria

const TreeViewer = (() => {

  let renderer, scene, camera, treeGroup, animFrame;
  let isDragging = false, lastX = 0, rotY = 0, rotX = 0.2;
  let autoRotate = true;

  // --------------------------------------------------
  // Inicializa renderer, camara y luces
  // --------------------------------------------------
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x161a16, 1);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 100, 240);
    camera.lookAt(0, 60, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(100, 200, 100);
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0x88ccaa, 0.3);
    fill.position.set(-80, -50, -80);
    scene.add(fill);

    const groundGeo = new THREE.CircleGeometry(120, 32);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1a2a1a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    _bindMouse(canvas);
    _bindResize(canvas);
    _animate();
  }

  // --------------------------------------------------
  // Selecciona el generador segun la especie
  // --------------------------------------------------
  function drawTree(params) {
    if (treeGroup) scene.remove(treeGroup);
    treeGroup = new THREE.Group();

    switch (params.tipo) {
      case 'pino':      _drawPino(treeGroup, params);      break;
      case 'palmera':   _drawPalmera(treeGroup, params);   break;
      case 'araucaria': _drawAraucaria(treeGroup, params); break;
      default:          _drawFrondoso(treeGroup, params);  break;
    }

    treeGroup.position.y = 0;
    scene.add(treeGroup);
    autoRotate = true;
  }

  // --------------------------------------------------
  // PINO (Pinus radiata)
  // Morfologia: tronco alto y recto, verticilos de ramas
  // en intervalos regulares, forma conica, angulo 30-45 deg
  // Fuente: Resumen Ejecutivo sec.1 — 5-10 niveles, 4-8 ramas/nivel
  // --------------------------------------------------
  function _drawPino(group, params) {
    const h = params.altura;
    const niveles = Math.max(params.ramas, 4);
    const angRama = 35 * Math.PI / 180; // 35 deg segun documentacion
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x6b4423 });

    // Tronco alto y recto, sin ramas en la parte baja
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.15, params.tronco * 0.65, h, 8
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h / 2;
    group.add(trunk);

    // Verticilos de ramas: grupos circulares a intervalos regulares
    const ramasPorNivel = 5;
    for (let i = 0; i < niveles; i++) {
      const t = i / (niveles - 1);
      const y = h * 0.2 + t * h * 0.72;
      // Ramas mas cortas hacia arriba: forma conica
      const longRama = h * 0.32 * (1 - t * 0.65) * (params.densidad / 10 + 0.4);
      const radioRama = Math.max(params.tronco * 0.07, 0.3);
      const color = new THREE.Color().setHSL(0.32, 0.65, 0.17 + t * 0.07);

      for (let j = 0; j < ramasPorNivel; j++) {
        const theta = (Math.PI * 2 / ramasPorNivel) * j;
        const dx = Math.cos(theta);
        const dz = Math.sin(theta);

        const start = new THREE.Vector3(0, y, 0);
        const end = new THREE.Vector3(
          dx * longRama * Math.cos(angRama),
          y + longRama * Math.sin(angRama),
          dz * longRama * Math.cos(angRama)
        );

        const path = new THREE.LineCurve3(start, end);
        const geo = new THREE.TubeGeometry(path, 3, radioRama, 5, false);
        group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })));

        // Sub-ramas con aciculas agrupadas
        if (params.densidad > 3 && longRama > 5) {
          for (let k = 0; k < 3; k++) {
            const tSub = 0.35 + k * 0.22;
            const subStart = start.clone().lerp(end, tSub);
            const subTheta = theta + (k - 1) * Math.PI / 2.5;
            const subLen = longRama * 0.38;
            const subEnd = new THREE.Vector3(
              subStart.x + Math.cos(subTheta) * subLen * 0.85,
              subStart.y + subLen * 0.18,
              subStart.z + Math.sin(subTheta) * subLen * 0.85
            );
            const subPath = new THREE.LineCurve3(subStart, subEnd);
            const subGeo = new THREE.TubeGeometry(subPath, 2, radioRama * 0.45, 4, false);
            group.add(new THREE.Mesh(subGeo, new THREE.MeshLambertMaterial({ color })));
          }
        }
      }
    }

    // Apice cónico puntiagudo
    const apexH = h * 0.14;
    const apexGeo = new THREE.ConeGeometry(h * 0.035, apexH, 6);
    const apex = new THREE.Mesh(apexGeo, new THREE.MeshLambertMaterial({ color: 0x2a4018 }));
    apex.position.y = h + apexH / 2;
    group.add(apex);
  }

  // --------------------------------------------------
  // PALMERA (Cocos nucifera)
  // Morfologia: tronco unico sin ramas laterales,
  // corona de hojas pinnadas colgantes en el apice
  // Fuente: Resumen Ejecutivo sec.4 — 10-20 hojas, angulo 50-70 deg
  // --------------------------------------------------
  function _drawPalmera(group, params) {
    const h = params.altura;
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x9e7a3a });

    // Tronco unico ligeramente conico (ancho abajo, delgado arriba)
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.22, params.tronco * 0.55, h * 0.88, 9
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h * 0.44;
    group.add(trunk);

    // Anillos en el tronco (cicatrices de hojas viejas)
    const numAnillos = 8;
    for (let i = 0; i < numAnillos; i++) {
      const t = (i + 1) / (numAnillos + 1);
      const ringGeo = new THREE.TorusGeometry(
        params.tronco * 0.34, params.tronco * 0.055, 4, 9
      );
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshLambertMaterial({ color: 0x7a5c28 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.88 * t;
      group.add(ring);
    }

    // Corona de hojas pinnadas colgantes (unico lugar con hojas)
    const numHojas = Math.max(10, Math.round(params.densidad * 1.2 + 8));
    const coronaY = h * 0.88;
    const longHoja = h * 0.42;
    const matHoja    = new THREE.MeshLambertMaterial({ color: 0x3a6b28 });
    const matHojaOsc = new THREE.MeshLambertMaterial({ color: 0x2d5520 });

    for (let i = 0; i < numHojas; i++) {
      const theta = (Math.PI * 2 / numHojas) * i;

      // Curva: sale horizontal, sube un poco, luego cuelga
      const p0 = new THREE.Vector3(0, coronaY, 0);
      const p1 = new THREE.Vector3(
        Math.cos(theta) * longHoja * 0.35,
        coronaY + longHoja * 0.22,
        Math.sin(theta) * longHoja * 0.35
      );
      const p2 = new THREE.Vector3(
        Math.cos(theta) * longHoja * 0.88,
        coronaY - longHoja * 0.35,
        Math.sin(theta) * longHoja * 0.88
      );

      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const pts = curve.getPoints(8);
      const path = new THREE.CatmullRomCurve3(pts);
      const leafGeo = new THREE.TubeGeometry(path, 7, Math.max(params.tronco * 0.035, 0.35), 4, false);
      group.add(new THREE.Mesh(leafGeo, i % 3 === 0 ? matHojaOsc : matHoja));
    }
  }

  // --------------------------------------------------
  // ARAUCARIA (Araucaria araucana)
  // Morfologia real (foto referencia):
  //   - Tronco limpio en el 60% inferior (sin ramas)
  //   - Copa tipo paraguas SOLO en la parte alta
  //   - Ramas largas que salen horizontales y suben levemente en la punta
  //   - Sub-ramas van HACIA ADELANTE a lo largo de la rama (no en cruz)
  //   - Silhoueta: ancha en el centro de la copa, estrecha arriba y abajo
  // --------------------------------------------------
  function _drawAraucaria(group, params) {
    const h = params.altura;
    const niveles = Math.max(params.ramas, 5);
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x4a3018 });

    // Tronco limpio y grueso — sin ramas en los 2/3 inferiores
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.3, params.tronco * 0.75, h, 9
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h / 2;
    group.add(trunk);

    // Copa solo en el TERCIO SUPERIOR (60%-100% de altura)
    // Perfil de paraguas: ramas largas en el medio, cortas arriba y abajo
    const coronaBase = h * 0.60;
    const coronaAltura = h * 0.40;
    const ramasPorNivel = 6;

    for (let i = 0; i < niveles; i++) {
      const t = i / (niveles - 1); // 0 = base corona, 1 = cima

      // Posicion Y dentro de la corona
      const y = coronaBase + t * coronaAltura;

      // Longitud: maxima al 40% de la corona, se acorta arriba y abajo
      // → perfil de paraguas/domo
      const tCampana = Math.sin(t * Math.PI);
      const longRama = h * 0.38 * tCampana * (params.densidad / 10 + 0.5);
      if (longRama < 2) continue;

      const radioRama = Math.max(params.tronco * 0.09, 0.4);
      const color = new THREE.Color().setHSL(0.31, 0.6, 0.20 + t * 0.05);

      for (let j = 0; j < ramasPorNivel; j++) {
        // Rotacion alternada para no superponerse entre niveles
        const theta = (Math.PI * 2 / ramasPorNivel) * j + (Math.PI / ramasPorNivel) * (i % 2);
        const dx = Math.cos(theta);
        const dz = Math.sin(theta);

        // Rama principal: sale casi horizontal, levemente hacia arriba en la punta
        // Usando curva Bezier para el giro natural de la punta
        const p0 = new THREE.Vector3(0, y, 0);
        const p1 = new THREE.Vector3(dx * longRama * 0.55, y + longRama * 0.05, dz * longRama * 0.55);
        const p2 = new THREE.Vector3(dx * longRama, y + longRama * 0.18, dz * longRama);

        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
        const pts = curve.getPoints(6);
        const path = new THREE.CatmullRomCurve3(pts);
        const branchGeo = new THREE.TubeGeometry(path, 5, radioRama, 5, false);
        group.add(new THREE.Mesh(branchGeo, new THREE.MeshLambertMaterial({ color })));

        // Sub-ramas: van A LO LARGO de la rama (no en cruz)
        // Salen hacia arriba y adelante en la direccion de la rama
        if (params.densidad > 2 && longRama > 8) {
          const subRadio = radioRama * 0.45;
          const numSub = Math.floor(params.densidad / 2) + 1;

          for (let k = 1; k <= numSub; k++) {
            const tSub = k / (numSub + 1);
            const subStart = curve.getPoint(tSub);
            const subLen = longRama * 0.28 * (1 - tSub * 0.4);

            // Sub-ramas hacia arriba a ~45 deg, en la misma direccion de la rama
            [-0.4, 0.4].forEach(offset => {
              const subTheta = theta + offset;
              const subEnd = new THREE.Vector3(
                subStart.x + Math.cos(subTheta) * subLen * 0.7,
                subStart.y + subLen * 0.55,  // van hacia arriba
                subStart.z + Math.sin(subTheta) * subLen * 0.7
              );
              const subPath = new THREE.LineCurve3(subStart.clone(), subEnd);
              const subGeo = new THREE.TubeGeometry(subPath, 2, subRadio, 4, false);
              group.add(new THREE.Mesh(subGeo, new THREE.MeshLambertMaterial({ color })));
            });
          }
        }
      }
    }
  }

  // --------------------------------------------------
  // FRONDOSOS: Roble, Sauce, Muerto
  // Angulos segun documentacion botanica:
  //   Roble  → 62 deg (copa ancha y redondeada)
  //   Sauce  → 12 deg inicial, cae pendularmente
  //   Muerto → 35 deg
  // Fix 3D: se agrega rotacion base aleatoria para que las
  // ramas no queden todas en el mismo plano (bug 2D anterior)
  // --------------------------------------------------
  function _drawFrondoso(group, params) {
    const angulosEspecie = { roble: 62, sauce: 12, muerto: 35 };
    const angulo = angulosEspecie[params.tipo] ?? 30;

    // Rotacion base aleatoria en Y — garantiza distribucion 3D real
    const rotBase = Math.random() * Math.PI * 2;

    _addBranch(
      group,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      params.altura * 0.42,
      params.tronco * 0.5,
      0,
      params.ramas,
      { ...params, angulo, rotBase }
    );
  }

  // Rama recursiva mejorada
  function _addBranch(group, start, dir, len, radius, depth, maxDepth, params) {
    if (depth > maxDepth || len < 1.5) return;

    // Variacion aleatoria de longitud para naturalidad
    const actualLen = len * (0.88 + Math.random() * 0.24);
    const end = start.clone().addScaledVector(dir, actualLen);

    // Color de la rama — mas claro en profundidad
    const color = params.tipo === 'muerto'
      ? new THREE.Color().setHSL(0.08, 0.12, 0.38 + depth * 0.03)
      : new THREE.Color().setHSL(0.07, 0.55, 0.16 + depth * 0.045);

    const path = new THREE.LineCurve3(start, end);
    const geo = new THREE.TubeGeometry(path, 4, Math.max(radius, 0.25), 6, false);
    group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })));

    // --------------------------------------------------
    // FOLLAJE: diferenciado por especie
    // Roble  → canopy plana tipo hongo con bumps organicos
    // Sauce  → clusters pequenos y alargados
    // --------------------------------------------------
    if (depth === maxDepth && params.tipo !== 'muerto' && params.densidad > 0) {

      if (params.tipo === 'roble') {
        // --- CANOPY PLANA (referencia Gnarly Trees) ---
        const baseR    = (params.densidad / 10) * params.altura * 0.09 + 4;
        const matCanopy = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.30 + Math.random() * 0.05, 0.52, 0.22 + Math.random() * 0.06)
        });

        // Elipsoide principal: ancho y aplastado (ancho > alto)
        const mainGeo = new THREE.SphereGeometry(baseR, 8, 6);
        const main    = new THREE.Mesh(mainGeo, matCanopy);
        main.scale.set(1.5, 0.5, 1.5);   // muy plano y ancho
        main.position.copy(end);
        group.add(main);

        // Bumps organicos encima del canopy principal
        const numBumps = 3 + Math.floor(params.densidad / 2.5);
        for (let b = 0; b < numBumps; b++) {
          const bumpR   = baseR * (0.28 + Math.random() * 0.42);
          const angle   = (Math.PI * 2 / numBumps) * b + Math.random() * 1.0;
          const dist    = baseR * (0.25 + Math.random() * 0.60);
          const bumpMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(
              0.29 + Math.random() * 0.07,
              0.50 + Math.random() * 0.12,
              0.20 + Math.random() * 0.10
            )
          });
          const bumpGeo = new THREE.SphereGeometry(bumpR, 6, 5);
          const bump    = new THREE.Mesh(bumpGeo, bumpMat);
          bump.scale.set(1.1, 0.75, 1.1);  // levemente aplastados
          bump.position.set(
            end.x + Math.cos(angle) * dist,
            end.y + baseR * 0.18 + Math.random() * bumpR * 0.6,
            end.z + Math.sin(angle) * dist
          );
          group.add(bump);
        }

      } else {
        // --- SAUCE: clusters pequenos alargados hacia abajo ---
        const baseR    = (params.densidad / 10) * params.altura * 0.05 + 2;
        const numBlobs = 2 + Math.floor(params.densidad / 3);
        for (let b = 0; b < numBlobs; b++) {
          const r      = baseR * (0.5 + Math.random() * 0.6);
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * baseR * 1.2,
            -Math.random() * baseR * 0.8,   // caen levemente hacia abajo
            (Math.random() - 0.5) * baseR * 1.2
          );
          const lColor = new THREE.Color().setHSL(
            0.27 + (Math.random() - 0.5) * 0.05,
            0.48 + Math.random() * 0.1,
            0.25 + Math.random() * 0.08
          );
          const lGeo = new THREE.SphereGeometry(r, 5, 4);
          lGeo.scale(1.0, 1.4, 1.0);  // alargados verticalmente
          const leaf = new THREE.Mesh(lGeo, new THREE.MeshLambertMaterial({ color: lColor }));
          leaf.position.copy(end).add(offset);
          group.add(leaf);
        }
      }
      return;
    }

    // --------------------------------------------------
    // SUB-RAMAS: siempre 3 en el primer nivel para evitar
    // el look 2D que daban 2 ramas en plano XY
    // Se agrega rotacion por nivel para distribucion 3D real
    // --------------------------------------------------
    const numBranches = depth === 0 ? 3 : (Math.random() > 0.3 ? 3 : 2);
    const newLen = len * (params.tipo === 'sauce' ? 0.70 : 0.67);
    const newRad = radius * 0.62;
    const angle  = params.angulo * Math.PI / 180;

    // Offset de rotacion unico por nivel — clave para el 3D
    const rotOffset = (params.rotBase || 0) + depth * 1.1 + Math.random() * 0.5;

    for (let i = 0; i < numBranches; i++) {
      const theta = (Math.PI * 2 / numBranches) * i + rotOffset;
      let newDir;

      if (params.tipo === 'sauce' && depth >= 1) {
        // Sauce: gravedad creciente por nivel
        newDir = new THREE.Vector3(
          Math.sin(theta) * Math.sin(angle),
          dir.y * Math.cos(angle) - (0.45 + depth * 0.22),
          Math.cos(theta) * Math.sin(angle)
        ).normalize();
      } else {
        // Eje de rotacion rotado en Y para garantizar 3D
        const axis = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        newDir = dir.clone().applyAxisAngle(axis, angle);
        // Pequeno giro aleatorio en Y para mas naturalidad
        newDir.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (Math.random() - 0.5) * 0.5
        );
        newDir.normalize();
      }

      _addBranch(group, end.clone(), newDir, newLen, newRad,
        depth + 1, maxDepth, { ...params, rotBase: rotOffset });
    }
  }

  // --------------------------------------------------
  // Animacion y controles
  // --------------------------------------------------
  function _animate() {
    animFrame = requestAnimationFrame(_animate);
    _resize();
    if (autoRotate) rotY += 0.006;
    if (treeGroup) {
      treeGroup.rotation.y = rotY;
      treeGroup.rotation.x = rotX;
    }
    renderer.render(scene, camera);
  }

  function _resize() {
    const canvas = renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function _bindMouse(canvas) {
    canvas.addEventListener('mousedown', e => { isDragging = true; autoRotate = false; lastX = e.clientX; });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    });
    canvas.addEventListener('wheel', e => {
      camera.position.z = Math.max(80, Math.min(500, camera.position.z + e.deltaY * 0.3));
    });
    canvas.addEventListener('touchstart', e => { isDragging = true; autoRotate = false; lastX = e.touches[0].clientX; });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotY += (e.touches[0].clientX - lastX) * 0.012;
      lastX = e.touches[0].clientX;
    });
  }

  function _bindResize() { window.addEventListener('resize', _resize); }

  return { init, drawTree };
})();
