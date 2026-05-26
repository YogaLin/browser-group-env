import React from "react";
import { createRoot } from "react-dom/client";
import "../popup/style.css";
import { PopupApp } from "../../src/popup/popup-app";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp layout="sidepanel" templateManagerTarget="modal" />
  </React.StrictMode>
);
