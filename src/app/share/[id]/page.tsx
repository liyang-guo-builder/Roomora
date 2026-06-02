import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShareView } from "./ShareView";

export const runtime = "nodejs";

interface SharedRow {
  id: string;
  original_url: string | null;
  result_url: string | null;
  style: string | null;
}

/** Fetch a publicly-shared generation by id. Returns null on miss / bad id. */
async function fetchShared(id: string): Promise<SharedRow | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("generations")
      .select("id, original_url, result_url, style")
      .eq("id", id)
      .eq("shared", true)
      .maybeSingle();
    return (data as SharedRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await fetchShared(id);
  const title = "Roomora · Restyle your real room";
  const description =
    "Same walls, same windows, still yours. See this room restyled with Roomora, then design your own for free.";
  const image = row?.result_url ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await fetchShared(id);
  if (!row || !row.result_url) notFound();
  return (
    <ShareView
      beforeUrl={row.original_url}
      afterUrl={row.result_url}
      style={row.style}
    />
  );
}
