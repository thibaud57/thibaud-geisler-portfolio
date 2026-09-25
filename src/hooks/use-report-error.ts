"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export function useReportError(error: Error & { digest?: string }): void {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
}
