import { useEffect, useMemo, useState } from "react";
import { CalendarDays, DollarSign, Flower2, LoaderCircle, Save, Sun, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type MonthlyEmployee = {
  id: number;
  name: string;
  chrysanthemumGross: number;
  chrysanthemumDiscount: number;
  chrysanthemumNet: number;
  sunflowerGross: number;
  sunflowerDiscount: number;
  sunflowerNet: number;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatRateInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parseRateInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 1_000_000) return null;
  return Math.round(parsed * 100);
}

export default function MonthlyPayrollTab() {
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(currentMonthValue);
  const [chrysanthemumRate, setChrysanthemumRate] = useState("7,00");
  const [sunflowerRate, setSunflowerRate] = useState("4,00");
  const bounds = monthBounds(month);

  const ratesQuery = trpc.payroll.rates.useQuery();
  const employeesQuery = trpc.payroll.employeeNames.useQuery();
  const chrysanthemumQuery = trpc.chrysanthemum.adminAll.useQuery(bounds, {
    enabled: true,
    refetchOnWindowFocus: false,
  });
  const sunflowerQuery = trpc.sunflower.adminAll.useQuery(bounds, {
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const updateRates = trpc.payroll.updateRates.useMutation({
    onSuccess: () => {
      toast.success("Valores de pagamento atualizados.");
      utils.payroll.rates.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!ratesQuery.data) return;
    setChrysanthemumRate(formatRateInput(ratesQuery.data.chrysanthemumCents));
    setSunflowerRate(formatRateInput(ratesQuery.data.sunflowerCents));
  }, [ratesQuery.data]);

  const employeesById = useMemo(
    () => new Map((employeesQuery.data ?? []).map((employee) => [employee.id, employee.name])),
    [employeesQuery.data],
  );

  const rows = useMemo(() => {
    const byEmployee = new Map<number, MonthlyEmployee>();
    const getOrCreate = (id: number) => {
      let row = byEmployee.get(id);
      if (!row) {
        row = {
          id,
          name: employeesById.get(id) ?? `Funcionário #${id}`,
          chrysanthemumGross: 0,
          chrysanthemumDiscount: 0,
          chrysanthemumNet: 0,
          sunflowerGross: 0,
          sunflowerDiscount: 0,
          sunflowerNet: 0,
        };
        byEmployee.set(id, row);
      }
      return row;
    };

    for (const record of chrysanthemumQuery.data ?? []) {
      const row = getOrCreate(record.employeeId);
      row.chrysanthemumGross += record.totalBoxes;
      row.chrysanthemumDiscount += record.discountBoxes;
      row.chrysanthemumNet += Math.max(0, record.totalBoxes - record.discountBoxes);
    }
    for (const record of sunflowerQuery.data ?? []) {
      const row = getOrCreate(record.employeeId);
      row.sunflowerGross += record.trays;
      row.sunflowerDiscount += record.discountTrays;
      row.sunflowerNet += Math.max(0, record.trays - record.discountTrays);
    }

    return Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [chrysanthemumQuery.data, sunflowerQuery.data, employeesById]);

  const chrysanthemumRateCents = ratesQuery.data?.chrysanthemumCents ?? 700;
  const sunflowerRateCents = ratesQuery.data?.sunflowerCents ?? 400;
  const totalPayCents = rows.reduce(
    (total, row) => total + row.chrysanthemumNet * chrysanthemumRateCents + row.sunflowerNet * sunflowerRateCents,
    0,
  );
  const isLoading = employeesQuery.isLoading || chrysanthemumQuery.isLoading || sunflowerQuery.isLoading;
  const hasReportError = employeesQuery.isError || chrysanthemumQuery.isError || sunflowerQuery.isError;
  const monthTitle = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  function saveRates() {
    const chrysanthemumCents = parseRateInput(chrysanthemumRate);
    const sunflowerCents = parseRateInput(sunflowerRate);
    if (chrysanthemumCents === null || sunflowerCents === null) {
      toast.error("Informe valores válidos e não negativos para as duas tarifas.");
      return;
    }
    updateRates.mutate({ chrysanthemumCents, sunflowerCents });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <Label htmlFor="payroll-month" className="text-sm font-semibold">Mês do relatório</Label>
        </div>
        <Input
          id="payroll-month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value || currentMonthValue())}
          className="h-11 rounded-xl"
        />
        <p className="mt-2 text-xs capitalize text-muted-foreground">Exibindo pagamentos de {monthTitle}.</p>
      </section>

      <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <DollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Total a pagar no mês</p>
            <p className="text-2xl font-bold text-green-800">{formatMoney(totalPayCents)}</p>
          </div>
          <Badge className="border-green-200 bg-white text-green-800">
            <Users className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> {rows.length}
          </Badge>
        </div>
        <p className="mt-3 text-xs text-green-800/80">O cálculo considera as quantidades líquidas, depois dos descontos registrados.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-foreground">Valores por unidade</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">As tarifas são compartilhadas e usadas em qualquer mês consultado.</p>
        </div>
        {ratesQuery.isError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            Não foi possível carregar as tarifas salvas. Tente novamente ou confira a conexão do sistema.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="chrysanthemum-rate" className="flex items-center gap-1.5 text-xs">
              <Flower2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Crisântemo por caixa (R$)
            </Label>
            <Input
              id="chrysanthemum-rate"
              type="text"
              inputMode="decimal"
              value={chrysanthemumRate}
              onChange={(event) => setChrysanthemumRate(event.target.value)}
              className="h-11 rounded-xl"
              aria-label="Valor pago por caixa de crisântemo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sunflower-rate" className="flex items-center gap-1.5 text-xs">
              <Sun className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" /> Girassol por bandeja (R$)
            </Label>
            <Input
              id="sunflower-rate"
              type="text"
              inputMode="decimal"
              value={sunflowerRate}
              onChange={(event) => setSunflowerRate(event.target.value)}
              className="h-11 rounded-xl"
              aria-label="Valor pago por bandeja de girassol"
            />
          </div>
        </div>
        <Button type="button" onClick={saveRates} disabled={updateRates.isPending || ratesQuery.isLoading || ratesQuery.isError} className="h-11 w-full rounded-xl">
          {updateRates.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
          {updateRates.isPending ? "Salvando valores..." : "Salvar valores"}
        </Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-base font-bold text-foreground">Funcionários</h2>
            <p className="text-xs text-muted-foreground">Caixas e bandejas plantadas em {monthTitle}</p>
          </div>
          <Badge variant="outline">{rows.length} no mês</Badge>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
            <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Carregando lançamentos do mês...
          </div>
        )}
        {hasReportError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Não foi possível carregar o relatório deste mês. Tente novamente.
          </div>
        )}
        {!isLoading && !hasReportError && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado neste mês.
          </div>
        )}
        {!isLoading && !hasReportError && rows.map((row) => {
          const chrysanthemumPay = row.chrysanthemumNet * chrysanthemumRateCents;
          const sunflowerPay = row.sunflowerNet * sunflowerRateCents;
          const employeePay = chrysanthemumPay + sunflowerPay;
          return (
            <article key={row.id} className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{row.name}</h3>
                <p className="shrink-0 text-lg font-bold text-green-700">{formatMoney(employeePay)}</p>
              </div>
              <div className="space-y-2 border-t border-border/60 pt-3">
                <div className="flex items-start gap-2">
                  <Flower2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p><strong>{row.chrysanthemumNet.toLocaleString("pt-BR")} caixas</strong> líquidas × {formatMoney(chrysanthemumRateCents)}</p>
                    <p className="text-xs text-muted-foreground">Bruto {row.chrysanthemumGross.toLocaleString("pt-BR")} cx · desconto {row.chrysanthemumDiscount.toLocaleString("pt-BR")} cx</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">{formatMoney(chrysanthemumPay)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p><strong>{row.sunflowerNet.toLocaleString("pt-BR")} bandejas</strong> líquidas × {formatMoney(sunflowerRateCents)}</p>
                    <p className="text-xs text-muted-foreground">Bruto {row.sunflowerGross.toLocaleString("pt-BR")} band. · desconto {row.sunflowerDiscount.toLocaleString("pt-BR")} band.</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-amber-700">{formatMoney(sunflowerPay)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
