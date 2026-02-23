import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message || "Sign in failed");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Signal bar accent */}
        <div className="signal-bar mb-8" />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-[0.2em] uppercase">
            Newsroom
          </h1>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-mono">
            Broadcast Control
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4 broadcast-card"
        >
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800/50 rounded-md p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="signal-dot" style={{ background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.5)' }}></span>
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-medium"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="admin@newsroom.local"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-md py-2.5 text-sm font-semibold uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating...
              </span>
            ) : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
