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

const codeStyle = {
  color: '#f3f4f6',
  background: '#374151',
  padding: '0.15rem 0.3rem',
  borderRadius: '4px',
  fontSize: '12px'
}

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
    divisibility: {
      title: 'Divisibility Slices & Valuation Distance',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> Every positive integer is determined by the exponents of its prime factors, written <InlineMath math="v_p(n)" />. Starting from a composite integer <InlineMath math="N" />, dividing by one prime factor at a time produces horizontal levels ("slices") where every integer has the same total factor count <InlineMath math="\Omega(x) = \sum_p v_p(x)" />. Between any two integers <InlineMath math="a, b" /> in a slice, the <InlineMath math="L^1" /> valuation distance counts how many single-prime steps separate them:
            <BlockMath math="d(a, b) = \sum_p |v_p(a) - v_p(b)|" />
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> <code style={codeStyle}>next_slice</code> generates each level from <InlineMath math="N" />, and <code style={codeStyle}>valuation_divergence</code> computes <InlineMath math="d(a, b)" /> in Rust (mirroring <code style={codeStyle}>TensorSieve/Operator.lean</code>).
          </div>
        </div>
      )
    },
    krein: {
      title: 'Krein Spaces and J-Self-Adjoint Operators',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> A Krein space equips a Hilbert space with an indefinite inner product defined through a self-adjoint involution <InlineMath math="J" /> (<InlineMath math="J^2 = I" />, <InlineMath math="J^* = J" />):
            <BlockMath math="[x, y]_J = \langle Jx, y \rangle, \qquad \mathcal{K} = \mathcal{K}^+ \oplus \mathcal{K}^-" />
            Vectors in <InlineMath math="\mathcal{K}^+" /> have positive squared norm, vectors in <InlineMath math="\mathcal{K}^-" /> have negative squared norm, and nonzero vectors with <InlineMath math="[v, v]_J = 0" /> are called isotropic (neutral). An operator <InlineMath math="C" /> is <InlineMath math="J" />-self-adjoint when <InlineMath math="JC = C^*J" />. Every eigenvector with <InlineMath math="[v, v]_J \neq 0" /> must have a real eigenvalue; complex conjugate pairs can occur only on isotropic eigenvectors.
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> Each node receives parity sign <InlineMath math="s(x) = (-1)^{\Omega(x)}" /> via <code style={codeStyle}>address_to_krein_unit</code>. The engine forms <InlineMath math="C = J H" /> from the Hermitian coherence matrix <InlineMath math="H" />. Both <InlineMath math="JC = C^*J" /> and the real-eigenvalue theorem for non-isotropic vectors are proved in Lean 4 (<code style={codeStyle}>TensorSieve/Operator.lean</code> and <code style={codeStyle}>KreinBridge.lean</code>).
          </div>
        </div>
      )
    },
    pt: {
      title: 'Parity-Time (PT) Symmetry and Complex Pairs',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> In physics, <InlineMath math="J" />-self-adjoint operators appear as PT-symmetric Hamiltonians. As long as all eigenvectors remain non-isotropic, the spectrum stays strictly real. When two real eigenvalues collide as a parameter varies, their eigenvectors become isotropic (<InlineMath math="[v, v]_J = 0" />) and split into a complex conjugate pair, marking PT-symmetry breaking.
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>What Happens on Slices:</strong> On a single horizontal slice where every node shares the same <InlineMath math="\Omega(x)" />, the parity matrix is a scalar multiple of the identity (<InlineMath math="J = \pm I" />), so <InlineMath math="C = \pm H" /> is Hermitian and its eigenvalues are always real. Genuine indefinite signatures and broken-PT complex pairs appear when combining adjacent levels with mixed parities.
          </div>
        </div>
      )
    },
    spacing: {
      title: 'Eigenvalue Spacing Ratio ⟨r⟩ and Random-Matrix Benchmarks',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> To compare spectral fluctuations across systems without fitting a smooth density curve, one computes the ratio of consecutive eigenvalue gaps <InlineMath math="s_n = E_{n+1} - E_n" />:
            <BlockMath math="r_n = \frac{\min(s_n, s_{n+1})}{\max(s_n, s_{n+1})}, \qquad \langle r \rangle = \text{mean}(r_n)" />
            Uncorrelated (integrable) spectra follow Poisson statistics (<InlineMath math="\langle r \rangle \approx 0.386" />). Chaotic systems with time-reversal symmetry follow the Gaussian Orthogonal Ensemble (<InlineMath math="\langle r \rangle \approx 0.531" />). Systems with broken time-reversal symmetry—and high zeros of the Riemann zeta function—follow the Gaussian Unitary Ensemble (<InlineMath math="\langle r \rangle \approx 0.600" />).
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> Tab 1 computes <InlineMath math="\langle r \rangle" /> directly from the distinct real eigenvalues in each slice and displays the nearest benchmark class above the histogram.
          </div>
        </div>
      )
    },
    trace: {
      title: 'Trace Formulas and Cohomological Signs',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> In algebraic geometry over finite fields, the Lefschetz trace formula counts fixed points of Frobenius as an alternating sum over cohomology groups:
            <BlockMath math="\sum_{n} (-1)^n \operatorname{Tr}\!\left(F \mid H^n(X, \mathbb{Q}_\ell)\right)" />
            The middle group <InlineMath math="H^1" /> enters with a minus sign, matching the negative sign in front of the prime-power sum in the Weil explicit formula for <InlineMath math="\zeta(s)" />. Krein spaces provide a natural setting where positive and negative trace sectors coexist inside a single linear operator.
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> <code style={codeStyle}>TensorSieve/DiscreteTrace.lean</code> proves an exact finite-graph trace identity connecting squared prime-step Laplacians <InlineMath math="\operatorname{Tr}(L_c^2)" /> to diagonal degrees and per-prime edge counts.
          </div>
        </div>
      )
    },
    weil: {
      title: 'The Weil Explicit Formula (Tab 2)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> Riemann and Weil proved a Fourier duality linking the primes to the non-trivial zeros <InlineMath math="\rho = \tfrac{1}{2} + i\gamma" /> of <InlineMath math="\zeta(s)" />. Weighting each prime power <InlineMath math="p^k" /> at frequency <InlineMath math="u = \ln(p^k)" /> by <InlineMath math="(\ln p / p^{k/2}) e^{-\sigma^2 u^2 / 2}" /> produces constructive interference at every zero height <InlineMath math="t = \gamma_n" />:
            <BlockMath math="R(t) = \frac{1}{2\pi}\ln\!\left(\frac{t}{2\pi}\right) - \frac{1}{\pi}\sum_{p^k \le B} \frac{\ln p}{p^{k/2}} e^{-\frac{1}{2}(\sigma \ln p^k)^2} \cos(t \ln p^k)" />
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> Tab 2 evaluates <InlineMath math="R(t)" /> directly in Rust/WASM (<code style={codeStyle}>compute_weil_zero_resonance</code>) and compares its peaks against LMFDB values for <InlineMath math="\gamma_1 \dots \gamma_{10}" />. This calculation is independent of the slice matrices in Tab 1.
          </div>
        </div>
      )
    },
    bruhat: {
      title: 'Bruhat-Schwartz Functions',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> On a non-Archimedean field like <InlineMath math="\mathbb{Q}_p" />, smooth derivatives are replaced by locally constant functions with compact support—finite linear combinations of indicator functions on <InlineMath math="p" />-adic balls:
            <BlockMath math="\mathcal{S}(\mathbb{Q}_p) = \operatorname{span}\{ \mathbf{1}_{a + p^k \mathbb{Z}_p} \}" />
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> <code style={codeStyle}>TensorSieve/Distribution.lean</code> formalizes locally constant compactly supported functions on totally disconnected spaces and lifts finite integer slices into <code style={codeStyle}>BruhatSchwartzFunction ℤ ℂ</code>.
          </div>
        </div>
      )
    },
    hilbert_polya: {
      title: 'Zero-Free Proofs vs. the Hilbert–Pólya Question',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> Analytic and automorphic approaches to the Riemann Hypothesis prove zero-free regions—from cubic-theta bounds (<InlineMath math="\operatorname{Re}(s) > 7/8" />) to windowed Landau and theta-lift arguments—using inequalities on <InlineMath math="L" />-functions. Even a complete proof of zero-freeness leaves open the Hilbert–Pólya question: whether a natural operator exists whose eigenvalues are the ordinates <InlineMath math="\gamma_n" />, and why those ordinates follow GUE statistics.
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> Setting <InlineMath math="\beta = 0.5" /> evaluates the finite slice operator at the critical symmetry weight; adjusting <InlineMath math="\beta" /> applies the thermal rescaling <InlineMath math="(ab)^{-(\beta - 1/2)/2}" /> to observe how the spectrum deforms away from <InlineMath math="\tfrac{1}{2}" />.
          </div>
        </div>
      )
    },
    observable: {
      title: 'Observable Filter and Ghost Modes',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> Because a Krein operator acts on a space containing both positive-norm and negative-norm sectors, its spectrum can contain positive real eigenvalues, negative real eigenvalues, and complex conjugate pairs. Toggling <strong>Show Unobservable States</strong> exposes the negative real and complex modes alongside the positive real sector.
          </div>
          <div>
            <strong style={{ color: '#10b981' }}>In Code:</strong> <code style={codeStyle}>is_observable</code> selects eigenvalues with <InlineMath math="\operatorname{Re}(\lambda) > 0" /> and <InlineMath math="|\operatorname{Im}(\lambda)| < 10^{-10}" />.
          </div>
        </div>
      )
    },
    speculative: {
      title: 'Exploratory Modules (TP & Adelic Sketches)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#38bdf8' }}>Idea:</strong> Longer-term links to topological periodic cyclic homology (<InlineMath math="K(X) \to TP(X)" />), condensed abelian groups, and Tate's adelic period rings remain conjectural research directions.
          </div>
          <div>
            <strong style={{ color: '#f59e0b' }}>Verification Status:</strong> These files are kept in <code style={codeStyle}>TensorSieve/Speculative/</code> and excluded from the verified Lean 4 core build (<code style={codeStyle}>TensorSieve.lean</code> and <code style={codeStyle}>PTSymmetry.lean</code>), which compile with zero custom axioms and zero <code style={codeStyle}>sorry</code> placeholders.
          </div>
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
        await init({ module_or_path: wasmUrl })
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
        await init({ module_or_path: wasmUrl })
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

  const spacingStats = useMemo(() => {
    if (!result) return null
    const byLevel = new Map<number, number[]>()
    result.forEach(pt => {
      if (!showUnobservable && !pt.is_observable) return
      if (Math.abs(pt.complex_im) < 1e-8) {
        const arr = byLevel.get(pt.level) ?? []
        arr.push(pt.real_re)
        byLevel.set(pt.level, arr)
      }
    })
    const ratios: number[] = []
    byLevel.forEach(vals => {
      const sorted = [...vals].sort((a, b) => a - b)
      const uniq: number[] = []
      for (const v of sorted) {
        if (uniq.length === 0 || Math.abs(v - uniq[uniq.length - 1]) > 1e-8) {
          uniq.push(v)
        }
      }
      if (uniq.length >= 3) {
        const s: number[] = []
        for (let i = 0; i + 1 < uniq.length; i++) s.push(uniq[i + 1] - uniq[i])
        for (let i = 0; i + 1 < s.length; i++) {
          const hi = Math.max(s[i], s[i + 1])
          const lo = Math.min(s[i], s[i + 1])
          if (hi > 1e-8) ratios.push(lo / hi)
        }
      }
    })
    if (ratios.length === 0) return null
    const meanR = ratios.reduce((a, b) => a + b, 0) / ratios.length
    const benchmarks = [
      { label: 'Poisson', val: 0.3863 },
      { label: 'GOE', val: 0.5307 },
      { label: 'GUE', val: 0.5996 },
      { label: 'Rigid', val: 1.0 }
    ]
    const nearest = benchmarks.reduce((best, cur) =>
      Math.abs(cur.val - meanR) < Math.abs(best.val - meanR) ? cur : best
    )
    return { meanR, sampleCount: ratios.length, nearest: nearest.label }
  }, [result, showUnobservable])

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
        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Krein Spectral Explorer</h1>
        <p style={{ margin: '0.5rem 0 1rem 0', color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>
          Interactive browser workbench for discrete <InlineMath math="J" />-self-adjoint divisibility operators and the Weil explicit formula for Riemann zeta zeros.
        </p>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', alignItems: 'center' }}>
          <a href="https://thing.rodeo/tensor-sieve/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Research Article</a>
          <span style={{ color: '#52525b' }}>|</span>
          <a href="https://github.com/ryanncode/krein" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Krein Engine (Rust/WASM)</a>
          <span style={{ color: '#52525b' }}>|</span>
          <a href="https://github.com/ryanncode/tensor-sieve" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Tensor-Sieve Formalization (Lean 4)</a>
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
          Slice Operator &amp; Spacing
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
          Weil Explicit Formula
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
          Mathematical Guide
        </button>
      </nav>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', marginBottom: '1.5rem', borderRadius: '4px' }}>
          <strong>Error:</strong> <pre style={{ margin: 0 }}>{errorMsg}</pre>
        </div>
      )}

      {/* TAB 1: SLICE OPERATOR */}
      {activeTab === 'traversal' && (
        <div>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', background: '#2a2b36', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '14px', margin: 0, textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                Operator Parameters
              </h2>
              <label htmlFor="show-unobservable" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', fontWeight: 600, color: '#9ca3af', cursor: 'pointer' }}>
                <span>Include Negative &amp; Complex Modes</span>
                <input 
                  id="show-unobservable"
                  type="checkbox" 
                  checked={showUnobservable} 
                  onChange={e => setShowUnobservable(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="start-val" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Starting Integer (N)</label>
                <input 
                  id="start-val"
                  type="text" 
                  value={startVal} 
                  onChange={e => setStartVal(e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '180px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="max-steps" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Slice Depth</label>
                <input 
                  id="max-steps"
                  type="number" 
                  value={maxSteps} 
                  onChange={e => setMaxSteps(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '90px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="beta-val" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Weight Exponent <span style={{ textTransform: 'none' }}>(β)</span></label>
                  <span style={{
                    fontSize: '10px',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: Math.abs(beta - 0.5) < 0.001 ? '#0369a1' : beta >= 0.875 ? '#065f46' : '#854d0e',
                    color: Math.abs(beta - 0.5) < 0.001 ? '#7dd3fc' : beta >= 0.875 ? '#6ee7b7' : '#fde047',
                  }}>
                    {Math.abs(beta - 0.5) < 0.001
                      ? 'β = 1/2 (Critical)'
                      : beta >= 11 / 12
                      ? 'β ≥ 11/12'
                      : beta >= 7 / 8
                      ? 'β ≥ 7/8'
                      : '1/2 < β < 7/8'}
                  </span>
                </div>
                <input 
                  id="beta-val"
                  type="number" 
                  step="0.01"
                  value={beta} 
                  onChange={e => setBeta(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '120px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="time-t" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Phase Parameter <span style={{ textTransform: 'none' }}>(t)</span></label>
                <input 
                  id="time-t"
                  type="number" 
                  step="0.01"
                  value={timeT} 
                  onChange={e => setTimeT(Number(e.target.value))}
                  style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '100px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="preset-select" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Composite Presets</label>
                <select 
                  id="preset-select"
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
                  <option value="27720000,20">27,720,000 (depth 20)</option>
                  <option value="510510,10">Primorial 17# (510,510)</option>
                  <option value="720720,15">Highly Composite (720,720)</option>
                  <option value="3628800,20">10! (3,628,800)</option>
                  <option value="6469693230,15">Primorial 29# (~6.5×10⁹)</option>
                  <option value="200560490130,15">Primorial 31# (~2.0×10¹¹)</option>
                </select>
              </div>

              <button 
                onClick={handleCompute} 
                disabled={loading}
                style={{ padding: '0.55rem 1.5rem', background: '#38bdf8', color: '#0f172a', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
              >
                {loading ? 'Computing Spectrum...' : 'Run Operator'}
              </button>
            </div>
          </section>

          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#1e1e24', borderLeft: '4px solid #059669', color: '#d4d4d8', fontSize: '13px', lineHeight: '1.6', borderRadius: '0 8px 8px 0' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>How This Computation Works</h4>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Starting from <InlineMath math="N" />, each downward step divides every integer in the current level by each of its distinct prime factors. On each level, the engine builds a Hermitian matrix <InlineMath math="H" /> whose entries depend on shared prime factors <InlineMath math="\gcd(a,b)" /> and <InlineMath math="p" />-adic valuation distance <InlineMath math="d(a,b)" />, applies the parity sign matrix <InlineMath math="J = \operatorname{diag}((-1)^{\Omega(x)})" /> to form <InlineMath math="C = JH" />, and diagonalizes <InlineMath math="C" /> in WebAssembly.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li><strong style={{ color: '#f3f4f6' }}>Starting Integer (N):</strong> Highly composite numbers and primorials produce wide intermediate slices with many interacting divisors.</li>
              <li><strong style={{ color: '#f3f4f6' }}>Weight Exponent (β) &amp; Phase (t):</strong> <InlineMath math="\beta = 0.5" /> leaves <InlineMath math="H" /> unscaled; other values apply weight <InlineMath math="(ab)^{-(\beta-1/2)/2}" />. The phase <InlineMath math="t" /> evaluates the per-node Dirichlet term <InlineMath math="x^{-\beta} e^{-it \ln x}" /> shown in the Dirichlet Re and Dirichlet Im columns.</li>
              <li><strong style={{ color: '#f3f4f6' }}>Spacing Ratio ⟨r⟩:</strong> Measures consecutive gap ratios <InlineMath math="\min(s_n, s_{n+1}) / \max(s_n, s_{n+1})" /> within each slice and compares the mean against Poisson (0.386), GOE (0.531), and GUE (0.600).</li>
            </ul>
          </div>

          {logs.length > 0 && !result && (
            <div style={{ padding: '1rem', background: '#2a2b36', border: '1px solid #3f3f46', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af', height: '160px', overflowY: 'auto', borderRadius: '4px', marginBottom: '1.5rem' }}>
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}

          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', background: '#2a2b36', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '15px', margin: 0, textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                    Eigenvalue Spacing Distribution
                  </h2>
                  {spacingStats && (
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', background: '#1e1e24', border: '1px solid #3f3f46', padding: '0.4rem 0.75rem', borderRadius: '6px', color: '#e2e8f0' }}>
                      <strong style={{ color: '#38bdf8' }}>&lt;r&gt; = {spacingStats.meanR.toFixed(4)}</strong>
                      {' '}({spacingStats.nearest}, n={spacingStats.sampleCount})
                      <span style={{ color: '#9ca3af' }}> | Ref: Poisson 0.386, GOE 0.531, GUE 0.600</span>
                    </div>
                  )}
                </div>
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
                  Per-Slice Eigenvalue Table
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #4b5563', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Level (Ω)</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Integer (x)</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Diag. Entry</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Ω(x)</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Degenerate</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Norm. Gap</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Dirichlet Re</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Dirichlet Im</th>
                      <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Dist. to ℤ</th>
                      {showUnobservable && (
                        <>
                          <th style={{ padding: '0.5rem', color: '#fb923c' }}>Re(λ)</th>
                          <th style={{ padding: '0.5rem', color: '#fca5a5' }}>Im(λ)</th>
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

      {/* TAB 2: WEIL EXPLICIT FORMULA */}
      {activeTab === 'resonance' && (
        <div>
          <section style={{ marginBottom: '1.5rem', background: '#22232e', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ maxWidth: '680px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Weil Explicit-Formula Zero Scanner
                </h2>
                <p style={{ margin: '0.4rem 0 0 0', color: '#9ca3af', fontSize: '13px', lineHeight: '1.85' }}>
                  Evaluates the smoothed Fourier sum of the Weil explicit formula over prime powers <InlineMath math="p^k" />: summing <InlineMath math="\cos(t \ln p^k)" /> with Gaussian-damped von Mangoldt weights <InlineMath math="(\ln p / p^{k/2}) e^{-\sigma^2 (\ln p^k)^2 / 2}" /> produces peaks at the imaginary parts <InlineMath math="\gamma_n" /> of the non-trivial zeros of <InlineMath math="\zeta(s)" />. This is a standalone classical Fourier reference separate from the slice matrices in Tab 1.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label htmlFor="prime-cutoff" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Prime Cutoff</label>
                <select
                  id="prime-cutoff"
                  value={primorialBound}
                  onChange={e => setPrimorialBound(Number(e.target.value))}
                  style={{ padding: '0.45rem', border: '1px solid #4b5563', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="199">Primes up to 199</option>
                  <option value="500">Primes up to 500</option>
                  <option value="1000">Primes up to 1,000</option>
                  <option value="3000">Primes up to 3,000</option>
                </select>
                <button
                  onClick={handleScanZeros}
                  disabled={resonanceLoading}
                  style={{ padding: '0.5rem 1.25rem', background: '#10b981', color: '#0f172a', border: 'none', fontWeight: 600, cursor: resonanceLoading ? 'not-allowed' : 'pointer', borderRadius: '4px', fontSize: '13px' }}
                >
                  {resonanceLoading ? 'Evaluating Sum...' : 'Compute Zero Peaks'}
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
                        formatter={(val: any) => [Number(val).toFixed(4), 'Smoothed Density R(t)']}
                        labelFormatter={(label: any) => `Height t = ${Number(label).toFixed(2)}`}
                      />
                      {CERTIFIED_ZEROS.map((zero, idx) => (
                        <ReferenceLine
                          key={idx}
                          x={zero}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={idx < 5 ? { value: `γ${idx + 1}`, fill: '#ef4444', fontSize: 10, position: 'top' } : undefined}
                        />
                      ))}
                      <Line type="monotone" dataKey="density" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>Blue curve: Smoothed explicit-formula density <InlineMath math="R(t)" /></span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>Red dashed lines: Certified LMFDB zeros (<InlineMath math="\gamma_1 \dots \gamma_{10}" />)</span>
                </div>

                {peakComparison.length > 0 && (
                  <div style={{ marginTop: '1.5rem', background: '#1e1e24', border: '1px solid #3f3f46', borderRadius: '6px', overflowX: 'auto' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #3f3f46', fontWeight: 600, fontSize: '13px', color: '#e2e8f0' }}>
                      Detected Peaks vs. Certified Riemann Zeros
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #4b5563', textAlign: 'left', color: '#9ca3af' }}>
                          <th style={{ padding: '0.5rem 1rem' }}>Index (n)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>LMFDB Zero (γₙ)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Detected Peak (t)</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Abs. Error</th>
                          <th style={{ padding: '0.5rem 1rem' }}>Rel. Error</th>
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
                              {row.passed ? '✓ < 0.5%' : '~ Near'}
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

      {/* TAB 3: MATHEMATICAL GUIDE */}
      {activeTab === 'theory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#27272a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #3f3f46', color: '#d4d4d8', fontSize: '14px', lineHeight: '1.65' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0', letterSpacing: '0.05em' }}>
              Background and Purpose
            </h2>
            <p style={{ marginTop: 0 }}>
              Analytic and automorphic proofs of zero-free regions for the Riemann zeta function establish where zeros cannot lie by using positivity inequalities on <InlineMath math="L" />-functions. Those arguments leave a separate question open: the <strong>Hilbert–Pólya conjecture</strong> asks for a linear operator whose eigenvalues are the imaginary ordinates <InlineMath math="\gamma_n" /> of the non-trivial zeros, explaining why their spacing follows the Gaussian Unitary Ensemble (GUE) of quantum chaos.
            </p>
            <p style={{ marginBottom: 0 }}>
              This application pairs two computational tools with a companion Lean 4 library (<code style={codeStyle}>tensor-sieve</code>). Tab 1 constructs finite-dimensional <InlineMath math="J" />-self-adjoint operators (<InlineMath math="JC = C^*J" />) on divisibility slices of composite integers and measures their eigenvalue spacing ratio <InlineMath math="\langle r \rangle" />. Tab 2 evaluates the classical Weil explicit formula over prime powers so you can inspect the zero locations <InlineMath math="\gamma_1 \dots \gamma_{10}" /> directly alongside the operator experiments.
            </p>
          </div>

          <div style={{ padding: '1.5rem', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '13px', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '0.05em' }}>
              Concept Reference (Click any topic for details)
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <strong style={{ color: '#f3f4f6' }}>Discrete Operators &amp; Geometry</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <li><span onClick={() => handleTermClick('divisibility')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Divisibility Slices &amp; Valuation Distance</span></li>
                  <li><span onClick={() => handleTermClick('krein')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Krein Spaces and J-Self-Adjoint Operators</span></li>
                  <li><span onClick={() => handleTermClick('pt')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Parity-Time (PT) Symmetry and Complex Pairs</span></li>
                  <li><span onClick={() => handleTermClick('bruhat')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Bruhat-Schwartz Functions</span></li>
                </ul>
              </li>
              <li>
                <strong style={{ color: '#f3f4f6' }}>Spectra, Traces &amp; Zeta Zeros</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <li><span onClick={() => handleTermClick('spacing')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Eigenvalue Spacing Ratio ⟨r⟩ and Random-Matrix Benchmarks</span></li>
                  <li><span onClick={() => handleTermClick('trace')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Trace Formulas and Cohomological Signs</span></li>
                  <li><span onClick={() => handleTermClick('weil')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>The Weil Explicit Formula (Tab 2)</span></li>
                  <li><span onClick={() => handleTermClick('hilbert_polya')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Zero-Free Proofs vs. the Hilbert–Pólya Question</span></li>
                </ul>
              </li>
              <li>
                <strong style={{ color: '#f3f4f6' }}>Filtering &amp; Verification Scope</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <li><span onClick={() => handleTermClick('observable')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Observable Filter and Ghost Modes</span></li>
                  <li><span onClick={() => handleTermClick('speculative')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Exploratory Modules (TP &amp; Adelic Sketches)</span></li>
                </ul>
              </li>
            </ul>
          </div>

          {activeTerm && explainers[activeTerm] && (
            <div id="explainer-box" style={{ padding: '1rem 1.5rem', background: '#1e1e24', border: '1px solid #38bdf8', borderRadius: '6px', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
              <button 
                onClick={() => setActiveTerm(null)} 
                style={{ position: 'absolute', top: '0.75rem', right: '1rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
                title="Close Explainer"
              >
                ✕
              </button>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '15px', fontWeight: 700, letterSpacing: '0.01em' }}>{explainers[activeTerm].title}</h4>
              <div style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: '1.65' }}>{explainers[activeTerm].content}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
