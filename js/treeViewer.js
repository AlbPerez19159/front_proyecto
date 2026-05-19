// treeViewer.js — Motor 3D compartido
// Inicializa renderer, escena, cámara y luces.
// Delega la generación del árbol al módulo de cada especie
// (js/trees/roble.js, js/trees/pino.js, etc.)

const TreeViewer = (() => {

  let renderer, scene, camera, treeGroup, animFrame;
  let isDragging = false, lastX = 0, rotY = 0, rotX = 0.10;
  let autoRotate = true;

  // --------------------------------------------------
  // init — llamar una sola vez al arrancar
  // --------------------------------------------------
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xf5f0e8, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0e8);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
    camera.position.set(0, 120, 400);
    camera.lookAt(0, 110, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.70));

    const sun = new THREE.DirectionalLight(0xfff5dd, 1.1);
    sun.position.set(100, 220, 80);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd0e8d0, 0.40);
    fill.position.set(-80, 50, -100);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(300, 48),
      new THREE.MeshLambertMaterial({ color: 0xe8e0d0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    _bindMouse(canvas);
    _bindResize(canvas);
    _animate();
  }

  // --------------------------------------------------
  // drawTree — llama al generador del módulo de especie
  // Cada especie expone window.TreeEspecie.generate(params)
  // que devuelve un THREE.Group listo para añadir a la escena
  // --------------------------------------------------
  function drawTree(params) {
    if (treeGroup) scene.remove(treeGroup);

    // El módulo de la especie debe estar cargado como script
    // y exponer window['Tree_' + tipo]
    const modKey = 'Tree_' + params.tipo;
    if (!window[modKey]) {
      console.error(`Módulo ${modKey} no encontrado. ¿Está cargado js/trees/${params.tipo}.js?`);
      return;
    }

    treeGroup = window[modKey].generate(params);
    treeGroup.position.y = 0;
    scene.add(treeGroup);
    autoRotate = true;
  }

  // --------------------------------------------------
  // Animación
  // --------------------------------------------------
  function _animate() {
    animFrame = requestAnimationFrame(_animate);
    _resize();
    if (autoRotate) rotY += 0.005;
    if (treeGroup) {
      treeGroup.rotation.y = rotY;
      treeGroup.rotation.x = rotX;
    }
    renderer.render(scene, camera);
  }

  function _resize() {
    const canvas = renderer.domElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function _bindMouse(canvas) {
    canvas.addEventListener('mousedown', e => { isDragging = true; autoRotate = false; lastX = e.clientX; });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    });
    canvas.addEventListener('wheel', e => {
      camera.position.z = Math.max(80, Math.min(700, camera.position.z + e.deltaY * 0.3));
    });
    canvas.addEventListener('touchstart', e => { isDragging = true; autoRotate = false; lastX = e.touches[0].clientX; });
    canvas.addEventListener('touchend', () => isDragging = false);
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotY += (e.touches[0].clientX - lastX) * 0.012;
      lastX = e.touches[0].clientX;
    });
  }

  function _bindResize() { window.addEventListener('resize', _resize); }

  return { init, drawTree };
})();
