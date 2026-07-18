import { useEffect, useState } from "react";

/** True when the viewport is narrow (phones / small tablets in portrait). The
 *  board is built with inline styles, so responsive layout keys off this rather
 *  than CSS media queries. Default breakpoint ~820px covers phones and iPad
 *  portrait; iPad landscape (>1024) stays on the desktop layout. */
export function useIsNarrow(threshold = 820): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= threshold,
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= threshold);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [threshold]);
  return narrow;
}
