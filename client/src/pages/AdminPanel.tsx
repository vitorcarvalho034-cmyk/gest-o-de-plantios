import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flower2, Sun, Users, Package, Layers, TrendingUp, AlertCircle, Calendar, ChevronDown, ChevronUp, TrendingDown, CheckCircle2, XCircle, Clock, GitCompare, ListChecks, Lock, AlertOctagon, DollarSign, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type GreenhouseEntry = { greenhouse: 1 | 2 | 3 | 4; seedlingsSent?: number; seedlings: number };

function formatDate(d: Date | string) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

type EmpSummary = {
  id: number;
  name: string;
  chrysBoxes: number;
  chrysDiscount: number;
  chrysNet: number;
  sunTrays: number;
  sunDiscount: number;
  sunNet: number;
};

function EmployeeSummaryCard({ s }: { s: EmpSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-sm">{s.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{s.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-primary font-medium">{s.chrysNet} cx</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-amber-600 font-medium">{s.sunNet} band.</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border/60 bg-muted/20">
          {/* Chrysanthemum row */}
          <div className="px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2 mb-2">
              <Flower2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Crisântemo</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-white rounded-xl py-2 border border-border/60">
                <p className="text-xs text-muted-foreground">Bruto</p>
                <p className="text-base font-bold">{s.chrysBoxes}</p>
              </div>
              <div className="text-center bg-white rounded-xl py-2 border border-border/60">
                <p className="text-xs text-muted-foreground">Desc.</p>
                <p className={cn("text-base font-bold", s.chrysDiscount > 0 ? "text-destructive" : "text-muted-foreground")}>
                  {s.chrysDiscount > 0 ? `-${s.chrysDiscount}` : "—"}
                </p>
              </div>
              <div className="text-center bg-primary/5 rounded-xl py-2 border border-primary/20">
                <p className="text-xs text-muted-foreground">Líquido</p>
                <p className="text-base font-bold text-primary">{s.chrysNet}</p>
              </div>
            </div>
          </div>

          {/* Sunflower row */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Girassol</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-white rounded-xl py-2 border border-border/60">
                <p className="text-xs text-muted-foreground">Bruto</p>
                <p className="text-base font-bold">{s.sunTrays}</p>
              </div>
              <div className="text-center bg-white rounded-xl py-2 border border-border/60">
                <p className="text-xs text-muted-foreground">Desc.</p>
                <p className={cn("text-base font-bold", s.sunDiscount > 0 ? "text-destructive" : "text-muted-foreground")}>
                  {s.sunDiscount > 0 ? `-${s.sunDiscount}` : "—"}
                </p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl py-2 border border-amber-200">
                <p className="text-xs text-muted-foreground">Líquido</p>
                <p className="text-base font-bold text-amber-700">{s.sunNet}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CHRY_PRICE = 7; // R$ por caixa
const SUN_PRICE = 4;  // R$ por bandeja

export default function AdminPanel() {
  const { employee } = useEmployeeAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

  const { data: employeeList } = trpc.employee.list.useQuery();
  const { data: chrysAll, isLoading: chrysLoading } = trpc.chrysanthemum.adminAll.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: employee?.role === "admin" }
  );
  const { data: sunAll, isLoading: sunLoading } = trpc.sunflower.adminAll.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: employee?.role === "admin" }
  );
  const { data: reconcByGh, isLoading: reconcLoading } = trpc.reconciliation.byGreenhouse.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: employee?.role === "admin" }
  );
  const { data: reconcByDate } = trpc.reconciliation.byDate.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: employee?.role === "admin" }
  );
  const { data: sessionData, isLoading: sessionsLoading } = trpc.reconciliation.bySession.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: employee?.role === "admin" }
  );

  if (employee?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  const employeeMap = new Map(employeeList?.map((e) => [e.id, e.name]) ?? []);

  const summaryMap = new Map<number, EmpSummary>();
  const getOrCreate = (id: number): EmpSummary => {
    if (!summaryMap.has(id)) {
      summaryMap.set(id, {
        id, name: employeeMap.get(id) ?? `Funcionário #${id}`,
        chrysBoxes: 0, chrysDiscount: 0, chrysNet: 0,
        sunTrays: 0, sunDiscount: 0, sunNet: 0,
      });
    }
    return summaryMap.get(id)!;
  };

  chrysAll?.forEach((p) => {
    const s = getOrCreate(p.employeeId);
    s.chrysBoxes += p.totalBoxes;
    s.chrysDiscount += p.discountBoxes;
    s.chrysNet += p.totalBoxes - p.discountBoxes;
  });
  sunAll?.forEach((p) => {
    const s = getOrCreate(p.employeeId);
    s.sunTrays += p.trays;
    s.sunDiscount += p.discountTrays;
    s.sunNet += p.trays - p.discountTrays;
  });

  const summaries = Array.from(summaryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const totalChrysNet = summaries.reduce((s, e) => s + e.chrysNet, 0);
  const totalSunNet = summaries.reduce((s, e) => s + e.sunNet, 0);
  const totalChrysDiscount = summaries.reduce((s, e) => s + e.chrysDiscount, 0);

  // Filtro por funcionário para pagamento
  const selectedEmpIdNum = selectedEmployeeId !== "all" ? Number(selectedEmployeeId) : null;
  const filteredChry = selectedEmpIdNum ? (chrysAll ?? []).filter(p => p.employeeId === selectedEmpIdNum) : (chrysAll ?? []);
  const filteredSun = selectedEmpIdNum ? (sunAll ?? []).filter(p => p.employeeId === selectedEmpIdNum) : (sunAll ?? []);
  const payChryNet = filteredChry.reduce((s, p) => s + (p.totalBoxes - p.discountBoxes), 0);
  const paySunNet = filteredSun.reduce((s, p) => s + (p.trays - p.discountTrays), 0);
  const payChryValue = payChryNet * CHRY_PRICE;
  const paySunValue = paySunNet * SUN_PRICE;
  const payTotal = payChryValue + paySunValue;
  const selectedEmpName = selectedEmpIdNum ? (employeeList?.find(e => e.id === selectedEmpIdNum)?.name ?? `Funcionário #${selectedEmpIdNum}`) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Painel Admin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Visão consolidada para pagamento</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Caixas</span>
          </div>
          <p className="text-3xl font-bold text-primary">{totalChrysNet}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Crisântemo (líquido)</p>
        </div>
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Bandejas</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{totalSunNet}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Girassol (líquido)</p>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Descontos</span>
          </div>
          <p className="text-3xl font-bold text-destructive">{totalChrysDiscount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Caixas descontadas</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-green-700" />
            <span className="text-xs font-semibold text-green-700">Funcionários</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{summaries.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Com registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date filter */}
        <div className="flex gap-3 items-end bg-white rounded-2xl border border-border p-4">
          <Calendar className="w-5 h-5 text-muted-foreground mb-1 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-xl text-sm" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-xl text-sm" />
          </div>
        </div>

        {/* Employee filter + Payment card */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por funcionário</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-11 rounded-xl text-sm">
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {employeeList?.filter(e => e.role === "employee").sort((a, b) => a.name.localeCompare(b.name)).map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment summary */}
          {selectedEmpIdNum && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-700" />
                <p className="text-sm font-bold text-green-800">Pagamento — {selectedEmpName}</p>
              </div>
              {from && to && (
                <p className="text-xs text-green-700">Período: {from} a {to}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-3 border border-primary/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Flower2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Crisântemo</span>
                  </div>
                  <p className="text-base font-bold text-primary">{payChryNet} cx</p>
                  <p className="text-xs text-green-700 font-semibold mt-0.5">
                    R$ {payChryValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">× R$ {CHRY_PRICE},00/cx</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Girassol</span>
                  </div>
                  <p className="text-base font-bold text-amber-600">{paySunNet} band.</p>
                  <p className="text-xs text-green-700 font-semibold mt-0.5">
                    R$ {paySunValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">× R$ {SUN_PRICE},00/band.</p>
                </div>
              </div>
              <div className="bg-green-700 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">TOTAL A PAGAR</span>
                <span className="text-xl font-bold text-white">
                  R$ {payTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-5 w-full h-10 bg-muted/60 rounded-xl">
          <TabsTrigger value="summary" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="chrysanthemum" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium">
            <Flower2 className="w-3.5 h-3.5" /> Crisântemo
          </TabsTrigger>
          <TabsTrigger value="sunflower" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs font-medium">
            <Sun className="w-3.5 h-3.5" /> Girassol
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-1 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-medium">
            <GitCompare className="w-3 h-3" /> <span className="hidden sm:inline">Cruzamento</span><span className="sm:hidden">Cruz.</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-1 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs font-medium">
            <ListChecks className="w-3 h-3" /> Sessões
          </TabsTrigger>
        </TabsList>

        {/* Summary tab */}
        <TabsContent value="summary" className="mt-4 space-y-3">
          {summaries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum registro no período</p>
            </div>
          )}
          {summaries.map((s) => <EmployeeSummaryCard key={s.id} s={s} />)}

          {summaries.length > 0 && (
            <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4">
              <p className="text-sm font-bold text-primary mb-3">TOTAIS GERAIS</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-primary/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flower2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Crisântemo</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{totalChrysNet} cx</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Girassol</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">{totalSunNet} band.</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Chrysanthemum detail */}
        <TabsContent value="chrysanthemum" className="mt-4 space-y-3">
          {chrysLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>}
          {!chrysLoading && (!chrysAll || chrysAll.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Flower2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </div>
          )}
          {chrysAll?.map((p) => {
            const ghs = p.greenhouses as GreenhouseEntry[];
            const net = p.totalBoxes - p.discountBoxes;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Flower2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{employeeMap.get(p.employeeId) ?? `#${p.employeeId}`}</p>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs flex-shrink-0">{net} cx</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.plantingDate)}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ghs.map((g, i) => (
                        <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">
                          E{g.greenhouse}: {g.seedlings.toLocaleString()}
                          {g.seedlingsSent != null && g.seedlingsSent > 0 && (
                            <span className="text-blue-500 ml-1">(env: {g.seedlingsSent.toLocaleString()})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {/* Totais enviados vs plantados */}
                    {(p as any).totalSeedlingsSent > 0 && (
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="text-blue-600 font-medium">📦 {(p as any).totalSeedlingsSent.toLocaleString()} env.</span>
                        <span className="text-green-700 font-medium">🌱 {p.totalSeedlings.toLocaleString()} plant.</span>
                        {(p as any).totalSeedlingsSent > p.totalSeedlings && (
                          <span className="text-orange-600 font-medium">⚠️ {((p as any).totalSeedlingsSent - p.totalSeedlings).toLocaleString()} dif.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex border-t border-primary/10">
                  <div className="flex-1 py-2 text-center border-r border-primary/10">
                    <p className="text-xs text-muted-foreground">Bruto</p>
                    <p className="text-sm font-semibold">{p.totalBoxes}</p>
                  </div>
                  <div className="flex-1 py-2 text-center border-r border-primary/10">
                    <p className="text-xs text-muted-foreground">Desc.</p>
                    <p className={cn("text-sm font-semibold", p.discountBoxes > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {p.discountBoxes > 0 ? `-${p.discountBoxes}` : "—"}
                    </p>
                  </div>
                  <div className="flex-1 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Líquido</p>
                    <p className="text-sm font-bold text-green-700">{net}</p>
                  </div>
                </div>
                {(p.discountReason || p.absenceReason || (p as any).confirmStatus) && (
                  <div className="border-t border-primary/10 px-4 py-2.5 bg-muted/20 space-y-1">
                    {(p as any).confirmStatus && (
                      <div className="flex items-center gap-1.5">
                        {(p as any).confirmStatus === 'confirmed' && <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-xs text-green-700 font-semibold">Confirmado pelo funcionário</span></>}
                        {(p as any).confirmStatus === 'rejected' && <><XCircle className="w-3.5 h-3.5 text-red-600" /><span className="text-xs text-red-700 font-semibold">Contestado: {(p as any).confirmRejectionReason}</span></>}
                        {(!(p as any).confirmStatus || (p as any).confirmStatus === 'pending') && <><Clock className="w-3.5 h-3.5 text-yellow-600" /><span className="text-xs text-yellow-700 font-semibold">Aguardando confirmação</span></>}
                      </div>
                    )}
                    {p.discountReason && <p className="text-xs text-destructive"><span className="font-semibold">Desc:</span> {p.discountReason}</p>}
                    {p.absenceReason && <p className="text-xs text-orange-600"><span className="font-semibold">Aus:</span> {p.absenceReason}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Reconciliation tab */}
        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitCompare className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-blue-800">Cruzamento: Enviado vs Plantado</p>
            </div>
            <p className="text-xs text-blue-600">Compara o total de mudas enviadas para cada estufa com o total efetivamente plantado pelos funcionários.</p>
          </div>

          {/* Por Estufa */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Por Estufa</p>
            {reconcLoading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>}
            {!reconcLoading && (!reconcByGh || reconcByGh.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-white rounded-2xl border border-border">
                <GitCompare className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum dado no período</p>
              </div>
            )}
            <div className="space-y-3">
              {reconcByGh?.map((item) => {
                const isOk = item.status === "ok";
                const isDivergencia = item.status === "divergencia";
                const semEnvio = item.status === "sem_envio";
                return (
                  <div key={item.greenhouse} className={cn(
                    "bg-white rounded-2xl border shadow-sm overflow-hidden",
                    isOk ? "border-green-300" : isDivergencia ? "border-orange-300" : "border-border"
                  )}>
                    <div className="flex items-center gap-3 p-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm",
                        isOk ? "bg-green-100 text-green-700" : isDivergencia ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      )}>
                        E{item.greenhouse}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">Estufa {item.greenhouse}</p>
                          {isOk && <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Bateu</span>}
                          {isDivergencia && <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">⚠ Divergência</span>}
                          {semEnvio && <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Sem envio</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.records} lançamento(s)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 border-t divide-x">
                      <div className="py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Enviado</p>
                        <p className="text-sm font-bold text-blue-700">{item.sent.toLocaleString()}</p>
                      </div>
                      <div className="py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Plantado</p>
                        <p className="text-sm font-bold text-green-700">{item.planted.toLocaleString()}</p>
                      </div>
                      <div className="py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Diferença</p>
                        <p className={cn("text-sm font-bold", item.diff === 0 ? "text-green-700" : "text-orange-600")}>
                          {item.diff === 0 ? "—" : item.diff > 0 ? `+${item.diff.toLocaleString()}` : item.diff.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por Data/Estufa */}
          {reconcByDate && reconcByDate.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Por Data e Estufa</p>
              <div className="space-y-2">
                {reconcByDate.map((item, idx) => {
                  const isOk = item.status === "ok";
                  const isDivergencia = item.status === "divergencia";
                  return (
                    <div key={idx} className={cn(
                      "bg-white rounded-xl border p-3 flex items-center gap-3",
                      isOk ? "border-green-200" : isDivergencia ? "border-orange-200" : "border-border"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
                        isOk ? "bg-green-100 text-green-700" : isDivergencia ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      )}>
                        E{item.greenhouse}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                          {isOk && <span className="text-xs text-green-700 font-bold">✓ OK</span>}
                          {isDivergencia && <span className="text-xs text-orange-600 font-bold">⚠ {item.diff > 0 ? `+${item.diff}` : item.diff}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.employeeCount} func. · env: {item.sent.toLocaleString()} · plant: {item.planted.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sessions tab */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="w-4 h-4 text-emerald-700" />
              <p className="text-sm font-bold text-emerald-800">Sessões de Plantio — Crisântemo</p>
            </div>
            <p className="text-xs text-emerald-600">Cada sessão mostra o total enviado para a estufa vs o total plantado pelos funcionários. A sessão só fecha quando os totais batem.</p>
          </div>

          {sessionsLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}</div>}
          {!sessionsLoading && (!sessionData || sessionData.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-border">
              <ListChecks className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhuma sessão no período</p>
            </div>
          )}

          {sessionData?.map((s) => {
            const isOpen = s.status === "open";
            const isClosed = s.status === "closed";
            const isDivergent = s.status === "divergent";
            const diff = s.diff;
            return (
              <SessionCard key={s.id} s={s} isOpen={isOpen} isClosed={isClosed} isDivergent={isDivergent} diff={diff} />
            );
          })}
        </TabsContent>

        {/* Sunflower detail */}
        <TabsContent value="sunflower" className="mt-4 space-y-3">
          {sunLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>}
          {!sunLoading && (!sunAll || sunAll.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sun className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </div>
          )}
          {sunAll?.map((p) => {
            const net = p.trays - p.discountTrays;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Sun className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{employeeMap.get(p.employeeId) ?? `#${p.employeeId}`}</p>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs flex-shrink-0">{net} band.</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.plantingDate)}</p>
                  </div>
                </div>
                <div className="flex border-t border-amber-100">
                  <div className="flex-1 py-2 text-center border-r border-amber-100">
                    <p className="text-xs text-muted-foreground">Bruto</p>
                    <p className="text-sm font-semibold">{p.trays}</p>
                  </div>
                  <div className="flex-1 py-2 text-center border-r border-amber-100">
                    <p className="text-xs text-muted-foreground">Desc.</p>
                    <p className={cn("text-sm font-semibold", p.discountTrays > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {p.discountTrays > 0 ? `-${p.discountTrays}` : "—"}
                    </p>
                  </div>
                  <div className="flex-1 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Líquido</p>
                    <p className="text-sm font-bold text-amber-700">{net}</p>
                  </div>
                </div>
                {(p.discountReason || p.absenceReason || (p as any).confirmStatus) && (
                  <div className="border-t border-amber-100 px-4 py-2.5 bg-amber-50/50 space-y-1">
                    {(p as any).confirmStatus && (
                      <div className="flex items-center gap-1.5">
                        {(p as any).confirmStatus === 'confirmed' && <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-xs text-green-700 font-semibold">Confirmado pelo funcionário</span></>}
                        {(p as any).confirmStatus === 'rejected' && <><XCircle className="w-3.5 h-3.5 text-red-600" /><span className="text-xs text-red-700 font-semibold">Contestado: {(p as any).confirmRejectionReason}</span></>}
                        {(!(p as any).confirmStatus || (p as any).confirmStatus === 'pending') && <><Clock className="w-3.5 h-3.5 text-yellow-600" /><span className="text-xs text-yellow-700 font-semibold">Aguardando confirmação</span></>}
                      </div>
                    )}
                    {p.discountReason && <p className="text-xs text-destructive"><span className="font-semibold">Desc:</span> {p.discountReason}</p>}
                    {p.absenceReason && <p className="text-xs text-orange-600"><span className="font-semibold">Aus:</span> {p.absenceReason}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── SessionCard ─────────────────────────────────────────────────────────────
type SessionRow = {
  id: number;
  plantingDate: Date;
  status: string;
  totalSeedlingsSent: number;
  totalSeedlingsPlanted: number;
  diff: number;
  closeNote?: string | null;
  closedAt?: Date | null;
  openedByName: string;
  greenhouses: Array<{ greenhouse: number; seedlingsSent: number }>;
  plantings: Array<{
    id: number;
    employeeName: string;
    totalSeedlings: number;
    totalBoxes: number;
    discountBoxes: number;
    discountReason?: string | null;
    absenceReason?: string | null;
    confirmationStatus?: string | null;
    rejectionReason?: string | null;
  }>;
};

function SessionCard({
  s, isOpen, isClosed, isDivergent, diff
}: { s: SessionRow; isOpen: boolean; isClosed: boolean; isDivergent: boolean; diff: number }) {
  const [expanded, setExpanded] = useState(false);
  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  const statusColor = isOpen
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : isClosed
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-orange-100 text-orange-700 border-orange-200";

  const statusLabel = isOpen ? "Aberta" : isClosed ? "Fechada \u2714" : "Diverg\u00eancia";
  const StatusIcon = isOpen ? Clock : isClosed ? Lock : AlertOctagon;

  return (
    <div className={cn(
      "rounded-2xl border-2 overflow-hidden",
      isOpen ? "border-blue-200" : isClosed ? "border-green-200" : "border-orange-200"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4",
        isOpen ? "bg-blue-50" : isClosed ? "bg-green-50" : "bg-orange-50"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center",
              isOpen ? "bg-blue-200" : isClosed ? "bg-green-200" : "bg-orange-200"
            )}>
              <StatusIcon className={cn("w-4 h-4",
                isOpen ? "text-blue-700" : isClosed ? "text-green-700" : "text-orange-700"
              )} />
            </div>
            <div>
              <p className="font-bold text-sm">
                {new Date(s.plantingDate).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">Sess\u00e3o #{s.id} \u2022 {s.openedByName}</p>
            </div>
          </div>
          <Badge className={cn("text-xs font-bold border", statusColor)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Enviado: <strong>{fmtNum(s.totalSeedlingsSent)}</strong> mudas ({Math.floor(s.totalSeedlingsSent / 1000)} cx)</span>
            <span>Plantado: <strong>{fmtNum(s.totalSeedlingsPlanted)}</strong> mudas</span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-border/40">
            <div
              className={cn("h-full rounded-full transition-all",
                diff === 0 && s.totalSeedlingsPlanted > 0 ? "bg-green-500" :
                diff < 0 ? "bg-orange-500" : "bg-blue-400"
              )}
              style={{ width: `${Math.min(100, s.totalSeedlingsSent > 0 ? (s.totalSeedlingsPlanted / s.totalSeedlingsSent) * 100 : 0)}%` }}
            />
          </div>
          {diff !== 0 && (
            <p className={cn("text-xs font-medium",
              diff > 0 ? "text-blue-600" : "text-orange-600"
            )}>
              {diff > 0 ? `\u25b2 Faltam ${fmtNum(diff)} mudas (${Math.floor(diff / 1000)} cx)` : `\u25bc ${fmtNum(Math.abs(diff))} mudas a mais`}
            </p>
          )}
          {diff === 0 && s.totalSeedlingsPlanted > 0 && (
            <p className="text-xs font-bold text-green-600">\u2705 Total bateu!</p>
          )}
        </div>

        {/* Estufas */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {s.greenhouses.map((g) => (
            <div key={g.greenhouse} className="bg-white rounded-lg px-2.5 py-1 border border-border/60 text-xs">
              <span className="font-bold">Est. {g.greenhouse}</span>
              <span className="text-muted-foreground ml-1">{fmtNum(g.seedlingsSent)} mudas</span>
            </div>
          ))}
        </div>

        {s.closeNote && (
          <div className="bg-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700 mb-2">
            <strong>Obs:</strong> {s.closeNote}
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {s.plantings.length} funcion\u00e1rio{s.plantings.length !== 1 ? "s" : ""} lan\u00e7ado{s.plantings.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Plantings expandidos */}
      {expanded && (
        <div className="divide-y divide-border bg-white">
          {s.plantings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum lan\u00e7amento ainda</p>
          )}
          {s.plantings.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.employeeName}</p>
                {p.absenceReason ? (
                  <p className="text-xs text-orange-600">Ausente: {p.absenceReason}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{fmtNum(p.totalSeedlings)} mudas</span>
                    <span className="text-xs font-bold text-primary">{p.totalBoxes} cx brutas</span>
                    {p.discountBoxes > 0 && (
                      <span className="text-xs text-red-500">-{p.discountBoxes} cx desc.</span>
                    )}
                  </div>
                )}
                {p.discountReason && (
                  <p className="text-xs text-muted-foreground mt-0.5">Desconto: {p.discountReason}</p>
                )}
              </div>
              <div className="shrink-0">
                {p.confirmationStatus === "confirmed" && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">\u2714 Confirmado</Badge>
                )}
                {p.confirmationStatus === "rejected" && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">\u2717 Contestado</Badge>
                )}
                {(!p.confirmationStatus || p.confirmationStatus === "pending") && (
                  <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">Aguardando</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
