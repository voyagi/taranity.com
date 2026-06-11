/**
 * The Atlas WebGL journey: a particle globe with graticule rings inside a
 * starfield, travelled by a scroll-driven camera with gentle pointer
 * parallax. Pure atmosphere: the canvas is aria-hidden, sits behind the
 * content, and the page is complete without it (.a-field is the fallback).
 *
 * Lean by construction (rule 6): lazy-loaded after first paint by
 * atlas-motion.ts, one renderer, two point-cloud draw calls plus a handful
 * of line loops, DPR capped, smaller counts on narrow viewports, paused
 * while the tab is hidden, and fully disposed on teardown so a
 * View-Transition swap never leaks a context.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface AtlasScene {
  destroy(): void;
}

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vAlpha = 0.75 + 0.25 * sin(uTime * 0.9 + aPhase);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * (13.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor, disc * vAlpha * uOpacity);
  }
`;

/* Cheap layered-sine field: stable, periodic, and organic enough to cluster
   the globe's particles into continents without shipping a noise library. */
function field(x: number, y: number, z: number): number {
  return (
    Math.sin(3.1 * x + 1.3) * Math.sin(4.7 * y + 2.1) * Math.sin(3.7 * z + 4.2) +
    0.5 * Math.sin(8.3 * x) * Math.sin(7.1 * y + 1.7) * Math.sin(9.2 * z + 3.3)
  );
}

function pointsMaterial(pixelRatio: number, opacity: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/* The globe: a fibonacci-sphere point cloud, displaced and coloured by the
   field so land masses glow ion-blue over a dim slate ocean. */
function buildGlobe(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const land = new Color('#7cc7ff');
  const ocean = new Color('#33476b');
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const y = 1 - t * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    const n = field(x, y, z);
    const isLand = n > 0.18;
    const r = 1 + 0.03 * n;
    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;
    const c = isLand ? land : ocean;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = isLand ? 1.5 : 0.8;
    phases[i] = (Math.abs(n) * 43.7) % (Math.PI * 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  return geometry;
}

/* The starfield: a hollow shell around the whole camera path. Positions come
   from the same deterministic field (no Math.random: a reload never reshuffles
   the sky, and the build stays reproducible). */
function buildStars(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const cold = new Color('#cfe2ff');
  const warm = new Color('#9fb4d8');
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random from the index (golden-ratio scramble).
    const u = (i * 0.6180339887) % 1;
    const v = (i * 0.7548776662) % 1;
    const w = (i * 0.5698402909) % 1;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const radius = 6 + w * 8;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.6; // squashed: a band, not a ball
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const c = u > 0.5 ? cold : warm;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = 0.5 + v * 1.1;
    phases[i] = w * Math.PI * 2;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  return geometry;
}

/* Graticule rings around the globe: the astrolabe that makes it an atlas. */
function buildRings(): { group: Group; geometries: BufferGeometry[]; material: LineBasicMaterial } {
  const material = new LineBasicMaterial({
    color: new Color('#7cc7ff'),
    transparent: true,
    opacity: 0.14,
  });
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const segments = 128;
  const tilts: Array<[number, number, number]> = [
    [Math.PI / 2, 0, 0],
    [Math.PI / 2.6, 0, Math.PI / 5],
    [Math.PI / 1.7, 0, -Math.PI / 3.2],
  ];
  for (const [rx, ry, rz] of tilts) {
    const pts: number[] = [];
    const radius = 1.42;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pts, 3));
    geometries.push(geometry);
    const ring = new LineLoop(geometry, material);
    ring.rotation.set(rx, ry, rz);
    group.add(ring);
  }
  return { group, geometries, material };
}

/* The route: camera keyframes over scroll progress. Hero frames the globe
   right of the type; the journey orbits it, climbs over the method, then
   pulls away for the contact close. */
const POSES: Array<{ p: number; pos: Vector3; look: Vector3 }> = [
  { p: 0.0, pos: new Vector3(-1.9, 0.35, 4.3), look: new Vector3(-0.95, 0.08, 0) },
  { p: 0.22, pos: new Vector3(-0.5, 0.7, 3.3), look: new Vector3(-0.1, 0.15, 0) },
  { p: 0.48, pos: new Vector3(1.8, 0.3, 3.5), look: new Vector3(0.7, 0.05, 0) },
  { p: 0.74, pos: new Vector3(0.3, 1.6, 4.0), look: new Vector3(0, 0.25, 0) },
  { p: 1.0, pos: new Vector3(0, 0.2, 6.6), look: new Vector3(0, 0, 0) },
];

function poseAt(progress: number, outPos: Vector3, outLook: Vector3): void {
  const p = MathUtils.clamp(progress, 0, 1);
  let i = 0;
  while (i < POSES.length - 2 && p > POSES[i + 1].p) i++;
  const a = POSES[i];
  const b = POSES[i + 1];
  const t = MathUtils.smoothstep(p, a.p, b.p);
  outPos.lerpVectors(a.pos, b.pos, t);
  outLook.lerpVectors(a.look, b.look, t);
}

export function createAtlasScene(root: HTMLElement): AtlasScene | null {
  const container = root.querySelector<HTMLElement>('[data-a-gl]');
  if (!container) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch {
    return null; // WebGL unavailable: the .a-field backdrop carries the page
  }

  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 40);

  const globeGeometry = buildGlobe(narrow ? 3200 : 6500);
  const globeMaterial = pointsMaterial(pixelRatio, 0.9);
  const starsGeometry = buildStars(narrow ? 900 : 1600);
  const starsMaterial = pointsMaterial(pixelRatio, 0.7);
  const rings = buildRings();

  const globe = new Group();
  globe.add(new Points(globeGeometry, globeMaterial));
  globe.add(rings.group);
  scene.add(globe);
  scene.add(new Points(starsGeometry, starsMaterial));

  const canvas = renderer.domElement;
  container.appendChild(canvas);

  // ---- the journey ----
  const targetPos = new Vector3();
  const targetLook = new Vector3();
  const currentLook = new Vector3();
  let pointerX = 0;
  let pointerY = 0;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  poseAt(0, targetPos, targetLook);
  camera.position.copy(targetPos);
  currentLook.copy(targetLook);
  camera.lookAt(currentLook);

  let raf = 0;
  let running = false;
  let destroyed = false;
  let lastTime = 0;
  let elapsed = 0;

  const frame = (time: number) => {
    raf = requestAnimationFrame(frame);
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    lastTime = time;
    elapsed += dt;

    const limit = document.documentElement.scrollHeight - window.innerHeight;
    const progress = limit > 0 ? window.scrollY / limit : 0;
    poseAt(progress, targetPos, targetLook);

    // Critically-damped chase: the camera trails the route and the pointer,
    // so wheel steps and mouse moves arrive as drift, never as snaps.
    const ease = 1 - Math.exp(-3 * dt);
    camera.position.x = MathUtils.lerp(camera.position.x, targetPos.x + pointerX * 0.22, ease);
    camera.position.y = MathUtils.lerp(camera.position.y, targetPos.y - pointerY * 0.14, ease);
    camera.position.z = MathUtils.lerp(camera.position.z, targetPos.z, ease);
    currentLook.lerp(targetLook, ease);
    camera.lookAt(currentLook);

    globe.rotation.y += dt * 0.05;
    globeMaterial.uniforms.uTime.value = elapsed;
    starsMaterial.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running || destroyed) return;
    running = true;
    lastTime = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // ---- listeners ----
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  const onPointerMove = (e: PointerEvent) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };
  // A lost context cannot be drawn to: fall back to the CSS field rather
  // than leaving a black hole behind the content.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    destroy();
    root.setAttribute('data-gl', 'off');
  };

  window.addEventListener('resize', onResize);
  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);

  start();
  container.classList.add('is-live');

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    window.removeEventListener('resize', onResize);
    if (finePointer) window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    globeGeometry.dispose();
    globeMaterial.dispose();
    starsGeometry.dispose();
    starsMaterial.dispose();
    rings.geometries.forEach((g) => g.dispose());
    rings.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    container?.classList.remove('is-live');
  }

  return { destroy };
}
