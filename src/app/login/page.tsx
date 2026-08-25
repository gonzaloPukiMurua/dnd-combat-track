import Link from "next/link";
import { signIn } from "@/auth";
import { loginWithPassword, resendVerificationEmail } from "@/lib/actions/auth";

const STATUS_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  "registered:1":            { text: "Cuenta creada. Revisá tu email para confirmarla.", tone: "success" },
  "registered:email_failed": { text: "Cuenta creada, pero no pudimos mandar el email de verificación. Probá reenviarlo abajo.", tone: "error" },
  "verify:success":          { text: "Email confirmado. Ya podés iniciar sesión.", tone: "success" },
  "verify:invalid":          { text: "El link de verificación es inválido o venció.", tone: "error" },
  "resent:1":                { text: "Si la cuenta existe y no está confirmada, te mandamos otro email.", tone: "success" },
  "resent:rate_limited":     { text: "Ya te mandamos un email hace poco. Esperá un minuto y probá de nuevo.", tone: "error" },
  "resent:failed":           { text: "No pudimos mandar el email. Probá de nuevo en un rato.", tone: "error" },
  "error:missing":           { text: "Completá email y contraseña.", tone: "error" },
  "error:invalid_credentials": { text: "Email o contraseña incorrectos.", tone: "error" },
};

const oauthButtonClass =
  "w-full h-12 rounded-gothic-sm ring-1 ring-gothic-outline-variant bg-gothic-surface font-gothic-body text-sm font-semibold text-gothic-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:bg-gothic-surface-high";

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 h-12 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const status = ["registered", "verify", "resent", "error"]
    .map((key) => {
      const value = params[key];
      return typeof value === "string" ? STATUS_MESSAGES[`${key}:${value}`] : undefined;
    })
    .find(Boolean);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-gothic-md bg-gothic-surface ring-1 ring-gothic-outline shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="font-gothic-headline text-gothic-display text-gothic-primary tracking-tight">Iniciar sesión</h1>
        </div>

        {status && (
          <p
            className={`rounded-gothic-sm px-4 py-2 text-center text-sm ${
              status.tone === "success"
                ? "bg-gothic-success-bg text-gothic-success-text"
                : "bg-gothic-danger text-gothic-danger-bright"
            }`}
          >
            {status.text}
          </p>
        )}

        {/* OAuth — priorizado arriba del formulario de email/contraseña */}
        <div className="space-y-2">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/campaigns" });
            }}
          >
            <button type="submit" className={oauthButtonClass}>
              Continuar con Google
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/campaigns" });
            }}
          >
            <button type="submit" className={oauthButtonClass}>
              Continuar con Discord
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3 text-xs text-gothic-outline">
          <div className="h-px flex-1 bg-gothic-outline-variant" />
          o con email
          <div className="h-px flex-1 bg-gothic-outline-variant" />
        </div>

        <form action={loginWithPassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
              Correo electrónico
            </label>
            <input id="email" type="email" name="email" placeholder="lirael@orden.com" required className={inputClass} />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              className={`${inputClass} font-mono tracking-widest`}
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full h-12 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98]"
          >
            Iniciar sesión
          </button>
        </form>

        <details className="text-center">
          <summary className="cursor-pointer text-sm text-gothic-on-surface-variant transition-colors hover:text-gothic-on-surface">
            ¿No te llegó el email de verificación?
          </summary>
          <form action={resendVerificationEmail} className="mt-3 flex gap-2">
            <input
              type="email"
              name="email"
              placeholder="Tu email"
              required
              className={`${inputClass} h-10 flex-1`}
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-gothic-sm bg-gothic-surface-high px-4 font-gothic-body text-sm font-semibold text-gothic-on-surface ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface"
            >
              Reenviar
            </button>
          </form>
        </details>

        <p className="text-center text-sm text-gothic-on-surface-variant">
          ¿No tenés cuenta?{" "}
          <Link
            href="/register"
            className="text-gothic-primary underline decoration-gothic-outline-variant underline-offset-4 transition-colors hover:text-gothic-brass-bright hover:decoration-gothic-primary"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
