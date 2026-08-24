"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Clock, BarChart3 } from "lucide-react";

interface PosHeaderProps {
  itemCount: number;
  onClearCart: () => void;
  onReport?: () => void;
  canReport?: boolean;
}

export function PosHeader({
  itemCount,
  onClearCart,
  onReport,
  canReport,
}: PosHeaderProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 lg:py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">POS</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {time}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReport && onReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReport}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Revenue Report
            </Button>
          )}
          {itemCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearCart}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear ({itemCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
