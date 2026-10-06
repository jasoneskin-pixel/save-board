import Link from "next/link";
import LogoutButton from "../logout-button";
import ShareButton from "./share-button";

/** Shared top bar used by the board and the add-link page. */
export default function AppHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between bg-gradient-to-r from-indigo-950 via-purple-900 to-orange-600 px-6 py-4 shadow-sm">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-orange-50"
      >
        Social Ideas
      </Link>
      <div className="flex items-center gap-2">
        {action}
        <ShareButton />
        <LogoutButton />
      </div>
    </header>
  );
}
