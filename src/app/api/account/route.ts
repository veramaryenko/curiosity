import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("DELETE /api/account: SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Delete user data (child rows first). Ignore errors from tables that may
  // not exist yet — the important part is deleting the auth user.
  try {
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id")
      .eq("user_id", user.id);

    const challengeIds = (challenges ?? []).map((c) => c.id);

    if (challengeIds.length > 0) {
      await supabase
        .from("daily_tasks")
        .delete()
        .in("challenge_id", challengeIds);
    }

    await supabase.from("mood_entries").delete().eq("user_id", user.id);
    await supabase.from("reflections").delete().eq("user_id", user.id);
    await supabase.from("challenges").delete().eq("user_id", user.id);
    await supabase
      .from("notification_preferences")
      .delete()
      .eq("user_id", user.id);
  } catch (err) {
    console.error("DELETE /api/account: error deleting user data:", err);
    // Continue — still try to delete the auth user
  }

  // Delete the auth user via admin client
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    console.error("DELETE /api/account: admin.deleteUser failed:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
