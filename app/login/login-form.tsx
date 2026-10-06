"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const from = params.get("from") || "/";
        // Send the user where they were headed; refresh so the proxy re-runs
        // with the freshly set cookie.
        router.replace(from);
        router.refresh();
        return;
      }
      setError("Incorrect PIN. Try again.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label htmlFor="pin" className="text-sm font-medium text-zinc-700">
        Enter PIN
      </label>
      <input
        id="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="w-full rounded-lg border border-orange-200 px-4 py-3 text-lg tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        placeholder="••••"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || pin.length === 0}
        className="mt-2 w-full rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-3 font-medium text-white transition-colors hover:from-orange-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
