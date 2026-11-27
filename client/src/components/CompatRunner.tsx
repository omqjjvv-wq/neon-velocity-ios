import { useEffect, useRef, useState } from "react";
import { getCompatPace } from "@/game/speedCurve";
import { createErrorAnomalySequence, getErrorAnomaly, getErrorAnomalyFamily, getErrorGameplayInterference, isErrorPreparationWindow, isKnownErrorAnomalyKind, makeErrorAnomalyRecord, type ErrorAnomaly, type ErrorAnomalyKind, type ErrorAnomalyRecord } from "@/game/errorDimension";
import type { GameVariant } from "@/game/types";
import AnomalyCodex from "./AnomalyCodex";
import { getCommonText, getLocaleText, getStoredLanguage, LANGUAGE_OPTIONS, saveLanguage, type Language } from "@/lib/locale";

const laneLabels = (language: Language) => language === "en" ? ["LEFT", "CENTER", "RIGHT"] as const : language === "zh-Hans" ? ["左", "中", "右"] as const : ["左", "中", "右"] as const;

export default function CompatRunner({ variant = "original", language = getStoredLanguage(), onLanguageChange }: { variant?: GameVariant; language?: Language; onLanguageChange?: (language: Language) => void }) {
  const isErrorDimension = variant === "error-dimension";
  const t = getLocaleText(language);
  const common = getCommonText(language);
  const lanes = laneLabels(language);
  const isEnglish = language === "en";
  const isSimplified = language === "zh-Hans";
  const [lane, setLane] = useState(1);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [anomaly, setAnomaly] = useState<ErrorAnomaly | null>(null);
  const [anomalyHistory, setAnomalyHistory] = useState<ErrorAnomalyRecord[]>([]);
  const [launching, setLaunching] = useState(false);
  const [blockerLane, setBlockerLane] = useState<number | null>(null);
  const [ghostLane, setGhostLane] = useState<number | null>(null);
  const laneRef = useRef(lane);
  const anomalyRef = useRef<ErrorAnomaly | null>(null);
  const scoreRef = useRef(score);
  const sprintingRef = useRef(sprinting);
  const anomalySequenceRef = useRef<ErrorAnomalyKind[]>(createErrorAnomalySequence());
  const lastAnomalyIndexRef = useRef(-1);
  const nextVisualAtRef = useRef(0);

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    sprintingRef.current = sprinting;
  }, [sprinting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const move = (direction: -1 | 1) => {
        const controlDirection = isErrorDimension ? getErrorGameplayInterference(anomalyRef.current, elapsed).controlDirection : 1;
        setLane(current => Math.max(0, Math.min(2, current + direction * controlDirection)));
      };
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
      if ((event.key === " " || event.key === "Enter") && !running) {
        event.preventDefault();
        scoreRef.current = 0;
        setScore(0);
        setCrashed(false);
        setBlockerLane(null);
        setGhostLane(null);
        anomalyRef.current = null;
        anomalySequenceRef.current = createErrorAnomalySequence();
        lastAnomalyIndexRef.current = -1;
        setAnomaly(null);
        setAnomalyHistory([]);
        setRunning(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now() - (new URLSearchParams(window.location.search).get("debug-anomaly") ? 10_000 : 0);
    let ticks = 0;
    let nextTick = 0;
    const pending = new Set<number>();
    const loop = () => {
      const runElapsed = (performance.now() - startedAt) / 1000;
      const pace = getCompatPace(runElapsed, sprintingRef.current);
      const interference = isErrorDimension ? getErrorGameplayInterference(anomalyRef.current, runElapsed) : getErrorGameplayInterference(null, runElapsed);
      const effectiveWarningMs = Math.max(260, pace.warningMs / interference.wavePressure);
      const visualTick = anomalyRef.current?.kind !== "lag" || runElapsed >= nextVisualAtRef.current;
      if (visualTick && anomalyRef.current?.kind === "lag") nextVisualAtRef.current = runElapsed + .2;
      if (visualTick) setElapsed(runElapsed);
      if (isErrorDimension) {
        if (anomalySequenceRef.current.length > 0 && runElapsed >= anomalySequenceRef.current.length * 10) {
          anomalySequenceRef.current = [...anomalySequenceRef.current, ...createErrorAnomalySequence(64, Math.random, anomalySequenceRef.current.at(-1))];
        }
        const nextAnomaly = getErrorAnomaly(runElapsed, anomalySequenceRef.current);
        anomalyRef.current = nextAnomaly;
        if (visualTick) setAnomaly(nextAnomaly);
        if (nextAnomaly && nextAnomaly.index !== lastAnomalyIndexRef.current) {
          lastAnomalyIndexRef.current = nextAnomaly.index;
          setAnomalyHistory(current => [...current, makeErrorAnomalyRecord(nextAnomaly, runElapsed)]);
          window.dispatchEvent(new CustomEvent("neon-velocity-anomaly-encountered", { detail: { kind: nextAnomaly.kind } }));
        }
      }
      ticks += 1;
      const nextScore = scoreRef.current + pace.scoreStep * interference.speedMultiplier;
      scoreRef.current = nextScore;
      if (visualTick) setScore(nextScore);
      const preAnomalyWindow = isErrorDimension && isErrorPreparationWindow(runElapsed);
      if (ticks % pace.spawnEvery === 0 && !preAnomalyWindow) {
        const nextBlocker = Math.floor(Math.random() * 3);
        if (visualTick) {
          setBlockerLane(nextBlocker);
          setGhostLane(anomalyRef.current?.kind === "echo" ? (nextBlocker + 1) % 3 : null);
        }
        const collisionTimer = window.setTimeout(() => {
          pending.delete(collisionTimer);
          if (laneRef.current === nextBlocker) {
            setRunning(false);
            setCrashed(true);
            window.dispatchEvent(new CustomEvent("neon-velocity-run-ended", { detail: { score: scoreRef.current } }));
          }
          if (anomalyRef.current?.kind !== "lag" || visualTick) {
            setBlockerLane(null);
            setGhostLane(null);
          }
        }, effectiveWarningMs);
        pending.add(collisionTimer);
      }
      nextTick = window.setTimeout(loop, pace.tickMs);
    };
    loop();
    return () => {
      window.clearTimeout(nextTick);
      pending.forEach(timer => window.clearTimeout(timer));
    };
  }, [running]);

  const startRun = () => {
    scoreRef.current = 0;
    setScore(0);
    setElapsed(0);
    setAnomaly(null);
    anomalyRef.current = null;
    setAnomalyHistory([]);
    setGhostLane(null);
    const forced = new URLSearchParams(window.location.search).get("debug-anomaly") as ErrorAnomalyKind | null;
    anomalySequenceRef.current = forced && isKnownErrorAnomalyKind(forced) ? [forced] : createErrorAnomalySequence();
    lastAnomalyIndexRef.current = -1;
    nextVisualAtRef.current = 0;
    setLaunching(true);
    window.setTimeout(() => setLaunching(false), 1800);
    setSprinting(false);
    setCrashed(false);
    setBlockerLane(null);
    setRunning(true);
  };

  return (
    <main className={`nv-compat ${sprinting ? "is-sprinting" : ""} ${launching ? "is-launching" : ""} ${isErrorDimension ? "nv-compat--error" : ""} ${anomaly?.kind === "fullscreen" ? "is-fullscreen-error" : ""} ${anomaly?.kind === "plane" ? "is-plane-shift" : ""} ${anomaly?.kind === "lag" ? "is-super-lag" : ""} ${anomaly?.kind === "debt" ? "is-debt-build" : ""}`} lang={language} data-anomaly={anomaly?.kind ?? "none"} data-control-direction={getErrorGameplayInterference(anomaly, elapsed).controlDirection} data-ghost-distraction={anomaly?.kind === "echo" ? "visible" : "hidden"} data-prism-signal={anomaly?.kind === "prism" ? "shifted" : "normal"} data-surge-pressure={anomaly?.kind === "surge" ? "elevated" : "normal"} data-plane-shift={anomaly?.kind === "plane" ? "visible" : "hidden"} data-super-lag={anomaly?.kind === "lag" ? "visible" : "hidden"} data-debt-build={anomaly?.kind === "debt" ? "visible" : "hidden"} data-anomaly-family={String(getErrorAnomalyFamily(anomaly?.kind))} aria-label={isErrorDimension ? "NEON VELOCITY:ERROR DIMENSION 2D 相容模式" : "NEON VELOCITY 2D 相容模式"}>
      <AnomalyCodex language={language} variant={variant} />
      <header className="nv-compat-brand">
        <strong>NEON<br />VELOCITY</strong>
        <span>{isErrorDimension ? "ERROR DIMENSION／2D" : isEnglish ? "2D COMPAT MODE" : isSimplified ? "2D 兼容模式" : "2D 相容模式"}</span>
      </header>

      <label className="nv-compat-language"><span>{t.language}</span><select aria-label={t.language} value={language} onChange={(event) => { const next = event.target.value as Language; saveLanguage(next); onLanguageChange?.(next); }}>{LANGUAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <section className="nv-compat-score" aria-live="polite"><small>{t.score}</small>
        <b>{String(score).padStart(6, "0")}</b>
      </section>
      <section className="nv-compat-speed" aria-live="polite"><small>{t.speed}</small><b>{Math.round(getCompatPace(elapsed, sprinting).speed * getErrorGameplayInterference(anomaly, elapsed).speedMultiplier)}</b></section>

      <div className="nv-compat-launch" aria-hidden="true"><b>3</b><b>2</b><b>1</b><b>GO</b></div>
      {isErrorDimension && (anomaly || isErrorPreparationWindow(elapsed)) && <aside className="nv-compat-event" aria-live="polite"><b>{anomaly ? anomaly.title : common.nextAnomaly}</b><span>{anomaly ? anomaly.detail : common.prepare}</span></aside>}
      {isErrorDimension && anomalyHistory.length > 0 && <aside className="nv-compat-history" aria-label={t.history}><b>{t.history}</b><ol>{anomalyHistory.slice(-4).map(record => <li key={record.index}><b>{String(record.triggeredAt).padStart(2, "0")}s</b><span>{record.title}／{record.detail}</span></li>)}</ol></aside>}
      {isErrorDimension && anomaly?.kind === "text" && <div className="nv-compat-text-glitch" aria-live="polite"><span>ERROR//3D→TXT</span><b>TEXT LAYER ACTIVE</b></div>}
      {isErrorDimension && anomaly?.kind === "fullscreen" && <div className="nv-compat-fullscreen-error" aria-live="polite"><span>FULLSCREEN//ERROR</span><b>DIMENSION REBUILDING</b><i>SCAN／SHIFT／REASSEMBLE</i></div>}
      {isErrorDimension && anomaly?.kind === "plane" && <div className="nv-compat-plane-error" aria-live="polite"><span>PLANE//SHIFT</span><b>3D → LAYERED PLATES</b><i>FLATTEN／STACK／REBUILD</i></div>}
      {isErrorDimension && anomaly?.kind === "lag" && <div className="nv-compat-lag-error" aria-live="polite"><span>SUPER//LAG</span><b>FRAME DESYNC</b><i>FREEZE／GHOST／REALIGN</i></div>}
      {isErrorDimension && anomaly?.kind === "debt" && <div className="nv-compat-debt-build" aria-live="polite"><div className="nv-compat-debt-square"><span>欠費</span></div><b>欠費版 // GAME</b><i>TEXT／CAR／SQUARE</i></div>}
      {isErrorDimension && anomaly?.kind.startsWith("anomaly-") && <div className={`nv-compat-family-glitch nv-compat-family-${getErrorAnomalyFamily(anomaly.kind)}`} data-family-effect={getErrorAnomalyFamily(anomaly.kind)} aria-hidden="true"><i /><i /><i /><span>{anomaly.kind}</span></div>}

      <section className="nv-compat-copy">
        <p>{common.noWebgl}</p>
        <h1>{isErrorDimension ? <>NEON VELOCITY:<span>ERROR DIMENSION</span></> : <>切換到<span>2D 跑道。</span></>}</h1>
        <p className="nv-compat-note">{common.compatNote}{isErrorDimension ? ` ${common.rulesSoon}.` : ""}</p>
      </section>

      <div className="nv-compat-track" aria-label="三線 2D 跑道">
        {lanes.map((label, index) => <div className={`nv-compat-lane ${lane === index ? "is-active" : ""} ${anomaly?.kind === "prism" && (index + Math.round(Math.sin(elapsed * 13) * 1.1) + 3) % 3 === lane ? "is-signal-shifted" : ""}`} key={label}>
          {blockerLane === index && <span className="nv-compat-blocker">{anomaly?.kind === "text" ? "ERROR//BLOCK" : anomaly?.kind === "plane" ? "PLANE//BLOCK" : anomaly?.kind === "lag" ? "LAG//FRAME" : anomaly?.kind === "debt" ? "DRAFT//BLOCK" : common.block}</span>}
          {ghostLane === index && <span className="nv-compat-blocker nv-compat-ghost-blocker" aria-hidden="true">{common.block}</span>}
          {lane === index && <span className="nv-compat-player" aria-label={`目前在${label}線`}>▲</span>}
        </div>)}
      </div>

      <div className="nv-compat-actions">
        <button type="button" onClick={() => { const direction = -1; const controlDirection = isErrorDimension ? getErrorGameplayInterference(anomaly, elapsed).controlDirection : 1; setLane(current => Math.max(0, Math.min(2, current + direction * controlDirection))); }}>← {lanes[0]}</button>
        {running
          ? <button type="button" className="nv-compat-status" aria-pressed={sprinting} onClick={() => setSprinting(current => !current)}>{sprinting ? `${t.sprinting}: ON` : `${t.sprint}: OFF`}</button>
          : <button type="button" className="nv-compat-start" onClick={startRun}>{crashed ? t.restart : t.start}</button>}
        <button type="button" onClick={() => { const direction = 1; const controlDirection = isErrorDimension ? getErrorGameplayInterference(anomaly, elapsed).controlDirection : 1; setLane(current => Math.max(0, Math.min(2, current + direction * controlDirection))); }}>{lanes[2]} →</button>
      </div>

      <p className="nv-compat-footer">{common.compatFooter}</p>
    </main>
  );
}
