import { describe, expect, it } from "vitest";
import { getAnomalyText, getLocaleText, getStoredLanguage, LANGUAGE_OPTIONS, saveLanguage } from "./locale";

describe("language settings", () => {
  it("offers Traditional Chinese by default plus Simplified Chinese and English", () => {
    expect(LANGUAGE_OPTIONS.map(option => option.value)).toEqual(["zh-Hant", "zh-Hans", "en"]);
    expect(getLocaleText("zh-Hant").language).toBe("語言");
    expect(getLocaleText("zh-Hans").language).toBe("语言");
    expect(getLocaleText("en").language).toBe("Language");
  });

  it("translates every anomaly visibly", () => {
    for (const language of ["zh-Hant", "zh-Hans", "en"] as const) {
      for (const kind of ["mirror", "echo", "prism", "surge", "text", "fullscreen", "plane", "lag", "debt"] as const) {
        expect(getAnomalyText(language, kind)[0]).toBeTruthy();
        expect(getAnomalyText(language, kind)[1]).toBeTruthy();
      }
    }
  });

  it("persists the selected language", () => {
    saveLanguage("en");
    expect(getStoredLanguage()).toBe("en");
    saveLanguage("zh-Hant");
    expect(getStoredLanguage()).toBe("zh-Hant");
  });
});
