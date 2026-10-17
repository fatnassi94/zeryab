import { Skeleton } from "./ui/skeleton";

/**
 * Loading placeholder shaped like the page that is coming, so nothing jumps
 * when it arrives. "public" mirrors PageShell pages; "panel" sits inside the
 * members/admin layouts (their sidebar stays visible).
 */
export function RouteSkeleton({ variant = "public", label }: { variant?: "public" | "panel"; label: string }) {
  const body = (
    <>
      <Skeleton className="h-12 w-[min(420px,80%)]" />
      <Skeleton className="h-5 w-[min(620px,95%)]" />
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-[24px]" />
        ))}
      </div>
    </>
  );

  return (
    <div role="status" aria-live="polite" className="contents">
      <span className="sr-only">{label}</span>
      {variant === "public" ? (
        <>
          <div className="mx-auto w-full max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
            <Skeleton className="h-[60px] rounded-full" />
          </div>
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pt-10 pb-24 sm:px-6">{body}</div>
        </>
      ) : (
        <div className="flex flex-col gap-4">{body}</div>
      )}
    </div>
  );
}
