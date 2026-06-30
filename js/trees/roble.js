// js/trees/roble.js — v4.4
// Cambios:
//   - Ramas laterales en PARES opuestos (una por cada lado) a lo largo del tronco
//   - Copa arranca con bifurcación en 4 desde el apex del tronco
//   - Pares de ramas cubren todo el tronco de abajo a arriba
//   - Subdivisión más agresiva para copa densa

window.Tree_roble = (() => {

  let _leafCache = {};
  let _leafMeta  = {}; // por tamaño: { shape, cx, thickness } para extruir en el STL
  let _leafScale = 1;  // escala global de hoja según la altura del árbol

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

    // VISUALIZACIÓN: hoja plana 2D (ShapeGeometry, sin grosor) → más limpia
    // y liviana en pantalla. El grosor para impresión se añade SOLO al
    // exportar el STL (ver treeViewer.exportSTL), usando el shape guardado.
    const geo = new THREE.ShapeGeometry(shape);
    geo.computeBoundingBox();
    const cx = (geo.boundingBox.max.x + geo.boundingBox.min.x) / 2;
    geo.translate(-cx, 0, 0);
    geo.computeVertexNormals();
    _leafCache[size] = geo;

    // Metadatos para reconstruir la hoja CON grosor en el STL imprimible
    _leafMeta[size] = { shape, cx, thickness: Math.max(sz * 0.22, 0.55) };
    return geo;
  }

  // largo: longitud sobre la que se ESPARCEN las hojas a lo largo de la
  // ramilla. Antes todas salían del mismo punto (tip) en un anillo de 360°
  // → formaba bolas/"repollos". Ahora se escalonan a lo largo del eje y
  // apuntan más hacia afuera (abanico), dando una masa plana y frondosa.
  function _placeLeaves(group, tip, dir, n, rng, size, inclinacion = 0.12, largo = null) {
    const geo = _getLeafGeo(size);
    if (largo === null) largo = (size === 'mid' ? 5.0 : 3.5) * _leafScale;
    let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (perp.length() < 0.001) perp = new THREE.Vector3(1, 0, 0);
    perp.normalize();
    const base = rng() * Math.PI * 2;
    const meta = _leafMeta[size]; // para dar grosor en el STL
    for (let i = 0; i < n; i++) {
      // f: +0.1 → -0.8, sesgado HACIA ATRÁS (sobre la ramilla, hacia la
      // rama madre) en vez de centrado → evita hojas que sobresalen de la
      // punta y quedan "flotando" en el aire
      const f   = n > 1 ? 0.1 - (i / (n - 1)) * 0.9 : 0;
      // Ángulo áureo (≈137.5°) → reparto sin simetría de bola
      const ang = base + i * 2.39996;
      const rotPerp = perp.clone().applyAxisAngle(dir, ang);

      // Posición: escalonada a lo largo del eje + apertura lateral REDUCIDA
      // (la lateral grande era lo que despegaba las hojas de la ramilla)
      const pos = tip.clone()
        .addScaledVector(dir, f * largo)
        .addScaledVector(rotPerp, (0.15 + rng() * 0.20) * largo * 0.5);

      // Dirección de la hoja: predomina hacia AFUERA (dir), poca componente
      // radial → abanico abierto en vez de erizo cerrado
      const leafDir = dir.clone()
        .multiplyScalar(0.65).addScaledVector(rotPerp, 0.55)
        .add(new THREE.Vector3(0, inclinacion + rng() * 0.10, 0)).normalize();

      const leaf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.26 + rng() * 0.07, 0.52 + rng() * 0.18, 0.19 + rng() * 0.13),
        side: THREE.DoubleSide,
      }));
      // Marca para que el export STL la reconstruya CON grosor imprimible
      if (meta) leaf.userData.solid = meta;
      leaf.position.copy(pos);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
      leaf.rotateOnAxis(new THREE.Vector3(0, 1, 0), (rng() - 0.5) * 0.50);
      leaf.scale.setScalar((0.75 + rng() * 0.50) * _leafScale);
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
  // RAMITA SECUNDARIA: brota de una rama madre, es corta, y termina
  // con pocas hojas (a veces con una mini-bifurcación). Sustituye a las
  // hojas sueltas en las primeras iteraciones → más frondosidad real.
  // --------------------------------------------------
  function _sproutTwig(g, base, parentDir, len, radius, rng, params) {
    // Perpendicular a la rama madre, girada un ángulo aleatorio alrededor
    // de ella → la ramita sale "hacia un lado" en cualquier dirección
    let perp = new THREE.Vector3().crossVectors(parentDir, new THREE.Vector3(0, 1, 0));
    if (perp.length() < 0.001) perp.set(1, 0, 0);
    perp.normalize().applyAxisAngle(parentDir, rng() * Math.PI * 2);

    // Dirección: sigue menos a la madre + abre MÁS hacia el lado → la
    // ramita se separa más y su follaje cubre más espacio lateral
    const dir = parentDir.clone().multiplyScalar(0.32)
      .addScaledVector(perp, 1.00)
      .add(new THREE.Vector3(0, 0.12 + rng() * 0.18, 0))
      .normalize();

    const end = base.clone().addScaledVector(dir, len);
    const m   = _barkSeg(base, end, radius, radius * 0.5, rng);
    if (m) g.add(m);

    if (params.hojas) _placeLeaves(g, end, dir, 2 + Math.floor(rng() * 3), rng, 'tip', 0.10);

    // ~45% de las veces, una mini-bifurcación con un par de hojas más
    if (rng() > 0.55) {
      const dir2 = dir.clone().applyAxisAngle(perp, 0.4 + rng() * 0.3).normalize();
      const end2 = end.clone().addScaledVector(dir2, len * 0.6);
      const m2   = _barkSeg(end, end2, radius * 0.5, radius * 0.32, rng);
      if (m2) g.add(m2);
      if (params.hojas) _placeLeaves(g, end2, dir2, 1 + Math.floor(rng() * 2), rng, 'tip', 0.10);
    }
  }

  // Reparte varias ramitas a lo largo de la rama madre
  function _twigsAlongBranch(g, p0, p1, parentDir, radius, rng, params) {
    const branchLen = p1.clone().sub(p0).length();
    const n = 2 + Math.floor(params.densidad * 0.35); // densidad 7 → ~4 ramitas
    for (let k = 0; k < n; k++) {
      // Repartidas del 25% al 95% de la rama (no en la base)
      const t       = 0.25 + (k / n) * 0.70;
      const base    = p0.clone().lerp(p1, t);
      const twigLen = branchLen * (0.42 + rng() * 0.24);
      _sproutTwig(g, base, parentDir, twigLen, Math.max(radius * 0.42, 0.12), rng, params);
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

    // Frondosidad estructural:
    //   - En las PRIMERAS iteraciones (depth 1–2) la rama madre saca
    //     RAMITAS secundarias cortas con pocas hojas → ramificación real
    //   - En ramas ya finas (depth ≥ 3) se ponen hojas directamente
    //   Nota: el peso de rendimiento son las HOJAS, no las ramitas; por eso
    //   se mantienen las ramitas y se moderó el nº de hojas por ramita/punta.
    if (params.hojas && actualLen > 2.5) {
      if (depth >= 1 && depth <= 2) {
        _twigsAlongBranch(g, p0, p1, dir, radius, rng, params);
      } else if (depth >= 3 && rng() > 0.25) {
        _foliageAlongBranch(g, p0, p1, dir, rng, params.densidad);
      }
    }

    if (depth >= maxDepth) {
      if (params.hojas) _placeLeaves(g, p1, dir, 4 + Math.floor(rng() * 4), rng, 'tip', 0.10);
      return;
    }

    // Hojas sueltas en ramas finas (depth ≥ 3) — cubre huecos interiores
    if (depth >= 3 && params.hojas && rng() > 0.30) {
      _placeLeaves(g, p1, dir, 3 + Math.floor(rng() * 3), rng, 'tip', 0.08);
    }

    // Subdivisión siempre en 3
    // Ángulos MÁS ABIERTOS → los hijos se separan lateralmente (X/Z) y las
    // puntas abarcan MÁS espacio con las mismas hojas (más "aireado").
    const nSub     = 3;
    const splitAng = depth === 0 ? 1.00 + rng() * 0.25
                   : depth === 1 ? 0.94 + rng() * 0.22
                   : depth === 2 ? 0.82 + rng() * 0.20
                   :               0.64 + rng() * 0.18;
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
    _leafMeta  = {};
    // Hojas más grandes (y más esparcidas) en árboles altos → la copa se
    // ve poblada sin necesitar un nº gigante de hojas
    _leafScale = Math.max(0.85, Math.min(2.2, params.altura / 80));
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
    // nNiveles ESCALA con la altura: en árboles altos hacen falta más
    // inserciones de rama o el tronco queda "pelado". Mínimo 12, techo 28.
    const nNiveles  = Math.min(28, Math.max(12, Math.round(params.altura / 6)));
    let levelAngle  = rng() * Math.PI * 2;

    for (let i = 0; i < nNiveles; i++) {
      // tL: 0.0 → 1.0 a lo largo del tronco
      const tL = i / (nNiveles - 1);

      // Tronco limpio solo en el primer ~28% → copa MÁS LARGA, que
      // empieza más abajo (antes empezaba al 38%)
      if (tL < 0.28) { rng(); rng(); rng(); continue; }

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
