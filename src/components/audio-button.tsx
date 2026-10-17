"use client";

import { useEffect, useRef, useState } from "react";

/** Round play/pause button for a single track. Only one track plays at a time. */
export function AudioButton({ src, label, size = 44, solid = false, loop = false }: {
  src: string | undefined;
  label: string;
  size?: number;
  solid?: boolean;
  loop?: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const stopOthers = (e: Event) => {
      if (e.target !== ref.current) ref.current?.pause();
    };
    document.addEventListener("play", stopOthers, true);
    return () => document.removeEventListener("play", stopOthers, true);
  }, []);

  const toggle = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const fill = solid ? "#1A1206" : "#E4BE74";
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={label}
        aria-pressed={playing}
        style={{ width: size, height: size }}
        className={`flex flex-none items-center justify-center rounded-full border-0 disabled:opacity-40 ${
          solid ? "bg-gold" : "bg-gold/14"
        }`}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill={fill}>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill={fill} className="ltr:-scale-x-100">
            <path d="M18 5v14L6 12z" />
          </svg>
        )}
      </button>
      {src && (
        <audio
          ref={ref}
          src={src}
          preload="none"
          loop={loop}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </>
  );
}
