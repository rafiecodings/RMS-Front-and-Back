"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function mutationErrorHandler(error: unknown) {
  // Only suppress session expiry (401) globally — it's handled by AuthProvider.
  // Let 403 (forbidden) and 422 (validation) pass through to feature handlers
  // so they can show meaningful, action-specific messages.
  if (!(error instanceof Error)) return;

  const axiosError = error as {
    response?: { status?: number; data?: { message?: string } };
  };
  const status = axiosError?.response?.status;

  if (status === 401) {
    // Session expired — AuthProvider handles redirect to login.
    return;
  }

  // For 403 (forbidden) and 422 (validation), let feature-level onError
  // handlers surface actionable messages. Only log truly unexpected errors.
  if (status === 403 || status === 422) {
    return;
  }

  // Surface the backend's human-readable message instead of the raw
  // axios wrapper ("Request failed with status code 409").
  const serverMessage = axiosError?.response?.data?.message;
  const detail = serverMessage
    ? `${status ? `${status}: ` : ""}${serverMessage}`
    : error.message;
  console.error(`[Mutation Error] ${detail}`);
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            onError: mutationErrorHandler,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
