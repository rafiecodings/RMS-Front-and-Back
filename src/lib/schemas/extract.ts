import { z } from "zod"
import type { ApiResponse } from "@/lib/types"
import type { ZodSchema } from "zod"

/**
 * Safely extract and validate array data from an API response.
 * Returns the validated array or a fallback empty array if validation fails.
 */
export function safeExtractArray<T>(
  response: ApiResponse<unknown>,
  itemSchema: ZodSchema<T>,
  context?: string
): T[] {
  const payload = response.data

  let rawItems: unknown[]

  if (Array.isArray(payload)) {
    rawItems = payload
  } else if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items: unknown }).items)
  ) {
    rawItems = (payload as { items: unknown[] }).items
  } else {
    if (context && process.env.NODE_ENV !== "production") {
      console.warn(
        `[API] Expected array payload for ${context}, got:`,
        typeof payload
      )
    }
    return []
  }

  const schema = z.array(itemSchema)
  const result = schema.safeParse(rawItems)

  if (!result.success) {
    if (context && process.env.NODE_ENV !== "production") {
      console.warn(
        `[API] Validation failed for ${context}:`,
        result.error.issues
      )
    }
    return []
  }

  return result.data
}


