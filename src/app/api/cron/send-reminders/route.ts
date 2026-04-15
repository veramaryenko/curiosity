import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTodayDateString } from "@/lib/app-date";
import { sendDailyReminder } from "@/lib/email";

// Use service role key for cron — this bypasses RLS
// This endpoint should be called by Vercel Cron or Supabase pg_cron
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = getTodayDateString();

  // Get today's tasks with user info and notification preferences
  const { data: tasks, error } = await supabase
    .from("daily_tasks")
    .select(
      `
      id,
      day_number,
      description,
      challenge_id,
      challenges!inner (
        id,
        title,
        duration_days,
        status,
        user_id
      )
    `
    )
    .eq("date", today)
    .eq("completed", false);

  if (error || !tasks) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }

  let sent = 0;

  for (const task of tasks) {
    const challenge = task.challenges as unknown as {
      id: string;
      title: string;
      duration_days: number;
      status: string;
      user_id: string;
    };

    if (challenge.status !== "active") continue;

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", challenge.user_id)
      .single();

    if (!prefs?.email_enabled) continue;

    // Get user email
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(challenge.user_id);

    if (!user?.email) continue;

    try {
      await sendDailyReminder({
        to: user.email,
        challengeTitle: challenge.title,
        dayNumber: task.day_number,
        totalDays: challenge.duration_days,
        taskDescription: task.description,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder to ${user.email}:`, err);
    }
  }

  return NextResponse.json({ sent });
}
