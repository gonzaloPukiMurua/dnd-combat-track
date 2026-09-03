import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

const STATUS_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  "sent:1": {
    text: "Si el email existe en nuestros registros, te mandamos un link para restablecer la contraseña.",
    tone: "success",
  },
  "error:missing": { text: "Completá tu email.", tone: "error" },
  "error:invalid_token": { text: "El link es inválido o venció. Pedí uno nuevo.", tone: "error" },
};

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 h-12 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const status = ["sent", "error"]
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
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="font-gothic-headline text-gothic-display text-gothic-primary tracking-tight">
            Olvidé mi contraseña
          </h1>
          <p className="text-sm text-gothic-on-surface-variant">
            Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
          </p>
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

        <form action={requestPasswordReset} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
              Correo electrónico
            </label>
            <input id="email" type="email" name="email" placeholder="lirael@orden.com" required className={inputClass} />
          </div>

          <button
            type="submit"
            className="mt-2 w-full h-12 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98]"
          >
            Mandar link
          </button>
        </form>

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
