import { NextRequest, NextResponse } from "next/server";
import { sendWebhook, isPagerCodeValid } from "@/lib/webhook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, message, code } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "pager") {
      if (!code || !isPagerCodeValid(String(code))) {
        return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 403 });
      }
    }

    if (action === "pager-message") {
      if (!message || typeof message !== "string" || !message.trim()) {
        return NextResponse.json({ error: "Missing message" }, { status: 400 });
      }
    }

    await sendWebhook({
      action,
      message: action === "pager-message" ? message.trim() : message,
      code,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify]", err);
    return NextResponse.json({ error: "Failed to notify" }, { status: 500 });
  }
}