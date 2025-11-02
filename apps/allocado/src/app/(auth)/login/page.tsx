import { login, signup } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <form className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-gray-800 text-center">Welcome to Allocado</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            formAction={login}
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            Log in
          </button>
          <button
            formAction={signup}
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
