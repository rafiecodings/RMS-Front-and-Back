"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

interface ClockInOutButtonProps {
  isClockedIn: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  isLoading?: boolean;
}

export function ClockInOutButton({ isClockedIn, onClockIn, onClockOut, isLoading }: ClockInOutButtonProps) {
  // Keep the same label and width while loading so the button does not shift
  // under the user's finger mid-tap.
  if (isLoading) {
    return (
      <Button loading disabled>
        {isClockedIn ? "Clock Out" : "Clock In"}
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
