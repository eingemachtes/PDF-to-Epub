// Frontend der PWA. Alle Bilder kommen vom Server; die Vorschau enthält das
// Wasserzeichen bereits fest im Bild.

const $ = (id) => document.getElementById(id);

const PRESETS = [
  { id: 'auto', label: 'Dieses Gerät (automatisch)' },
  { id: 'phone', label: 'Smartphone (1080 × 2400)', w: 1080, h: 2400 },
  { id: 'iphone', label: 'iPhone Pro (1179 × 2556)', w: 1179, h: 2556 },
  { id: 'iphone-max', label: 'iPhone Pro Max (1290 × 2796)', w: 1290, h: 2796 },
  { id: 'tablet', label: 'Tablet hochkant (1640 × 2360)', w: 1640, h: 2360 },
  { id: 'laptop', label: 'Laptop 16:10 (1920 × 1200)', w: 1920, h: 1200 },
  { id: 'laptop-hi', label: 'Laptop 16:10 (2560 × 1600)', w: 2560, h: 1600 },
  { id: 'fhd', label: 'Desktop Full HD (1920 × 1080)', w: 1920, h: 1080 },
  { id: 'qhd', label: 'Desktop QHD (2560 × 1440)', w: 2560, h: 1440 },
  { id: '4k', label: 'Desktop 4K (3840 × 2160)', w: 3840, h: 2160 },
  { id: 'custom', label: 'Eigene Größe …' },
];

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } },
};

let config = null;
let currentId = null;
let previewUrl = null;
let remaining = Infinity;

function autoSize() {
  const dpr = window.devicePixelRatio || 1;
  // screen.* liefert CSS-Pixel des Bildschirms -> mal DPR = physische Pixel
  return { width: Math.round(screen.width * dpr), height: Math.round(screen.height * dpr) };
}

function selectedDevice() {
  const p = PRESETS.find((x) => x.id === $('preset').value) || PRESETS[0];
  if (p.id === 'auto') return autoSize();
  if (p.id === 'custom') return { width: Number($('cw').value) || 1080, height: Number($('ch').value) || 2400 };
  return { width: p.w, height: p.h };
}

function updateDeviceInfo() {
  $('custom').hidden = $('preset').value !== 'custom';
  const d = selectedDevice();
  $('deviceInfo').textContent = `Zielauflösung: ${d.width} × ${d.height} px`;
}

function setStatus(text, isError = false, busy = false) {
  const el = $('status');
  el.classList.toggle('error', isError);
  el.innerHTML = '';
  if (busy) {
    const s = document.createElement('span');
    s.className = 'spinner';
    el.append(s);
  }
  el.append(document.createTextNode(text));
}

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function renderOptions(options) {
  const saved = store.get('settings') || {};
  const root = $('options');
  root.innerHTML = '';
  for (const [key, opt] of Object.entries(options)) {
    const group = document.createElement('div');
    group.className = 'group';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', opt.label);
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = opt.label;
    const chips = document.createElement('div');
    chips.className = 'chips';
    const current = saved[key] ?? opt.default;
    for (const c of opt.choices) {
      const id = `opt-${key}-${c.value}`;
      const input = Object.assign(document.createElement('input'), { type: 'radio', name: key, value: c.value, id });
      input.checked = String(c.value) === String(current);
      const label = Object.assign(document.createElement('label'), { htmlFor: id, textContent: c.label });
      chips.append(input, label);
    }
    group.append(title, chips);
    root.append(group);
  }
}

function readSettings() {
  const data = new FormData($('form'));
  const out = {};
  for (const key of Object.keys(config.options)) out[key] = data.get(key);
  out.variation = Math.floor(Math.random() * 100000);
  return out;
}

function updateQuota(value) {
  if (!Number.isFinite(value)) return;
  remaining = value;
  $('quota').textContent = `Heute noch ${remaining} von ${config.freePerDay} Gratis-Bildern.`;
  $('generate').disabled = remaining <= 0;
}

async function generate(event) {
  event?.preventDefault();
  const settings = readSettings();
  const device = selectedDevice();
  store.set('settings', settings);
  store.set('preset', $('preset').value);

  $('generate').disabled = true;
  $('again').disabled = true;
  setStatus('Wallpaper wird erzeugt … (ca. 5–20 Sekunden)', false, true);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, device }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 429) updateQuota(0);
      throw new Error(err.error || `Fehler ${res.status}`);
    }
    currentId = res.headers.get('X-Image-Id');
    updateQuota(Number(res.headers.get('X-Remaining')));
    const blob = await res.blob();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    $('preview').src = previewUrl;
    $('downloadFree').href = previewUrl;
    $('result').hidden = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStatus('');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    $('generate').disabled = remaining <= 0;
    $('again').disabled = false;
  }
}

async function buy() {
  if (!currentId) return;
  $('buy').disabled = true;
  setStatus('Bezahlseite wird geöffnet …', false, true);
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentId }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Bezahlung nicht möglich');
    location.href = data.url;
  } catch (err) {
    setStatus(err.message, true);
    $('buy').disabled = false;
  }
}

async function loadPaid(sessionId) {
  $('form').hidden = true;
  setStatus('Zahlung wird geprüft …', false, true);
  try {
    const res = await fetch(`/api/full?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Fehler ${res.status}`);
    }
    const cd = res.headers.get('Content-Disposition') || '';
    const name = /filename="([^"]+)"/.exec(cd)?.[1] || 'innenleben.jpg';
    const url = URL.createObjectURL(await res.blob());
    $('fullImg').src = url;
    $('downloadFull').href = url;
    $('downloadFull').download = name;
    $('paid').hidden = false;
    setStatus('');
  } catch (err) {
    setStatus(err.message, true);
    $('form').hidden = false;
  }
}

async function init() {
  const sel = $('preset');
  for (const p of PRESETS) sel.append(new Option(p.label, p.id));
  sel.value = store.get('preset') || 'auto';
  const auto = autoSize();
  $('cw').value = auto.width;
  $('ch').value = auto.height;
  sel.addEventListener('change', updateDeviceInfo);
  $('cw').addEventListener('input', updateDeviceInfo);
  $('ch').addEventListener('input', updateDeviceInfo);
  updateDeviceInfo();

  try {
    config = await (await fetch('/api/config')).json();
  } catch {
    setStatus('Server nicht erreichbar.', true);
    return;
  }
  renderOptions(config.options);
  updateQuota(config.remaining);
  if (config.paymentsEnabled) {
    $('buy').hidden = false;
    $('buy').textContent = `Vollversion ohne Wasserzeichen – ${formatPrice(config.priceCents, config.currency)}`;
  }

  $('form').addEventListener('submit', generate);
  $('again').addEventListener('click', generate);
  $('buy').addEventListener('click', buy);

  const params = new URLSearchParams(location.search);
  if (params.get('paid')) loadPaid(params.get('paid'));
  else if (params.get('canceled')) setStatus('Bezahlung abgebrochen. Die Vorschau bleibt 48 Stunden verfügbar, wenn du neu erzeugst.');

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

init();
