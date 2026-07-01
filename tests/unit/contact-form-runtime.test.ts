import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const contactComponents = [
  'src/components/designs/atlas/AtlasContact.astro',
  'src/components/designs/practice/PracticeContact.astro',
  'src/components/designs/prism/PrismContact.astro',
  'src/components/designs/raw/RawContact.astro',
  'src/components/designs/sheet/SheetContact.astro',
  'src/components/designs/signal/SignalContact.astro',
  'src/components/designs/storefront/StorefrontContact.astro',
  'src/components/designs/vitrine/VitrineContact.astro',
];

describe('contact form runtime wiring', () => {
  it.each(contactComponents)('%s uses the shared hardened contact helper', (path) => {
    const source = read(path);
    expect(source).toContain("import { bindContactForm } from '../../../lib/contact-form'");
    expect(source).toContain('bindContactForm({');
    expect(source).not.toContain("fetch('/api/contact'");
    expect(source).not.toContain('window.turnstile.render(tsEl)');
  });

  it.each(contactComponents)('%s posts a subject the edge allowlist accepts', (path) => {
    const tag = read(path).match(/<input[^>]*name="subject"[^>]*>/)?.[0];
    expect(tag, 'subject hidden input is present').toBeTruthy();
    const subject = tag?.match(/value="([^"]+)"/)?.[1];
    expect(subject, 'subject input has a value').toBeTruthy();
    // functions/api/contact.ts drops any subject not in ALLOWED_SUBJECTS to a
    // generic label, so a new design silently loses its per-design subject
    // unless the allowlist is updated too. This guards that drift.
    expect(read('functions/api/contact.ts')).toContain(subject as string);
  });

  it('keeps token reset and production fail-closed behavior in the shared helper', () => {
    const helper = read('src/lib/contact-form.ts');
    expect(helper).toContain("fetch('/api/contact'");
    expect(helper).toContain('window.turnstile.reset(widgetId ?? tsEl)');
    expect(helper).toContain('import.meta.env.DEV');
    expect(helper).toContain('Could not send. Email');
    expect(helper).toContain('Verification did not complete');
    expect(helper.indexOf("form.dataset.bound = '1'")).toBeGreaterThan(helper.indexOf('if (!status || !submitBtn || !submitLabel || !successPanel) return;'));
  });

  it('does not expose the Web3Forms credential through Astro PUBLIC_ env', () => {
    // Server-only secret named WEB3FORMS_ACCESS_KEY; the misleading PUBLIC_ name
    // is fully retired (a PUBLIC_ build var would be inlined into the client
    // bundle by Astro).
    for (const path of ['.env.example', 'src/env.d.ts', 'functions/api/contact.ts']) {
      expect(read(path)).not.toContain('PUBLIC_WEB3FORMS_KEY');
    }
    expect(read('.env.example')).toContain('WEB3FORMS_ACCESS_KEY');
  });

  it('documents no-widget contact demo mode as an explicit opt-out', () => {
    const envExample = read('.env.example');

    expect(envExample).toContain('set PUBLIC_TURNSTILE_SITEKEY=off');
    expect(envExample).not.toContain('without a Turnstile site key');
  });
});
