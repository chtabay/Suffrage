import { NextResponse } from "next/server";
import { sendHorizonReminders } from "@/lib/horizon/notifs";

export const dynamic = "force-dynamic";

async function run(req: Request) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await sendHorizonReminders()) });
}

export const GET = run;
export const POST = run;
