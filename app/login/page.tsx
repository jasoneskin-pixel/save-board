import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-orange-600 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-orange-100">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Social Ideas
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter the shared PIN to continue.
          </p>
        </div>
        {/* useSearchParams in LoginForm requires a Suspense boundary. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
