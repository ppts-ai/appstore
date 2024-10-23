import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
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
