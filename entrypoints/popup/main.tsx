import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import { PopupApp } from "../../src/popup/popup-app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp templateManagerTarget="page" />
  </React.StrictMode>
);
