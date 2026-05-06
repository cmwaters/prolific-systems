import { CABLES, type CableSpec, type GantryConfig, type TowerLayout } from '../math/types';

interface Props {
  config: GantryConfig;
  onChange: (patch: Partial<GantryConfig>) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number(value.toFixed(3))}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function InputPanel({ config, onChange }: Props) {
  const setTowerLayout = (towerLayout: TowerLayout) => {
    if (towerLayout === 'triangle') {
      const towerDistance = config.towerDistance;
      const triangleHeight = (Math.sqrt(3) / 2) * towerDistance;
      onChange({
        towerLayout,
        fieldX: towerDistance,
        fieldY: triangleHeight,
        carriageX: Math.min(config.carriageX, towerDistance),
        carriageY: Math.min(config.carriageY, triangleHeight),
      });
      return;
    }
    onChange({ towerLayout });
  };

  return (
    <aside className="panel inputs">
      <div className="panel-header">
        <h1>Cable Gantry</h1>
        <p>Static feasibility simulator</p>
      </div>

      <section>
        <h2>Field</h2>
        <div className="mode-field">
          <span>Tower setup</span>
          <div className="segmented" role="group" aria-label="Tower setup">
            <button type="button" className={config.towerLayout === 'square' ? 'active' : ''} onClick={() => setTowerLayout('square')}>
              Square
            </button>
            <button type="button" className={config.towerLayout === 'triangle' ? 'active' : ''} onClick={() => setTowerLayout('triangle')}>
              Triangle
            </button>
          </div>
        </div>
        {config.towerLayout === 'square' ? (
          <>
            <NumberField label="Field X (m)" value={config.fieldX} min={25} max={500} onChange={(fieldX) => onChange({ fieldX, carriageX: Math.min(config.carriageX, fieldX) })} />
            <NumberField label="Field Y (m)" value={config.fieldY} min={25} max={500} onChange={(fieldY) => onChange({ fieldY, carriageY: Math.min(config.carriageY, fieldY) })} />
          </>
        ) : (
          <NumberField
            label="Tower distance (m)"
            value={config.towerDistance}
            min={25}
            max={500}
            onChange={(towerDistance) =>
              onChange({
                towerDistance,
                fieldX: towerDistance,
                fieldY: (Math.sqrt(3) / 2) * towerDistance,
                carriageX: Math.min(config.carriageX, towerDistance),
                carriageY: Math.min(config.carriageY, (Math.sqrt(3) / 2) * towerDistance),
              })
            }
          />
        )}
        <NumberField label="Crop height (m)" value={config.cropHeight} min={0} max={Math.min(5, config.towerHeight)} step={0.1} onChange={(cropHeight) => onChange({ cropHeight })} />
        <NumberField label="Tower height (m)" value={config.towerHeight} min={3} max={15} step={0.1} onChange={(towerHeight) => onChange({ towerHeight, carriageZ: Math.min(config.carriageZ, towerHeight - 0.1) })} />
      </section>

      <section>
        <h2>Carriage</h2>
        <NumberField label="Mass (kg)" value={config.carriageMass} min={1} max={50} step={0.5} onChange={(carriageMass) => onChange({ carriageMass })} />
        <NumberField label="Thickness (m)" value={config.carriageThickness} min={0.1} max={1} step={0.05} onChange={(carriageThickness) => onChange({ carriageThickness })} />
        <NumberField label="X position (m)" value={config.carriageX} min={0} max={config.fieldX} step={0.1} onChange={(carriageX) => onChange({ carriageX })} />
        <NumberField label="Y position (m)" value={config.carriageY} min={0} max={config.fieldY} step={0.1} onChange={(carriageY) => onChange({ carriageY })} />
        <NumberField label="Z position (m)" value={config.carriageZ} min={0.5} max={config.towerHeight} step={0.1} onChange={(carriageZ) => onChange({ carriageZ })} />
      </section>

      <section>
        <h2>Cable</h2>
        <label className="field">
          <span>Type</span>
          <select value={config.cable.name} onChange={(event) => onChange({ cable: CABLES.find((cable) => cable.name === event.target.value) as CableSpec })}>
            {CABLES.map((cable) => (
              <option key={cable.name} value={cable.name}>
                {cable.name}
              </option>
            ))}
          </select>
        </label>
        <dl className="spec-list">
          <div>
            <dt>Density</dt>
            <dd>{config.cable.linearDensity} kg/m</dd>
          </div>
          <div>
            <dt>Working load</dt>
            <dd>{config.cable.workingLoad.toLocaleString()} N</dd>
          </div>
          <div>
            <dt>Breaking strength</dt>
            <dd>{config.cable.breakingStrength.toLocaleString()} N</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
