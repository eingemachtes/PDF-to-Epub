// Bildgenerierung über Cloudflare Workers AI (Free-Plan: 10.000 Neurons/Tag).
// Schemas laut cloudflare-docs (src/content/workers-ai-models/*.json).

import { generationSize } from './device.js';

export const DEFAULT_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

const tiles = ({ width, height }) => Math.ceil(width / 512) * Math.ceil(height / 512);

// maxChars: Prompt-Budget. neurons(size): konservative Schätzung pro Bild
// (Kacheln als volles 512er-Raster gerechnet, Preise laut Cloudflare-Pricing).
const MODELS = {
  // Lizenz Apache-2.0. Freie Größe 256–1920 px, feste 4 Schritte, multipart-Eingabe.
  // 26,05 Neurons pro ausgegebener 512²-Kachel.
  '@cf/black-forest-labs/flux-2-klein-4b': {
    longSide: 1536,
    // Volle Original-Prompts (~2.000 Zeichen) passen. Das Token-Limit des
    // Text-Encoders ist für dieses Modell nicht dokumentiert -> beim Test prüfen.
    maxChars: 2400,
    neurons: (size) => 26.05 * tiles(size),
    async run(ai, prompt, size, seed) {
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('width', String(size.width));
      form.append('height', String(size.height));
      if (seed) form.append('seed', String(seed));
      const req = new Response(form);
      return ai.run('@cf/black-forest-labs/flux-2-klein-4b', {
        multipart: { body: req.body, contentType: req.headers.get('content-type') },
      });
    },
  },
  // Lizenz Apache-2.0, sehr günstig, aber KEINE Größenangabe: quadratische
  // Ausgabe, die beim Zuschnitt aufs Handy-Hochformat die Seiten verliert.
  // Prompt max. 2048 Zeichen, Text-Encoder liest effektiv ~256 Tokens.
  '@cf/black-forest-labs/flux-1-schnell': {
    longSide: 1024,
    maxChars: 1000,
    neurons: () => 4 * 4.8 + 4 * 9.6,
    run: (ai, prompt) => ai.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 4 }),
  },
};

export function modelSpec(model = DEFAULT_IMAGE_MODEL) {
  const spec = MODELS[model];
  if (!spec) throw new Error(`Bildmodell nicht unterstützt: ${model}`);
  return spec;
}

export function supportedModels() {
  return Object.keys(MODELS);
}

export function estimateNeurons(model, device) {
  const spec = modelSpec(model);
  return Math.ceil(spec.neurons(generationSize(device, spec.longSide)));
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function generateImage(ai, { prompt, device, seed, model = DEFAULT_IMAGE_MODEL }) {
  const spec = modelSpec(model);
  const result = await spec.run(ai, prompt, generationSize(device, spec.longSide), seed);
  if (!result?.image) throw new Error('Bildmodell lieferte kein Bild');
  return base64ToBytes(result.image);
}
