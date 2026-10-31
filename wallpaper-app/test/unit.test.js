import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTemplatePrompt, normalizeSettings, resolveSettings, publicOptions, motifForDevice, negativePrompt,
} from '../src/prompts.js';
import { normalizeDevice, generationSize, fitLongSide } from '../src/device.js';
import { checkAndCount, remainingFor } from '../src/limits.js';
import { estimateNeurons } from '../src/generator.js';
import { MemoryKV } from './helpers.js';

test('Motiv folgt dem Format', () => {
  assert.equal(motifForDevice(1920, 1200), 'laptop');
  assert.equal(motifForDevice(1200, 2600), 'smartphone');
  assert.equal(motifForDevice(1640, 2360), 'tablet');
});

test('normalizeSettings verwirft unbekannte Werte, auto wird je Gerät aufgelöst', () => {
  const s = normalizeSettings({ motif: 'gibtsnicht', palette: 'graphit' });
  assert.equal(s.motif, 'auto');
  assert.equal(s.palette, 'graphit');
  const laptop = resolveSettings({}, 1920, 1200);
  assert.deepEqual([laptop.motif, laptop.contrast, laptop.calm], ['laptop', 'weich', 'aus']);
  const phone = resolveSettings({}, 1200, 2600);
  assert.deepEqual([phone.motif, phone.contrast, phone.calm], ['smartphone', 'mittel', 'an']);
});

test('Laptop-Prompt mit vollem Budget entspricht inhaltlich dem Original', () => {
  const p = buildTemplatePrompt({}, 1920, 1200, 4000);
  assert.match(p, /orthographic top-down macro photograph/);
  assert.match(p, /heat-spreader plate is cut away diagonally/);
  assert.match(p, /shield half removed/);
  assert.match(p, /wrapper film peeled back/);
  assert.match(p, /petrol-green solder mask/);
  assert.match(p, /Low contrast, lifted blacks/);
  assert.match(p, /speaker enclosures/);
  assert.doesNotMatch(p, /desktop icons/); // Original hat keine Ruhezone
  assert.doesNotMatch(p, /\{|\}/);
});

test('Smartphone-Prompt enthält Ruhezone und mittleren Kontrast', () => {
  const p = buildTemplatePrompt({}, 1200, 2600, 4000);
  assert.match(p, /interior of a large modern smartphone/);
  assert.match(p, /Calm, quiet center area for app icons and the clock/);
  assert.match(p, /moderate contrast/);
  assert.equal(negativePrompt({}, 1200, 2600).includes('screen UI'), true);
});

test('Optionen wirken: geschlossen, Graphit, Ruhezone', () => {
  const p = buildTemplatePrompt({ layers: 'dezent', palette: 'graphit', calm: 'an' }, 1920, 1200, 4000);
  assert.doesNotMatch(p, /cut away|peeled back|half removed/);
  assert.match(p, /charcoal-black solder mask/);
  assert.match(p, /graphite/);
  assert.match(p, /\. Calmer, less busy area on the left third for desktop icons/);
});

test('Budget: Kernbausteine bleiben, Details fallen weg', () => {
  for (const [w, h] of [[1920, 1200], [1200, 2600], [1640, 2360]]) {
    const full = buildTemplatePrompt({}, w, h, 4000);
    const short = buildTemplatePrompt({}, w, h, 1000);
    assert.ok(short.length < full.length);
    assert.match(short, /edge-to-edge/);
    assert.match(short, /Mood:/);
  }
  const shortLaptop = buildTemplatePrompt({}, 1920, 1200, 1000);
  assert.match(shortLaptop, /cut away diagonally/);
  assert.doesNotMatch(shortLaptop, /speaker enclosures/);
  for (const [w, h] of [[1920, 1200], [1200, 2600]]) {
    assert.ok(buildTemplatePrompt({}, w, h, 2000).length <= 2048, 'API-Limit 2048 Zeichen');
  }
});

test('publicOptions verrät keine Prompt-Texte', () => {
  const json = JSON.stringify(publicOptions());
  assert.doesNotMatch(json, /photorealistic|solder/i);
  assert.match(json, /Aufgeschnitten/);
});

test('Gerätegröße wird begrenzt und bereinigt', () => {
  assert.deepEqual(normalizeDevice({ width: 7680, height: 4320 }), { width: 3840, height: 2160 });
  assert.deepEqual(normalizeDevice({ width: 'x' }), { width: 1080, height: 2400 });
  assert.deepEqual(fitLongSide({ width: 1080, height: 2400 }, 1080), { width: 486, height: 1080 });
});

test('Generierungsgröße: Seitenverhältnis, Vielfache von 64, Modellgrenze', () => {
  const phone = generationSize({ width: 1200, height: 2600 }, 1536);
  assert.equal(phone.height, 1536);
  assert.equal(phone.width % 64, 0);
  const laptop = generationSize({ width: 1920, height: 1200 }, 1536);
  assert.deepEqual(laptop, { width: 1536, height: 960 });
});

test('Neuron-Schätzung bleibt im Gratis-Rahmen', () => {
  const n = estimateNeurons('@cf/black-forest-labs/flux-2-klein-4b', { width: 1920, height: 1200 });
  assert.ok(n > 100 && n < 200, `unerwartet: ${n}`);
  assert.ok(Math.floor(9000 / n) >= 40, 'mindestens 40 Bilder pro Tag');
});

test('Limit pro Nutzer und globales Neuron-Budget', async () => {
  const kv = new MemoryKV();
  const base = { salt: 's', perUser: 2, neuronBudget: 450, cost: 150 };
  assert.equal((await checkAndCount(kv, { ...base, ip: '1.1.1.1' })).ok, true);
  assert.equal((await checkAndCount(kv, { ...base, ip: '1.1.1.1' })).ok, true);
  const third = await checkAndCount(kv, { ...base, ip: '1.1.1.1' });
  assert.deepEqual([third.ok, third.reason], [false, 'user']);
  assert.equal(await remainingFor(kv, { ...base, ip: '1.1.1.1' }), 0);
  assert.equal((await checkAndCount(kv, { ...base, ip: '2.2.2.2' })).ok, true);
  const g = await checkAndCount(kv, { ...base, ip: '3.3.3.3' });
  assert.deepEqual([g.ok, g.reason], [false, 'global']);
  assert.ok(![...kv.map.keys()].some((k) => k.includes('1.1.1.1')));
});
