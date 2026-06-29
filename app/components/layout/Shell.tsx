"use client";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Whisper</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
