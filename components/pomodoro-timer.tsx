"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const TIMER_PRESETS = [25, 15, 5] as const;
const BREAK_PRESETS = [5, 10] as const;
const DEBUG_TIMER_PRESET = {
  label: "10 sec",
  seconds: 10,
  savedDurationMinutes: 1,
};
const DEFAULT_BREAK_MINUTES = 5;

type TimerMode = "focus" | "break";

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

  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoBreakEnabled, setAutoBreakEnabled] = useState(true);
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

  const applyTimerLength = useCallback(
    (nextMinutes: number) => {
      setDurationMinutes(nextMinutes);
      setSecondsLeft(
        debugModeEnabled && timerMode === "focus"
          ? DEBUG_TIMER_PRESET.seconds
          : nextMinutes * 60,
      );
    },
    [debugModeEnabled, timerMode],
  );

  const saveSession = useCallback(async (status: "completed" | "cancelled") => {
    if (!startedAtRef.current) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(
      status === "completed" ? "Saving completed session..." : "Saving cancelled session...",
    );

    const completedAt = new Date().toISOString();
    const storedDurationMinutes = debugModeEnabled
      ? DEBUG_TIMER_PRESET.savedDurationMinutes
      : durationMinutes;
    const { error } = await supabase.from("pomodoro_sessions").insert({
      user_id: userId,
      duration_minutes: storedDurationMinutes,
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

    if (status === "completed" && autoBreakEnabled) {
      setTimerMode("break");
      setDurationMinutes(DEFAULT_BREAK_MINUTES);
      setSecondsLeft(DEFAULT_BREAK_MINUTES * 60);
      setStatusMessage("Focus session saved. Break mode is ready.");
    } else if (status === "completed") {
      if (debugModeEnabled) {
        setDurationMinutes(DEBUG_TIMER_PRESET.savedDurationMinutes);
        setSecondsLeft(DEBUG_TIMER_PRESET.seconds);
      } else {
        setDurationMinutes(durationMinutes);
        setSecondsLeft(durationMinutes * 60);
      }
      setStatusMessage("Focus session saved.");
    } else {
      setStatusMessage("Cancelled session saved.");
    }
    router.refresh();
  }, [autoBreakEnabled, debugModeEnabled, durationMinutes, router, supabase, userId]);

  const handleTimerFinished = useCallback(() => {
    setIsRunning(false);
    playCompletionSound();

    if (timerMode === "focus") {
      void saveSession("completed");
      return;
    }

    startedAtRef.current = null;
    setTimerMode("focus");

    if (debugModeEnabled) {
      setDurationMinutes(DEBUG_TIMER_PRESET.savedDurationMinutes);
      setSecondsLeft(DEBUG_TIMER_PRESET.seconds);
    } else {
      setDurationMinutes(25);
      setSecondsLeft(25 * 60);
    }

    setStatusMessage("Break finished. Focus mode is ready.");
  }, [debugModeEnabled, playCompletionSound, saveSession, timerMode]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          handleTimerFinished();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [handleTimerFinished, isRunning]);

  function handlePresetChange(nextMinutes: number) {
    if (isRunning || isSaving) {
      return;
    }

    applyTimerLength(nextMinutes);
    setStatusMessage(
      timerMode === "focus" ? "Ready to focus." : "Break timer updated.",
    );
  }

  function handleDebugModeToggle() {
    if (isRunning || isSaving) {
      return;
    }

    setDebugModeEnabled((current) => {
      const nextValue = !current;

      if (nextValue) {
        setTimerMode("focus");
        setDurationMinutes(DEBUG_TIMER_PRESET.savedDurationMinutes);
        setSecondsLeft(DEBUG_TIMER_PRESET.seconds);
        setStatusMessage("Debug mode enabled.");
      } else {
        setTimerMode("focus");
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
    setStatusMessage(
      timerMode === "focus" ? "Focus mode started." : "Break mode started.",
    );
  }

  function handleReset() {
    const wasRunning = isRunning;

    setIsRunning(false);
    setSecondsLeft(
      debugModeEnabled && timerMode === "focus"
        ? DEBUG_TIMER_PRESET.seconds
        : durationMinutes * 60,
    );

    if (wasRunning && timerMode === "focus") {
      void saveSession("cancelled");
      return;
    }

    startedAtRef.current = null;
    setStatusMessage(timerMode === "focus" ? "Timer reset." : "Break reset.");
  }

  function handleModeChange(nextMode: TimerMode) {
    if (isRunning || isSaving) {
      return;
    }

    setTimerMode(nextMode);
    if (nextMode === "focus") {
      if (debugModeEnabled) {
        setDurationMinutes(DEBUG_TIMER_PRESET.savedDurationMinutes);
        setSecondsLeft(DEBUG_TIMER_PRESET.seconds);
      } else {
        setDurationMinutes(25);
        setSecondsLeft(25 * 60);
      }
      setStatusMessage("Ready to focus.");
      return;
    }

    setDurationMinutes(DEFAULT_BREAK_MINUTES);
    setSecondsLeft(DEFAULT_BREAK_MINUTES * 60);
    setStatusMessage("Break mode ready.");
  }

  const isFocusMode = timerMode === "focus";
  const glassButtonBase =
    "backdrop-blur-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]";

  return (
    <section
      className={`my-8 rounded-[1.75rem] px-6 py-8 text-white shadow-lg transition-colors ${
        isFocusMode
          ? "bg-[linear-gradient(180deg,_#d95600_0%,_#c84f0c_100%)]"
          : "bg-[linear-gradient(180deg,_#0d7a77_0%,_#0b6b69_100%)]"
      }`}
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleModeChange("focus")}
          className={`rounded-full px-4 py-3 text-sm font-medium transition ${glassButtonBase} ${
            timerMode === "focus"
              ? "border-white/25 bg-[rgba(255,232,191,0.88)] text-[#8a2f00]"
              : "border-white/20 bg-white/10 text-stone-100"
          }`}
        >
          Focus mode
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("break")}
          className={`rounded-full px-4 py-3 text-sm font-medium transition ${glassButtonBase} ${
            timerMode === "break"
              ? "border-white/25 bg-[rgba(243,223,138,0.88)] text-[#0d6e6b]"
              : "border-white/20 bg-white/10 text-stone-100"
          }`}
        >
          Break mode
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {(timerMode === "focus" ? TIMER_PRESETS : BREAK_PRESETS).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetChange(preset)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${glassButtonBase} ${
              durationMinutes === preset
                ? isFocusMode
                  ? "border-white/25 bg-[rgba(255,232,191,0.88)] text-[#8a2f00]"
                  : "border-white/25 bg-[rgba(243,223,138,0.88)] text-[#0d6e6b]"
                : "border-white/20 bg-white/10 text-stone-100"
            }`}
          >
            {preset} min
          </button>
        ))}
        {debugModeEnabled ? (
          <button
            type="button"
            onClick={() => {
              if (isRunning || isSaving || timerMode !== "focus") {
                return;
              }

              setDurationMinutes(DEBUG_TIMER_PRESET.savedDurationMinutes);
              setSecondsLeft(DEBUG_TIMER_PRESET.seconds);
              setStatusMessage("Ready to focus.");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${glassButtonBase} ${
              debugModeEnabled && secondsLeft <= DEBUG_TIMER_PRESET.seconds
                ? isFocusMode
                  ? "border-white/25 bg-[rgba(255,232,191,0.88)] text-[#8a2f00]"
                  : "border-white/25 bg-[rgba(243,223,138,0.88)] text-[#0d6e6b]"
                : "border-white/20 bg-white/10 text-stone-100"
            }`}
          >
            {DEBUG_TIMER_PRESET.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSoundEnabled((current) => !current)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${glassButtonBase} ${
            soundEnabled
              ? "border-emerald-200/30 bg-emerald-100/12 text-emerald-50"
              : "border-white/20 bg-white/10 text-stone-100"
          }`}
        >
          {soundEnabled ? "Sound on" : "Sound off"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isRunning || isSaving) {
              return;
            }

            setAutoBreakEnabled((current) => !current);
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${glassButtonBase} ${
            autoBreakEnabled
              ? "border-violet-200/30 bg-violet-100/12 text-violet-50"
              : "border-white/20 bg-white/10 text-stone-100"
          }`}
        >
          {autoBreakEnabled ? "Auto break on" : "Auto break off"}
        </button>
        <button
          type="button"
          onClick={handleDebugModeToggle}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${glassButtonBase} ${
            debugModeEnabled
              ? "border-sky-200/30 bg-sky-100/12 text-sky-50"
              : "border-white/20 bg-white/10 text-stone-100"
          }`}
        >
          {debugModeEnabled ? "Debug on" : "Debug off"}
        </button>
      </div>

      <div className="mt-8 text-center">
        <p
          className={`text-sm uppercase tracking-[0.3em] ${
            isFocusMode ? "text-[#ffe08a]" : "text-[#f3df8a]"
          }`}
        >
          {timerMode === "focus" ? "Current focus" : "Current break"}
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
          className={`rounded-full px-4 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isFocusMode
              ? "bg-[#8f2d00] hover:bg-[#782500]"
              : "bg-[#0a5351] hover:bg-[#084544]"
          }`}
        >
          {isRunning ? "Running..." : "Start"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className={`rounded-full px-4 py-3 font-medium text-stone-50 transition disabled:cursor-not-allowed disabled:opacity-60 ${glassButtonBase} border-white/20 bg-white/10 hover:bg-white/14`}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
