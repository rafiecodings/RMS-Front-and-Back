/** Subtle semantic loyalty-tier treatment (light tint bg + accent text). */
export const LOYALTY_TIERS = [
  { tier: "Member", range: "0–4 visits", min: 0 },
  { tier: "Bronze", range: "5–9 visits", min: 5 },
  { tier: "Silver", range: "10–19 visits", min: 10 },
  { tier: "Gold", range: "20–29 visits", min: 20 },
  { tier: "Platinum", range: "30+ visits", min: 30 },
] as const;

export const LOYALTY_TIER_STYLES: Record<string, string> = {
  Member: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  Bronze: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900",
  Silver: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  Gold: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  Platinum: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-900",
};

export function tierForVisits(visits: number): string {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (visits >= LOYALTY_TIERS[i].min) return LOYALTY_TIERS[i].tier;
  }
  return "Member";
}
