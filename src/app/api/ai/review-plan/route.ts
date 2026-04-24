import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewChallengePlan } from "@/lib/ai";
import { GeminiUnavailableError } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, tasks } = await request.json();

  if (!title || !tasks?.length) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const reviewed = await reviewChallengePlan(title, tasks);
    return NextResponse.json({ tasks: reviewed });
  } catch (err) {
    if (err instanceof GeminiUnavailableError) {
      return NextResponse.json(
        { error: "Spróbuj za chwilę — AI jest teraz bardzo obciążone." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to review plan" },
      { status: 500 }
    );
  }
}
