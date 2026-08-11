import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getYoutubeId } from "@/lib/embed";

const SESSION_ID = 1;

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ session: null, enabled: false });
    }

    const { data, error } = await supabase
      .from("listen_session")
      .select("*")
      .eq("id", SESSION_ID)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ session: data, enabled: true });
  } catch (err) {
    console.error("[listen GET]", err);
    return NextResponse.json({ session: null, enabled: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const videoId = getYoutubeId(url.trim());
    if (!videoId) {
      return NextResponse.json({ error: "YouTube links only for jam sync" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Jam sync requires Supabase" }, { status: 503 });
    }

    const startedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("listen_session")
      .upsert(
        {
          id: SESSION_ID,
          video_id: videoId,
          url: url.trim(),
          started_at: startedAt,
          is_paused: false,
          pause_position: 0,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, session: data });
  } catch (err) {
    console.error("[listen POST]", err);
    return NextResponse.json({ error: "Failed to start jam" }, { status: 500 });
  }
}

/** Sync pause/play across tabs */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { is_paused, pause_position } = body;

    if (typeof is_paused !== "boolean" || typeof pause_position !== "number") {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Jam sync requires Supabase" }, { status: 503 });
    }

    const pos = Math.max(0, pause_position);

    const update = is_paused
      ? { is_paused: true, pause_position: pos }
      : {
          is_paused: false,
          pause_position: pos,
          // Rewind the clock so elapsed time = resume position
          started_at: new Date(Date.now() - pos * 1000).toISOString(),
        };

    const { data, error } = await supabase
      .from("listen_session")
      .update(update)
      .eq("id", SESSION_ID)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, session: data });
  } catch (err) {
    console.error("[listen PATCH]", err);
    return NextResponse.json({ error: "Failed to sync state" }, { status: 500 });
  }
}
