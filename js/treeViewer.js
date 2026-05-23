// treeViewer.js — Motor 3D compartido v2.6
// Versión conservadora: resize solo en evento, drawTree con rAF delay

const TreeViewer = (() => {

  let renderer, scene, camera, treeGroup, animFrame;
  let isDragging = false, lastX = 0, rotY = 0, rotX = 0.10;
  let autoRotate = true;
  let personMesh = null;

  const PERSONA_MM = 1750;

  function init(canvas) {
    // Tamaño real del canvas en este momento
    const W = canvas.clientWidth  || canvas.offsetWidth  || 800;
    const H = canvas.clientHeight || canvas.offsetHeight || 600;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0xf5f0e8, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0e8);

    camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 3000);
    camera.position.set(0, 120, 400);
    camera.lookAt(0, 110, 0);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xfff5dd, 1.1);
    sun.position.set(100, 220, 80);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e8d0, 0.40);
    fill.position.set(-80, 50, -100);
    scene.add(fill);

    // Suelo
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(300, 48),
      new THREE.MeshLambertMaterial({ color: 0xe8e0d0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    _bindEvents(canvas);
    _animate();
  }

  // Silueta PNG sobre un plano
  function _buildPerson(alturaModelo) {
    if (personMesh) { scene.remove(personMesh); personMesh = null; }

    const h = Math.max(alturaModelo, 1);
    const w = h * (360 / 651);

    const tex = new THREE.TextureLoader().load('img/silueta.png');
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.15,
      depthWrite: false, side: THREE.DoubleSide,
    });
    personMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    personMesh.position.set(60, h / 2, 5);
    scene.add(personMesh);
  }

  function _fitCamera(group, tipo, alturaParam) {
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const treeH = box.max.y - box.min.y;
    const h = (isFinite(treeH) && treeH > 0) ? treeH : alturaParam;

    const copaRatio = { eucalipto:0.75, palmera:0.80, pino:0.55, araucaria:0.60 }[tipo] ?? 0.55;
    const focusY = h * copaRatio;

    camera.position.set(0, focusY, h * 2.8);
    camera.lookAt(0, focusY, 0);
    camera.updateProjectionMatrix();
  }

  function drawTree(params) {
    if (treeGroup) scene.remove(treeGroup);

    const modKey = 'Tree_' + params.tipo;
    if (!window[modKey]) { console.error('Módulo no encontrado: ' + modKey); return; }

    treeGroup = window[modKey].generate(params);
    treeGroup.position.y = 0;
    scene.add(treeGroup);
    autoRotate = true;

    _buildPerson(PERSONA_MM / (Number(params.escala) || 87));
    _fitCamera(treeGroup, params.tipo, params.altura);
  }

  function _animate() {
    requestAnimationFrame(_animate);
    if (autoRotate) rotY += 0.005;
    if (treeGroup) {
      treeGroup.rotation.y = rotY;
      treeGroup.rotation.x = rotX;
    }
    renderer.render(scene, camera);
  }

  function _resize(canvas) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function _bindEvents(canvas) {
    window.addEventListener('resize', () => _resize(canvas));

    canvas.addEventListener('mousedown', e => { isDragging = true; autoRotate = false; lastX = e.clientX; });
    canvas.addEventListener('mouseup',   () => isDragging = false);
    window.addEventListener('mouseup',   () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    });
    canvas.addEventListener('wheel', e => {
      camera.position.z = Math.max(80, Math.min(700, camera.position.z + e.deltaY * 0.3));
    }, { passive: true });
    canvas.addEventListener('touchstart', e => { isDragging = true; autoRotate = false; lastX = e.touches[0].clientX; });
    canvas.addEventListener('touchend',  () => isDragging = false);
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotY += (e.touches[0].clientX - lastX) * 0.012;
      lastX = e.touches[0].clientX;
    });
  }

  return { init, drawTree };
})();
