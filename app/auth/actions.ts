"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function encodeMessage(type: "error" | "message", text: string) {
  const params = new URLSearchParams({ [type]: text });
  return `/auth?${params.toString()}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect(encodeMessage("error", "Please enter both email and password."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(encodeMessage("error", error.message));
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect(encodeMessage("error", "Please enter both email and password."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(encodeMessage("error", error.message));
  }

  if (!data.session) {
    redirect(
      encodeMessage(
        "message",
        "Account created. Check your email inbox for the confirmation link.",
      ),
    );
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
