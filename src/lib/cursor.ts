/**
 * Custom morphing cursor + HUD clock.
 *
 * Targets persisted DOM (rendered once in BaseLayout with transition:persist),
 * and document-level listeners survive Astro View Transitions, so both init once.
 * Disabled entirely on coarse pointers and under prefers-reduced-motion — the
 * real cursor and hit targets are never altered for touch/keyboard users.
 */

let cursorStarted = false;

export function initCursor() {
  if (cursorStarted) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ring = document.querySelector<HTMLElement>('[data-cursor-ring]');
  const dot = document.querySelector<HTMLElement>('[data-cursor-dot]');
  const label = document.querySelector<HTMLElement>('[data-cursor-label]');
  if (!ring || !dot) return;

  cursorStarted = true;
  document.documentElement.classList.add('has-cursor');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    },
    { passive: true },
  );

  const loop = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const SEL = 'a, button, [role="button"], input, textarea, select, summary, label, [data-cursor]';
  document.addEventListener('mouseover', (e) => {
    const t = (e.target as HTMLElement)?.closest?.(SEL) as HTMLElement | null;
    if (!t) return;
    ring.dataset.variant = t.getAttribute('data-cursor') || 'hover';
    if (label) label.textContent = t.getAttribute('data-cursor-text') || '';
  });
  document.addEventListener('mouseout', (e) => {
    const t = (e.target as HTMLElement)?.closest?.(SEL);
    if (!t) return;
    ring.dataset.variant = '';
    if (label) label.textContent = '';
  });

  document.addEventListener('mouseleave', () => {
    ring.style.opacity = '0';
    dot.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    ring.style.opacity = '1';
    dot.style.opacity = '1';
  });
}

let clockStarted = false;

export function initHudClock(timeZone = 'Europe/Amsterdam') {
  const paint = () => {
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(new Date());
    document.querySelectorAll<HTMLElement>('[data-clock]').forEach((el) => {
      el.textContent = time;
    });
  };
  paint();
  if (clockStarted) return;
  clockStarted = true;
  window.setInterval(paint, 15000);
}
