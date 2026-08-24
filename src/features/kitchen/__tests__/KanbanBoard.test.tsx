import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "../KanbanBoard";
import type { Kot } from "@/lib/types";

function makeKot(
  id: string,
  status: Kot["status"],
  kotNumber: string
): Kot {
  return {
    id,
    kot_number: kotNumber,
    order_id: `o-${id}`,
    station: "Grill",
    status,
    priority: "normal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order: {
      order_number: `ORD-${id}`,
      order_type: "dine_in",
      table: { number: "3" },
    } as Kot["order"],
    items: [
      { id: `i-${id}`, order_item_id: `oi-${id}`, name: "Burger", quantity: 2, status: "pending" },
    ],
  };
}

describe("KanbanBoard (Kitchen Display)", () => {
  const kots = [
    makeKot("k1", "received", "KOT-001"),
    makeKot("k2", "in_progress", "KOT-002"),
    makeKot("k3", "ready", "KOT-003"),
  ];

  it("renders the three kitchen columns with the correct titles", () => {
    render(
      <KanbanBoard kots={kots} onStatusAdvance={vi.fn()} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );

    expect(screen.getByText("NEW ORDERS")).toBeInTheDocument();
    expect(screen.getByText("PREPARING")).toBeInTheDocument();
    expect(screen.getByText("READY")).toBeInTheDocument();
  });

  it("renders KOT cards with order and item details", () => {
    render(
      <KanbanBoard kots={kots} onStatusAdvance={vi.fn()} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );

    expect(screen.getByText("KOT-001")).toBeInTheDocument();
    expect(screen.getByText("KOT-002")).toBeInTheDocument();
    expect(screen.getByText("KOT-003")).toBeInTheDocument();
    // Item line shows quantity x name
    expect(screen.getAllByText(/2× Burger/).length).toBeGreaterThan(0);
  });

  it("advances a NEW ORDER to preparing", () => {
    const onStatusAdvance = vi.fn();
    render(
      <KanbanBoard kots={kots} onStatusAdvance={onStatusAdvance} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Start Preparing/i }));
    expect(onStatusAdvance).toHaveBeenCalledWith(kots[0]);
  });

  it("advances a PREPARING order to ready", () => {
    const onStatusAdvance = vi.fn();
    render(
      <KanbanBoard kots={kots} onStatusAdvance={onStatusAdvance} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Mark Ready/i }));
    expect(onStatusAdvance).toHaveBeenCalledWith(kots[1]);
  });

  it("opens the detail sheet for a KOT", () => {
    const onViewDetail = vi.fn();
    render(
      <KanbanBoard kots={kots} onStatusAdvance={vi.fn()} onViewDetail={onViewDetail} onArchive={vi.fn()} />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Details/i })[0]);
    expect(onViewDetail).toHaveBeenCalledWith(kots[0]);
  });

  it("shows an empty state per column when there are no tickets", () => {
    render(
      <KanbanBoard kots={[]} onStatusAdvance={vi.fn()} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );

    // Each column renders its empty placeholder
    expect(screen.getAllByText("No tickets").length).toBe(3);
  });
});
