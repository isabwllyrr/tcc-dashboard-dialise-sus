const stage = document.getElementById("kidney-stage");
const enable = document.getElementById("enable-3d");
const fallback = document.getElementById("kidney-fallback");
const viewButtons = stage ? [...stage.querySelectorAll("[data-view]")] : [];

const views = {
  position: { x: -.06, y: .12 },
  hilum: { x: -.08, y: -.60 },
};

let renderer;
let scene;
let camera;
let organ;
let THREE;
let frameId = null;
let visible = true;
let dragging = false;
let disposed = false;
let loaded = false;
let fixedView = false;
let lastTime = 0;
let target = { ...views.position };
let rotation = { ...target };
let sample = [];
let low35Windows = 0;
let low30Windows = 0;
let activeView = 'position';
let environment;
let resizeObserver;
let intersectionObserver;
const events = new AbortController();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

window.__kidneyMetrics = { windows: [], mode: "static", assetLoaded: false, paintedPixels: 0, renderCount: 0 };

function chooseView(name) {
  activeView = name;
  const next = views[name] || views.position;
  target = { ...next };
  viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === name)));
  if (!loaded || disposed) {
    fallback.dataset.staticView = name;
    const figures = [...fallback.querySelectorAll("figure")];
    figures.forEach((figure, index) => { figure.hidden = (name === "position" ? index !== 0 : index !== 1); });
  }
  requestFrame();
}

function resize() {
  if (!renderer) return;
  const width = Math.max(stage.clientWidth, 280);
  // Match the CSS viewport breakpoint, not the narrower grid column width.
  const height = matchMedia('(max-width: 620px)').matches ? 270 : 340;
  renderer.setPixelRatio(fixedView ? .75 : Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function recordFrame(time) {
  if (!lastTime) { lastTime = time; return; }
  const delta = time - lastTime;
  lastTime = time;
  if (dragging || Math.abs(target.x - rotation.x) > .002 || Math.abs(target.y - rotation.y) > .002) sample.push(delta);
  if (sample.length < 90) return;
  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const fps = 1000 / mean;
  const row = { frames: sample.length, fps: Number(fps.toFixed(1)), dpr: renderer.getPixelRatio(), at: new Date().toISOString() };
  window.__kidneyMetrics.windows.push(row);
  if (window.__kidneyMetrics.windows.length > 30) window.__kidneyMetrics.windows.shift();
  sample = [];
  low35Windows = fps < 35 ? low35Windows + 1 : 0;
  if (low35Windows >= 3 && !fixedView) {
    fixedView = true;
    window.__kidneyMetrics.mode = "reduced-pixels-fixed-view";
    target = { ...views[activeView] };
    rotation = { ...target };
    low30Windows = 0;
    resize();
    return;
  }
  low30Windows = fixedView && fps < 30 ? low30Windows + 1 : 0;
  if (low30Windows >= 3) useStaticFallback();
}

function render(time = performance.now()) {
  frameId = null;
  if (!renderer || !visible || document.hidden || disposed) return;
  const easing = reduceMotion || fixedView ? 1 : .15;
  rotation.x += (target.x - rotation.x) * easing;
  rotation.y += (target.y - rotation.y) * easing;
  organ.rotation.set(rotation.x, rotation.y, -.12);
  renderer.render(scene, camera);
  window.__kidneyMetrics.renderCount++;
  if (window.__kidneyMetrics.paintedPixels === 0) {
    const gl = renderer.getContext();
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let painted = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 0) painted += 1;
    window.__kidneyMetrics.paintedPixels = painted;
  }
  recordFrame(time);
  const moving = dragging || Math.abs(target.x - rotation.x) > .002 || Math.abs(target.y - rotation.y) > .002;
  if (moving) requestFrame();
  else lastTime = 0;
}

function requestFrame() {
  if (frameId === null && loaded && renderer && visible && !document.hidden && !disposed) frameId = requestAnimationFrame(render);
}

function useStaticFallback() {
  window.__kidneyMetrics.mode = "static-fallback";
  fallback.hidden = false;
  renderer?.domElement.remove();
  dispose();
  chooseView(activeView);
  enable.hidden = true;
}

function dispose() {
  if (disposed) return;
  disposed = true;
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  organ?.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
  environment?.dispose();
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  events.abort();
  renderer?.dispose();
  renderer?.forceContextLoss?.();
}

async function activate() {
  if (loaded || disposed) return;
  enable.disabled = true;
  try {
    const [threeModule, loaderModule, meshoptModule] = await Promise.all([
      import("/assets/vendor/three.module.min.js"),
      import("/assets/vendor/GLTFLoader.js"),
      import("/assets/vendor/meshopt_decoder.module.js"),
    ]);
    if (disposed) return;
    THREE = threeModule;
    const { GLTFLoader } = loaderModule;
    const { MeshoptDecoder } = meshoptModule;
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Rim em três dimensões. Arraste ou use as setas. Tecla 1: Posição. Tecla 2: Entrada do sangue.");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
    camera.position.set(0, .8, 3.15);
    camera.lookAt(0, .8, 0);
    scene.add(new THREE.HemisphereLight(0xffeee5, 0x62534d, .45));
    const key = new THREE.DirectionalLight(0xffeee4, 2); key.position.set(-3, 4, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe5edff, .5); fill.position.set(3, 1, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff0e7, .85); rim.position.set(2, 3, -3); scene.add(rim);
    // Direct lights keep startup reliable in embedded browsers that stall on PMREM generation.
    scene.environment = null;
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync("/assets/kidney.glb");
    const model = gltf.scene;
    if (disposed) {
      model.traverse(o => {o.geometry?.dispose(); if(o.material){for(const v of Object.values(o.material))if(v?.isTexture)v.dispose();o.material.dispose();}});
      return;
    }
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.6 / Math.max(size.x, size.y, size.z);
    const center = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); holder.name = 'NormalizationHolder';
    holder.scale.setScalar(scale);
    holder.position.set(-center.x*scale, -box.min.y*scale, -center.z*scale);
    holder.add(model);
    organ = new THREE.Group();
    organ.name = 'InteractionGroup';
    organ.add(holder);
    scene.add(organ);
    stage.insertBefore(canvas, fallback);
    fallback.hidden = true;
    loaded = true;
    enable.textContent = "3D ativo";
    enable.setAttribute("aria-label", "Visualização 3D ativa. Arraste diretamente sobre o rim para girar.");
    window.__kidneyMetrics.assetLoaded = true;
    window.__kidneyMetrics.mode = "interactive";
    resize();

    let px = 0, py = 0;
    canvas.addEventListener("pointerdown", (event) => {
      dragging = true; lastTime = 0; sample = []; px = event.clientX; py = event.clientY;
      canvas.setPointerCapture(event.pointerId); requestFrame();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      target.y += (event.clientX - px) * .014;
      target.x = Math.max(-.7, Math.min(.7, target.x + (event.clientY - py) * .010));
      px = event.clientX; py = event.clientY; requestFrame();
    });
    const stop = (event) => { dragging = false; try { canvas.releasePointerCapture(event.pointerId); } catch {} };
    canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("keydown", (event) => {
      if (event.key === '1' || event.key === '2') { chooseView(event.key === '1' ? 'position' : 'hilum'); event.preventDefault(); return; }
      const step = .12;
      if (event.key === "ArrowLeft") target.y -= step;
      else if (event.key === "ArrowRight") target.y += step;
      else if (event.key === "ArrowUp") target.x = Math.max(-.7, target.x - step);
      else if (event.key === "ArrowDown") target.x = Math.min(.7, target.x + step);
      else return;
      event.preventDefault(); requestFrame();
    });
    visible = stage.getBoundingClientRect().bottom > 0 && stage.getBoundingClientRect().top < innerHeight;
    requestFrame();
    canvas.addEventListener('webglcontextlost', event => {event.preventDefault();useStaticFallback();}, {signal:events.signal});
  } catch (error) {
    console.warn("Falha ao iniciar o módulo renal; vistas estáticas preservadas.", error);
    useStaticFallback();
  }
}

if (stage && enable && fallback) {
  viewButtons.forEach((button) => button.addEventListener("click", () => chooseView(button.dataset.view)));
  enable.addEventListener("click", activate, { once: true });
  resizeObserver = new ResizeObserver(() => { resize(); requestFrame(); }); resizeObserver.observe(stage);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastTime = 0; sample = [];
    if (!visible && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    } else if (visible) {
      requestFrame();
    }
  }); intersectionObserver.observe(stage);
  document.addEventListener("visibilitychange", () => {
    lastTime = 0; sample = [];
    if (document.hidden) {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    } else {
      requestFrame();
    }
  }, {signal:events.signal});
  addEventListener("pagehide", dispose, { once: true });
  addEventListener('pageshow', event => { if (event.persisted && disposed) useStaticFallback(); });
  chooseView("position");
  if ("requestIdleCallback" in window) requestIdleCallback(() => activate(), { timeout: 900 });
  else setTimeout(activate, 250);
}
