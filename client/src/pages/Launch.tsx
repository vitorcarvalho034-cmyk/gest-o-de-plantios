import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flower2, Sun, ChevronRight, CheckCircle2, AlertTriangle, Users, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PlantType = "chrysanthemum" | "sunflower";
type SessionStep = "open" | "add" | "close";

type ActiveSession = {
  id: number;
  plantingDate: Date;
  greenhouses: Array<{ greenhouse: number; seedlingsSent: number }>;
  totalSeedlingsSent: number;
  totalSeedlingsPlanted: number;
};

type PlantingRecord = {
  employeeName: string;
  totalSeedlings: number;
  totalBoxes: number;
  absenceReason?: string | null;
  discountBoxes: number;
};

const GH_NUMS = [1, 2, 3, 4] as const;

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function Launch() {
  const { employee } = useEmployeeAuth();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<PlantType>("chrysanthemum");

  // ── Sessão de Crisântemo ────────────────────────────────────────────────────
  const [step, setStep] = useState<SessionStep>("open");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionPlantings, setSessionPlantings] = useState<PlantingRecord[]>([]);

  // Etapa 1: abrir sessão
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedGhSent, setSelectedGhSent] = useState<Set<number>>(new Set([1]));
  const [ghSentValues, setGhSentValues] = useState<Record<number, string>>({ 1: "", 2: "", 3: "", 4: "" });

  // Etapa 2: adicionar funcionário
  const [selEmployee, setSelEmployee] = useState<string>("");
  const [isAbsent, setIsAbsent] = useState(false);
  const [absenceReason, setAbsenceReason] = useState("");
  const [selectedGhPlanted, setSelectedGhPlanted] = useState<Set<number>>(new Set([1]));
  const [ghPlantedValues, setGhPlantedValues] = useState<Record<number, string>>({ 1: "", 2: "", 3: "", 4: "" });
  const [discountBoxes, setDiscountBoxes] = useState("0");
  const [discountReason, setDiscountReason] = useState("");

  // Etapa 3: fechar sessão


  // ── Girassol ────────────────────────────────────────────────────────────────
  const [sfEmployee, setSfEmployee] = useState<string>("");
  const [sfDate, setSfDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sfTrays, setSfTrays] = useState("");
  const [sfDiscount, setSfDiscount] = useState("0");
  const [sfDiscountReason, setSfDiscountReason] = useState("");
  const [sfAbsent, setSfAbsent] = useState(false);
  const [sfAbsenceReason, setSfAbsenceReason] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────
  const isLauncher = employee?.role === "launcher" || employee?.role === "admin";
  const { data: employees = [] } = trpc.employee.list.useQuery();
  const workerList = employees.filter((e) => e.role === "employee");
  const { data: openSessions = [] } = trpc.session.listOpen.useQuery(
    undefined,
    { enabled: isLauncher && step === "open" }
  );

  // ── Mutations ────────────────────────────────────────────────────────────────
  const openSession = trpc.session.open.useMutation({
    onSuccess: (data) => {
      if (!data.sessionId) { toast.error("Erro ao abrir sessão"); return; }
      const ghList = Array.from(selectedGhSent)
        .map((g) => ({ greenhouse: g, seedlingsSent: Number(ghSentValues[g]) || 0 }))
        .filter((g) => g.seedlingsSent > 0);
      const total = ghList.reduce((s, g) => s + g.seedlingsSent, 0);
      setActiveSession({
        id: data.sessionId,
        plantingDate: new Date(sessionDate),
        greenhouses: ghList,
        totalSeedlingsSent: total,
        totalSeedlingsPlanted: 0,
      });
      setSessionPlantings([]);
      setStep("add");
      toast.success("Sessão aberta! Agora registre os funcionários.");
    },
    onError: (e) => toast.error(e.message),
  });

  const addPlanting = trpc.session.addPlanting.useMutation({
    onSuccess: (data) => {
      if (!activeSession) return;
      const emp = employees.find((e) => String(e.id) === selEmployee);
      setSessionPlantings((prev) => [
        ...prev,
        {
          employeeName: emp?.name ?? "Funcionário",
          totalSeedlings: data.totalSeedlings,
          totalBoxes: data.totalBoxes,
          absenceReason: isAbsent ? absenceReason : null,
          discountBoxes: Number(discountBoxes),
        },
      ]);
      setActiveSession((s) => s ? { ...s, totalSeedlingsPlanted: data.sessionTotal } : s);

      // Reset formulário
      setSelEmployee("");
      setIsAbsent(false);
      setAbsenceReason("");
      setGhPlantedValues({ 1: "", 2: "", 3: "", 4: "" });
      setDiscountBoxes("0");
      setDiscountReason("");

      if (data.balanced) {
        toast.success("✅ Total bateu! Você pode fechar a sessão.");
      } else {
        const diff = data.diff;
        if (diff > 0) {
          toast.info(`Faltam ${fmtNum(diff)} mudas (${Math.floor(diff / 1000)} cx) para bater.`);
        } else {
          toast.warning(`${fmtNum(Math.abs(diff))} mudas a mais que o enviado.`);
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const closeSession = trpc.session.close.useMutation({
    onSuccess: () => {
      toast.success("✅ Sessão fechada com sucesso! Total bateu e tudo foi registrado.");
      setStep("open");
      setActiveSession(null);
      setSessionPlantings([]);
      setGhSentValues({ 1: "", 2: "", 3: "", 4: "" });
      setSelectedGhSent(new Set([1]));
      utils.chrysanthemum.myHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createSunflower = trpc.sunflower.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Girassol registrado!");
      setSfEmployee(""); setSfTrays(""); setSfDiscount("0");
      setSfDiscountReason(""); setSfAbsent(false); setSfAbsenceReason("");
      utils.sunflower.myHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Cálculos ─────────────────────────────────────────────────────────────────
  const totalSentInForm = Array.from(selectedGhSent).reduce((s, g) => s + (Number(ghSentValues[g]) || 0), 0);
  const totalPlantedInForm = Array.from(selectedGhPlanted).reduce((s, g) => s + (Number(ghPlantedValues[g]) || 0), 0);
  const boxesGross = Math.floor(totalPlantedInForm / 1000);
  const netBoxes = Math.max(0, boxesGross - Number(discountBoxes || 0));
  const sessionDiff = activeSession ? activeSession.totalSeedlingsSent - activeSession.totalSeedlingsPlanted : 0;
  const sessionBalanced = sessionDiff === 0 && (activeSession?.totalSeedlingsPlanted ?? 0) > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleOpenSession() {
    const ghList = Array.from(selectedGhSent)
      .map((g) => ({ greenhouse: g as 1 | 2 | 3 | 4, seedlingsSent: Number(ghSentValues[g]) || 0 }))
      .filter((g) => g.seedlingsSent > 0);
    if (ghList.length === 0) { toast.error("Informe as mudas enviadas para pelo menos uma estufa"); return; }
    openSession.mutate({ plantingDate: sessionDate, greenhouses: ghList });
  }

  function handleAddPlanting() {
    if (!activeSession) return;
    if (!selEmployee) { toast.error("Selecione um funcionário"); return; }

    if (isAbsent) {
      if (!absenceReason.trim()) { toast.error("Informe o motivo da ausência"); return; }
      addPlanting.mutate({
        sessionId: activeSession.id,
        employeeId: Number(selEmployee),
        greenhouses: [{ greenhouse: 1, seedlings: 0 }],
        discountBoxes: 0,
        absenceReason,
      });
      return;
    }

    const ghList = Array.from(selectedGhPlanted)
      .map((g) => ({ greenhouse: g as 1 | 2 | 3 | 4, seedlings: Number(ghPlantedValues[g]) || 0 }))
      .filter((g) => g.seedlings > 0);
    if (ghList.length === 0) { toast.error("Informe as mudas plantadas em pelo menos uma estufa"); return; }
    if (Number(discountBoxes) > 0 && !discountReason.trim()) {
      toast.error("Informe o motivo do desconto de caixas"); return;
    }
    addPlanting.mutate({
      sessionId: activeSession.id,
      employeeId: Number(selEmployee),
      greenhouses: ghList,
      discountBoxes: Number(discountBoxes),
      discountReason: discountReason || undefined,
    });
  }

  function handleCloseSession() {
    if (!activeSession) return;
    if (!sessionBalanced) {
      toast.error("Não é possível fechar: o total plantado ainda não bateu com o total enviado.");
      return;
    }
    closeSession.mutate({ sessionId: activeSession.id });
  }

  function handleSunflower() {
    if (!sfEmployee) { toast.error("Selecione um funcionário"); return; }
    if (sfAbsent) {
      if (!sfAbsenceReason.trim()) { toast.error("Informe o motivo da ausência"); return; }
      createSunflower.mutate({ employeeId: Number(sfEmployee), plantingDate: sfDate, trays: 0, absenceReason: sfAbsenceReason });
      return;
    }
    if (!sfTrays || Number(sfTrays) <= 0) { toast.error("Informe a quantidade de bandejas"); return; }
    if (Number(sfDiscount) > 0 && !sfDiscountReason.trim()) { toast.error("Informe o motivo do desconto"); return; }
    createSunflower.mutate({
      employeeId: Number(sfEmployee),
      plantingDate: sfDate,
      trays: Number(sfTrays),
      discountTrays: Number(sfDiscount),
      discountReason: sfDiscountReason || undefined,
    });
  }

  function handleResumeSession(s: typeof openSessions[0]) {
    const ghs = (s.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>);
    setActiveSession({
      id: s.id,
      plantingDate: new Date(s.plantingDate),
      greenhouses: ghs,
      totalSeedlingsSent: s.totalSeedlingsSent,
      totalSeedlingsPlanted: s.totalSeedlingsPlanted,
    });
    setSessionPlantings([]);
    setStep("add");
    toast.success(`Sessão de ${new Date(s.plantingDate).toLocaleDateString("pt-BR")} retomada!`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-serif font-bold text-foreground">Lançar Plantio</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Registre os plantios do dia</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(["chrysanthemum", "sunflower"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all font-medium text-sm",
              t === "chrysanthemum"
                ? tab === t ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "border-border bg-white text-muted-foreground"
                : tab === t ? "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "border-border bg-white text-muted-foreground"
            )}
          >
            {t === "chrysanthemum" ? <Flower2 className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            <span>{t === "chrysanthemum" ? "Crisântemo" : "Girassol"}</span>
            <span className="text-xs font-normal opacity-70">{t === "chrysanthemum" ? "Por caixa" : "Por bandeja"}</span>
          </button>
        ))}
      </div>

      {/* ── CRISÂNTEMO ─────────────────────────────────────────────────────────── */}
      {tab === "chrysanthemum" && (
        <div>
          {/* Indicador de etapas */}
          <div className="flex items-center gap-2 mb-5">
            {(["open", "add", "close"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  step === s ? "bg-primary text-white" :
                    ((s === "add" && (step === "add" || step === "close")) || (s === "close" && step === "close"))
                      ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>{i + 1}</div>
                <span className={cn("text-xs font-medium hidden sm:block", step === s ? "text-primary" : "text-muted-foreground")}>
                  {s === "open" ? "Abrir" : s === "add" ? "Lançar" : "Fechar"}
                </span>
                {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>

          {/* ── ETAPA 1: Abrir sessão ── */}
          {step === "open" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground">Etapa 1 — Abrir Sessão</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Informe a data e quantas mudas foram enviadas para cada estufa. Isso define o total que precisa ser plantado.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Data do Plantio *</Label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="h-14 rounded-xl text-base"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Selecione as estufas com mudas enviadas</Label>
                <div className="grid grid-cols-4 gap-2">
                  {GH_NUMS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGhSent((prev) => {
                        const next = new Set(prev);
                        if (next.has(g)) { next.delete(g); } else { next.add(g); }
                        return next;
                      })}
                      className={cn(
                        "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                        selectedGhSent.has(g) ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground"
                      )}
                    >
                      Est. {g}
                    </button>
                  ))}
                </div>

                {Array.from(selectedGhSent).sort().map((g) => (
                  <div key={g} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Estufa {g} — Mudas enviadas
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Ex: 5000"
                      value={ghSentValues[g]}
                      onChange={(e) => setGhSentValues((prev) => ({ ...prev, [g]: e.target.value }))}
                      className="h-12 rounded-xl text-base"
                    />
                    {Number(ghSentValues[g]) > 0 && (
                      <p className="text-xs text-primary font-medium">
                        = {Math.floor(Number(ghSentValues[g]) / 1000)} caixas
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumo total enviado */}
              {totalSentInForm > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-primary">
                        Total enviado: {fmtNum(totalSentInForm)} mudas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        = {Math.floor(totalSentInForm / 1000)} caixas a serem plantadas
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleOpenSession}
                disabled={openSession.isPending || totalSentInForm === 0}
                className="w-full h-14 rounded-xl text-base font-bold gap-2"
              >
                {openSession.isPending ? "Abrindo..." : <>Abrir Sessão <ChevronRight className="w-5 h-5" /></>}
              </Button>

              {/* Sessões abertas existentes */}
              {openSessions.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium px-2">ou retome uma sessão aberta</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {openSessions.map((s) => {
                    const ghs = (s.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>);
                    const diff = s.totalSeedlingsSent - s.totalSeedlingsPlanted;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleResumeSession(s)}
                        className="w-full text-left bg-primary/5 border-2 border-primary/30 rounded-2xl p-4 hover:bg-primary/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <Flower2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">
                                {new Date(s.plantingDate).toLocaleDateString("pt-BR")}
                              </p>
                              <p className="text-xs text-muted-foreground">Sessão #{s.id}</p>
                            </div>
                          </div>
                          <Badge className={cn(
                            "text-xs font-bold",
                            diff === 0 && s.totalSeedlingsPlanted > 0
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-orange-100 text-orange-700 border-orange-200"
                          )}>
                            {diff === 0 && s.totalSeedlingsPlanted > 0 ? "✅ Pronta p/ fechar" : `Faltam ${fmtNum(Math.max(0, diff))}`}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white rounded-lg py-1.5 border border-border/60">
                            <p className="text-xs text-muted-foreground">Enviado</p>
                            <p className="text-sm font-bold text-blue-700">{fmtNum(s.totalSeedlingsSent)}</p>
                          </div>
                          <div className="bg-white rounded-lg py-1.5 border border-border/60">
                            <p className="text-xs text-muted-foreground">Plantado</p>
                            <p className="text-sm font-bold text-green-700">{fmtNum(s.totalSeedlingsPlanted)}</p>
                          </div>
                          <div className="bg-white rounded-lg py-1.5 border border-border/60">
                            <p className="text-xs text-muted-foreground">Estufas</p>
                            <p className="text-sm font-bold">{ghs.map((g) => `E${g.greenhouse}`).join(", ")}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ETAPA 2: Adicionar funcionários ── */}
          {step === "add" && activeSession && (
            <div className="space-y-4">
              {/* Painel da sessão */}
              <div className="rounded-2xl bg-primary text-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs opacity-75">Sessão aberta</p>
                    <p className="font-bold">{new Date(activeSession.plantingDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge className={cn(
                    "text-xs font-bold",
                    sessionBalanced ? "bg-green-400 text-green-900" : "bg-white/20 text-white"
                  )}>
                    {sessionBalanced ? "✅ Bateu!" : `Faltam ${fmtNum(Math.max(0, sessionDiff))} mudas`}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xs opacity-75">Enviado</p>
                    <p className="font-bold text-lg">{fmtNum(activeSession.totalSeedlingsSent)}</p>
                    <p className="text-xs opacity-60">mudas</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xs opacity-75">Plantado</p>
                    <p className="font-bold text-lg">{fmtNum(activeSession.totalSeedlingsPlanted)}</p>
                    <p className="text-xs opacity-60">mudas</p>
                  </div>
                  <div className={cn("rounded-xl p-2", sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "bg-green-400/30" : "bg-orange-400/20")}>
                    <p className="text-xs opacity-75">Diferença</p>
                    <p className={cn("font-bold text-lg", sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "text-green-300" : "text-orange-300")}>
                      {sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "✓ 0" : fmtNum(Math.abs(sessionDiff))}
                    </p>
                    <p className="text-xs opacity-60">mudas</p>
                  </div>
                </div>

                {/* Estufas */}
                <div className="flex gap-2 flex-wrap mt-3">
                  {activeSession.greenhouses.map((g) => (
                    <span key={g.greenhouse} className="text-xs bg-white/15 rounded-lg px-2 py-1">
                      Est. {g.greenhouse}: {fmtNum(g.seedlingsSent)} mudas
                    </span>
                  ))}
                </div>
              </div>

              {/* Funcionários já lançados */}
              {sessionPlantings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{sessionPlantings.length} funcionário(s) lançado(s)</p>
                  </div>
                  {sessionPlantings.map((p, i) => (
                    <div key={i} className="bg-white rounded-xl border-l-4 border-green-500 border border-border p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{p.employeeName}</p>
                        {p.absenceReason ? (
                          <p className="text-xs text-destructive">Ausente: {p.absenceReason}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {fmtNum(p.totalSeedlings)} mudas
                            {p.discountBoxes > 0 && ` · -${p.discountBoxes} cx desc.`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{p.totalBoxes}</p>
                        <p className="text-xs text-muted-foreground">caixas</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário de novo funcionário */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
                <h3 className="text-base font-semibold text-foreground">+ Adicionar Funcionário</h3>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Funcionário *</Label>
                  <Select value={selEmployee} onValueChange={setSelEmployee}>
                    <SelectTrigger className="h-14 rounded-xl text-base">
                      <SelectValue placeholder="Selecione o funcionário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workerList.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)} className="py-3 text-base">{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <input
                    type="checkbox"
                    id="absent"
                    checked={isAbsent}
                    onChange={(e) => setIsAbsent(e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                  <label htmlFor="absent" className="text-sm font-medium text-foreground cursor-pointer">
                    Funcionário ausente hoje
                  </label>
                </div>

                {isAbsent ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Motivo da ausência *</Label>
                    <Input
                      placeholder="Ex: Atestado médico, falta justificada..."
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Estufas plantadas</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {GH_NUMS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGhPlanted((prev) => {
                              const next = new Set(prev);
                              if (next.has(g)) { next.delete(g); } else { next.add(g); }
                              return next;
                            })}
                            className={cn(
                              "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                              selectedGhPlanted.has(g) ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground"
                            )}
                          >
                            Est. {g}
                          </button>
                        ))}
                      </div>

                      {Array.from(selectedGhPlanted).sort().map((g) => (
                        <div key={g} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            🌱 Estufa {g} — Mudas plantadas
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="Qtd. mudas plantadas"
                            value={ghPlantedValues[g]}
                            onChange={(e) => setGhPlantedValues((prev) => ({ ...prev, [g]: e.target.value }))}
                            className="h-12 rounded-xl text-base"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Resumo automático */}
                    {totalPlantedInForm > 0 && (
                      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                        <p className="text-sm font-bold text-primary">
                          {fmtNum(totalPlantedInForm)} mudas = {boxesGross} caixas brutas
                        </p>
                        {Number(discountBoxes) > 0 && (
                          <p className="text-xs text-destructive mt-0.5">
                            − {discountBoxes} desconto = <strong>{netBoxes} caixas líquidas</strong>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium">Desconto de caixas</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={discountBoxes}
                          onChange={(e) => setDiscountBoxes(e.target.value)}
                          className="h-12 rounded-xl text-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium">
                          Motivo {Number(discountBoxes) > 0 && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          placeholder="Motivo do desconto"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="h-12 rounded-xl text-base"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleAddPlanting}
                  disabled={addPlanting.isPending}
                  className="w-full h-14 rounded-xl text-base font-bold gap-2"
                >
                  {addPlanting.isPending ? "Salvando..." : "+ Registrar Funcionário"}
                </Button>
              </div>

              {/* Botão fechar sessão */}
              <button
                type="button"
                onClick={() => setStep("close")}
                className={cn(
                  "w-full py-4 rounded-xl border-2 text-base font-bold transition-all",
                  sessionBalanced
                    ? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "border-orange-400 bg-white text-orange-600"
                )}
              >
                {sessionBalanced ? "✅ Fechar Sessão" : "⚠️ Fechar Sessão (com divergência)"}
              </button>
            </div>
          )}

          {/* ── ETAPA 3: Fechar sessão ── */}
          {step === "close" && activeSession && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground">Etapa 3 — Fechar Sessão</h2>
                <p className="text-sm text-muted-foreground mt-1">Confirme o fechamento da sessão de plantio.</p>
              </div>

              {/* Resumo final */}
              <div className={cn(
                "rounded-xl p-4 border",
                sessionBalanced ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  {sessionBalanced
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <AlertTriangle className="w-5 h-5 text-orange-600" />}
                  <p className={cn("font-bold text-sm", sessionBalanced ? "text-green-700" : "text-orange-700")}>
                    {sessionBalanced ? "Total bateu! Pronto para fechar." : "Divergência detectada"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Enviado</p>
                    <p className="font-bold text-foreground">{fmtNum(activeSession.totalSeedlingsSent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plantado</p>
                    <p className="font-bold text-foreground">{fmtNum(activeSession.totalSeedlingsPlanted)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Diferença</p>
                    <p className={cn("font-bold", sessionDiff === 0 ? "text-green-600" : "text-destructive")}>
                      {sessionDiff === 0 ? "0 ✓" : fmtNum(Math.abs(sessionDiff))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de funcionários */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">{sessionPlantings.length} funcionário(s) lançado(s)</p>
                {sessionPlantings.map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 text-sm">
                    <span className="text-foreground">{p.employeeName}</span>
                    <span className="font-semibold text-primary">
                      {p.absenceReason ? "Ausente" : `${p.totalBoxes} caixas`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Alerta de divergência */}
              {!sessionBalanced && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
                  <p className="text-sm font-semibold text-orange-700">
                    ⚠️ Os totais ainda não batem. Volte e registre todos os funcionários antes de fechar.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("add")}
                  className="flex-1 h-14 rounded-xl text-base font-semibold"
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleCloseSession}
                  disabled={closeSession.isPending || !sessionBalanced}
                  className="flex-[2] h-14 rounded-xl text-base font-bold"
                >
                  {closeSession.isPending ? "Fechando..." : "✅ Confirmar Fechamento"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GIRASSOL ───────────────────────────────────────────────────────────── */}
      {tab === "sunflower" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Sun className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-700">Girassol — Por bandeja</p>
              <p className="text-xs text-amber-600">Sem vínculo com estufa</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Data do Plantio *</Label>
            <Input type="date" value={sfDate} onChange={(e) => setSfDate(e.target.value)} className="h-14 rounded-xl text-base" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Funcionário *</Label>
            <Select value={sfEmployee} onValueChange={setSfEmployee}>
              <SelectTrigger className="h-14 rounded-xl text-base">
                <SelectValue placeholder="Selecione o funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {workerList.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)} className="py-3 text-base">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
            <input type="checkbox" id="sfAbsent" checked={sfAbsent} onChange={(e) => setSfAbsent(e.target.checked)} className="w-5 h-5 accent-primary" />
            <label htmlFor="sfAbsent" className="text-sm font-medium text-foreground cursor-pointer">Funcionário ausente hoje</label>
          </div>

          {sfAbsent ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Motivo da ausência *</Label>
              <Input placeholder="Ex: Atestado médico..." value={sfAbsenceReason} onChange={(e) => setSfAbsenceReason(e.target.value)} className="h-12 rounded-xl text-base" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Quantidade de Bandejas *</Label>
                <Input type="number" inputMode="numeric" placeholder="Ex: 50" value={sfTrays} onChange={(e) => setSfTrays(e.target.value)} className="h-14 rounded-xl text-base" />
                {Number(sfTrays) > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <Sun className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-700">{sfTrays} bandejas registradas</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Desconto de bandejas</Label>
                  <Input type="number" inputMode="numeric" min="0" value={sfDiscount} onChange={(e) => setSfDiscount(e.target.value)} placeholder="0" className="h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Motivo {Number(sfDiscount) > 0 && <span className="text-destructive">*</span>}
                  </Label>
                  <Input value={sfDiscountReason} onChange={(e) => setSfDiscountReason(e.target.value)} placeholder="Motivo" className="h-12 rounded-xl text-base" />
                </div>
              </div>
            </>
          )}

          <Button
            onClick={handleSunflower}
            disabled={createSunflower.isPending}
            className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-base font-bold gap-2 shadow-lg shadow-amber-500/30"
          >
            {createSunflower.isPending ? "Registrando..." : <>Registrar Girassol <ChevronRight className="w-5 h-5" /></>}
          </Button>
        </div>
      )}
    </div>
  );
}
