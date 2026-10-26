import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, Flower2, Pencil, Sun, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { toDateInputValue } from "@/lib/date-only";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type GreenhouseNumber = 1 | 2 | 3 | 4;

export type ChrysanthemumManageGreenhouse = {
  greenhouse: GreenhouseNumber;
  seedlingsSent?: number;
  seedlings: number;
};

export type ChrysanthemumManageRecord = {
  id: number;
  sessionId: number | null;
  employeeId: number;
  plantingDate: Date | string;
  greenhouses: ChrysanthemumManageGreenhouse[];
  totalSeedlingsSent: number;
  totalSeedlings: number;
  totalBoxes: number;
  discountBoxes: number;
  discountReason: string | null;
  absenceReason: string | null;
  launchedById: number | null;
  confirmStatus: string | null;
  confirmRejectionReason: string | null;
};

export type SunflowerManageRecord = {
  id: number;
  employeeId: number;
  plantingDate: Date | string;
  trays: number;
  discountTrays: number;
  discountReason: string | null;
  absenceReason: string | null;
  launchedById: number | null;
  confirmStatus: string | null;
  confirmRejectionReason: string | null;
};

export type EmployeeOption = { id: number; name: string };

type PlantingRecordActionsProps =
  | {
      kind: "chrysanthemum";
      record: ChrysanthemumManageRecord;
      employees: EmployeeOption[];
    }
  | {
      kind: "sunflower";
      record: SunflowerManageRecord;
      employees: EmployeeOption[];
    };

const GREENHOUSES: GreenhouseNumber[] = [1, 2, 3, 4];
const SEEDLINGS_PER_BOX = 1000;


function formatDecimal(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function greenhouseValues(record: ChrysanthemumManageRecord) {
  const values: Record<GreenhouseNumber, string> = { 1: "", 2: "", 3: "", 4: "" };
  record.greenhouses.forEach((entry) => {
    values[entry.greenhouse] = (entry.seedlings / SEEDLINGS_PER_BOX).toFixed(3).replace(/\.?0+$/, "");
  });
  return values;
}

function invalidateManagementQueries(utils: ReturnType<typeof trpc.useUtils>) {
  void utils.chrysanthemum.manageAll.invalidate();
  void utils.chrysanthemum.adminAll.invalidate();
  void utils.sunflower.manageAll.invalidate();
  void utils.sunflower.adminAll.invalidate();
  void utils.session.manageList.invalidate();
  void utils.session.listOpen.invalidate();
  void utils.session.getWithPlantings.invalidate();
  void utils.reconciliation.bySession.invalidate();
  void utils.reconciliation.byGreenhouse.invalidate();
  void utils.reconciliation.byDate.invalidate();
}

function ActionButtons({
  onEdit,
  onDelete,
  isDeleting,
  label,
}: {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/10 px-4 py-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-9 rounded-lg gap-1.5"
        aria-label={`Editar ${label}`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Editar</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
        className="h-9 rounded-lg gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        aria-label={`Excluir ${label}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Excluir</span>
      </Button>
    </div>
  );
}

function ChrysanthemumEditor({
  record,
  employees,
  open,
  onOpenChange,
}: {
  record: ChrysanthemumManageRecord;
  employees: EmployeeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const sessionInfo = trpc.session.getWithPlantings.useQuery(
    { sessionId: record.sessionId ?? 0 },
    { enabled: open && record.sessionId !== null }
  );
  const [employeeId, setEmployeeId] = useState(String(record.employeeId));
  const [plantingDate, setPlantingDate] = useState(toDateInputValue(record.plantingDate));
  const [selectedGreenhouses, setSelectedGreenhouses] = useState<Set<GreenhouseNumber>>(
    () => new Set(record.greenhouses.map((entry) => entry.greenhouse))
  );
  const [boxesByGreenhouse, setBoxesByGreenhouse] = useState<Record<GreenhouseNumber, string>>(() => greenhouseValues(record));
  const [discountBoxes, setDiscountBoxes] = useState(String(record.discountBoxes));
  const [discountReason, setDiscountReason] = useState(record.discountReason ?? "");
  const [isAbsent, setIsAbsent] = useState(Boolean(record.absenceReason));
  const [absenceReason, setAbsenceReason] = useState(record.absenceReason ?? "");

  const availableGreenhouses = useMemo<GreenhouseNumber[]>(() => {
    if (record.sessionId === null) return [...GREENHOUSES];
    const sessionGreenhouses = sessionInfo.data?.session.greenhouses as Array<{ greenhouse: GreenhouseNumber; seedlingsSent: number }> | undefined;
    return sessionGreenhouses?.length
      ? sessionGreenhouses.map((entry) => entry.greenhouse)
      : record.greenhouses.map((entry) => entry.greenhouse);
  }, [record, sessionInfo.data]);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(String(record.employeeId));
    setPlantingDate(toDateInputValue(record.plantingDate));
    const previouslySelected = record.greenhouses.map((entry) => entry.greenhouse).filter((greenhouse) => availableGreenhouses.includes(greenhouse));
    setSelectedGreenhouses(new Set(previouslySelected.length ? previouslySelected : [availableGreenhouses[0] ?? 1]));
    setBoxesByGreenhouse(greenhouseValues(record));
    setDiscountBoxes(String(record.discountBoxes));
    setDiscountReason(record.discountReason ?? "");
    setIsAbsent(Boolean(record.absenceReason));
    setAbsenceReason(record.absenceReason ?? "");
  }, [open, record, availableGreenhouses]);

  const updateRecord = trpc.chrysanthemum.updateRecord.useMutation({
    onSuccess: () => {
      invalidateManagementQueries(utils);
      toast.success("Lançamento de crisântemo atualizado.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedEntries = useMemo(
    () => Array.from(selectedGreenhouses).sort((a, b) => a - b),
    [selectedGreenhouses]
  );

  function toggleGreenhouse(greenhouse: GreenhouseNumber) {
    setSelectedGreenhouses((current) => {
      const next = new Set(current);
      if (next.has(greenhouse)) next.delete(greenhouse);
      else next.add(greenhouse);
      return next;
    });
  }

  function submit() {
    if (!employeeId) {
      toast.error("Selecione o funcionário.");
      return;
    }
    if (!plantingDate) {
      toast.error("Informe a data do plantio.");
      return;
    }
    if (!isAbsent && selectedEntries.length === 0) {
      toast.error("Selecione pelo menos uma estufa.");
      return;
    }
    if (isAbsent && !absenceReason.trim()) {
      toast.error("Informe o motivo da ausência.");
      return;
    }

    const parsedDiscount = Number(discountBoxes);
    if (!Number.isInteger(parsedDiscount) || parsedDiscount < 0) {
      toast.error("O desconto deve ser um número inteiro igual ou maior que zero.");
      return;
    }
    if (!isAbsent && parsedDiscount > 0 && !discountReason.trim()) {
      toast.error("Informe o motivo do desconto.");
      return;
    }

    const entriesForPayload: GreenhouseNumber[] = selectedEntries.length > 0
      ? selectedEntries
      : [availableGreenhouses[0] ?? 1];
    const invalidBox = entriesForPayload.some((greenhouse) => {
      const boxes = Number(boxesByGreenhouse[greenhouse]);
      return !Number.isFinite(boxes) || boxes < 0;
    });
    if (!isAbsent && invalidBox) {
      toast.error("Informe caixas válidas para todas as estufas selecionadas.");
      return;
    }
    const totalSeedlings = isAbsent
      ? 0
      : entriesForPayload.reduce(
          (sum, greenhouse) => sum + Math.round(Number(boxesByGreenhouse[greenhouse]) * SEEDLINGS_PER_BOX),
          0
        );
    const grossBoxes = Math.floor(totalSeedlings / SEEDLINGS_PER_BOX);
    if (!isAbsent && totalSeedlings <= 0) {
      toast.error("Informe uma quantidade plantada ou marque ausência.");
      return;
    }
    if (!isAbsent && parsedDiscount > grossBoxes) {
      toast.error("O desconto não pode superar as caixas plantadas.");
      return;
    }

    const payloadGreenhouses = entriesForPayload.map((greenhouse) => {
      const previous = record.greenhouses.find((entry) => entry.greenhouse === greenhouse);
      const boxes = isAbsent ? 0 : Number(boxesByGreenhouse[greenhouse]);
      return {
        greenhouse,
        ...(previous?.seedlingsSent != null ? { seedlingsSent: previous.seedlingsSent } : {}),
        seedlings: Math.round(boxes * SEEDLINGS_PER_BOX),
      };
    });

    updateRecord.mutate({
      id: record.id,
      employeeId: Number(employeeId),
      plantingDate,
      greenhouses: payloadGreenhouses,
      discountBoxes: isAbsent ? 0 : parsedDiscount,
      discountReason: !isAbsent && discountReason.trim() ? discountReason.trim() : undefined,
      absenceReason: isAbsent ? absenceReason.trim() : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Flower2 className="h-5 w-5" aria-hidden="true" />
            Editar lançamento de crisântemo
          </DialogTitle>
          <DialogDescription>
            Ajuste os dados do plantio. O status de confirmação será redefinido pelo servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`chrys-employee-${record.id}`}>Funcionário</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id={`chrys-employee-${record.id}`} className="h-11 rounded-xl">
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`chrys-date-${record.id}`}>Data do plantio</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`chrys-date-${record.id}`}
                type="date"
                value={plantingDate}
                onChange={(event) => setPlantingDate(event.target.value)}
                className="h-11 rounded-xl pl-9"
                disabled={record.sessionId !== null}
              />
            </div>
            {record.sessionId !== null && (
              <p className="text-xs text-muted-foreground">A data é definida pela sessão. Edite a sessão para alterá-la.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Estufas e caixas plantadas</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableGreenhouses.map((greenhouse) => {
                const checked = selectedGreenhouses.has(greenhouse);
                return (
                  <label
                    key={greenhouse}
                    htmlFor={`chrys-gh-${record.id}-${greenhouse}`}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors ${
                      checked ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      id={`chrys-gh-${record.id}-${greenhouse}`}
                      checked={checked}
                      onCheckedChange={() => toggleGreenhouse(greenhouse)}
                      aria-label={`Selecionar estufa ${greenhouse}`}
                    />
                    <span className="font-medium">Estufa {greenhouse}</span>
                  </label>
                );
              })}
            </div>
            {!isAbsent && selectedEntries.length > 0 && (
              <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
                {selectedEntries.map((greenhouse) => (
                  <div key={greenhouse} className="space-y-1">
                    <Label htmlFor={`chrys-boxes-${record.id}-${greenhouse}`} className="text-xs text-muted-foreground">
                      Estufa {greenhouse} — caixas
                    </Label>
                    <Input
                      id={`chrys-boxes-${record.id}-${greenhouse}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.001"
                      value={boxesByGreenhouse[greenhouse]}
                      onChange={(event) =>
                        setBoxesByGreenhouse((current) => ({ ...current, [greenhouse]: event.target.value }))
                      }
                      className="h-10 rounded-lg"
                      aria-label={`Caixas plantadas na estufa ${greenhouse}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">As caixas serão convertidas em mudas com arredondamento para o inteiro mais próximo.</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <Checkbox
              id={`chrys-absent-${record.id}`}
              checked={isAbsent}
              onCheckedChange={(checked) => setIsAbsent(checked === true)}
              aria-label="Marcar funcionário como ausente"
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor={`chrys-absent-${record.id}`} className="cursor-pointer font-medium text-orange-800">
                Funcionário ausente
              </Label>
              {isAbsent && (
                <Textarea
                  value={absenceReason}
                  onChange={(event) => setAbsenceReason(event.target.value)}
                  placeholder="Motivo da ausência"
                  rows={2}
                  className="mt-2 resize-none rounded-lg bg-white"
                  aria-label="Motivo da ausência"
                />
              )}
            </div>
          </div>

          {!isAbsent && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`chrys-discount-${record.id}`}>Desconto de caixas</Label>
                <Input
                  id={`chrys-discount-${record.id}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={discountBoxes}
                  onChange={(event) => setDiscountBoxes(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`chrys-discount-reason-${record.id}`}>Motivo do desconto</Label>
                <Input
                  id={`chrys-discount-reason-${record.id}`}
                  value={discountReason}
                  onChange={(event) => setDiscountReason(event.target.value)}
                  placeholder="Opcional quando não há desconto"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={updateRecord.isPending} className="rounded-xl gap-2">
            <Check className="h-4 w-4" aria-hidden="true" />
            {updateRecord.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SunflowerEditor({
  record,
  employees,
  open,
  onOpenChange,
}: {
  record: SunflowerManageRecord;
  employees: EmployeeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [employeeId, setEmployeeId] = useState(String(record.employeeId));
  const [plantingDate, setPlantingDate] = useState(toDateInputValue(record.plantingDate));
  const [trays, setTrays] = useState(String(record.trays));
  const [discountTrays, setDiscountTrays] = useState(String(record.discountTrays));
  const [discountReason, setDiscountReason] = useState(record.discountReason ?? "");
  const [isAbsent, setIsAbsent] = useState(Boolean(record.absenceReason));
  const [absenceReason, setAbsenceReason] = useState(record.absenceReason ?? "");

  useEffect(() => {
    if (!open) return;
    setEmployeeId(String(record.employeeId));
    setPlantingDate(toDateInputValue(record.plantingDate));
    setTrays(String(record.trays));
    setDiscountTrays(String(record.discountTrays));
    setDiscountReason(record.discountReason ?? "");
    setIsAbsent(Boolean(record.absenceReason));
    setAbsenceReason(record.absenceReason ?? "");
  }, [open, record]);

  const updateRecord = trpc.sunflower.updateRecord.useMutation({
    onSuccess: () => {
      invalidateManagementQueries(utils);
      toast.success("Lançamento de girassol atualizado.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    if (!employeeId) {
      toast.error("Selecione o funcionário.");
      return;
    }
    if (!plantingDate) {
      toast.error("Informe a data do plantio.");
      return;
    }

    const parsedTrays = Number(trays);
    const parsedDiscount = Number(discountTrays);
    if (!isAbsent && (!Number.isInteger(parsedTrays) || parsedTrays <= 0)) {
      toast.error("A quantidade de bandejas deve ser um inteiro maior que zero, ou marque ausência.");
      return;
    }
    if (!Number.isInteger(parsedDiscount) || parsedDiscount < 0) {
      toast.error("O desconto deve ser um inteiro igual ou maior que zero.");
      return;
    }
    if (isAbsent && !absenceReason.trim()) {
      toast.error("Informe o motivo da ausência.");
      return;
    }
    if (!isAbsent && parsedDiscount > parsedTrays) {
      toast.error("O desconto não pode superar as bandejas plantadas.");
      return;
    }
    if (!isAbsent && parsedDiscount > 0 && !discountReason.trim()) {
      toast.error("Informe o motivo do desconto.");
      return;
    }

    updateRecord.mutate({
      id: record.id,
      employeeId: Number(employeeId),
      plantingDate,
      trays: isAbsent ? 0 : parsedTrays,
      discountTrays: isAbsent ? 0 : parsedDiscount,
      discountReason: !isAbsent && discountReason.trim() ? discountReason.trim() : undefined,
      absenceReason: isAbsent ? absenceReason.trim() : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Sun className="h-5 w-5" aria-hidden="true" />
            Editar lançamento de girassol
          </DialogTitle>
          <DialogDescription>
            Ajuste os dados do plantio. O status de confirmação será redefinido pelo servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`sun-employee-${record.id}`}>Funcionário</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id={`sun-employee-${record.id}`} className="h-11 rounded-xl">
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`sun-date-${record.id}`}>Data do plantio</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`sun-date-${record.id}`}
                type="date"
                value={plantingDate}
                onChange={(event) => setPlantingDate(event.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`sun-trays-${record.id}`}>Bandejas</Label>
              <Input
                id={`sun-trays-${record.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={trays}
                onChange={(event) => setTrays(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`sun-discount-${record.id}`}>Desconto de bandejas</Label>
              <Input
                id={`sun-discount-${record.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={discountTrays}
                onChange={(event) => setDiscountTrays(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`sun-discount-reason-${record.id}`}>Motivo do desconto</Label>
            <Input
              id={`sun-discount-reason-${record.id}`}
              value={discountReason}
              onChange={(event) => setDiscountReason(event.target.value)}
              placeholder="Opcional quando não há desconto"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <Checkbox
              id={`sun-absent-${record.id}`}
              checked={isAbsent}
              onCheckedChange={(checked) => setIsAbsent(checked === true)}
              aria-label="Marcar funcionário como ausente"
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor={`sun-absent-${record.id}`} className="cursor-pointer font-medium text-orange-800">
                Funcionário ausente
              </Label>
              {isAbsent && (
                <Textarea
                  value={absenceReason}
                  onChange={(event) => setAbsenceReason(event.target.value)}
                  placeholder="Motivo da ausência"
                  rows={2}
                  className="mt-2 resize-none rounded-lg bg-white"
                  aria-label="Motivo da ausência"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={updateRecord.isPending} className="rounded-xl gap-2 bg-amber-600 text-white hover:bg-amber-700">
            <Check className="h-4 w-4" aria-hidden="true" />
            {updateRecord.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChrysanthemumActions({ record, employees }: { record: ChrysanthemumManageRecord; employees: EmployeeOption[] }) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteRecord = trpc.chrysanthemum.deleteRecord.useMutation({
    onSuccess: () => {
      invalidateManagementQueries(utils);
      toast.success("Lançamento de crisântemo excluído.");
      setDeleteOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <ActionButtons
        label="lançamento de crisântemo"
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        isDeleting={deleteRecord.isPending}
      />
      <ChrysanthemumEditor record={record} employees={employees} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Excluir lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O lançamento será apagado definitivamente
              {record.sessionId != null ? " e o total da sessão vinculada será recalculado pelo servidor" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecord.isPending} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteRecord.isPending}
              onClick={() => deleteRecord.mutate({ id: record.id })}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecord.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SunflowerActions({ record, employees }: { record: SunflowerManageRecord; employees: EmployeeOption[] }) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteRecord = trpc.sunflower.deleteRecord.useMutation({
    onSuccess: () => {
      invalidateManagementQueries(utils);
      toast.success("Lançamento de girassol excluído.");
      setDeleteOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <ActionButtons
        label="lançamento de girassol"
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        isDeleting={deleteRecord.isPending}
      />
      <SunflowerEditor record={record} employees={employees} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Excluir lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O lançamento de girassol será apagado definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecord.isPending} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteRecord.isPending}
              onClick={() => deleteRecord.mutate({ id: record.id })}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecord.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PlantingRecordActions(props: PlantingRecordActionsProps) {
  if (props.kind === "chrysanthemum") {
    return <ChrysanthemumActions record={props.record} employees={props.employees} />;
  }
  return <SunflowerActions record={props.record} employees={props.employees} />;
}

export type { PlantingRecordActionsProps };
