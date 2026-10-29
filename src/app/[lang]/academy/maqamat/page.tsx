import { permanentRedirect } from "next/navigation";
import { resolveLocale } from "@/i18n/server";

/** Every maqam is listed on the academy page; this address leads there. */
export default async function MaqamatPage({ params }: PageProps<"/[lang]/academy/maqamat">) {
  const locale = await resolveLocale(params);
  permanentRedirect(`/${locale}/academy#maq-h`);
}
