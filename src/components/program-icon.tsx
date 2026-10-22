import type { ProgramIcon as IconName } from "@/lib/programs";

/** One line drawing per tableau of a program (24×24, stroked). */
export const PROGRAM_ICON_PATHS: Record<IconName, string> = {
  train: "M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 10h16M8 20l-2 2M16 20l2 2M9 14h.01M15 14h.01",
  boat: "M2.5 13c3 .8 6 1.2 9.5 1.2s6.5-.4 9.5-1.2l-2.6 5.5H5.1zM8 13.6 10 7M16 13.6 14 7",
  nile: "M3 15.5h18l-3 4H6zM12 15.5V3l7 10.5h-7M10.5 5 5 13.5h5.5",
  window: "M5 21V10a7 7 0 0 1 14 0v11zM12 3.2V21M5 13h14",
  dome: "M4 21h16M6 21v-7h12v7M7 14c0-4 2.5-6.5 5-8 2.5 1.5 5 4 5 8M12 6V3",
};

export function ProgramIcon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={PROGRAM_ICON_PATHS[name]} />
    </svg>
  );
}
