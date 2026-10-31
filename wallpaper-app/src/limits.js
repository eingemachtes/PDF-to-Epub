// Kostenschutz: Limit pro Nutzer (gehashte IP) und globales Tageslimit.
// KV ist nur "eventually consistent" – die Zähler sind daher Näherungswerte.
// Die harte Kostengrenze ist der Cloudflare Free-Plan selbst: über 10.000
// Neurons/Tag liefert Workers AI dort einen Fehler statt einer Rechnung.

const DAY_SECONDS = 86400;

export function today(now = new Date()) {
  return now.toISOString().slice(0, 10); // UTC – passt zum Neuron-Reset um 00:00 UTC
}

export async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readCount(kv, key) {
  const v = await kv.get(key);
  return v ? Number.parseInt(v, 10) || 0 : 0;
}

// Prüft beide Limits und zählt bei Erfolg hoch (vor der Generierung, damit
// auch fehlgeschlagene Versuche zählen und niemand das Limit umgehen kann).
export async function checkAndCount(kv, { ip, salt, perUser, globalCap, now = new Date() }) {
  const day = today(now);
  const userKey = `cnt:u:${day}:${await hashIp(ip, salt)}`;
  const globalKey = `cnt:g:${day}`;
  const [used, globalUsed] = await Promise.all([readCount(kv, userKey), readCount(kv, globalKey)]);

  if (globalUsed >= globalCap) {
    return { ok: false, reason: 'global', remaining: 0 };
  }
  if (used >= perUser) {
    return { ok: false, reason: 'user', remaining: 0 };
  }
  const opts = { expirationTtl: 2 * DAY_SECONDS };
  await Promise.all([
    kv.put(userKey, String(used + 1), opts),
    kv.put(globalKey, String(globalUsed + 1), opts),
  ]);
  return { ok: true, remaining: perUser - used - 1 };
}

export async function remainingFor(kv, { ip, salt, perUser, now = new Date() }) {
  const used = await readCount(kv, `cnt:u:${today(now)}:${await hashIp(ip, salt)}`);
  return Math.max(0, perUser - used);
}
