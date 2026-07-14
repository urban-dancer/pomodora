import { createClient } from "@/lib/supabase/server";
import { PomodoroTimer } from "@/components/pomodoro-timer";

import { signOut } from "./auth/actions";

function formatTaipeiTime(dateString: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getTaipeiDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTaipeiDay(dateString: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dateString));
}

function getLastSevenTaipeiDates() {
  const dates: string[] = [];
  const now = new Date();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    dates.push(getTaipeiDateString(date));
  }

  return dates;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const todayTaipei = getTaipeiDateString();
  const lastSevenDates = getLastSevenTaipeiDates();
  const { data: sessions } = user
    ? await supabase
        .from("pomodoro_sessions")
        .select("id, duration_minutes, status, started_at, completed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const allSessions = sessions ?? [];
  const recentSessions = allSessions.slice(0, 5);
  const completedSessions = allSessions.filter(
    (session) => session.status === "completed",
  );
  const todayCompletedSessions = completedSessions.filter(
    (session) =>
      getTaipeiDateString(new Date(session.started_at)) === todayTaipei,
  );
  const todayCompletedCount = todayCompletedSessions.length;
  const todayFocusMinutes = todayCompletedSessions.reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );
  const sessionsByDate = completedSessions.reduce<
    Record<string, { count: number; minutes: number; sampleStartedAt: string }>
  >((accumulator, session) => {
    const dateKey = getTaipeiDateString(new Date(session.started_at));
    const currentValue = accumulator[dateKey];

    if (currentValue) {
      currentValue.count += 1;
      currentValue.minutes += session.duration_minutes;
      return accumulator;
    }

    accumulator[dateKey] = {
      count: 1,
      minutes: session.duration_minutes,
      sampleStartedAt: session.started_at,
    };
    return accumulator;
  }, {});
  const weeklySummary = lastSevenDates.map((dateKey) => {
    const daily = sessionsByDate[dateKey];

    return {
      dateKey,
      label: daily
        ? formatTaipeiDay(daily.sampleStartedAt)
        : formatTaipeiDay(`${dateKey}T00:00:00+08:00`),
      count: daily?.count ?? 0,
      minutes: daily?.minutes ?? 0,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffedd5_35%,_#fff_70%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between rounded-[1.75rem] border border-orange-100 bg-white/90 p-4 shadow-[0_20px_80px_rgba(251,146,60,0.15)] backdrop-blur sm:min-h-[calc(100vh-5rem)] sm:rounded-[2rem] sm:p-6">
        {user ? (
          <PomodoroTimer
            userId={user.id}
            headerRight={
              <form action={signOut}>
                <button className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
                  Sign out
                </button>
              </form>
            }
          />
        ) : (
          <>
            <section className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Focus for 25 minutes.</h1>
                <p className="text-sm leading-6 text-stone-600">
                  Your Next.js app is running, Supabase auth works, and session
                  storage is now connected.
                </p>
              </div>
            </section>

            <section className="my-6 rounded-[1.5rem] bg-stone-950 px-4 py-6 text-white shadow-lg sm:my-8 sm:rounded-[1.75rem] sm:px-6 sm:py-8">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                  Current timer
                </p>
                <p className="mt-4 text-6xl font-semibold tabular-nums sm:text-7xl">25:00</p>
                <p className="mt-3 text-sm text-stone-300">
                  Sign in to save your focus sessions.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8">
                <a
                  href="/auth"
                  className="rounded-full bg-orange-500 px-4 py-3 text-center font-medium text-white"
                >
                  Sign up
                </a>
                <a
                  href="/auth"
                  className="rounded-full border border-white/15 px-4 py-3 text-center font-medium text-stone-100"
                >
                  Sign in
                </a>
              </div>
            </section>
          </>
        )}

        <section className="space-y-2.5 text-sm text-stone-600 sm:space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
            <span>Supabase status</span>
            <span className="font-medium text-emerald-600">Connected</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
            <span>Signed in user</span>
            <span className="max-w-[13rem] truncate font-medium text-stone-900">
              {user?.email ?? "Not signed in yet"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
            <span>Next step</span>
            <span className="max-w-[13rem] text-right font-medium text-stone-900">
              {user ? "Add reminder sound" : "Create account or sign in"}
            </span>
          </div>
        </section>

        {user ? (
          <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
            <div className="rounded-[1.25rem] border border-orange-100 bg-white px-4 py-4 shadow-sm sm:rounded-[1.5rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Today
              </p>
              <p className="mt-3 text-4xl font-semibold text-stone-900">
                {todayCompletedCount}
              </p>
              <p className="mt-2 text-sm text-stone-500">completed sessions</p>
            </div>
            <div className="rounded-[1.25rem] border border-orange-100 bg-white px-4 py-4 shadow-sm sm:rounded-[1.5rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Focus time
              </p>
              <p className="mt-3 text-4xl font-semibold text-stone-900">
                {todayFocusMinutes}
              </p>
              <p className="mt-2 text-sm text-stone-500">minutes today</p>
            </div>
          </section>
        ) : null}

        {user ? (
          <section className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
                Last 7 days
              </h2>
              <span className="text-xs text-stone-400">Taipei time</span>
            </div>

            <div className="space-y-2">
              {weeklySummary.map((day) => (
                <div
                  key={day.dateKey}
                  className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-stone-900">{day.label}</span>
                    <span className="text-sm font-medium text-stone-500">
                      {day.minutes} min
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {day.count} completed session{day.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {user ? (
          <section className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
                Recent sessions
              </h2>
              <span className="text-xs text-stone-400">Latest 5</span>
            </div>

            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-stone-900">
                      {session.duration_minutes} min focus
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        session.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    Started {formatTaipeiTime(session.started_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
                No sessions yet. Run your first timer to create one.
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-5 rounded-[1.25rem] border border-orange-100 bg-orange-50/70 px-4 py-4 text-sm text-stone-700 sm:mt-6 sm:rounded-[1.5rem]">
          <h2 className="font-semibold text-stone-900">Add to iPhone Home Screen</h2>
          <ol className="mt-3 space-y-2 leading-6">
            <li>1. Open your deployed site in Safari.</li>
            <li>2. Tap the Share button.</li>
            <li>3. Choose Add to Home Screen.</li>
            <li>4. Launch Pomodora like an app from your home screen.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
