import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverInterests } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { freeText } = await request.json();

  if (!freeText || typeof freeText !== "string" || freeText.trim().length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (freeText.length > 500) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  try {
    const suggestions = await discoverInterests(freeText.trim());
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("POST /api/ai/discover-interests failed:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
