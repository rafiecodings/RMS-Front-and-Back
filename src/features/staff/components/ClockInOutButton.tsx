"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2 } from "lucide-react";

interface ClockInOutButtonProps {
  isClockedIn: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  isLoading?: boolean;
}

export function ClockInOutButton({ isClockedIn, onClockIn, onClockOut, isLoading }: ClockInOutButtonProps) {
  if (isLoading) {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isClockedIn) {
    return (
      <Button variant="destructive" onClick={onClockOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Clock Out
      </Button>
    );
  }

  return (
    <Button onClick={onClockIn}>
      <LogIn className="h-4 w-4 mr-2" />
      Clock In
    </Button>
  );
}
