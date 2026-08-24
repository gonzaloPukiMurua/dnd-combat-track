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
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto shadow-lg">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        </div>

        {status && (
          <p
            className={`text-sm rounded-xl px-4 py-2 text-center border ${
              status.tone === "success"
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-red-600 bg-red-50 border-red-200"
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
            <button
              type="submit"
              className="w-full h-12 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Continuar con Google
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/campaigns" });
            }}
          >
            <button
              type="submit"
              className="w-full h-12 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Continuar con Discord
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          o con email
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form action={loginWithPassword} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full border-2 border-slate-200 rounded-2xl px-4 h-12 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            className="w-full border-2 border-slate-200 rounded-2xl px-4 h-12 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Iniciar sesión
          </button>
        </form>

        <details className="text-center">
          <summary className="text-sm text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
            ¿No te llegó el email de verificación?
          </summary>
          <form action={resendVerificationEmail} className="flex gap-2 mt-3">
            <input
              type="email"
              name="email"
              placeholder="Tu email"
              required
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="px-4 h-10 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Reenviar
            </button>
          </form>
        </details>

        <p className="text-center text-sm text-slate-400">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
