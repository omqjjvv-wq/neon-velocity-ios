import { useEffect, useMemo, useState } from "react";
import { getErrorAnomalyCatalog, getErrorAnomalyFamily, getErrorAnomalyVariant, type ErrorAnomalyKind } from "@/game/errorDimension";
import { getAnomalyText, type Language } from "@/lib/locale";

const STORAGE_KEY = "neon-velocity-anomaly-codex-v1";
const ENCOUNTER_EVENT = "neon-velocity-anomaly-encountered";

type EncounterMap = Record<string, number>;

const loadEncounterMap = (): EncounterMap => {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return value && typeof value === "object" ? value as EncounterMap : {};
  } catch {
    return {};
  }
};

const saveEncounterMap = (value: EncounterMap) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* private mode can reject storage */ }
};

const copy = {
  "zh-Hant": { button: "異常圖鑑", title: "異常圖鑑", subtitle: "已遭遇的規則會留下視覺記錄。", locked: "尚未遭遇", encountered: "已遭遇", times: "次", close: "關閉圖鑑", all: "全部", core: "核心", extra: "編號事件", preview: "視覺預覽", family: "視覺家族" },
  "zh-Hans": { button: "异常图鉴", title: "异常图鉴", subtitle: "遭遇过的规则会留下视觉记录。", locked: "尚未遭遇", encountered: "已遭遇", times: "次", close: "关闭图鉴", all: "全部", core: "核心", extra: "编号事件", preview: "视觉预览", family: "视觉家族" },
  en: { button: "ANOMALY CODEX", title: "ANOMALY CODEX", subtitle: "Every encountered rule leaves a visual trace.", locked: "NOT ENCOUNTERED", encountered: "ENCOUNTERED", times: "TIMES", close: "CLOSE CODEX", all: "ALL", core: "CORE", extra: "SERIAL EVENTS", preview: "VISUAL PREVIEW", family: "VISUAL FAMILY" },
} as const;

export default function AnomalyCodex({ language, variant = "error-dimension" }: { language: Language; variant?: string }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug-codex") === "1");
  const [encounters, setEncounters] = useState<EncounterMap>(() => loadEncounterMap());
  const [filter, setFilter] = useState<"all" | "core" | "extra">("all");
  const [selectedKind, setSelectedKind] = useState<ErrorAnomalyKind>("mirror");
  const t = copy[language];
  const catalog = useMemo(() => getErrorAnomalyCatalog(), []);
  const selected = catalog.find(item => item.kind === selectedKind) ?? catalog[0];
  const selectedCount = encounters[selected.kind] ?? 0;
  const selectedFamily = getErrorAnomalyFamily(selected.kind);
  const selectedVariant = getErrorAnomalyVariant(selected.kind);
  const filtered = catalog.filter(item => filter === "all" || (filter === "core" ? !item.kind.startsWith("anomaly-") : item.kind.startsWith("anomaly-")));
  const unlocked = catalog.filter(item => (encounters[item.kind] ?? 0) > 0).length;

  useEffect(() => {
    const onEncounter = (event: Event) => {
      const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
      if (!kind) return;
      setEncounters(current => {
        const next = { ...current, [kind]: (current[kind] ?? 0) + 1 };
        saveEncounterMap(next);
        return next;
      });
    };
    window.addEventListener(ENCOUNTER_EVENT, onEncounter);
    return () => window.removeEventListener(ENCOUNTER_EVENT, onEncounter);
  }, []);

  if (variant !== "error-dimension") return null;

  return <>
    <button className="nv-codex-open" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>{t.button}<span>{unlocked}/{catalog.length}</span></button>
    {open && <section className="nv-codex" role="dialog" aria-modal="true" aria-labelledby="nv-codex-title">
      <button className="nv-codex-close" onClick={() => setOpen(false)} aria-label={t.close}>×</button>
      <header className="nv-codex-header">
        <div><div className="nv-eyebrow">{t.preview}</div><h2 id="nv-codex-title">{t.title}</h2><p>{t.subtitle}</p></div>
        <strong className="nv-codex-progress">{unlocked}<small>／{catalog.length}</small></strong>
      </header>
      <nav className="nv-codex-filters" aria-label={t.title}>
        {(["all", "core", "extra"] as const).map(value => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{t[value]}</button>)}
      </nav>
      <div className="nv-codex-layout">
        <div className="nv-codex-grid">
          {filtered.map(item => {
            const count = encounters[item.kind] ?? 0;
            const isLocked = count === 0;
            const [title] = getAnomalyText(language, item.kind);
            return <button key={item.kind} className={`nv-codex-card ${selectedKind === item.kind ? "is-selected" : ""} ${isLocked ? "is-locked" : ""}`} onClick={() => setSelectedKind(item.kind)} aria-label={isLocked ? `${item.kind} ${t.locked}` : title}>
              <span className={`nv-codex-mini nv-codex-family-${getErrorAnomalyFamily(item.kind)}`}><i /><i /><i /></span>
              <b>{isLocked ? "???" : title}</b><small>{isLocked ? t.locked : `${t.encountered} ${count} ${t.times}`}</small>
            </button>;
          })}
        </div>
        <article className={`nv-codex-preview nv-codex-family-${selectedFamily}`} data-family={selectedFamily}>
          <div className="nv-codex-preview-art" aria-hidden="true"><i /><i /><i /><span>{selectedKind.startsWith("anomaly-") ? selectedKind.replace("anomaly-", "A-") : selectedKind.toUpperCase()}</span></div>
          <div className="nv-eyebrow">{t.family} {String(selectedFamily).padStart(2, "0")}</div>
          <h3>{selectedCount > 0 ? getAnomalyText(language, selected.kind)[0] : "???"}</h3>
          <p>{selectedCount > 0 ? getAnomalyText(language, selected.kind)[1] : t.locked}</p>
          <dl><div><dt>{t.encountered}</dt><dd>{selectedCount} {t.times}</dd></div><div><dt>PHASE</dt><dd>{selectedVariant.phase.toFixed(2)}</dd></div><div><dt>FREQ</dt><dd>{selectedVariant.frequency.toFixed(1)}</dd></div></dl>
        </article>
      </div>
    </section>}
  </>;
}
