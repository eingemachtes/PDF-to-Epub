// Prompt-Engine: Standard ist die kostenlose Vorlage (prompts.js).
// Claude ist vorbereitet, aber nur aktiv bei PROMPT_ENGINE="claude" UND gesetztem
// ANTHROPIC_API_KEY – die Claude-API hat keinen dauerhaften Gratis-Tarif.

import Anthropic from '@anthropic-ai/sdk';
import { buildTemplatePrompt, normalizeSettings, OPTIONS, compositionFor } from './prompts.js';

const SYSTEM = [
  'You write prompts for a text-to-image model (FLUX).',
  'Theme: wallpapers titled "Blick zum Innenleben" (a look inside): cutaway views revealing hidden inner workings.',
  'Return exactly one English prompt of at most 70 words, no preamble, no quotes, no markdown.',
  'Never ask for text, letters, logos or watermarks in the image.',
].join(' ');

export function claudeEnabled(env) {
  return env.PROMPT_ENGINE === 'claude' && Boolean(env.ANTHROPIC_API_KEY);
}

async function claudePrompt(env, settings, device) {
  const s = normalizeSettings(settings);
  const described = Object.fromEntries(
    Object.keys(OPTIONS).map((k) => [k, OPTIONS[k].choices[s[k]].text]),
  );
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msg = await client.beta.messages.create({
    model: env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: 4000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{
      role: 'user',
      content:
        `Settings: ${JSON.stringify(described)}\n` +
        `Composition: ${compositionFor(device.width, device.height)}\n` +
        `Variation number (use it to vary the details): ${s.variation}`,
    }],
  });
  if (msg.stop_reason === 'refusal') return null;
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  return text || null;
}

// Liefert { prompt, engine }. Bei jedem Claude-Fehler: Fallback auf die Vorlage.
export async function buildPrompt(env, settings, device) {
  if (claudeEnabled(env)) {
    try {
      const prompt = await claudePrompt(env, settings, device);
      if (prompt) return { prompt, engine: 'claude' };
    } catch (err) {
      console.warn('Claude-Prompt fehlgeschlagen, nutze Vorlage:', err?.message);
    }
  }
  return { prompt: buildTemplatePrompt(settings, device.width, device.height), engine: 'template' };
}
