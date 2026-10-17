import { lang } from "next/root-params";
import { RouteSkeleton } from "@/components/route-skeleton";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";

export default async function Loading() {
  const current = await lang();
  const dict = getDictionary(hasLocale(current) ? current : "ar");
  return <RouteSkeleton variant="panel" label={dict.common.loading} />;
}
