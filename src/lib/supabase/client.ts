"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client in the browser, acting as the signed-in user (RLS applies).
 * Used for direct file uploads, which would exceed the server's request size.
 * Only the publishable key is involved.
 */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
