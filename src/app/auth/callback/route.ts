import { NextResponse } from "next/server";

// TODO: Handle Supabase auth callback
// This route will handle the magic link redirect from email
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // TODO: Exchange code for session with Supabase
    // const supabase = createClient();
    // await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
