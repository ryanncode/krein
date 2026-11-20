use wasm_bindgen::prelude::*;
use serde::Serialize;
use num_complex::Complex;
use nalgebra::DMatrix;

#[derive(Serialize)]
pub struct GUEDataPoint {
    pub level: u32,
    pub x: u64,
    pub amplitude: f64,
    pub local_degree: u32,
    pub jammed: u8,
    pub eigenvalue_spacing: f64,
    pub is_observable: bool,
    pub complex_im: f64,
    pub real_re: f64,
    pub thermal_weight: f64,
    pub loschmidt_re: f64,
    pub loschmidt_im: f64,
    pub spectral_integrality_deficit: f64,
    pub is_classically_certified: bool,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
pub enum SpectralRegime {
    CriticalLine,             // beta == 0.5
    ClassicalBarrierGap,      // 0.5 < beta < 0.875 (below cubic-theta benchmark)
    OpenAISevenEighthsZone,   // 0.875 <= beta < 0.9167
    OpenAIElevenTwelfthsZone, // beta >= 0.9167
}

pub fn classify_regime(beta: f64) -> SpectralRegime {
    if (beta - 0.5).abs() < 1e-4 {
        SpectralRegime::CriticalLine
    } else if beta >= 11.0 / 12.0 {
        SpectralRegime::OpenAIElevenTwelfthsZone
    } else if beta >= 7.0 / 8.0 {
        SpectralRegime::OpenAISevenEighthsZone
    } else {
        SpectralRegime::ClassicalBarrierGap
    }
}

/// Theoretical adjacent level-spacing ratio benchmarks <r> (Atas et al. 2013).
pub const R_POISSON: f64 = 0.38629;
pub const R_GOE: f64 = 0.5307;
pub const R_GUE: f64 = 0.5996;

/// Compute the unfolding-free adjacent level-spacing ratio
/// `<r> = mean(min(s_n, s_{n+1}) / max(s_n, s_{n+1}))` over distinct sorted real levels.
pub fn adjacent_spacing_ratio(levels: &[f64]) -> Option<f64> {
    let mut sorted: Vec<f64> = levels.iter().copied().filter(|x| x.is_finite()).collect();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mut uniq = Vec::with_capacity(sorted.len());
    for v in sorted {
        if uniq.last().map_or(true, |&prev: &f64| (v - prev).abs() > 1e-8) {
            uniq.push(v);
        }
    }
    if uniq.len() < 3 {
        return None;
    }
    let spacings: Vec<f64> = uniq.windows(2).map(|w| w[1] - w[0]).collect();
    let mut sum = 0.0;
    let mut count = 0usize;
    for w in spacings.windows(2) {
        let hi = w[0].max(w[1]);
        let lo = w[0].min(w[1]);
        if hi > 1e-8 {
            sum += lo / hi;
            count += 1;
        }
    }
    if count == 0 { None } else { Some(sum / count as f64) }
}

/// Classify a computed `<r>` value against standard random-matrix universality classes.
pub fn classify_level_statistics(mean_r: f64) -> &'static str {
    let candidates = [
        ("Poisson (integrable)", (mean_r - R_POISSON).abs()),
        ("GOE (time-reversal symmetric)", (mean_r - R_GOE).abs()),
        ("GUE (broken time-reversal)", (mean_r - R_GUE).abs()),
        ("Picket-fence / rigid", (mean_r - 1.0).abs()),
    ];
    candidates
        .into_iter()
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(label, _)| label)
        .unwrap_or("Unknown")
}

pub const CERTIFIED_ZEROS: [f64; 15] = [
    14.134725141735,
    21.022039638772,
    25.010857580146,
    30.424876125860,
    32.935061587739,
    37.586178158826,
    40.918719012147,
    43.327073280915,
    48.005150881167,
    49.773832477672,
    52.970321477714,
    56.446247697063,
    59.347044002602,
    60.831778524609,
    65.112544048082,
];

#[derive(Serialize)]
pub struct ZeroResonancePoint {
    pub t: f64,
    pub density: f64,
    pub is_peak: bool,
    pub nearest_zero: f64,
    pub error: f64,
}

/// Pure-Rust evaluation of the classical Gaussian-damped Weil explicit-formula
/// prime-power Fourier cosine sum:
///   R(t) = (1 / 2pi) ln(t / 2pi) - (1 / pi) sum_{p^k <= B} (ln p / p^{k/2}) exp(-(sigma ln p^k)^2 / 2) cos(t ln p^k).
///
/// Note: This resonance scanner is mathematically decoupled from the discrete
/// Krein slice-matrix diagonalization in `run_compute_wasm`.
pub fn compute_weil_zero_resonance(
    primorial_bound: u32,
    t_min: f64,
    t_max: f64,
    steps: usize,
    sigma: f64,
) -> Vec<ZeroResonancePoint> {
    let p_bound = std::cmp::max(primorial_bound, 30);
    let mut sieve = vec![true; (p_bound + 1) as usize];
    sieve[0] = false;
    if p_bound >= 1 { sieve[1] = false; }
    let sqrt_limit = (p_bound as f64).sqrt() as usize;
    for p in 2..=sqrt_limit {
        if sieve[p] {
            let mut mult = p * p;
            while mult <= p_bound as usize {
                sieve[mult] = false;
                mult += p;
            }
        }
    }

    let primes: Vec<u64> = (2..=p_bound as usize)
        .filter(|&p| sieve[p])
        .map(|p| p as u64)
        .collect();

    let max_power_bound = 100_000u64;
    let mut u_vals = Vec::new();
    let mut eff_weights = Vec::new();

    for &p in &primes {
        let mut pk = p;
        let ln_p = (p as f64).ln();
        while pk <= max_power_bound {
            let u = (pk as f64).ln();
            let raw_w = ln_p / (pk as f64).sqrt();
            let damping = (-0.5 * (sigma * u).powi(2)).exp();
            u_vals.push(u);
            eff_weights.push(raw_w * damping);
            if let Some(next_pk) = pk.checked_mul(p) {
                pk = next_pk;
            } else {
                break;
            }
        }
    }

    let step_count = std::cmp::max(steps, 100);
    let dt = (t_max - t_min) / (step_count - 1) as f64;
    let mut raw_density = Vec::with_capacity(step_count);
    let pi = std::f64::consts::PI;

    for i in 0..step_count {
        let t = t_min + i as f64 * dt;
        let mut osc = 0.0;
        for j in 0..u_vals.len() {
            osc += eff_weights[j] * (t * u_vals[j]).cos();
        }
        let smooth = if t > 2.0 * pi {
            (1.0 / (2.0 * pi)) * (t / (2.0 * pi)).ln()
        } else {
            0.0
        };
        let dens = smooth - (1.0 / pi) * osc;
        raw_density.push((t, dens));
    }

    let mut points = Vec::with_capacity(step_count);
    for i in 0..step_count {
        let (t, dens) = raw_density[i];
        let is_peak = if i > 0 && i < step_count - 1 {
            dens > raw_density[i - 1].1 && dens > raw_density[i + 1].1 && dens > 0.25
        } else {
            false
        };

        let mut nearest_zero = CERTIFIED_ZEROS[0];
        let mut min_diff = (t - nearest_zero).abs();
        for &z in &CERTIFIED_ZEROS {
            let diff = (t - z).abs();
            if diff < min_diff {
                min_diff = diff;
                nearest_zero = z;
            }
        }

        points.push(ZeroResonancePoint {
            t,
            density: dens,
            is_peak,
            nearest_zero,
            error: min_diff,
        });
    }

    points
}

#[wasm_bindgen]
pub fn run_zero_resonance_wasm(
    primorial_bound: u32,
    t_min: f64,
    t_max: f64,
    steps: usize,
    sigma: f64,
) -> JsValue {
    let points = compute_weil_zero_resonance(primorial_bound, t_min, t_max, steps, sigma);
    serde_wasm_bindgen::to_value(&points).unwrap()
}

fn distinct_prime_factors(mut n: u64) -> Vec<u64> {
    let mut factors = Vec::new();
    if n <= 1 { return factors; }
    
    if n % 2 == 0 {
        factors.push(2);
        while n % 2 == 0 { n /= 2; }
    }
    
    let mut i = 3;
    while i * i <= n {
        if n % i == 0 {
            factors.push(i);
            while n % i == 0 { n /= i; }
        }
        i += 2;
    }
    
    if n > 1 { factors.push(n); }
    factors
}

fn p_adic_valuation(mut n: u64, p: u64) -> u32 {
    if p <= 1 || n == 0 { return 0; }
    let mut count = 0;
    while n % p == 0 {
        count += 1;
        n /= p;
    }
    count
}

fn count_factors(mut n: u64) -> u32 {
    if n <= 1 { return 0; }
    let mut count = 0;
    
    while n % 2 == 0 { count += 1; n /= 2; }
    
    let mut i = 3;
    while i * i <= n {
        while n % i == 0 {
            count += 1;
            n /= i;
        }
        i += 2;
    }
    
    if n > 1 { count += 1; }
    count
}

fn gcd(mut a: u64, mut b: u64) -> u64 {
    while b != 0 {
        let t = b;
        b = a % b;
        a = t;
    }
    a
}

fn shared_semantic_root(a: u64, b: u64) -> u64 {
    gcd(a, b)
}


fn valuation_divergence(a: u64, b: u64) -> u32 {
    let primes_a = distinct_prime_factors(a);
    let primes_b = distinct_prime_factors(b);
    let mut all_primes = primes_a;
    for pb in primes_b {
        if !all_primes.contains(&pb) {
            all_primes.push(pb);
        }
    }
    
    let mut div = 0;
    for p in all_primes {
        let va = p_adic_valuation(a, p);
        let vb = p_adic_valuation(b, p);
        div += if va > vb { va - vb } else { vb - va };
    }
    div
}

#[derive(Clone, Copy)]
struct KreinCoord(i64, i64);

fn krein_j(v: KreinCoord) -> KreinCoord { KreinCoord(v.1, v.0) }
fn krein_bilin(u: KreinCoord, v: KreinCoord) -> i64 { u.0 * v.0 - u.1 * v.1 }
fn krein_scalar_mul(c: i64, v: KreinCoord) -> KreinCoord { KreinCoord(c * v.0, c * v.1) }

fn min_fac(n: u64) -> u64 {
    if n <= 1 { return 1; }
    if n % 2 == 0 { return 2; }
    let mut i = 3;
    while i * i <= n {
        if n % i == 0 { return i; }
        i += 2;
    }
    n
}

fn address_to_krein_unit(n: u64) -> KreinCoord {
    if n > 1 {
        let m_fac = min_fac(n);
        let parent = address_to_krein_unit(n / m_fac);
        krein_j(parent)
    } else {
        KreinCoord(1, 0)
    }
}

fn cross_branch_amplitude(a: u64, b: u64) -> Complex<f64> {
    let g = shared_semantic_root(a, b);
    let w = count_factors(g) as i64;
    let unit_g = address_to_krein_unit(g);
    let basis = KreinCoord(1, 1);
    
    if a == b {
        let vec_g = krein_scalar_mul(w, unit_g);
        let real = krein_bilin(vec_g, basis) as f64;
        Complex::new(real, 0.0)
    } else {
        let dist = valuation_divergence(a, b) as i64;
        if dist > w {
            Complex::new(0.0, 0.0)
        } else {
            let vec_g_reduced = krein_scalar_mul(w - dist, unit_g);
            let real = krein_bilin(vec_g_reduced, basis) as f64;
            let dist_f = dist as f64;
            let imag = if a > b { dist_f } else { -dist_f };
            Complex::new(real, imag)
        }
    }
}

fn next_slice(slice: &[u64]) -> Vec<u64> {
    let mut next_nodes = Vec::new();
    for &x in slice {
        let factors = distinct_prime_factors(x);
        for p in factors {
            let next_node = x / p;
            if !next_nodes.contains(&next_node) {
                next_nodes.push(next_node);
            }
        }
    }
    next_nodes.sort_unstable_by(|a, b| b.cmp(a));
    next_nodes
}

#[wasm_bindgen]
pub async fn run_compute_wasm(start_val_str: String, max_steps: u32, beta: f64, time_t: f64, log_cb: &js_sys::Function) -> JsValue {
    console_error_panic_hook::set_once();
    
    let log = |msg: &str| {
        let _ = log_cb.call1(&JsValue::null(), &JsValue::from_str(msg));
    };

    log(&format!("Initializing True Operator.lean Discrete Kinematics over Krein Space"));
    
    let start_val = start_val_str.parse::<u64>().unwrap_or(27720000);
    log(&format!("Starting Semantic Address Root: {}", start_val));
    
    let regime = classify_regime(beta);
    let is_classically_certified = matches!(
        regime,
        SpectralRegime::OpenAISevenEighthsZone | SpectralRegime::OpenAIElevenTwelfthsZone
    );
    log(&format!("Operating Regime: {:?} (Classically Certified: {})", regime, is_classically_certified));
    
    let mut data: Vec<GUEDataPoint> = Vec::new();
    let mut slice = vec![start_val];
    let mut n = 0;
    
    while n < max_steps {
        if slice.is_empty() { break; }
        if slice.iter().all(|&x| x <= 1) { break; }
        
        let w = if slice.is_empty() { 0 } else { count_factors(slice[0]) };
        
        // Build real block matrix for this slice to compute complex eigenvalues
        // A complex matrix M = A + iB corresponds to a real block matrix [A, -B; B, A]
        let size = slice.len();
        let eig_size = std::cmp::min(size, 150);
        let mut mat_real = DMatrix::from_element(eig_size * 2, eig_size * 2, 0.0);
        for i in 0..eig_size {
            let a = slice[i];
            let unit_a = address_to_krein_unit(a);
            let parity_a = krein_bilin(unit_a, KreinCoord(1, 1)) as f64;
            
            for j in 0..eig_size {
                let b = slice[j];
                let amp = cross_branch_amplitude(a, b);
                
                // Thermal weighting for the transition matrix.
                // The discrete topology natively evaluates at the critical line (beta = 0.5).
                // To explore away from the critical line, we apply a relative thermal deformation.
                let thermal_weight_a = (a as f64).powf(-(beta - 0.5));
                let thermal_weight_b = (b as f64).powf(-(beta - 0.5));
                let thermal_weight_cross = (thermal_weight_a * thermal_weight_b).sqrt();
                
                // Multiply by J-metric (parity_a) to convert Hermitian form H_ij to operator C_ij = J_ii * H_ij
                let c_re = parity_a * amp.re * thermal_weight_cross;
                let c_im = parity_a * amp.im * thermal_weight_cross;
                
                mat_real[(i, j)] = c_re;
                mat_real[(i + eig_size, j + eig_size)] = c_re;
                mat_real[(i, j + eig_size)] = -c_im;
                mat_real[(i + eig_size, j)] = c_im;
            }
        }
        
        // Compute complex eigenvalues natively using real block matrix
        let eig = mat_real.complex_eigenvalues();
        let mut all_eigenvalues: Vec<Complex<f64>> = eig.into_iter().copied().collect();
        // The block matrix produces each eigenvalue twice (as conjugate pairs).
        // We sort by real part, then imaginary part, and take every second eigenvalue to get the N eigenvalues.
        all_eigenvalues.sort_by(|a, b| {
            a.re.partial_cmp(&b.re).unwrap_or(std::cmp::Ordering::Equal)
                .then(a.im.partial_cmp(&b.im).unwrap_or(std::cmp::Ordering::Equal))
        });
        let mut eigenvalues = Vec::new();
        for i in (0..all_eigenvalues.len()).step_by(2) {
            eigenvalues.push(all_eigenvalues[i]);
        }

        // Unfold the spectrum: compute mean spacing for this slice based on real parts
        let mut sum_spacing = 0.0;
        let mut count_spacing = 0.0;
        if eigenvalues.len() > 1 {
            for i in 0..eigenvalues.len()-1 {
                sum_spacing += eigenvalues[i+1].re - eigenvalues[i].re;
                count_spacing += 1.0;
            }
        }
        let mean_spacing = if count_spacing > 0.0 { sum_spacing / count_spacing } else { 1.0 };
        

        for (current_idx, &x) in slice.iter().enumerate() {
            let deg = count_factors(x);
            let amp = cross_branch_amplitude(x, x).re;
            
            // For GUE verification, assign the corresponding eigenvalue spacing
            // Normalized by mean_spacing to unfold the spectrum!
            let mut spacing = 0.0;
            if current_idx + 1 < eigenvalues.len() {
                spacing = (eigenvalues[current_idx + 1].re - eigenvalues[current_idx].re) / mean_spacing;
            }
            
            // In a pure GUE spectrum, nodes aren't inherently "jammed" like in the integer heuristic,
            // but we can map jamming to a threshold of the spacing, or leave it 0 since it's now a continuous spectrum.
            let jammed = if spacing > 0.0 { 0 } else { 1 };
            
            // Thermodynamic Filter (Born Rule Stratification)
            // The observer is bound to the positive-definite subspace. 
            // Exceptional points (broken PT-symmetry) emerge as complex conjugate pairs,
            // and negative real eigenvalues represent negative-norm ghost states.
            let complex_im = if current_idx < eigenvalues.len() { eigenvalues[current_idx].im } else { 0.0 };
            let real_re = if current_idx < eigenvalues.len() { eigenvalues[current_idx].re } else { 1.0 };
            let is_observable = real_re > 0.0 && complex_im.abs() < 1e-10;
            
            // Thermodynamic Phase Transition Metrics (Wei et al.)
            let thermal_weight = (x as f64).powf(-beta);
            let ln_x = (x as f64).ln();
            // e^{-it ln n} = cos(t ln n) - i sin(t ln n)
            let phase_angle = time_t * ln_x;
            let loschmidt_re = thermal_weight * phase_angle.cos();
            let loschmidt_im = thermal_weight * (-phase_angle).sin();
            
            let spectral_integrality_deficit = (real_re - real_re.round()).abs();
            
            data.push(GUEDataPoint {
                level: w,
                x,
                // Scale structural amplitude by the thermal weight
                amplitude: amp * thermal_weight,
                local_degree: deg,
                jammed,
                eigenvalue_spacing: spacing,
                is_observable,
                complex_im,
                real_re,
                thermal_weight,
                loschmidt_re,
                loschmidt_im,
                spectral_integrality_deficit,
                is_classically_certified,
            });
        }
        
        slice = next_slice(&slice);
        n += 1;
    }
    
    log(&format!("Traversal complete. Extracted {} points from the emission spectrum.", data.len()));
    
    serde_wasm_bindgen::to_value(&data).unwrap()
}

/// Build the diagonal Krein parity matrix `J`, Hermitian matrix `H`, and
/// `J`-self-adjoint slice operator `C = J * H` matching `TensorSieve/Operator.lean`.
pub fn build_slice_matrices(
    slice: &[u64],
    beta: f64,
) -> (DMatrix<Complex<f64>>, DMatrix<Complex<f64>>, DMatrix<Complex<f64>>) {
    let n = slice.len();
    let mut j_mat = DMatrix::from_element(n, n, Complex::new(0.0, 0.0));
    let mut h_mat = DMatrix::from_element(n, n, Complex::new(0.0, 0.0));
    let mut c_mat = DMatrix::from_element(n, n, Complex::new(0.0, 0.0));

    for i in 0..n {
        let a = slice[i];
        let unit_a = address_to_krein_unit(a);
        let parity_a = krein_bilin(unit_a, KreinCoord(1, 1)) as f64;
        j_mat[(i, i)] = Complex::new(parity_a, 0.0);

        for j in 0..n {
            let b = slice[j];
            let amp = cross_branch_amplitude(a, b);
            let thermal_weight_a = (a as f64).powf(-(beta - 0.5));
            let thermal_weight_b = (b as f64).powf(-(beta - 0.5));
            let thermal_weight_cross = (thermal_weight_a * thermal_weight_b).sqrt();

            let h_ij = Complex::new(amp.re * thermal_weight_cross, amp.im * thermal_weight_cross);
            h_mat[(i, j)] = h_ij;
            c_mat[(i, j)] = Complex::new(parity_a * h_ij.re, parity_a * h_ij.im);
        }
    }

    (j_mat, h_mat, c_mat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_krein_j_self_adjoint_exact() {
        for slice in [vec![30, 20, 42, 70], vec![210, 105, 70, 42, 30, 14, 15]] {
            for beta in [0.5, 0.75] {
                let (j_mat, h_mat, c_mat) = build_slice_matrices(&slice, beta);
                let n = slice.len();
                // J^2 == I
                let j_sq = &j_mat * &j_mat;
                for i in 0..n {
                    for k in 0..n {
                        let expected = if i == k { 1.0 } else { 0.0 };
                        assert!((j_sq[(i, k)] - Complex::new(expected, 0.0)).norm() < 1e-12);
                    }
                }
                // H^H == H
                let h_adj = h_mat.adjoint();
                for i in 0..n {
                    for k in 0..n {
                        assert!((h_mat[(i, k)] - h_adj[(i, k)]).norm() < 1e-12);
                    }
                }
                // J * C == C^H * J
                let lhs = &j_mat * &c_mat;
                let rhs = c_mat.adjoint() * &j_mat;
                for i in 0..n {
                    for k in 0..n {
                        assert!(
                            (lhs[(i, k)] - rhs[(i, k)]).norm() < 1e-12,
                            "J-self-adjointness failed at ({}, {})",
                            i,
                            k
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn test_adjacent_spacing_ratio_benchmarks() {
        // Uniform picket fence has <r> = 1.0
        let picket: Vec<f64> = (0..20).map(|i| i as f64).collect();
        let r_picket = adjacent_spacing_ratio(&picket).unwrap();
        assert!((r_picket - 1.0).abs() < 1e-12);
        assert_eq!(classify_level_statistics(r_picket), "Picket-fence / rigid");

        // Certified Riemann zeros gamma_1..gamma_15 sit near GUE (<r> ~ 0.6)
        let r_zeros = adjacent_spacing_ratio(&CERTIFIED_ZEROS).unwrap();
        assert!(r_zeros > 0.45 && r_zeros < 0.75, "Unexpected <r>={}", r_zeros);
        assert_eq!(classify_level_statistics(R_GUE), "GUE (broken time-reversal)");
        assert_eq!(classify_level_statistics(R_GOE), "GOE (time-reversal symmetric)");
        assert_eq!(classify_level_statistics(R_POISSON), "Poisson (integrable)");
    }

    #[test]
    fn test_weil_zero_resonance_matches_first_five_zeros() {
        let pts = compute_weil_zero_resonance(500, 12.0, 36.0, 2000, 0.15);
        let peaks: Vec<f64> = pts.iter().filter(|p| p.is_peak).map(|p| p.t).collect();
        assert!(!peaks.is_empty());
        for &gamma in &CERTIFIED_ZEROS[0..5] {
            let min_err = peaks
                .iter()
                .map(|&t| (t - gamma).abs())
                .fold(f64::INFINITY, f64::min);
            assert!(
                min_err < 0.25,
                "Expected Weil cosine-sum peak near gamma={}, min_err={}",
                gamma,
                min_err
            );
        }
    }

    #[test]
    fn test_unobservable_states_exist() {
        let mut slice = vec![30, 20, 42, 70]; // Example nodes
        
        let size = slice.len();
        let mut mat_real = DMatrix::from_element(size * 2, size * 2, 0.0);
        for (i, &a) in slice.iter().enumerate() {
            let unit_a = address_to_krein_unit(a);
            let parity_a = krein_bilin(unit_a, KreinCoord(1, 1)) as f64;
            
            for (j, &b) in slice.iter().enumerate() {
                let amp = cross_branch_amplitude(a, b);
                
                let c_re = parity_a * amp.re;
                let c_im = parity_a * amp.im;
                
                mat_real[(i, j)] = c_re;
                mat_real[(i + size, j + size)] = c_re;
                mat_real[(i, j + size)] = -c_im;
                mat_real[(i + size, j)] = c_im;
            }
        }
        
        let eig = mat_real.complex_eigenvalues();
        let mut all_eigenvalues: Vec<Complex<f64>> = eig.into_iter().copied().collect();
        all_eigenvalues.sort_by(|a, b| {
            a.re.partial_cmp(&b.re).unwrap_or(std::cmp::Ordering::Equal)
                .then(a.im.partial_cmp(&b.im).unwrap_or(std::cmp::Ordering::Equal))
        });
        
        let mut unobservable_count = 0;
        for i in (0..all_eigenvalues.len()).step_by(2) {
            let val = all_eigenvalues[i];
            if val.re <= 0.0 || val.im.abs() > 1e-10 {
                unobservable_count += 1;
            }
        }
        
        assert!(unobservable_count > 0, "There should be unobservable states (negative/complex ghost artifacts) for this slice!");
    }

    #[test]
    fn test_thermodynamic_metrics() {
        let x: u64 = 5;
        let beta = 0.5;
        let time_t = 14.1347; // near first Riemann zero
        
        let thermal_weight = (x as f64).powf(-beta);
        let expected_weight = 1.0 / (5.0f64).sqrt();
        assert!((thermal_weight - expected_weight).abs() < 1e-6);
        
        let ln_x = (x as f64).ln();
        let phase_angle = time_t * ln_x;
        let loschmidt_re = thermal_weight * phase_angle.cos();
        let loschmidt_im = thermal_weight * (-phase_angle).sin();
        
        assert!(!loschmidt_re.is_nan());
        assert!(!loschmidt_im.is_nan());
    }

    #[test]
    fn test_openai_quasi_rh_regimes() {
        assert_eq!(classify_regime(0.5), SpectralRegime::CriticalLine);
        assert_eq!(classify_regime(0.75), SpectralRegime::ClassicalBarrierGap);
        assert_eq!(classify_regime(0.875), SpectralRegime::OpenAISevenEighthsZone);
        assert_eq!(classify_regime(0.92), SpectralRegime::OpenAIElevenTwelfthsZone);
    }

    #[test]
    fn test_certified_zeros_contain_gamma_1() {
        assert!((CERTIFIED_ZEROS[0] - 14.134725).abs() < 1e-5);
        assert!((CERTIFIED_ZEROS[1] - 21.022039).abs() < 1e-5);
    }
}
