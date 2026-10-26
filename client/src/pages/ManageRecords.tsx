import { useMemo, useState } from "react";
import { Calendar, ClipboardList, Flower2, ListChecks, Sun, Users } from "lucide-react";

import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/date-only";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlantingRecordActions, type ChrysanthemumManageRecord, type EmployeeOption, type SunflowerManageRecord } from "@/components/PlantingRecordActions";
import { SessionManagementActions, type SessionToManage } from "@/components/SessionManagementActions";

const SEEDLINGS_PER_BOX = 1000;

function dateToTimestamp(value: Date | string) {
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value: Date | string) {
  return formatDateOnly(value) || "Data inválida";
}

function formatBoxes(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function formatSeedlingsAsBoxes(value: number) {
  return formatBoxes(value / SEEDLINGS_PER_BOX);
}

function sessionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Aberta",
    closed: "Fechada",
    divergent: "Divergente",
    pending: "Pendente",
  };
  return labels[status] ?? status;
}

function sessionStatusClass(status: string) {
  if (status === "closed") return "border-green-200 bg-green-50 text-green-700";
  if (status === "divergent") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

type CombinedRecord =
  | { kind: "chrysanthemum"; record: ChrysanthemumManageRecord }
  | { kind: "sunflower"; record: SunflowerManageRecord };

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Carregando">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyState({ kind }: { kind: "records" | "sessions" }) {
  const Icon = kind === "records" ? ClipboardList : ListChecks;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-5 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
      </div>
      <p className="font-medium text-muted-foreground">
        {kind === "records" ? "Nenhum lançamento encontrado" : "Nenhuma sessão encontrada"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground/70">
        {kind === "records" ? "Os lançamentos de crisântemo e girassol aparecerão aqui." : "As sessões de plantio aparecerão aqui."}
      </p>
    </div>
  );
}

function ChrysanthemumRecordCard({ record, employeeName, employees }: { record: ChrysanthemumManageRecord; employeeName: string; employees: EmployeeOption[] }) {
  const netBoxes = Math.max(0, record.totalBoxes - record.discountBoxes);
  return (
    <article className="overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Flower2 className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{employeeName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(record.plantingDate)}
              </p>
            </div>
            <Badge className="border-primary/20 bg-primary/10 text-primary">{formatBoxes(netBoxes)} cx líquidas</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {record.greenhouses.map((entry) => (
              <Badge key={entry.greenhouse} variant="outline" className="text-xs">
                E{entry.greenhouse}: {formatSeedlingsAsBoxes(entry.seedlings)} cx
              </Badge>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Bruto</p>
              <p className="text-sm font-semibold">{formatBoxes(record.totalBoxes)} cx</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Desconto</p>
              <p className={cn("text-sm font-semibold", record.discountBoxes > 0 ? "text-destructive" : "text-muted-foreground")}>{record.discountBoxes > 0 ? `-${record.discountBoxes}` : "—"}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Plantadas</p>
              <p className="text-sm font-semibold text-green-700">{record.totalSeedlings.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          {(record.discountReason || record.absenceReason) && (
            <div className="mt-3 space-y-1 rounded-xl bg-muted/30 px-3 py-2 text-xs">
              {record.discountReason && <p className="text-destructive"><strong>Desconto:</strong> {record.discountReason}</p>}
              {record.absenceReason && <p className="text-orange-700"><strong>Ausência:</strong> {record.absenceReason}</p>}
            </div>
          )}
        </div>
      </div>
      <PlantingRecordActions kind="chrysanthemum" record={record} employees={employees} />
    </article>
  );
}

function SunflowerRecordCard({ record, employeeName, employees }: { record: SunflowerManageRecord; employeeName: string; employees: EmployeeOption[] }) {
  const netTrays = Math.max(0, record.trays - record.discountTrays);
  return (
    <article className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Sun className="h-5 w-5 text-amber-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{employeeName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(record.plantingDate)}
              </p>
            </div>
            <Badge className="border-amber-200 bg-amber-100 text-amber-700">{netTrays.toLocaleString("pt-BR")} bandejas líquidas</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Bruto</p>
              <p className="text-sm font-semibold">{record.trays.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Desconto</p>
              <p className={cn("text-sm font-semibold", record.discountTrays > 0 ? "text-destructive" : "text-muted-foreground")}>{record.discountTrays > 0 ? `-${record.discountTrays}` : "—"}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">Líquido</p>
              <p className="text-sm font-semibold text-amber-700">{netTrays.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          {(record.discountReason || record.absenceReason) && (
            <div className="mt-3 space-y-1 rounded-xl bg-amber-50/60 px-3 py-2 text-xs">
              {record.discountReason && <p className="text-destructive"><strong>Desconto:</strong> {record.discountReason}</p>}
              {record.absenceReason && <p className="text-orange-700"><strong>Ausência:</strong> {record.absenceReason}</p>}
            </div>
          )}
        </div>
      </div>
      <PlantingRecordActions kind="sunflower" record={record} employees={employees} />
    </article>
  );
}

function SessionCard({ session }: { session: SessionToManage }) {
  const totalSent = formatSeedlingsAsBoxes(session.totalSeedlingsSent);
  const totalPlanted = formatSeedlingsAsBoxes(session.totalSeedlingsPlanted);
  return (
    <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ListChecks className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Sessão #{session.id}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(session.plantingDate)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("font-medium", sessionStatusClass(session.status))}>{sessionStatusLabel(session.status)}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-center">
            <p className="text-[11px] text-blue-700/80">Enviadas</p>
            <p className="text-base font-bold text-blue-700">{totalSent} cx</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-2.5 text-center">
            <p className="text-[11px] text-green-700/80">Plantadas</p>
            <p className="text-base font-bold text-green-700">{totalPlanted} cx</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Estufas</p>
            <p className="text-base font-bold text-foreground">{session.greenhouses.length}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Lançamentos</p>
            <p className="text-base font-bold text-foreground">{session.plantings.length}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.greenhouses.map((entry) => (
            <Badge key={entry.greenhouse} variant="outline" className="border-emerald-200 text-xs text-emerald-800">
              E{entry.greenhouse}: {formatSeedlingsAsBoxes(entry.seedlingsSent)} cx enviadas
            </Badge>
          ))}
        </div>
      </div>
      <SessionManagementActions session={session} />
    </article>
  );
}

export default function ManageRecords() {
  const { employee } = useEmployeeAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const canManage = employee?.role === "admin" || employee?.role === "launcher";

  const { data: employeeList = [], isLoading: employeesLoading } = trpc.employee.list.useQuery(undefined, { enabled: canManage });
  const { data: chrysAll, isLoading: chrysLoading } = trpc.chrysanthemum.manageAll.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: canManage }
  );
  const { data: sunflowerAll, isLoading: sunflowerLoading } = trpc.sunflower.manageAll.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: canManage }
  );
  const { data: sessionData, isLoading: sessionsLoading } = trpc.session.manageList.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: canManage }
  );

  const employees = useMemo<EmployeeOption[]>(
    () => employeeList.filter((item) => item.role === "employee").map((item) => ({ id: item.id, name: item.name })),
    [employeeList]
  );
  const employeeMap = useMemo(() => new Map(employees.map((item) => [item.id, item.name])), [employees]);

  const records = useMemo<CombinedRecord[]>(() => {
    const chrysRecords = (chrysAll ?? []) as ChrysanthemumManageRecord[];
    const sunflowerRecords = (sunflowerAll ?? []) as SunflowerManageRecord[];
    return [
      ...chrysRecords.map((record) => ({ kind: "chrysanthemum" as const, record })),
      ...sunflowerRecords.map((record) => ({ kind: "sunflower" as const, record })),
    ].sort((left, right) => dateToTimestamp(right.record.plantingDate) - dateToTimestamp(left.record.plantingDate));
  }, [chrysAll, sunflowerAll]);

  const sessions = useMemo<SessionToManage[]>(
    () => ((sessionData ?? []) as unknown as Array<{
      id: number;
      plantingDate: Date | string;
      status: string;
      totalSeedlingsSent: number;
      totalSeedlingsPlanted: number;
      greenhouses: SessionToManage["greenhouses"];
      plantings: SessionToManage["plantings"];
    }>).map((session) => ({
      id: session.id,
      plantingDate: session.plantingDate,
      status: session.status,
      totalSeedlingsSent: session.totalSeedlingsSent,
      totalSeedlingsPlanted: session.totalSeedlingsPlanted,
      greenhouses: session.greenhouses,
      plantings: session.plantings,
    })).sort((left, right) => dateToTimestamp(right.plantingDate) - dateToTimestamp(left.plantingDate)),
    [sessionData]
  );

  if (!employee || !canManage) {
    return (
      <div className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center px-4 text-center">
        <Users className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        <p className="font-medium text-muted-foreground">Acesso restrito ao administrador ou lançador.</p>
      </div>
    );
  }

  const recordsLoading = chrysLoading || sunflowerLoading || employeesLoading;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <header>
        <h1 className="font-serif text-2xl font-bold text-foreground">Gerenciar registros</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Edite lançamentos e sessões sem alterar confirmações manualmente.</p>
      </header>

      <section className="rounded-2xl border border-border bg-white p-4" aria-label="Filtros de data">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">Filtrar por período (opcional)</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="manage-from" className="text-xs text-muted-foreground">De</Label>
            <Input id="manage-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="manage-to" className="text-xs text-muted-foreground">Até</Label>
            <Input id="manage-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="records">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-muted/60">
          <TabsTrigger value="records" className="gap-2 rounded-lg font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Lançamentos
            <span className="rounded-full bg-current/10 px-1.5 text-xs">{records.length}</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 rounded-lg font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Sessões
            <span className="rounded-full bg-current/10 px-1.5 text-xs">{sessions.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 space-y-3">
          {recordsLoading && <LoadingCards />}
          {!recordsLoading && records.length === 0 && <EmptyState kind="records" />}
          {!recordsLoading && records.map((item) => {
            const employeeName = employeeMap.get(item.record.employeeId) ?? `Funcionário #${item.record.employeeId}`;
            if (item.kind === "chrysanthemum") {
              return <ChrysanthemumRecordCard key={`chrysanthemum-${item.record.id}`} record={item.record} employeeName={employeeName} employees={employees} />;
            }
            return <SunflowerRecordCard key={`sunflower-${item.record.id}`} record={item.record} employeeName={employeeName} employees={employees} />;
          })}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-3">
          {sessionsLoading && <LoadingCards count={3} />}
          {!sessionsLoading && sessions.length === 0 && <EmptyState kind="sessions" />}
          {!sessionsLoading && sessions.map((session) => <SessionCard key={session.id} session={session} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
