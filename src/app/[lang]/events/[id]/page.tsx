import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { fill, formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { getEvent, getSeatsLeft } from "@/lib/data/events";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { BookingForm } from "./booking-form";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: PageProps<"/[lang]/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const event = UUID.test(id) ? await getEvent(id) : null;
  return { title: event?.title };
}

export default async function EventPage({ params }: PageProps<"/[lang]/events/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const dict = getDictionary(locale);
  const raw = await getEvent(id);
  if (!raw) notFound();
  const [event] = localize([raw], await getTranslations("events", [raw.id], locale));

  const [seatsLeft, viewer] = await Promise.all([getSeatsLeft(event.id), getViewer()]);
  const bookingOpen = event.is_bookable && event.visibility === "public" && new Date(event.starts_at) > new Date();

  return (
    <PageShell locale={locale} active="events">
      <Link href={`/${locale}/events`} className="text-sm">{dict.events.back}</Link>
      <div className="mt-6 flex flex-wrap items-start gap-6">
        <article className="flex min-w-0 flex-[999_1_min(560px,100%)] flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-[32px] panel-feature p-6 sm:p-12">
            <span className="chip chip-teal self-start">{dict.events.kinds[event.kind]}</span>
            <h1 className="m-0 font-display text-4xl leading-[1.2] font-bold sm:text-6xl" {...contentLang(event, "title", locale)}>{event.title}</h1>
            {event.summary && <p className="m-0 text-lg leading-[1.9] font-light text-soft" {...contentLang(event, "summary", locale)}>{event.summary}</p>}
            <dl className="m-0 grid gap-3 text-[15px] sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">{dict.events.when}</dt>
                <dd className="m-0 font-medium">
                  {formatDate(locale, event.starts_at, { weekday: "long", year: "numeric" })} · {formatTime(locale, event.starts_at)}
                </dd>
              </div>
              {(event.venue || event.address) && (
                <div>
                  <dt className="text-sm text-muted">{dict.events.where}</dt>
                  <dd className="m-0 font-medium">{[event.venue, event.address].filter(Boolean).join(" — ")}</dd>
                </div>
              )}
            </dl>
          </div>
          {event.description && (
            <div className="card p-6 text-[16px] leading-[1.9] whitespace-pre-line text-soft sm:p-8" {...contentLang(event, "description", locale)}>{event.description}</div>
          )}
        </article>

        <aside className="card flex flex-[1_1_min(320px,100%)] flex-col gap-4 p-6 sm:p-7">
          <p className="m-0 font-medium text-gold">
            {event.price_tnd == null ? dict.events.free : fill(dict.events.price, { price: formatNumber(locale, Number(event.price_tnd)) })}
          </p>
          {seatsLeft != null && (
            <p className="m-0 text-sm text-muted">
              {seatsLeft > 0 ? fill(dict.events.seatsLeft, { n: formatNumber(locale, seatsLeft) }) : dict.events.soldOut}
            </p>
          )}
          {bookingOpen ? (
            <BookingForm
              eventId={event.id}
              labels={dict.booking}
              defaultName={viewer?.fullName}
              defaultEmail={viewer?.email ?? undefined}
            />
          ) : (
            <p className="m-0 text-muted">{dict.booking.closed}</p>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
