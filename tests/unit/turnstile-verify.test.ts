import { describe, it, expect, vi, afterEach } from 'vitest';
import { onRequestPost } from '../../functions/api/verify';

const makeReq = (body: unknown, ip?: string): Request =>
  new Request('https://taranity.com/api/verify', {
    method: 'POST',
    headers: ip ? { 'CF-Connecting-IP': ip } : {},
    body: JSON.stringify(body),
  });

afterEach(() => vi.restoreAllMocks());

describe('turnstile /api/verify', () => {
  it('fails closed (500) when the secret is not configured', async () => {
    const res = await onRequestPost({ request: makeReq({ token: 'x' }), env: {} });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('rejects a missing token (400) and never calls siteverify', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await onRequestPost({ request: makeReq({}), env: { TURNSTILE_SECRET_KEY: 's' } });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON body (400)', async () => {
    const bad = new Request('https://taranity.com/api/verify', { method: 'POST', body: 'not-json{' });
    const res = await onRequestPost({ request: bad, env: { TURNSTILE_SECRET_KEY: 's' } });
    expect(res.status).toBe(400);
  });

  it('returns success:true when siteverify accepts the token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const res = await onRequestPost({ request: makeReq({ token: 'good' }), env: { TURNSTILE_SECRET_KEY: 's' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns success:false when siteverify rejects a forged token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    );
    const res = await onRequestPost({ request: makeReq({ token: 'forged' }), env: { TURNSTILE_SECRET_KEY: 's' } });
    expect(await res.json()).toEqual({ success: false });
  });

  it('fails closed (502) when siteverify is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const res = await onRequestPost({ request: makeReq({ token: 'good' }), env: { TURNSTILE_SECRET_KEY: 's' } });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('forwards the secret, token, and client IP to siteverify', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    await onRequestPost({ request: makeReq({ token: 'good' }, '1.2.3.4'), env: { TURNSTILE_SECRET_KEY: 'sekret' } });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('siteverify');
    const sent = init?.body as FormData;
    expect(sent.get('secret')).toBe('sekret');
    expect(sent.get('response')).toBe('good');
    expect(sent.get('remoteip')).toBe('1.2.3.4');
  });
});
