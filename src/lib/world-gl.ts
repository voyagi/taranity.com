/**
 * "World" 3D design controller. Gates the heavy Three.js scene and only
 * dynamically imports it (./world-gl-scene → its own lazy chunk) when:
 *   design = world  AND  desktop+fine-pointer  AND  not prefers-reduced-motion
 *   AND  WebGL is available.
 * Otherwise the World design falls back to its CSS cosmic gradient (REWORK-PLAN
 * A8). Mirrors aurora-gl.ts: a `running` flag (single RAF chain across hide/show
 * and teardown), stale-state guards, async-mount race protection via a generation
 * token, and a full dispose on switch (R10). The canvas lives in the persisted
 * .world-bg, so it survives View-Transition navigation.
 */
import type { WorldColors, WorldController } from './world-gl-scene';

const mq = (q: string) => window.matchMedia(q);
const reduceMotion = () => mq('(prefers-reduced-motion: reduce)').matches;
const isDesktop = () => mq('(min-width: 1024px)').matches && mq('(hover: hover) and (pointer: fine)').matches;

interface State {
  canvas: HTMLCanvasElement;
  controller: WorldController;
  raf: number;
  running: boolean;
  mouse: [number, number];
  mouseTarget: [number, number];
  scrollSmooth: number;
  scrollTarget: number;
  start: number;
  onMouse: (e: MouseEvent) => void;
  onScroll: () => void;
  onResize: () => void;
}

let state: State | null = null;
let mounting = false;
let booted = false;
let generation = 0; // bumped on unmount to cancel an in-flight async mount

function readColors(): WorldColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
  return {
    bg: v('--world-bg', '#05050f'),
    crystal: v('--world-crystal', '#8b93ff'),
    emissive: v('--world-emissive', '#3b1d6e'),
    light1: v('--world-l1', '#22d3ee'),
    light2: v('--world-l2', '#e879f9'),
  };
}

function shouldRun(): boolean {
  return (
    document.documentElement.getAttribute('data-design') === 'world' &&
    isDesktop() &&
    !reduceMotion()
  );
}

function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

async function mount() {
  if (state || mounting) return;
  const holder = document.querySelector<HTMLElement>('.world-bg');
  if (!holder) return;
  // Don't fetch the heavy Three.js chunk on browsers without WebGL (M6) — the
  // CSS cosmic fallback covers them.
  if (!document.createElement('canvas').getContext('webgl2')) return;
  mounting = true;
  const gen = generation;
  try {
    const mod = await import('./world-gl-scene');
    // Conditions may have changed during the async import.
    if (gen !== generation || state || !shouldRun()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'world-gl';
    const controller = mod.createWorld(canvas, readColors());
    if (!controller) return;

    const s: State = {
      canvas, controller, raf: 0, running: true,
      mouse: [0.5, 0.5], mouseTarget: [0.5, 0.5],
      scrollSmooth: scrollProgress(), scrollTarget: scrollProgress(), start: performance.now(),
      onMouse: (e) => { s.mouseTarget = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight]; },
      onScroll: () => { s.scrollTarget = scrollProgress(); },
      onResize: () => resize(s),
    };
    window.addEventListener('mousemove', s.onMouse, { passive: true });
    window.addEventListener('scroll', s.onScroll, { passive: true });
    window.addEventListener('resize', s.onResize, { passive: true });
    // Assign the singleton BEFORE touching the DOM, so any later throw is cleaned
    // up by unmount() rather than orphaning the canvas / world-gl-on class (H1).
    state = s;
    holder.appendChild(canvas);
    document.documentElement.classList.add('world-gl-on');
    // Absorb any theme/mode change that arrived during the async import (M3).
    controller.setColors(readColors());
    resize(s);
    s.raf = requestAnimationFrame((now) => render(s, now));
  } catch {
    if (state) unmount(); // partial mount — clean up so nothing leaks
  } finally {
    mounting = false;
  }
}

function resize(s: State) {
  if (state !== s) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  s.controller.resize(window.innerWidth, window.innerHeight, dpr);
}

function render(s: State, now: number) {
  if (state !== s || !s.running) return;
  s.mouse[0] += (s.mouseTarget[0] - s.mouse[0]) * 0.05;
  s.mouse[1] += (s.mouseTarget[1] - s.mouse[1]) * 0.05;
  s.scrollSmooth += (s.scrollTarget - s.scrollSmooth) * 0.06;
  s.controller.render((now - s.start) / 1000, s.mouse, s.scrollSmooth);
  s.raf = requestAnimationFrame((t) => render(s, t));
}

function unmount() {
  const s = state;
  if (!s) return;
  state = null;
  s.running = false;
  generation++; // cancel any in-flight mount
  cancelAnimationFrame(s.raf);
  window.removeEventListener('mousemove', s.onMouse);
  window.removeEventListener('scroll', s.onScroll);
  window.removeEventListener('resize', s.onResize);
  s.controller.dispose();
  s.canvas.remove();
  document.documentElement.classList.remove('world-gl-on');
}

function sync() {
  if (shouldRun()) {
    if (state) state.controller.setColors(readColors());
    else void mount();
  } else if (state) {
    unmount();
  }
}

export function initWorldGL() {
  if (booted) return;
  booted = true;
  sync();
  document.addEventListener('theme:change', sync);
  mq('(prefers-reduced-motion: reduce)').addEventListener('change', sync);
  mq('(min-width: 1024px)').addEventListener('change', sync);
  mq('(hover: hover) and (pointer: fine)').addEventListener('change', sync);
  document.addEventListener('visibilitychange', () => {
    const s = state;
    if (!s) return;
    if (document.hidden) {
      s.running = false;
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    } else if (!s.running) {
      s.running = true;
      s.raf = requestAnimationFrame((t) => render(s, t));
    }
  });
}
