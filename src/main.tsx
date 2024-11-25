import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
import * as Sentry from "@sentry/react";
import { overrideConsole } from "./logger";

Sentry.init({
  dsn: "https://6409752cc2dfcee3998607ac6adaa5da@o4508360391458816.ingest.us.sentry.io/4508360394342400",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

// Override console methods
overrideConsole();

if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = function(obj: object, prop: string) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
