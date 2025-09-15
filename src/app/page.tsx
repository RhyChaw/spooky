"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [isFading, setIsFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.4;
  }, []);

  function handleStart() {
    if (!playerName.trim()) return;
    setIsFading(true);
    setTimeout(() => {
      router.push(`/game?name=${encodeURIComponent(playerName)}`);
    }, 1200);
  }

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,69,0,0.12),rgba(0,0,0,0.93))]" />
        <div className="absolute inset-0 mix-blend-screen opacity-20" style={{ backgroundImage: "url('/noise.png')" }} />
      </div>

      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          <h1 className="font-[var(--font-geist-mono)] text-5xl sm:text-6xl tracking-widest text-orange-500 drop-shadow-[0_0_25px_rgba(255,98,0,0.35)]">
            SPOOK
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-zinc-400">Horror Hacks Edition</p>

          <p className="mt-8 text-zinc-300">
            Enter your name, brave one. Then press New Game… if you dare.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="flex-1 rounded-md bg-zinc-900/60 border border-zinc-700/60 px-4 py-3 outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/40 text-zinc-100 placeholder-zinc-500"
              maxLength={24}
            />
            <button
              onClick={handleStart}
              className="whitespace-nowrap rounded-md bg-orange-600/90 hover:bg-orange-600 px-5 py-3 font-medium text-white shadow-[0_0_20px_rgba(255,100,0,0.35)] transition"
              disabled={!playerName.trim()}
            >
              New Game
            </button>
          </div>

          <div className="mt-10 text-xs text-zinc-500">
            Best played with sound on. Headphones recommended.
          </div>
        </div>
      </div>

      <div className={`pointer-events-none fixed inset-0 bg-black transition-opacity duration-1000 ${isFading ? "opacity-100" : "opacity-0"}`} />

      <audio ref={audioRef} src="/ambient.mp3" loop autoPlay />
    </div>
  );
}
