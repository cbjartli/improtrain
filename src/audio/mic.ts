export interface MicHandle {
  analyser: AnalyserNode
  dispose: () => void
}

/** Opens the microphone with music-friendly constraints (no DSP mangling). */
export async function openMic(ctx: AudioContext): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  return {
    analyser,
    dispose: () => {
      source.disconnect()
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}
