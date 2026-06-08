/**
 * Aurora WebGL hero — a single full-screen fragment shader that flows in the
 * theme's aurora colours and reacts to the cursor + scroll. Raw WebGL2 (no
 * dependency, ~CSP-clean: shaders compile on the GPU, no JS eval).
 *
 * Progressive enhancement (REWORK-PLAN A7/A8): the CSS blob mesh (.aurora-bg b)
 * paints instantly and is the fallback. This upgrades it AFTER load, and only when
 *   design = aurora  AND  desktop+fine-pointer  AND  not prefers-reduced-motion
 *   AND  WebGL2 is available.
 * It mounts/unmounts on theme + capability changes and tears the GL context down
 * cleanly (R10). The canvas lives inside the persisted .aurora-bg element, so it
 * survives View-Transition navigations without re-initialising.
 */

const mq = (q: string) => window.matchMedia(q);
const reduceMotion = () => mq('(prefers-reduced-motion: reduce)').matches;
const isDesktop = () => mq('(min-width: 1024px)').matches && mq('(hover: hover) and (pointer: fine)').matches;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) {
    console.warn(`[aurora-gl] could not parse colour "${hex}" — using grey`);
    return [0.5, 0.5, 0.5];
  }
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 frag;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;   // 0..1
uniform float u_scroll; // smoothed scroll velocity, ~ -1..1
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;
uniform float u_light;  // 1 = light theme (stay pale for readable text)

float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = u_time * 0.05;
  vec2 m = (u_mouse - 0.5) * vec2(asp, 1.0);

  vec2 q = p;
  q += 0.20 * vec2(fbm(p * 2.0 + t), fbm(p * 2.0 - t + 5.2));
  q += 0.14 * m;
  q.y += u_scroll * 0.18;

  float n1 = fbm(q * 2.4 + vec2(t * 1.4, -t));
  float n2 = fbm(q * 1.3 - vec2(t, t * 0.7) + 11.0);

  vec3 col = mix(u_c1, u_c2, smoothstep(0.2, 0.85, n1));
  col = mix(col, u_c3, smoothstep(0.30, 0.92, n2));

  float intensity = smoothstep(0.08, 0.92, n1 * 0.6 + n2 * 0.4);
  // Light theme stays pale so dark body text keeps AA contrast; dark theme glows.
  float strength = u_light > 0.5 ? intensity * 0.5 : intensity * 0.9;
  vec3 outc = mix(u_bg, col, strength);
  frag = vec4(outc, 1.0);
}`;

interface GLState {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  u: Record<string, WebGLUniformLocation | null>;
  raf: number;
  running: boolean;
  mouse: [number, number];
  mouseTarget: [number, number];
  scrollVel: number;
  lastScrollY: number;
  start: number;
  onMouse: (e: MouseEvent) => void;
  onScroll: () => void;
  onResize: () => void;
}

let state: GLState | null = null;
let booted = false;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => (cs.getPropertyValue(name).trim() || fb);
  return {
    c1: hexToRgb(v('--aurora-1', '#a78bfa')),
    c2: hexToRgb(v('--aurora-2', '#67e8f9')),
    c3: hexToRgb(v('--aurora-3', '#f0abfc')),
    bg: hexToRgb(v('--bg', '#f6f4ff')),
    light: document.documentElement.getAttribute('data-mode') === 'light' ? 1 : 0,
  };
}

function mount(): boolean {
  if (state) return true;
  const holder = document.querySelector<HTMLElement>('.aurora-bg');
  if (!holder) return false;

  const canvas = document.createElement('canvas');
  canvas.className = 'aurora-gl';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return false;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return false;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return false;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Full-screen triangle.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(program);
  const u = {
    res: gl.getUniformLocation(program, 'u_res'),
    time: gl.getUniformLocation(program, 'u_time'),
    mouse: gl.getUniformLocation(program, 'u_mouse'),
    scroll: gl.getUniformLocation(program, 'u_scroll'),
    c1: gl.getUniformLocation(program, 'u_c1'),
    c2: gl.getUniformLocation(program, 'u_c2'),
    c3: gl.getUniformLocation(program, 'u_c3'),
    bg: gl.getUniformLocation(program, 'u_bg'),
    light: gl.getUniformLocation(program, 'u_light'),
  };

  holder.appendChild(canvas);
  document.documentElement.classList.add('aurora-gl-on');

  const s: GLState = {
    canvas, gl, program, buffer, u, raf: 0, running: true,
    mouse: [0.5, 0.5], mouseTarget: [0.5, 0.5],
    scrollVel: 0, lastScrollY: window.scrollY, start: performance.now(),
    onMouse: (e) => { s.mouseTarget = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight]; },
    onScroll: () => {
      const y = window.scrollY;
      s.scrollVel += (y - s.lastScrollY) * 0.001;
      s.lastScrollY = y;
    },
    onResize: () => resize(s),
  };
  applyColors(s);
  resize(s);
  window.addEventListener('mousemove', s.onMouse, { passive: true });
  window.addEventListener('scroll', s.onScroll, { passive: true });
  window.addEventListener('resize', s.onResize, { passive: true });
  state = s;
  s.raf = requestAnimationFrame((now) => render(s, now));
  return true;
}

function applyColors(s: GLState) {
  const { gl, u } = s;
  const c = readColors();
  gl.useProgram(s.program);
  if (u.c1 !== null) gl.uniform3fv(u.c1, c.c1);
  if (u.c2 !== null) gl.uniform3fv(u.c2, c.c2);
  if (u.c3 !== null) gl.uniform3fv(u.c3, c.c3);
  if (u.bg !== null) gl.uniform3fv(u.bg, c.bg);
  if (u.light !== null) gl.uniform1f(u.light, c.light);
}

function resize(s: GLState) {
  if (state !== s) return; // torn down between listener fire and removal
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (s.canvas.width !== w || s.canvas.height !== h) {
    s.canvas.width = w;
    s.canvas.height = h;
  }
  s.gl.viewport(0, 0, w, h);
  if (s.u.res !== null) s.gl.uniform2f(s.u.res, w, h);
}

function render(s: GLState, now: number) {
  if (state !== s || !s.running) return; // torn down or paused
  const { gl, u } = s;
  gl.useProgram(s.program);
  // Ease mouse, decay scroll velocity.
  s.mouse[0] += (s.mouseTarget[0] - s.mouse[0]) * 0.06;
  s.mouse[1] += (s.mouseTarget[1] - s.mouse[1]) * 0.06;
  s.scrollVel *= 0.92;
  const sv = Math.max(-1, Math.min(1, s.scrollVel));
  if (u.time !== null) gl.uniform1f(u.time, (now - s.start) / 1000);
  if (u.mouse !== null) gl.uniform2f(u.mouse, s.mouse[0], s.mouse[1]);
  if (u.scroll !== null) gl.uniform1f(u.scroll, sv);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  s.raf = requestAnimationFrame((t) => render(s, t));
}

function unmount() {
  const s = state;
  if (!s) return;
  state = null; // stops the RAF loop guard
  s.running = false;
  cancelAnimationFrame(s.raf);
  window.removeEventListener('mousemove', s.onMouse);
  window.removeEventListener('scroll', s.onScroll);
  window.removeEventListener('resize', s.onResize);
  const { gl } = s;
  gl.deleteProgram(s.program);
  gl.deleteBuffer(s.buffer);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  s.canvas.remove();
  document.documentElement.classList.remove('aurora-gl-on');
}

function shouldRun(): boolean {
  return (
    document.documentElement.getAttribute('data-design') === 'aurora' &&
    isDesktop() &&
    !reduceMotion()
  );
}

/** Mount/unmount to match current conditions. */
function sync() {
  if (shouldRun()) {
    if (!state) mount();
    else applyColors(state); // theme/mode may have changed
  } else if (state) {
    unmount();
  }
}

export function initAuroraGL() {
  if (booted) return;
  booted = true;
  sync();
  document.addEventListener('theme:change', sync);
  mq('(prefers-reduced-motion: reduce)').addEventListener('change', sync);
  mq('(min-width: 1024px)').addEventListener('change', sync);
  mq('(hover: hover) and (pointer: fine)').addEventListener('change', sync);
  // Pause the GL loop when the tab is hidden (battery / GPU). The `running` flag
  // ensures only one RAF chain exists across hide/show flips.
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
