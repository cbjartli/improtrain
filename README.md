# ImproTrain 🎷

Browser-based ear training and jazz chops for wind players (built around sax).

## Lesson mode 1 — Echo the phrase

1. Press **Start exercise**. The app plays a **reference note** (the tonic of the current key).
2. It then plays a short **phrase** of notes.
3. **Play the phrase back** on your horn. The mic + pitch detection score every note as you go
   (score-and-continue: a miss doesn't stop the phrase).
4. The results screen reveals the target notes vs. what you played, with intonation in cents,
   plus staff notation: your notes in green/red, with the intended note in gold on misses.
   Replay the target or your own take, retry the phrase, or move on.

All note names are shown as **written pitch** for your instrument (tenor Bb by default; alto Eb
and concert pitch available in settings).

### Settings

Instrument/transposition, key, scale (major, pentatonics, blues, dorian, mixolydian, chromatic),
phrase length, note range, largest melodic leap, and tempo. Settings persist in `localStorage`.

## Tech

- React + TypeScript + Vite; VexFlow for staff notation.
- Playback: Web Audio synth (detuned saws → lowpass → envelope + vibrato).
- Pitch detection: McLeod Pitch Method (NSDF autocorrelation, parabolic interpolation)
  on raw mic input (`src/audio/pitchDetector.ts`).
- Note segmentation: `src/capture/noteCapturer.ts` turns the pitch stream into discrete
  attempts (hold-to-register, slur and re-attack aware).

## Develop

```bash
npm install
npm run dev     # mic requires localhost or HTTPS
npm test        # vitest unit tests (theory + capture logic)
npm run build
```

Headphones recommended so the mic doesn't hear the playback.

## Roadmap

- Full phrase/lick lessons with rhythm scoring
- Staff rendering and transcription of what you played
- Call-and-response over chord progressions
