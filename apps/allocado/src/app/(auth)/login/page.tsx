// src/app/login/page.tsx
import { login, signup } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 bg-avocado-50">
      <form className="card w-full max-w-sm flex flex-col gap-5 p-8">
        <h1 className="text-2xl font-semibold text-center text-avocado-800">Welcome to Allocado</h1>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-avocado-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="input-field"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-avocado-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="input-field"
          />
        </div>

        {/* Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button formAction={login} type="submit" className="btn-primary">
            Log in
          </button>
          <button formAction={signup} type="submit" className="btn-secondary">
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
