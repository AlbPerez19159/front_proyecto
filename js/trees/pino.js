// js/trees/pino.js — Generador del Pino insigne (Pinus radiata)
// Expone window.Tree_pino.generate(params) → THREE.Group

window.Tree_pino = (() => {

  function generate(params) {
    const group = new THREE.Group();
    const h = params.altura;
    const niveles = Math.max(params.ramas, 4);
    const angRama = 35 * Math.PI / 180;

    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(params.tronco * 0.15, params.tronco * 0.65, h, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4423 })
    );
    trunk.position.y = h / 2;
    group.add(trunk);

    // Verticilos de ramas
    for (let i = 0; i < niveles; i++) {
      const t = i / (niveles - 1);
      const y = h * 0.2 + t * h * 0.72;
      const longRama = h * 0.32 * (1 - t * 0.65) * (params.densidad / 10 + 0.4);
      const radioRama = Math.max(params.tronco * 0.07, 0.3);
      const colorRama    = new THREE.Color().setHSL(0.07, 0.4, 0.20 + t * 0.04);
      const colorAcicula = new THREE.Color().setHSL(0.32, 0.55, 0.18 + t * 0.05);

      for (let j = 0; j < 5; j++) {
        const theta = (Math.PI * 2 / 5) * j;
        const start = new THREE.Vector3(0, y, 0);
        const end   = new THREE.Vector3(
          Math.cos(theta) * longRama * Math.cos(angRama),
          y + longRama * Math.sin(angRama),
          Math.sin(theta) * longRama * Math.cos(angRama)
        );

        group.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 3, radioRama, 5, false),
          new THREE.MeshLambertMaterial({ color: colorRama })
        ));

        if (params.densidad > 0 && longRama > 4) {
          const tipR = Math.max(longRama * 0.16, 1.2) * (params.densidad / 10 + 0.5);
          const tGeo = new THREE.SphereGeometry(tipR, 6, 5);
          tGeo.scale(0.85, 1.3, 0.85);
          const tip = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ color: colorAcicula }));
          tip.position.copy(end);
          group.add(tip);

          if (params.densidad > 2) {
            const n = Math.min(3, Math.floor(params.densidad / 2));
            for (let k = 0; k < n; k++) {
              const cPos = start.clone().lerp(end, 0.45 + k * 0.20);
              const lat  = theta + (k - 1) * 0.7;
              cPos.x += Math.cos(lat) * tipR * 0.5;
              cPos.z += Math.sin(lat) * tipR * 0.5;
              cPos.y += tipR * 0.2;
              const cGeo = new THREE.SphereGeometry(tipR * (0.55 + Math.random() * 0.3), 5, 4);
              cGeo.scale(0.9, 1.15, 0.9);
              const c = new THREE.Mesh(cGeo, new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(0.32, 0.6, 0.16 + Math.random() * 0.06)
              }));
              c.position.copy(cPos);
              group.add(c);
            }
          }
        }
      }
    }

    // Ápice cónico
    const apexH = h * 0.14;
    const apex  = new THREE.Mesh(
      new THREE.ConeGeometry(h * 0.05, apexH, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a4018 })
    );
    apex.position.y = h + apexH / 2;
    group.add(apex);

    return group;
  }

  return { generate };
})();
