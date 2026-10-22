import Link from "next/link";

/** A page that exists before its content: one line on what will be here, and a way back. */
export function ComingSoon({ label, title, text, back }: { label: string; title: string; text: string; back: { href: string; label: string } }) {
  return (
    <section className="flex max-w-[640px] flex-col items-start gap-4 py-10">
      <span className="chip chip-teal">{label}</span>
      <h1 className="m-0 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
      <p className="m-0 text-lg leading-[1.9] text-soft">{text}</p>
      <Link href={back.href} className="btn-ghost">{back.label}</Link>
    </section>
  );
}
