import { useState, useMemo } from 'react'
import init, { run_compute_wasm } from './wasm/krein.js'
import wasmUrl from './wasm/krein_bg.wasm?url'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GUEDataPoint {
  level: number;
  x: number;
  amplitude: number;
  local_degree: number;
  jammed: number;
  eigenvalue_spacing: number;
}

function App() {
  const [startVal, setStartVal] = useState('27720000')
  const [maxSteps, setMaxSteps] = useState(100)
  const [result, setResult] = useState<GUEDataPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const handleCompute = async () => {
    setLoading(true)
    setErrorMsg(null)
    setLogs([])
    setResult(null)
    setCurrentPage(1)
    try {
      if (typeof init === 'function') {
        await init(wasmUrl)
      }
      const logger = (msg: string) => {
        setLogs(prev => [...prev, msg])
      }
      const res = await run_compute_wasm(startVal, maxSteps, logger)
      setResult(res)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.toString() + (e.stack ? '\\n' + e.stack : ''))
    } finally {
      setLoading(false)
    }
  }

  // Aggregate eigenvalue spacings for the GUE histogram
  const histogramData = useMemo(() => {
    if (!result) return []
    const spacingCounts: Record<number, number> = {}
    
    result.forEach(pt => {
      if (pt.eigenvalue_spacing > 0) {
        // Bin the continuous normalized eigenvalue spacings (e.g. nearest 0.1)
        const bin = Math.round(pt.eigenvalue_spacing * 10) / 10
        spacingCounts[bin] = (spacingCounts[bin] || 0) + 1
      }
    })
    
    return Object.keys(spacingCounts)
      .map(Number)
      .sort((a, b) => a - b)
      .map(spacing => ({
        spacing: spacing.toFixed(1),
        count: spacingCounts[spacing]
      }))
  }, [result])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f3f4f6', background: '#1e1e24', minHeight: '100vh' }}>
      <header style={{ borderBottom: '2px solid #3f3f46', marginBottom: '2rem', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Topological GUE Emission Spectrum</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
          Discrete Kinematic Operator executing over Krein Space.
        </p>
      </header>

      <section style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', background: '#2a2b36', padding: '1.5rem', border: '1px solid #3f3f46', borderRadius: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Semantic Root (N)</label>
          <input 
            type="text" 
            value={startVal} 
            onChange={e => setStartVal(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '200px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Depth</label>
          <input 
            type="number" 
            value={maxSteps} 
            onChange={e => setMaxSteps(Number(e.target.value))}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '100px', fontFamily: 'monospace', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>Load Preset</label>
          <select 
            value={`${startVal},${maxSteps}`}
            onChange={e => { 
              if(e.target.value) {
                const [val, depth] = e.target.value.split(',');
                setStartVal(val);
                setMaxSteps(Number(depth));
              }
            }}
            style={{ padding: '0.5rem', border: '1px solid #4b5563', width: '180px', background: '#1e1e24', color: '#f3f4f6', borderRadius: '4px' }}
          >
            <option value="">Select...</option>
            <option value="27720000,20">Base (27.7M)</option>
            <option value="510510,10">Primorial 17</option>
            <option value="720720,15">HCN (720k)</option>
            <option value="3628800,20">10! (3.6M)</option>
            <option value="6469693230,15">Primorial 29 (10^9)</option>
            <option value="200560490130,15">Primorial 31 (10^11)</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            onClick={handleCompute} 
            disabled={loading}
            style={{ padding: '0.5rem 1.5rem', background: '#38bdf8', color: '#0f172a', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
          >
            {loading ? 'Evaluating Topology...' : 'Execute Traversal'}
          </button>
        </div>
      </section>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', marginBottom: '2rem', borderRadius: '4px' }}>
          <strong>Error:</strong> <pre style={{ margin: 0 }}>{errorMsg}</pre>
        </div>
      )}

      {logs.length > 0 && !result && (
        <div style={{ padding: '1rem', background: '#2a2b36', border: '1px solid #3f3f46', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af', height: '200px', overflowY: 'auto', borderRadius: '4px' }}>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', background: '#2a2b36', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0' }}>Gaussian Unitary Ensemble (GUE) Level Spacing</h2>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                  <XAxis dataKey="spacing" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#3f3f46', color: '#f3f4f6' }} />
                  <Bar dataKey="count" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ border: '1px solid #3f3f46', padding: '1.5rem', overflowX: 'auto', background: '#2a2b36', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#e2e8f0' }}>Topological Emission Stream</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #4b5563', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Level</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Node (x)</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Amplitude</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Local Degree</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Jammed</th>
                  <th style={{ padding: '0.5rem', color: '#9ca3af' }}>Spacing</th>
                </tr>
              </thead>
              <tbody>
                {result.slice((currentPage - 1) * 100, currentPage * 100).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #3f3f46' }}>
                    <td style={{ padding: '0.5rem' }}>{row.level}</td>
                    <td style={{ padding: '0.5rem', color: '#38bdf8' }}>{row.x}</td>
                    <td style={{ padding: '0.5rem', color: row.amplitude === 0 ? '#ef4444' : '#e2e8f0' }}>{row.amplitude.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>{row.local_degree}</td>
                    <td style={{ padding: '0.5rem', color: row.jammed ? '#ef4444' : '#10b981' }}>{row.jammed}</td>
                    <td style={{ padding: '0.5rem' }}>{row.eigenvalue_spacing.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.length > 100 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', color: '#9ca3af', fontSize: '12px', borderTop: '1px solid #3f3f46' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.25rem 0.75rem', background: '#374151', color: currentPage === 1 ? '#4b5563' : '#f3f4f6', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {Math.ceil(result.length / 100)} (Total: {result.length} nodes)</span>
                <button 
                  disabled={currentPage === Math.ceil(result.length / 100)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(result.length / 100), prev + 1))}
                  style={{ padding: '0.25rem 0.75rem', background: '#374151', color: currentPage === Math.ceil(result.length / 100) ? '#4b5563' : '#f3f4f6', border: 'none', borderRadius: '4px', cursor: currentPage === Math.ceil(result.length / 100) ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
