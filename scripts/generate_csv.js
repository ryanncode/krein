const fs = require('fs');

import('./pkg/krein.js').then(async (m) => {
    const wasmBuffer = fs.readFileSync('./pkg/krein_bg.wasm');
    await m.default(wasmBuffer);
    
    // N = 27720000, max_steps = 100
    let res = await m.run_compute_wasm('27720000', 100, (msg) => {});
    
    let csv = "level,x,amplitude,local_degree,jammed,eigenvalue_spacing\n";
    for (let r of res) {
        let jammed = (r.eigenvalue_spacing > 0.0) ? 0 : 1;
        csv += `${r.level},${r.x},${r.amplitude},${r.local_degree},${jammed},${r.eigenvalue_spacing}\n`;
    }
    
    fs.writeFileSync('../tensor-sieve/data.csv', csv);
    console.log("data.csv generated successfully in tensor-sieve.");
}).catch(console.error);
