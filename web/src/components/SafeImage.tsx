"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { Court } from "@/components/Court";
import type { Sport } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";

// A photo that can't break the page: if it fails to load, the sport's court takes its place,
// in the same design as listings that have no photos.
export function SafeImage({ sport, ...props }: ImageProps & { sport: Sport }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // an image that failed before hydration never fires onError, so check once on mount
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <CourtFallback sport={sport} />;
  return <Image ref={ref} {...props} alt={props.alt} onError={() => setFailed(true)} />;
}

export function CourtFallback({ sport }: { sport: Sport }) {
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ backgroundColor: SURFACES[sport].surround }}>
      <Court sport={sport} className="h-auto w-[72%] max-w-[560px]" />
    </div>
  );
}
