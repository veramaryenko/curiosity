import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChallengePlan } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, duration_days } = await request.json();

  if (!title || !duration_days || duration_days < 7) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const tasks = await generateChallengePlan(title, description || "", duration_days);
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
