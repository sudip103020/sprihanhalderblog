import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import "./index.css";
import "./App.css";
import App from "./App";
import ScrollToTop from "./components/Home/ScrollToTop";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
     <ScrollToTop />
      <App />
    </BrowserRouter>
  </StrictMode>
);