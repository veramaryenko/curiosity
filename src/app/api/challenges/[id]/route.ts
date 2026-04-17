import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deletedAt = new Date().toISOString();

  const { data: challenge, error: challengeLookupError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (challengeLookupError) {
    console.error(
      "[DELETE /api/challenges/:id] lookup failed",
      challengeLookupError
    );
    return NextResponse.json(
      { error: "Failed to delete challenge" },
      { status: 500 }
    );
  }

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("challenges")
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[DELETE /api/challenges/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete challenge" },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/challenge/${id}`);
  revalidatePath(`/challenge/${id}/summary`);

  return NextResponse.json({ success: true });
}
