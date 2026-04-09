"use client";

import { useState } from "react";
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

export default function SettingsPage() {
  const [reminderTime, setReminderTime] = useState("09:00");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function savePreferences() {
    setSaving(true);
    // TODO: Save to Supabase
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  }

  async function deleteAccount() {
    // TODO: Delete all user data from Supabase (cascade)
    // TODO: Sign out
    console.log("Delete account");
    setDeleteDialogOpen(false);
  }

  async function signOut() {
    // TODO: Supabase sign out
    console.log("Sign out");
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
              />
            </div>
          )}
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? "Zapisuję..." : "Zapisz"}
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

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                >
                  Anuluj
                </Button>
                <Button variant="destructive" onClick={deleteAccount}>
                  Tak, usuń konto
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
