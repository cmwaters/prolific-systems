import { type FormEvent, useState } from 'react';
import { HeroAnimation } from './components/HeroAnimation';
import './styles.css';

export default function App() {
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const radarCenter = { x: 254, y: 196 };
  const radarRadius = 158;
  const radarDelay = (x: number, y: number) => `${Math.hypot(x - 254, y - 196) / 52}s`;
  const diagnosticPoints = {
    mildew: { x: 194, y: 162 },
    harvest: { x: 344, y: 162 },
    nitrogen: { x: 284, y: 252 },
  };
  const isDiagnosticPoint = (x: number, y: number) =>
    Object.values(diagnosticPoints).some((point) => point.x === x && point.y === y);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setContactStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          message: formData.get('message'),
        }),
      });

      if (!response.ok) throw new Error('Unable to send message');
      form.reset();
      setContactStatus('sent');
    } catch {
      setContactStatus('error');
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="hero" id="hero">
        <div className="hero-copy">
          <h1>
            <span>Prolific</span>
            <span className="inverse-word">Systems</span>
          </h1>
          <p>
            <span className="subheader-emoji" aria-hidden="true">🌱</span>
            <span className="inverse-word">Rethinking</span>
            <span>Autonomous Precision Farming</span>
          </p>
        </div>
        <div className="hero-visual">
          <HeroAnimation />
        </div>
      </section>
      <div className="rainbow-break" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* §02 Advantages */}
      <section className="advantage-section" id="what">
        <div className="advantage-copy">
          <div className="advantage-kicker">01</div>
          <h2>Continuous Monitoring. Continuous Learning</h2>
          <p className="advantage-subtitle">Every plant. Every Day. Richer Data. Predictable Results</p>
          <p className="advantage-body">Prolific's Gantry System observes faster and acts faster. It's more frequent and consistent tracking means it is able to understand more about the specific needs of its field.</p>
        </div>
        <div className="advantage-image monitor-image" aria-label="Continuous monitoring schematic">
          <svg viewBox="0 0 520 380" role="img">
            {Array.from({ length: 9 }).map((_, row) =>
              Array.from({ length: 14 }).map((__, col) => {
                const cx = 74 + col * 30;
                const cy = 72 + row * 30;
                if (Math.hypot(cx - radarCenter.x, cy - radarCenter.y) > radarRadius || isDiagnosticPoint(cx, cy)) return null;
                return (
                  <circle
                    className="radar-dot"
                    key={`${row}-${col}`}
                    cx={cx}
                    cy={cy}
                    r="4.2"
                    style={{ animationDelay: radarDelay(cx, cy) }}
                  />
                );
              }),
            )}
            <g className="sensor-node">
              <circle className="radar-ring radar-ring-1" cx="254" cy="196" r="52" />
              <circle className="radar-ring radar-ring-2" cx="254" cy="196" r="52" />
              <circle className="radar-ring radar-ring-3" cx="254" cy="196" r="52" />
              <path d="M254 118v156M176 196h156" />
              <circle className="sensor-core" cx="254" cy="196" r="24" />
            </g>
            <g className="diagnostics">
              <circle className="radar-dot diagnostic-dot diagnostic-red" cx={diagnosticPoints.mildew.x} cy={diagnosticPoints.mildew.y} r="6" style={{ animationDelay: radarDelay(diagnosticPoints.mildew.x, diagnosticPoints.mildew.y) }} />
              <g className="diagnostic-label" style={{ animationDelay: radarDelay(diagnosticPoints.mildew.x, diagnosticPoints.mildew.y) }}>
                <path className="diagnostic-callout" d={`M${diagnosticPoints.mildew.x} ${diagnosticPoints.mildew.y}L160 136H92`} />
                <text x="86" y="140" textAnchor="end">Powdery Mildew</text>
              </g>
              <circle className="radar-dot diagnostic-dot diagnostic-blue" cx={diagnosticPoints.harvest.x} cy={diagnosticPoints.harvest.y} r="6" style={{ animationDelay: radarDelay(diagnosticPoints.harvest.x, diagnosticPoints.harvest.y) }} />
              <g className="diagnostic-label" style={{ animationDelay: radarDelay(diagnosticPoints.harvest.x, diagnosticPoints.harvest.y) }}>
                <path className="diagnostic-callout" d={`M${diagnosticPoints.harvest.x} ${diagnosticPoints.harvest.y}L390 130H400`} />
                <text x="406" y="134">Ready to Harvest</text>
              </g>
              <circle className="radar-dot diagnostic-dot diagnostic-green" cx={diagnosticPoints.nitrogen.x} cy={diagnosticPoints.nitrogen.y} r="6" style={{ animationDelay: radarDelay(diagnosticPoints.nitrogen.x, diagnosticPoints.nitrogen.y) }} />
              <g className="diagnostic-label" style={{ animationDelay: radarDelay(diagnosticPoints.nitrogen.x, diagnosticPoints.nitrogen.y) }}>
                <path className="diagnostic-callout" d={`M${diagnosticPoints.nitrogen.x} ${diagnosticPoints.nitrogen.y}L330 284H432`} />
                <text x="438" y="288">Low Nitrogen</text>
              </g>
            </g>
          </svg>
        </div>
      </section>

      <section className="advantage-section flip">
        <div className="advantage-copy">
          <div className="advantage-kicker">02</div>
          <h2>High precision, Low Footprint</h2>
          <p className="advantage-subtitle">Impact where it's needed and not where it's not</p>
          <p className="advantage-body">Precision is efficiency. Be able to provide what the plant needs when it needs it. The overhead approach also avoids soil compaction and allows for denser produce. The gantry system is electric, quiet and can continue to operate under wind and rain.</p>
        </div>
        <div className="advantage-image environment-image" aria-label="Low-impact field operation schematic">
          <svg viewBox="0 0 520 380" role="img">
            <g className="gantry-bridge">
              <path d="M86 286V118M434 286V118" />
            </g>
            <path className="envelope-cables" d="M86 118L150 238">
              <animate
                attributeName="d"
                dur="6s"
                repeatCount="indefinite"
                values="M86 118L150 238;M86 118L370 238;M86 118L150 238"
                keyTimes="0;0.5;1"
                keySplines=".45 0 .2 1;.45 0 .2 1"
                calcMode="spline"
              />
            </path>
            <path className="envelope-cables" d="M434 118L150 238">
              <animate
                attributeName="d"
                dur="6s"
                repeatCount="indefinite"
                values="M434 118L150 238;M434 118L370 238;M434 118L150 238"
                keyTimes="0;0.5;1"
                keySplines=".45 0 .2 1;.45 0 .2 1"
                calcMode="spline"
              />
            </path>
            <g className="environment-carriage" transform="translate(150 238)">
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="6s"
                repeatCount="indefinite"
                values="150 238;370 238;150 238"
                keyTimes="0;0.5;1"
                keySplines=".45 0 .2 1;.45 0 .2 1"
                calcMode="spline"
              />
              <circle cx="0" cy="0" r="12" />
            </g>
            <path className="ground-line" d="M58 286H466" />
            <g className="soil-hatching">
              {Array.from({ length: 18 }).map((_, i) => (
                <path key={i} d={`M${70 + i * 22} 324l24-38`} />
              ))}
            </g>
          </svg>
        </div>
      </section>

      <section className="advantage-section">
        <div className="advantage-copy">
          <div className="advantage-kicker">03</div>
          <h2>One System. Endless Tools.</h2>
          <p className="advantage-subtitle">A platform for all your tools: from seeding to harvest.</p>
          <p className="advantage-body">Prolific systems are all about modular systems. Continue to upgrade both software and hardware as advances are made. Easily install the right tools for your farm.</p>
        </div>
        <div className="advantage-image tools-image" aria-label="Interchangeable agricultural tool platform schematic">
          <svg viewBox="0 0 520 380" role="img">
            <path className="rail" d="M58 92H462" />
            <path className="drop" d="M260 92v22" />
            <g className="tool-carousel">
              <g className="tool-node tool-yellow" transform="translate(260 142)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="15s"
                  repeatCount="indefinite"
                  values="260 142;260 142;186 196;186 196;214 283;214 283;306 283;306 283;334 196;334 196;260 142"
                  keyTimes="0;0.12;0.2;0.32;0.4;0.52;0.6;0.72;0.8;0.92;1"
                  keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1"
                  calcMode="spline"
                />
                <circle r="28" />
                <g className="tool-symbol">
                  <path d="M-10 0h20M0-10v20" />
                </g>
              </g>
              <g className="tool-node tool-red" transform="translate(334 196)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="15s"
                  repeatCount="indefinite"
                  values="334 196;334 196;260 142;260 142;186 196;186 196;214 283;214 283;306 283;306 283;334 196"
                  keyTimes="0;0.12;0.2;0.32;0.4;0.52;0.6;0.72;0.8;0.92;1"
                  keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1"
                  calcMode="spline"
                />
                <circle r="28" />
                <g className="tool-symbol">
                  <path d="M-9-9l18 18M9-9L-9 9" />
                </g>
              </g>
              <g className="tool-node tool-purple" transform="translate(306 283)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="15s"
                  repeatCount="indefinite"
                  values="306 283;306 283;334 196;334 196;260 142;260 142;186 196;186 196;214 283;214 283;306 283"
                  keyTimes="0;0.12;0.2;0.32;0.4;0.52;0.6;0.72;0.8;0.92;1"
                  keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1"
                  calcMode="spline"
                />
                <circle r="28" />
                <g className="tool-symbol">
                  <path d="M-12 8c8-28 16-28 24 0" />
                </g>
              </g>
              <g className="tool-node tool-blue" transform="translate(214 283)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="15s"
                  repeatCount="indefinite"
                  values="214 283;214 283;306 283;306 283;334 196;334 196;260 142;260 142;186 196;186 196;214 283"
                  keyTimes="0;0.12;0.2;0.32;0.4;0.52;0.6;0.72;0.8;0.92;1"
                  keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1"
                  calcMode="spline"
                />
                <circle r="28" />
                <g className="tool-symbol">
                  <path d="M-10-10h20v20h-20z" />
                </g>
              </g>
              <g className="tool-node tool-green" transform="translate(186 196)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="15s"
                  repeatCount="indefinite"
                  values="186 196;186 196;214 283;214 283;306 283;306 283;334 196;334 196;260 142;260 142;186 196"
                  keyTimes="0;0.12;0.2;0.32;0.4;0.52;0.6;0.72;0.8;0.92;1"
                  keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1"
                  calcMode="spline"
                />
                <circle r="28" />
                <g className="tool-symbol">
                  <path d="M-14 2h18m0-10v20m6-16l12-8M10 4l14 8" />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </section>

      <div className="rainbow-break" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Footer */}
      <footer>
        <div className="prototype-contact">
          <div>
            <div className="advantage-kicker">Contact</div>
            <h2>Innovation in progress</h2>
            <p>Prolific Systems is still in an early prototype phase. If you would like to reach out, fill out the form and we will come back to you.</p>
          </div>
          <form className="pilot" onSubmit={handleContactSubmit}>
            <div className="field">
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" name="email" type="email" placeholder="you@farm.com" required />
            </div>
            <div className="field">
              <label htmlFor="contact-message">Message</label>
              <textarea id="contact-message" name="message" placeholder="Tell us what problems you'd like us to try solve." required />
            </div>
            <button className="submit" type="submit">
              <span className="ring" aria-hidden="true" />
              {contactStatus === 'sending' ? 'Sending' : 'Send'}
            </button>
            <p className="form-status" role="status">
              {contactStatus === 'sent' && 'Message sent. We will come back to you shortly.'}
              {contactStatus === 'error' && 'Something went wrong. Please try again.'}
            </p>
          </form>
        </div>
        <div className="foot-bot">
          <div>© 2026 Prolific Systems</div>
        </div>
      </footer>
    </>
  );
}
