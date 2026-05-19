import React from "react";
import ReactDOM from "react-dom/client";
import "../popup/style.css";
import { PopupApp } from "../../src/popup/popup-app";

const params = new URLSearchParams(window.location.search);
const sourceTabId = Number(params.get("sourceTabId"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp
      layout="page"
      templateManagerInitialOpen={params.get("templates") === "1"}
      sourceTabId={Number.isFinite(sourceTabId) ? sourceTabId : undefined}
    />
  </React.StrictMode>
);
