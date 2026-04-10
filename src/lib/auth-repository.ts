import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signOut() {
  return supabase.auth.signOut();
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp(email: string, password: string, options: { emailRedirectTo?: string }) {
  return supabase.auth.signUp({ email, password, options });
}

export function resetPasswordForEmail(email: string, options: { redirectTo?: string }) {
  return supabase.auth.resetPasswordForEmail(email, options);
}

export function signInWithOAuth(options: { redirectTo?: string }) {
  return supabase.auth.signInWithOAuth({ provider: "google", options });
}

export function updateUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}
