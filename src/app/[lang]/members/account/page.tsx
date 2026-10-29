import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { formatDate, getDictionary, resolveLocale } from "@/i18n/server";
import { requireViewer } from "@/lib/auth";
import type { MemberPart } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm, ProfileForm } from "./account-forms";

export async function generateMetadata({ params }: PageProps<"/[lang]/members/account">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").account.title };
}

/** "My account": what the member can change (profile, password) and what the club manages (email, part, status). */
export default async function AccountPage({ params }: PageProps<"/[lang]/members/account">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, `/${locale}/members/account`);
  const dict = getDictionary(locale);
  const t = dict.account;

  const supabase = await createClient();
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name, instruments, preferred_locale, part, joined_at").eq("id", viewer.id).maybeSingle(),
    supabase.from("profile_private").select("phone").eq("id", viewer.id).maybeSingle(),
  ]);

  const managed: [label: string, value: string, ltr?: boolean][] = [
    [t.email, viewer.email ?? "—", true],
    [t.part, profile?.part ? dict.parts[profile.part as MemberPart] : t.noPart],
    [t.status, dict.admin.statuses[viewer.status]],
    [t.joined, profile?.joined_at ? formatDate(locale, profile.joined_at, { year: "numeric" }) : "—"],
  ];

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.title}</h1>
        <p className="m-0 text-muted">{t.intro}</p>
      </div>

      <section aria-labelledby="profile-h" className="card flex flex-col gap-5 p-6 sm:p-8">
        <h2 id="profile-h" className="m-0 font-display text-[22px] font-semibold">{t.profile}</h2>
        <ProfileForm
          labels={t.form}
          languages={[{ value: "ar", label: "العربية" }, { value: "fr", label: "Français" }, { value: "en", label: "English" }]}
          values={{
            fullName: profile?.full_name ?? "",
            displayName: profile?.display_name ?? "",
            instruments: (profile?.instruments ?? []).join("، "),
            phone: priv?.phone ?? "",
            locale: profile?.preferred_locale ?? locale,
          }}
        />
      </section>

      <section aria-labelledby="managed-h" className="card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="managed-h" className="m-0 font-display text-[22px] font-semibold">{t.managed}</h2>
          <p className="m-0 text-sm text-muted">{t.managedHint}</p>
        </div>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
          {managed.map(([label, value, ltr]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="m-0 font-medium" dir={ltr ? "ltr" : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pw-h" className="card flex flex-col gap-5 p-6 sm:p-8">
        <h2 id="pw-h" className="m-0 font-display text-[22px] font-semibold">{t.password}</h2>
        <PasswordForm labels={t.passwordForm} />
      </section>
    </>
  );
}
