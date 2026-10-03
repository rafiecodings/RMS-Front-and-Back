export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-2">
          Forgot Password
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          Contact your administrator to reset your password.
        </p>
      </div>
    </div>
  );
}
