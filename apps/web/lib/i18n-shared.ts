export const LANG_COOKIE_NAME = "vb_lang";

export type Lang = "en" | "zh";

export function normalizeLang(input: string | null | undefined): Lang {
  if (input === "zh") {
    return "zh";
  }
  return "en";
}

export function text(lang: Lang, english: string, chinese: string): string {
  return lang === "zh" ? chinese : english;
}
