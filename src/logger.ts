// src/logger.ts
import * as Sentry from "@sentry/react";

export function overrideConsole(): void {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function (...args: unknown[]): void {
    // Call the original `console.log`
    originalConsoleLog.apply(console, args);

    // Send logs to Sentry in production
    if (process.env.NODE_ENV === "production") {
      Sentry.captureMessage(`LOG: ${args.join(" ")}`);
    }
  };

  console.error = function (...args: unknown[]): void {
    // Call the original `console.error`
    originalConsoleError.apply(console, args);

    // Send errors to Sentry in production
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(new Error(args.join(" ")));
    }
  };

  console.warn = function (...args: unknown[]): void {
    // Call the original `console.warn`
    originalConsoleWarn.apply(console, args);

    // Send warnings to Sentry in production
    if (process.env.NODE_ENV === "production") {
      Sentry.captureMessage(`WARN: ${args.join(" ")}`);
    }
  };
}
