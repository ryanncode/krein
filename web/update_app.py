with open('src/App.tsx', 'r') as f:
    content = f.read()

imports = """import { useState, useMemo } from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'"""
content = content.replace("import { useState, useMemo } from 'react'", imports)

explainers_old = """  const explainers: Record<string, { title: string, content: JSX.Element }> = {
    padic: {
      title: 'p-adic Tree (Bruhat-Tits Topology)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Replaces continuous Archimedean wave mechanics with Tate's adelic harmonic analysis. It maps discrete prime factorizations into a continuous topological field using Bruhat-Schwartz distributions (which are locally constant with compact support). This allows us to measure non-Archimedean topological jumps natively.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Bound in <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein/src/lib.rs</code> via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>next_slice</code> and <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>distinct_prime_factors</code> functions. The engine does not evaluate primes linearly; it traverses the tree laterally, computing the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>valuation_divergence</code> between semantic roots to generate deterministic Coulomb gas repulsion (the GUE spacing).</div>
        </div>
      )
    },
    krein: {
      title: 'Krein Space (Indefinite Metric)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> A space characterized by a fundamental symmetry operator J (where J² = I and J* = J). It orthogonally decomposes the space into positive and negative definite subspaces. This architecture natively absorbs the minus sign from the trace formula without fracturing thermodynamic stability or relying on singular boundary mechanics (unlike pseudo-Hermitian PT-symmetric models).</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Expressed through the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>KreinCoord</code> struct and the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein_bilin</code> bilinear form in the Rust engine, explicitly allowing negative inner products. The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>parity_a</code> metric directly multiplies the amplitudes to construct J-self-adjoint operators.</div>
        </div>
      )
    },
    hilbert: {
      title: 'Hilbert Space (Positive-Definite)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Standard quantum mechanics demands a positive-definite metric (where distances and probabilities ≥ 0). Applying this to prime distributions forces theorists (like Alain Connes) to use artificial Sobolev deformations (δ > 1) to force convergence. This analytical concession mathematically truncates the natural multiplicities of the zeros and obscures the absolute discrete logic of the primes.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The engine explicitly rejects standard Hilbert constraints. By constructing a real block matrix <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>mat_real</code> representing complex transitions, the engine circumvents traditional positive-definite bounds (like those assumed in Lean 4's mathlib), proving the necessity of the indefinite Krein geometry.</div>
        </div>
      )
    },
    trace: {
      title: 'Lefschetz Trace Formula',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The cohomological equation used to evaluate fixed points across the transitions of the primes. Its alternating sum naturally yields a negative sign (the absorption spectrum). In classical analysis, this minus sign is an unmanageable anomaly; in this Krein space, it is a structural necessity.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>cross_branch_amplitude</code> function natively computes the topological distance. The alternating nature of this distance seeds the complex/imaginary components of the block matrix, deterministically generating the negative norms.</div>
        </div>
      )
    },
    thermo: {
      title: 'Thermodynamic Filter',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The physical universe cannot support negative probabilities. The Thermodynamic Filter acts as the observational lens, collapsing the indefinite Krein topology into a restricted, positive-definite Hilbert space to ensure predictability.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Enforced in <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>lib.rs</code> via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>is_observable</code> flag, which strictly filters out eigenvalues where <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>real_re <= 0</code> or where <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>complex_im</code> exceeds the floating-point boundary. The React UI physically hides these rows unless the toggle is engaged.</div>
        </div>
      )
    },
    ghost: {
      title: 'Ghost States (Negative Norm)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Negative-norm mathematical states that arise natively in the Krein metric. They are computationally required to preserve the continuous flow of the spectrum, yet they represent impossible physical probabilities.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Identified mathematically by the engine as real eigenvalues ≤ 0 during the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>complex_eigenvalues()</code> decomposition of the J-self-adjoint matrix. The UI traps these specific nodes and flags them with the <code style={{ color: '#fb923c' }}>#fb923c</code> (orange) highlight.</div>
        </div>
      )
    },
    pt: {
      title: 'PT-Symmetry Breaking',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Exceptional points where a system loses its Parity-Time symmetry. While heuristic models rely on non-local difference operators that cause severe boundary singularities, our topological formulation remains unconditionally stable through the discrete action of the p-adic shift operator.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Emerges organically in the spectrum when the block diagonal matrix transitions eigenvalues from pure real (observable) states into complex conjugate pairs or negative bounds.</div>
        </div>
      )
    },
    born: {
      title: 'The Born Rule',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The foundational quantum postulate that all physical probabilities must sum exactly to 1. The presence of negative-norm ghost states shatters this rule, demonstrating that the full mathematical geometry of the primes exists outside the boundaries of observable physics.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The unobservable toggle in the UI visually demonstrates the breakdown of the Born Rule. When engaged, the user sees exactly how the underlying nodes fail the positive-definite normative threshold.</div>
        </div>
      )
    }
  }"""

explainers_new = """  const explainers: Record<string, { title: string, content: JSX.Element }> = {
    padic: {
      title: 'p-adic Tree (Bruhat-Tits Topology)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Replaces continuous Archimedean wave mechanics with Tate's adelic harmonic analysis. It maps discrete prime factorizations into a continuous topological field, evaluating non-Archimedean topological jumps via:
          <BlockMath math="\\int_{\\mathbb{Q}_p} \\chi(ax) \\,dx" />
          </div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Bound in <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein/src/lib.rs</code> via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>next_slice</code> function which traverses the tree laterally, computing <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>valuation_divergence</code> to generate deterministic Coulomb gas repulsion.</div>
        </div>
      )
    },
    krein: {
      title: 'Krein Space (Indefinite Metric)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> A fundamental symmetry operator <InlineMath math="J" /> orthogonally decomposes the space into positive and negative definite subspaces <InlineMath math="\\mathcal{K} = \\mathcal{K}^+ \\oplus \\mathcal{K}^-" />. The inner product is explicitly indefinite:
          <BlockMath math="[x, y] = \\langle Jx, y \\rangle \\quad \\text{where} \\quad J = P^+ - P^-, \\; J^2 = I, \\; J^* = J" />
          This natively absorbs the minus sign from the trace formula without relying on singular boundary mechanics.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> Expressed via the <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>KreinCoord</code> struct and <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>krein_bilin</code> bilinear form in Rust. It intentionally omits standard strict-positivity limits required by typical compilers like Lean 4.</div>
        </div>
      )
    },
    hilbert: {
      title: 'Hilbert Space Positive-Definite Constraints',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Standard quantum mechanics demands a strict positive-definite metric (<InlineMath math="\\langle x, x \\rangle \\ge 0" />). Applying this to prime distributions forces theorists to use artificial Sobolev spaces weighted by parameter <InlineMath math="\\delta" />:
          <BlockMath math="L_\\delta^2(X)_0 \\quad (\\delta > 1)" />
          This continuously smears the primes, forcing absorption zeros to truncate.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The engine explicitly rejects this by using a real block matrix <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>mat_real</code> that evaluates complex transitions natively without demanding <InlineMath math="L_\\delta^2" /> limits.</div>
        </div>
      )
    },
    trace: {
      title: 'Lefschetz Trace Formula (H_et^1)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> The cohomological equation used to evaluate fixed points across transitions. Its alternating sum naturally yields a negative sign (the absorption spectrum) from the first cohomology group <InlineMath math="H_{et}^1" />:
          <BlockMath math="\\sum_{n} (-1)^n \\text{Tr}(F \\mid H^n(X, \\mathbb{Q}_l))" />
          In standard math, this minus sign is an unmanageable anomaly. Here, it is structural.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>cross_branch_amplitude</code> function computes topological distance. The alternating nature of this distance directly seeds the imaginary components, yielding the negative norms.</div>
        </div>
      )
    },
    thermo: {
      title: 'Thermodynamic Filter',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Mimics an observer bound by physical probability. Anchors <InlineMath math="\\Lambda" />-operations in absolute geometry over <InlineMath math="\\mathbb{F}_1" /> so the trace operates combinatorially. This filters the indefinite Krein topology back down to an observable Hilbert space.</div>
          <div><strong style={{ color: '#10b981' }}>Code Implementation:</strong> The <code style={{ color: '#f3f4f6', background: '#374151', padding: '0.15rem 0.25rem', borderRadius: '4px' }}>is_observable</code> flag in Rust strictly filters out real eigenvalues <InlineMath math="\\le 0" />, physically trapping anomalies that violate standard laws of physics.</div>
        </div>
      )
    },
    ghost: {
      title: 'Ghost States (Negative Norm)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><strong style={{ color: '#38bdf8' }}>Math/Logic:</strong> Negative-norm states natively arising in the Krein metric (<InlineMath math="\\langle x, x \\rangle < 0" />). They are computationally required to preserve the continuous flow of the spectrum, yet they correspond to impossible physical probabilities.</div>
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
  }"""

content = content.replace(explainers_old, explainers_new)


prose_old = """      <div style={{ marginBottom: '2rem', maxWidth: '1000px' }}>
        <div style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginTop: 0 }}>
            This engine simulates the quantum mechanical framework of prime numbers. By mapping primes onto a <span onClick={() => handleTermClick('padic')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>p-adic tree</span>, the engine calculates the transitions between them. Applying standard quantum mechanics to this structure fails because a <span onClick={() => handleTermClick('trace')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>trace formula</span> introduces a negative sign, causing the probabilities to break down.
          </p>
          <p>
            To resolve this, the engine operates in an indefinite <span onClick={() => handleTermClick('krein')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Krein Space</span>. Unlike a restrictive <span onClick={() => handleTermClick('hilbert')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Hilbert space</span>, a Krein metric provides enough geometric freedom for the math to flow properly. This freedom naturally generates exceptional points where <span onClick={() => handleTermClick('pt')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>PT-symmetry</span> breaks, alongside negative-norm <span onClick={() => handleTermClick('ghost')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>ghost states</span>, which are shown as negative real eigenvalues. These ghost states are computationally necessary to maintain the spectrum, but they violate the rules of normal physics.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            This discrepancy highlights the necessity of the <span onClick={() => handleTermClick('born')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Born Rule</span>, which dictates that quantum probabilities must sum to 1. The <span onClick={() => handleTermClick('thermo')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Thermodynamic Filter</span> in this engine functions exactly like the Born Rule by hiding these ghost states from the observer. This forces the resulting reality to mimic a standard Hilbert space. Toggling the unobservable states below allows you to bypass the Born Rule and observe the true mathematical structure that exists outside observable physical reality.
          </p>
        </div>"""

prose_new = """      <div style={{ marginBottom: '2rem', maxWidth: '1000px' }}>
        <div style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginTop: 0 }}>
            This engine simulates the quantum mechanical framework of prime numbers. By mapping primes onto a <span onClick={() => handleTermClick('padic')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>p-adic tree</span>, the engine calculates the transitions between them. Applying standard quantum mechanics to this structure fails because a trace formula introduces a negative sign, causing the probabilities to break down.
          </p>
          <p>
            To resolve this, the engine operates in an indefinite <span onClick={() => handleTermClick('krein')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Krein Space</span>. Unlike a restrictive Hilbert space, a Krein metric provides enough geometric freedom for the math to flow properly. This freedom naturally generates exceptional points where PT-symmetry breaks, alongside negative-norm <span onClick={() => handleTermClick('ghost')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>ghost states</span>, which are shown as negative real eigenvalues. These ghost states are computationally necessary to maintain the spectrum, but they violate the rules of normal physics.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            This discrepancy highlights the necessity of the <span onClick={() => handleTermClick('born')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Born Rule</span>, which dictates that quantum probabilities must sum to 1. The <span onClick={() => handleTermClick('thermo')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Thermodynamic Filter</span> in this engine functions exactly like the Born Rule by hiding these ghost states from the observer. This forces the resulting reality to mimic a standard Hilbert space. Toggling the unobservable states below allows you to bypass the Born Rule and observe the true mathematical structure that exists outside observable physical reality.
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
                <li><span onClick={() => handleTermClick('trace')} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Lefschetz Trace Formula ($H_{et}^1$)</span></li>
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
        </div>"""

content = content.replace(prose_old, prose_new)

with open('src/App.tsx', 'w') as f:
    f.write(content)
