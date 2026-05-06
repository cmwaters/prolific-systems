import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { SimulationResult, WorkableAreaResult } from '../math/types';
import { formatM, formatN } from '../math/vector';

interface Props {
  result: SimulationResult;
  workableArea: WorkableAreaResult;
}

export function OutputPanel({ result, workableArea }: Props) {
  const StatusIcon = result.status === 'INFEASIBLE' ? XCircle : result.status === 'FEASIBLE_WITH_WARNINGS' ? AlertTriangle : CheckCircle2;
  return (
    <aside className="panel outputs">
      <div className={`status ${result.status.toLowerCase()}`}>
        <StatusIcon size={18} />
        <strong>{result.status.replaceAll('_', ' ')}</strong>
      </div>

      <section className="authority">
        <h2>Carriage Forces</h2>
        <div className="force-summary-grid">
          <div>
            <span>Total X</span>
            <strong>{formatN(result.cables.reduce((sum, cable) => sum + cable.carriageForce.x, 0))}</strong>
          </div>
          <div>
            <span>Total Y</span>
            <strong>{formatN(result.cables.reduce((sum, cable) => sum + cable.carriageForce.y, 0))}</strong>
          </div>
          <div>
            <span>Total Z</span>
            <strong>{formatN(result.cables.reduce((sum, cable) => sum + cable.carriageForce.z, 0))}</strong>
          </div>
          <div>
            <span>Weight</span>
            <strong>{formatN(result.totalSystemWeight - result.totalCableMass * 9.81)}</strong>
          </div>
        </div>
      </section>

      <section>
        <h2>System</h2>
        <dl className="spec-list">
          <div>
            <dt>Carriage Z</dt>
            <dd>{formatM(result.carriage.z)}</dd>
          </div>
          <div>
            <dt>Peak tension</dt>
            <dd>{formatN(result.peakTension)}</dd>
          </div>
          <div>
            <dt>Residual</dt>
            <dd>{formatN(result.residualMagnitude)}</dd>
          </div>
          <div>
            <dt>Cable mass</dt>
            <dd>{result.totalCableMass.toFixed(2)} kg</dd>
          </div>
          <div>
            <dt>Approx. workable area</dt>
            <dd>
              {workableArea.workableArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} m2
              <span className="muted-stat"> ({workableArea.percentWorkable.toFixed(0)}%)</span>
            </dd>
          </div>
        </dl>
        <div className="area-breakdown" aria-label="Workable area breakdown">
          <div>
            <span>Clean</span>
            <strong>{workableArea.feasibleArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} m2</strong>
          </div>
          <div>
            <span>Warnings</span>
            <strong>{workableArea.warningArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} m2</strong>
          </div>
        </div>
      </section>

      {(result.reasons.length > 0 || result.warnings.length > 0) && (
        <section>
          <h2>Messages</h2>
          <ul className="messages">
            {[...result.reasons, ...result.warnings].map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Cables</h2>
        <div className="cable-table">
          <div className="cable-row cable-header">
            <strong>Cable</strong>
            <span>Tension</span>
            <span>Weight</span>
            <span>Low Z</span>
            <span>Payout</span>
            <span>Curve +</span>
            <span>Util.</span>
          </div>
          {result.cables.map((cable) => (
            <div className="cable-row" key={cable.key}>
              <strong>
                {cable.label}
                {cable.isSlack ? ' (slack)' : ''}
                {cable.horizontalTension < -0.1 ? ' (negative)' : ''}
                {cable.horizontalTension >= -0.1 && cable.isNonPhysical ? ' (below min)' : ''}
              </strong>
              <span>{formatN(cable.carriageTension)}</span>
              <span>{formatN(cable.weightForce)}</span>
              <span>{formatM(cable.lowestPoint.z)}</span>
              <span>{formatM(cable.length)}</span>
              <span>+{cable.excessLength.toFixed(2)} m</span>
              <span>{cable.workingUtilization.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
