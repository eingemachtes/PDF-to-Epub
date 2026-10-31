import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { MemoryKV, fakeImages, fakeAssets, fakeAI } from './helpers.js';

function makeEnv(extra = {}) {
  const imageLog = [];
  const aiCalls = [];
  const env = {
    KV: new MemoryKV(), IMAGES: fakeImages(imageLog), ASSETS: fakeAssets, AI: fakeAI(aiCalls),
    FREE_PER_DAY: '2', DAILY_NEURON_BUDGET: '9000', IP_SALT: 'test', ...extra,
  };
  return { env, imageLog, aiCalls };
}

const gen = (env, ip = '9.9.9.9') => worker.fetch(new Request('https://app.test/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
  body: JSON.stringify({ settings: { variation: 42 }, device: { width: 1080, height: 2400 } }),
}), env);

test('Generierung liefert Vorschau MIT Wasserzeichen und speichert Original', async () => {
  const { env, imageLog, aiCalls } = makeEnv();
  const res = await gen(env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Prompt-Engine'), 'template');
  assert.equal(res.headers.get('X-Remaining'), '1');
  assert.equal(aiCalls[0].model, '@cf/black-forest-labs/flux-2-klein-4b');
  assert.equal(aiCalls[0].input.height, '1536');
  assert.match(aiCalls[0].input.prompt, /smartphone/);
  assert.ok(aiCalls[0].input.prompt.length <= 2048);
  const ops = imageLog[0];
  assert.ok(ops.some(([op, o]) => op === 'draw' && o.repeat === true), 'Wasserzeichen fehlt');
  const transform = ops.find(([op]) => op === 'transform')[1];
  assert.ok(Math.max(transform.width, transform.height) <= 1080, 'Vorschau zu groß');
  const id = res.headers.get('X-Image-Id');
  assert.ok(env.KV.map.has(`img:${id}`));
});

test('Ohne Images-Binding wird kein Bild ausgeliefert', async () => {
  const { env } = makeEnv({ IMAGES: undefined });
  assert.equal((await gen(env)).status, 503);
});

test('Tageslimit greift', async () => {
  const { env } = makeEnv();
  await gen(env); await gen(env);
  const res = await gen(env);
  assert.equal(res.status, 429);
});

test('Bezahlung: ohne Stripe-Key deaktiviert, mit Key -> Vollbild ohne Wasserzeichen', async () => {
  const { env, imageLog } = makeEnv();
  const id = (await gen(env)).headers.get('X-Image-Id');
  const noPay = await worker.fetch(new Request('https://app.test/api/checkout', { method: 'POST', body: JSON.stringify({ id }) }), env);
  assert.equal(noPay.status, 501);

  env.STRIPE_SECRET_KEY = 'sk_test_x';
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/checkout/sessions') && init.method === 'POST') {
      const body = new URLSearchParams(init.body);
      assert.equal(body.get('metadata[image_id]'), id);
      return Response.json({ url: 'https://checkout.stripe.test/cs_test_1' });
    }
    if (String(url).includes('/checkout/sessions/cs_test_paid')) return Response.json({ payment_status: 'paid', metadata: { image_id: id } });
    if (String(url).includes('/checkout/sessions/cs_test_open')) return Response.json({ payment_status: 'unpaid', metadata: { image_id: id } });
    return new Response('nope', { status: 404 });
  };
  try {
    const co = await worker.fetch(new Request('https://app.test/api/checkout', { method: 'POST', body: JSON.stringify({ id }) }), env);
    assert.equal((await co.json()).url, 'https://checkout.stripe.test/cs_test_1');

    const unpaid = await worker.fetch(new Request('https://app.test/api/full?session_id=cs_test_open'), env);
    assert.equal(unpaid.status, 402);

    const full = await worker.fetch(new Request('https://app.test/api/full?session_id=cs_test_paid'), env);
    assert.equal(full.status, 200);
    assert.match(full.headers.get('Content-Disposition'), /1080x2400/);
    const ops = imageLog.at(-1);
    assert.ok(!ops.some(([op]) => op === 'draw'), 'Vollversion darf kein Wasserzeichen haben');
    assert.deepEqual(ops.find(([op]) => op === 'transform')[1], { width: 1080, height: 2400, fit: 'cover' });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Config liefert Optionen ohne Prompt-Texte', async () => {
  const { env } = makeEnv();
  const res = await worker.fetch(new Request('https://app.test/api/config'), env);
  const data = await res.json();
  assert.equal(data.paymentsEnabled, false);
  assert.equal(data.remaining, 2);
  assert.ok(data.options.motif.choices.length > 0);
});
