import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDiscoveryPlan } from "@/lib/ai";
import { GeminiUnavailableError } from "@/lib/gemini";

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
  };

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const durationDays =
    typeof body.duration_days === "number"
      ? body.duration_days
      : Number(body.duration_days);

  if (!title || title.length > 500) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: "Description too long" }, { status: 400 });
  }
  if (
    !Number.isFinite(durationDays) ||
    durationDays < 7 ||
    durationDays > 30
  ) {
    return NextResponse.json(
      { error: "duration_days must be between 7 and 30" },
      { status: 400 }
    );
  }

  try {
    const plan = await generateDiscoveryPlan(title, description, durationDays);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("POST /api/ai/generate-discovery-plan failed:", err);
    if (err instanceof GeminiUnavailableError) {
      return NextResponse.json(
        { error: "Spróbuj za chwilę — AI jest teraz bardzo obciążone." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
