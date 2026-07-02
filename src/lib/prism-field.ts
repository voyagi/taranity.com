/**
 * Prism's living colour field, a small bundled island (imported from Prism.astro
 * via `<script>import`, so it compiles to /_astro/*.js under script-src 'self'
 * and adds ZERO CSP inline hashes; astro.config.mjs pins it to its own chunk).
 *
 * One raw WebGL1 fullscreen triangle running a domain-warped fbm fragment
 * shader: a slow iridescent field (deep violet-indigo base; periwinkle, magenta,
 * cyan, and soft green highlights) that the whole page floats on. No three.js:
 * a single program with two uniforms does not need a scene graph, and skipping
 * the library keeps the chunk tiny.
 *
 * Progressive enhancement: the canvas starts transparent and the static CSS
 * gradient fallback (.pr-field-fallback) sits UNDER it, so no-JS, no-WebGL, a
 * blocked script, or a lost context all degrade to the same still gradient.
 * The field is pure atmosphere (aria-hidden); the page is complete without it.
 */

interface FieldHandle {
  root: HTMLElement;
  destroy(): void;
}

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/* The field's readability guarantee, shared with tests/unit/prism-css.test.ts:
   the shader's LAST colour operation hard-caps every pixel's linear luminance
   at this value, so worst-case WCAG contrast against the on-field text colours
   is a computable constant, not a hope. 0.126 gives ~5.3:1 for the near-white
   ink and >=3:1 (large text) for the pale hero accent. */
export const FIELD_MAX_LINEAR_LUMINANCE = 0.126;

/* Value-noise fbm, domain-warped twice (Quilez-style: f(p + k*f(p + k*f(p)))).
   The warp is what makes the colours FLOW into each other instead of drifting
   as static blobs. Every highlight mix is weight-capped, a luminance soft-cap
   shapes the brightest pools, and the hard ceiling above bounds what any pixel
   can reach. Exported so the contrast test reads the same shader source. */
export const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * vnoise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime * 0.045;

  vec2 q = vec2(
    fbm(p * 1.4 + vec2(0.0, t)),
    fbm(p * 1.4 + vec2(5.2, 1.3) - t * 0.8)
  );
  vec2 r = vec2(
    fbm(p * 1.4 + 1.9 * q + vec2(1.7, 9.2) + 0.25 * t),
    fbm(p * 1.4 + 1.9 * q + vec2(8.3, 2.8) - 0.2 * t)
  );
  float f = fbm(p * 1.4 + 2.2 * r);

  vec3 base = vec3(0.055, 0.045, 0.100);
  vec3 indigo = vec3(0.160, 0.130, 0.340);
  vec3 peri = vec3(0.482, 0.498, 0.949);
  vec3 mag = vec3(0.910, 0.420, 0.816);
  vec3 cya = vec3(0.400, 0.878, 0.839);
  vec3 grn = vec3(0.624, 0.910, 0.439);

  /* Highlight weights sit deliberately high (the field must read as a VIVID
     iridescence, not a dark nebula); the luminance soft-cap below remains the
     guard that keeps text zones readable no matter how the pools stack. */
  vec3 col = mix(base, indigo, smoothstep(0.2, 0.9, f));
  col = mix(col, peri, smoothstep(0.40, 0.82, q.x) * 0.46);
  col = mix(col, mag, smoothstep(0.45, 0.88, r.y) * 0.36);
  col = mix(col, cya, smoothstep(0.45, 0.92, q.y) * smoothstep(0.3, 0.8, r.x) * 0.40);
  col = mix(col, grn, smoothstep(0.60, 0.95, r.x * f + 0.2) * 0.16);

  /* Luminance soft-cap: where several highlight mixes stack, pull the colour
     back toward dark so #f4f2fb text keeps contrast over every pool. */
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col *= 1.0 - 0.35 * smoothstep(0.30, 0.72, lum);

  /* Gentle edge vignette: darkens the borders so the poster type at the
     viewport edges always sits on the deepest part of the field. */
  float d = length(uv - 0.5) * 1.5;
  col *= 1.0 - 0.3 * smoothstep(0.45, 1.1, d);

  /* HARD luminance ceiling, in LINEAR space, as the last colour op: scaling
     the sRGB channels by k scales linear luminance by k^2.2, so the clamp is
     exact. This is the guarantee the contrast unit test relies on. */
  vec3 lin = pow(col, vec3(2.2));
  float L = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  if (L > ${FIELD_MAX_LINEAR_LUMINANCE.toFixed(4)}) {
    col *= pow(${FIELD_MAX_LINEAR_LUMINANCE.toFixed(4)} / L, 1.0 / 2.2);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/* A fixed shader time for the single reduced-motion frame: far enough into the
   warp that the still frame shows a fully developed field, not the flat start. */
const STILL_TIME = 40;
const MAX_DPR = 1.5;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // A compile failure is a build-time authoring bug, not a runtime condition;
    // surface it for development and let the CSS fallback carry production.
    console.error('prism-field shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createField(root: HTMLElement): FieldHandle | null {
  const canvasEl = root.querySelector<HTMLCanvasElement>('[data-prism-canvas]');
  if (!canvasEl) return null;
  // Re-bind under the non-null type: narrowing does not reach the hoisted
  // destroy() declaration below, and a `!` at every use would hide real bugs.
  const canvas: HTMLCanvasElement = canvasEl;

  const glMaybe = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!glMaybe) return null; // WebGL unavailable: the static gradient fallback carries the page
  // Same non-null re-bind as the canvas above, for the hoisted destroy().
  const gl: WebGLRenderingContext = glMaybe;

  const vert = compile(gl, gl.VERTEX_SHADER, VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vert || !frag || !program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('prism-field program link failed:', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // One fullscreen triangle (three vertices overshooting clip space): fewer
  // vertices than a quad and no diagonal seam.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'uTime');
  const uRes = gl.getUniformLocation(program, 'uRes');

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  let raf = 0;
  let running = false;
  let destroyed = false;
  let resizeTimer = 0;
  const started = performance.now();

  const applySize = (): boolean => {
    // DPR capped: the field is soft noise, so extra device pixels buy nothing
    // visible and cost fill rate on every frame.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // Size from the canvas rect (CSS pins the field to 100lvh): mobile URL-bar
    // and soft-keyboard viewport changes fire 'resize' without moving the rect,
    // and skipping them avoids reallocating the drawing buffer mid-typing.
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (width === canvas.width && height === canvas.height) return false;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uRes, width, height);
    return true;
  };

  const draw = (seconds: number) => {
    gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    draw((now - started) / 1000);
  };

  const start = () => {
    if (running || destroyed || reducedMotion) return;
    running = true;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // Coalesce resize bursts (a window drag fires dozens per second, and each
  // canvas resize reallocates the drawing buffer). Under reduced motion the
  // loop is stopped, so redraw the single still frame at the new size.
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      // applySize() is false when the rect did not change (mobile URL-bar and
      // soft-keyboard resizes): skip the redundant still-frame redraw too.
      if (applySize() && reducedMotion) draw(STILL_TIME);
    }, 150);
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };
  // Live preference change (the OS toggle mid-visit): settle on the still
  // frame, or start animating, without waiting for a reload.
  const onMotionChange = () => {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) {
      stop();
      draw(STILL_TIME);
    } else {
      start();
    }
  };
  // A lost context cannot be drawn to: tear down and let the CSS gradient
  // fallback show through rather than leaving a stale or black canvas.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    destroy();
  };

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  motionQuery.addEventListener('change', onMotionChange);
  canvas.addEventListener('webglcontextlost', onContextLost);

  applySize();
  if (reducedMotion) {
    // Exactly one static frame: the visitor still gets the iridescent field,
    // just as a still image, and no animation loop ever starts.
    draw(STILL_TIME);
  } else {
    start();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    stop();
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    motionQuery.removeEventListener('change', onMotionChange);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    // Release the GPU context eagerly: view-transition swaps would otherwise
    // stack live contexts until the browser starts evicting them.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  return { root, destroy };
}

let active: FieldHandle | null = null;

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-prism-field]');
  // A client-side navigation swaps the DOM: destroy the field bound to the
  // removed element (its rAF loop and GL context would otherwise leak).
  if (active && active.root !== root) {
    active.destroy();
    active = null;
  }
  if (!root || root.dataset.prismBound) return;
  root.dataset.prismBound = '1';
  active = createField(root);
}

// Bind on first load and after each client-side navigation (Astro view
// transitions). Guarded so the module stays importable from the node test
// environment (the contrast unit test imports the constants above).
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
