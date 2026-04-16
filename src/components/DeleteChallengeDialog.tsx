"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteChallengeDialogProps {
  open: boolean;
  challengeTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChallengeDialog({
  open,
  challengeTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteChallengeDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isDeleting) {
          onCancel();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
      >
        <DialogHeader className="gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <DialogTitle>Czy na pewno chcesz usunąć to wyzwanie?</DialogTitle>
            <DialogDescription>
              Wyzwanie <span className="font-medium text-foreground">"{challengeTitle}"</span>{" "}
              zostanie ukryte w aplikacji. Ta operacja nie usuwa powiązanych danych i nie
              może zostać cofnięta.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Usuwam..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
