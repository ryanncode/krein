struct BigInt2048 {
    limbs: array<u32, 64>, // 64 * 32 = 2048 bits
};

struct ComputeState {
    status: u32,
    amplitude: u32,
}

@group(0) @binding(0) var<storage, read> target_inputs: array<BigInt2048>;
@group(0) @binding(1) var<storage, read> basis_inputs: array<BigInt2048>;
@group(0) @binding(2) var<storage, read_write> outputs: array<ComputeState>;

// Workgroup size restricted to 32 to maximize hardware sympathy (Warp size)
@compute @workgroup_size(32, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&target_inputs)) {
        return;
    }
    
    // Access corresponding basis bitmask (wrapping if basis array is shorter)
    let basis_len = arrayLength(&basis_inputs);
    let basis_index = index % basis_len;
    
    var amplitude: u32 = 0u;
    
    // Evaluate cross-branch entanglement via exact bitwise intersection (popcount)
    for (var i = 0u; i < 64u; i = i + 1u) {
        let intersection = target_inputs[index].limbs[i] & basis_inputs[basis_index].limbs[i];
        amplitude += countOneBits(intersection);
    }
    
    outputs[index].amplitude = amplitude;
    
    // Logical Jamming Constraint: 
    // If the amplitude is strictly 0, the node survived the sieve without 
    // destructive interference from the composite basis (i.e., it is prime).
    if (amplitude == 0u) {
        outputs[index].status = 1u; // Prime
    } else {
        outputs[index].status = 2u; // Jammed (Composite)
    }
}
