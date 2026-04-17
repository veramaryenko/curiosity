"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteChallengeDialogProps {
  challengeId: string;
  challengeTitle: string;
  onDeleted: () => void;
  trigger: React.ReactNode;
}

export function DeleteChallengeDialog({
  challengeId,
  challengeTitle,
  onDeleted,
  trigger,
}: DeleteChallengeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete challenge.");
      }

      setOpen(false);
      onDeleted();
      toast.success("Wyzwanie usunięte.");
    } catch {
      toast.error("Nie udało się usunąć wyzwania. Spróbuj ponownie.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć wyzwanie?</DialogTitle>
          <DialogDescription>
            Zaraz usuniesz „{challengeTitle}”. Tej operacji nie można cofnąć —
            zniknie całe wyzwanie wraz z zadaniami i refleksjami.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Usuwam..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
