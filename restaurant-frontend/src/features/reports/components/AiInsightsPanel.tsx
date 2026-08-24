"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, ErrorState } from "@/components/shared";
import { Sparkles, TrendingUp, PackageSearch, AlertTriangle, Lightbulb } from "lucide-react";
import { useAiInsights, type AiInsights as AiInsightsData } from "../hooks/useAiInsights";

interface AiInsightsPanelProps {
  startDate: string;
  endDate: string;
  /** Auto-fetch on mount / date change. */
  auto?: boolean;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-muted text-muted-foreground",
};

function InsightList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiInsightsPanel({ startDate, endDate, auto = true }: AiInsightsPanelProps) {
  const insights = useAiInsights();

  // Auto-run when dates change; manual refresh via button.
  useEffect(() => {
    if (auto && startDate && endDate) {
      insights.mutate({ start_date: startDate, end_date: endDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const data: AiInsightsData | undefined = insights.data;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights
          {data?.cached && (
            <Badge variant="secondary" className="text-[10px]">
              cached
            </Badge>
          )}
          {data?.available && data.confidence && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${CONFIDENCE_STYLES[data.confidence] ?? ""}`}
            >
              {data.confidence} confidence
            </span>
          )}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insights.mutate({ start_date: startDate, end_date: endDate })}
          disabled={insights.isPending || !startDate || !endDate}
        >
          {insights.isPending ? "Analyzing…" : "Generate Insights"}
        </Button>
      </CardHeader>
      <CardContent>
        {insights.isPending ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
            <LoadingSpinner size="sm" />
            Analyzing aggregated metrics…
          </div>
        ) : insights.isError ? (
          <ErrorState message="AI insights temporarily unavailable." onRetry={() => insights.mutate({ start_date: startDate, end_date: endDate })} />
        ) : data && !data.available ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {data.message ?? "AI insights temporarily unavailable."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              All reports and analytics remain fully available.
            </p>
          </div>
        ) : data ? (
          <div className="space-y-5">
            {data.summary && (
              <p className="text-sm leading-relaxed">{data.summary}</p>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <InsightList
                icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
                title="Sales Insights"
                items={data.sales_insights}
              />
              <InsightList
                icon={<PackageSearch className="h-4 w-4 text-emerald-600" />}
                title="Inventory Insights"
                items={data.inventory_insights}
              />
              <InsightList
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                title="Risks"
                items={data.risks}
              />
              <InsightList
                icon={<Lightbulb className="h-4 w-4 text-purple-500" />}
                title="Recommendations"
                items={data.recommendations}
              />
            </div>
            {data.generated_at && (
              <p className="text-xs text-muted-foreground/70">
                Generated {new Date(data.generated_at).toLocaleString("en-PH")} · AI-generated narrative based on authoritative system metrics.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
