"use client";

import { Component, createElement } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return createElement("div", { className: "flex flex-col items-center justify-center py-24 gap-4" },
        createElement("h2", { className: "text-xl font-semibold" }, "Something went wrong"),
        createElement("p", { className: "text-muted-foreground text-sm" },
          `Error: ${this.state.error?.message ?? "Unknown error"}`
        ),
        createElement(Button,
          {
            variant: "outline",
            onClick: () => this.setState({ hasError: false, error: null }),
          },
          "Try again"
        )
      );
    }
    return this.props.children;
  }
}
