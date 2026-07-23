use nalgebra::{DMatrix, Complex};

fn main() {
    let size = 4;
    let mut mat_real = DMatrix::from_element(size * 2, size * 2, 0.0);
    // Fill with random Hermitian values
    // ...
}
