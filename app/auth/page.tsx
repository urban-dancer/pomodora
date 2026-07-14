import Link from "next/link";

import { signIn, signUp } from "./actions";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const statusMessage = params.error ?? params.message;
  const isError = Boolean(params.error);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffedd5_35%,_#fff_70%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-[2rem] border border-orange-100 bg-white/90 p-8 shadow-[0_20px_80px_rgba(251,146,60,0.15)] backdrop-blur">
          <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
            Pomodora auth
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Create your account and sync your focus sessions.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            We are using Supabase Email auth first. After this works, we can add
            session history, daily totals, and mobile-friendly install behavior.
          </p>

          {statusMessage ? (
            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                isError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {statusMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 text-sm text-stone-600 sm:grid-cols-3">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="font-medium text-stone-900">1. Sign up</p>
              <p className="mt-2">Use your email and password.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="font-medium text-stone-900">2. Confirm</p>
              <p className="mt-2">Open the email if Supabase asks for verification.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="font-medium text-stone-900">3. Sign in</p>
              <p className="mt-2">Return here and log into the app.</p>
            </div>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Back to home
          </Link>
        </section>

        <section className="w-full max-w-xl space-y-6">
          <form
            action={signUp}
            className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-[0_20px_80px_rgba(251,146,60,0.12)]"
          >
            <h2 className="text-2xl font-semibold">Sign up</h2>
            <p className="mt-2 text-sm text-stone-600">
              Start with email auth. We can add Google login later if you want.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="At least 6 characters"
                />
              </label>
            </div>

            <button className="mt-6 w-full rounded-full bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600">
              Create account
            </button>
          </form>

          <form
            action={signIn}
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_80px_rgba(24,24,27,0.06)]"
          >
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-stone-600">
              Use this after account creation or after verifying your email.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="Your password"
                />
              </label>
            </div>

            <button className="mt-6 w-full rounded-full border border-stone-900 bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-800">
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
