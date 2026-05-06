import { G, type CableKey, type CableResult, type CableSpec, type Vec3 } from './types';

const SEGMENTS = 128;

const CABLE_LABELS: Record<CableKey, string> = {
  bottomLeft: 'Bottom left',
  bottomRight: 'Bottom right',
  topRight: 'Top right',
  topLeft: 'Top left',
  topCenter: 'Top center',
};

function asinh(value: number): number {
  return Math.asinh(value);
}

function safeSinh(value: number): number {
  return Math.sinh(Math.max(-50, Math.min(50, value)));
}

function safeCosh(value: number): number {
  return Math.cosh(Math.max(-50, Math.min(50, value)));
}

export function solveCable(
  key: CableKey,
  anchor: Vec3,
  carriage: Vec3,
  horizontalTension: number,
  cable: CableSpec,
): CableResult | null {
  const dx = anchor.x - carriage.x;
  const dy = anchor.y - carriage.y;
  const horizontalSpan = Math.hypot(dx, dy);
  if (horizontalSpan < 1e-6 || cable.linearDensity <= 0) return null;
  const chordLength = Math.hypot(horizontalSpan, anchor.z - carriage.z);

  if (horizontalTension <= 1e-6) {
    const lowestPoint = anchor.z < carriage.z ? anchor : carriage;
    return {
      key,
      label: CABLE_LABELS[key],
      anchor,
      isSlack: true,
      isNonPhysical: false,
      requiredMinimumTension: 0,
      horizontalTension: 0,
      carriageTension: 0,
      towerTension: 0,
      carriageForce: { x: 0, y: 0, z: 0 },
      towerForce: { x: 0, y: 0, z: 0 },
      lowestPoint,
      length: chordLength,
      chordLength,
      excessLength: 0,
      weightForce: chordLength * cable.linearDensity * G,
      sag: 0,
      carriageAngleDeg: 0,
      towerAngleDeg: 0,
      workingUtilization: 0,
      breakingUtilization: 0,
      path: [carriage, anchor],
    };
  }

  const w = cable.linearDensity * G;
  const a = horizontalTension / w;
  const dz = anchor.z - carriage.z;
  const halfSpanArg = horizontalSpan / (2 * a);
  const denom = 2 * safeSinh(halfSpanArg);
  if (Math.abs(denom) < 1e-12) return null;

  const x0 = horizontalSpan / 2 - a * asinh((dz / a) / denom);
  const slopeCarriage = safeSinh(-x0 / a);
  const slopeTower = safeSinh((horizontalSpan - x0) / a);
  const eX = dx / horizontalSpan;
  const eY = dy / horizontalSpan;
  const carriageForce = {
    x: horizontalTension * eX,
    y: horizontalTension * eY,
    z: horizontalTension * slopeCarriage,
  };
  const towerForce = {
    x: -horizontalTension * eX,
    y: -horizontalTension * eY,
    z: -horizontalTension * slopeTower,
  };

  const carriageTension = horizontalTension * safeCosh(-x0 / a);
  const towerTension = horizontalTension * safeCosh((horizontalSpan - x0) / a);
  const z0 = carriage.z - a * (safeCosh(-x0 / a) - 1);

  const path: Vec3[] = [];
  let minZ = Number.POSITIVE_INFINITY;
  let lowestPoint: Vec3 = carriage;
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const xLocal = (horizontalSpan * i) / SEGMENTS;
    const z = z0 + a * (safeCosh((xLocal - x0) / a) - 1);
    const point = {
      x: carriage.x + eX * xLocal,
      y: carriage.y + eY * xLocal,
      z,
    };
    if (z < minZ) {
      minZ = z;
      lowestPoint = point;
    }
    path.push(point);
  }
  let sampledArcLength = 0;
  for (let i = 1; i < path.length; i += 1) {
    const previous = path[i - 1];
    const current = path[i];
    sampledArcLength += Math.hypot(current.x - previous.x, current.y - previous.y, current.z - previous.z);
  }

  return {
    key,
    label: CABLE_LABELS[key],
    anchor,
    isSlack: false,
    isNonPhysical: false,
    requiredMinimumTension: 0,
    horizontalTension,
    carriageTension,
    towerTension,
    carriageForce,
    towerForce,
    lowestPoint,
    length: sampledArcLength,
    chordLength,
    excessLength: Math.max(0, sampledArcLength - chordLength),
    weightForce: sampledArcLength * cable.linearDensity * G,
    sag: Math.max(0, Math.min(anchor.z, carriage.z) - minZ),
    carriageAngleDeg: (Math.atan(slopeCarriage) * 180) / Math.PI,
    towerAngleDeg: (Math.atan(slopeTower) * 180) / Math.PI,
    workingUtilization: (Math.max(carriageTension, towerTension) / cable.workingLoad) * 100,
    breakingUtilization: (Math.max(carriageTension, towerTension) / cable.breakingStrength) * 100,
    path,
  };
}
