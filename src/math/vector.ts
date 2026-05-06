import type { Vec3 } from './types';

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function mag(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalize(v: Vec3): Vec3 {
  const m = mag(v);
  if (m < 1e-12) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / m);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatN(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} kN`;
  return `${value.toFixed(1)} N`;
}

export function formatM(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(2)} m`;
}
