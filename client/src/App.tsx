import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const runtime = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return runtime?.isNativePlatform?.() === true || /Electron/i.test(window.navigator.userAgent);
}

export default function App() {
  const nativeApp = isNativeApp();

  useEffect(() => {
    document.title = nativeApp ? "NEON VELOCITY" : "NEON VELOCITY — 已停止提供";
  }, [nativeApp]);

  if (!nativeApp) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#0b0d12",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <section>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>NEON VELOCITY</h1>
          <p style={{ color: "#a1a1aa" }}>官方網頁版已停止提供。</p>
        </section>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <GameCanvas variant="original" />
    </ErrorBoundary>
  );
}
