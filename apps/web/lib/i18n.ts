import { cookies } from "next/headers";
import { normalizeLang } from "@/lib/i18n-shared";

export { LANG_COOKIE_NAME, normalizeLang, text, type Lang } from "@/lib/i18n-shared";

export async function getServerLang() {
  const cookieStore = await cookies();
  return normalizeLang(cookieStore.get("vb_lang")?.value);
}
