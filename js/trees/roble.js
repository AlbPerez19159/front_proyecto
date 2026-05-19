// js/trees/roble.js — Generador del Roble (Quercus robur)
// Expone window.Tree_roble.generate(params) → THREE.Group
// v3.1: tronco facetado, hojas individuales lobuladas, ramas balanceadas 360°

window.Tree_roble = (() => {

  let _leafGeo = null;

  // --------------------------------------------------
  // RNG seedable — misma semilla = mismo árbol siempre
  // --------------------------------------------------
  function _rng(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // --------------------------------------------------
  // Segmento de tronco/rama con textura de corteza
  // --------------------------------------------------
  function _barkSeg(p0, p1, r0, r1, rng) {
    const vec = p1.clone().sub(p0), len = vec.length();
    if (len < 0.01) return null;
    const geo = new THREE.CylinderGeometry(r1, r0, len, r0 > 1.5 ? 9 : 6, 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), t = (y / len + 0.5);
      const ang = Math.atan2(pos.getZ(i), pos.getX(i));
      const bump = Math.sin(ang * 5.1 + t * 8.3) * 0.045
                 + Math.cos(ang * 3.7 + t * 12.1) * 0.028;
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      pos.setXYZ(i, Math.cos(ang) * r * (1 + bump), y, Math.sin(ang) * r * (1 + bump));
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.066, 0.42, 0.22 + rng() * 0.06),
      flatShading: true,
    }));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.clone().normalize());
    mesh.position.copy(p0.clone().lerp(p1, 0.5));
    return mesh;
  }

  // --------------------------------------------------
  // Hoja lobulada extruida — geometría única compartida
  // Base (y=0 local) enterrada en la rama → imprimible
  // --------------------------------------------------
  function _leafGeo_get() {
    if (_leafGeo) return _leafGeo;
    const sz = 7, w = sz * 0.46, h = sz, embed = sz * 0.30;
    const shape = new THREE.Shape();
    shape.moveTo(0, -embed);
    shape.lineTo(-w * 0.25, 0);
    shape.quadraticCurveTo(-w * 1.05, h * 0.20, -w * 0.90, h * 0.34);
    shape.quadraticCurveTo(-w * 1.15, h * 0.44, -w * 0.75, h * 0.52);
    shape.quadraticCurveTo(-w * 1.00, h * 0.64, -w * 0.65, h * 0.70);
    shape.quadraticCurveTo(-w * 0.45, h * 0.86, 0, h);
    shape.quadraticCurveTo( w * 0.45, h * 0.86,  w * 0.65, h * 0.70);
    shape.quadraticCurveTo( w * 1.00, h * 0.64,  w * 0.75, h * 0.52);
    shape.quadraticCurveTo( w * 1.15, h * 0.44,  w * 0.90, h * 0.34);
    shape.quadraticCurveTo( w * 1.05, h * 0.20,  w * 0.25, 0);
    shape.lineTo(0, -embed);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: sz * 0.07, bevelEnabled: false });
    geo.computeBoundingBox();
    geo.translate(
      -((geo.boundingBox.max.x + geo.boundingBox.min.x) / 2), 0,
      -((geo.boundingBox.max.z + geo.boundingBox.min.z) / 2)
    );
    geo.computeVertexNormals();
    _leafGeo = geo;
    return geo;
  }

  // Coloca N hojas en abanico en la punta de un segmento
  function _placeLeaves(group, tip, dir, n, rng) {
    const geo = _leafGeo_get();
    let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (perp.length() < 0.001) perp = new THREE.Vector3(1, 0, 0);
    perp.normalize();
    const step = Math.PI * 2 / n, base = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const rotPerp = perp.clone().applyAxisAngle(dir, base + step * i);
      const leafDir = dir.clone().multiplyScalar(0.40)
                        .addScaledVector(rotPerp, 0.80)
                        .add(new THREE.Vector3(0, 0.25, 0)).normalize();
      const col = new THREE.Color().setHSL(0.28 + rng() * 0.06, 0.55 + rng() * 0.08, 0.22 + rng() * 0.10);
      const leaf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      leaf.position.copy(tip);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
      leaf.rotateOnAxis(new THREE.Vector3(0, 1, 0), (rng() - 0.5) * 0.25);
      group.add(leaf);
    }
  }

  // --------------------------------------------------
  // Tronco curvado (modo "natural")
  // --------------------------------------------------
  function _curvedTrunk(group, totalH, baseR, rng) {
    const pts = [new THREE.Vector3()];
    let cur = new THREE.Vector3(), cd = new THREE.Vector3(0, 1, 0);
    const segH = totalH / 12;
    for (let i = 0; i < 12; i++) {
      const ax = new THREE.Vector3((rng() - .5) * 2, 0, (rng() - .5) * 2).normalize();
      cd.applyAxisAngle(ax, Math.sin((i + 1) / 12 * Math.PI) * 0.055).normalize();
      cur = cur.clone().addScaledVector(cd, segH);
      pts.push(cur.clone());
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 2);
      const m = _barkSeg(pts[i], pts[i + 1],
        baseR * (1 - t * 0.26), baseR * (1 - (t + 1 / (pts.length - 2)) * 0.26), rng);
      if (m) group.add(m);
    }
    return { pos: pts[pts.length - 1].clone(), dir: cd.clone() };
  }

  // --------------------------------------------------
  // Rama recursiva
  // --------------------------------------------------
  function _branch(g, p0, dir, len, radius, depth, maxDepth, rng, params) {
    if (len < 1.5 || radius < 0.10) return;
    const actualLen = len * (0.80 + rng() * 0.28);
    const p1 = p0.clone().addScaledVector(dir, actualLen);
    const m = _barkSeg(p0, p1, radius, radius * 0.60, rng);
    if (m) g.add(m);

    // terminal → 3 hojas en abanico
    if (depth >= maxDepth) {
      if (params.hojas) _placeLeaves(g, p1, dir, 3, rng);
      return;
    }

    // intermedias profundas → 1 hoja solitaria
    if (depth >= 3 && params.hojas) _placeLeaves(g, p1, dir, 1, rng);

    // tronco principal (depth 0)
    if (depth === 0) {
      const ax0 = new THREE.Vector3(rng() - .5, 0, rng() - .5).normalize();
      _branch(g, p1, dir.clone().applyAxisAngle(ax0, 0.06).normalize(),
        len * 0.76, radius * 0.68, 1, maxDepth, rng, params);

      // 7 ramas laterales con ángulos FIJOS equidistantes → cobertura 360°
      const nLat = 7;
      for (let i = 0; i < nLat; i++) {
        const tL = 0.08 + (i / nLat) * 0.84;
        const pL = p0.clone().addScaledVector(dir, actualLen * tL);
        const theta = (Math.PI * 2 / nLat) * i + (rng() - 0.5) * 0.20;
        const ax = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        const openAng = 0.45 + (1 - tL) * 0.25 + rng() * 0.15;
        const latDir = dir.clone().applyAxisAngle(ax, openAng).normalize();
        latDir.y += (rng() - 0.3) * 0.10;
        latDir.normalize();
        _branch(g, pL, latDir,
          len * (0.55 + rng() * 0.20),
          radius * (0.42 + rng() * 0.14),
          2, maxDepth, rng, params);
      }
      return;
    }

    // niveles intermedios
    const nSub = depth === 1 ? 3 : depth === 2 ? 3 : 2;
    const splitAng = depth === 1 ? 0.50 + rng() * 0.15
                   : depth === 2 ? 0.42 + rng() * 0.12
                   : 0.35 + rng() * 0.10;
    const rotBase = rng() * Math.PI * 2;
    for (let i = 0; i < nSub; i++) {
      const theta = (Math.PI * 2 / nSub) * i + rotBase + (rng() - 0.5) * 0.55;
      const ax = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const childDir = dir.clone().applyAxisAngle(ax, splitAng).normalize();
      _branch(g, p1.clone(), childDir,
        len * (depth <= 2 ? 0.63 : 0.57),
        radius * 0.60, depth + 1, maxDepth, rng, params);
    }
  }

  // --------------------------------------------------
  // generate — punto de entrada público
  // --------------------------------------------------
  function generate(params) {
    _leafGeo = null; // resetear caché
    const group  = new THREE.Group();
    const rng    = _rng(42);
    const TRUNK_H = params.altura * 0.85;
    const BASE_R  = params.tronco * 0.5;
    const maxD    = Math.max(params.ramas - 1, 3);

    let apexPos, apexDir = new THREE.Vector3(0, 1, 0);

    if (params.trunco_tipo === 'natural') {
      const res = _curvedTrunk(group, TRUNK_H, BASE_R, rng);
      apexPos = res.pos; apexDir = res.dir;
    } else {
      apexPos = new THREE.Vector3(0, TRUNK_H, 0);
      const m = _barkSeg(new THREE.Vector3(0, 0, 0), apexPos, BASE_R, BASE_R * 0.70, rng);
      if (m) group.add(m);
    }

    _branch(group, apexPos, apexDir, TRUNK_H * 0.82, BASE_R * 0.68, 0, maxD, rng, params);
    return group;
  }

  return { generate };
})();
