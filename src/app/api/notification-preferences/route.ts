import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("reminder_time, email_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({
      reminder_time: "09:00",
      email_enabled: true,
    });
  }

  // Postgres `time` column returns HH:MM:SS — normalise to HH:MM for <input type="time">.
  const rawTime =
    typeof data.reminder_time === "string" ? data.reminder_time : "09:00";
  const reminder_time = rawTime.slice(0, 5);

  return NextResponse.json({
    reminder_time,
    email_enabled: data.email_enabled,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    reminder_time?: unknown;
    email_enabled?: unknown;
  };

  const reminder_time = body.reminder_time;
  const email_enabled = body.email_enabled;

  if (
    typeof reminder_time !== "string" ||
    !TIME_REGEX.test(reminder_time) ||
    typeof email_enabled !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, reminder_time, email_enabled },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
