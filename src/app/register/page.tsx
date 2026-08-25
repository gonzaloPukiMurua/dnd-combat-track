import Link from "next/link";
import { signIn } from "@/auth";
import { registerWithPassword } from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  missing:       "Completá todos los campos.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  email_taken:   "Ya existe una cuenta con ese email.",
};

const oauthButtonClass =
  "w-full h-12 rounded-gothic-sm ring-1 ring-gothic-outline-variant bg-gothic-surface font-gothic-body text-sm font-semibold text-gothic-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:bg-gothic-surface-high";

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 h-12 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-gothic-md bg-gothic-surface ring-1 ring-gothic-outline shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="font-gothic-headline text-gothic-display text-gothic-primary tracking-tight">Crear cuenta</h1>
        </div>

        {error && (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            {error}
          </p>
        )}

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

        <form action={registerWithPassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="name" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
              Nombre completo
            </label>
            <input id="name" type="text" name="name" placeholder="Ej. Lirael de Antioch" required className={inputClass} />
          </div>

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
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-gothic-on-surface-variant">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-gothic-primary underline decoration-gothic-outline-variant underline-offset-4 transition-colors hover:text-gothic-brass-bright hover:decoration-gothic-primary"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
