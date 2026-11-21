# krein

`krein` is an interactive Rust/WebAssembly web app for experimenting with matrices built from integer prime factorizations and comparing their spectra against the zeros of the Riemann zeta function.

The non-trivial zeros of the Riemann zeta function repel one another like the eigenvalues of random complex Hermitian matrices from the Gaussian Unitary Ensemble (GUE). This app lets you inspect discrete arithmetic matrices in the browser to see when prime-factor couplings produce level repulsion, and it includes a separate prime-sum scanner that locates the first 10 Riemann zeta zeros directly from prime powers. The algebraic symmetries and eigenvalue reality theorems for the discrete matrices are formally proved in Lean 4 in [tensor-sieve](https://github.com/ryanncode/tensor-sieve).

## Quick Start

Start the local web app (requires Node.js v18+):

```bash
cd web
npm install
npm run dev
```

Vite serves the interface at `http://localhost:5173/krein/`.

Run the Rust unit tests:

```bash
cargo test
```

The test suite verifies $J^2 = I$, $H^* = H$, and $JC = C^*J$ across multiple divisor slices, and checks both the spacing-ratio classifier and the Weil peak locations against $\gamma_1 \dots \gamma_5$.

## What the App Does

The first tab takes a starting composite integer (such as `27,720,000` or one of the primorial presets) and a traversal depth. The WebAssembly engine repeatedly divides integers in the current layer by each of their distinct prime factors to form horizontal divisor slices where every node shares the same prime-factor count $\Omega(x)$. On the active slice, the engine builds a Hermitian matrix $H$ from shared prime factors and factorization distances, multiplies by the parity matrix $J = \mathrm{diag}((-1)^{\Omega(x)})$ to form $C = JH$, and diagonalizes $C$. It then computes the adjacent eigenvalue spacing ratio $\langle r \rangle$ so you can compare the spectrum against uncorrelated Poisson spectra (`0.3863`), time-reversal-symmetric GOE spectra (`0.5307`), and complex Hermitian GUE spectra (`0.5996`).

Within any single horizontal slice, $\Omega(x)$ is constant, so $J = \pm I$ and $C = \pm H$ always has purely real eigenvalues. Genuinely indefinite Krein spaces containing both $+1$ and $-1$ parity sectors, where eigenvalues can split into complex conjugate pairs on isotropic eigenvectors, appear when combining adjacent levels of opposite parity (tested in `tensor-sieve/scripts/adelic_operator_probe.py`).

The second tab runs an independent calculation based on the Weil explicit formula. Summing Gaussian-damped cosine waves over prime powers up to a chosen cutoff produces sharp peaks at the imaginary parts $\gamma_1, \dots, \gamma_{10}$ of the Riemann zeta zeros ($\gamma_1 \approx 14.13$, $\gamma_2 \approx 21.02$, and so on), plotted over certified LMFDB reference values. The third tab provides an in-app mathematical guide covering the matrix construction and spacing statistics.

## Mathematical Definitions

All numerical routines live in [src/lib.rs](src/lib.rs). For positive integers $a$ and $b$ with prime-power exponents $v_p(a)$ and $v_p(b)$, the factor count and $p$-adic $L^1$ distance are

$$\Omega(a) = \sum_p v_p(a), \qquad d(a, b) = \sum_p |v_p(a) - v_p(b)|.$$

Let $g = \gcd(a, b)$ and $w = \Omega(g)$. The Hermitian coherence matrix $H$ has diagonal entries $H_{aa} = (-1)^{\Omega(a)} \Omega(a)$. For $a \neq b$, $H_{ab} = 0$ when $d(a, b) > w$, and otherwise

$$H_{ab} = (-1)^w (w - d(a, b)) + i\,\mathrm{sgn}(a - b)\,d(a, b).$$

The parity matrix $J = \mathrm{diag}((-1)^{\Omega(x)})$ satisfies $J^2 = I$, and the slice operator $C = JH$ satisfies $JC = C^*J$. From the sorted eigenvalues $E_1 \le \dots \le E_n$ with adjacent gaps $s_k = E_{k+1} - E_k$, the spacing ratio is

$$\langle r \rangle = \left\langle \frac{\min(s_k, s_{k+1})}{\max(s_k, s_{k+1})} \right\rangle.$$

The second tab evaluates the smoothed Weil explicit-formula sum with Gaussian width $\sigma$ and prime-power cutoff $B$,

$$R(t) = \frac{1}{2\pi}\ln\!\left(\frac{t}{2\pi}\right) - \frac{1}{\pi}\sum_{p^k \le B} \frac{\ln p}{p^{k/2}} e^{-\frac{1}{2}(\sigma \ln p^k)^2} \cos(t \ln p^k).$$

## Built-in Presets

Highly composite numbers and primorials generate wide intermediate divisor slices with dense prime overlaps. The interface includes presets for `27,720,000` ($2^6 \cdot 3^2 \cdot 5^4 \cdot 7 \cdot 11$), `510,510` ($17\#$), `720,720`, `3,628,800` ($10!$), `6,469,693,230` ($29\#$), and `200,560,490,130` ($31\#$).
