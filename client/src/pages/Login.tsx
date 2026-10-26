import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BRAND_LOGO_URL } from "@/const";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"launcher" | "password">("launcher");
  const [showPassword, setShowPassword] = useState(false);
  const { refetch } = useEmployeeAuth();

  const loginMutation = trpc.employee.login.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Usuário ou senha incorretos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Preencha o usuário");
      return;
    }
    if (loginMode === "password" && !password.trim()) {
      toast.error("Preencha a senha");
      return;
    }
    loginMutation.mutate({
      username: username.trim(),
      mode: loginMode,
      ...(loginMode === "password" ? { password } : {}),
    });
  };

  return (
    <div
      className="w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        minHeight: '100dvh',
        background:
          "linear-gradient(160deg, oklch(0.18 0.06 148) 0%, oklch(0.30 0.11 150) 60%, oklch(0.24 0.09 145) 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-[-100px] right-[-100px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.20 148 / 0.20), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-80px] left-[-80px] w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.20 148 / 0.15), transparent 70%)" }}
      />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-sm px-5 flex flex-col items-center gap-7">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex items-center justify-center shadow-2xl"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.10)",
              border: "1.5px solid rgba(255,255,255,0.20)",
              backdropFilter: "blur(12px)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img src={BRAND_LOGO_URL} alt="" className="w-14 h-14 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-serif font-bold tracking-wide">
              Gestão de Plantio
            </h1>
            <p className="text-white/50 text-xs mt-1 tracking-widest uppercase font-medium">
              Sistema Agrícola
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-3xl p-6"
          style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <h2 className="text-lg font-serif font-bold text-foreground mb-1">
            {loginMode === "launcher" ? "Acesso do lançador" : "Entrar na conta"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {loginMode === "launcher" ? "Digite seu usuário para entrar." : "Use seu usuário e senha."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                aria-pressed={loginMode === "launcher"}
                onClick={() => setLoginMode("launcher")}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${loginMode === "launcher" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Lançador <span className="block font-normal opacity-80">Só usuário</span>
              </button>
              <button
                type="button"
                aria-pressed={loginMode === "password"}
                onClick={() => setLoginMode("password")}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${loginMode === "password" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Admin/funcionário <span className="block font-normal opacity-80">Com senha</span>
              </button>
            </div>
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Usuário
              </label>
              <input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 rounded-xl border-2 border-border/60 bg-background text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                style={{ fontSize: "16px", height: "52px" }}
              />
            </div>

            {/* Senha obrigatória para administrador e funcionário */}
            {loginMode === "password" && <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 pr-14 rounded-xl border-2 border-border/60 bg-background text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  style={{ fontSize: "16px", height: "52px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-xl transition-all active:scale-[0.97] disabled:opacity-70 mt-2"
              style={{
                height: "52px",
                background: loginMutation.isPending
                  ? "oklch(0.45 0.14 148)"
                  : "linear-gradient(135deg, oklch(0.50 0.18 148) 0%, oklch(0.40 0.15 155) 100%)",
                boxShadow: loginMutation.isPending
                  ? "none"
                  : "0 4px 20px oklch(0.45 0.18 148 / 0.45)",
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-white/25 text-xs text-center pb-8">
          © 2025 · Gestão de Plantio
        </p>
      </div>
    </div>
  );
}
