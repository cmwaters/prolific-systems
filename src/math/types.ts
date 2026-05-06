export type TowerLayout = 'square' | 'triangle';

export type CableKey = 'bottomLeft' | 'bottomRight' | 'topRight' | 'topLeft' | 'topCenter';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CableSpec {
  name: string;
  linearDensity: number;
  breakingStrength: number;
  workingLoad: number;
}

export interface GantryConfig {
  towerLayout: TowerLayout;
  fieldX: number;
  fieldY: number;
  towerDistance: number;
  cropHeight: number;
  towerHeight: number;
  carriageMass: number;
  carriageThickness: number;
  carriageX: number;
  carriageY: number;
  carriageZ: number;
  cable: CableSpec;
}

export interface CableResult {
  key: CableKey;
  label: string;
  anchor: Vec3;
  isSlack: boolean;
  isNonPhysical: boolean;
  requiredMinimumTension: number;
  horizontalTension: number;
  carriageTension: number;
  towerTension: number;
  carriageForce: Vec3;
  towerForce: Vec3;
  lowestPoint: Vec3;
  length: number;
  chordLength: number;
  excessLength: number;
  weightForce: number;
  sag: number;
  carriageAngleDeg: number;
  towerAngleDeg: number;
  workingUtilization: number;
  breakingUtilization: number;
  path: Vec3[];
}

export interface AuthorityResult {
  posX: number;
  negX: number;
  posY: number;
  negY: number;
  axisX: number;
  axisY: number;
  limiting: Record<'posX' | 'negX' | 'posY' | 'negY', string>;
}

export interface SimulationResult {
  feasible: boolean;
  status: 'FEASIBLE' | 'FEASIBLE_WITH_WARNINGS' | 'INFEASIBLE';
  reasons: string[];
  warnings: string[];
  carriage: Vec3;
  cables: CableResult[];
  residual: Vec3;
  residualMagnitude: number;
  totalCableMass: number;
  totalSystemWeight: number;
  peakTension: number;
  authority: AuthorityResult;
}

export interface WorkableAreaCell {
  x: number;
  y: number;
  width: number;
  height: number;
  status: SimulationResult['status'];
}

export interface WorkableAreaResult {
  resolution: number;
  totalArea: number;
  workableArea: number;
  warningArea: number;
  feasibleArea: number;
  percentWorkable: number;
  cells: WorkableAreaCell[];
}

export const G = 9.81;

export const CABLES: CableSpec[] = [
  { name: 'Dyneema 4mm', linearDensity: 0.008, breakingStrength: 12000, workingLoad: 2400 },
  { name: 'Dyneema 6mm', linearDensity: 0.018, breakingStrength: 28000, workingLoad: 5600 },
  { name: 'Steel wire rope 4mm', linearDensity: 0.062, breakingStrength: 10000, workingLoad: 2000 },
  { name: 'Steel wire rope 6mm', linearDensity: 0.14, breakingStrength: 22500, workingLoad: 4500 },
];
