// js/trees/roble.js — v4.4
// Cambios:
//   - Ramas laterales en PARES opuestos (una por cada lado) a lo largo del tronco
//   - Copa arranca con bifurcación en 4 desde el apex del tronco
//   - Pares de ramas cubren todo el tronco de abajo a arriba
//   - Subdivisión más agresiva para copa densa

window.Tree_roble = (() => {

  let _leafCache = {};

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // --------------------------------------------------
  // Segmento de corteza
  // --------------------------------------------------
  function _barkSeg(p0, p1, r0, r1, rng) {
    const vec = p1.clone().sub(p0), len = vec.length();
    if (len < 0.01) return null;
    const geo = new THREE.CylinderGeometry(
      Math.max(r1, 0.06), Math.max(r0, 0.06),
      len, r0 > 1.5 ? 9 : 6, 3
    );
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y   = pos.getY(i);
      const t   = y / len + 0.5;
      const ang = Math.atan2(pos.getZ(i), pos.getX(i));
      const bump = Math.sin(ang * 5.1 + t * 8.3)  * 0.045
                 + Math.cos(ang * 3.7 + t * 12.1)  * 0.028
                 + Math.sin(ang * 9.3 + t * 4.8)   * 0.012;
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      pos.setXYZ(i, Math.cos(ang) * r * (1 + bump), y, Math.sin(ang) * r * (1 + bump));
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.066, 0.42, 0.20 + rng() * 0.06),
      flatShading: true,
    }));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.clone().normalize());
    mesh.position.copy(p0.clone().lerp(p1, 0.5));
    return mesh;
  }

  // --------------------------------------------------
  // Tronco con ensanchamiento gradual en la base
  // --------------------------------------------------
  function _buildTrunk(group, totalH, baseR, rng) {
    const nSegs = 8;
    const pts   = [];
    for (let i = 0; i <= nSegs; i++) pts.push(new THREE.Vector3(0, totalH * i / nSegs, 0));
    for (let i = 0; i < nSegs; i++) {
      const t0     = i / nSegs;
      const t1     = (i + 1) / nSegs;
      const flare0 = 1.0 + Math.pow(1 - t0, 2.5) * 0.55;
      const flare1 = 1.0 + Math.pow(1 - t1, 2.5) * 0.55;
      const m = _barkSeg(pts[i], pts[i + 1], baseR * flare0, baseR * flare1, rng);
      if (m) group.add(m);
    }
    return pts[pts.length - 1].clone();
  }

  // --------------------------------------------------
  // Tronco curvado modo natural
  // --------------------------------------------------
  function _curvedTrunk(group, totalH, baseR, rng) {
    const nSegs = 12;
    const pts   = [new THREE.Vector3()];
    let cur = new THREE.Vector3(), cd = new THREE.Vector3(0, 1, 0);
    const segH = totalH / nSegs;
    for (let i = 0; i < nSegs; i++) {
      const ax = new THREE.Vector3((rng() - .5) * 2, 0, (rng() - .5) * 2).normalize();
      cd.applyAxisAngle(ax, Math.sin((i + 1) / nSegs * Math.PI) * 0.060).normalize();
      cur = cur.clone().addScaledVector(cd, segH);
      pts.push(cur.clone());
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const t0     = i / (pts.length - 1);
      const t1     = (i + 1) / (pts.length - 1);
      const flare0 = 1.0 + Math.pow(1 - t0, 2.5) * 0.55;
      const flare1 = 1.0 + Math.pow(1 - t1, 2.5) * 0.55;
      const m = _barkSeg(pts[i], pts[i + 1], baseR * flare0, baseR * flare1, rng);
      if (m) group.add(m);
    }
    return { pos: pts[pts.length - 1].clone(), dir: cd.clone() };
  }

  // --------------------------------------------------
  // Hoja lobulada
  // --------------------------------------------------
  function _getLeafGeo(size) {
    if (_leafCache[size]) return _leafCache[size];
    const sz    = size === 'mid' ? 2.6 : 1.9;
    const w     = sz * 0.44, h = sz, embed = sz * 0.28;
    const shape = new THREE.Shape();
    shape.moveTo(0, -embed);
    shape.lineTo(-w * 0.22, 0);
    shape.quadraticCurveTo(-w * 1.00, h * 0.18, -w * 0.88, h * 0.30);
    shape.quadraticCurveTo(-w * 1.18, h * 0.40, -w * 0.78, h * 0.48);
    shape.quadraticCurveTo(-w * 1.05, h * 0.58, -w * 0.70, h * 0.65);
    shape.quadraticCurveTo(-w * 0.90, h * 0.76, -w * 0.55, h * 0.82);
    shape.quadraticCurveTo(-w * 0.38, h * 0.93,  0,         h       );
    shape.quadraticCurveTo( w * 0.38, h * 0.93,  w * 0.55,  h * 0.82);
    shape.quadraticCurveTo( w * 0.90, h * 0.76,  w * 0.70,  h * 0.65);
    shape.quadraticCurveTo( w * 1.05, h * 0.58,  w * 0.78,  h * 0.48);
    shape.quadraticCurveTo( w * 1.18, h * 0.40,  w * 0.88,  h * 0.30);
    shape.quadraticCurveTo( w * 1.00, h * 0.18,  w * 0.22,  0       );
    shape.lineTo(0, -embed);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: sz * 0.06, bevelEnabled: false });
    geo.computeBoundingBox();
    geo.translate(
      -((geo.boundingBox.max.x + geo.boundingBox.min.x) / 2), 0,
      -((geo.boundingBox.max.z + geo.boundingBox.min.z) / 2)
    );
    geo.computeVertexNormals();
    _leafCache[size] = geo;
    return geo;
  }

  function _placeLeaves(group, tip, dir, n, rng, size, inclinacion = 0.12) {
    const geo = _getLeafGeo(size);
    let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (perp.length() < 0.001) perp = new THREE.Vector3(1, 0, 0);
    perp.normalize();
    const step = Math.PI * 2 / n, base = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const rotPerp = perp.clone().applyAxisAngle(dir, base + step * i);
      const leafDir = dir.clone()
        .multiplyScalar(0.30).addScaledVector(rotPerp, 0.85)
        .add(new THREE.Vector3(0, inclinacion + rng() * 0.10, 0)).normalize();
      const leaf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.26 + rng() * 0.07, 0.52 + rng() * 0.18, 0.19 + rng() * 0.13),
        side: THREE.DoubleSide,
      }));
      leaf.position.copy(tip);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
      leaf.rotateOnAxis(new THREE.Vector3(0, 1, 0), (rng() - 0.5) * 0.50);
      leaf.scale.setScalar(0.75 + rng() * 0.50);
      group.add(leaf);
    }
  }

  function _foliageAlongBranch(group, p0, p1, dir, rng, densidad) {
    // Más clusters, repartidos desde casi el inicio de la rama
    const n = 3 + Math.floor(densidad * 0.7);
    for (let k = 0; k < n; k++) {
      // Cobertura del 10% al 98% de la rama → cubre los huecos interiores
      const t   = 0.10 + (k / n) * 0.88;
      const pos = p0.clone().lerp(p1, t);
      // Offset perpendicular para dar volumen a la masa de follaje
      pos.x += (rng() - 0.5) * 2.2;
      pos.y += (rng() - 0.5) * 1.5;
      pos.z += (rng() - 0.5) * 2.2;
      _placeLeaves(group, pos, dir, 3 + Math.floor(rng() * 3), rng, 'tip', 0.05 + rng() * 0.14);
    }
  }

  // --------------------------------------------------
  // Rama recursiva genérica (para la copa)
  // --------------------------------------------------
  function _branch(g, p0, dir, len, radius, depth, maxDepth, rng, params) {
    if (len < 1.2 || radius < 0.06) return;

    const actualLen = len * (0.68 + rng() * 0.24);
    const p1 = p0.clone().addScaledVector(dir, actualLen);
    const m  = _barkSeg(p0, p1, radius, radius * 0.55, rng);
    if (m) g.add(m);

    // Follaje a lo largo de la rama: desde depth 1, casi siempre
    if (params.hojas && depth >= 1 && actualLen > 2.5 && rng() > 0.12) {
      _foliageAlongBranch(g, p0, p1, dir, rng, params.densidad);
    }

    if (depth >= maxDepth) {
      if (params.hojas) _placeLeaves(g, p1, dir, 6 + Math.floor(rng() * 5), rng, 'tip', 0.10);
      return;
    }

    // Hojas sueltas en ramas intermedias — cubre los huecos interiores
    if (depth >= 2 && params.hojas && rng() > 0.30) {
      _placeLeaves(g, p1, dir, 3 + Math.floor(rng() * 3), rng, 'tip', 0.08);
    }

    // Subdivisión siempre en 3
    // Ángulos MÁS ABIERTOS → los hijos se separan lateralmente (X/Z),
    // no se apilan en el eje Y. El padre conserva su dirección general
    // pero los hijos abren en abanico ancho.
    const nSub     = 3;
    const splitAng = depth === 0 ? 0.85 + rng() * 0.25
                   : depth === 1 ? 0.78 + rng() * 0.22
                   : depth === 2 ? 0.68 + rng() * 0.20
                   :               0.58 + rng() * 0.18;
    const rotBase  = rng() * Math.PI * 2;

    for (let i = 0; i < nSub; i++) {
      // Reparto azimutal equidistante (120°) + ruido moderado
      const theta    = (Math.PI * 2 / nSub) * i + rotBase + (rng() - 0.5) * 0.55;
      const ax       = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const childDir = dir.clone().applyAxisAngle(ax, splitAng).normalize();
      // Sin sesgo ascendente fuerte: solo un toque mínimo y aleatorio
      // para que las ramas no se apilen verticalmente
      childDir.y    += (rng() - 0.4) * 0.10;
      childDir.normalize();
      _branch(g, p1.clone(), childDir,
        len * (depth <= 2 ? 0.52 : 0.46),
        radius * 0.56, depth + 1, maxDepth, rng, params);
    }
  }

  // --------------------------------------------------
  // generate
  // --------------------------------------------------
  function generate(params) {
    _leafCache = {};
    const group = new THREE.Group();
    const seed  = 42 + params.altura * 3 + params.tronco * 17 + params.ramas * 7;
    const rng   = _rng(seed);

    const TRUNK_H = params.altura * 0.85;
    const BASE_R  = params.tronco * 0.5;
    const maxD    = Math.max(params.ramas, 4);

    let apexPos, apexDir = new THREE.Vector3(0, 1, 0);

    if (params.trunco_tipo === 'natural') {
      const res = _curvedTrunk(group, TRUNK_H, BASE_R, rng);
      apexPos = res.pos; apexDir = res.dir;
    } else {
      apexPos = _buildTrunk(group, TRUNK_H, BASE_R, rng);
    }

    // -----------------------------------------------
    // RAMAS LATERALES a lo largo del tronco
    // - Tercio inferior limpio (sin ramas)
    // - Más niveles de inserción (11–13) sin más subdivisión recursiva
    // - Cada rama sale del tronco con un "codo": un primer tramo casi
    //   horizontal o con leve caída, luego continúa abriéndose
    // - Rotación de 90° entre niveles consecutivos → cada nivel queda
    //   en cruz respecto al anterior, sin alinearse
    // -----------------------------------------------
    const nNiveles  = 11 + Math.floor(rng() * 3); // 11–13 niveles de inserción
    let levelAngle  = rng() * Math.PI * 2;

    for (let i = 0; i < nNiveles; i++) {
      // tL: 0.0 → 1.0 a lo largo del tronco
      const tL = i / (nNiveles - 1);

      // Tercio inferior limpio → tronco visible
      if (tL < 0.38) { rng(); rng(); rng(); continue; }

      const pL     = new THREE.Vector3(0, TRUNK_H * tL, 0);
      const trunkR = BASE_R * (1.0 + Math.pow(1 - tL, 2.5) * 0.55);

      // Rotación de 90° entre niveles consecutivos (+ ruido leve)
      // El nivel siguiente queda perpendicular al anterior
      levelAngle += Math.PI / 2 + (rng() - 0.5) * 0.20;

      const lenFactor = 0.20 + Math.sin(tL * Math.PI) * 0.14 + rng() * 0.06;
      const ramLen    = TRUNK_H * lenFactor;
      const ramRad    = trunkR * (0.28 + rng() * 0.10);

      // 2 o 3 ramas por nivel
      const nRamas = rng() > 0.45 ? 3 : 2;

      for (let k = 0; k < nRamas; k++) {
        const theta = levelAngle + (Math.PI * 2 / nRamas) * k + (rng() - 0.5) * 0.40;
        const ax    = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));

        // --- TRAMO 1: salida del tronco ---
        // Sale casi horizontal (1.25–1.45 rad ≈ 72–83° desde la vertical)
        // a veces con leve caída por debajo de la horizontal
        const salidaAng = 1.25 + rng() * 0.20;
        const salidaDir = apexDir.clone().applyAxisAngle(ax, salidaAng).normalize();
        // Leve caída: la rama baja un poco al salir (peso propio)
        salidaDir.y -= 0.05 + rng() * 0.12;
        salidaDir.normalize();

        // Codo: longitud corta del primer tramo (18–28% del total)
        const codoLen = ramLen * (0.18 + rng() * 0.10);
        const codoEnd = pL.clone().addScaledVector(salidaDir, codoLen);
        const mCodo   = _barkSeg(pL, codoEnd, ramRad, ramRad * 0.78, rng);
        if (mCodo) group.add(mCodo);

        // --- TRAMO 2: la rama se abre más horizontal y sube levemente ---
        const aperturaDir = salidaDir.clone();
        aperturaDir.y += 0.18 + rng() * 0.14;
        aperturaDir.normalize();

        _branch(group, codoEnd, aperturaDir,
          ramLen * 0.82, ramRad * 0.78,
          1, maxD - 1, rng, params);
      }
    }

    // -----------------------------------------------
    // COPA PRINCIPAL: bifurcación en 3 desde el apex
    // Tres ramas que forman la copa superior — más cortas y verticales
    // para que no sobresalgan del contorno general del árbol
    // -----------------------------------------------
    const copaR    = BASE_R * 0.58;
    const copaLen  = TRUNK_H * 0.22;
    const copaBase = rng() * Math.PI * 2;

    for (let i = 0; i < 3; i++) {
      const theta   = copaBase + (Math.PI * 2 / 3) * i + (rng() - 0.5) * 0.20;
      const ax      = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      // Ángulo más cerrado → la copa sube más que abrirse hacia los lados
      const openAng = 0.50 + rng() * 0.16; // ~29–38° desde vertical
      const copaDir = apexDir.clone().applyAxisAngle(ax, openAng).normalize();
      copaDir.y    += 0.12 + rng() * 0.06;
      copaDir.normalize();

      // Un nivel menos de recursión → copa más compacta
      _branch(group, apexPos, copaDir, copaLen, copaR, 0, maxD - 1, rng, params);
    }

    return group;
  }

  return { generate };
})();
