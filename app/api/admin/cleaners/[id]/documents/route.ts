import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "cleaner-docs";
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
const COLUMN = { dbs: "dbs_check_url", right_to_work: "right_to_work_url" } as const;
const kindSchema = z.enum(["dbs", "right_to_work"]);

/** POST (multipart: kind, file) — upload/replace a compliance document. Stored privately; the column holds the storage PATH, never a public URL. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid cleaner" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const kind = kindSchema.safeParse(form?.get("kind"));
  const file = form?.get("file");
  if (!kind.success || !(file instanceof File)) return NextResponse.json({ success: false, error: "Missing kind or file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ success: false, error: "Upload a PDF, JPG or PNG" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "File is over 10MB" }, { status: 400 });

  const supabase = createAdminClient();
  const column = COLUMN[kind.data];
  const { data: cleaner } = await supabase.from("cleaners").select(`id, ${column}`).eq("id", params.id).maybeSingle();
  if (!cleaner) return NextResponse.json({ success: false, error: "Cleaner not found" }, { status: 404 });

  const path = `${params.id}/${kind.data}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (upErr) return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });

  const previous = (cleaner as unknown as Record<string, string | null>)[column];
  const { error } = await supabase.from("cleaners").update({ [column]: path }).eq("id", params.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ success: false, error: "Couldn't save document" }, { status: 500 });
  }
  if (previous) await supabase.storage.from(BUCKET).remove([previous]);
  return NextResponse.json({ success: true });
}

/** GET ?kind=dbs|right_to_work — a 60-second signed link to view the document. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const kind = kindSchema.safeParse(new URL(req.url).searchParams.get("kind"));
  if (!kind.success) return NextResponse.json({ success: false, error: "Invalid kind" }, { status: 400 });

  const supabase = createAdminClient();
  const column = COLUMN[kind.data];
  const { data: cleaner } = await supabase.from("cleaners").select(column).eq("id", params.id).maybeSingle();
  const path = (cleaner as unknown as Record<string, string | null> | null)?.[column];
  if (!path) return NextResponse.json({ success: false, error: "No document uploaded" }, { status: 404 });

  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (!data?.signedUrl) return NextResponse.json({ success: false, error: "Couldn't open document" }, { status: 500 });
  return NextResponse.json({ success: true, url: data.signedUrl });
}

/** DELETE ?kind=… — remove a document (and un-verify DBS, since the evidence is gone). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const kind = kindSchema.safeParse(new URL(req.url).searchParams.get("kind"));
  if (!kind.success) return NextResponse.json({ success: false, error: "Invalid kind" }, { status: 400 });

  const supabase = createAdminClient();
  const column = COLUMN[kind.data];
  const { data: cleaner } = await supabase.from("cleaners").select(column).eq("id", params.id).maybeSingle();
  const path = (cleaner as unknown as Record<string, string | null> | null)?.[column];
  if (path) await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("cleaners").update({ [column]: null, ...(kind.data === "dbs" ? { dbs_verified: false } : {}) }).eq("id", params.id);
  return NextResponse.json({ success: true });
}
