import Link from "next/link";
import AppHeader from "./components/app-header";
import Board from "./components/board";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-orange-50 via-rose-50 to-indigo-50">
      <AppHeader
        action={
          <Link
            href="/add"
            className="rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700"
          >
            + Save link
          </Link>
        }
      />
      <Board />
    </div>
  );
}
