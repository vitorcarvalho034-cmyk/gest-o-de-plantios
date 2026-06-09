import { trpc } from "@/lib/trpc";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { Link } from "wouter";
import { Package, Layers, PlusCircle, History, ShieldCheck, Flower2, Sun, TrendingUp, Leaf } from "lucide-react";

export default function Dashboard() {
  const { employee } = useEmployeeAuth();

  const { data: chrysHistory } = trpc.chrysanthemum.myHistory.useQuery(
    {},
    { enabled: !!employee }
  );
  const { data: sunHistory } = trpc.sunflower.myHistory.useQuery(
    {},
    { enabled: !!employee }
  );

  const totalBoxes = chrysHistory?.reduce((s, p) => s + p.totalBoxes - p.discountBoxes, 0) ?? 0;
  const totalTrays = sunHistory?.reduce((s, p) => s + p.trays - p.discountTrays, 0) ?? 0;
  const recentChrys = chrysHistory?.slice(0, 3) ?? [];
  const recentSun = sunHistory?.slice(0, 3) ?? [];

  const isLauncher = employee?.role === "launcher" || employee?.role === "admin";
  const isAdmin = employee?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-4">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-[oklch(0.16_0.05_148)] to-[oklch(0.30_0.09_148)] rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Bem-vindo(a),</p>
            <h1 className="text-2xl font-serif font-bold mt-0.5">{employee?.name}</h1>
            <div className="flex items-center gap-1.5 mt-2">
              <Leaf className="w-3.5 h-3.5 text-white/60" />
              <span className="text-white/70 text-xs">
                {isAdmin ? "Administrador" : isLauncher ? "Lançador" : "Funcionário"}
              </span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(134,239,172,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{totalBoxes}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Caixas — Crisântemo</p>
        </div>
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center">
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600">{totalTrays}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Bandejas — Girassol</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</p>
        <div className="space-y-3">
          {isLauncher && (
            <Link href="/launch">
              <a className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                  <PlusCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Lançar Plantio</p>
                  <p className="text-xs text-muted-foreground">Registrar crisântemo ou girassol</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </a>
            </Link>
          )}
          <Link href="/my-history">
            <a className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                <History className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Meu Histórico</p>
                <p className="text-xs text-muted-foreground">Ver todos os meus registros</p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </a>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <a className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Painel Admin</p>
                  <p className="text-xs text-muted-foreground">Visão consolidada de todos</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </a>
            </Link>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {(recentChrys.length > 0 || recentSun.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Atividade Recente</p>
          <div className="space-y-2">
            {recentChrys.map((p) => (
              <div key={`c-${p.id}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-primary/15">
                <Flower2 className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Crisântemo</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.plantingDate).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="text-sm font-bold text-primary flex-shrink-0">{p.totalBoxes - p.discountBoxes} cx</span>
              </div>
            ))}
            {recentSun.map((p) => (
              <div key={`s-${p.id}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
                <Sun className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Girassol</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.plantingDate).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="text-sm font-bold text-amber-600 flex-shrink-0">{p.trays - p.discountTrays} band.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
