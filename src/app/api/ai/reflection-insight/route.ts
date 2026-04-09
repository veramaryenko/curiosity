import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReflectionInsight } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challenge_title, mood_entries, reflection } = await request.json();

  if (!challenge_title || !reflection) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const insight = await generateReflectionInsight(
      challenge_title,
      mood_entries || [],
      reflection
    );
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
