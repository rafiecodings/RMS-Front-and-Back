"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function mutationErrorHandler(error: unknown) {
  // Validation errors (422) from backend are expected and handled by
  // component-level try/catch blocks — don't log them as console errors.
  if (!(error instanceof Error)) return;

  const axiosError = error as {
    response?: { status?: number; data?: { message?: string } };
  };
  const status = axiosError?.response?.status;
  if (status === 422) {
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
