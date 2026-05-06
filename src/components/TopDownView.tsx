import { useMemo, useRef } from 'react';
import type { GantryConfig, SimulationResult, Vec3, WorkableAreaResult } from '../math/types';
import { clamp, formatM, formatN } from '../math/vector';

interface Props {
  config: GantryConfig;
  result: SimulationResult;
  workableArea: WorkableAreaResult;
  onMove: (x: number, y: number) => void;
  onHeightChange: (patch: Partial<Pick<GantryConfig, 'carriageZ' | 'towerHeight' | 'cropHeight'>>) => void;
}

const PAD = 42;
const RIGHT_CONTROL_GUTTER = 190;
const SHORT_LABELS: Record<string, string> = {
  bottomLeft: 'BL',
  bottomRight: 'BR',
  topRight: 'TR',
  topLeft: 'TL',
  topCenter: 'TC',
};

function arrowPath(from: { x: number; y: number }, vec: { x: number; y: number }, scale: number) {
  const to = { x: from.x + vec.x * scale, y: from.y + vec.y * scale };
  return { from, to };
}

export function TopDownView({ config, result, workableArea, onMove, onHeightChange }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 920;
  const height = 680;
  const plot = useMemo(() => {
    const sx = (width - PAD * 2 - RIGHT_CONTROL_GUTTER) / config.fieldX;
    const sy = (height - PAD * 2) / config.fieldY;
    const s = Math.min(sx, sy);
    const ox = (width - RIGHT_CONTROL_GUTTER - config.fieldX * s) / 2;
    const oy = (height - config.fieldY * s) / 2;
    return {
      s,
      ox,
      oy,
      point: (p: Pick<Vec3, 'x' | 'y'>) => ({ x: ox + p.x * s, y: oy + (config.fieldY - p.y) * s }),
      invert: (x: number, y: number) => ({ x: clamp((x - ox) / s, 0, config.fieldX), y: clamp(config.fieldY - (y - oy) / s, 0, config.fieldY) }),
    };
  }, [config.fieldX, config.fieldY]);
  const areaPaths = useMemo(() => {
    const paths = {
      FEASIBLE: '',
      FEASIBLE_WITH_WARNINGS: '',
      INFEASIBLE: '',
    } satisfies Record<SimulationResult['status'], string>;

    for (const cell of workableArea.cells) {
      const x = plot.ox + cell.x * plot.s;
      const y = plot.oy + (config.fieldY - cell.y - cell.height) * plot.s;
      const w = cell.width * plot.s + 0.25;
      const h = cell.height * plot.s + 0.25;
      paths[cell.status] += `M${x.toFixed(2)} ${y.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h-${w.toFixed(2)}z`;
    }

    return paths;
  }, [config.fieldY, plot, workableArea.cells]);

  const carriage = plot.point(result.carriage);
  const maxTowerForce = Math.max(1, ...result.cables.map((cable) => Math.hypot(cable.towerForce.x, cable.towerForce.y)));
  const maxCarriageForce = Math.max(1, ...result.cables.map((cable) => Math.hypot(cable.carriageForce.x, cable.carriageForce.y)));
  const heightAxisRef = useRef<HTMLDivElement | null>(null);
  const updateTowerHeight = (towerHeight: number) => {
    onHeightChange({ towerHeight, carriageZ: Math.min(config.carriageZ, towerHeight) });
  };
  const updateCarriageZ = (carriageZ: number) => {
    onHeightChange({ carriageZ });
  };
  const updateCropHeight = (cropHeight: number) => {
    onHeightChange({ cropHeight: Math.min(cropHeight, config.towerHeight) });
  };
  const heightToPercent = (heightValue: number) => clamp(((heightValue - 0.5) / (15 - 0.5)) * 100, 0, 100);
  const updateHeightFromPointer = (event: React.PointerEvent<HTMLButtonElement>, kind: 'tower' | 'carriage' | 'crop') => {
    const rect = heightAxisRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    const value = Math.round((0.5 + ratio * (15 - 0.5)) * 10) / 10;
    if (kind === 'tower') updateTowerHeight(Math.max(3, value));
    else if (kind === 'crop') updateCropHeight(Math.min(config.towerHeight, Math.max(0, value)));
    else updateCarriageZ(Math.min(config.towerHeight, Math.max(0.5, value)));
  };

  function updateFromEvent(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    const p = plot.invert(x, y);
    onMove(p.x, p.y);
  }

  return (
    <main className="map-shell">
      <div className="map-frame">
        <svg
          ref={svgRef}
          className="map"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) updateFromEvent(event);
          }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>

          {config.towerLayout === 'triangle' ? (
            <>
              <polygon
                points={`${plot.ox},${plot.oy + config.fieldY * plot.s} ${plot.ox + config.fieldX * plot.s},${plot.oy + config.fieldY * plot.s} ${plot.ox + (config.fieldX * plot.s) / 2},${plot.oy}`}
                className="field-rect"
              />
              <polygon
                points={`${plot.ox},${plot.oy + config.fieldY * plot.s} ${plot.ox + config.fieldX * plot.s},${plot.oy + config.fieldY * plot.s} ${plot.ox + (config.fieldX * plot.s) / 2},${plot.oy}`}
                className="crop-overlay"
              />
            </>
          ) : (
            <>
              <rect x={plot.ox} y={plot.oy} width={config.fieldX * plot.s} height={config.fieldY * plot.s} className="field-rect" />
              <rect x={plot.ox} y={plot.oy} width={config.fieldX * plot.s} height={config.fieldY * plot.s} className="crop-overlay" />
            </>
          )}

          <g className="workable-overlay">
            <path d={areaPaths.INFEASIBLE} className="workable-cell infeasible" />
            <path d={areaPaths.FEASIBLE_WITH_WARNINGS} className="workable-cell warning" />
            <path d={areaPaths.FEASIBLE} className="workable-cell feasible" />
          </g>

          {result.cables.map((cable) => {
            const a = plot.point(cable.anchor);
            const low = plot.point(cable.lowestPoint);
            const mid = plot.point({
              x: (cable.anchor.x + result.carriage.x) / 2,
              y: (cable.anchor.y + result.carriage.y) / 2,
            });
            return (
              <g key={cable.key}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={carriage.x}
                  y2={carriage.y}
                  className={`cable-line ${cable.isSlack ? 'slack' : ''} ${cable.isNonPhysical ? 'nonphysical' : ''}`}
                  style={{ strokeWidth: cable.isSlack ? 1.25 : 1.5 + Math.min(5, cable.workingUtilization / 25) }}
                />
                <circle cx={low.x} cy={low.y} r="5" className={`low-point ${cable.key}`} />
                <text x={mid.x + 8} y={mid.y - 8} className="cable-length-label">
                  {formatM(cable.length)}
                  {cable.excessLength > 0.01 ? ` (+${cable.excessLength.toFixed(2)} m)` : ''}
                </text>
              </g>
            );
          })}

          {result.cables.map((cable) => {
            const { key, anchor } = cable;
            const p = plot.point(anchor);
            const force = Math.hypot(cable.towerForce.x, cable.towerForce.y);
            const vec = { x: cable.towerForce.x / maxTowerForce, y: -cable.towerForce.y / maxTowerForce };
            const arrow = arrowPath(p, vec, 56);
            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r="8" className="tower" />
                <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y} className="tower-arrow" markerEnd="url(#arrow)" />
                <text x={arrow.to.x + 6} y={arrow.to.y - 6} className="force-label">
                  {formatN(force)}
                </text>
              </g>
            );
          })}

          <g>
            {result.cables.map((cable) => {
              const force = Math.hypot(cable.carriageForce.x, cable.carriageForce.y);
              const arrow = arrowPath(carriage, { x: cable.carriageForce.x / maxCarriageForce, y: -cable.carriageForce.y / maxCarriageForce }, 64);
              return (
                <g key={`carriage-force-${cable.key}`}>
                  <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y} className={`carriage-force-arrow ${cable.key} ${cable.isNonPhysical ? 'nonphysical' : ''}`} markerEnd="url(#arrow)" />
                  <text x={arrow.to.x + 6} y={arrow.to.y + 4} className="force-label">
                    {formatN(force)}
                  </text>
                </g>
              );
            })}
            <rect x={carriage.x - 10} y={carriage.y - 10} width="20" height="20" rx="4" className="carriage" />
          </g>
        </svg>
      </div>

      <div className="height-axis-panel" aria-label="Height controls">
        <div className="height-axis-label">Height</div>
        <div className="height-axis" ref={heightAxisRef}>
          <div className="height-axis-line" />
          <button
            type="button"
            className="height-handle crop-handle"
            style={{ bottom: `${heightToPercent(config.cropHeight)}%` }}
            aria-label={`Crop height ${config.cropHeight.toFixed(1)} m`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateHeightFromPointer(event, 'crop');
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateHeightFromPointer(event, 'crop');
            }}
          >
            <span>Crop</span>
            <strong>{config.cropHeight.toFixed(1)} m</strong>
          </button>
          <div className="height-fill" style={{ bottom: `${heightToPercent(config.carriageZ)}%`, height: `${Math.max(0, heightToPercent(config.towerHeight) - heightToPercent(config.carriageZ))}%` }} />
          {result.cables.map((cable) => (
            <div
              key={`height-low-${cable.key}`}
              className={`height-low-marker ${cable.key}`}
              style={{ bottom: `${heightToPercent(cable.lowestPoint.z)}%` }}
              title={`${cable.label} lowest point ${cable.lowestPoint.z.toFixed(2)} m`}
            >
              <span>{SHORT_LABELS[cable.key]}</span>
              <strong>{cable.lowestPoint.z.toFixed(1)} m</strong>
            </div>
          ))}
          <button
            type="button"
            className="height-handle tower-handle"
            style={{ bottom: `${heightToPercent(config.towerHeight)}%` }}
            aria-label={`Tower height ${config.towerHeight.toFixed(1)} m`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateHeightFromPointer(event, 'tower');
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateHeightFromPointer(event, 'tower');
            }}
          >
            <span>Tower</span>
            <strong>{config.towerHeight.toFixed(1)} m</strong>
          </button>
          <button
            type="button"
            className="height-handle carriage-handle"
            style={{ bottom: `${heightToPercent(config.carriageZ)}%` }}
            aria-label={`Carriage height ${config.carriageZ.toFixed(1)} m`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateHeightFromPointer(event, 'carriage');
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateHeightFromPointer(event, 'carriage');
            }}
          >
            <span>Carriage</span>
            <strong>{config.carriageZ.toFixed(1)} m</strong>
          </button>
        </div>
        <div className="height-axis-scale">
          <span>15 m</span>
          <span>0.5 m</span>
        </div>
      </div>
    </main>
  );
}
