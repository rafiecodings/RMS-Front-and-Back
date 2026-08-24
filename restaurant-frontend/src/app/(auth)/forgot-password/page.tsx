"use client";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-2">
          Forgot Password
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your email to reset your password
        </p>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
