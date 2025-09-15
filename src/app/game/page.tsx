"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function GamePlaceholder() {
  const params = useSearchParams();
  const name = params.get("name") || "Player";

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h2 className="text-3xl font-semibold text-orange-500">Entering the Room…</h2>
        <p className="mt-4 text-zinc-300">
          Welcome, {name}. The room and player will appear here.
        </p>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-left">
          <p className="text-zinc-400">
            Placeholder for 3D scene:
          </p>
          <ul className="list-disc pl-6 mt-2 text-zinc-400">
            <li>room.glb — environment model</li>
            <li>player.glb — character model</li>
          </ul>
        </div>
        <Link href="/" className="mt-8 inline-block text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4">
          Back to menu
        </Link>
      </div>
    </div>
  );
}


