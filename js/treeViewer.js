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

  // --------------------------------------------------
  // Exportación a STL — toma el árbol que se está viendo
  // y genera un STL binario listo para impresión 3D.
  //
  // El árbol se construye con la altura en Y (convención Three.js),
  // pero los slicers esperan la altura en Z. Por eso, antes de
  // exportar, se rota el modelo -90° en X y se asienta la base en Z=0.
  // Devuelve un Blob con el contenido del STL.
  // --------------------------------------------------
  function exportSTL() {
    if (!treeGroup) return null;

    // NO clonamos el árbol: el clone serializa userData y perdería el
    // 'shape' de cada hoja. En su lugar leemos las geometrías directo y
    // usamos matrices para (a) quitar la rotación de animación del
    // contenedor y (b) rotar -90° en X (altura Y → Z, como esperan los slicers).
    treeGroup.updateMatrixWorld(true);
    const invRoot = new THREE.Matrix4().copy(treeGroup.matrixWorld).invert();
    const Mexport = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

    // Las hojas se ven planas (2D) en pantalla, pero al EXPORTAR se
    // reconstruyen con grosor para que sean imprimibles. Cache por metadata.
    const solidCache = new Map();
    function _solidLeafGeo(meta) {
      if (solidCache.has(meta)) return solidCache.get(meta);
      const g = new THREE.ExtrudeGeometry(meta.shape, {
        depth: meta.thickness, bevelEnabled: false,
      });
      // Centrar igual que la hoja plana (X) y centrar el grosor (Z)
      g.translate(-meta.cx, 0, -meta.thickness / 2);
      solidCache.set(meta, g);
      return g;
    }

    // Recolectar todos los triángulos del árbol
    const triangulos = [];
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const local = new THREE.Matrix4(), m = new THREE.Matrix4();

    treeGroup.traverse((obj) => {
      if (!obj.isMesh) return;

      // Hoja plana marcada → usar su versión CON grosor imprimible
      let geo = obj.geometry;
      if (obj.userData && obj.userData.solid) geo = _solidLeafGeo(obj.userData.solid);

      const pos = geo && geo.attributes && geo.attributes.position;
      if (!pos) return;
      const idx = geo.index;

      // Transform del mesh en el espacio del árbol (sin animación) + export
      local.multiplyMatrices(invRoot, obj.matrixWorld);
      m.multiplyMatrices(Mexport, local);

      const nTris = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < nTris; t++) {
        let a, b, c;
        if (idx) {
          a = idx.getX(t * 3); b = idx.getX(t * 3 + 1); c = idx.getX(t * 3 + 2);
        } else {
          a = t * 3; b = t * 3 + 1; c = t * 3 + 2;
        }
        vA.fromBufferAttribute(pos, a).applyMatrix4(m);
        vB.fromBufferAttribute(pos, b).applyMatrix4(m);
        vC.fromBufferAttribute(pos, c).applyMatrix4(m);
        triangulos.push([vA.clone(), vB.clone(), vC.clone()]);
      }
    });

    if (triangulos.length === 0) return null;

    // Asentar la base en Z = 0 (calcular Z mínimo y desplazar)
    let minZ = Infinity;
    for (const tri of triangulos)
      for (const v of tri) if (v.z < minZ) minZ = v.z;
    for (const tri of triangulos)
      for (const v of tri) v.z -= minZ;

    // --- Construir STL binario ---
    // Cabecera 80 bytes + 4 bytes (nº triángulos) + 50 bytes por triángulo
    const nTri = triangulos.length;
    const buffer = new ArrayBuffer(84 + nTri * 50);
    const dv = new DataView(buffer);

    // Cabecera de texto (80 bytes)
    const header = 'Tree3D STL export';
    for (let i = 0; i < 80; i++) {
      dv.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }
    dv.setUint32(80, nTri, true);

    const normal = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3();
    let offset = 84;

    for (const [a, b, c] of triangulos) {
      // Normal de la cara
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      normal.crossVectors(ab, ac).normalize();

      dv.setFloat32(offset,      normal.x, true);
      dv.setFloat32(offset + 4,  normal.y, true);
      dv.setFloat32(offset + 8,  normal.z, true);
      dv.setFloat32(offset + 12, a.x, true);
      dv.setFloat32(offset + 16, a.y, true);
      dv.setFloat32(offset + 20, a.z, true);
      dv.setFloat32(offset + 24, b.x, true);
      dv.setFloat32(offset + 28, b.y, true);
      dv.setFloat32(offset + 32, b.z, true);
      dv.setFloat32(offset + 36, c.x, true);
      dv.setFloat32(offset + 40, c.y, true);
      dv.setFloat32(offset + 44, c.z, true);
      dv.setUint16(offset + 48, 0, true); // attribute byte count
      offset += 50;
    }

    return {
      blob: new Blob([buffer], { type: 'application/octet-stream' }),
      triangulos: nTri,
    };
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

  return { init, drawTree, exportSTL };
})();
