import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { addDaysToDateString, getTodayDateString } from "@/lib/app-date";
import { sanitizeResourceUrl } from "@/lib/resource-url";
import { createClient } from "@/lib/supabase/server";

interface TaskInput {
  day: number;
  description: string;
  resource_url: string | null;
  metric?: string | null;
}

function isValidDurationDays(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function hasContiguousTaskDays(tasks: TaskInput[], durationDays: number) {
  if (tasks.length !== durationDays) {
    return false;
  }

  const uniqueDays = new Set(tasks.map((task) => task.day));

  if (uniqueDays.size !== tasks.length) {
    return false;
  }

  for (let day = 1; day <= durationDays; day += 1) {
    if (!uniqueDays.has(day)) {
      return false;
    }
  }

  return true;
}

function sanitizeTaskInput(task: unknown): TaskInput | null {
  if (!task || typeof task !== "object") {
    return null;
  }

  const rawTask = task as Record<string, unknown>;
  const rawDay = rawTask.day;
  const description =
    typeof rawTask.description === "string" ? rawTask.description.trim() : "";
  const metric =
    typeof rawTask.metric === "string" && rawTask.metric.trim().length > 0
      ? rawTask.metric.trim()
      : null;
  const resource_url = sanitizeResourceUrl(rawTask.resource_url);

  if (
    typeof rawDay !== "number" ||
    !Number.isInteger(rawDay) ||
    rawDay < 1 ||
    description.length === 0
  ) {
    return null;
  }

  const day = rawDay;

  return {
    day,
    description,
    metric,
    resource_url,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: unknown;
    description?: unknown;
    duration_days?: unknown;
    tasks?: unknown;
  };

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const durationDays = body.duration_days;
  const tasks = body.tasks;

  if (
    title.length === 0 ||
    !isValidDurationDays(durationDays) ||
    !Array.isArray(tasks) ||
    tasks.length === 0
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sanitizedTasks = tasks
    .map(sanitizeTaskInput)
    .filter((task): task is TaskInput => task !== null);

  if (sanitizedTasks.length !== tasks.length) {
    return NextResponse.json({ error: "Invalid task input" }, { status: 400 });
  }

  if (!hasContiguousTaskDays(sanitizedTasks, durationDays)) {
    return NextResponse.json(
      { error: "Tasks must cover each day exactly once" },
      { status: 400 }
    );
  }

  const startDate = getTodayDateString();
  const endDate = addDaysToDateString(startDate, durationDays - 1);

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      user_id: user.id,
      title,
      description,
      duration_days: durationDays,
      status: "active",
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }

  const taskRows = sanitizedTasks.map((t) => {
    const taskDate = addDaysToDateString(startDate, t.day - 1);

    return {
      challenge_id: challenge.id,
      day_number: t.day,
      description: t.description,
      resource_url: t.resource_url ?? null,
      metric: t.metric ?? null,
      completed: false,
      date: taskDate,
    };
  });

  const { error: tasksError } = await supabase
    .from("daily_tasks")
    .insert(taskRows);

  if (tasksError) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let rollbackError: { message?: string } | null = null;

    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      ({ error: rollbackError } = await adminClient
        .from("challenges")
        .delete()
        .eq("id", challenge.id));
    } else {
      console.error(
        "[POST /api/challenges] Missing Supabase service-role rollback configuration. Falling back to soft delete."
      );

      ({ error: rollbackError } = await supabase
        .from("challenges")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", challenge.id)
        .eq("user_id", user.id)
        .is("deleted_at", null));
    }

    if (rollbackError) {
      console.error("Challenge rollback failed:", rollbackError);
    }

    return NextResponse.json(
      { error: "Failed to create tasks" },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/challenge/${challenge.id}`);

  return NextResponse.json({ challenge_id: challenge.id });
}
