import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clarifyGoal } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description } = await request.json();

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

  try {
    const result = await clarifyGoal(title.trim(), description ?? "");
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/ai/clarify-goal failed:", err);
    return NextResponse.json(
      { error: "Failed to clarify goal" },
      { status: 500 }
    );
  }
}
