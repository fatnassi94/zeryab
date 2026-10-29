import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { ShowForm } from "../show-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/shows/new">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.shows.new };
}

/** A new public show, saved as a draft unless published right away. */
export default async function NewShowPage({ params }: PageProps<"/[lang]/admin/shows/new">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["activity_manager"]);
  const t = getDictionary(locale).admin.shows;
  const kinds = getDictionary(locale).events.kinds;

  return (
    <>
      <Link href={`/${locale}/admin/shows`} className="text-sm">{t.back}</Link>
      <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.new}</h1>
      <section className="card p-6 sm:p-8">
        <ShowForm
          locale={locale}
          labels={{ ...t.form, kinds, statuses: t.statuses }}
          values={{
            kind: "concert", title: "", summary: "", description: "", date: "", time: "20:00", endTime: "", venue: "", address: "", mapUrl: "",
            bookable: true, capacity: "", price: "", closesDate: "", closesTime: "", status: "draft",
          }}
        />
      </section>
    </>
  );
}
