import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChallengePlan } from "@/lib/ai";

const CONTEXT_KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_CONTEXT_ENTRIES = 5;
const MAX_CONTEXT_VALUE_LENGTH = 500;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, duration_days, context } = await request.json();

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description too long" },
        { status: 400 }
      );
    }
  }
  if (
    typeof duration_days !== "number" ||
    !Number.isInteger(duration_days) ||
    duration_days < 7 ||
    duration_days > 30
  ) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  let parsedContext: Record<string, string> | undefined;
  if (context !== undefined && context !== null) {
    if (typeof context !== "object" || Array.isArray(context)) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }
    const entries = Object.entries(context as Record<string, unknown>);
    if (entries.length > MAX_CONTEXT_ENTRIES) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }
    for (const [k, v] of entries) {
      if (!CONTEXT_KEY_PATTERN.test(k)) {
        return NextResponse.json({ error: "Invalid context" }, { status: 400 });
      }
      if (typeof v !== "string" || v.length > MAX_CONTEXT_VALUE_LENGTH) {
        return NextResponse.json({ error: "Invalid context" }, { status: 400 });
      }
    }
    parsedContext = Object.fromEntries(entries as [string, string][]);
  }

  try {
    const tasks = await generateChallengePlan(
      title.trim(),
      description ?? "",
      duration_days,
      parsedContext
    );
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
