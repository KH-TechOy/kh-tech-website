import React from "react";
import { createRoot } from "react-dom/client";
import { resolveRoute } from "./utils";
import "./style.css";

const Website = React.lazy(() => import("./Website"));
const Report = React.lazy(() => import("./Report"));
const GamePage = React.lazy(() => import("./game2/GamePage"));
const base = import.meta.env.BASE_URL,
  path = resolveRoute(location.pathname, base);
function App() {
  return (
    <React.Suspense
      fallback={
        <div className="route-loading" role="status">
          {path === "/peli"
            ? "Ladataan Putkimestaria…"
            : "Ladataan KH-Techin sivua…"}
        </div>
      }
    >
      {path === "/peli" ? (
        <GamePage />
      ) : path === "/report" ? (
        <Report />
      ) : (
        <Website path={path} />
      )}
    </React.Suspense>
  );
}

if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  path === "/report"
) {
  const register = () =>
    void navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
createRoot(document.getElementById("root")!).render(<App />);
