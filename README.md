# krein

`krein` is a Rust/WebAssembly compute engine and React web application for exploring finite-dimensional Krein-space operators on integer divisibility graphs, alongside an interactive evaluator for the Weil explicit formula. Its algebraic definitions and $J$-self-adjointness theorems are formally verified in the companion Lean 4 repository [tensor-sieve](https://github.com/ryanncode/tensor-sieve).

## What the Application Computes

The interface contains two independent numerical tools and a mathematical guide:

### 1. Slice Operator & Spacing (`run_compute_wasm`, Tab 1)
Given a composite starting integer $N$ and a traversal depth, the engine generates downward divisibility slices by dividing each integer in the current level by each of its distinct prime factors. Every integer $x$ within a single level shares the same prime factor count with multiplicity, $\Omega(x) = \sum_p v_p(x)$.

On each slice, the engine constructs:
- A Hermitian coherence matrix $H$ whose real entries depend on the shared factor depth $\Omega(\gcd(a,b))$ minus the $p$-adic $L^1$ distance $d(a,b) = \sum_p |v_p(a) - v_p(b)|$, and whose imaginary entries carry an antisymmetric sign $\pm i\,d(a,b)$ determined by whether $a > b$.
- A diagonal parity involution $J = \mathrm{diag}((-1)^{\Omega(x)})$.
- The $J$-self-adjoint operator $C = J H$, which satisfies $J C = C^* J$.

The engine diagonalizes $C$ in WebAssembly and measures the unfolding-free adjacent level-spacing ratio:
$$\langle r \rangle = \left\langle \frac{\min(s_n, s_{n+1})}{\max(s_n, s_{n+1})} \right\rangle, \qquad s_n = E_{n+1} - E_n$$
comparing the result against theoretical random-matrix benchmarks: Poisson ($0.3863$) for uncorrelated spectra, GOE ($0.5307$) for time-reversal-symmetric chaotic spectra, and GUE ($0.5996$) for chaotic spectra with broken time-reversal symmetry.

**Note on parity signatures:** Within a single horizontal slice where $\Omega(x)$ is constant, $J = \pm I$, so $C = \pm H$ is Hermitian and has only real eigenvalues. Genuinely indefinite Krein signatures (containing both $+1$ and $-1$ parity sectors, where broken-PT complex conjugate pairs emerge on isotropic eigenvectors $[v, v]_J = 0$) arise when combining nodes from adjacent levels of opposite parity. See `tensor-sieve/scripts/adelic_operator_probe.py` for mixed-level tests and null-model comparisons.

### 2. Weil Explicit Formula (`run_zero_resonance_wasm`, Tab 2)
Independently of the slice matrices in Tab 1, Tab 2 evaluates the Gaussian-smoothed prime-power cosine sum from the Weil explicit formula:
$$R(t) = \frac{1}{2\pi}\ln\!\left(\frac{t}{2\pi}\right) - \frac{1}{\pi}\sum_{p^k \le B} \frac{\ln p}{p^{k/2}} e^{-\frac{1}{2}(\sigma \ln p^k)^2} \cos(t \ln p^k)$$
Summing over prime powers up to a chosen prime cutoff produces peaks at the imaginary parts $\gamma_1, \dots, \gamma_{10}$ of the non-trivial zeros of $\zeta(s)$, plotted against certified LMFDB reference values.

## Mathematical Motivation

Analytic and automorphic approaches to the Riemann Hypothesis establish zero-free regions using inequalities on $L$-functions. The complementary Hilbert–Pólya program asks a structural question: whether a natural linear operator exists whose eigenvalues are the ordinates $\gamma_n$, and what arithmetic coupling produces the GUE spacing statistics observed in zeta zeros.

This repository provides a concrete testbed for studying how discrete $J$-self-adjoint operators behave on arithmetic graphs, when real spectra transition to complex conjugate pairs, and how prime-factor coupling affects level statistics.

## Running Tests and the Web App

### Rust Unit Tests
```bash
cargo test
```
The test suite verifies $J^2 = I$, $H^* = H$, and $JC = C^*J$ to machine precision across multiple slices, checks the $\langle r \rangle$ benchmark classifier, and validates Weil explicit-formula peak locations against $\gamma_1 \dots \gamma_5$.

### Local Web Preview
Requires Node.js (v18+):
```bash
cd web
npm install
npm run dev
```
Vite serves the app at `http://localhost:5173/krein/`.

### Built-in Presets
Highly composite numbers and primorials generate wide intermediate slices with dense factor overlaps:
- **27,720,000** ($2^6 \cdot 3^2 \cdot 5^4 \cdot 7 \cdot 11$)
- **Primorial 17#** ($510,510$)
- **Highly Composite** ($720,720$)
- **10!** ($3,628,800$)
- **Primorial 29#** ($6,469,693,230$)
- **Primorial 31#** ($200,560,490,130$)
