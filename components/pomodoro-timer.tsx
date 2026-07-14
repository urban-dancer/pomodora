"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const TIMER_PRESETS = [25, 15, 5];

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
  const [statusMessage, setStatusMessage] = useState("Ready to focus.");

  const startedAtRef = useRef<string | null>(null);

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
          void saveSession("completed");
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, saveSession]);

  function handlePresetChange(nextMinutes: number) {
    if (isRunning || isSaving) {
      return;
    }

    setDurationMinutes(nextMinutes);
    setSecondsLeft(nextMinutes * 60);
    setStatusMessage("Ready to focus.");
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
