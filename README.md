# krein

🔗 **[View the `tensor-sieve` Formal Verification](https://github.com/ryanncode/tensor-sieve)**

**krein** is a high-performance WebAssembly (WASM) computational engine and React visualization suite for the `tensor-sieve` formalization project.

While the [tensor-sieve](https://github.com/ryanncode/tensor-sieve) Lean 4 repository provides the rigorous **Formal Theoretical Warrant** for non-Archimedean kinematics, `krein` provides the **physical execution layer**, bringing the mathematics directly into the browser.

## The Computational Engine

The engine is written in Rust and compiled to WebAssembly. It dynamically evaluates the topological tension of a given integer (Semantic Root) transversing the $p$-adic Bruhat-Tits tree. 

It calculates the arithmetic divergence across the lattice using a combinatorial Laplacian, mapping discrete delta constraints into a continuous eigenvalue spectrum. This proves empirically that **Gaussian Unitary Ensemble (GUE) Level Spacing** emerges natively from discrete grammatical arithmetic friction.

## Usage & Presets

To run the web application locally:
```bash
cd web
npm install
npm run dev
```

### Loading Massive Structural Hubs (Presets)

The user interface allows you to input a **Semantic Root (N)** and a **Depth**. 

To generate sufficient structural entanglement (arithmetic friction) required to trigger quantum level repulsion, the engine must evaluate highly composite numbers. Random primes or sparse branches will not generate the necessary topological jams.

The UI provides instant quick-load presets for massive structural hubs, carefully calculating the optimal depths for each:
* **Base (27.7M):** $2^6 \times 3^2 \times 5^4 \times 7 \times 11$ (The baseline test root).
* **Primorial 17:** $510,510$
* **10!:** $3,628,800$ (Massive prime multiplicity).
* **Primorial 29:** $10^9$ range.
* **Primorial 31:** $10^{11}$ range ($200,560,490,130$).

Selecting these presets automatically configures the engine to compute the exact spectrum unfolding. The output table features interactive pagination, allowing you to traverse thousands of transition amplitudes and spacings generated at massive scales without hanging the browser DOM.

---

> **Note on Verification:** The output of this engine is the empirical manifestation of the strict mathematical proofs defined in the Lean 4 `tensor-sieve` repository. Please refer to that repository for the formalized geometric definitions of the Krein metric and $p$-adic shift operators.
