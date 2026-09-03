import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  missing:       "Completá los dos campos.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  mismatch:      "Las contraseñas no coinciden.",
};

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 h-12 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const error = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-gothic-md bg-gothic-surface ring-1 ring-gothic-outline shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="font-gothic-headline text-gothic-display text-gothic-primary tracking-tight">
            Nueva contraseña
          </h1>
        </div>

        {error && (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            {error}
          </p>
        )}

        {!token ? (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            Falta el token del link. Pedí uno nuevo desde{" "}
            <Link href="/forgot-password" className="underline underline-offset-4">
              Olvidé mi contraseña
            </Link>
            .
          </p>
        ) : (
          <form action={resetPassword} className="space-y-3">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-1">
              <label htmlFor="password" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Mín. 8 caracteres"
                required
                minLength={8}
                className={`${inputClass} font-mono tracking-widest`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
                Repetir contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Mín. 8 caracteres"
                required
                minLength={8}
                className={`${inputClass} font-mono tracking-widest`}
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full h-12 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98]"
            >
              Restablecer contraseña
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gothic-on-surface-variant">
          <Link
            href="/login"
            className="text-gothic-primary underline decoration-gothic-outline-variant underline-offset-4 transition-colors hover:text-gothic-brass-bright hover:decoration-gothic-primary"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
