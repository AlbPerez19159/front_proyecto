// js/trees/eucalipto.js — Generador del Eucalipto (Eucalyptus globulus)
// Expone window.Tree_eucalipto.generate(params) → THREE.Group

window.Tree_eucalipto = (() => {

  function _trunkColor(depth) {
    return new THREE.Color().setHSL(0.06, 0.18, 0.45 + depth * 0.04);
  }

  function _addBranch(group, start, dir, len, radius, depth, maxDepth, params) {
    if (depth > maxDepth || len < 1.5) return;
    const end = start.clone().addScaledVector(dir, len * (0.88 + Math.random() * 0.24));

    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 4, Math.max(radius, 0.25), 6, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(depth) })
    ));

    // Follaje en las puntas — clusters elongados gris-verdosos
    if (depth === maxDepth && params.densidad > 0) {
      const baseR  = (params.densidad / 10) * params.altura * 0.07 + 3;
      const nBlobs = 3 + Math.floor(params.densidad / 2);
      for (let b = 0; b < nBlobs; b++) {
        const r   = baseR * (0.6 + Math.random() * 0.5);
        const off = new THREE.Vector3(
          (Math.random() - 0.5) * baseR * 1.6,
          Math.random() * baseR * 0.6 - baseR * 0.1,
          (Math.random() - 0.5) * baseR * 1.6
        );
        const geo = new THREE.SphereGeometry(r, 6, 5);
        geo.scale(0.85, 1.4, 0.85);
        const leaf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(
            0.27 + (Math.random() - 0.5) * 0.04,
            0.30 + Math.random() * 0.15,
            0.32 + Math.random() * 0.10
          )
        }));
        leaf.position.copy(end).add(off);
        group.add(leaf);
      }
      return;
    }

    const nSub      = depth === 1 ? 3 : (Math.random() > 0.3 ? 3 : 2);
    const rotOffset = depth * 1.1 + Math.random() * 0.5;
    for (let i = 0; i < nSub; i++) {
      const theta  = (Math.PI * 2 / nSub) * i + rotOffset;
      const newDir = dir.clone()
        .applyAxisAngle(new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)), 48 * Math.PI / 180)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.5)
        .normalize();
      _addBranch(group, end.clone(), newDir, len * 0.72, radius * 0.62,
        depth + 1, maxDepth, params);
    }
  }

  function generate(params) {
    const group    = new THREE.Group();
    const trunkLen = params.altura * 0.42;
    const trunkRad = params.tronco * 0.5;

    let apexPos, apexDir;

    if (params.trunco_tipo === 'natural') {
      // Tronco curvado
      const points = [new THREE.Vector3()];
      let cur = new THREE.Vector3(), cd = new THREE.Vector3(0, 1, 0);
      const segLen = trunkLen / 10;
      for (let i = 1; i <= 10; i++) {
        const ax = new THREE.Vector3((Math.random() - .5) * 2, 0, (Math.random() - .5) * 2);
        if (ax.length() > 0.001)
          cd.applyAxisAngle(ax.normalize(), 0.07 * Math.sin(i / 10 * Math.PI)).normalize();
        cur = cur.clone().addScaledVector(cd, segLen);
        points.push(cur.clone());
      }
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, trunkRad, 8, false),
        new THREE.MeshLambertMaterial({ color: _trunkColor(0) })
      ));
      apexPos = points[points.length - 1].clone();
      apexDir = cd.clone();
    } else {
      apexPos = new THREE.Vector3(0, trunkLen, 0);
      apexDir = new THREE.Vector3(0, 1, 0);
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), apexPos), 4, Math.max(trunkRad, 0.25), 6, false),
        new THREE.MeshLambertMaterial({ color: _trunkColor(0) })
      ));
    }

    const newLen = trunkLen * 0.72;
    const newRad = trunkRad * 0.62;
    const ang    = 48 * Math.PI / 180;
    const rotBase = Math.random() * Math.PI * 2;

    for (let i = 0; i < 3; i++) {
      const theta  = (Math.PI * 2 / 3) * i + rotBase;
      const axis   = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const newDir = apexDir.clone().applyAxisAngle(axis, ang)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * .5).normalize();
      _addBranch(group, apexPos.clone(), newDir, newLen, newRad, 1, params.ramas, params);
    }

    return group;
  }

  return { generate };
})();
