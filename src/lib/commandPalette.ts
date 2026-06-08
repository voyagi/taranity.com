/**
 * Command palette (⌘/Ctrl+K).
 *
 * Operates on a persisted modal rendered by BaseLayout. Items are server-rendered
 * (anchors / buttons with data-keywords), so filtering needs no duplicated data.
 * Fully keyboard-accessible: focus-trapped, arrow-navigable, Esc to close.
 */

let inited = false;

export function initCommandPalette() {
  if (inited) return;
  const root = document.querySelector<HTMLElement>('[data-palette]');
  if (!root) return;
  inited = true;

  const input = root.querySelector<HTMLInputElement>('[data-palette-input]')!;
  const list = root.querySelector<HTMLElement>('[data-palette-list]')!;
  const emptyEl = root.querySelector<HTMLElement>('[data-palette-empty]');
  const dialog = root.querySelector<HTMLElement>('[data-palette-dialog]')!;
  let lastFocused: HTMLElement | null = null;

  const allItems = () => Array.from(list.querySelectorAll<HTMLElement>('[data-cmd]'));
  const visibleItems = () => allItems().filter((el) => el.style.display !== 'none');

  const setActive = (idx: number) => {
    const items = visibleItems();
    items.forEach((el, i) => {
      const on = i === idx;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const groups of Array.from(list.querySelectorAll<HTMLElement>('[data-cmd-group]'))) {
      let groupShown = 0;
      for (const item of Array.from(groups.querySelectorAll<HTMLElement>('[data-cmd]'))) {
        const hay = (item.dataset.keywords || item.textContent || '').toLowerCase();
        const match = q === '' || hay.includes(q);
        item.style.display = match ? '' : 'none';
        if (match) {
          groupShown++;
          shown++;
        }
      }
      groups.style.display = groupShown ? '' : 'none';
    }
    if (emptyEl) emptyEl.style.display = shown ? 'none' : '';
    setActive(shown ? 0 : -1);
  };

  const isOpen = () => root.getAttribute('data-open') === 'true';

  const open = () => {
    if (isOpen()) return;
    lastFocused = document.activeElement as HTMLElement;
    root.setAttribute('data-open', 'true');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    filter();
    requestAnimationFrame(() => input.focus());
  };

  const close = () => {
    if (!isOpen()) return;
    root.setAttribute('data-open', 'false');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    lastFocused?.focus?.();
  };

  const activate = (el: HTMLElement) => {
    const action = el.dataset.action;
    if (action === 'copy-email') {
      const email = el.dataset.value || '';
      navigator.clipboard?.writeText(email).catch(() => {});
      const labelEl = el.querySelector('[data-cmd-label]');
      if (labelEl) {
        const prev = labelEl.textContent;
        labelEl.textContent = 'Copied to clipboard';
        window.setTimeout(() => {
          labelEl.textContent = prev;
        }, 1400);
      }
      close();
      return;
    }
    const href = el.getAttribute('href') || el.dataset.href;
    if (href) {
      const external = el.dataset.external === 'true';
      close();
      if (external) {
        window.open(href, '_blank', 'noopener');
      } else {
        window.location.href = href;
      }
    }
  };

  // Open triggers
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    } else if (e.key === 'Escape' && isOpen()) {
      // Global Escape so it closes regardless of where focus currently is.
      e.preventDefault();
      close();
    }
  });
  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement)?.closest?.('[data-open-palette]');
    if (trigger) {
      e.preventDefault();
      open();
    }
  });

  // Backdrop click
  root.addEventListener('click', (e) => {
    if (!dialog.contains(e.target as Node)) close();
  });

  // Item interactions
  list.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement)?.closest?.<HTMLElement>('[data-cmd]');
    if (item) {
      e.preventDefault();
      activate(item);
    }
  });
  list.addEventListener('mousemove', (e) => {
    const item = (e.target as HTMLElement)?.closest?.<HTMLElement>('[data-cmd]');
    if (!item) return;
    const idx = visibleItems().indexOf(item);
    if (idx >= 0) setActive(idx);
  });

  input.addEventListener('input', filter);

  // Keyboard within palette
  root.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    const items = visibleItems();
    const current = items.findIndex((el) => el.classList.contains('is-active'));
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(current + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[current]) activate(items[current]);
    } else if (e.key === 'Tab') {
      // Focus trap — keep focus inside the dialog
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
