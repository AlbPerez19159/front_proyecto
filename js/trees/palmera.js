// js/trees/palmera.js — Generador de la Palmera cocotera (Cocos nucifera)
// Expone window.Tree_palmera.generate(params) → THREE.Group

window.Tree_palmera = (() => {

  function generate(params) {
    const group = new THREE.Group();
    const h = params.altura;

    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(params.tronco * 0.22, params.tronco * 0.55, h * 0.88, 9),
      new THREE.MeshLambertMaterial({ color: 0x9e7a3a })
    );
    trunk.position.y = h * 0.44;
    group.add(trunk);

    // Anillos del tronco
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(params.tronco * 0.34, params.tronco * 0.055, 4, 9),
        new THREE.MeshLambertMaterial({ color: 0x7a5c28 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.88 * ((i + 1) / 9);
      group.add(ring);
    }

    // Corona de hojas pinnadas
    const numHojas = Math.max(10, Math.round(params.densidad * 1.2 + 8));
    const coronaY  = h * 0.88;
    const longHoja = h * 0.42;
    const matHoja    = new THREE.MeshLambertMaterial({ color: 0x3a6b28 });
    const matHojaOsc = new THREE.MeshLambertMaterial({ color: 0x2d5520 });
    const matRaquis  = new THREE.MeshLambertMaterial({ color: 0x5e4a1e });

    for (let i = 0; i < numHojas; i++) {
      const theta = (Math.PI * 2 / numHojas) * i;
      const p0 = new THREE.Vector3(0, coronaY, 0);
      const p1 = new THREE.Vector3(
        Math.cos(theta) * longHoja * 0.35, coronaY + longHoja * 0.22,
        Math.sin(theta) * longHoja * 0.35
      );
      const p2 = new THREE.Vector3(
        Math.cos(theta) * longHoja * 0.88, coronaY - longHoja * 0.35,
        Math.sin(theta) * longHoja * 0.88
      );
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);

      // Raquis
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, Math.max(params.tronco * 0.025, 0.25), 4, false),
        matRaquis
      ));

      // Foliolos perpendiculares al raquis
      for (let s = 1; s < 14; s++) {
        const tF     = s / 14;
        const center  = curve.getPoint(tF);
        const tangent = curve.getPoint(Math.min(tF + 0.04, 1)).clone().sub(center).normalize();
        const perp    = new THREE.Vector3(-tangent.z, 0, tangent.x);
        if (perp.length() < 0.001) perp.set(1, 0, 0);
        perp.normalize();

        const folLen = longHoja * 0.20 * Math.sin(tF * Math.PI);
        if (folLen < 1) continue;

        [perp.clone(), perp.clone().negate()].forEach(p => {
          const geo = new THREE.SphereGeometry(folLen * 0.5, 4, 3);
          geo.scale(1.0, 0.18, 0.30);
          const fol = new THREE.Mesh(geo, (i + s) % 4 === 0 ? matHojaOsc : matHoja);
          fol.position.copy(center).addScaledVector(p, folLen * 0.5);
          fol.rotation.y = -Math.atan2(p.z, p.x);
          fol.rotation.z = -0.15;
          group.add(fol);
        });
      }
    }

    return group;
  }

  return { generate };
})();
