// Bildgenerierung über Cloudflare Workers AI (Free-Plan: 10.000 Neurons/Tag).
// Eingabe-/Ausgabeformate laut @cloudflare/workers-types.

import { generationSize } from './device.js';
import { NEGATIVE_PROMPT } from './prompts.js';

export const DEFAULT_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

// Pro Modell: wie der Request gebaut wird und welches Ausgabeformat kommt.
const MODELS = {
  // Günstigstes Modell, Lizenz Apache-2.0. Keine Größenangabe möglich ->
  // quadratische Ausgabe, wird später per "cover" auf das Gerät zugeschnitten.
  '@cf/black-forest-labs/flux-1-schnell': {
    input: (prompt) => ({ prompt, steps: 4 }),
    output: 'base64',
  },
  // Unterstützt width/height (Seitenverhältnis passt besser), kostet aber mehr Neurons.
  '@cf/leonardo/lucid-origin': {
    input: (prompt, size) => ({ prompt, width: size.width, height: size.height, steps: 20 }),
    output: 'base64',
  },
  '@cf/leonardo/phoenix-1.0': {
    input: (prompt, size) => ({ prompt, width: size.width, height: size.height, negative_prompt: NEGATIVE_PROMPT }),
    output: 'binary',
  },
  '@cf/bytedance/stable-diffusion-xl-lightning': {
    input: (prompt, size) => ({ prompt, width: size.width, height: size.height, negative_prompt: NEGATIVE_PROMPT }),
    output: 'binary',
  },
};

export function supportedModels() {
  return Object.keys(MODELS);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function toBytes(result, kind) {
  if (kind === 'base64') {
    if (!result?.image) throw new Error('Bildmodell lieferte kein Bild');
    return base64ToBytes(result.image);
  }
  if (result instanceof ReadableStream) return new Uint8Array(await new Response(result).arrayBuffer());
  if (result instanceof Uint8Array) return result;
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  throw new Error('Unbekanntes Ausgabeformat des Bildmodells');
}

export async function generateImage(ai, { prompt, device, model = DEFAULT_IMAGE_MODEL }) {
  const spec = MODELS[model];
  if (!spec) throw new Error(`Bildmodell nicht unterstützt: ${model}`);
  const result = await ai.run(model, spec.input(prompt, generationSize(device)));
  return toBytes(result, spec.output);
}
