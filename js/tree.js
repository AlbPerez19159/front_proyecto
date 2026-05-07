// tree.js — Generacion del arbol 3D con Three.js
// v2.1 — Cambios:
//   - sauce reemplazado por eucalipto (Eucalyptus globulus)
//   - tipo de tronco: recto (cultivado) | natural (curvado, en libertad)
//     aplica solo para roble y eucalipto
//   - acículas de pino, foliolos de palmera y follaje de araucaria con
//     volumen real (antes parecian tubos)

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

  // ==================================================
  // PINO (Pinus radiata)
  // Acículas con VOLUMEN: cada sub-rama termina en un
  // cluster ovoidal verde + cluster intermedio
  // ==================================================
  function _drawPino(group, params) {
    const h = params.altura;
    const niveles = Math.max(params.ramas, 4);
    const angRama = 35 * Math.PI / 180;
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x6b4423 });

    // Tronco alto y recto
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.15, params.tronco * 0.65, h, 8
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h / 2;
    group.add(trunk);

    // Verticilos de ramas
    const ramasPorNivel = 5;
    for (let i = 0; i < niveles; i++) {
      const t = i / (niveles - 1);
      const y = h * 0.2 + t * h * 0.72;
      const longRama = h * 0.32 * (1 - t * 0.65) * (params.densidad / 10 + 0.4);
      const radioRama = Math.max(params.tronco * 0.07, 0.3);
      const colorRama = new THREE.Color().setHSL(0.07, 0.4, 0.20 + t * 0.04);
      const colorAcicula = new THREE.Color().setHSL(0.32, 0.55, 0.18 + t * 0.05);

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

        // Rama leñosa
        const path = new THREE.LineCurve3(start, end);
        const geo = new THREE.TubeGeometry(path, 3, radioRama, 5, false);
        group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colorRama })));

        // === ACÍCULAS CON VOLUMEN ===
        if (params.densidad > 0 && longRama > 4) {
          // Cluster grande en la punta
          const tipR = Math.max(longRama * 0.16, 1.2) * (params.densidad / 10 + 0.5);
          const tipGeo = new THREE.SphereGeometry(tipR, 6, 5);
          tipGeo.scale(0.85, 1.3, 0.85);
          const tipMesh = new THREE.Mesh(tipGeo,
            new THREE.MeshLambertMaterial({ color: colorAcicula }));
          tipMesh.position.copy(end);
          group.add(tipMesh);

          // Sub-clusters a lo largo de la rama (3 puntos)
          if (params.densidad > 2) {
            const numSubClusters = Math.min(3, Math.floor(params.densidad / 2));
            for (let k = 0; k < numSubClusters; k++) {
              const tCluster = 0.45 + k * 0.20;
              const cPos = start.clone().lerp(end, tCluster);
              // Ovoid lateral (apartado de la rama)
              const lateralTheta = theta + (k - 1) * 0.7;
              cPos.x += Math.cos(lateralTheta) * tipR * 0.5;
              cPos.z += Math.sin(lateralTheta) * tipR * 0.5;
              cPos.y += tipR * 0.2;

              const cR = tipR * (0.55 + Math.random() * 0.3);
              const cGeo = new THREE.SphereGeometry(cR, 5, 4);
              cGeo.scale(0.9, 1.15, 0.9);
              const c = new THREE.Mesh(cGeo,
                new THREE.MeshLambertMaterial({
                  color: new THREE.Color().setHSL(0.32, 0.6, 0.16 + Math.random() * 0.06)
                }));
              c.position.copy(cPos);
              group.add(c);
            }
          }
        }
      }
    }

    // Apice cónico
    const apexH = h * 0.14;
    const apexGeo = new THREE.ConeGeometry(h * 0.05, apexH, 6);
    const apex = new THREE.Mesh(apexGeo,
      new THREE.MeshLambertMaterial({ color: 0x2a4018 }));
    apex.position.y = h + apexH / 2;
    group.add(apex);
  }

  // ==================================================
  // PALMERA (Cocos nucifera)
  // Hojas pinnadas con FOLIOLOS reales perpendiculares
  // al raquis (antes parecian un solo tubo curvo)
  // ==================================================
  function _drawPalmera(group, params) {
    const h = params.altura;
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x9e7a3a });

    // Tronco unico
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.22, params.tronco * 0.55, h * 0.88, 9
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h * 0.44;
    group.add(trunk);

    // Anillos del tronco
    const numAnillos = 8;
    for (let i = 0; i < numAnillos; i++) {
      const t = (i + 1) / (numAnillos + 1);
      const ringGeo = new THREE.TorusGeometry(
        params.tronco * 0.34, params.tronco * 0.055, 4, 9
      );
      const ring = new THREE.Mesh(ringGeo,
        new THREE.MeshLambertMaterial({ color: 0x7a5c28 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.88 * t;
      group.add(ring);
    }

    // Corona
    const numHojas = Math.max(10, Math.round(params.densidad * 1.2 + 8));
    const coronaY = h * 0.88;
    const longHoja = h * 0.42;
    const matHoja    = new THREE.MeshLambertMaterial({ color: 0x3a6b28 });
    const matHojaOsc = new THREE.MeshLambertMaterial({ color: 0x2d5520 });
    const matRaquis  = new THREE.MeshLambertMaterial({ color: 0x5e4a1e });

    for (let i = 0; i < numHojas; i++) {
      const theta = (Math.PI * 2 / numHojas) * i;

      // Curva del raquis: sale, sube, cuelga
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

      // Raquis (delgado, color marron-verde)
      const raquisGeo = new THREE.TubeGeometry(curve, 10,
        Math.max(params.tronco * 0.025, 0.25), 4, false);
      group.add(new THREE.Mesh(raquisGeo, matRaquis));

      // === FOLIOLOS perpendiculares al raquis ===
      const numFoliolos = 14;
      for (let s = 1; s < numFoliolos; s++) {
        const tF = s / numFoliolos;
        const center = curve.getPoint(tF);

        // Tangente al raquis
        const next = curve.getPoint(Math.min(tF + 0.04, 1));
        const tangent = next.clone().sub(center).normalize();

        // Perpendicular horizontal al tangente
        const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);
        if (perp.length() < 0.001) perp.set(1, 0, 0);
        perp.normalize();

        // Tamano: campana — más largo en el medio
        const tBell = Math.sin(tF * Math.PI);
        const folLen = longHoja * 0.20 * tBell;
        if (folLen < 1) continue;

        // Dos foliolos por cada lado del raquis
        [perp.clone(), perp.clone().negate()].forEach(p => {
          const folMat = (i + s) % 4 === 0 ? matHojaOsc : matHoja;
          const folGeo = new THREE.SphereGeometry(folLen * 0.5, 4, 3);
          folGeo.scale(1.0, 0.18, 0.30);  // largo, plano, ancho mediano

          const fol = new THREE.Mesh(folGeo, folMat);
          // Posicion: centrado a media altura del foliolo
          fol.position.copy(center).addScaledVector(p, folLen * 0.5);
          // Rotacion: alinear el eje X largo con el vector p
          fol.rotation.y = -Math.atan2(p.z, p.x);
          // Inclinar foliolo levemente hacia abajo (cuelga)
          fol.rotation.z = -0.15;
          group.add(fol);
        });
      }
    }
  }

  // ==================================================
  // ARAUCARIA (Araucaria araucana)
  // Sub-ramas con FOLLAJE volumetrico (antes tubos)
  // ==================================================
  function _drawAraucaria(group, params) {
    const h = params.altura;
    const niveles = Math.max(params.ramas, 5);
    const matTronco = new THREE.MeshLambertMaterial({ color: 0x4a3018 });

    // Tronco grueso y limpio
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.3, params.tronco * 0.75, h, 9
    );
    const trunk = new THREE.Mesh(tGeo, matTronco);
    trunk.position.y = h / 2;
    group.add(trunk);

    // Copa solo en tercio superior — perfil de paraguas
    const coronaBase = h * 0.60;
    const coronaAltura = h * 0.40;
    const ramasPorNivel = 6;

    for (let i = 0; i < niveles; i++) {
      const t = i / (niveles - 1);
      const y = coronaBase + t * coronaAltura;
      const tCampana = Math.sin(t * Math.PI);
      const longRama = h * 0.38 * tCampana * (params.densidad / 10 + 0.5);
      if (longRama < 2) continue;

      const radioRama = Math.max(params.tronco * 0.09, 0.4);
      const colorRama   = new THREE.Color().setHSL(0.07, 0.35, 0.18 + t * 0.04);
      const colorFollaje = new THREE.Color().setHSL(0.31, 0.65, 0.18 + t * 0.04);

      for (let j = 0; j < ramasPorNivel; j++) {
        const theta = (Math.PI * 2 / ramasPorNivel) * j +
                      (Math.PI / ramasPorNivel) * (i % 2);
        const dx = Math.cos(theta);
        const dz = Math.sin(theta);

        // Rama principal (curva Bezier)
        const p0 = new THREE.Vector3(0, y, 0);
        const p1 = new THREE.Vector3(dx * longRama * 0.55, y + longRama * 0.05, dz * longRama * 0.55);
        const p2 = new THREE.Vector3(dx * longRama, y + longRama * 0.18, dz * longRama);

        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
        const pts = curve.getPoints(6);
        const path = new THREE.CatmullRomCurve3(pts);
        const branchGeo = new THREE.TubeGeometry(path, 5, radioRama, 5, false);
        group.add(new THREE.Mesh(branchGeo,
          new THREE.MeshLambertMaterial({ color: colorRama })));

        // === FOLLAJE: clusters ovoidales a lo largo de la rama ===
        if (params.densidad > 1 && longRama > 6) {
          const numClusters = 3 + Math.floor(params.densidad / 3);
          for (let k = 1; k <= numClusters; k++) {
            const tC = k / (numClusters + 1);
            const center = curve.getPoint(tC);
            const next = curve.getPoint(Math.min(tC + 0.05, 1));
            const tangent = next.clone().sub(center).normalize();

            const clRad = longRama * (0.14 - tC * 0.04);
            const clGeo = new THREE.SphereGeometry(clRad, 6, 5);
            // Alargar en la dirección de la rama
            clGeo.scale(0.85, 0.7, 1.4);

            const cl = new THREE.Mesh(clGeo,
              new THREE.MeshLambertMaterial({ color: colorFollaje }));
            cl.position.copy(center);
            // Orientar en dirección de la rama
            cl.rotation.y = -Math.atan2(tangent.z, tangent.x) - Math.PI / 2;

            group.add(cl);

            // Pequenos puffs alrededor para mas volumen
            if (params.densidad > 4) {
              for (let m = 0; m < 2; m++) {
                const off = new THREE.Vector3(
                  (Math.random() - 0.5) * clRad,
                  (Math.random() - 0.3) * clRad,
                  (Math.random() - 0.5) * clRad
                );
                const pGeo = new THREE.SphereGeometry(clRad * 0.55, 4, 3);
                const p = new THREE.Mesh(pGeo,
                  new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setHSL(0.30, 0.6, 0.16 + Math.random() * 0.06)
                  }));
                p.position.copy(center).add(off);
                group.add(p);
              }
            }
          }
        }
      }
    }
  }

  // ==================================================
  // FRONDOSOS: Roble, Eucalipto, Muerto
  // Eucalipto reemplaza al sauce
  // Tronco curvado opcional (roble y eucalipto)
  // ==================================================
  function _drawFrondoso(group, params) {
    const angulosEspecie = {
      roble:     62,   // copa amplia
      eucalipto: 48,   // ramas oblicuas hacia arriba
      muerto:    35,
    };
    const angulo = angulosEspecie[params.tipo] ?? 30;
    const rotBase = Math.random() * Math.PI * 2;
    const trunkLen = params.altura * 0.42;
    const trunkRad = params.tronco * 0.5;

    const usarCurvo = params.trunco_tipo === 'natural' &&
                      (params.tipo === 'roble' || params.tipo === 'eucalipto');

    let apexPos, apexDir;

    if (usarCurvo) {
      const r = _drawCurvedTrunk(group, params, trunkLen, trunkRad);
      apexPos = r.pos;
      apexDir = r.dir;
    } else {
      // Tronco recto
      apexPos = new THREE.Vector3(0, trunkLen, 0);
      apexDir = new THREE.Vector3(0, 1, 0);
      const start = new THREE.Vector3(0, 0, 0);
      const path = new THREE.LineCurve3(start, apexPos);
      const geo = new THREE.TubeGeometry(path, 4, Math.max(trunkRad, 0.25), 6, false);
      group.add(new THREE.Mesh(geo,
        new THREE.MeshLambertMaterial({ color: _trunkColor(params, 0) })));
    }

    // Generar primeras sub-ramas desde el apice
    const numBranches = 3;
    const newLen = trunkLen * (params.tipo === 'eucalipto' ? 0.72 : 0.67);
    const newRad = trunkRad * 0.62;
    const ang = angulo * Math.PI / 180;

    for (let i = 0; i < numBranches; i++) {
      const theta = (Math.PI * 2 / numBranches) * i + rotBase;
      const axis = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const newDir = apexDir.clone().applyAxisAngle(axis, ang);
      newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0),
        (Math.random() - 0.5) * 0.5).normalize();

      _addBranch(group, apexPos.clone(), newDir, newLen, newRad,
        1, params.ramas, { ...params, angulo, rotBase: rotBase + Math.random() * 0.5 });
    }
  }

  // Tronco curvado: serie de puntos con deflexion suave + TubeGeometry
  function _drawCurvedTrunk(group, params, totalLen, baseRad) {
    const numSegs = 10;
    const points = [new THREE.Vector3(0, 0, 0)];
    let curPos = new THREE.Vector3(0, 0, 0);
    let curDir = new THREE.Vector3(0, 1, 0);

    const segLen = totalLen / numSegs;
    for (let i = 1; i <= numSegs; i++) {
      // Deflexion mayor al medio del tronco, menor en base y punta
      const tFactor = Math.sin((i / numSegs) * Math.PI);
      const deflection = 0.07 * tFactor;

      const axis = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      );
      if (axis.length() > 0.001) {
        axis.normalize();
        curDir.applyAxisAngle(axis, deflection).normalize();
      }

      curPos = curPos.clone().addScaledVector(curDir, segLen);
      points.push(curPos.clone());
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 24, baseRad, 8, false);
    group.add(new THREE.Mesh(geo,
      new THREE.MeshLambertMaterial({ color: _trunkColor(params, 0) })));

    return {
      pos: points[points.length - 1].clone(),
      dir: curDir.clone(),
    };
  }

  function _trunkColor(params, depth) {
    if (params.tipo === 'muerto') {
      return new THREE.Color().setHSL(0.08, 0.12, 0.38 + depth * 0.03);
    }
    if (params.tipo === 'eucalipto') {
      // Corteza clara, ligeramente rosada (descascarada)
      return new THREE.Color().setHSL(0.06, 0.18, 0.45 + depth * 0.04);
    }
    return new THREE.Color().setHSL(0.07, 0.55, 0.16 + depth * 0.045);
  }

  // ==================================================
  // _addBranch: rama recursiva
  // depth=0 es ahora SIEMPRE manejado por _drawFrondoso
  // (esta funcion empieza en depth=1)
  // ==================================================
  function _addBranch(group, start, dir, len, radius, depth, maxDepth, params) {
    if (depth > maxDepth || len < 1.5) return;

    const actualLen = len * (0.88 + Math.random() * 0.24);
    const end = start.clone().addScaledVector(dir, actualLen);

    // Rama leñosa
    const color = _trunkColor(params, depth);
    const path = new THREE.LineCurve3(start, end);
    const geo = new THREE.TubeGeometry(path, 4, Math.max(radius, 0.25), 6, false);
    group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })));

    // === FOLLAJE en las puntas ===
    if (depth === maxDepth && params.tipo !== 'muerto' && params.densidad > 0) {

      if (params.tipo === 'roble') {
        // Canopy plana tipo hongo (Gnarly Trees)
        const baseR = (params.densidad / 10) * params.altura * 0.09 + 4;
        const matCanopy = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.30 + Math.random() * 0.05, 0.52, 0.22 + Math.random() * 0.06)
        });

        const mainGeo = new THREE.SphereGeometry(baseR, 8, 6);
        const main = new THREE.Mesh(mainGeo, matCanopy);
        main.scale.set(1.5, 0.5, 1.5);
        main.position.copy(end);
        group.add(main);

        const numBumps = 3 + Math.floor(params.densidad / 2.5);
        for (let b = 0; b < numBumps; b++) {
          const bumpR = baseR * (0.28 + Math.random() * 0.42);
          const angle = (Math.PI * 2 / numBumps) * b + Math.random() * 1.0;
          const dist = baseR * (0.25 + Math.random() * 0.60);
          const bumpMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(
              0.29 + Math.random() * 0.07,
              0.50 + Math.random() * 0.12,
              0.20 + Math.random() * 0.10
            )
          });
          const bumpGeo = new THREE.SphereGeometry(bumpR, 6, 5);
          const bump = new THREE.Mesh(bumpGeo, bumpMat);
          bump.scale.set(1.1, 0.75, 1.1);
          bump.position.set(
            end.x + Math.cos(angle) * dist,
            end.y + baseR * 0.18 + Math.random() * bumpR * 0.6,
            end.z + Math.sin(angle) * dist
          );
          group.add(bump);
        }

      } else if (params.tipo === 'eucalipto') {
        // Eucalipto: clusters elongados gris-verde, dispersos
        // (ramas oblicuas hacia arriba, copa abierta y vertical)
        const baseR = (params.densidad / 10) * params.altura * 0.07 + 3;
        const numBlobs = 3 + Math.floor(params.densidad / 2);

        for (let b = 0; b < numBlobs; b++) {
          const r = baseR * (0.6 + Math.random() * 0.5);
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * baseR * 1.6,
            Math.random() * baseR * 0.6 - baseR * 0.1,
            (Math.random() - 0.5) * baseR * 1.6
          );
          const lColor = new THREE.Color().setHSL(
            0.27 + (Math.random() - 0.5) * 0.04,
            0.30 + Math.random() * 0.15,   // saturacion baja → grisaceo
            0.32 + Math.random() * 0.10    // luminancia alta → tono claro
          );
          const lGeo = new THREE.SphereGeometry(r, 6, 5);
          lGeo.scale(0.85, 1.4, 0.85);  // alargados verticalmente
          const leaf = new THREE.Mesh(lGeo, new THREE.MeshLambertMaterial({ color: lColor }));
          leaf.position.copy(end).add(offset);
          group.add(leaf);
        }
      }
      return;
    }

    // === SUB-RAMAS ===
    const numBranches = depth === 1 ? 3 : (Math.random() > 0.3 ? 3 : 2);
    const newLen = len * (params.tipo === 'eucalipto' ? 0.72 : 0.67);
    const newRad = radius * 0.62;
    const angle = params.angulo * Math.PI / 180;
    const rotOffset = (params.rotBase || 0) + depth * 1.1 + Math.random() * 0.5;

    for (let i = 0; i < numBranches; i++) {
      const theta = (Math.PI * 2 / numBranches) * i + rotOffset;
      const axis = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const newDir = dir.clone().applyAxisAngle(axis, angle);
      newDir.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (Math.random() - 0.5) * 0.5
      ).normalize();

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
