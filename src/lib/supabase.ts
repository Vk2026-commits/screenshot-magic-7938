import { createClient } from "@supabase/supabase-js";

// Lovable deployments do not load repository .env files. These values are a
// public Supabase project URL and browser anon key (not a service-role secret),
// so the published webinar page can always reach Funnel 1. Hosted environment
// variables still take precedence for a future project change.
const defaultUrl = "https://bkmbgyhrldolybyuebwj.supabase.co";
const defaultAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbWJneWhybGRvbHlieXVlYndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MjIzMjUsImV4cCI6MjEwMTM5ODMyNX0.yjS-iPOldHUDBdEucyfNBjxKT5G7X07Z1vV-je1UTh8";

const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? defaultUrl;
const anonKey = (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ?? defaultAnonKey;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
