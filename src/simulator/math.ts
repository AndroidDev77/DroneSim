import type { AxisConfig } from "./types";

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const deadzoneApply = (v: number, dz: number) => (Math.abs(v) < dz ? 0 : ((Math.abs(v) - dz) / (1 - dz)) * Math.sign(v));

export function shapeExpo(v: number, expo: number) {
  const e = clamp(expo, 0, 0.95);
  const cubic = v * v * v;
  return v * (1 - e) + cubic * e;
}

export function normalizeAxis(raw: number | undefined, cfg: AxisConfig, isThrottle = false) {
  let v = raw ?? 0;
  if (cfg.invert) v *= -1;
  v = deadzoneApply(v, cfg.deadzone);
  v = shapeExpo(v, cfg.expo);
  if (isThrottle) {
    return clamp((v + 1) / 2, 0, 1);
  }
  return clamp(v, -1, 1);
}
