import { useEffect, useState } from "react";
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
import { formatDateOnly, todayDateInputValue } from "@/lib/date-only";
import { PlantingRecordActions, type ChrysanthemumManageRecord } from "@/components/PlantingRecordActions";
import { SessionManagementActions, type SessionToManage } from "@/components/SessionManagementActions";

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

type PlantingRecord = ChrysanthemumManageRecord & {
  employeeName: string;
};

const GH_NUMS = [1, 2, 3, 4] as const;
const SEEDLINGS_PER_BOX = 1000;
const BOXES_PER_HALF_VAO = 8;

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtBoxes(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function boxesToSeedlings(boxes: number) {
  return Math.round(boxes * SEEDLINGS_PER_BOX);
}

function parseLocalizedNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function vaosToBoxes(vaos: number) {
  return Math.round(vaos * 2) * BOXES_PER_HALF_VAO;
}

function getVaoPreview(value: string) {
  const vaos = parseLocalizedNumber(value);
  if (vaos === null || vaos <= 0 || !Number.isInteger(vaos * 2)) return null;
  return { vaos, boxes: vaosToBoxes(vaos) };
}

function formatVaos(vaos: number) {
  return vaos.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
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
  const [sessionDate, setSessionDate] = useState(todayDateInputValue);
  const [selectedGhSent, setSelectedGhSent] = useState<Set<number>>(new Set([1]));
  const [ghVaoValues, setGhVaoValues] = useState<Record<number, string>>({ 1: "", 2: "", 3: "", 4: "" });

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
  const [sfDate, setSfDate] = useState(todayDateInputValue);
  const [sfTrays, setSfTrays] = useState("");
  const [sfDiscount, setSfDiscount] = useState("0");
  const [sfDiscountReason, setSfDiscountReason] = useState("");
  const [sfAbsent, setSfAbsent] = useState(false);
  const [sfAbsenceReason, setSfAbsenceReason] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────
  const isAdmin = employee?.role === "admin";
  const isLauncher = employee?.role === "launcher" || employee?.role === "admin";
  const { data: employees = [] } = trpc.employee.list.useQuery();
  const workerList = employees.filter((e) => e.role === "employee");
  const {
    data: openSessions = [],
    isLoading: loadingOpenSessions,
    isError: openSessionsError,
    refetch: refreshOpenSessions,
  } = trpc.session.listOpen.useQuery(
    undefined,
    { enabled: isLauncher && step === "open" }
  );
  const {
    data: activeSessionDetails,
    isLoading: loadingSessionPlantings,
  } = trpc.session.getWithPlantings.useQuery(
    { sessionId: activeSession?.id ?? 0 },
    { enabled: isLauncher && step === "add" && activeSession !== null }
  );

  useEffect(() => {
    if (!activeSessionDetails || activeSessionDetails.session.id !== activeSession?.id) return;
    setSessionPlantings(activeSessionDetails.plantings.map((planting) => ({
      ...planting,
      greenhouses: planting.greenhouses as ChrysanthemumManageRecord["greenhouses"],
      discountReason: planting.discountReason ?? null,
      absenceReason: planting.absenceReason ?? null,
      launchedById: planting.launchedById ?? null,
      confirmStatus: planting.confirmStatus ?? null,
      confirmRejectionReason: planting.confirmRejectionReason ?? null,
    })));
    setActiveSession((current) => current && current.id === activeSessionDetails.session.id
      ? {
          ...current,
          totalSeedlingsSent: activeSessionDetails.session.totalSeedlingsSent,
          totalSeedlingsPlanted: activeSessionDetails.session.totalSeedlingsPlanted,
        }
      : current
    );
  }, [activeSessionDetails, activeSession?.id]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const openSession = trpc.session.open.useMutation({
    onSuccess: (data) => {
      if (!data.sessionId) { toast.error("Erro ao abrir sessão"); return; }
      const ghList = Array.from(selectedGhSent)
        .map((g) => ({
          greenhouse: g,
          seedlingsSent: boxesToSeedlings(getVaoPreview(ghVaoValues[g])?.boxes ?? 0),
        }))
        .filter((g) => g.seedlingsSent > 0);
      const total = ghList.reduce((s, g) => s + g.seedlingsSent, 0);
      setActiveSession({
        id: data.sessionId,
        plantingDate: new Date(sessionDate),
        greenhouses: ghList,
        totalSeedlingsSent: total,
        totalSeedlingsPlanted: 0,
      });
      setSelectedGhPlanted(new Set(ghList.map((item) => item.greenhouse)));
      setSessionPlantings([]);
      setStep("add");
      toast.success("Sessão aberta! Agora registre os funcionários.");
      utils.session.manageList.invalidate();
      utils.reconciliation.bySession.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addPlanting = trpc.session.addPlanting.useMutation({
    onSuccess: (data) => {
      if (!activeSession) return;
      setActiveSession((s) => s ? { ...s, totalSeedlingsPlanted: data.sessionTotal } : s);
      utils.session.manageList.invalidate();
      utils.session.getWithPlantings.invalidate({ sessionId: activeSession.id });
      utils.reconciliation.bySession.invalidate();

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
          toast.info(`Faltam ${fmtBoxes(diff / SEEDLINGS_PER_BOX)} caixas para bater.`);
        } else {
          toast.warning(`${fmtBoxes(Math.abs(diff) / SEEDLINGS_PER_BOX)} caixas a mais que o enviado.`);
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
      setGhVaoValues({ 1: "", 2: "", 3: "", 4: "" });
      setSelectedGhSent(new Set([1]));
      utils.chrysanthemum.myHistory.invalidate();
      utils.session.listOpen.invalidate();
      utils.session.manageList.invalidate();
      utils.reconciliation.bySession.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createSunflower = trpc.sunflower.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Girassol registrado!");
      setSfEmployee(""); setSfTrays(""); setSfDiscount("0");
      setSfDiscountReason(""); setSfAbsent(false); setSfAbsenceReason("");
      utils.sunflower.myHistory.invalidate();
      utils.sunflower.manageAll.invalidate();
      utils.sunflower.adminAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Cálculos ─────────────────────────────────────────────────────────────────
  const hasInvalidVaoCount = Array.from(selectedGhSent).some((g) => {
    const value = ghVaoValues[g].trim();
    return value !== "" && getVaoPreview(value) === null;
  });
  const totalBoxesSentInForm = Array.from(selectedGhSent).reduce(
    (s, g) => s + (getVaoPreview(ghVaoValues[g])?.boxes ?? 0),
    0
  );
  const totalBoxesPlantedInForm = Array.from(selectedGhPlanted).reduce((s, g) => s + (Number(ghPlantedValues[g]) || 0), 0);
  const boxesGross = totalBoxesPlantedInForm;
  const netBoxes = Math.max(0, boxesGross - Number(discountBoxes || 0));
  const sessionDiff = activeSession ? activeSession.totalSeedlingsSent - activeSession.totalSeedlingsPlanted : 0;
  const sessionBalanced = sessionDiff === 0 && (activeSession?.totalSeedlingsPlanted ?? 0) > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleOpenSession() {
    if (!isAdmin) {
      toast.error("Apenas administradores podem abrir sessões.");
      return;
    }
    if (hasInvalidVaoCount) {
      toast.error("Informe os vãos em unidades inteiras ou de meio em meio (ex.: 1,5).");
      return;
    }
    const ghList = Array.from(selectedGhSent)
      .map((g) => ({
        greenhouse: g as 1 | 2 | 3 | 4,
        seedlingsSent: boxesToSeedlings(getVaoPreview(ghVaoValues[g])?.boxes ?? 0),
      }))
      .filter((g) => g.seedlingsSent > 0);
    if (ghList.length === 0) { toast.error("Informe os vãos enviados para pelo menos uma estufa"); return; }
    openSession.mutate({ plantingDate: sessionDate, greenhouses: ghList });
  }

  function handleAddPlanting() {
    if (!activeSession) return;
    if (loadingSessionPlantings) { toast.info("Carregando os lançamentos desta sessão. Tente novamente em instantes."); return; }
    if (!selEmployee) { toast.error("Selecione um funcionário"); return; }

    if (isAbsent) {
      if (!absenceReason.trim()) { toast.error("Informe o motivo da ausência"); return; }
      addPlanting.mutate({
        sessionId: activeSession.id,
        employeeId: Number(selEmployee),
        greenhouses: [{ greenhouse: (activeSession.greenhouses[0]?.greenhouse ?? 1) as 1 | 2 | 3 | 4, seedlings: 0 }],
        discountBoxes: 0,
        absenceReason,
      });
      return;
    }

    const ghList = Array.from(selectedGhPlanted)
      .map((g) => ({ greenhouse: g as 1 | 2 | 3 | 4, seedlings: boxesToSeedlings(Number(ghPlantedValues[g]) || 0) }))
      .filter((g) => g.seedlings > 0);
    if (ghList.length === 0) { toast.error("Informe as caixas plantadas em pelo menos uma estufa"); return; }
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
    if (Number(sfDiscount) > Number(sfTrays)) { toast.error("O desconto não pode superar as bandejas plantadas"); return; }
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
    setSelectedGhPlanted(new Set(ghs.map((item) => item.greenhouse as 1 | 2 | 3 | 4)));
    setSessionPlantings([]);
    setStep("add");
    toast.success(`Sessão de ${formatDateOnly(s.plantingDate)} retomada!`);
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
                  {s === "open" ? (isAdmin ? "Abrir" : "Selecionar sessão") : s === "add" ? "Lançar" : "Fechar"}
                </span>
                {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>

          {/* ── ETAPA 1: Abrir sessão ── */}
          {step === "open" && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
              {!isAdmin && (
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">Selecione uma sessão aberta</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    A Etapa 1 — Abrir Sessão é exclusiva do administrador. Escolha abaixo uma sessão já aberta para lançar as caixas plantadas por funcionário.
                  </p>
                  <Button variant="outline" onClick={() => refreshOpenSessions()} className="mt-3 rounded-xl">
                    Atualizar sessões
                  </Button>
                </div>
              )}
              {isAdmin && (
                <>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-foreground">Etapa 1 — Abrir Sessão</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Informe quantos vãos vão para cada estufa. Cada meio vão corresponde a 8 caixas (16 caixas por vão); o sistema calcula o total automaticamente.
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
                    <Label className="text-sm font-semibold">Selecione as estufas que receberão o plantio</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
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

                    {Array.from(selectedGhSent).sort().map((g) => {
                      const value = ghVaoValues[g];
                      const preview = getVaoPreview(value);
                      return (
                        <div key={g} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            Estufa {g} — Vãos enviados
                          </Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex.: 3 ou 1,5"
                            value={value}
                            onChange={(e) => setGhVaoValues((prev) => ({ ...prev, [g]: e.target.value }))}
                            className="h-12 rounded-xl text-base"
                          />
                          {preview ? (
                            <p className="text-xs text-primary font-medium">
                              {formatVaos(preview.vaos)} {preview.vaos === 1 ? "vão" : "vãos"} = {fmtNum(preview.boxes)} caixas ({fmtNum(boxesToSeedlings(preview.boxes))} mudas)
                            </p>
                          ) : value.trim() ? (
                            <p className="text-xs text-destructive font-medium">
                              Use vãos inteiros ou de meio em meio (ex.: 1,5).
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumo total enviado */}
                  {totalBoxesSentInForm > 0 && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-bold text-primary">
                            Total calculado: {fmtNum(totalBoxesSentInForm)} caixas
                          </p>
                          <p className="text-xs text-muted-foreground">
                            = {fmtNum(boxesToSeedlings(totalBoxesSentInForm))} mudas a serem plantadas
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleOpenSession}
                    disabled={openSession.isPending || totalBoxesSentInForm === 0 || hasInvalidVaoCount}
                    className="w-full h-14 rounded-xl text-base font-bold gap-2"
                  >
                    {openSession.isPending ? "Abrindo..." : <>Abrir Sessão <ChevronRight className="w-5 h-5" /></>}
                  </Button>
                </>
              )}

              {/* Sessões abertas existentes */}
              {loadingOpenSessions && (
                <p className="text-sm text-muted-foreground">Carregando sessões abertas...</p>
              )}
              {openSessionsError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">Não foi possível carregar as sessões abertas.</p>
                  <Button variant="outline" onClick={() => refreshOpenSessions()} className="mt-2 rounded-xl">
                    Tentar novamente
                  </Button>
                </div>
              )}
              {!isAdmin && !loadingOpenSessions && !openSessionsError && openSessions.length === 0 && (
                <div className="rounded-xl bg-muted/30 border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">Nenhuma sessão aberta no momento.</p>
                  <p className="text-sm text-muted-foreground mt-1">Aguarde o administrador abrir uma sessão para começar os lançamentos.</p>
                </div>
              )}
              {openSessions.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium px-2">{isAdmin ? "ou retome uma sessão aberta" : "Sessões abertas disponíveis"}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {openSessions.map((s) => {
                    const ghs = (s.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>);
                    const diff = s.totalSeedlingsSent - s.totalSeedlingsPlanted;
                    const sessionForManagement: SessionToManage = {
                      id: s.id,
                      plantingDate: s.plantingDate,
                      status: s.status,
                      totalSeedlingsSent: s.totalSeedlingsSent,
                      totalSeedlingsPlanted: s.totalSeedlingsPlanted,
                      greenhouses: ghs,
                      plantings: [],
                    };
                    return (
                      <div key={s.id} className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/5">
                        <button
                          type="button"
                          onClick={() => handleResumeSession(s)}
                          className="w-full p-4 text-left transition-colors hover:bg-primary/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Flower2 className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">
                                  {formatDateOnly(s.plantingDate)}
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
                              {diff === 0 && s.totalSeedlingsPlanted > 0 ? "✅ Pronta p/ fechar" : `Faltam ${fmtBoxes(Math.max(0, diff) / SEEDLINGS_PER_BOX)} cx`}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg py-1.5 border border-border/60">
                              <p className="text-xs text-muted-foreground">Enviado</p>
                              <p className="text-sm font-bold text-blue-700">{fmtBoxes(s.totalSeedlingsSent / SEEDLINGS_PER_BOX)} cx</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5 border border-border/60">
                              <p className="text-xs text-muted-foreground">Plantado</p>
                              <p className="text-sm font-bold text-green-700">{fmtBoxes(s.totalSeedlingsPlanted / SEEDLINGS_PER_BOX)} cx</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5 border border-border/60">
                              <p className="text-xs text-muted-foreground">Estufas</p>
                              <p className="text-sm font-bold">{ghs.map((g) => `E${g.greenhouse}`).join(", ")}</p>
                            </div>
                          </div>
                        </button>
                        <SessionManagementActions session={sessionForManagement} />
                      </div>
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
                    <p className="font-bold">{formatDateOnly(activeSession.plantingDate)}</p>
                  </div>
                  <Badge className={cn(
                    "text-xs font-bold",
                    sessionBalanced ? "bg-green-400 text-green-900" : "bg-white/20 text-white"
                  )}>
                    {sessionBalanced ? "✅ Bateu!" : `Faltam ${fmtBoxes(Math.max(0, sessionDiff) / SEEDLINGS_PER_BOX)} caixas`}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xs opacity-75">Enviado</p>
                    <p className="font-bold text-lg">{fmtBoxes(activeSession.totalSeedlingsSent / SEEDLINGS_PER_BOX)}</p>
                    <p className="text-xs opacity-60">caixas</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xs opacity-75">Plantado</p>
                    <p className="font-bold text-lg">{fmtBoxes(activeSession.totalSeedlingsPlanted / SEEDLINGS_PER_BOX)}</p>
                    <p className="text-xs opacity-60">caixas</p>
                  </div>
                  <div className={cn("rounded-xl p-2", sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "bg-green-400/30" : "bg-orange-400/20")}>
                    <p className="text-xs opacity-75">Diferença</p>
                    <p className={cn("font-bold text-lg", sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "text-green-300" : "text-orange-300")}>
                      {sessionDiff === 0 && activeSession.totalSeedlingsPlanted > 0 ? "✓ 0" : fmtBoxes(Math.abs(sessionDiff) / SEEDLINGS_PER_BOX)}
                    </p>
                    <p className="text-xs opacity-60">caixas</p>
                  </div>
                </div>

                {/* Estufas */}
                <div className="flex gap-2 flex-wrap mt-3">
                  {activeSession.greenhouses.map((g) => (
                    <span key={g.greenhouse} className="text-xs bg-white/15 rounded-lg px-2 py-1">
                      Est. {g.greenhouse}: {fmtBoxes(g.seedlingsSent / SEEDLINGS_PER_BOX)} caixas
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
                    <div key={p.id} className="space-y-1.5">
                      <div className="bg-white rounded-xl border-l-4 border-green-500 border border-border p-3 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{p.employeeName}</p>
                          {p.absenceReason ? (
                            <p className="text-xs text-destructive">Ausente: {p.absenceReason}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {fmtNum(p.totalBoxes)} caixas
                              {p.discountBoxes > 0 && ` · -${p.discountBoxes} cx desc.`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{p.totalBoxes}</p>
                          <p className="text-xs text-muted-foreground">caixas</p>
                        </div>
                      </div>
                      <PlantingRecordActions kind="chrysanthemum" record={p} employees={workerList} />
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
                      {workerList.filter((e) => !sessionPlantings.some((planting) => planting.employeeId === e.id)).map((e) => (
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
                      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
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
                            📦 Estufa {g} — Caixas plantadas
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            placeholder="Qtd. de caixas plantadas"
                            value={ghPlantedValues[g]}
                            onChange={(e) => setGhPlantedValues((prev) => ({ ...prev, [g]: e.target.value }))}
                            className="h-12 rounded-xl text-base"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Resumo automático */}
                    {totalBoxesPlantedInForm > 0 && (
                      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                        <p className="text-sm font-bold text-primary">
                          {fmtNum(totalBoxesPlantedInForm)} caixas plantadas
                        </p>
                        {Number(discountBoxes) > 0 && (
                          <p className="text-xs text-destructive mt-0.5">
                            − {discountBoxes} desconto = <strong>{netBoxes} caixas líquidas</strong>
                          </p>
                        )}
                      </div>
                    )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  disabled={addPlanting.isPending || loadingSessionPlantings}
                  className="w-full h-14 rounded-xl text-base font-bold gap-2"
                >
                  {loadingSessionPlantings ? "Carregando sessão..." : addPlanting.isPending ? "Salvando..." : "+ Registrar Funcionário"}
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
                    <p className="text-xs text-muted-foreground">Enviado (caixas)</p>
                    <p className="font-bold text-foreground">{fmtBoxes(activeSession.totalSeedlingsSent / SEEDLINGS_PER_BOX)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plantado (caixas)</p>
                    <p className="font-bold text-foreground">{fmtBoxes(activeSession.totalSeedlingsPlanted / SEEDLINGS_PER_BOX)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Diferença (caixas)</p>
                    <p className={cn("font-bold", sessionDiff === 0 ? "text-green-600" : "text-destructive")}>
                      {sessionDiff === 0 ? "0 ✓" : fmtBoxes(Math.abs(sessionDiff) / SEEDLINGS_PER_BOX)}
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("add")}
                  className="sm:flex-1 h-12 rounded-xl text-sm font-semibold"
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleCloseSession}
                  disabled={closeSession.isPending || !sessionBalanced}
                  className="sm:flex-[2] h-12 rounded-xl text-sm font-bold"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
