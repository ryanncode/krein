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
pub async fn run_compute_wasm(start_val_str: String, max_steps: u32, log_cb: &js_sys::Function) -> JsValue {
    console_error_panic_hook::set_once();
    
    let log = |msg: &str| {
        let _ = log_cb.call1(&JsValue::null(), &JsValue::from_str(msg));
    };

    log(&format!("Initializing True Operator.lean Discrete Kinematics over Krein Space"));
    
    let start_val = start_val_str.parse::<u64>().unwrap_or(27720000);
    log(&format!("Starting Semantic Address Root: {}", start_val));
    
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
        let mut mat_real = DMatrix::from_element(size * 2, size * 2, 0.0);
        for (i, &a) in slice.iter().enumerate() {
            let unit_a = address_to_krein_unit(a);
            let parity_a = krein_bilin(unit_a, KreinCoord(1, 1)) as f64;
            
            for (j, &b) in slice.iter().enumerate() {
                let amp = cross_branch_amplitude(a, b);
                
                // Multiply by J-metric (parity_a) to convert Hermitian form H_ij to operator C_ij = J_ii * H_ij
                let c_re = parity_a * amp.re;
                let c_im = parity_a * amp.im;
                
                mat_real[(i, j)] = c_re;
                mat_real[(i + size, j + size)] = c_re;
                mat_real[(i, j + size)] = -c_im;
                mat_real[(i + size, j)] = c_im;
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
            let complex_im = eigenvalues[current_idx].im;
            let real_re = eigenvalues[current_idx].re;
            let is_observable = real_re > 0.0 && complex_im.abs() < 1e-10;
            
            data.push(GUEDataPoint {
                level: w,
                x,
                amplitude: amp,
                local_degree: deg,
                jammed,
                eigenvalue_spacing: spacing,
                is_observable,
                complex_im,
                real_re,
            });
        }
        
        slice = next_slice(&slice);
        n += 1;
    }
    
    log(&format!("Traversal complete. Extracted {} points from the emission spectrum.", data.len()));
    
    serde_wasm_bindgen::to_value(&data).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
