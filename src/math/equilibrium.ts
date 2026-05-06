import { solveCable } from './catenary';
import { add, formatN, mag } from './vector';
import { G, type AuthorityResult, type CableKey, type CableResult, type GantryConfig, type SimulationResult, type Vec3 } from './types';

const SQUARE_KEYS: CableKey[] = ['bottomLeft', 'bottomRight', 'topRight', 'topLeft'];
const TRIANGLE_KEYS: CableKey[] = ['bottomLeft', 'bottomRight', 'topCenter'];
const RESIDUAL_TOLERANCE_N = 0.25;
const CABLE_LABELS: Record<CableKey, string> = {
  bottomLeft: 'bottom-left',
  bottomRight: 'bottom-right',
  topRight: 'top-right',
  topLeft: 'top-left',
  topCenter: 'top-center',
};

function cableKeys(config: GantryConfig): CableKey[] {
  return config.towerLayout === 'triangle' ? TRIANGLE_KEYS : SQUARE_KEYS;
}

export function towerAnchors(config: GantryConfig): Record<CableKey, Vec3> {
  const triangleHeight = (Math.sqrt(3) / 2) * config.towerDistance;
  return {
    bottomLeft: { x: 0, y: 0, z: config.towerHeight },
    bottomRight: { x: config.towerLayout === 'triangle' ? config.towerDistance : config.fieldX, y: 0, z: config.towerHeight },
    topRight: { x: config.fieldX, y: config.fieldY, z: config.towerHeight },
    topLeft: { x: 0, y: config.fieldY, z: config.towerHeight },
    topCenter: { x: config.towerDistance / 2, y: triangleHeight, z: config.towerHeight },
  };
}

function horizontalDirections(config: GantryConfig, carriage: Vec3): Array<{ x: number; y: number }> {
  const anchors = towerAnchors(config);
  return cableKeys(config).map((key) => {
    const a = anchors[key];
    const dx = a.x - carriage.x;
    const dy = a.y - carriage.y;
    const d = Math.hypot(dx, dy);
    return d < 1e-9 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
  });
}

function rrefSolve3x4(matrix: number[][], rhs: number[]): { particular: number[]; nullVector: number[] } | null {
  const m = matrix.map((row, i) => [...row, rhs[i]]);
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < 4 && r < 3; c += 1) {
    let pivot = r;
    for (let i = r + 1; i < 3; i += 1) {
      if (Math.abs(m[i][c]) > Math.abs(m[pivot][c])) pivot = i;
    }
    if (Math.abs(m[pivot][c]) < 1e-9) continue;
    [m[r], m[pivot]] = [m[pivot], m[r]];
    const div = m[r][c];
    for (let j = c; j <= 4; j += 1) m[r][j] /= div;
    for (let i = 0; i < 3; i += 1) {
      if (i === r) continue;
      const f = m[i][c];
      for (let j = c; j <= 4; j += 1) m[i][j] -= f * m[r][j];
    }
    pivots.push(c);
    r += 1;
  }
  if (pivots.length < 3) return null;
  const free = [0, 1, 2, 3].find((c) => !pivots.includes(c));
  if (free === undefined) return null;
  const particular = [0, 0, 0, 0];
  const nullVector = [0, 0, 0, 0];
  nullVector[free] = 1;
  for (let i = 0; i < pivots.length; i += 1) {
    const c = pivots[i];
    particular[c] = m[i][4];
    nullVector[c] = -m[i][free];
  }
  return { particular, nullVector };
}

function solveNonnegativeMinPeak(matrix: number[][], rhs: number[], lowerBounds: number[] = [0, 0, 0, 0]): number[] | null {
  if (matrix[0].length === 3) {
    const adjustedRhs = rhs.map((value, row) => value - matrix[row].reduce((sum, coefficient, i) => sum + coefficient * lowerBounds[i], 0));
    const delta = solve3x3(matrix, adjustedRhs);
    if (!delta) return null;
    const tensions = delta.map((value, i) => value + lowerBounds[i]);
    return tensions.every((value, i) => value >= lowerBounds[i] - 1e-7) ? tensions : null;
  }
  const adjustedRhs = rhs.map((value, row) => value - matrix[row].reduce((sum, coefficient, i) => sum + coefficient * lowerBounds[i], 0));
  const solution = rrefSolve3x4(matrix, adjustedRhs);
  if (!solution) return null;
  const { particular, nullVector } = solution;
  let lo = -Number.POSITIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 4; i += 1) {
    const p = particular[i];
    const n = nullVector[i];
    if (Math.abs(n) < 1e-10) {
      if (p < -1e-7) return null;
      continue;
    }
    const bound = -p / n;
    if (n > 0) lo = Math.max(lo, bound);
    else hi = Math.min(hi, bound);
  }
  if (lo > hi) return null;

  const candidates = [lo, hi, 0].filter((v) => Number.isFinite(v) && v >= lo - 1e-7 && v <= hi + 1e-7);
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      const denom = nullVector[i] - nullVector[j];
      if (Math.abs(denom) < 1e-10) continue;
      const lambda = (particular[j] - particular[i]) / denom;
      if (lambda >= lo - 1e-7 && lambda <= hi + 1e-7) candidates.push(lambda);
    }
  }

  let best: number[] | null = null;
  let bestPeak = Number.POSITIVE_INFINITY;
  for (const lambda of candidates) {
    const h = particular.map((p, i) => lowerBounds[i] + Math.max(0, p + lambda * nullVector[i]));
    const peak = Math.max(...h);
    if (peak < bestPeak) {
      bestPeak = peak;
      best = h;
    }
  }
  return best;
}

function solve3x3(matrix: number[][], rhs: number[]): number[] | null {
  const m = matrix.map((row, i) => [...row.slice(0, 3), rhs[i]]);
  for (let c = 0; c < 3; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < 3; r += 1) {
      if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    }
    if (Math.abs(m[pivot][c]) < 1e-9) return null;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    const div = m[c][c];
    for (let j = c; j < 4; j += 1) m[c][j] /= div;
    for (let r = 0; r < 3; r += 1) {
      if (r === c) continue;
      const f = m[r][c];
      for (let j = c; j < 4; j += 1) m[r][j] -= f * m[c][j];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

function solveSignedMinPeak(matrix: number[][], rhs: number[]): number[] | null {
  if (matrix[0].length === 3) return solve3x3(matrix, rhs);
  const solution = rrefSolve3x4(matrix, rhs);
  if (!solution) return null;
  const { particular, nullVector } = solution;
  const candidates = [0];

  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(nullVector[i]) > 1e-10) candidates.push(-particular[i] / nullVector[i]);
    for (let j = i + 1; j < 4; j += 1) {
      const sameDenom = nullVector[i] - nullVector[j];
      if (Math.abs(sameDenom) > 1e-10) candidates.push((particular[j] - particular[i]) / sameDenom);
      const oppositeDenom = nullVector[i] + nullVector[j];
      if (Math.abs(oppositeDenom) > 1e-10) candidates.push((-particular[j] - particular[i]) / oppositeDenom);
    }
  }

  let best: number[] | null = null;
  let bestPeak = Number.POSITIVE_INFINITY;
  for (const lambda of candidates.filter(Number.isFinite)) {
    const h = particular.map((p, i) => p + lambda * nullVector[i]);
    const peak = Math.max(...h.map(Math.abs));
    if (peak < bestPeak) {
      bestPeak = peak;
      best = h;
    }
  }
  return best;
}

function solveSignedWithLowerBounds(matrix: number[][], rhs: number[], lowerBounds: number[]): number[] | null {
  const adjustedRhs = rhs.map((value, row) => value - matrix[row].reduce((sum, coefficient, i) => sum + coefficient * lowerBounds[i], 0));
  const delta = solveSignedMinPeak(matrix, adjustedRhs);
  return delta ? delta.map((value, i) => lowerBounds[i] + value) : null;
}

function clearanceBoundSummary(keys: CableKey[], lowerBounds: number[]): string {
  return lowerBounds.map((bound, i) => `${CABLE_LABELS[keys[i]]} >= ${formatN(bound)}`).join(', ');
}

function minimumHorizontalTensions(config: GantryConfig, carriage: Vec3): number[] {
  const anchors = towerAnchors(config);
  return cableKeys(config).map((key) => {
    const anchor = anchors[key];
    const horizontalSpan = Math.hypot(anchor.x - carriage.x, anchor.y - carriage.y);
    const allowedSag = Math.min(anchor.z, carriage.z) - config.cropHeight;
    if (allowedSag <= 0) return Number.POSITIVE_INFINITY;
    const weightPerMeter = config.cable.linearDensity * G;
    return Math.max(1, (weightPerMeter * horizontalSpan * horizontalSpan) / (8 * allowedSag));
  });
}

function cableDiagnostic(key: CableKey, anchor: Vec3, carriage: Vec3, attemptedHorizontalTension: number): string {
  const horizontalSpan = Math.hypot(anchor.x - carriage.x, anchor.y - carriage.y);
  const verticalDrop = anchor.z - carriage.z;
  return `${CABLE_LABELS[key]} cable, attempted horizontal tension ${formatN(attemptedHorizontalTension)}, span ${horizontalSpan.toFixed(2)} m, tower-carriage height difference ${verticalDrop.toFixed(2)} m, carriage (${carriage.x.toFixed(2)}, ${carriage.y.toFixed(2)}, ${carriage.z.toFixed(2)}) m`;
}

function tensionSummary(keys: CableKey[], tensions: number[]): string {
  return tensions.map((tension, i) => `${CABLE_LABELS[keys[i]]} ${formatN(tension)}`).join(', ');
}

function assemble(config: GantryConfig, carriage: Vec3, horizontalTensions: number[], lowerBounds: number[]): { cables: CableResult[]; error?: string } {
  const anchors = towerAnchors(config);
  const cables: CableResult[] = [];
  const keys = cableKeys(config);
  for (let i = 0; i < keys.length; i += 1) {
    const cable = solveCable(keys[i], anchors[keys[i]], carriage, horizontalTensions[i], config.cable);
    if (!cable) {
      return {
        cables,
        error: `NO_CATENARY_SOLUTION: could not form a valid catenary for the ${cableDiagnostic(keys[i], anchors[keys[i]], carriage, horizontalTensions[i])}. Try increasing tower height, lowering carriage Z, moving the carriage away from that tower, or using a configuration that gives the cable more positive tension.`,
      };
    }
    cables.push({ ...cable, requiredMinimumTension: lowerBounds[i] });
  }
  return { cables };
}

function signedDiagnosticCable(key: CableKey, anchor: Vec3, carriage: Vec3, horizontalTension: number, requiredMinimumTension: number, slope: number, cableSpec: GantryConfig['cable']): CableResult {
  const dx = anchor.x - carriage.x;
  const dy = anchor.y - carriage.y;
  const horizontalSpan = Math.hypot(dx, dy);
  const eX = horizontalSpan > 1e-9 ? dx / horizontalSpan : 0;
  const eY = horizontalSpan > 1e-9 ? dy / horizontalSpan : 0;
  const chordLength = Math.hypot(horizontalSpan, anchor.z - carriage.z);
  const force = { x: horizontalTension * eX, y: horizontalTension * eY, z: horizontalTension * slope };
  return {
    key,
    label: CABLE_LABELS[key].replace('-', ' ').replace(/^./, (value) => value.toUpperCase()),
    anchor,
    isSlack: false,
    isNonPhysical: horizontalTension < 0 || horizontalTension < requiredMinimumTension - 0.1,
    requiredMinimumTension,
    horizontalTension,
    carriageTension: horizontalTension,
    towerTension: horizontalTension,
    carriageForce: force,
    towerForce: { x: -force.x, y: -force.y, z: -force.z },
    lowestPoint: anchor.z < carriage.z ? anchor : carriage,
    length: chordLength,
    chordLength,
    excessLength: 0,
    weightForce: chordLength * cableSpec.linearDensity * G,
    sag: 0,
    carriageAngleDeg: (Math.atan(slope) * 180) / Math.PI,
    towerAngleDeg: (Math.atan(slope) * 180) / Math.PI,
    workingUtilization: (Math.abs(horizontalTension) / cableSpec.workingLoad) * 100,
    breakingUtilization: (Math.abs(horizontalTension) / cableSpec.breakingStrength) * 100,
    path: [carriage, anchor],
  };
}

function assembleSignedDiagnostic(config: GantryConfig, carriage: Vec3, horizontalTensions: number[], lowerBounds: number[], slopes: number[]): CableResult[] {
  const anchors = towerAnchors(config);
  return cableKeys(config).map((key, i) => signedDiagnosticCable(key, anchors[key], carriage, horizontalTensions[i], lowerBounds[i], slopes[i], config.cable));
}

function forceResidual(cables: CableResult[], weight: number): Vec3 {
  return cables.reduce((sum, cable) => add(sum, cable.carriageForce), { x: 0, y: 0, z: -weight });
}

function solveAtZ(config: GantryConfig, z: number): SimulationResult {
  const carriage = { x: config.carriageX, y: config.carriageY, z };
  const keys = cableKeys(config);
  const dirs = horizontalDirections(config, carriage);
  if (dirs.some((d) => Math.hypot(d.x, d.y) < 1e-9)) return infeasible(config, carriage, ['INVALID_GEOMETRY: carriage is horizontally coincident with a tower']);

  const weight = config.carriageMass * G;
  let slopes = dirs.map((d) => {
    const anchorZ = config.towerHeight;
    const span = Math.hypot(d.x, d.y);
    return span === 0 ? 0 : (anchorZ - z) / Math.max(1e-6, Math.hypot(config.fieldX, config.fieldY) / 2);
  });
  let tensions: number[] | null = null;
  let cables: CableResult[] | null = null;
  let lastTensionAttempt: number[] | null = null;
  let signedDiagnosticMode = false;
  const lowerBounds = minimumHorizontalTensions(config, carriage);

  for (let iter = 0; iter < 40; iter += 1) {
    const matrix = [
      dirs.map((d) => d.x),
      dirs.map((d) => d.y),
      slopes,
    ];
    tensions = solveNonnegativeMinPeak(matrix, [0, 0, weight], lowerBounds);
    if (!tensions) {
      const signed = solveSignedWithLowerBounds(matrix, [0, 0, weight], lowerBounds);
      if (!signed) {
      const slopeDetails = slopes.map((s, i) => `${CABLE_LABELS[keys[i]]} slope ${s.toFixed(4)}`).join(', ');
        const lastAttempt = lastTensionAttempt ? ` Last tension attempt: ${tensionSummary(keys, lastTensionAttempt)}.` : '';
        return infeasible(config, carriage, [
          `NEGATIVE_TENSION_REQUIRED: no cable tension distribution could balance the carriage at X ${carriage.x.toFixed(2)} m, Y ${carriage.y.toFixed(2)} m, Z ${carriage.z.toFixed(2)} m. ${slopeDetails}.${lastAttempt}`,
        ]);
      }
      const violating = signed
        .map((value, i) => ({ key: keys[i], value, min: lowerBounds[i] }))
        .filter((item) => item.value < item.min - 0.1)
        .map((item) => `${CABLE_LABELS[item.key]} would need ${formatN(item.value)} but minimum is ${formatN(item.min)}`)
        .join('; ');
      return infeasible(config, carriage, [
        `CROP_CLEARANCE_CONFLICT: no static equilibrium exists while keeping all cable low points above crop height. Required lower bounds: ${clearanceBoundSummary(keys, lowerBounds)}. ${violating}`,
      ]);
    }
    lastTensionAttempt = tensions;
    const assembled = assemble(config, carriage, tensions, lowerBounds);
    if (assembled.error) return infeasible(config, carriage, [assembled.error]);
    cables = assembled.cables;
    const nextSlopes = cables.map((c, i) => (c.horizontalTension > 1e-6 ? c.carriageForce.z / c.horizontalTension : slopes[i]));
    const delta = Math.max(...nextSlopes.map((s, i) => Math.abs(s - slopes[i])));
    slopes = nextSlopes.map((s, i) => 0.55 * s + 0.45 * slopes[i]);
    if (delta < 1e-5) break;
  }

  if (!cables || !tensions) return infeasible(config, carriage, ['SOLVER_NON_CONVERGENCE: no final cable state was produced']);
  const residual = forceResidual(cables, weight);
  const residualMagnitude = mag(residual);
  const warnings = warningsFor(config, cables, lowerBounds);
  const authority = calculateAuthority(config, carriage, tensions);
  const reasons: string[] = [];
  if (residualMagnitude > RESIDUAL_TOLERANCE_N && !signedDiagnosticMode) {
    reasons.push(
      `SOLVER_NON_CONVERGENCE: final residual is ${formatN(residualMagnitude)} with components X ${formatN(residual.x)}, Y ${formatN(residual.y)}, Z ${formatN(residual.z)}. Final horizontal tension attempt: ${tensionSummary(keys, tensions)}.`,
    );
  }
  const totalCableMass = cables.reduce((sum, c) => sum + c.length * config.cable.linearDensity, 0);
  const peakTension = Math.max(...cables.map((c) => Math.max(c.carriageTension, c.towerTension)));

  return {
    feasible: reasons.length === 0,
    status: reasons.length ? 'INFEASIBLE' : warnings.length ? 'FEASIBLE_WITH_WARNINGS' : 'FEASIBLE',
    reasons,
    warnings,
    carriage,
    cables,
    residual,
    residualMagnitude,
    totalCableMass,
    totalSystemWeight: (config.carriageMass + totalCableMass) * G,
    peakTension,
    authority,
  };
}

function warningsFor(config: GantryConfig, cables: CableResult[], lowerBounds: number[]): string[] {
  const warnings: string[] = [];
  for (const [index, cable] of cables.entries()) {
    if (cable.horizontalTension < -0.1) warnings.push(`NEGATIVE_TENSION_REQUIRED: ${cable.label} cable would need ${formatN(cable.carriageTension)}. Cables cannot push, so this is a non-physical diagnostic value.`);
    if (cable.horizontalTension < cable.requiredMinimumTension - 0.1) {
      warnings.push(
        `BELOW_CROP_CLEARANCE_TENSION: ${cable.label} cable would need ${formatN(cable.horizontalTension)}, but at least ${formatN(cable.requiredMinimumTension)} is required to keep that cable above crop height.`,
      );
    }
    if (cable.isSlack) warnings.push(`SLACK_CABLE: ${cable.label} cable has zero tension in this static solution`);
    else if (!cable.isNonPhysical && cable.horizontalTension <= lowerBounds[index] + 0.1) warnings.push(`CROP_CLEARANCE_LIMIT: ${cable.label} cable is at the minimum tension that keeps its lowest point above crop height (${formatN(cable.horizontalTension)})`);
    if (!cable.isNonPhysical && cable.lowestPoint.z < config.cropHeight - 0.01) warnings.push(`CABLE_BELOW_CROP: ${cable.label} cable lowest point is ${cable.lowestPoint.z.toFixed(2)} m, below crop height ${config.cropHeight.toFixed(2)} m`);
    if (cable.workingUtilization > 100) warnings.push(`WORKING_LOAD_EXCEEDED: ${cable.label} cable at ${cable.workingUtilization.toFixed(0)}%`);
    if (cable.breakingUtilization > 100) warnings.push(`BREAKING_STRENGTH_EXCEEDED: ${cable.label} cable at ${cable.breakingUtilization.toFixed(0)}%`);
  }
  return warnings;
}

function calculateAuthority(config: GantryConfig, carriage: Vec3, baseline: number[]): AuthorityResult {
  const keys = cableKeys(config);
  const directions = horizontalDirections(config, carriage);
  const tests = {
    posX: { x: -1, y: 0, label: '+X', cableForce: '+X' },
    negX: { x: 1, y: 0, label: '-X', cableForce: '-X' },
    posY: { x: 0, y: -1, label: '+Y', cableForce: '+Y' },
    negY: { x: 0, y: 1, label: '-Y', cableForce: '-Y' },
  } as const;

  const values: Record<keyof typeof tests, number> = { posX: 0, negX: 0, posY: 0, negY: 0 };
  const limiting: Record<keyof typeof tests, string> = { posX: '', negX: '', posY: '', negY: '' };

  for (const key of Object.keys(tests) as Array<keyof typeof tests>) {
    const t = tests[key];
    const matrix = [directions.map((d) => d.x), directions.map((d) => d.y)];
    const rhs = [t.x, t.y];
    const perNewtonDelta = solveHorizontalDelta(matrix, rhs);
    let best = Number.POSITIVE_INFINITY;
    let bestCable = 'no cable';
    if (perNewtonDelta) {
      for (let i = 0; i < baseline.length; i += 1) {
        if (perNewtonDelta[i] >= -1e-9) continue;
        const limit = baseline[i] / -perNewtonDelta[i];
        if (limit < best) {
          best = limit;
          bestCable = CABLE_LABELS[keys[i]];
        }
      }
    }
    if (!Number.isFinite(best)) {
      best = 0;
      limiting[key] = `${t.label} authority could not find a slack-cable limit with the current linear redistribution model.`;
      values[key] = best;
      continue;
    }
    values[key] = best;
    limiting[key] = `${t.label} authority limited by ${bestCable}: would require negative tension beyond ${best.toFixed(0)} N`;
  }

  return {
    posX: values.posX,
    negX: values.negX,
    posY: values.posY,
    negY: values.negY,
    axisX: Math.min(values.posX, values.negX),
    axisY: Math.min(values.posY, values.negY),
    limiting,
  };
}

function solveHorizontalDelta(matrix: number[][], rhs: number[]): number[] | null {
  const a = matrix[0];
  const b = matrix[1];
  const ata = [
    [a.reduce((s, v) => s + v * v, 0), a.reduce((s, v, i) => s + v * b[i], 0)],
    [a.reduce((s, v, i) => s + v * b[i], 0), b.reduce((s, v) => s + v * v, 0)],
  ];
  const det = ata[0][0] * ata[1][1] - ata[0][1] * ata[1][0];
  if (Math.abs(det) < 1e-9) return null;
  const inv = [
    [ata[1][1] / det, -ata[0][1] / det],
    [-ata[1][0] / det, ata[0][0] / det],
  ];
  const y0 = inv[0][0] * rhs[0] + inv[0][1] * rhs[1];
  const y1 = inv[1][0] * rhs[0] + inv[1][1] * rhs[1];
  return a.map((v, i) => v * y0 + b[i] * y1);
}

function infeasible(config: GantryConfig, carriage: Vec3, reasons: string[]): SimulationResult {
  return {
    feasible: false,
    status: 'INFEASIBLE',
    reasons,
    warnings: [],
    carriage,
    cables: [],
    residual: { x: 0, y: 0, z: -config.carriageMass * G },
    residualMagnitude: config.carriageMass * G,
    totalCableMass: 0,
    totalSystemWeight: config.carriageMass * G,
    peakTension: 0,
    authority: {
      posX: 0,
      negX: 0,
      posY: 0,
      negY: 0,
      axisX: 0,
      axisY: 0,
      limiting: { posX: '', negX: '', posY: '', negY: '' },
    },
  };
}

export function simulate(config: GantryConfig): SimulationResult {
  return solveAtZ(config, config.carriageZ);
}
