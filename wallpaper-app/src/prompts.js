// Prompt-Bausteine für "Blick zum Innenleben".
//
// Quelle: die Original-Prompts aus der Wallpaper-Sitzung (wörtlich in
// prompts/originale.md). Sie sind hier in priorisierte Bausteine zerlegt, weil
// die Gratis-Bildmodelle die Promptlänge begrenzen (flux-1-schnell: max. 2048
// Zeichen, der Text-Encoder liest effektiv nur ~256 Tokens). Wird es zu lang,
// fallen zuerst die Bausteine mit der höchsten prio-Zahl weg.
//
// Kennzeichnung: "laptop" und "smartphone" stammen aus den Original-Prompts.
// "tablet" sowie die Farbwelten außer "original" sind daraus abgeleitete
// Ergänzungen und noch nicht erprobt.
//
// Platzhalter in Texten: {board} {boardShort} {module} {cables} {flex} {mood} {contrast} {calm}

// ---------- Optionen (erscheinen 1:1 im Frontend) ----------

export const OPTIONS = {
  motif: {
    label: 'Innenleben',
    default: 'auto',
    choices: {
      auto: { label: 'Passend zum Format' },
      laptop: { label: 'Laptop' },
      smartphone: { label: 'Smartphone' },
      tablet: { label: 'Tablet' },
    },
  },
  palette: {
    label: 'Farbwelt',
    default: 'original',
    choices: {
      original: { label: 'Petrol & Kupfer' },
      graphit: { label: 'Graphit' },
      kupfer: { label: 'Warmes Kupfer' },
      eisblau: { label: 'Eisblau' },
    },
  },
  contrast: {
    label: 'Kontrast',
    default: 'auto',
    choices: {
      auto: { label: 'Automatisch' },
      weich: { label: 'Weich' },
      mittel: { label: 'Mittel' },
    },
  },
  layers: {
    label: 'Einblicke',
    default: 'ausgepraegt',
    choices: {
      dezent: { label: 'Geschlossen' },
      ausgepraegt: { label: 'Aufgeschnitten' },
    },
  },
  calm: {
    label: 'Ruhige Fläche für Icons',
    default: 'auto',
    choices: {
      auto: { label: 'Automatisch' },
      an: { label: 'Ja' },
      aus: { label: 'Nein' },
    },
  },
};

// ---------- Farbwelten ----------

const PALETTES = {
  original: {
    board: 'deep matte petrol-green',
    boardShort: 'petrol-green',
    module: 'slate-blue',
    cables: 'ochre and slate-blue',
    flex: 'copper',
    mood: {
      laptop: 'black, charcoal and pale desaturated tones with restrained muted accents (petrol, slate blue, dusty ochre, soft copper)',
      smartphone: 'dark, slightly pale and desaturated, charcoal and blue-grey with muted petrol and dusty copper accents',
    },
  },
  graphit: {
    board: 'deep matte charcoal-black',
    boardShort: 'charcoal-black',
    module: 'dark graphite-grey',
    cables: 'grey and black',
    flex: 'black',
    mood: { all: 'near-monochrome graphite, charcoal and cool grey, only the faintest soft copper hints' },
  },
  kupfer: {
    board: 'deep matte dark olive-brown',
    boardShort: 'olive-brown',
    module: 'smoky bronze',
    cables: 'amber and copper',
    flex: 'copper',
    mood: { all: 'warm charcoal and dark brown tones with muted copper, amber and bronze accents, desaturated' },
  },
  eisblau: {
    board: 'deep matte navy-blue',
    boardShort: 'navy-blue',
    module: 'steel-blue',
    cables: 'pale blue and grey',
    flex: 'silver',
    mood: { all: 'cool charcoal and blue-grey tones with icy pale blue and silver accents, desaturated' },
  },
};

const CONTRAST = {
  weich: 'Low contrast, lifted blacks, smooth even tonal transitions, no harsh highlights or pure white',
  mittel: 'moderate contrast',
};

// ---------- Motive (Bausteine mit Priorität: 1 = immer dabei) ----------
// layers: Text je nach Option "Einblicke" ({ ausgepraegt, dezent }).
// s: 1 = beginnt einen neuen Satz (wie im Original), sonst Komma.

const MOTIFS = {
  laptop: {
    defaults: { contrast: 'weich', calm: 'aus' },
    calmText: 'Calmer, less busy area on the left third for desktop icons',
    segments: [
      { prio: 1, text: 'Photorealistic orthographic top-down macro photograph of the opened interior of a 14-inch business laptop base, framed edge-to-edge so the chassis inner walls touch the image borders, no outer frame, as if the screen were a window into the machine' },
      { s: 1, prio: 2, text: 'Layout: dark anodized aluminum bottom shell with subtle hexagonal ribbing' },
      { prio: 1, text: 'main logic board across the rear half in {board} solder mask with fine, calm, low-contrast copper traces' },
      { prio: 4, text: 'two DDR5 SO-DIMM memory modules on {module} PCBs with black memory chips and gold contacts' },
      { prio: 3, layers: { ausgepraegt: 'M.2 SSD with its brushed-steel shield half removed', dezent: 'M.2 SSD under a closed brushed-steel shield' } },
      { prio: 1, layers: { ausgepraegt: 'a centered processor package whose copper heat-spreader plate is cut away diagonally to reveal the dark glossy silicon die beneath', dezent: 'a centered processor package under a closed copper heat-spreader plate' } },
      { prio: 3, text: 'one muted copper heat pipe running to a fin stack at the rear exhaust' },
      { prio: 2, layers: { ausgepraegt: 'a large blower fan on the left with finely curved blades, a small hub sticker, a few dust specks and a partially removed brushed-metal fan cover', dezent: 'a large blower fan on the left with finely curved blades, a small hub sticker and a few dust specks' } },
      { prio: 5, text: 'a right-side I/O daughterboard with USB-C, USB-A and HDMI ports' },
      { prio: 1, layers: { ausgepraegt: 'a wide three-cell lithium-polymer battery across the front half, one cell with its black wrapper film peeled back to show the raw silver pouch with soft wrinkles, amber kapton tape across the cell joints', dezent: 'a wide three-cell lithium-polymer battery across the front half in black wrapper film, amber kapton tape across the cell joints' } },
      { prio: 5, text: 'a thin protection circuit board along the top edge and a small, understated label' },
      { prio: 6, text: 'two speaker enclosures at the front corners' },
      { prio: 4, text: '{cables} flex ribbon cables, thin antenna coax cables, small Phillips screws with washers' },
      { s: 1, prio: 2, text: '{calm}' },
      { s: 1, prio: 1, text: 'Mood: {mood}' },
      { s: 1, prio: 1, text: '{contrast}' },
      { s: 1, prio: 2, text: 'Soft diffuse key light from the top left, gentle ambient occlusion and contact shadows' },
      { prio: 3, text: 'realistic material textures (brushed metal, matte solder mask, satin battery film), fine photographic grain, shallow but sharp macro focus across the whole plane' },
      { s: 1, prio: 2, text: 'Quiet, premium, technical product photography' },
    ],
    negative: 'text, logos, brand names, watermark, glowing neon, RGB lighting, people, hands, tools, screen, keyboard, exploded view, perspective tilt, vignette frame, border',
  },

  smartphone: {
    defaults: { contrast: 'mittel', calm: 'an' },
    calmText: 'Calm, quiet center area for app icons and the clock',
    segments: [
      { prio: 1, text: 'Photorealistic straight-on macro photograph of the interior of a large modern smartphone, seen from the front as if the display glass were perfectly transparent, portrait orientation, the rounded metal mid-frame filling the image edge-to-edge' },
      { s: 1, prio: 1, text: 'Layout: top third a densely populated main logic board in dark {boardShort} with fine traces, test points and vias' },
      { prio: 2, layers: { ausgepraegt: 'the processor and memory under brushed-steel shielding cans, one can half removed to reveal the dark chips beneath, small retaining clips and rows of tiny capacitors', dezent: 'the processor and memory under brushed-steel shielding cans with small retaining clips and rows of tiny capacitors' } },
      { prio: 2, text: 'a vertical pill-shaped dual rear-camera module in the upper left with two lenses (one large, one smaller), rendered realistically with knurled metal rings, multi-element glass and very subtle green-amber coating reflections, but kept dark and calm so they do not stand out from the rest of the board' },
      { prio: 5, text: 'a small front-camera module top center; earpiece speaker grille at the very top' },
      { s: 1, prio: 1, text: 'Middle and lower area: a large lithium-ion pouch battery with satin silver-grey film, soft wrinkles at the edges, folded sealed corners' },
      { prio: 3, text: 'nickel tabs with spot-weld dots, amber kapton tape strips, a black graphite heat-spreader sheet and small foam pads, only a small discreet label with fine print and no large lettering' },
      { prio: 4, text: 'a faint vapor chamber outline above the battery' },
      { s: 1, prio: 3, text: 'Bottom: a sub-board with USB-C port, speaker box, linear vibration motor, dual SIM tray' },
      { prio: 4, text: 'thin coax antenna cables and {flex} flex cables along the sides; tiny screws' },
      { s: 1, prio: 1, text: 'Mood: {mood}, {contrast}' },
      { s: 1, prio: 2, text: 'Realistic depth: components cast soft shadows onto lower layers, slight depth-of-field softness on the battery, inner shadow along the frame edges' },
      { prio: 5, text: 'a very faint glass reflection with a thin edge highlight' },
      { s: 1, prio: 1, text: '{calm}' },
      { s: 1, prio: 2, text: 'Fine photographic grain, premium technical product photography' },
    ],
    negative: 'large text, logos, brand names, watermark, neon glow, RGB lighting, hands, people, screen UI, icons, exploded view, perspective tilt',
  },

  // Abgeleitet aus dem Smartphone-Prompt (nicht erprobt).
  tablet: {
    defaults: { contrast: 'mittel', calm: 'an' },
    calmText: 'Calm, quiet center area for app icons and widgets',
    segments: [
      { prio: 1, text: 'Photorealistic straight-on macro photograph of the interior of a modern tablet, seen from the front as if the display glass were perfectly transparent, the thin rounded aluminium frame filling the image edge-to-edge' },
      { s: 1, prio: 1, text: 'Layout: a slim main logic board along the top edge in dark {boardShort} with fine traces, test points and vias' },
      { prio: 2, layers: { ausgepraegt: 'processor and memory under brushed-steel shielding cans, one can half removed to reveal the dark chips beneath', dezent: 'processor and memory under brushed-steel shielding cans with small retaining clips' } },
      { prio: 1, text: 'two large side-by-side lithium-ion pouch battery cells filling most of the area, satin silver-grey film with soft wrinkles, amber kapton tape strips' },
      { prio: 3, text: 'a black graphite heat-spreader sheet, small foam pads, only a small discreet label with fine print' },
      { prio: 3, text: 'four speaker boxes in the corners, a USB-C sub-board, thin coax antenna cables and {flex} flex cables along the sides; tiny screws' },
      { s: 1, prio: 1, text: 'Mood: {mood}, {contrast}' },
      { s: 1, prio: 2, text: 'Realistic depth: components cast soft shadows onto lower layers, inner shadow along the frame edges' },
      { s: 1, prio: 1, text: '{calm}' },
      { s: 1, prio: 2, text: 'Fine photographic grain, premium technical product photography' },
    ],
    negative: 'large text, logos, brand names, watermark, neon glow, RGB lighting, hands, people, screen UI, icons, exploded view, perspective tilt',
  },
};

// Gratis-Modelle verstehen keine Negativ-Prompts -> kurz positiv formuliert.
const CLEAN_SUFFIX = 'unbranded surfaces without any readable text or logos';

// ---------- Logik ----------

export function motifForDevice(width, height) {
  const ratio = Math.max(width, height) / Math.min(width, height);
  if (height > width && ratio >= 1.6) return 'smartphone';
  if (height > width) return 'tablet';
  return 'laptop';
}

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

// Löst "auto"-Werte anhand des Geräts auf.
export function resolveSettings(settings, width, height) {
  const s = normalizeSettings(settings);
  const motif = s.motif === 'auto' ? motifForDevice(width, height) : s.motif;
  const d = MOTIFS[motif].defaults;
  return {
    ...s,
    motif,
    contrast: s.contrast === 'auto' ? d.contrast : s.contrast,
    calm: s.calm === 'auto' ? d.calm : s.calm,
  };
}

function fill(text, motif, r) {
  const p = PALETTES[r.palette];
  const vars = {
    board: p.board,
    boardShort: p.boardShort,
    flex: p.flex,
    module: p.module,
    cables: p.cables,
    mood: p.mood[motif] || p.mood.all || p.mood.smartphone,
    contrast: CONTRAST[r.contrast],
    calm: r.calm === 'an' ? MOTIFS[motif].calmText : '',
  };
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Baut den Prompt innerhalb eines Zeichenbudgets. Reihenfolge bleibt wie im
// Original, weggelassen wird nach Priorität.
export function buildTemplatePrompt(settings, width, height, maxChars = 2000) {
  const r = resolveSettings(settings, width, height);
  const motif = MOTIFS[r.motif];
  const parts = motif.segments
    .map((seg, i) => ({ i, s: seg.s, prio: seg.prio, text: fill(seg.text ?? seg.layers[r.layers], r.motif, r).trim() }))
    .filter((p) => p.text);

  const tail = CLEAN_SUFFIX; // Variation läuft über den Seed des Bildmodells
  const joinLen = (list) => list.reduce((n, p) => n + p.text.length + 2, 0) + tail.length;

  const chosen = [];
  for (const p of [...parts].sort((a, b) => a.prio - b.prio || a.i - b.i)) {
    if (p.prio === 1 || joinLen([...chosen, p]) <= maxChars) chosen.push(p);
  }
  chosen.sort((a, b) => a.i - b.i);
  const body = chosen.map((p, k) => (k === 0 ? '' : p.s ? '. ' : ', ') + p.text).join('');
  return `${body}. ${tail[0].toUpperCase()}${tail.slice(1)}.`;
}

export function negativePrompt(settings, width, height) {
  return MOTIFS[resolveSettings(settings, width, height).motif].negative;
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
