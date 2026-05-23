// js/trees/eucalipto.js — Generador del Eucalipto (Eucalyptus globulus)
// v2.3 — Ramas con ángulo más abierto (~35-45°) + iteración extra de sub-ramas

window.Tree_eucalipto = (() => {

  function _trunkColor(t) {
    return new THREE.Color().setHSL(0.07, 0.42, 0.36 + t * 0.14);
  }

  let _sharedLeafGeo = null;
  function _getLeafGeo() {
    if (_sharedLeafGeo) return _sharedLeafGeo;
    const shape = new THREE.Shape();
    const len = 5.0, w = 1.0;
    shape.moveTo(0, 0);
    shape.quadraticCurveTo( w, len * 0.40, 0, len);
    shape.quadraticCurveTo(-w, len * 0.40, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 4);
    geo.computeVertexNormals();
    _sharedLeafGeo = geo;
    return geo;
  }

  function _placeLeaves(group, tip, dir, count, densidad) {
    const geo = _getLeafGeo();
    const col1 = new THREE.Color().setHSL(0.29, 0.60, 0.22);
    const col2 = new THREE.Color().setHSL(0.32, 0.52, 0.30);
    const n = count + Math.floor(densidad / 3);
    const downDir = new THREE.Vector3(dir.x * 0.20, -1, dir.z * 0.20).normalize();
    let perp = new THREE.Vector3().crossVectors(downDir, new THREE.Vector3(1, 0, 0));
    if (perp.length() < 0.001) perp.set(0, 0, 1);
    perp.normalize();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i;
      const rotPerp = perp.clone().applyAxisAngle(downDir, angle);
      const leafDir = downDir.clone().addScaledVector(rotPerp, 0.50 + Math.random() * 0.25).normalize();
      const leaf = new THREE.Mesh(geo,
        new THREE.MeshLambertMaterial({ color: i % 3 === 0 ? col2 : col1, side: THREE.DoubleSide })
      );
      leaf.position.copy(tip);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
      const sc = 0.7 + Math.random() * 0.5;
      leaf.scale.set(sc, sc * (1.0 + Math.random() * 0.3), sc);
      group.add(leaf);
    }
  }

  // Nivel 3 — ramitas terminales con hojas
  function _addTwig(group, start, dir, len, radius, params) {
    const end = start.clone().addScaledVector(dir, len);
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 2, Math.max(radius, 0.12), 4, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(0.9) })
    ));
    if (params.densidad > 0) {
      _placeLeaves(group, end, dir, 3, params.densidad);
    }
  }

  // Nivel 2 — sub-ramas que salen de la rama lateral
  // Ángulo más abierto respecto a la rama madre (~35-45°)
  function _addSubBranch(group, start, dir, len, radius, params) {
    const end = start.clone().addScaledVector(dir, len);
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 2, Math.max(radius, 0.16), 5, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(0.75) })
    ));

    // 2-3 ramitas terminales por sub-rama
    const nTwigs  = 2 + Math.floor(Math.random() * 2);
    const twigLen = len * 0.55;
    const twigRad = radius * 0.50;
    const rotBase = Math.random() * Math.PI * 2;

    for (let i = 0; i < nTwigs; i++) {
      const theta = (Math.PI * 2 / nTwigs) * i + rotBase;
      const ax = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const twigDir = dir.clone()
        .applyAxisAngle(ax, (30 + Math.random() * 20) * Math.PI / 180)
        .normalize();
      twigDir.y -= 0.10; // leve caída
      twigDir.normalize();
      _addTwig(group, end.clone(), twigDir, twigLen, twigRad, params);
    }
  }

  // Nivel 1 — rama lateral que sale del tronco
  // Ángulo respecto a la vertical: 35-45° (ni horizontal ni muy vertical)
  function _addLateralBranch(group, start, dir, len, radius, params) {
    const end = start.clone().addScaledVector(dir, len);
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 3, Math.max(radius, 0.22), 5, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(0.5) })
    ));

    // 2-3 sub-ramas por rama lateral, con ángulo abierto (~40-55°)
    const nSub   = 2 + Math.floor(Math.random() * 2);
    const subLen = len * 0.60;
    const subRad = radius * 0.55;
    const rotBase = Math.random() * Math.PI * 2;

    for (let i = 0; i < nSub; i++) {
      const theta = (Math.PI * 2 / nSub) * i + rotBase;
      const ax = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      // Ángulo de apertura más generoso: 38-55°
      const openAng = (38 + Math.random() * 17) * Math.PI / 180;
      const subDir = dir.clone()
        .applyAxisAngle(ax, openAng)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.3)
        .normalize();
      _addSubBranch(group, end.clone(), subDir, subLen, subRad, params);
    }
  }

  // -------------------------------------------------------
  // generate
  // -------------------------------------------------------
  function generate(params) {
    _sharedLeafGeo = null;
    const group    = new THREE.Group();
    const h        = params.altura;
    const trunkRad = params.tronco * 0.5;
    const trunkH   = h * 0.75;

    let apexPos, apexDir;

    // === TRONCO ===
    if (params.trunco_tipo === 'natural') {
      const pts = [new THREE.Vector3()];
      let cur = new THREE.Vector3(), cd = new THREE.Vector3(0, 1, 0);
      const segLen = trunkH / 12;
      for (let i = 1; i <= 12; i++) {
        const ax = new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2);
        if (ax.length() > 0.001)
          cd.applyAxisAngle(ax.normalize(), 0.05 * Math.sin(i/12*Math.PI)).normalize();
        cur = cur.clone().addScaledVector(cd, segLen);
        pts.push(cur.clone());
      }
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, trunkRad, 9, false),
        new THREE.MeshLambertMaterial({ color: _trunkColor(0) })
      ));
      apexPos = pts[pts.length - 1].clone();
      apexDir = cd.clone().normalize();

    } else {
      apexPos = new THREE.Vector3(0, trunkH, 0);
      apexDir = new THREE.Vector3(0, 1, 0);
      const trunkMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkRad * 0.55, trunkRad, trunkH, 9, 1),
        new THREE.MeshLambertMaterial({ color: _trunkColor(0) })
      );
      trunkMesh.position.y = trunkH / 2;
      group.add(trunkMesh);
    }

    // === COPA CILÍNDRICA ===
    const copaStart = trunkH;
    const copaZone  = h - trunkH;   // = h * 0.25

    // Tronco principal continúa subiendo por el centro de la copa
    const topMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRad * 0.18, trunkRad * 0.55, copaZone, 7, 1),
      new THREE.MeshLambertMaterial({ color: _trunkColor(0.4) })
    );
    topMesh.position.y = copaStart + copaZone / 2;
    group.add(topMesh);

    // Niveles de ramas en la copa
    const nNiveles   = Math.max(params.ramas, 4);
    const ramsPorNivel = 3;
    // Longitud rama: suficiente para abarcar espacio pero mantener silueta estrecha
    const ramLen = h * 0.14 * (params.densidad / 10 + 0.5);
    const ramRad = trunkRad * 0.38;

    for (let n = 0; n < nNiveles; n++) {
      const t = n / (nNiveles - 1);
      const y = copaStart + t * copaZone * 0.90;
      const origen = new THREE.Vector3(0, y, 0);
      const rotOffset = (n * Math.PI) / ramsPorNivel + Math.random() * 0.25;

      for (let j = 0; j < ramsPorNivel; j++) {
        const theta = (Math.PI * 2 / ramsPorNivel) * j + rotOffset;

        // Ángulo de salida respecto a la vertical: 35-45°
        // (ni horizontal ni vertical — el ángulo del dibujo)
        const upAng = (35 + Math.random() * 12) * Math.PI / 180;
        const baseDir = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
        const ramDir = new THREE.Vector3(
          baseDir.x * Math.sin(upAng + Math.PI/2 - Math.PI/2), // componente horizontal
          Math.cos(upAng),                                        // componente vertical
          baseDir.z * Math.sin(upAng + Math.PI/2 - Math.PI/2)
        );
        // Forma más limpia: partir de eje horizontal y rotar hacia arriba
        const horizontal = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
        const finalDir = horizontal.clone();
        finalDir.y = Math.tan((35 + Math.random() * 12) * Math.PI / 180);
        finalDir.normalize();

        // Longitud decrece hacia arriba (silueta cónica suave)
        const lenScale = 1.0 - t * 0.30;
        _addLateralBranch(group, origen.clone(), finalDir, ramLen * lenScale, ramRad, params);
      }
    }

    return group;
  }

  return { generate };
})();
