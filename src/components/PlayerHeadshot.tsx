"use client";

import { useState } from "react";
import Image from "next/image";
import { headshotUrl } from "@/lib/headshot";

const FALLBACK = "/silhouette.svg";

interface Props {
  id: string;
  name: string;
  size?: number;
  className?: string;
}

// ESPN returns a 404 (not a silhouette) for the rare player it has no photo for,
// so we swap to a local placeholder on the image's error event.
export function PlayerHeadshot({ id, name, size = 40, className }: Props) {
  const [src, setSrc] = useState(() => headshotUrl(id));
  const isFallback = src === FALLBACK;

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setSrc(FALLBACK)}
      unoptimized={isFallback}
      className={`shrink-0 rounded-full bg-zinc-800 object-cover ring-1 ring-zinc-700 ${className ?? ""}`}
    />
  );
}
