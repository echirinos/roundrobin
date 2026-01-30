"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Match } from "@/lib/types";

interface ScoreDialogProps {
  match: Match | null;
  open: boolean;
  onClose: () => void;
  onSave: (matchId: string, score1: number, score2: number) => void;
}

export function ScoreDialog({ match, open, onClose, onSave }: ScoreDialogProps) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  useEffect(() => {
    if (match) {
      setScore1(match.score1?.toString() ?? "");
      setScore2(match.score2?.toString() ?? "");
    }
  }, [match]);

  const handleSave = () => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (!isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0 && match) {
      onSave(match.id, s1, s2);
      onClose();
    }
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Enter Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block text-center">
                {match.team1[0].name} & {match.team1[1].name}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                placeholder="0"
                className="text-center text-3xl h-14 font-bold"
                autoFocus
              />
            </div>
            <div className="text-center text-muted-foreground font-medium">vs</div>
            <div className="space-y-2">
              <label className="text-sm font-medium block text-center">
                {match.team2[0].name} & {match.team2[1].name}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                placeholder="0"
                className="text-center text-3xl h-14 font-bold"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!score1 || !score2}
            className="w-full sm:w-auto"
          >
            Save Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
