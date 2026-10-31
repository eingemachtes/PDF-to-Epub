// Cloudflare Worker: API + Auslieferung der PWA (statische Assets aus /public).
//
// Ablauf:
//  POST /api/generate  -> Limits prüfen, Prompt bauen, Bild erzeugen, Original
//                         48 h in KV ablegen, Vorschau MIT Wasserzeichen liefern
//  POST /api/checkout  -> Stripe-Checkout für eine Bild-ID starten
//  GET  /api/full      -> nach bestätigter Zahlung: volle Auflösung ohne Wasserzeichen
//  GET  /api/config    -> Optionen, Preis, verbleibende Gratisbilder
//
// Das saubere Original verlässt den Server nur über /api/full.

import { normalizeDevice, fitLongSide, PREVIEW_LONG_SIDE } from './device.js';
import { generateImage, estimateNeurons, modelSpec, DEFAULT_IMAGE_MODEL } from './generator.js';
import { checkAndCount, remainingFor } from './limits.js';
import { buildPrompt } from './prompt-engine.js';
import { normalizeSettings, publicOptions } from './prompts.js';
import { createCheckout, paidImageId, paymentsEnabled } from './stripe.js';

const IMAGE_TTL = 48 * 3600;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

function cfg(env) {
  const int = (v, d) => (Number.isFinite(Number.parseInt(v, 10)) ? Number.parseInt(v, 10) : d);
  return {
    perUser: int(env.FREE_PER_DAY, 3),
    neuronBudget: int(env.DAILY_NEURON_BUDGET, 9000),
    priceCents: int(env.PRICE_CENTS, 199),
    currency: (env.CURRENCY || 'eur').toLowerCase(),
    salt: env.IP_SALT || 'bitte-in-wrangler-secret-setzen',
    model: env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  };
}

const clientIp = (request) => request.headers.get('CF-Connecting-IP') || '0.0.0.0';

function bytesToStream(bytes) {
  return new Response(bytes).body;
}

async function watermarkTile(env, origin) {
  const res = await env.ASSETS.fetch(new Request(`${origin}/watermark.png`));
  if (!res.ok) throw new Error('watermark.png fehlt');
  return res.body;
}

async function renderPreview(env, origin, bytes, device) {
  const size = fitLongSide(device, Math.min(PREVIEW_LONG_SIDE, Math.max(device.width, device.height)));
  const result = await env.IMAGES.input(bytesToStream(bytes))
    .transform({ width: size.width, height: size.height, fit: 'cover' })
    .draw(await watermarkTile(env, origin), { opacity: 0.6, repeat: true })
    .output({ format: 'image/jpeg', quality: 70 });
  return result.response();
}

async function renderFull(env, bytes, device) {
  const result = await env.IMAGES.input(bytesToStream(bytes))
    .transform({ width: device.width, height: device.height, fit: 'cover' })
    .output({ format: 'image/jpeg', quality: 92 });
  return result.response();
}

async function handleGenerate(request, env) {
  if (!env.IMAGES) {
    // Ohne serverseitiges Wasserzeichen würde das saubere Bild ausgeliefert.
    return json({ error: 'Wasserzeichen-Dienst (Images-Binding) ist nicht eingerichtet.' }, 503);
  }
  const c = cfg(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }
  const settings = normalizeSettings(body.settings);
  const device = normalizeDevice(body.device);

  const cost = estimateNeurons(c.model, device);
  const limit = await checkAndCount(env.KV, {
    ip: clientIp(request), salt: c.salt, perUser: c.perUser, neuronBudget: c.neuronBudget, cost,
  });
  if (!limit.ok) {
    const msg = limit.reason === 'global'
      ? 'Das Tageskontingent des Dienstes ist aufgebraucht. Morgen geht es weiter.'
      : `Du hast heute alle ${c.perUser} Gratis-Bilder erzeugt. Morgen gibt es neue.`;
    return json({ error: msg, reason: limit.reason }, 429);
  }

  let bytes;
  let engine;
  try {
    const built = await buildPrompt(env, settings, device, modelSpec(c.model).maxChars);
    engine = built.engine;
    bytes = await generateImage(env.AI, { prompt: built.prompt, device, seed: settings.variation, model: c.model });
  } catch (err) {
    console.error('Generierung fehlgeschlagen:', err?.message);
    return json({ error: 'Die Bildgenerierung ist gerade nicht verfügbar (evtl. Tageskontingent erreicht).' }, 503);
  }

  const id = crypto.randomUUID();
  await env.KV.put(`img:${id}`, bytes, { expirationTtl: IMAGE_TTL, metadata: { device, settings } });

  const origin = new URL(request.url).origin;
  const preview = await renderPreview(env, origin, bytes, device);
  const headers = new Headers(preview.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Image-Id', id);
  headers.set('X-Remaining', String(limit.remaining));
  headers.set('X-Prompt-Engine', engine);
  return new Response(preview.body, { status: 200, headers });
}

async function handleCheckout(request, env) {
  if (!paymentsEnabled(env)) return json({ error: 'Bezahlung ist noch nicht eingerichtet.' }, 501);
  const { id } = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(id || '')) return json({ error: 'Ungültige Bild-ID' }, 400);
  const exists = await env.KV.getWithMetadata(`img:${id}`, { type: 'stream' });
  if (!exists.value) return json({ error: 'Bild abgelaufen – bitte neu erzeugen.' }, 404);
  await exists.value.cancel();
  const c = cfg(env);
  try {
    const url = await createCheckout(env, { imageId: id, origin: new URL(request.url).origin, priceCents: c.priceCents, currency: c.currency });
    return json({ url });
  } catch (err) {
    console.error('Stripe:', err?.message);
    return json({ error: 'Bezahlseite konnte nicht geöffnet werden.' }, 502);
  }
}

async function handleFull(url, env) {
  if (!paymentsEnabled(env)) return json({ error: 'Bezahlung ist noch nicht eingerichtet.' }, 501);
  const id = await paidImageId(env, url.searchParams.get('session_id'));
  if (!id) return json({ error: 'Zahlung nicht bestätigt.' }, 402);
  const { value, metadata } = await env.KV.getWithMetadata(`img:${id}`, { type: 'arrayBuffer' });
  if (!value) return json({ error: 'Bild abgelaufen. Bitte melde dich beim Support.' }, 410);
  const device = normalizeDevice(metadata?.device);
  const full = await renderFull(env, new Uint8Array(value), device);
  const headers = new Headers(full.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Disposition', `attachment; filename="innenleben-${device.width}x${device.height}.jpg"`);
  return new Response(full.body, { status: 200, headers });
}

async function handleConfig(request, env) {
  const c = cfg(env);
  return json({
    options: publicOptions(),
    freePerDay: c.perUser,
    remaining: await remainingFor(env.KV, { ip: clientIp(request), salt: c.salt, perUser: c.perUser }),
    priceCents: c.priceCents,
    currency: c.currency,
    paymentsEnabled: paymentsEnabled(env),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/config' && request.method === 'GET') return await handleConfig(request, env);
      if (url.pathname === '/api/generate' && request.method === 'POST') return await handleGenerate(request, env);
      if (url.pathname === '/api/checkout' && request.method === 'POST') return await handleCheckout(request, env);
      if (url.pathname === '/api/full' && request.method === 'GET') return await handleFull(url, env);
      if (url.pathname.startsWith('/api/')) return json({ error: 'Nicht gefunden' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'Interner Fehler' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
