// Prompt-Engine: Standard ist die kostenlose Vorlage (prompts.js).
// Claude ist vorbereitet, aber nur aktiv bei PROMPT_ENGINE="claude" UND gesetztem
// ANTHROPIC_API_KEY – die Claude-API hat keinen dauerhaften Gratis-Tarif.
// Aufgabe von Claude: den Referenz-Prompt variieren und aufs Budget verdichten,
// ohne die Kernbausteine zu verlieren.

import Anthropic from '@anthropic-ai/sdk';
import { buildTemplatePrompt } from './prompts.js';

const SYSTEM = [
  'You adapt prompts for a FLUX text-to-image model that renders photorealistic wallpapers titled',
  '"Blick zum Innenleben": the opened interior of a device, seen as if the screen were a window into it.',
  'You get a reference prompt. Rewrite it as one English prompt within the given character budget.',
  'Keep, in this order of importance: edge-to-edge framing and camera angle; the main components and their layout;',
  'the cut-away / half-removed layers if present; the colour mood and contrast; the calm area for icons if present;',
  'lighting and material textures. Vary small details using the variation number.',
  'FLUX ignores negations, so describe surfaces as unbranded instead of listing what to avoid.',
  'Output only the prompt: no preamble, no quotes, no markdown.',
].join(' ');

export function claudeEnabled(env) {
  return env.PROMPT_ENGINE === 'claude' && Boolean(env.ANTHROPIC_API_KEY);
}

async function claudePrompt(env, reference, maxChars, variation) {
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
      content: `Character budget: ${maxChars}\nVariation number: ${variation}\n\nReference prompt:\n${reference}`,
    }],
  });
  if (msg.stop_reason === 'refusal') return null;
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  return text ? text.slice(0, maxChars) : null;
}

// Liefert { prompt, engine }. Bei jedem Claude-Fehler: Fallback auf die Vorlage.
export async function buildPrompt(env, settings, device, maxChars) {
  const template = buildTemplatePrompt(settings, device.width, device.height, maxChars);
  if (claudeEnabled(env)) {
    try {
      // Claude bekommt die vollständige Fassung und verdichtet selbst.
      const reference = buildTemplatePrompt(settings, device.width, device.height, 4000);
      const prompt = await claudePrompt(env, reference, maxChars, settings.variation ?? 0);
      if (prompt) return { prompt, engine: 'claude' };
    } catch (err) {
      console.warn('Claude-Prompt fehlgeschlagen, nutze Vorlage:', err?.message);
    }
  }
  return { prompt: template, engine: 'template' };
}
