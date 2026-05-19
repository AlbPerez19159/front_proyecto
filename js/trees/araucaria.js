// js/trees/araucaria.js — Generador de la Araucaria (Araucaria araucana)
// Expone window.Tree_araucaria.generate(params) → THREE.Group

window.Tree_araucaria = (() => {

  function generate(params) {
    const group  = new THREE.Group();
    const h      = params.altura;
    const niveles = Math.max(params.ramas, 5);

    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(params.tronco * 0.3, params.tronco * 0.75, h, 9),
      new THREE.MeshLambertMaterial({ color: 0x4a3018 })
    );
    trunk.position.y = h / 2;
    group.add(trunk);

    // Copa en paraguas — solo tercio superior
    const coronaBase   = h * 0.60;
    const coronaAltura = h * 0.40;

    for (let i = 0; i < niveles; i++) {
      const t        = i / (niveles - 1);
      const y        = coronaBase + t * coronaAltura;
      const tCampana = Math.sin(t * Math.PI);
      const longRama = h * 0.38 * tCampana * (params.densidad / 10 + 0.5);
      if (longRama < 2) continue;

      const radioRama    = Math.max(params.tronco * 0.09, 0.4);
      const colorRama    = new THREE.Color().setHSL(0.07, 0.35, 0.18 + t * 0.04);
      const colorFollaje = new THREE.Color().setHSL(0.31, 0.65, 0.18 + t * 0.04);

      for (let j = 0; j < 6; j++) {
        const theta = (Math.PI * 2 / 6) * j + (Math.PI / 6) * (i % 2);
        const dx = Math.cos(theta), dz = Math.sin(theta);
        const p0 = new THREE.Vector3(0, y, 0);
        const p1 = new THREE.Vector3(dx * longRama * 0.55, y + longRama * 0.05, dz * longRama * 0.55);
        const p2 = new THREE.Vector3(dx * longRama, y + longRama * 0.18, dz * longRama);
        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);

        group.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(6)), 5, radioRama, 5, false),
          new THREE.MeshLambertMaterial({ color: colorRama })
        ));

        // Clusters de follaje
        if (params.densidad > 1 && longRama > 6) {
          const n = 3 + Math.floor(params.densidad / 3);
          for (let k = 1; k <= n; k++) {
            const center = curve.getPoint(k / (n + 1));
            const clRad  = longRama * (0.14 - k / (n + 1) * 0.04);
            const clGeo  = new THREE.SphereGeometry(clRad, 6, 5);
            clGeo.scale(0.85, 0.7, 1.4);
            const cl = new THREE.Mesh(clGeo, new THREE.MeshLambertMaterial({ color: colorFollaje }));
            cl.position.copy(center);
            group.add(cl);

            if (params.densidad > 4) {
              for (let m = 0; m < 2; m++) {
                const off = new THREE.Vector3(
                  (Math.random() - .5) * clRad,
                  (Math.random() - .3) * clRad,
                  (Math.random() - .5) * clRad
                );
                const p = new THREE.Mesh(
                  new THREE.SphereGeometry(clRad * 0.55, 4, 3),
                  new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setHSL(0.30, 0.6, 0.16 + Math.random() * 0.06)
                  })
                );
                p.position.copy(center).add(off);
                group.add(p);
              }
            }
          }
        }
      }
    }

    return group;
  }

  return { generate };
})();
