// Prompt-Bausteine für "Blick zum Innenleben".
//
// ACHTUNG – PLATZHALTER: Die Original-Prompts aus der Wallpaper-Sitzung liegen
// noch nicht vor. Die Texte unten sind eine eigene Interpretation des Titels
// und müssen durch die erprobten Prompts ersetzt werden. Die Struktur
// (Optionen -> Prompt-Fragmente) bleibt dabei gleich; Frontend und Backend
// lesen die Optionen aus dieser Datei, es muss nichts anderes angepasst werden.

export const BASE_PROMPT =
  'A wallpaper that offers a "look inside": a cutaway view revealing the hidden inner ' +
  'workings of {motif}, layered depth, the outer shell partially opened so the intricate ' +
  'interior becomes visible';

export const OPTIONS = {
  motif: {
    label: 'Motiv',
    default: 'uhrwerk',
    choices: {
      uhrwerk: { label: 'Uhrwerk', text: 'a mechanical pocket watch with gears, springs and jewels' },
      organismus: { label: 'Organisch', text: 'a living organism, delicate anatomical structures, veins and chambers' },
      technik: { label: 'Elektronik', text: 'an electronic device, circuit boards, chips and glowing traces' },
      natur: { label: 'Natur', text: 'a plant stem and seed pod, cell structures and fibres' },
      architektur: { label: 'Gebäude', text: 'a multi-storey building in cross-section, rooms, stairs and hidden passages' },
    },
  },
  style: {
    label: 'Stil',
    default: 'foto',
    choices: {
      foto: { label: 'Fotorealistisch', text: 'photorealistic macro photography, shallow depth of field, studio lighting' },
      illustration: { label: 'Illustration', text: 'highly detailed digital illustration, clean linework' },
      aquarell: { label: 'Aquarell', text: 'soft watercolor painting, paper texture, gentle bleeding edges' },
      blueprint: { label: 'Blaupause', text: 'technical blueprint drawing, exploded view, fine white lines' },
    },
  },
  mood: {
    label: 'Farbstimmung',
    default: 'warm',
    choices: {
      warm: { label: 'Warm', text: 'warm palette of amber, copper and gold' },
      kuehl: { label: 'Kühl', text: 'cool palette of teal, steel blue and silver' },
      neon: { label: 'Neon', text: 'vivid neon accents of magenta and cyan' },
      pastell: { label: 'Pastell', text: 'soft pastel palette, airy and light' },
      mono: { label: 'Monochrom', text: 'monochrome, black and white with subtle grey tones' },
    },
  },
  brightness: {
    label: 'Helligkeit',
    default: 'dunkel',
    choices: {
      dunkel: { label: 'Dunkel', text: 'dark background, deep blacks, ideal for OLED screens' },
      hell: { label: 'Hell', text: 'light, bright background with soft shadows' },
    },
  },
  detail: {
    label: 'Detailgrad',
    default: '2',
    choices: {
      1: { label: 'Schlicht', text: 'minimalist, few elements, lots of calm negative space' },
      2: { label: 'Ausgewogen', text: 'balanced level of detail' },
      3: { label: 'Sehr detailreich', text: 'extremely intricate, dense fine detail' },
    },
  },
};

export const NEGATIVE_PROMPT = 'text, letters, words, watermark, logo, signature, blurry, low resolution, distorted';

// Komposition abhängig vom Seitenverhältnis des Geräts: Platz für Uhr, Widgets und Dock.
export function compositionFor(width, height) {
  const ratio = height / width;
  if (ratio >= 1.5) {
    return 'vertical smartphone wallpaper composition, main subject centred slightly below the middle, ' +
      'calm uncluttered areas at the top for the clock and at the bottom for the app dock';
  }
  if (ratio > 1.05) {
    return 'portrait tablet wallpaper composition, centred subject, calm margins';
  }
  return 'wide desktop wallpaper composition, subject offset to the right third, ' +
    'calm negative space on the left for desktop icons';
}

// Normalisiert Nutzereingaben: unbekannte Werte fallen auf den Default zurück.
export function normalizeSettings(input = {}) {
  const out = {};
  for (const [key, opt] of Object.entries(OPTIONS)) {
    const value = String(input[key] ?? opt.default);
    out[key] = Object.hasOwn(opt.choices, value) ? value : opt.default;
  }
  const variation = Number.parseInt(input.variation, 10);
  out.variation = Number.isFinite(variation) ? Math.abs(variation) % 100000 : 0;
  return out;
}

// Kostenloser, deterministischer Prompt-Bau (kein KI-Aufruf).
export function buildTemplatePrompt(settings, width, height) {
  const s = normalizeSettings(settings);
  const pick = (key) => OPTIONS[key].choices[s[key]].text;
  return [
    BASE_PROMPT.replace('{motif}', pick('motif')),
    pick('style'),
    pick('mood'),
    pick('brightness'),
    pick('detail'),
    compositionFor(width, height),
    'no text, no watermark',
    s.variation ? `variation ${s.variation}` : '',
  ].filter(Boolean).join(', ');
}

// Für das Frontend: nur Labels, keine Prompt-Texte.
export function publicOptions() {
  const out = {};
  for (const [key, opt] of Object.entries(OPTIONS)) {
    out[key] = {
      label: opt.label,
      default: opt.default,
      choices: Object.entries(opt.choices).map(([value, c]) => ({ value, label: c.label })),
    };
  }
  return out;
}
