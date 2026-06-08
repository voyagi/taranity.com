/**
 * The "World" 3D scene (Three.js). Imported only by world-gl.ts via a dynamic
 * import, so three lands in its own lazy chunk and never touches the default
 * design's bundle/CWV. A field of drifting low-poly crystals in a fogged volume;
 * the camera parallaxes to the cursor and dollies with scroll. Theme-coloured
 * from CSS vars. Returns a small controller (render / resize / setColors / dispose).
 */
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  InstancedMesh,
  IcosahedronGeometry,
  MeshStandardMaterial,
  AmbientLight,
  PointLight,
  FogExp2,
  Color,
  Object3D,
  Vector3,
  Euler,
} from 'three';

export interface WorldColors {
  bg: string;
  crystal: string;
  emissive: string;
  light1: string;
  light2: string;
}

interface Instance {
  base: Vector3;
  rot: Euler;
  spin: Vector3; // per-axis angular velocity
  drift: number; // bob speed
  phase: number;
  scale: number;
}

export interface WorldController {
  render: (tSec: number, mouse: [number, number], scroll: number) => void;
  resize: (w: number, h: number, dpr: number) => void;
  setColors: (c: WorldColors) => void;
  dispose: () => void;
}

const COUNT = 220;

export function createWorld(canvas: HTMLCanvasElement, colors: WorldColors): WorldController | null {
  // The WebGLRenderer constructor creates the GL context synchronously and can
  // throw on context exhaustion (browsers cap simultaneous contexts) — guard it.
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) {
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }

  const scene = new Scene();
  const fog = new FogExp2(new Color(colors.bg).getHex(), 0.035);
  scene.fog = fog;
  scene.background = new Color(colors.bg);

  const camera = new PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0, 0, 16);

  const geometry = new IcosahedronGeometry(0.5, 0);
  const material = new MeshStandardMaterial({
    color: new Color(colors.crystal),
    emissive: new Color(colors.emissive),
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.15,
    flatShading: true,
  });

  const mesh = new InstancedMesh(geometry, material, COUNT);
  const dummy = new Object3D();
  const instances: Instance[] = [];

  // Deterministic pseudo-random (no Math.random — keep it stable & SSR-safe-ish).
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let i = 0; i < COUNT; i++) {
    const inst: Instance = {
      // z kept in front of the camera's closest dolly (z=11) so crystals never
      // cross the near plane and pop (M1): range ~[-40, 4].
      base: new Vector3((rnd() - 0.5) * 34, (rnd() - 0.5) * 24, (rnd() - 0.5) * 44 - 18),
      rot: new Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28),
      spin: new Vector3((rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4),
      drift: 0.2 + rnd() * 0.5,
      phase: rnd() * 6.28,
      scale: 0.4 + rnd() * 1.5,
    };
    instances.push(inst);
    dummy.position.copy(inst.base);
    dummy.rotation.copy(inst.rot);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  const ambient = new AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const p1 = new PointLight(new Color(colors.light1), 120, 90);
  p1.position.set(14, 10, 14);
  scene.add(p1);
  const p2 = new PointLight(new Color(colors.light2), 90, 90);
  p2.position.set(-16, -8, 8);
  scene.add(p2);

  return {
    render(tSec, mouse, scroll) {
      // Camera parallax toward cursor + dolly with scroll.
      const tx = (mouse[0] - 0.5) * 6;
      const ty = (mouse[1] - 0.5) * 4;
      camera.position.x += (tx - camera.position.x) * 0.04;
      camera.position.y += (ty - camera.position.y) * 0.04;
      camera.position.z = 16 - scroll * 5;
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < COUNT; i++) {
        const it = instances[i];
        const bob = Math.sin(tSec * it.drift + it.phase) * 0.8;
        dummy.position.set(it.base.x, it.base.y + bob, it.base.z);
        dummy.rotation.set(
          it.rot.x + tSec * it.spin.x,
          it.rot.y + tSec * it.spin.y,
          it.rot.z + tSec * it.spin.z,
        );
        dummy.scale.setScalar(it.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    },
    resize(w, h, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setColors(c) {
      material.color.set(c.crystal);
      material.emissive.set(c.emissive);
      const bg = new Color(c.bg);
      scene.background = bg;
      fog.color = bg;
      p1.color.set(c.light1);
      p2.color.set(c.light2);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
