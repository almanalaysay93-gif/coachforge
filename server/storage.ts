// File storage backed by Supabase Storage.
// Uploads go straight to the configured bucket; downloads are served via a
// short-lived signed URL, redirected to from /storage/{key} (storageProxy.ts).

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

let _client: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  if (!_client) {
    _client = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getSupabaseClient();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body =
    typeof data === "string" ? new TextEncoder().encode(data) : data;

  const { error } = await client.storage
    .from(ENV.supabaseStorageBucket)
    .upload(key, body, { contentType, upsert: false });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getSupabaseClient();
  const key = normalizeKey(relKey);

  const { data, error } = await client.storage
    .from(ENV.supabaseStorageBucket)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Storage signed URL failed: ${error?.message ?? "no URL returned"}`);
  }

  return data.signedUrl;
}
