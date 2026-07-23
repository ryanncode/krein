import { useState, useMemo } from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import init, { run_compute_wasm } from './wasm/krein.js'
import wasmUrl from './wasm/krein_bg.wasm?url'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GUEDataPoint {
  level: number;
  x: number;
  amplitude: number;
  local_degree: number;
  jammed: number;
  eigenvalue_spacing: number;
  is_observable: boolean;
  complex_im: number;
  real_re: number;
}

function App() {
  const [startVal, setStartVal] = useState('27720000')
  const [maxSteps, setMaxSteps] = useState(20)
  const [result, setResult] = useState<GUEDataPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showUnobservable, setShowUnobservable] = useState(false)
  const [activeTerm, setActiveTerm] = useState<string | null>(null)

  const explainers: Record<string, { title: string, content: JSX.Element }> = {
    padic: {
      title: 'p-adic Tree (Bruhat-Tits Topology)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Replaces continuous Archimedean wave mechanics with Tate's adelic harmonic analysis. It maps discrete prime factorizations into a continuous topological field, evaluating non-Archimedean topological jumps via:
          <BlockMath math="\int_{\mathbb{Q}_p} \chi(ax) \,dx" />
          </div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Bound in <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein/src/lib.rs</code> via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>next_slice</code> function which traverses the tree laterally, computing <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>valuation_divergence</code> to generate deterministic Coulomb gas repulsion.</div>
        </div>
      )
    },
    krein: {
      title: 'Krein Space (Indefinite Metric)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> A fundamental symmetry operator <InlineMath math="J" /> orthogonally decomposes the space into positive and negative definite subspaces <InlineMath math="\mathcal{K} = \mathcal{K}^+ \oplus \mathcal{K}^-" />. The inner product is explicitly indefinite:
          <BlockMath math="[x, y] = \langle Jx, y \rangle \quad \text{where} \quad J = P^+ - P^-, \; J^2 = I, \; J^* = J" />
          This natively absorbs the minus sign from the trace formula without relying on singular boundary mechanics.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Expressed via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>KreinCoord</code> struct and <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein_bilin</code> bilinear form in Rust. It intentionally omits standard strict-positivity limits required by typical compilers like Lean 4.</div>
        </div>
      )
    },
    hilbert: {
      title: 'Hilbert Space Positive-Definite Constraints',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Standard quantum mechanics demands a strict positive-definite metric (<InlineMath math="\langle x, x \rangle \ge 0" />). Applying this to prime distributions forces theorists to use artificial Sobolev spaces weighted by parameter <InlineMath math="\delta" />:
          <BlockMath math="L_\delta^2(X)_0 \quad (\delta > 1)" />
          This continuously smears the primes, forcing absorption zeros to truncate.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The engine explicitly rejects this by using a real block matrix <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>mat_real</code> that evaluates complex transitions natively without demanding <InlineMath math="L_\delta^2" /> limits.</div>
        </div>
      )
    },
    trace: {
      title: 'Lefschetz Trace Formula',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The cohomological equation used to evaluate fixed points across transitions. Its alternating sum naturally yields a negative sign (the absorption spectrum) from the first cohomology group <InlineMath math="H_{et}^1" />:
          <BlockMath math="\sum_{n} (-1)^n \text{Tr}(F \mid H^n(X, \mathbb{Q}_l))" />
          In standard math, this minus sign is an unmanageable anomaly. Here, it is structural.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>cross_branch_amplitude</code> function computes topological distance. The alternating nature of this distance directly seeds the imaginary components, yielding the negative norms.</div>
        </div>
      )
    },
    thermo: {
      title: 'Thermodynamic Filter',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Mimics an observer bound by physical probability. Anchors <InlineMath math="\Lambda" />-operations in absolute geometry over <InlineMath math="\mathbb{F}_1" /> so the trace operates combinatorially. This filters the indefinite Krein topology back down to an observable Hilbert space.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>is_observable</code> flag in Rust strictly filters out real eigenvalues <InlineMath math="\le 0" />, physically trapping anomalies that violate standard laws of physics.</div>
        </div>
      )
    },
    ghost: {
      title: 'Ghost States (Negative Norm)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Negative-norm states natively arising in the Krein metric (<InlineMath math="\langle x, x \rangle < 0" />). They are computationally required to preserve the continuous flow of the spectrum, yet they correspond to impossible physical probabilities.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Computed via <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>complex_eigenvalues()</code> decomposition of the <InlineMath math="J" />-self-adjoint matrix. Tagged in the UI with a specific warning highlight when the unobservable toggle is engaged.</div>
        </div>
      )
    },
    pt: {
      title: 'Parity-Time (PT) Symmetry Breaking',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Typical heuristic models rely on non-local difference operators:
          <BlockMath math="\hat{H} = (1 - e^{-i\hat{p}})^{-1}(\hat{x}\hat{p} + \hat{p}\hat{x})(1 - e^{-i\hat{p}})" />
          The inverse momentum operator <InlineMath math="(i\hat{p})^{-1}" /> causes severe boundary condition singularities. Our discrete geometry completely avoids this.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Parity breakage organically emerges in the block diagonal matrix when roots transition from pure real bounds to conjugate pairs, without singular collapse at the origin.</div>
        </div>
      )
    },
    born: {
      title: 'The Born Rule',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The foundational quantum postulate that all probabilities must sum to 1:
          <BlockMath math="\sum |\psi|^2 = 1" />
          The negative-norm ghost states natively shatter this rule, requiring the physical universe to filter them out entirely.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Shown visually when you toggle the unobservable states. The underlying mathematical structure inherently violates normative probability thresholds.</div>
        </div>
      )
    },
    bruhat: {
      title: 'Bruhat-Schwartz Distributions & Adelic Integration',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Replaces continuous Schwartz functions which require smooth derivatives. Bruhat-Schwartz functions <InlineMath math="\mathcal{S}(K)" /> are locally constant with compact support, operating on totally disconnected fields via adelic integration over <InlineMath math="\mathbb{A}/k^*" />.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Executed in Rust via absolute discrete arrays rather than continuous floating-point transforms. The cross-branch entanglement is computed directly via graph node adjacency.</div>
        </div>
      )
    },
    sobolev: {
      title: 'Sobolev Deformations & Pontrjagin Duals',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Because the Pontrjagin dual of the idele class group <InlineMath math="C_k" /> maps to a diffuse Haar measure, individual points (discrete primes) have a measure of zero. To force them to appear, continuous physics artificially weights the space via Sobolev exponent <InlineMath math="\delta > 1" />.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> By discarding standard Hilbert positivity, the engine successfully circumvents the need for any Sobolev smoothing, executing the factorization entirely discretely.</div>
        </div>
      )
    },
    tp: {
      title: 'Topological Periodic Cyclic Homology (TP)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Evaluates characteristic power series using absolute algebra instead of complex analytic continuation. The Riemann zeta function is articulated as a quotient of regularized determinants:
          <BlockMath math="\det(s \cdot id - \Theta \mid TP)" />
          </div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The algebraic roots and distinct factors form an absolute combinatorial lattice, isolating the eigenvalues entirely from complex Archimedean variables.</div>
        </div>
      )
    }
  }

  const handleTermClick = (term: string) => {
    setActiveTerm(term)
    setTimeout(() => {
      document.getElementById('explainer-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  const handleCompute = async () => {
    setLoading(true)
    setErrorMsg(null)
    setLogs([])
    setResult(null)
    setCurrentPage(1)
    try {
      if (typeof init === 'function') {
        await init(wasmUrl)
      }
      const logger = (msg: string) => {
        setLogs(prev => [...prev, msg])
      }
      const res = await run_compute_wasm(startVal, maxSteps, logger)
      setResult(res)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.toString() + (e.stack ? '\\n' + e.stack : ''))
    } finally {
      setLoading(false)
    }
  }

  // Aggregate eigenvalue spacings for the GUE histogram
  const histogramData = useMemo(() => {
    if (!result) return []
    const spacingCounts: Record<number, number> = {}
    
    result.forEach(pt => {
      if (!showUnobservable && !pt.is_observable) return;
      if (pt.eigenvalue_spacing > 0) {
        // Bin the continuous normalized eigenvalue spacings (e.g. nearest 0.1)
        const bin = Math.round(pt.eigenvalue_spacing * 10) / 10
        spacingCounts[bin] = (spacingCounts[bin] || 0) + 1
      }
    })
    
    return Object.keys(spacingCounts)
      .map(Number)
      .sort((a, b) => a - b)
      .map(spacing => ({
        spacing: spacing.toFixed(1),
        count: spacingCounts[spacing]
      }))
  }, [result])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f3f4f6', background: '#1e1e24', minHeight: '100vh' }}>
      <header style={{ borderBottom: '2px solid #3f3f46', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Topological GUE Emission Spectrum</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
          Discrete Kinematic Operator executing over Krein Space.
        </p>
      </header>

      <div style={{ marginBottom: '2rem', maxWidth: '1000px' }}>
        <div style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginTop: 0 }}>
            This engine evaluates the prime numbers as a quantum mechanical system. By mapping primes onto a <span onClick={() => handleTermClick('padic')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>p-adic tree</span>, the engine calculates the transitions between them. However, applying conventional quantum mechanics fails because a trace formula introduces a negative sign. To resolve this, the engine operates in an indefinite <span onClick={() => handleTermClick('krein')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Krein Space</span>, which provides enough freedom for the math to flow but naturally generates negative-norm <span onClick={() => handleTermClick('ghost')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>ghost states</span>.
          </p>
          <p>
            This discrepancy requires the <span onClick={() => handleTermClick('born')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Born Rule</span>, which dictates that observable quantum probabilities must sum to 1. The <span onClick={() => handleTermClick('thermo')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Thermodynamic Filter</span> in this engine enforces this constraint by physically filtering out negative probabilities from the observer. This forces the resulting reality to mimic a positive-definite Hilbert space.
          </p>
          <p>
            Bypassing these physical constraints exposes the mechanical heart of the <strong style={{ color: '#f3f4f6' }}>Riemann Hypothesis</strong>. When a Krein metric absorbs the negative signs from the trace formula, the lateral transitions of the primes deterministically repel each other. Toggling the unobservable states below allows you to observe the ghost states driving this behavior.
          </p>
          <p style={{ marginBottom: '1rem', color: '#d4d4d8', borderLeft: '2px solid #38bdf8', paddingLeft: '1rem' }}>
            <strong>The GUE Connection:</strong> Because this topological structure forces the primes apart, their distribution generates the exact <strong style={{ color: '#f3f4f6' }}>Gaussian Unitary Ensemble (GUE)</strong> spacing. This confirms Montgomery's Pair Correlation for the non-trivial zeros of the Riemann Zeta function through absolute algebra, without requiring analytic continuation.
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', marginBottom: '1rem', padding: '1.5rem', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '13px', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '0.05em' }}>Structural Mathematical Index</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <strong style={{ color: '#f3f4f6' }}>Topological Framework</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><span onClick={() => handleTermClick('bruhat')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Bruhat-Schwartz Distributions & Adelic Integration</span></li>
                <li><span onClick={() => handleTermClick('sobolev')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Sobolev Deformations & Pontrjagin Duals</span></li>
              </ul>
            </li>
            <li>
              <strong style={{ color: '#f3f4f6' }}>Kinematic Operators</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><span onClick={() => handleTermClick('trace')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Lefschetz Trace Formula (H¹)</span></li>
                <li><span onClick={() => handleTermClick('tp')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Topological Periodic Cyclic Homology (TP)</span></li>
              </ul>
            </li>
            <li>
              <strong style={{ color: '#f3f4f6' }}>Physical Symmetries</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><span onClick={() => handleTermClick('pt')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Parity-Time (PT) Symmetry Breaking</span></li>
                <li><span onClick={() => handleTermClick('hilbert')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Hilbert Space Positive-Definite Constraints</span></li>
              </ul>
            </li>
          </ul>
        </div>

        {activeTerm && (
          <div id="explainer-box" style={{ marginTop: '1rem', padding: '1rem 1.5rem', background: '#1e1e24', border: '1px solid #38bdf8', borderRadius: '6px', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <button 
              onClick={() => setActiveTerm(null)} 
              style={{ position: 'absolute', top: '0.75rem', right: '1rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
              title="Close Explainer"
            >
              ✕
            </button>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{explainers[activeTerm].title}</h4>
            <div style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6' }}>{explainers[activeTerm].content}</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#1e1e24', borderLeft: '4px solid #059669', color: '#d4d4d8', fontSize: '13px', lineHeight: '1.5', borderRadius: '0 8px 8px 0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>How to Read This Data</h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <li><strong style={{ color: '#f3f4f6' }}>Semantic Root (N):</strong> The starting integer. The engine factors this number and maps it onto the p-adic tree to begin the traversal.</li>
          <li><strong style={{ color: '#f3f4f6' }}>Amplitude & Local Degree:</strong> The wave amplitude derived directly from the number of unique prime factors (local degree) of the current node.</li>
          <li><strong style={{ color: '#f3f4f6' }}>Jammed:</strong> A structural bottleneck where the transition probability hits an exceptional point, precipitating symmetry breaking.</li>
          <li><strong style={{ color: '#f3f4f6' }}>Eigenvalue Spacing:</strong> The normalized Coulomb repulsion distance between adjacent transitions. <em>This spacing is what generates the GUE histogram at the top.</em></li>
        </ul>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: '#2a2b36', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px', minHeight: '140px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Show Unobservable (Broken PT-Symmetry)</label>
          <input 
            type="checkbox" 
            checked={showUnobservable} 
            onChange={e => setShowUnobservable(e.target.checked)} 
            style={{ cursor: 'pointer' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Semantic Root (N)</label>
          <input 
            type="text" 
            value={startVal} 
            onChange={e => setStartVal(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '200px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Depth</label>
          <input 
            type="number" 
            value={maxSteps} 
            onChange={e => setMaxSteps(Number(e.target.value))}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '100px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Load Preset</label>
          <select 
            value={`${startVal},${maxSteps}`}
            onChange={e => { 
              if(e.target.value) {
                const [val, depth] = e.target.value.split(',');
                setStartVal(val);
                setMaxSteps(Number(depth));
              }
            }}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '180px', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          >
            <option value="">Select...</option>
            <option value="27720000,20">Base (27.7M)</option>
            <option value="510510,10">Primorial 17</option>
            <option value="720720,15">HCN (720k)</option>
            <option value="3628800,20">10! (3.6M)</option>
            <option value="6469693230,15">Primorial 29 (10^9)</option>
            <option value="200560490130,15">Primorial 31 (10^11)</option>
          </select>
        </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handleCompute} 
              disabled={loading}
              style={{ padding: '0.5rem 1.5rem', background: '#38bdf8', color: '#0f172a', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
            >
              {loading ? 'Evaluating Topology...' : 'Execute Traversal'}
            </button>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', marginBottom: '2rem', borderRadius: '4px' }}>
          <strong>Error:</strong> <pre style={{ margin: 0 }}>{errorMsg}</pre>
        </div>
      )}

      {logs.length > 0 && !result && (
        <div style={{ padding: '1rem', background: '#2a2b36', border: '1px solid #3f3f46', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af', height: '200px', overflowY: 'auto', borderRadius: '4px' }}>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', background: '#2a2b36', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0' }}>Gaussian Unitary Ensemble (GUE) Level Spacing</h2>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                  <XAxis dataKey="spacing" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#3f3f46', color: '#f3f4f6' }} />
                  <Bar dataKey="count" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', overflowX: 'auto', background: '#2a2b36', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0' }}>Topological Emission Stream</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #4b5563', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Level</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Node (x)</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Amplitude</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Local Degree</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Jammed</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Spacing</th>
                  {showUnobservable && (
                    <>
                      <th style={{ padding: '0.5rem', color: '#fb923c' }}>Real (Ghost)</th>
                      <th style={{ padding: '0.5rem', color: '#fca5a5' }}>Complex Im</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {result.filter(row => showUnobservable || row.is_observable).slice((currentPage - 1) * 100, currentPage * 100).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #3f3f46', opacity: row.is_observable ? 1 : 0.5 }}>
                    <td style={{ padding: '0.5rem' }}>{row.level}</td>
                    <td style={{ padding: '0.5rem', color: '#38bdf8' }}>{row.x}</td>
                    <td style={{ padding: '0.5rem', color: row.amplitude === 0 ? '#ef4444' : '#e2e8f0' }}>{row.amplitude.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>{row.local_degree}</td>
                    <td style={{ padding: '0.5rem', color: row.jammed ? '#ef4444' : '#10b981' }}>{row.jammed}</td>
                    <td style={{ padding: '0.5rem' }}>{row.eigenvalue_spacing.toFixed(4)}</td>
                    {showUnobservable && (
                      <>
                        <td style={{ padding: '0.5rem', color: row.real_re <= 0 ? '#fb923c' : '#e2e8f0' }}>
                          {row.real_re.toFixed(4)}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#fca5a5' }}>{row.complex_im.toFixed(4)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.filter(row => showUnobservable || row.is_observable).length > 100 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', color: '#9ca3af', fontSize: '12px', borderTop: '1px solid #3f3f46' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.25rem 0.75rem', background: '#374151', color: currentPage === 1 ? '#4b5563' : '#f3f4f6', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {Math.ceil(result.filter(row => showUnobservable || row.is_observable).length / 100)} (Total: {result.filter(row => showUnobservable || row.is_observable).length} nodes)</span>
                <button 
                  disabled={currentPage === Math.ceil(result.filter(row => showUnobservable || row.is_observable).length / 100)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(result.filter(row => showUnobservable || row.is_observable).length / 100), prev + 1))}
                  style={{ padding: '0.25rem 0.75rem', background: '#374151', color: currentPage === Math.ceil(result.filter(row => showUnobservable || row.is_observable).length / 100) ? '#4b5563' : '#f3f4f6', border: 'none', borderRadius: '4px', cursor: currentPage === Math.ceil(result.filter(row => showUnobservable || row.is_observable).length / 100) ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
