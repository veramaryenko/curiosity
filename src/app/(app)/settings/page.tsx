"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [reminderTime, setReminderTime] = useState("09:00");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const res = await fetch("/api/notification-preferences");
        if (!res.ok) {
          throw new Error("Failed to load");
        }
        const data = (await res.json()) as {
          reminder_time: string;
          email_enabled: boolean;
        };
        if (!cancelled) {
          setReminderTime(data.reminder_time);
          setEmailEnabled(data.email_enabled);
        }
      } catch {
        if (!cancelled) {
          toast.error("Nie udało się wczytać preferencji");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  async function savePreferences() {
    setSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminder_time: reminderTime,
          email_enabled: emailEnabled,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save");
      }
      toast.success("Zapisano");
    } catch {
      toast.error("Nie udało się zapisać preferencji");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Nieznany błąd");
      }

      // Sign out after successful deletion, then redirect to goodbye screen
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/goodbye");
    } catch (err) {
      setDeleting(false);
      setDeleteDialogOpen(false);
      toast.error(
        err instanceof Error ? err.message : "Nie udało się usunąć konta. Spróbuj ponownie."
      );
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      {/* Notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Powiadomienia</CardTitle>
          <CardDescription>
            Dostosuj kiedy i jak chcesz dostawać przypomnienia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={(checked) => setEmailEnabled(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="email-enabled">
              Przypomnienia emailowe o dziennym zadaniu
            </Label>
          </div>
          {emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Godzina przypomnienia</Label>
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-32"
                disabled={loading}
              />
            </div>
          )}
          <Button onClick={savePreferences} disabled={loading || saving}>
            {saving ? "Zapisuję..." : loading ? "Wczytuję..." : "Zapisz"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={signOut} className="w-full">
            Wyloguj się
          </Button>

          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              if (!deleting) setDeleteDialogOpen(open);
            }}
          >
            <DialogTrigger
              className="inline-flex w-full items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-destructive/90"
            >
              Usuń konto
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Czy na pewno?</DialogTitle>
                <DialogDescription>
                  To usunie Twoje konto i wszystkie dane — wyzwania, refleksje,
                  wpisy o nastroju. Tej operacji nie da się cofnąć.
                </DialogDescription>
              </DialogHeader>
<DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleting}
                >
                  Anuluj
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  disabled={deleting}
                >
                  {deleting ? "Usuwam…" : "Tak, usuń konto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Twoje dane są bezpieczne. Nie udostępniamy ich nikomu. Usunięcie konta
        kasuje wszystko — zgodnie z RODO.
      </p>
    </div>
  );
}
