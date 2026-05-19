import React from "react";
import ReactDOM from "react-dom/client";
import "../entrypoints/popup/style.css";
import { PopupApp } from "./popup/popup-app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
