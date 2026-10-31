import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplatePrompt, normalizeSettings, publicOptions, OPTIONS } from '../src/prompts.js';
import { normalizeDevice, generationSize, fitLongSide } from '../src/device.js';
import { checkAndCount, remainingFor } from '../src/limits.js';
import { MemoryKV } from './helpers.js';

test('normalizeSettings verwirft unbekannte Werte', () => {
  const s = normalizeSettings({ motif: 'gibtsnicht', style: 'aquarell', detail: 3 });
  assert.equal(s.motif, OPTIONS.motif.default);
  assert.equal(s.style, 'aquarell');
  assert.equal(s.detail, '3');
});

test('Template-Prompt enthält Motiv, Komposition und kein Nutzer-Freitext', () => {
  const p = buildTemplatePrompt({ motif: 'technik', mood: 'neon' }, 1080, 2400);
  assert.match(p, /circuit boards/);
  assert.match(p, /neon/);
  assert.match(p, /smartphone wallpaper/);
  const desk = buildTemplatePrompt({}, 1920, 1080);
  assert.match(desk, /desktop wallpaper/);
});

test('publicOptions verrät keine Prompt-Texte', () => {
  const json = JSON.stringify(publicOptions());
  assert.doesNotMatch(json, /photorealistic/);
  assert.match(json, /Fotorealistisch/);
});

test('Gerätegröße wird begrenzt und bereinigt', () => {
  assert.deepEqual(normalizeDevice({ width: 7680, height: 4320 }), { width: 3840, height: 2160 });
  assert.deepEqual(normalizeDevice({ width: 'x' }), { width: 1080, height: 2400 });
  assert.deepEqual(fitLongSide({ width: 1080, height: 2400 }, 1080), { width: 486, height: 1080 });
});

test('Generierungsgröße: Vielfache von 64, lange Seite 1024', () => {
  const g = generationSize({ width: 1080, height: 2400 });
  assert.equal(g.height, 1024);
  assert.equal(g.width % 64, 0);
});

test('Limit pro Nutzer und global', async () => {
  const kv = new MemoryKV();
  const base = { salt: 's', perUser: 2, globalCap: 3 };
  assert.equal((await checkAndCount(kv, { ...base, ip: '1.1.1.1' })).ok, true);
  assert.equal((await checkAndCount(kv, { ...base, ip: '1.1.1.1' })).ok, true);
  const third = await checkAndCount(kv, { ...base, ip: '1.1.1.1' });
  assert.deepEqual([third.ok, third.reason], [false, 'user']);
  assert.equal(await remainingFor(kv, { ...base, ip: '1.1.1.1' }), 0);
  assert.equal((await checkAndCount(kv, { ...base, ip: '2.2.2.2' })).ok, true);
  const g = await checkAndCount(kv, { ...base, ip: '3.3.3.3' });
  assert.deepEqual([g.ok, g.reason], [false, 'global']);
  // IP wird nicht im Klartext gespeichert
  assert.ok(![...kv.map.keys()].some((k) => k.includes('1.1.1.1')));
});
