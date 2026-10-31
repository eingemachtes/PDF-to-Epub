// Zielgröße des Wallpapers aus den Geräteangaben ableiten.

export const MAX_LONG_SIDE = 3840; // 4K-Desktop / größte Smartphones
export const MIN_SIDE = 320;
export const PREVIEW_LONG_SIDE = 1080;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function normalizeDevice(input = {}) {
  let width = Math.round(Number(input.width));
  let height = Math.round(Number(input.height));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    width = 1080;
    height = 2400;
  }
  const long = Math.max(width, height);
  if (long > MAX_LONG_SIDE) {
    const f = MAX_LONG_SIDE / long;
    width = Math.round(width * f);
    height = Math.round(height * f);
  }
  return { width: clamp(width, MIN_SIDE, MAX_LONG_SIDE), height: clamp(height, MIN_SIDE, MAX_LONG_SIDE) };
}

// Skaliert (w, h) so, dass die lange Seite `longSide` ist.
export function fitLongSide({ width, height }, longSide) {
  const f = longSide / Math.max(width, height);
  return { width: Math.round(width * f), height: Math.round(height * f) };
}

// Generierungsgröße für Modelle mit width/height: gleiches Seitenverhältnis,
// lange Seite 1024 px, beide Seiten Vielfache von 64.
export function generationSize(device, longSide = 1024) {
  const { width, height } = fitLongSide(device, longSide);
  const r64 = (v) => clamp(Math.round(v / 64) * 64, 256, longSide);
  return { width: r64(width), height: r64(height) };
}
