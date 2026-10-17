import { Fragment } from "react";

/**
 * "venue · time" style lines. Each part is isolated with <bdi> so an Arabic
 * venue next to "10:50 AM" (or the reverse) keeps its own direction.
 */
export function MetaLine({ parts }: { parts: (string | null | undefined | false)[] }) {
  const items = parts.filter((p): p is string => !!p);
  return (
    <>
      {items.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          <bdi>{p}</bdi>
        </Fragment>
      ))}
    </>
  );
}
