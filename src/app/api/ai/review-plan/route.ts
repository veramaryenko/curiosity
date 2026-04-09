import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewChallengePlan } from "@/lib/ai";

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
  } catch {
    return NextResponse.json(
      { error: "Failed to review plan" },
      { status: 500 }
    );
  }
}
