import { EMAIL_RE } from './validation';

interface ContactFormOptions {
  formSelector: string;
  statusSelector: string;
  submitButtonSelector: string;
  submitLabelSelector: string;
  successSelector: string;
  wrapperSelector: string;
  fieldRowSelector: string;
  errorAttr: string;
  invalidClass?: string;
  errorClass?: string;
  sendingLabel: string;
  retryLabel?: string;
  demoDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function bindContactForm(options: ContactFormOptions): void {
  const form = document.querySelector<HTMLFormElement>(options.formSelector);
  if (!form || form.dataset.bound) return;

  const status = form.querySelector<HTMLElement>(options.statusSelector)!;
  const submitBtn = form.querySelector<HTMLButtonElement>(options.submitButtonSelector)!;
  const submitLabel = form.querySelector<HTMLElement>(options.submitLabelSelector)!;
  const wrapper = form.closest(options.wrapperSelector);
  const successPanel = wrapper?.querySelector<HTMLElement>(options.successSelector);
  if (!status || !submitBtn || !submitLabel || !successPanel) return;
  form.dataset.bound = '1';

  const invalidClass = options.invalidClass ?? 'invalid';
  const errorClass = options.errorClass ?? 'is-error';
  const retryLabel = options.retryLabel ?? 'Try again';
  const demoDelayMs = options.demoDelayMs ?? 700;

  const tsEl = form.querySelector<HTMLElement>('.cf-turnstile');
  let widgetId: string | undefined;

  if (tsEl) {
    const renderTurnstile = () => {
      if (!window.turnstile || tsEl.dataset.tsRendered) return false;
      widgetId = window.turnstile.render(tsEl);
      tsEl.dataset.tsRendered = '1';
      return true;
    };
    if (!renderTurnstile()) {
      const iv = window.setInterval(() => {
        if (renderTurnstile()) window.clearInterval(iv);
      }, 150);
      window.setTimeout(() => window.clearInterval(iv), 10000);
    }
  }

  const resetTurnstile = () => {
    if (tsEl && window.turnstile) window.turnstile.reset(widgetId ?? tsEl);
  };

  const setErr = (name: string, msg: string) => {
    const field = form.querySelector(`[name="${name}"]`)?.closest(options.fieldRowSelector);
    const errEl = form.querySelector(`[${options.errorAttr}="${name}"]`);
    if (field) field.classList.toggle(invalidClass, Boolean(msg));
    if (errEl) errEl.textContent = msg;
  };

  const validate = () => {
    let ok = true;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();

    setErr('name', name ? '' : 'Tell us your name.');
    if (!name) ok = false;

    const emailOk = EMAIL_RE.test(email);
    setErr('email', email ? (emailOk ? '' : 'That email looks off.') : 'We need an email to reply.');
    if (!emailOk) ok = false;

    setErr('message', message.length >= 10 ? '' : 'A sentence or two, please (10+ characters).');
    if (message.length < 10) ok = false;

    if (!ok) {
      form.querySelector<HTMLElement>(`${options.fieldRowSelector}.${invalidClass} input, ${options.fieldRowSelector}.${invalidClass} textarea`)?.focus();
    }
    return ok;
  };

  const setStatusError = (message: string) => {
    status.textContent = message;
    status.classList.add(errorClass);
  };

  const showSuccess = () => {
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
    successPanel.focus({ preventScroll: true });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove(errorClass);
    if (!validate()) return;

    if ((form.querySelector('[name="botcheck"]') as HTMLInputElement)?.checked) return;

    if (tsEl && !(form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value) {
      const fallback = form.dataset.fallbackEmail || 'hello@taranity.com';
      setStatusError(`Verification did not complete. If the challenge is not visible, refresh or email us directly at ${fallback}.`);
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = options.sendingLabel;

    if (!tsEl) {
      if (import.meta.env.DEV) {
        await sleep(demoDelayMs);
        showSuccess();
        return;
      }
      const fallbackEmail = form.dataset.fallbackEmail || 'hello@taranity.com';
      setStatusError(`Could not send. Email ${fallbackEmail} directly?`);
      submitBtn.disabled = false;
      submitLabel.textContent = retryLabel;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        showSuccess();
      } else {
        throw new Error(typeof json.error === 'string' ? json.error : 'send-failed');
      }
    } catch {
      resetTurnstile();
      const fallbackEmail = form.dataset.fallbackEmail || 'hello@taranity.com';
      setStatusError(`Could not send. Email ${fallbackEmail} directly?`);
      submitBtn.disabled = false;
      submitLabel.textContent = retryLabel;
    } finally {
      clearTimeout(timeout);
    }
  });

  form.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => {
      const name = (el as HTMLInputElement).name;
      if (el.closest(options.fieldRowSelector)?.classList.contains(invalidClass)) setErr(name, '');
    });
  });
}
