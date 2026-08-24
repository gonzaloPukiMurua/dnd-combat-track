import Link from "next/link";
import { signIn } from "@/auth";
import { registerWithPassword } from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  missing:       "Completá todos los campos.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  email_taken:   "Ya existe una cuenta con ese email.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto shadow-lg">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
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

        <form action={registerWithPassword} className="space-y-3">
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            required
            className="w-full border-2 border-slate-200 rounded-2xl px-4 h-12 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
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
            placeholder="Contraseña (mín. 8 caracteres)"
            required
            minLength={8}
            className="w-full border-2 border-slate-200 rounded-2xl px-4 h-12 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
