"use client";

import { useTransition } from "react";
import { LANG_COOKIE_NAME, type Lang } from "@/lib/i18n-shared";

type Props = {
  currentLang: Lang;
};

const labels: Record<Lang, string> = {
  en: "EN",
  zh: "中文"
};

export function LanguageSwitcher({ currentLang }: Props) {
  const [isPending, startTransition] = useTransition();

  function switchLang(nextLang: Lang) {
    if (nextLang === currentLang) {
      return;
    }

    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LANG_COOKIE_NAME}=${nextLang}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;

    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["en", "zh"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          className="btn btn-ghost"
          onClick={() => switchLang(lang)}
          disabled={isPending || currentLang === lang}
          style={{ height: 30, padding: "0 10px", opacity: currentLang === lang ? 1 : 0.72 }}
          aria-label={`Switch language to ${lang}`}
        >
          {labels[lang]}
        </button>
      ))}
    </div>
  );
}


