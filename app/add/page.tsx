import Link from "next/link";
import AppHeader from "../components/app-header";
import AddForm from "./add-form";

export default function AddPage() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-orange-50 via-rose-50 to-indigo-50">
      <AppHeader
        action={
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-orange-50 hover:bg-white/10"
          >
            ← Board
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <AddForm />
      </main>
    </div>
  );
}
