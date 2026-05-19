// js/trees/muerto.js — Generador del Árbol muerto
// Expone window.Tree_muerto.generate(params) → THREE.Group

window.Tree_muerto = (() => {

  function _trunkColor(depth) {
    return new THREE.Color().setHSL(0.08, 0.12, 0.38 + depth * 0.03);
  }

  function _addBranch(group, start, dir, len, radius, depth, maxDepth) {
    if (depth > maxDepth || len < 1.5) return;
    const end = start.clone().addScaledVector(dir, len * (0.88 + Math.random() * 0.24));

    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 4, Math.max(radius, 0.18), 6, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(depth) })
    ));

    if (depth >= maxDepth) return;

    const nSub      = depth === 1 ? 3 : (Math.random() > 0.3 ? 3 : 2);
    const rotOffset = depth * 1.1 + Math.random() * 0.5;
    for (let i = 0; i < nSub; i++) {
      const theta  = (Math.PI * 2 / nSub) * i + rotOffset;
      const newDir = dir.clone()
        .applyAxisAngle(new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)), 35 * Math.PI / 180)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * .5)
        .normalize();
      _addBranch(group, end.clone(), newDir, len * 0.67, radius * 0.62, depth + 1, maxDepth);
    }
  }

  function generate(params) {
    const group    = new THREE.Group();
    const trunkLen = params.altura * 0.42;
    const trunkRad = params.tronco * 0.5;
    const apexPos  = new THREE.Vector3(0, trunkLen, 0);

    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), apexPos), 4, Math.max(trunkRad, 0.25), 6, false),
      new THREE.MeshLambertMaterial({ color: _trunkColor(0) })
    ));

    const newLen  = trunkLen * 0.67;
    const newRad  = trunkRad * 0.62;
    const ang     = 35 * Math.PI / 180;
    const rotBase = Math.random() * Math.PI * 2;
    const apexDir = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 3; i++) {
      const theta  = (Math.PI * 2 / 3) * i + rotBase;
      const axis   = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const newDir = apexDir.clone().applyAxisAngle(axis, ang)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * .5).normalize();
      _addBranch(group, apexPos.clone(), newDir, newLen, newRad, 1, params.ramas);
    }

    return group;
  }

  return { generate };
})();
