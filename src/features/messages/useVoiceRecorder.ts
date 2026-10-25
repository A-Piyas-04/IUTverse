"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_EXTENSION, baseMimeType, pickRecorderType, waveformBars } from "./chatModel";
import type { MediaDraft } from "./chatApi";

const MAX_RECORDING_MS = 5 * 60 * 1000;
const SAMPLE_EVERY_MS = 100;

export type RecorderState = "idle" | "recording" | "unsupported" | "denied";

interface Session {
  recorder: MediaRecorder;
  stream: MediaStream;
  audio: AudioContext;
  chunks: Blob[];
  samples: number[];
  startedAt: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Records a voice message with MediaRecorder and measures its loudness on the
 * way, which becomes the waveform the player draws. Resolves to a MediaDraft
 * ready to send, or null when the recording was cancelled.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const session = useRef<Session | null>(null);
  const finish = useRef<((draft: MediaDraft | null) => void) | null>(null);

  const teardown = useCallback(() => {
    const current = session.current;
    if (!current) return;
    clearInterval(current.timer);
    current.stream.getTracks().forEach((track) => track.stop());
    void current.audio.close().catch(() => {});
    session.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => {
    if (session.current?.recorder.state === "recording") session.current.recorder.stop();
    teardown();
  }, [teardown]);

  const start = useCallback(async () => {
    if (session.current) return;
    const type = typeof MediaRecorder !== "undefined" ? pickRecorderType((candidate) => MediaRecorder.isTypeSupported(candidate)) : null;
    if (!type || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState("denied");
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 48_000 });
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 512;
    audio.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);
    const chunks: Blob[] = [];
    const samples: number[] = [];
    const startedAt = Date.now();

    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const value of buffer) sum += ((value - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buffer.length);
      samples.push(rms);
      setLevel(Math.min(1, rms * 4));
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS && recorder.state === "recording") recorder.stop();
    }, SAMPLE_EVERY_MS);

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAt;
      const mimeType = baseMimeType(recorder.mimeType || type);
      const done = finish.current;
      finish.current = null;
      teardown();
      setState("idle");
      setElapsedMs(0);
      if (!done) return;
      if (!chunks.length || durationMs < 500) return done(null);
      const file = new File(chunks, `voice-message.${AUDIO_EXTENSION[mimeType] || "weba"}`, { type: mimeType });
      done({ file, kind: "audio", durationMs, waveform: waveformBars(samples), previewUrl: URL.createObjectURL(file) });
    };

    session.current = { recorder, stream, audio, chunks, samples, startedAt, timer };
    recorder.start(250);
    setElapsedMs(0);
    setState("recording");
  }, [teardown]);

  /** Stops and returns the recording. */
  const stop = useCallback(
    () =>
      new Promise<MediaDraft | null>((resolve) => {
        const current = session.current;
        if (!current || current.recorder.state !== "recording") return resolve(null);
        finish.current = resolve;
        current.recorder.stop();
      }),
    [],
  );

  /** Stops and throws the recording away. */
  const cancel = useCallback(() => {
    const current = session.current;
    finish.current = null;
    if (current?.recorder.state === "recording") current.recorder.stop();
    else teardown();
    setState("idle");
    setElapsedMs(0);
  }, [teardown]);

  return { state, elapsedMs, level, start, stop, cancel, reset: () => setState("idle") };
}
