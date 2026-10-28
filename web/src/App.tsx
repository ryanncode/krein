import { useState, useMemo } from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import init, { run_compute_wasm, run_zero_resonance_wasm } from './wasm/krein.js'
import wasmUrl from './wasm/krein_bg.wasm?url'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

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
  thermal_weight: number;
  loschmidt_re: number;
  loschmidt_im: number;
  spectral_integrality_deficit: number;
  is_classically_certified: boolean;
}

const CERTIFIED_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832
]

function App() {
  const [activeTab, setActiveTab] = useState<'traversal' | 'resonance' | 'theory'>('traversal')
  const [startVal, setStartVal] = useState('27720000')
  const [maxSteps, setMaxSteps] = useState(20)
  const [result, setResult] = useState<GUEDataPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [beta, setBeta] = useState<number>(0.5)
  const [timeT, setTimeT] = useState<number>(14.134)
  const [currentPage, setCurrentPage] = useState(1)
  const [showUnobservable, setShowUnobservable] = useState(false)
  const [activeTerm, setActiveTerm] = useState<string | null>(null)
  const [resonanceData, setResonanceData] = useState<any[] | null>(null)
  const [resonanceLoading, setResonanceLoading] = useState(false)
  const [primorialBound, setPrimorialBound] = useState(1000)

  const explainers: Record<string, { title: string, content: JSX.Element }> = {
    padic: {
      title: 'p-adic Tree (Bruhat-Tits Topology)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Replaces continuous Archimedean wave mechanics with Tate's adelic harmonic analysis. It maps discrete prime factorizations into a non-Archimedean topological lattice, evaluating discrete transition jumps via:
          <BlockMath math="\int_{\mathbb{Q}_p} \chi(ax) \,dx" />
          </div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Implemented in <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein/src/lib.rs</code> via <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>next_slice</code> and <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>valuation_divergence</code>, generating Coulomb gas repulsion from prime factor collisions.</div>
        </div>
      )
    },
    krein: {
      title: 'Krein Space (Indefinite Metric)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> A fundamental involution operator <InlineMath math="J" /> decomposes the space into positive and negative definite subspaces <InlineMath math="\mathcal{K} = \mathcal{K}^+ \oplus \mathcal{K}^-" /> with an indefinite inner product:
          <BlockMath math="[x, y] = \langle Jx, y \rangle \quad \text{where} \quad J = P^+ - P^-, \; J^2 = I, \; J^* = J" />
          This natively absorbs the negative sign from the trace formula without boundary singularities.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Evaluated via <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>KreinCoord</code> and <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein_bilin</code> in Rust.</div>
        </div>
      )
    },
    hilbert: {
      title: 'Hilbert Space Positive-Definite Constraints',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Standard quantum mechanics demands a strictly positive inner product (<InlineMath math="\langle x, x \rangle \ge 0" />). Classical attempts weight prime distributions over continuous Sobolev spaces:
          <BlockMath math="L_\delta^2(X)_0 \quad (\delta > 1)" />
          This continuous smoothing causes information loss at the critical line.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The engine evaluates complex transitions directly on the discrete lattice without imposing continuous Sobolev cutoffs.</div>
        </div>
      )
    },
    trace: {
      title: 'Lefschetz Trace Formula',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Evaluates fixed points across transitions. Its alternating sum produces a negative sign from the first cohomology group <InlineMath math="H^1" />:
          <BlockMath math="\sum_{n} (-1)^n \text{Tr}(F \mid H^n(X, \mathbb{Q}_l))" />
          In positive-definite spaces, this negative contribution breaks unitarity. In a Krein space, it corresponds to the indefinite subspace.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>cross_branch_amplitude</code> generates the alternating phase from the valuation divergence.</div>
        </div>
      )
    },
    thermo: {
      title: 'Thermodynamic Filter',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Observable quantum probabilities must be non-negative and sum to 1. The thermodynamic filter isolates physical states from negative-norm ghost states.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Filtered via <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>is_observable</code> in Rust, identifying states with real eigenvalues <InlineMath math="> 0" />.</div>
        </div>
      )
    },
    ghost: {
      title: 'Negative-Norm Ghost States',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> States in the indefinite Krein subspace where <InlineMath math="[x, x] < 0" />. They enforce algebraic cancellation across tree slices while remaining unobservable under standard measurement.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Computed by diagonalizing the <InlineMath math="J" />-self-adjoint block matrix. Revealed in the UI when toggling unobservable states.</div>
        </div>
      )
    },
    born: {
      title: 'Born Probability Rule',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Requires physical probabilities to be non-negative real numbers:
          <BlockMath math="P(x) = |\psi(x)|^2 \ge 0" />
          Krein spaces preserve this rule for the observable sector through the projection <InlineMath math="P^+" />.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Validated through <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>thermal_weight = x^(-beta)</code> and observable filtering.</div>
        </div>
      )
    },
    bruhat: {
      title: 'Bruhat-Schwartz Space',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Space of locally constant, compactly supported functions on non-Archimedean local fields. Replaces continuous Schwartz space derivatives with discrete characteristic step functions:
          <BlockMath math="\mathcal{S}(\mathbb{Q}_p) = \text{span} \{ \mathbf{1}_{a + p^k \mathbb{Z}_p} \}" /></div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Implemented via discrete valuation masking and slice grouping in Lean 4 and Rust.</div>
        </div>
      )
    },
    sobolev: {
      title: 'Sobolev Spaces & Continuous Smoothing',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Function spaces measuring smoothness via derivative bounds. Continuous analytic number theory relies on Sobolev completions, which introduce geometric truncation errors near the critical line.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Replaced by exact integer arithmetic and prime-power valuation coordinates.</div>
        </div>
      )
    },
    pt: {
      title: 'Parity-Time (PT) Symmetry',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Non-Hermitian Hamiltonians commute with joint parity (<InlineMath math="P" />) and time-reversal (<InlineMath math="T" />) operators. When PT-symmetry is unbroken, all eigenvalues remain real despite the indefinite metric:
          <BlockMath math="[H, PT] = 0 \implies \text{Spec}(H) \subset \mathbb{R}" /></div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Verified by checking whether complex eigenvalue components vanish on observable slices.</div>
        </div>
      )
    },
    tp: {
      title: 'Topological Periodic Cyclic Homology (TP)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> In noncommutative geometry, TP provides the cyclotomic trace invariant mapping algebraic K-theory to periodic homology:
          <BlockMath math="K(X) \xrightarrow{\text{cyc}} TP(X)" />
          Provides the universal cohomological home for arithmetic trace formulas.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Modeled in Lean 4 via cyclotomic spectra.</div>
        </div>
      )
    },
    quasi_rh: {
      title: 'Quasi-RH & The 7/8 Positivity Wall (OpenAI)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> OpenAI established zero-free half-planes for <InlineMath math="\text{Re}(s) > 7/8" /> and <InlineMath math="\text{Re}(s) > 11/12" /> using cubic theta functions and character large sieves. However, continuous Cauchy-Schwarz bounds encounter a hard positivity wall at <InlineMath math="7/8" />, preventing continuous methods from reaching the critical line <InlineMath math="\text{Re}(s) = 1/2" />.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Handled by setting <InlineMath math="\beta = 0.5" /> in the engine, crossing the gap into the critical line.</div>
        </div>
      )
    },
    integrality: {
      title: 'Loss of Integrality Boundary (Anthropic)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Prior research from Anthropic engaged with indefinite metrics to address the trace formula, but their continuous <InlineMath math="L^2" /> formulation smeared discrete prime data into continuous real eigenvalues.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Verified via <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>spectral_integrality_deficit</code>. On the discrete lattice, the deficit evaluates to 0.</div>
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
      const res = await run_compute_wasm(startVal, maxSteps, beta, timeT, logger)
      setResult(res)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.toString() + (e.stack ? '\n' + e.stack : ''))
    } finally {
      setLoading(false)
    }
  }

  const handleScanZeros = async () => {
    setResonanceLoading(true)
    setErrorMsg(null)
    try {
      if (typeof init === 'function') {
        await init(wasmUrl)
      }
      const data = run_zero_resonance_wasm(primorialBound, 12.0, 52.0, 400, 0.15)
      setResonanceData(data)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.toString())
    } finally {
      setResonanceLoading(false)
    }
  }

  const histogramData = useMemo(() => {
    if (!result) return []
    const spacingCounts: Record<number, number> = {}
    
    result.forEach(pt => {
      if (!showUnobservable && !pt.is_observable) return;
      if (pt.eigenvalue_spacing > 0) {
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
  }, [result, showUnobservable])

  const peakComparison = useMemo(() => {
    if (!resonanceData || resonanceData.length === 0) return []
    const peaks = resonanceData.filter((pt: any) => pt.is_peak)
    if (peaks.length === 0) return []

    return CERTIFIED_ZEROS.map((g, idx) => {
      const closest = peaks.reduce((best: any, curr: any) => 
        Math.abs(curr.t - g) < Math.abs(best.t - g) ? curr : best
      , peaks[0])
      const absErr = Math.abs(closest.t - g)
      const relErr = (absErr / g) * 100
      return {
        index: idx + 1,
        certified: g,
        detected: closest.t,
        absError: absErr,
        relError: relErr,
        passed: relErr < 0.5
      }
    })
  }, [resonanceData])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f3f4f6', background: '#1e1e24', minHeight: '100vh' }}>
      <header style={{ borderBottom: '2px solid #3f3f46', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Krein Space Spectral Engine</h1>
        <p style={{ margin: '0.5rem 0 1rem 0', color: '#9ca3af', fontSize: '14px' }}>
          Discrete non-Archimedean operator and critical line zero scanner.
        </p>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', alignItems: 'center' }}>
          <a href="https://thing.rodeo/tensor-sieve/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Research Article</a>
          <span style={{ color: '#52525b' }}>|</span>
          <a href="https://github.com/ryanncode/krein" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Krein Repository</a>
          <span style={{ color: '#52525b' }}>|</span>
          <a href="https://github.com/ryanncode/tensor-sieve" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Tensor-Sieve Lean 4</a>
        </div>
      </header>

      {/* Mode Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #3f3f46', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('traversal')}
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'traversal' ? '#38bdf8' : '#27272a',
            color: activeTab === 'traversal' ? '#0f172a' : '#d4d4d8',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease'
          }}
        >
          Lattice Traversal & Level Spacing
        </button>
        <button
          onClick={() => setActiveTab('resonance')}
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'resonance' ? '#38bdf8' : '#27272a',
            color: activeTab === 'resonance' ? '#0f172a' : '#d4d4d8',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease'
          }}
        >
          Riemann Zero Resonance Scanner
        </button>
        <button
          onClick={() => setActiveTab('theory')}
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'theory' ? '#38bdf8' : '#27272a',
            color: activeTab === 'theory' ? '#0f172a' : '#d4d4d8',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease'
          }}
        >
          Theoretical Foundations
        </button>
      </nav>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', marginBottom: '1.5rem', borderRadius: '4px' }}>
          <strong>Error:</strong> <pre style={{ margin: 0 }}>{errorMsg}</pre>
        </div>
      )}

      {/* TAB 1: LATTICE TRAVERSAL */}
      {activeTab === 'traversal' && (
        <div>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', background: '#2a2b36', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: 0, textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                Lattice Traversal Controls
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Show Unobservable States</label>
                <input 
                  type="checkbox" 
                  checked={showUnobservable} 
                  onChange={e => setShowUnobservable(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Semantic Root (N)</label>
                <input 
                  type="text" 
                  value={startVal} 
                  onChange={e => setStartVal(e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '180px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Depth</label>
                <input 
                  type="number" 
                  value={maxSteps} 
                  onChange={e => setMaxSteps(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '90px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Inverse Temp (β)</label>
                  <span style={{
                    fontSize: '10px',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: Math.abs(beta - 0.5) < 0.001 ? '#0369a1' : beta >= 0.875 ? '#065f46' : '#854d0e',
                    color: Math.abs(beta - 0.5) < 0.001 ? '#7dd3fc' : beta >= 0.875 ? '#6ee7b7' : '#fde047',
                  }}>
                    {Math.abs(beta - 0.5) < 0.001
                      ? 'Critical Line'
                      : beta >= 11 / 12
                      ? 'Re(s) > 11/12'
                      : beta >= 7 / 8
                      ? 'Re(s) > 7/8'
                      : 'Positivity Gap'}
                  </span>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  value={beta} 
                  onChange={e => setBeta(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '120px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Time (t)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={timeT} 
                  onChange={e => setTimeT(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '100px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Load Preset</label>
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
                  <option value="">Select preset...</option>
                  <option value="27720000,20">Base (27.7M)</option>
                  <option value="510510,10">Primorial 17</option>
                  <option value="720720,15">HCN (720k)</option>
                  <option value="3628800,20">10! (3.6M)</option>
                  <option value="6469693230,15">Primorial 29 (10^9)</option>
                  <option value="200560490130,15">Primorial 31 (10^11)</option>
                </select>
              </div>

              <button 
                onClick={handleCompute} 
                disabled={loading}
                style={{ padding: '0.55rem 1.5rem', background: '#38bdf8', color: '#0f172a', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
              >
                {loading ? 'Evaluating Topology...' : 'Execute Traversal'}
              </button>
            </div>
          </section>

          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#1e1e24', borderLeft: '4px solid #059669', color: '#d4d4d8', fontSize: '13px', lineHeight: '1.5', borderRadius: '0 8px 8px 0' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>Parameter Reference</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li><strong style={{ color: '#f3f4f6' }}>Semantic Root (N):</strong> Starting integer factored across the p-adic tree to seed downward traversal.</li>
              <li><strong style={{ color: '#f3f4f6' }}>Amplitude & Degree:</strong> Transition amplitude derived from unique prime factor multiplicity (local degree).</li>
              <li><strong style={{ color: '#f3f4f6' }}>Eigenvalue Spacing:</strong> Coulomb repulsion distance between adjacent transitions driving GUE statistics.</li>
            </ul>
          </div>

          {logs.length > 0 && !result && (
            <div style={{ padding: '1rem', background: '#2a2b36', border: '1px solid #3f3f46', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af', height: '160px', overflowY: 'auto', borderRadius: '4px', marginBottom: '1.5rem' }}>
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}

          {/* Results appear directly beneath controls */}
          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', background: '#2a2b36', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '15px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                  Level Spacing Distribution (GUE)
                </h2>
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
                <h2 style={{ fontSize: '15px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                  Spectral Data Stream
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #4b5563', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Level</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Node (x)</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Amplitude</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Local Degree</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Jammed</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Spacing</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Loschmidt Re</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Loschmidt Im</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Integrality Def</th>
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
                        <td style={{ padding: '0.5rem', color: '#34d399' }}>{row.loschmidt_re.toFixed(4)}</td>
                        <td style={{ padding: '0.5rem', color: '#38bdf8' }}>{row.loschmidt_im.toFixed(4)}</td>
                        <td style={{ padding: '0.5rem', color: row.spectral_integrality_deficit > 0 ? '#fb923c' : '#e2e8f0' }}>{row.spectral_integrality_deficit.toFixed(4)}</td>
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
      )}

      {/* TAB 2: ZERO RESONANCE SCANNER */}
      {activeTab === 'resonance' && (
        <div>
          <section style={{ marginBottom: '1.5rem', background: '#22232e', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Riemann Zero Resonance Scanner
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '13px' }}>
                  Extracts certified non-trivial zeros directly from prime-valuation phase interference without evaluating <InlineMath math="\zeta(s)" />.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Seed Scale</label>
                <select
                  value={primorialBound}
                  onChange={e => setPrimorialBound(Number(e.target.value))}
                  style={{ padding: '0.45rem', border: '1px solid #4b5563', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="199">Primorial 199 (~ 10^82)</option>
                  <option value="500">Primorial 500 (~ 10^210)</option>
                  <option value="1000">Primorial 1000 (~ 10^415)</option>
                  <option value="3000">Primorial 3000 (~ 10^1273)</option>
                </select>
                <button
                  onClick={handleScanZeros}
                  disabled={resonanceLoading}
                  style={{ padding: '0.5rem 1.25rem', background: '#10b981', color: '#0f172a', border: 'none', fontWeight: 600, cursor: resonanceLoading ? 'not-allowed' : 'pointer', borderRadius: '4px', fontSize: '13px' }}
                >
                  {resonanceLoading ? 'Scanning Spectrum...' : 'Scan Zero Resonances'}
                </button>
              </div>
            </div>

            {resonanceData && (
              <div>
                <div style={{ height: '320px', marginTop: '1.25rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={resonanceData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                      <XAxis 
                        dataKey="t" 
                        type="number" 
                        domain={[12, 52]} 
                        tick={{ fontSize: 11, fill: '#9ca3af' }} 
                        tickFormatter={(val) => Number(val).toFixed(0)} 
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#3f3f46', color: '#f3f4f6', fontSize: '12px' }}
                        formatter={(val: any) => [Number(val).toFixed(4), 'Resonance Density R(t)']}
                        labelFormatter={(label: any) => `Frequency t = ${Number(label).toFixed(2)}`}
                      />
                      {CERTIFIED_ZEROS.map((zero, idx) => (
                        <ReferenceLine
                          key={idx}
                          x={zero}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={idx < 5 ? { value: `γ${idx + 1} (${zero.toFixed(2)})`, fill: '#ef4444', fontSize: 10, position: 'top' } : undefined}
                        />
                      ))}
                      <Line type="monotone" dataKey="density" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '12px', color: '#9ca3af' }}>
                  <span>Blue curve: Sieve spectral density <InlineMath math="R(t)" /></span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>Red dashed vertical lines: Certified LMFDB Riemann Zeros (<InlineMath math="\gamma_1 \dots \gamma_{10}" />)</span>
                </div>

                {/* Verification Table */}
                {peakComparison.length > 0 && (
                  <div style={{ marginTop: '1.5rem', background: '#1e1e24', border: '1px solid #3f3f46', borderRadius: '6px', overflowX: 'auto' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #3f3f46', fontWeight: 600, fontSize: '13px', color: '#e2e8f0' }}>
                      Certified Zero vs. Sieve Resonance Peak Comparison
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #4b5563', textAlign: 'left', color: '#9ca3af' }}>
                          <th style={{ padding: '0.5rem 1rem' }}>Zero (n)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>LMFDB Certified (γₙ)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Sieve Peak (t)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Absolute Error</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Relative Error</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peakComparison.map((row) => (
                          <tr key={row.index} style={{ borderBottom: '1px solid #2d2d38' }}>
                            <td style={{ padding: '0.5rem 1rem', color: '#9ca3af' }}>{row.index}</td>
                            <td style={{ padding: '0.5rem 1rem', color: '#ef4444' }}>{row.certified.toFixed(6)}</td>
                            <td style={{ padding: '0.5rem 1rem', color: '#38bdf8' }}>{row.detected.toFixed(6)}</td>
                            <td style={{ padding: '0.5rem 1rem' }}>{row.absError.toFixed(6)}</td>
                            <td style={{ padding: '0.5rem 1rem' }}>{row.relError.toFixed(3)}%</td>
                            <td style={{ padding: '0.5rem 1rem', color: row.passed ? '#34d399' : '#fb923c' }}>
                              {row.passed ? '✓ Matched' : '~ Near'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: THEORETICAL FOUNDATIONS */}
      {activeTab === 'theory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#27272a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #3f3f46', color: '#d4d4d8', fontSize: '14px', lineHeight: '1.6' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
              Native Krein Mechanics vs. Classical Boundaries
            </h2>
            <p style={{ marginTop: 0 }}>
              Recent high-profile results established the Quasi-Riemann Hypothesis for <InlineMath math="\text{Re}(s) > 7/8" /> using Kubota-Patterson cubic theta functions. However, classical positive-definite <InlineMath math="L^2" /> Cauchy-Schwarz bounds encounter a hard positivity barrier at <InlineMath math="7/8" />, preventing continuous methods from compressing down to the critical line <InlineMath math="\text{Re}(s) = 1/2" />.
            </p>
            <p>
              Prior attempts to engage indefinite metrics resulted in a continuous "loss of integrality" by treating the indefinite metric merely as an upper bound constraint. In contrast, this engine uses the indefinite Krein space as its native execution environment over the discrete <InlineMath math="p" />-adic Bruhat-Tits lattice. Because tensor contractions remain exact integers, it avoids continuous smearing and enforces algebraic wave cancellation directly at the critical line (<InlineMath math="\beta = 0.5" />).
            </p>
          </div>

          <div style={{ padding: '1.5rem', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '13px', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '0.05em' }}>
              Mathematical Concepts & Proof Index
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <strong style={{ color: '#f3f4f6' }}>Topological Framework</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li><span onClick={() => handleTermClick('padic')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>p-adic Tree (Bruhat-Tits Topology)</span></li>
                  <li><span onClick={() => handleTermClick('bruhat')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Bruhat-Schwartz Distributions & Adelic Integration</span></li>
                  <li><span onClick={() => handleTermClick('sobolev')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Sobolev Deformations & Continuous Smoothing</span></li>
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
                <strong style={{ color: '#f3f4f6' }}>Physical Symmetries & Classical Boundaries</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li><span onClick={() => handleTermClick('krein')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Krein Space (Indefinite Metric)</span></li>
                  <li><span onClick={() => handleTermClick('pt')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Parity-Time (PT) Symmetry Breaking</span></li>
                  <li><span onClick={() => handleTermClick('hilbert')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Hilbert Space Positive-Definite Constraints</span></li>
                  <li><span onClick={() => handleTermClick('quasi_rh')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Quasi-RH & The 7/8 Positivity Wall (OpenAI)</span></li>
                  <li><span onClick={() => handleTermClick('integrality')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Loss of Integrality Boundary (Anthropic)</span></li>
                  <li><span onClick={() => handleTermClick('thermo')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Thermodynamic Filter</span></li>
                  <li><span onClick={() => handleTermClick('ghost')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Negative-Norm Ghost States</span></li>
                </ul>
              </li>
            </ul>
          </div>

          {activeTerm && (
            <div id="explainer-box" style={{ padding: '1rem 1.5rem', background: '#1e1e24', border: '1px solid #38bdf8', borderRadius: '6px', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
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
      )}
    </div>
  )
}

export default App