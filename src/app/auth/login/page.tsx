"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // TODO: Supabase magic link
    // const { error } = await supabase.auth.signInWithOtp({ email });

    // Simulate for now
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 text-xl font-semibold text-primary">
            Curiosity
          </Link>
          <CardTitle>{sent ? "Sprawdź pocztę" : "Zaloguj się"}</CardTitle>
          <CardDescription>
            {sent
              ? `Wysłaliśmy link do ${email}`
              : "Podaj email — wyślemy Ci link do logowania"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Kliknij link w mailu, żeby się zalogować. Nie widzisz? Sprawdź
                folder spam.
              </p>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSent(false)}
              >
                Wyślij ponownie
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Wysyłam..." : "Wyślij link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
