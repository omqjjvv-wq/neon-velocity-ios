/**
 * DESIGN REMINDER — 極速瑞士：畫布是主角，HUD 是稀疏而精確的海報式資訊層。
 * React 管理引擎生命週期與靜態 DOM；所有即時遊戲規則留在 client/src/game。
 */
import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, SUPER_LAG_RENDER_INTERVAL_MS, type GameHandle } from "@/game/scene";
import { createRunShareData } from "@/lib/runShareData";
import { shareScoreCard } from "@/lib/shareScoreCard";
import { trpc } from "@/lib/trpc";
import { canUseWebGL } from "@/lib/webglSupport";
import type { GameVariant } from "@/game/types";
import CompatRunner from "./CompatRunner";
import AnomalyCodex from "./AnomalyCodex";
import { getLocaleText, getStoredLanguage, LANGUAGE_OPTIONS, saveLanguage, type Language } from "@/lib/locale";
import { isItchRelease } from "@/lib/releaseMode";
import { isLegacyAndroidWebView } from "@/lib/deviceCompatibility";

const MARK_URL = "/manus-storage/neon-velocity-forward-mark_8f069099.png";

function sendCommand(command: string) {
  window.dispatchEvent(new CustomEvent("neon-velocity-command", { detail: command }));
}

type IdentityResult = {
  player: { playerId: number; displayName: string };
  migration: { migrated: boolean; bestScore: number | null };
};

export default function GameCanvas({ variant = "original" }: { variant?: GameVariant }) {
  const [useCompatMode, setUseCompatMode] = useState(() =>
    !canUseWebGL() ||
    isLegacyAndroidWebView() ||
    new URLSearchParams(window.location.search).get("compat") === "1",
  );
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const changeLanguage = (next: Language) => { saveLanguage(next); setLanguage(next); };
  useEffect(() => {
    let frame = 0;
    const syncViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        document.documentElement.style.setProperty("--nv-vh", `${viewportHeight}px`);
        document.documentElement.style.setProperty("--nv-vw", `${window.visualViewport?.width ?? window.innerWidth}px`);
      });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport, { passive: true });
    window.addEventListener("orientationchange", syncViewport, { passive: true });
    window.visualViewport?.addEventListener("resize", syncViewport, { passive: true });
    window.visualViewport?.addEventListener("scroll", syncViewport, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
    };
  }, []);
  if (useCompatMode) return <CompatRunner variant={variant} language={language} onLanguageChange={changeLanguage} />;
  return <ThreeDGame variant={variant} language={language} onLanguageChange={changeLanguage} onWebGLFailure={() => setUseCompatMode(true)} />;
}

function ThreeDGame({ variant, language, onLanguageChange, onWebGLFailure }: { variant: GameVariant; language: Language; onLanguageChange: (language: Language) => void; onWebGLFailure: () => void }) {
  const t = getLocaleText(language);
  const isItchBuild = isItchRelease();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const utils = trpc.useUtils();
  const [latestRank, setLatestRank] = useState<number | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [shareState, setShareState] = useState<"idle" | "working" | "shared" | "saved" | "error">("idle");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [identityMode, setIdentityMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [identityNotice, setIdentityNotice] = useState<string | null>(null);
  const leaderboardListRef = useRef<HTMLDivElement>(null);
  const leaderboardDragRef = useRef<{ pointerId: number; y: number } | null>(null);

  const neonIdentity = trpc.neonId.me.useQuery(undefined, { staleTime: 60_000, enabled: !isItchBuild });
  const leaderboard = trpc.leaderboard.list.useQuery({ gameVariant: variant }, { refetchInterval: 15_000, enabled: !isItchBuild });
  const player = neonIdentity.data;
  const onLeaderboardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    leaderboardDragRef.current = { pointerId: event.pointerId, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onLeaderboardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = leaderboardDragRef.current;
    const list = leaderboardListRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !list) return;
    const delta = drag.y - event.clientY;
    if (delta === 0) return;
    list.scrollTop += delta;
    drag.y = event.clientY;
  };
  const stopLeaderboardPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (leaderboardDragRef.current?.pointerId !== event.pointerId) return;
    leaderboardDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const submitScore = trpc.leaderboard.submit.useMutation({
    onSuccess: (result) => {
      setLatestRank(result.rank);
      utils.leaderboard.list.invalidate({ gameVariant: variant });
    },
  });

  const onIdentitySuccess = async (result: IdentityResult) => {
    utils.neonId.me.setData(undefined, result.player);
    await utils.leaderboard.list.invalidate();
    setIdentityOpen(false);
    setGameCode("");
    setIdentityNotice(result.migration.migrated
      ? `${language === "en" ? "Device best" : language === "zh-Hans" ? "当前设备最佳分数" : "目前裝置最佳分數"} ${String(result.migration.bestScore ?? 0).padStart(6, "0")} ${language === "en" ? "migrated to NEON ID" : language === "zh-Hans" ? "已迁移至 NEON ID" : "已移至 NEON ID"}／${result.player.displayName}`
      : `${language === "en" ? "NEON ID ready" : language === "zh-Hans" ? "NEON ID 已准备好" : "NEON ID 已準備完成"}／${result.player.displayName}`);
    if (latestScore !== null) submitScore.mutate({ score: latestScore, gameVariant: variant });
  };

  const registerIdentity = trpc.neonId.register.useMutation({ onSuccess: onIdentitySuccess });
  const loginIdentity = trpc.neonId.login.useMutation({ onSuccess: onIdentitySuccess });
  const logoutIdentity = trpc.neonId.logout.useMutation({
    onSuccess: () => {
      utils.neonId.me.setData(undefined, null);
      utils.leaderboard.list.invalidate({ gameVariant: variant });
      setLatestRank(null);
      setIdentityNotice(language === "en" ? "Logged out／you can still play" : language === "zh-Hans" ? "已登出 NEON ID／仍可直接游玩" : "已登出 NEON ID／仍可直接遊玩");
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;

    let engine: Engine;
    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        adaptToDeviceRatio: true,
      });
    } catch (error) {
      console.warn("[NEON VELOCITY] WebGL engine could not start; using 2D compatibility mode.", error);
      onWebGLFailure();
      return;
    }
    let handle: GameHandle | null = null;
    let disposed = false;

    createGameScene(engine, canvas, variant).then((created) => {
      if (disposed) {
        created.dispose();
        return;
      }
      handle = created;
      let lastRenderAt = performance.now();
      let lastSimulationAt = performance.now();
      engine.runRenderLoop(() => {
        const now = performance.now();
        const delta = Math.min(.05, (now - lastSimulationAt) / 1000);
        lastSimulationAt = now;
        created.update(delta);
        const renderInterval = created.isRenderThrottled() ? SUPER_LAG_RENDER_INTERVAL_MS : 0;
        if (renderInterval > 0 && now - lastRenderAt < renderInterval) return;
        lastRenderAt = now;
        created.scene.render();
      });
    }).catch((error: unknown) => {
      console.warn("[NEON VELOCITY] WebGL scene could not start; using 2D compatibility mode.", error);
      if (!disposed) onWebGLFailure();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, [onWebGLFailure, variant]);

  useEffect(() => {
    const onRunEnded = (event: Event) => {
      const score = (event as CustomEvent<{ score: number }>).detail?.score;
      if (!Number.isInteger(score) || score < 0) return;
      setLatestScore(score);
      setLatestRank(null);
      setShareState("idle");
      if (player && !isItchBuild) submitScore.mutate({ score, gameVariant: variant });
    };
    window.addEventListener("neon-velocity-run-ended", onRunEnded);
    return () => window.removeEventListener("neon-velocity-run-ended", onRunEnded);
  }, [isItchBuild, player, submitScore]);

  const onShare = async () => {
    if (!player) {
      openIdentity("login");
      return;
    }
    const data = createRunShareData(latestScore, latestRank, player.displayName, variant);
    if (!data) return;
    setShareState("working");
    try {
      const outcome = await shareScoreCard(data);
      setShareState(outcome === "shared" ? "shared" : "saved");
    } catch (error) {
      if ((error as Error).name === "AbortError") setShareState("idle");
      else setShareState("error");
    }
  };

  const openIdentity = (mode: "register" | "login") => {
    setIdentityMode(mode);
    setIdentityOpen(true);
  };

  const submitIdentity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentityNotice(null);
    const payload = { displayName, gameCode, gameVariant: variant };
    if (identityMode === "register") registerIdentity.mutate(payload);
    else loginIdentity.mutate(payload);
  };

  const identityMutation = identityMode === "register" ? registerIdentity : loginIdentity;
  const isSubmittingIdentity = identityMutation.isPending;
  const personalIsListed = Boolean(leaderboard.data?.entries.some(entry => entry.playerId === player?.playerId));
  const runRankNote = submitScore.isPending
    ? t.syncing
    : player && latestRank
      ? `${language === "en" ? "GLOBAL RANK" : language === "zh-Hans" ? "全球名次" : "全球名次"} #${String(latestRank).padStart(2, "0")}`
      : player
        ? `${t.connected}／${language === "en" ? "score saved" : language === "zh-Hans" ? "本局成绩已记录" : "本局成績已記錄"}`
        : t.needId;

  return (
    <div id="nv-shell" className="nv-shell" data-mode="ready" lang={language}>
      <label className="nv-language-picker"><span>{t.language}</span><select aria-label={t.language} value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>{LANGUAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="nv-atmos" aria-hidden="true" />
      <canvas ref={canvasRef} className="nv-canvas" style={{ touchAction: "none" }} aria-label={variant === "error-dimension" ? "NEON VELOCITY:ERROR DIMENSION 遊戲畫布" : "NEON VELOCITY 遊戲畫布"} />
      <div className="nv-runline" aria-hidden="true" />
      <div className="nv-launch-sequence" aria-hidden="true">
        <span className="nv-launch-step">3</span>
        <span className="nv-launch-step">2</span>
        <span className="nv-launch-step">1</span>
        <span className="nv-launch-step nv-launch-step--go">GO</span>
      </div>
      <aside id="nv-dimension-event" className="nv-dimension-event" hidden aria-live="polite">
        <b id="nv-dimension-event-title">錯誤維度</b>
        <span id="nv-dimension-event-detail">規則即將變化</span>
      </aside>
      <aside id="nv-dimension-history" className="nv-dimension-history" hidden aria-live="polite">
        <b>{t.history}</b>
        <ol id="nv-dimension-history-list" />
      </aside>

        <AnomalyCodex language={language} variant={variant} />
        <div className="nv-hud">
        <header className="nv-brand" aria-label="NEON VELOCITY">
          <img src={MARK_URL} className="nv-brand-mark" alt="" />
          <div className="nv-brand-copy"><b>NEON</b><b>VELOCITY</b><span>{variant === "error-dimension" ? "ERROR DIMENSION" : "01／極速系統"}</span></div>
        </header>

        <div className="nv-readout" aria-live="polite">
          <div className="nv-metric"><small>{t.score}</small><strong id="nv-score">000000</strong></div>
          <div className="nv-metric nv-metric--velocity"><small>{t.speed}</small><strong id="nv-speed">240</strong></div>
          <div className="nv-metric nv-metric--chain"><small>{t.chain}</small><strong id="nv-chain">×00</strong></div>
        </div>

        <div className="nv-edge-label"><b>{t.controls}</b><br />A · D／← · → <i>{t.keyboard}</i><br />{t.touch} <i>{t.sprintToggle}</i></div>
        <div className="nv-controls">
          <button id="nv-sprint-toggle" className="nv-control nv-control--sprint" aria-pressed="false" onClick={() => sendCommand("sprint-toggle")}>{t.sprint}</button>
          <button className="nv-control" onClick={() => sendCommand("pause")}>{t.pause}</button>
          <button className="nv-control" onClick={() => sendCommand("restart")}>{t.reset}</button>
        </div>

        <section id="nv-start-panel" className="nv-panel" aria-label={t.start}>
          <div className="nv-eyebrow">{variant === "error-dimension" ? t.errorEyebrow : t.originalEyebrow}</div>
          {variant === "error-dimension" ? <h1 className="nv-title nv-title--error">NEON<span>VELOCITY:</span><em>ERROR DIMENSION</em></h1> : <h1 className="nv-title">NEON<span>VELOCITY</span></h1>}
          <p>{variant === "error-dimension" ? t.errorIntro : t.originalIntro}</p>
          <button className="nv-action" onClick={() => sendCommand("start")}>{t.start}</button>
          <div className="nv-note">{t.controls}<br />{t.sprintToggle}</div>
          {!isItchBuild && <a className="nv-variant-link" href={variant === "error-dimension" ? "/" : "/error-dimension"}>{variant === "error-dimension" ? t.errorLink : t.originalLink}</a>}
        </section>

        {!isItchBuild && <aside className="nv-leaderboard" aria-label={t.leaderboard}>
          <div className="nv-leaderboard-head"><span>{t.leaderboard}／{variant === "error-dimension" ? "ERROR DIMENSION" : "NEON VELOCITY"}</span><b>{t.top10}</b></div>
          <div className="nv-neon-access">
            {player ? (
              <><span>NEON ID／<strong>{player.displayName}</strong></span><button onClick={() => logoutIdentity.mutate()} disabled={logoutIdentity.isPending}>{t.logout}</button></>
            ) : (
              <button onClick={() => openIdentity("register")}>{t.join}</button>
            )}
          </div>
          <div
            ref={leaderboardListRef}
            className="nv-leaderboard-list"
            onPointerDown={onLeaderboardPointerDown}
            onPointerMove={onLeaderboardPointerMove}
            onPointerUp={stopLeaderboardPointerDrag}
            onPointerCancel={stopLeaderboardPointerDrag}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") stopLeaderboardPointerDrag(event); }}
          >
            {leaderboard.isLoading && <div className="nv-leaderboard-empty">{t.syncing}</div>}
            {!leaderboard.isLoading && leaderboard.data?.entries.length === 0 && <div className="nv-leaderboard-empty">{t.noScores}</div>}
            {leaderboard.data?.entries.map((entry, index) => {
              const isYou = entry.playerId === player?.playerId;
              const rank = index + 1;
              const badge = rank === 1 ? (language === "en" ? "1ST" : language === "zh-Hans" ? "冠军" : "冠軍") : rank === 2 ? (language === "en" ? "2ND" : language === "zh-Hans" ? "亚军" : "亞軍") : rank === 3 ? (language === "en" ? "3RD" : language === "zh-Hans" ? "季军" : "季軍") : "";
              return <div className={`nv-leaderboard-row ${rank <= 3 ? `nv-leaderboard-row--top-${rank}` : ""} ${isYou ? "nv-leaderboard-row--you" : ""}`} data-rank={rank} key={entry.id}>
                <span className="nv-rank-cell">{badge && <i className="nv-rank-badge">{badge}</i>}<strong>{String(rank).padStart(2, "0")}</strong></span>
                <em>{entry.displayName}</em>
                <b>{String(entry.bestScore).padStart(6, "0")}</b>
                {isYou && <small>你</small>}
              </div>;
            })}
          </div>
          <div className="nv-leaderboard-scroll-hint" aria-hidden="true">↕ {language === "en" ? "SCROLL FOR MORE" : language === "zh-Hans" ? "上下滑动查看更多" : "上下滑動查看更多"}</div>
          {!personalIsListed && <div className="nv-leaderboard-you">
            <span>{player ? (identityNotice ?? `${t.connected}／${player.displayName}`) : t.needId}</span>
            <b>{leaderboard.data?.personal ? `#${String(leaderboard.data.personal.rank).padStart(2, "0")} · ${String(leaderboard.data.personal.bestScore).padStart(6, "0")}` : "—"}</b>
          </div>}
        </aside>}

        {!isItchBuild && identityOpen && <section className="nv-neon-panel" role="dialog" aria-modal="true" aria-labelledby="nv-neon-title">
          <button className="nv-neon-close" aria-label={t.close} onClick={() => setIdentityOpen(false)}>×</button>
          <div className="nv-eyebrow">{identityMode === "register" ? t.createId : t.openId}</div>
          <h2 id="nv-neon-title">{identityMode === "register" ? <>{t.createId} <span>NEON ID</span></> : <>{t.openId} <span>NEON ID</span></>}</h2>
          <p>{t.idDescription}</p>
          <form className="nv-neon-form" onSubmit={submitIdentity}>
            <label>{t.name}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={24} autoComplete="username" placeholder="例如：VELOCITY_01" required /></label>
            <label>{t.code}<input value={gameCode} onChange={(event) => setGameCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" autoComplete={identityMode === "register" ? "new-password" : "current-password"} placeholder="例如：240618" required /></label>
            {identityMutation.error && <div className="nv-neon-error">{identityMutation.error.message}</div>}
            <button className="nv-action" type="submit" disabled={isSubmittingIdentity}>{isSubmittingIdentity ? t.connect : identityMode === "register" ? t.createAndJoin : t.openRecords}</button>
          </form>
          <button className="nv-neon-switch" onClick={() => setIdentityMode(identityMode === "register" ? "login" : "register")}>{identityMode === "register" ? t.existing : t.first}</button>
        </section>}

        <section id="nv-crash-panel" className="nv-panel nv-crash-panel" hidden aria-live="assertive">
          <div className="nv-eyebrow">{variant === "error-dimension" ? "錯誤波追上／本次結束" : "本次衝刺結束"}</div>
          <h2 className="nv-title">{variant === "error-dimension" ? <>ERROR<span>WAVE。</span></> : <>沒有<span>煞車。</span></>}</h2>
          <div id="nv-crash-score" className="nv-crash-score">000000</div>
          {!isItchBuild && <div className="nv-rank-note">{runRankNote}</div>}
          <p>{variant === "error-dimension" ? "錯誤波已收窄安全距離。收集晶體、讀懂下一個異常，再把波甩回身後。" : isItchBuild ? "速度不是獎勵。它是風險。下一條線已經出現。" : player ? "速度不是獎勵。它是風險。下一條線已經出現。" : "這次成績已保留在本頁。建立 NEON ID 後，下一局即可進入全球排行榜。"}</p>
          <section id="nv-crash-history" className="nv-crash-history" hidden aria-label={t.history}>
            <b>{t.history}</b>
            <ol id="nv-crash-history-list" />
          </section>
          <div className="nv-crash-actions">
            {!isItchBuild && !player && <button className="nv-action nv-neon-join-action" onClick={() => openIdentity("register")}>{t.add}</button>}
            {!isItchBuild && <button className="nv-action nv-share-action" onClick={onShare} disabled={latestScore === null || submitScore.isPending}>{!player ? "登入 NEON ID 後分享" : shareState === "working" ? "準備中…" : shareState === "shared" ? "已分享 ✓" : shareState === "saved" ? "已儲存 PNG ✓" : shareState === "error" ? "重新分享" : "分享成績 ↗"}</button>}
            <button className="nv-action" onClick={() => sendCommand("restart")}>{t.restart}</button>
            {!isItchBuild && <a className="nv-action nv-home-action" href={variant === "error-dimension" ? "/error-dimension" : "/"}>{t.home}</a>}
          </div>
        </section>
      </div>
    </div>
  );
}
