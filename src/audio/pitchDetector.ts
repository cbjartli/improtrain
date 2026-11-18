export interface PitchSample {
  /** Detected fundamental in Hz, or null when unvoiced. */
  freq: number | null
  /** 0–1 periodicity confidence. */
  clarity: number
  rms: number
}

const MIN_FREQ = 55
const MAX_FREQ = 1800
const RMS_GATE = 0.004
const CLARITY_GATE = 0.6

/**
 * McLeod Pitch Method (NSDF autocorrelation with peak picking and
 * parabolic interpolation). Robust for monophonic wind instruments.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): PitchSample {
  const n = buf.length
  let energy = 0
  for (let i = 0; i < n; i++) energy += buf[i] * buf[i]
  const rms = Math.sqrt(energy / n)
  if (rms < RMS_GATE) return { freq: null, clarity: 0, rms }

  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), n - 2)
  const minLag = 2
  const nsdf = new Float32Array(maxLag + 2)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let ac = 0
    let norm = 0
    for (let i = 0; i < n - lag; i++) {
      const a = buf[i]
      const b = buf[i + lag]
      ac += a * b
      norm += a * a + b * b
    }
    nsdf[lag] = norm > 0 ? (2 * ac) / norm : 0
  }

  // Skip the zero-lag lobe, then collect local maxima of positive regions.
  let pos = minLag
  while (pos <= maxLag && nsdf[pos] > 0) pos++
  const peaks: Array<{ lag: number; value: number }> = []
  let curLag = -1
  let curVal = -Infinity
  for (; pos <= maxLag; pos++) {
    const v = nsdf[pos]
    if (v > 0) {
      if (v > curVal) {
        curVal = v
        curLag = pos
      }
    } else if (curLag !== -1) {
      peaks.push({ lag: curLag, value: curVal })
      curLag = -1
      curVal = -Infinity
    }
  }
  if (curLag !== -1) peaks.push({ lag: curLag, value: curVal })
  if (peaks.length === 0) return { freq: null, clarity: 0, rms }

  let best = 0
  for (const p of peaks) if (p.value > best) best = p.value
  const threshold = best * 0.9
  const chosen = peaks.find((p) => p.value >= threshold) ?? peaks[0]

  let delta = 0
  const l = chosen.lag
  if (l > minLag && l < maxLag) {
    const a = nsdf[l - 1]
    const b = nsdf[l]
    const c = nsdf[l + 1]
    const denom = a + c - 2 * b
    if (denom !== 0) delta = Math.max(-1, Math.min(1, (a - c) / (2 * denom)))
  }

  const freq = sampleRate / (l + delta)
  const clarity = Math.min(1, chosen.value)
  if (freq < MIN_FREQ || freq > MAX_FREQ || clarity < CLARITY_GATE) {
    return { freq: null, clarity, rms }
  }
  return { freq, clarity, rms }
}
