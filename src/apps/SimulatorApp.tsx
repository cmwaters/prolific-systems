import { useEffect, useMemo, useState } from 'react';
import { InputPanel } from '../components/InputPanel';
import { OutputPanel } from '../components/OutputPanel';
import { TopDownView } from '../components/TopDownView';
import { simulate } from '../math/equilibrium';
import { calculateWorkableAreaAsync, createPendingWorkableArea } from '../math/workableArea';
import { CABLES, type GantryConfig, type WorkableAreaResult } from '../math/types';
import './simulator.css';

const initialConfig: GantryConfig = {
  towerLayout: 'square',
  fieldX: 200,
  fieldY: 120,
  towerDistance: 160,
  cropHeight: 1.2,
  towerHeight: 6,
  carriageMass: 8,
  carriageThickness: 0.35,
  carriageX: 100,
  carriageY: 60,
  carriageZ: 3.2,
  cable: CABLES[1],
};

function clampConfig(config: GantryConfig): GantryConfig {
  const fieldX = config.towerLayout === 'triangle' ? config.towerDistance : config.fieldX;
  const fieldY = config.towerLayout === 'triangle' ? (Math.sqrt(3) / 2) * config.towerDistance : config.fieldY;

  return {
    ...config,
    fieldX,
    fieldY,
    cropHeight: Math.min(Math.max(config.cropHeight, 0), config.towerHeight),
    carriageX: Math.min(Math.max(config.carriageX, 0), fieldX),
    carriageY: Math.min(Math.max(config.carriageY, 0), fieldY),
    carriageZ: Math.min(Math.max(config.carriageZ, 0.5), config.towerHeight),
  };
}

export function SimulatorApp() {
  const [config, setConfig] = useState<GantryConfig>(initialConfig);
  const safeConfig = useMemo(() => clampConfig(config), [config]);
  const result = useMemo(() => simulate(safeConfig), [safeConfig]);
  const [workableArea, setWorkableArea] = useState<WorkableAreaResult>(() => createPendingWorkableArea(initialConfig));

  useEffect(() => {
    setWorkableArea(createPendingWorkableArea(safeConfig));
    return calculateWorkableAreaAsync(safeConfig, setWorkableArea);
  }, [safeConfig]);

  const patchConfig = (patch: Partial<GantryConfig>) => {
    setConfig((current) => clampConfig({ ...current, ...patch }));
  };

  return (
    <div className="sim-app">
      <InputPanel config={safeConfig} onChange={patchConfig} />
      <TopDownView
        config={safeConfig}
        result={result}
        workableArea={workableArea}
        onMove={(carriageX, carriageY) => patchConfig({ carriageX, carriageY })}
        onHeightChange={patchConfig}
      />
      <OutputPanel result={result} workableArea={workableArea} />
    </div>
  );
}
