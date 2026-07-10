import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendWebhook } from "@/lib/webhook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const supabase = getSupabase();
    let entry = null;

    if (supabase) {
      const { data, error } = await supabase
        .from("setlist")
        .insert({ url: trimmed })
        .select()
        .single();

      if (error) throw error;
      entry = data;
    }

    await sendWebhook({ action: "setlist", url: trimmed });

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("[setlist]", err);
    return NextResponse.json({ error: "Failed to save setlist" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ entries: [] });
    }

    const { data, error } = await supabase
      .from("setlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    console.error("[setlist GET]", err);
    return NextResponse.json({ entries: [] });
  }
}
