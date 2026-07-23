use num_complex::Complex;
use nalgebra::DMatrix;

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

fn original_cross_branch_amplitude(a: u64, b: u64) -> i64 {
    let g = gcd(a, b);
    let w = count_factors(g) as i64;
    let unit_g = address_to_krein_unit(g);
    let basis = KreinCoord(1, 1);
    if a == b {
        let vec_g = krein_scalar_mul(w, unit_g);
        krein_bilin(vec_g, basis)
    } else {
        let dist = valuation_divergence(a, b) as i64;
        if dist > w {
            0
        } else {
            let vec_g_reduced = krein_scalar_mul(w - dist, unit_g);
            krein_bilin(vec_g_reduced, basis)
        }
    }
}

fn cross_branch_amplitude(a: u64, b: u64) -> Complex<f64> {
    let real = original_cross_branch_amplitude(a, b) as f64;
    
    // Create an anti-symmetric imaginary part
    // Using valuation divergence with a sign based on ordering
    let mut imag = 0.0;
    if a != b {
        let dist = valuation_divergence(a, b) as f64;
        imag = if a > b { dist } else { -dist };
    }
    
    Complex::new(real, imag)
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

fn main() {
    let mut slice = vec![27720000];
    let mut n = 0;
    while n < 4 {
        let size = slice.len();
        let mut mat = DMatrix::from_element(size, size, Complex::new(0.0, 0.0));
        for (i, &a) in slice.iter().enumerate() {
            for (j, &b) in slice.iter().enumerate() {
                mat[(i, j)] = cross_branch_amplitude(a, b);
            }
        }
        let eig = mat.symmetric_eigen();
        let mut eigenvalues: Vec<f64> = eig.eigenvalues.into_iter().copied().collect();
        eigenvalues.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let mut spacings = Vec::new();
        for i in 0..eigenvalues.len()-1 {
            spacings.push(eigenvalues[i+1] - eigenvalues[i]);
        }
        
        println!("Level {}: size {} matrix, Spacings: {:?}", 14 - n, size, spacings);
        slice = next_slice(&slice);
        n += 1;
    }
}
