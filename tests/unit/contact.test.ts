import { describe, it, expect, vi, afterEach } from 'vitest';
import { onRequestPost } from '../../functions/api/contact';

const makeReq = (fields: Record<string, string>, ip?: string): Request => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new Request('https://taranity.com/api/contact', {
    method: 'POST',
    headers: ip ? { 'CF-Connecting-IP': ip } : {},
    body: fd,
  });
};

const validFields = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'I would like to build something.',
  'cf-turnstile-response': 'tok',
};

const ENV = { TURNSTILE_SECRET_KEY: 'secret', PUBLIC_WEB3FORMS_KEY: 'wf-key' };

// Mock both upstreams by URL. `verify`/`submit` toggle each leg's outcome.
function mockUpstreams({ verify = true, submit = true }: { verify?: boolean; submit?: boolean } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    const u = String(url);
    if (u.includes('siteverify')) return Promise.resolve(new Response(JSON.stringify({ success: verify }), { status: 200 }));
    if (u.includes('web3forms')) return Promise.resolve(new Response(JSON.stringify({ success: submit }), { status: 200 }));
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  });
}

afterEach(() => vi.restoreAllMocks());

describe('contact /api/contact', () => {
  it('fails closed (500) when the Turnstile secret is not configured', async () => {
    const res = await onRequestPost({ request: makeReq(validFields), env: { PUBLIC_WEB3FORMS_KEY: 'wf' } });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('silently accepts the honeypot without contacting any upstream', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await onRequestPost({ request: makeReq({ ...validFields, botcheck: 'on' }), env: ENV });
    expect(await res.json()).toEqual({ success: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing token (400) without verifying', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await onRequestPost({ request: makeReq({ ...validFields, 'cf-turnstile-response': '' }), env: ENV });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid fields (400) before verifying', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await onRequestPost({ request: makeReq({ ...validFields, email: 'nope' }), env: ENV });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a forged token (403) and never submits to Web3Forms', async () => {
    const fetchSpy = mockUpstreams({ verify: false });
    const res = await onRequestPost({ request: makeReq(validFields), env: ENV });
    expect(res.status).toBe(403);
    expect(fetchSpy.mock.calls.every(([u]) => !String(u).includes('web3forms'))).toBe(true);
  });

  it('fails closed (502) when siteverify returns a non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream error', { status: 503 }));
    const res = await onRequestPost({ request: makeReq(validFields), env: ENV });
    expect(res.status).toBe(502);
  });

  it('fails closed (502) when siteverify is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const res = await onRequestPost({ request: makeReq(validFields), env: ENV });
    expect(res.status).toBe(502);
  });

  it('fails closed (500) when the Web3Forms key is missing after verification', async () => {
    mockUpstreams({ verify: true });
    const res = await onRequestPost({ request: makeReq(validFields), env: { TURNSTILE_SECRET_KEY: 'secret' } });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ success: false, error: 'web3forms-not-configured' });
  });

  it('verifies then submits server-side, forwarding the held access key (not the client)', async () => {
    const fetchSpy = mockUpstreams({ verify: true, submit: true });
    const res = await onRequestPost({ request: makeReq(validFields, '1.2.3.4'), env: ENV });
    expect(await res.json()).toEqual({ success: true });
    const verifyCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('siteverify'))!;
    const submitCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('web3forms'))!;
    expect((verifyCall[1]!.body as FormData).get('response')).toBe('tok');
    expect((verifyCall[1]!.body as FormData).get('remoteip')).toBe('1.2.3.4');
    const submitBody = JSON.parse(submitCall[1]!.body as string) as Record<string, string>;
    expect(submitBody.access_key).toBe('wf-key'); // from env, never the client
    expect(submitBody.email).toBe('ada@example.com');
  });

  it('treats a Web3Forms HTML success page as success (not a failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('siteverify')) return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      if (u.includes('web3forms')) return Promise.resolve(new Response('<html><title>Form Submitted Successfully</title></html>', { status: 200 }));
      return Promise.reject(new Error('unexpected'));
    });
    const res = await onRequestPost({ request: makeReq(validFields), env: ENV });
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns success:false when Web3Forms rejects the submission', async () => {
    mockUpstreams({ verify: true, submit: false });
    const res = await onRequestPost({ request: makeReq(validFields), env: ENV });
    expect(await res.json()).toEqual({ success: false });
  });

  it('never trusts client from_name and drops an unknown subject (no injection)', async () => {
    const fetchSpy = mockUpstreams({ verify: true, submit: true });
    await onRequestPost({ request: makeReq({ ...validFields, subject: 'Spammy injected text', from_name: 'Evil Sender' }), env: ENV });
    const submitBody = JSON.parse(fetchSpy.mock.calls.find(([u]) => String(u).includes('web3forms'))![1]!.body as string) as Record<string, string>;
    expect(submitBody.from_name).toBe('taranity.com');
    expect(submitBody.subject).toBe('New enquiry via taranity.com');
  });

  it('keeps a recognized per-design subject', async () => {
    const fetchSpy = mockUpstreams({ verify: true, submit: true });
    await onRequestPost({ request: makeReq({ ...validFields, subject: 'New enquiry via taranity.com (Atlas)' }), env: ENV });
    const submitBody = JSON.parse(fetchSpy.mock.calls.find(([u]) => String(u).includes('web3forms'))![1]!.body as string) as Record<string, string>;
    expect(submitBody.subject).toBe('New enquiry via taranity.com (Atlas)');
  });
});
