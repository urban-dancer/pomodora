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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: sessions } = user
    ? await supabase
        .from("pomodoro_sessions")
        .select("id, duration_minutes, status, started_at, completed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const recentSessions = sessions ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffedd5_35%,_#fff_70%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-between rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-[0_20px_80px_rgba(251,146,60,0.15)] backdrop-blur">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
              Pomodora setup check
            </div>
            {user ? (
              <form action={signOut}>
                <button className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight">Focus for 25 minutes.</h1>
            <p className="text-sm leading-6 text-stone-600">
              Your Next.js app is running, Supabase auth works, and session
              storage is now connected.
            </p>
          </div>
        </section>

        {user ? (
          <PomodoroTimer userId={user.id} />
        ) : (
          <section className="my-8 rounded-[1.75rem] bg-stone-950 px-6 py-8 text-white shadow-lg">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                Current timer
              </p>
              <p className="mt-4 text-7xl font-semibold tabular-nums">25:00</p>
              <p className="mt-3 text-sm text-stone-300">
                Sign in to save your focus sessions.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
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
        )}

        <section className="space-y-3 text-sm text-stone-600">
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
              {user ? "Add PWA and mobile polish" : "Create account or sign in"}
            </span>
          </div>
        </section>

        {user ? (
          <section className="mt-6 space-y-3">
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

        <section className="mt-6 rounded-[1.5rem] border border-orange-100 bg-orange-50/70 px-4 py-4 text-sm text-stone-700">
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
