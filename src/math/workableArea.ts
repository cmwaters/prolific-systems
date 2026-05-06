import { simulate } from './equilibrium';
import type { GantryConfig, WorkableAreaResult } from './types';

const DEFAULT_RESOLUTION = 100;

function pointInsideActiveLayout(config: GantryConfig, x: number, y: number): boolean {
  if (config.towerLayout === 'square') return x >= 0 && x <= config.fieldX && y >= 0 && y <= config.fieldY;

  const h = config.fieldY;
  const d = config.fieldX;
  if (x < 0 || x > d || y < 0 || y > h) return false;

  const leftLimit = x <= d / 2 ? (2 * h * x) / d : (2 * h * (d - x)) / d;
  return y <= leftLimit + 1e-9;
}

export function calculateWorkableArea(config: GantryConfig, resolution = DEFAULT_RESOLUTION): WorkableAreaResult {
  const cellWidth = config.fieldX / resolution;
  const cellHeight = config.fieldY / resolution;
  const cellArea = cellWidth * cellHeight;
  const totalArea = config.towerLayout === 'triangle' ? (config.fieldX * config.fieldY) / 2 : config.fieldX * config.fieldY;
  const cells: WorkableAreaResult['cells'] = [];
  let feasibleArea = 0;
  let warningArea = 0;

  for (let row = 0; row < resolution; row += 1) {
    for (let col = 0; col < resolution; col += 1) {
      const x = (col + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      if (!pointInsideActiveLayout(config, x, y)) continue;

      const result = simulate({ ...config, carriageX: x, carriageY: y });

      if (result.status === 'FEASIBLE') feasibleArea += cellArea;
      else if (result.status === 'FEASIBLE_WITH_WARNINGS') warningArea += cellArea;

      cells.push({
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        status: result.status,
      });
    }
  }

  const workableArea = feasibleArea + warningArea;
  return {
    resolution,
    totalArea,
    workableArea,
    warningArea,
    feasibleArea,
    percentWorkable: totalArea > 0 ? (workableArea / totalArea) * 100 : 0,
    cells,
  };
}

export function createPendingWorkableArea(config: GantryConfig, resolution = DEFAULT_RESOLUTION): WorkableAreaResult {
  const totalArea = config.towerLayout === 'triangle' ? (config.fieldX * config.fieldY) / 2 : config.fieldX * config.fieldY;
  return {
    resolution,
    totalArea,
    workableArea: 0,
    warningArea: 0,
    feasibleArea: 0,
    percentWorkable: 0,
    cells: [],
  };
}

export function calculateWorkableAreaAsync(config: GantryConfig, onComplete: (result: WorkableAreaResult) => void, resolution = DEFAULT_RESOLUTION): () => void {
  const cellWidth = config.fieldX / resolution;
  const cellHeight = config.fieldY / resolution;
  const cellArea = cellWidth * cellHeight;
  const totalArea = config.towerLayout === 'triangle' ? (config.fieldX * config.fieldY) / 2 : config.fieldX * config.fieldY;
  const cells: WorkableAreaResult['cells'] = [];
  let feasibleArea = 0;
  let warningArea = 0;
  let row = 0;
  let cancelled = false;
  let timer: number | undefined;

  const runChunk = () => {
    if (cancelled) return;
    const endRow = Math.min(resolution, row + 2);
    for (; row < endRow; row += 1) {
      for (let col = 0; col < resolution; col += 1) {
        const x = (col + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;
        if (!pointInsideActiveLayout(config, x, y)) continue;

        const result = simulate({ ...config, carriageX: x, carriageY: y });
        if (result.status === 'FEASIBLE') feasibleArea += cellArea;
        else if (result.status === 'FEASIBLE_WITH_WARNINGS') warningArea += cellArea;

        cells.push({
          x: col * cellWidth,
          y: row * cellHeight,
          width: cellWidth,
          height: cellHeight,
          status: result.status,
        });
      }
    }

    if (row < resolution) {
      timer = window.setTimeout(runChunk, 0);
      return;
    }

    const workableArea = feasibleArea + warningArea;
    onComplete({
      resolution,
      totalArea,
      workableArea,
      warningArea,
      feasibleArea,
      percentWorkable: totalArea > 0 ? (workableArea / totalArea) * 100 : 0,
      cells,
    });
  };

  timer = window.setTimeout(runChunk, 0);
  return () => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
