// tree.js — Generacion del arbol 3D con Three.js
// Responsabilidad: inicializar la escena y dibujar el arbol

const TreeViewer = (() => {

  let renderer, scene, camera, treeGroup, animFrame;
  let isDragging = false, lastX = 0, rotY = 0, rotX = 0.2;
  let autoRotate = true;

  // Inicializa renderer, camara y luces
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x161a16, 1);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 100, 240);
    camera.lookAt(0, 60, 0);

    // Luz ambiente suave
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Luz direccional principal
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(100, 200, 100);
    scene.add(dir);

    // Luz de relleno desde abajo
    const fill = new THREE.DirectionalLight(0x88ccaa, 0.3);
    fill.position.set(-80, -50, -80);
    scene.add(fill);

    // Suelo
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

  // Genera el arbol segun parametros
  function drawTree(params) {
    if (treeGroup) scene.remove(treeGroup);
    treeGroup = new THREE.Group();

    if (params.tipo === 'pino') {
      _drawPino(treeGroup, params);
    } else {
      _drawFrondoso(treeGroup, params);
    }

    treeGroup.position.y = 0;
    scene.add(treeGroup);
    autoRotate = true;
  }

  // Arbol tipo pino (conifero)
  function _drawPino(group, params) {
    const h = params.altura;
    const capas = params.ramas;

    // Tronco
    const tGeo = new THREE.CylinderGeometry(
      params.tronco * 0.3, params.tronco * 0.6,
      h * 0.35, 7
    );
    group.add(new THREE.Mesh(tGeo,
      new THREE.MeshLambertMaterial({ color: 0x5c3d1e })
    ));

    // Capas de follaje
    for (let i = 0; i < capas; i++) {
      const t = i / capas;
      const y = h * 0.2 + t * h * 0.75;
      const r = (params.densidad / 10) * (h * 0.35) * (1 - t * 0.7) + 8;
      const layerH = (h / capas) * 0.7;

      const cGeo = new THREE.ConeGeometry(r, layerH, 8);
      const cMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.36, 0.6, 0.18 + t * 0.06)
      });
      const cone = new THREE.Mesh(cGeo, cMat);
      cone.position.y = y + layerH / 2;
      group.add(cone);
    }
  }

  // Arbol tipo frondoso (roble, sauce, muerto)
  function _drawFrondoso(group, params) {
    _addBranch(
      group,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      params.altura * 0.42,
      params.tronco * 0.5,
      0,
      params.ramas,
      params
    );
  }

  // Rama recursiva
  function _addBranch(group, start, dir, len, radius, depth, maxDepth, params) {
    if (depth > maxDepth || len < 1.5) return;

    const end = start.clone().addScaledVector(dir, len);

    // Geometria del cilindro de la rama
    const path = new THREE.LineCurve3(start, end);
    const geo = new THREE.TubeGeometry(path, 4, Math.max(radius, 0.3), 5, false);
    const color = params.tipo === 'muerto'
      ? new THREE.Color(0x6b6b5e)
      : new THREE.Color().setHSL(0.08, 0.5, 0.18 + depth * 0.04);
    group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })));

    // Follaje en las puntas
    if (depth === maxDepth && params.tipo !== 'muerto' && params.densidad > 0) {
      const leafColors = {
        roble: new THREE.Color().setHSL(0.33, 0.55, 0.25),
        sauce: new THREE.Color().setHSL(0.28, 0.5, 0.28),
      };
      const lColor = leafColors[params.tipo] || leafColors.roble;
      const lGeo = new THREE.SphereGeometry(
        (params.densidad / 10) * params.altura * 0.12 + 4, 6, 5
      );
      const leaf = new THREE.Mesh(lGeo,
        new THREE.MeshLambertMaterial({ color: lColor })
      );
      leaf.position.copy(end);
      group.add(leaf);
      return;
    }

    // Sub-ramas
    const numBranches = depth < 2 ? 2 : (Math.random() > 0.35 ? 3 : 2);
    const newLen = len * (params.tipo === 'sauce' ? 0.72 : 0.68);
    const newRad = radius * 0.65;
    const angle = params.angulo * Math.PI / 180;

    for (let i = 0; i < numBranches; i++) {
      const theta = (Math.PI * 2 / numBranches) * i + (Math.random() - 0.5) * 0.6;
      let newDir;

      if (params.tipo === 'sauce' && depth >= 2) {
        // Sauce: ramas caen hacia abajo
        newDir = new THREE.Vector3(
          dir.x * Math.cos(angle) + Math.sin(theta) * Math.sin(angle),
          dir.y * Math.cos(angle) - Math.sin(angle) * 0.8,
          dir.z * Math.cos(angle) + Math.cos(theta) * Math.sin(angle)
        ).normalize();
      } else {
        const axis = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        newDir = dir.clone().applyAxisAngle(axis, angle).normalize();
      }

      _addBranch(group, end.clone(), newDir, newLen, newRad, depth + 1, maxDepth, params);
    }
  }

  // Animacion principal
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

  // Resize responsivo
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

  // Controles de mouse
  function _bindMouse(canvas) {
    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      autoRotate = false;
      lastX = e.clientX;
    });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    });
    canvas.addEventListener('wheel', e => {
      camera.position.z = Math.max(80, Math.min(500,
        camera.position.z + e.deltaY * 0.3
      ));
    });
    // Touch
    canvas.addEventListener('touchstart', e => {
      isDragging = true;
      autoRotate = false;
      lastX = e.touches[0].clientX;
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotY += (e.touches[0].clientX - lastX) * 0.012;
      lastX = e.touches[0].clientX;
    });
  }

  function _bindResize() {
    window.addEventListener('resize', _resize);
  }

  return { init, drawTree };
})();
