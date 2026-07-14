"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const TIMER_PRESETS = [25, 15, 5] as const;
const DEBUG_TIMER_PRESET = {
  label: "10 sec",
  durationMinutes: 1 / 6,
};

type PomodoroTimerProps = {
  userId: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PomodoroTimer({ userId }: PomodoroTimerProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to focus.");

  const startedAtRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playCompletionSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;

    const startAt = context.currentTime;
    const tones = [
      { frequency: 880, duration: 0.12, delay: 0 },
      { frequency: 1174.66, duration: 0.16, delay: 0.14 },
      { frequency: 1567.98, duration: 0.22, delay: 0.34 },
    ];

    tones.forEach(({ frequency, duration, delay }) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0.0001, startAt + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.18, startAt + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + delay + duration,
      );

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(startAt + delay);
      oscillator.stop(startAt + delay + duration);
    });
  }, [soundEnabled]);

  const saveSession = useCallback(async (status: "completed" | "cancelled") => {
    if (!startedAtRef.current) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(
      status === "completed" ? "Saving completed session..." : "Saving cancelled session...",
    );

    const completedAt = new Date().toISOString();
    const { error } = await supabase.from("pomodoro_sessions").insert({
      user_id: userId,
      duration_minutes: durationMinutes,
      status,
      started_at: startedAtRef.current,
      completed_at: status === "completed" ? completedAt : null,
    });

    setIsSaving(false);
    startedAtRef.current = null;

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage(
      status === "completed"
        ? "Session saved. Nice work."
        : "Cancelled session saved.",
    );
    router.refresh();
  }, [durationMinutes, router, supabase, userId]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          playCompletionSound();
          void saveSession("completed");
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, playCompletionSound, saveSession]);

  function handlePresetChange(nextMinutes: number) {
    if (isRunning || isSaving) {
      return;
    }

    setDurationMinutes(nextMinutes);
    setSecondsLeft(nextMinutes * 60);
    setStatusMessage("Ready to focus.");
  }

  function handleDebugModeToggle() {
    if (isRunning || isSaving) {
      return;
    }

    setDebugModeEnabled((current) => {
      const nextValue = !current;

      if (nextValue) {
        setDurationMinutes(DEBUG_TIMER_PRESET.durationMinutes);
        setSecondsLeft(10);
        setStatusMessage("Debug mode enabled.");
      } else {
        setDurationMinutes(25);
        setSecondsLeft(25 * 60);
        setStatusMessage("Debug mode disabled.");
      }

      return nextValue;
    });
  }

  function handleStart() {
    if (isRunning || isSaving) {
      return;
    }

    startedAtRef.current = new Date().toISOString();
    setIsRunning(true);
    setStatusMessage("Focus mode started.");
  }

  function handleReset() {
    const wasRunning = isRunning;

    setIsRunning(false);
    setSecondsLeft(durationMinutes * 60);

    if (wasRunning) {
      void saveSession("cancelled");
      return;
    }

    startedAtRef.current = null;
    setStatusMessage("Timer reset.");
  }

  return (
    <section className="my-8 rounded-[1.75rem] bg-stone-950 px-6 py-8 text-white shadow-lg">
      <div className="flex flex-wrap justify-center gap-2">
        {TIMER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetChange(preset)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              durationMinutes === preset
                ? "bg-orange-500 text-white"
                : "border border-white/15 text-stone-200"
            }`}
          >
            {preset} min
          </button>
        ))}
        {debugModeEnabled ? (
          <button
            type="button"
            onClick={() => handlePresetChange(DEBUG_TIMER_PRESET.durationMinutes)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              durationMinutes === DEBUG_TIMER_PRESET.durationMinutes
                ? "bg-orange-500 text-white"
                : "border border-white/15 text-stone-200"
            }`}
          >
            {DEBUG_TIMER_PRESET.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSoundEnabled((current) => !current)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            soundEnabled
              ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border border-white/15 text-stone-300"
          }`}
        >
          {soundEnabled ? "Sound on" : "Sound off"}
        </button>
        <button
          type="button"
          onClick={handleDebugModeToggle}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            debugModeEnabled
              ? "border border-sky-400/30 bg-sky-500/10 text-sky-300"
              : "border border-white/15 text-stone-300"
          }`}
        >
          {debugModeEnabled ? "Debug on" : "Debug off"}
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
          Current timer
        </p>
        <p className="mt-4 text-7xl font-semibold tabular-nums">
          {formatTime(secondsLeft)}
        </p>
        <p className="mt-3 text-sm text-stone-300">{statusMessage}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={isRunning || isSaving}
          className="rounded-full bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? "Running..." : "Start"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="rounded-full border border-white/15 px-4 py-3 font-medium text-stone-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
