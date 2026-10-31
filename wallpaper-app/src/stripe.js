// Stripe Checkout per REST (kein SDK nötig). Keine Grundgebühr – Stripe
// behält nur pro Verkauf eine Gebühr ein. Ohne STRIPE_SECRET_KEY ist die
// Bezahlfunktion deaktiviert.

const API = 'https://api.stripe.com/v1';

function headers(env) {
  return {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

export function paymentsEnabled(env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export async function createCheckout(env, { imageId, origin, priceCents, currency }) {
  const body = new URLSearchParams({
    mode: 'payment',
    client_reference_id: imageId,
    'metadata[image_id]': imageId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(priceCents),
    'line_items[0][price_data][product_data][name]': 'Wallpaper "Blick zum Innenleben" – Vollversion',
    'line_items[0][price_data][product_data][description]': 'Volle Geräteauflösung, ohne Wasserzeichen',
    success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
  });
  const res = await fetch(`${API}/checkout/sessions`, { method: 'POST', headers: headers(env), body });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Stripe-Fehler');
  return data.url;
}

// Gibt die Bild-ID zurück, wenn die Session bezahlt ist, sonst null.
export async function paidImageId(env, sessionId) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId || '')) return null;
  const res = await fetch(`${API}/checkout/sessions/${sessionId}`, { headers: headers(env) });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.payment_status !== 'paid') return null;
  return data.metadata?.image_id || data.client_reference_id || null;
}
