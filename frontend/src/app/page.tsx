import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl md:text-8xl">🎬</span>
        <h1 className="text-5xl font-bold tracking-tight text-stone-900 md:text-7xl">
          FilmAI
        </h1>
        <p className="max-w-md text-lg text-stone-500">
          Transform screenplays into cinematic video with an AI-powered
          production pipeline.
        </p>
        <Link
          href="/script"
          className="mt-4 rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
