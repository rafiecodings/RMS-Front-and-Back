"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseWebSocketOptions {
  channel: string;
  onMessage?: (data: unknown) => void;
  enabled?: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export function useWebSocket({
  channel,
  onMessage,
  enabled = true,
}: UseWebSocketOptions) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseDelay = 1000;

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !WS_URL) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      try {
        const ws = new WebSocket(`${WS_URL}/${channel}`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) {
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(event.data);
            onMessageRef.current?.(data);

            if (data?.type?.startsWith("kot.")) {
              queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
              queryClient.invalidateQueries({ queryKey: ["kitchen-orders-all"] });
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          if (cancelled) return;
          setIsConnected(false);

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay =
              baseDelay * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket connection failed
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [channel, enabled, queryClient]);

  return { isConnected };
}

/**
 * Kitchen Display WebSocket hook.
 * Connects to the kitchen channel for real-time KOT updates.
 * Falls back to polling (refetchInterval) when WS_URL is not configured.
 */
export function useKitchenWebSocket() {
  const { isConnected } = useWebSocket({
    channel: "kitchen",
    enabled: !!WS_URL,
  });

  return { isConnected };
}
