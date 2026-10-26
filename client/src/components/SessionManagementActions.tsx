import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ListChecks, Pencil, Trash2 } from "lucide-react";
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

export type SessionGreenhouse = {
  greenhouse: number;
  seedlingsSent: number;
};

export type SessionToManage = {
  id: number;
  plantingDate: Date | string;
  status: string;
  totalSeedlingsSent: number;
  totalSeedlingsPlanted: number;
  greenhouses: SessionGreenhouse[];
  plantings: Array<{ id: number }>;
};

const GREENHOUSES = [1, 2, 3, 4] as const;
const SEEDLINGS_PER_BOX = 1000;

function seedlingsToBoxes(seedlings: number) {
  return (seedlings / SEEDLINGS_PER_BOX).toFixed(3).replace(/\.?0+$/, "");
}

type GreenhouseNumber = (typeof GREENHOUSES)[number];


function invalidateSessionQueries(utils: ReturnType<typeof trpc.useUtils>) {
  void utils.session.manageList.invalidate();
  void utils.session.listOpen.invalidate();
  void utils.session.getWithPlantings.invalidate();
  void utils.reconciliation.bySession.invalidate();
  void utils.reconciliation.byGreenhouse.invalidate();
  void utils.reconciliation.byDate.invalidate();
  void utils.chrysanthemum.manageAll.invalidate();
  void utils.chrysanthemum.adminAll.invalidate();
}

function SessionEditor({
  session,
  open,
  onOpenChange,
}: {
  session: SessionToManage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [plantingDate, setPlantingDate] = useState(toDateInputValue(session.plantingDate));
  const [selectedGreenhouses, setSelectedGreenhouses] = useState<Set<GreenhouseNumber>>(
    () => new Set(session.greenhouses.map((entry) => entry.greenhouse as GreenhouseNumber))
  );
  const [boxesByGreenhouse, setBoxesByGreenhouse] = useState<Record<GreenhouseNumber, string>>(() => {
    const values: Record<GreenhouseNumber, string> = { 1: "", 2: "", 3: "", 4: "" };
    session.greenhouses.forEach((entry) => {
      const greenhouse = entry.greenhouse as GreenhouseNumber;
      values[greenhouse] = seedlingsToBoxes(entry.seedlingsSent);
    });
    return values;
  });

  useEffect(() => {
    if (!open) return;
    setPlantingDate(toDateInputValue(session.plantingDate));
    setSelectedGreenhouses(new Set(session.greenhouses.length ? session.greenhouses.map((entry) => entry.greenhouse as GreenhouseNumber) : [1 as GreenhouseNumber]));
    const values: Record<GreenhouseNumber, string> = { 1: "", 2: "", 3: "", 4: "" };
    session.greenhouses.forEach((entry) => {
      const greenhouse = entry.greenhouse as GreenhouseNumber;
      values[greenhouse] = seedlingsToBoxes(entry.seedlingsSent);
    });
    setBoxesByGreenhouse(values);
  }, [open, session]);

  const updateSession = trpc.session.update.useMutation({
    onSuccess: () => {
      invalidateSessionQueries(utils);
      toast.success("Sessão atualizada.");
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
    if (!plantingDate) {
      toast.error("Informe a data da sessão.");
      return;
    }
    if (selectedEntries.length === 0) {
      toast.error("Selecione pelo menos uma estufa.");
      return;
    }

    const entries = selectedEntries.map((greenhouse) => ({
      greenhouse,
      boxes: Number(boxesByGreenhouse[greenhouse]),
    }));
    if (entries.some((entry) => !Number.isFinite(entry.boxes) || entry.boxes <= 0 || Math.abs(entry.boxes * SEEDLINGS_PER_BOX - Math.round(entry.boxes * SEEDLINGS_PER_BOX)) >= 1e-6)) {
      toast.error("Informe uma quantidade positiva de caixas, com até três casas decimais, para cada estufa.");
      return;
    }

    updateSession.mutate({
      id: session.id,
      plantingDate,
      greenhouses: entries,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
            Editar sessão de plantio
          </DialogTitle>
          <DialogDescription>
            Ajuste a data e as caixas enviadas para cada estufa. O servidor recalculará os totais da sessão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`session-date-${session.id}`}>Data da sessão</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`session-date-${session.id}`}
                type="date"
                value={plantingDate}
                onChange={(event) => setPlantingDate(event.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estufas e caixas enviadas</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GREENHOUSES.map((greenhouse) => {
                const checked = selectedGreenhouses.has(greenhouse);
                return (
                  <label
                    key={greenhouse}
                    htmlFor={`session-gh-${session.id}-${greenhouse}`}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors ${
                      checked ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-border bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      id={`session-gh-${session.id}-${greenhouse}`}
                      checked={checked}
                      onCheckedChange={() => toggleGreenhouse(greenhouse)}
                      aria-label={`Selecionar estufa ${greenhouse}`}
                    />
                    <span className="font-medium">Estufa {greenhouse}</span>
                  </label>
                );
              })}
            </div>
            {selectedEntries.length > 0 && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                {selectedEntries.map((greenhouse) => (
                  <div key={greenhouse} className="space-y-1">
                    <Label htmlFor={`session-boxes-${session.id}-${greenhouse}`} className="text-xs text-emerald-800">
                      Estufa {greenhouse} — caixas enviadas
                    </Label>
                    <Input
                      id={`session-boxes-${session.id}-${greenhouse}`}
                      type="number"
                      inputMode="decimal"
                      min="0.001"
                      step="0.001"
                      value={boxesByGreenhouse[greenhouse]}
                      onChange={(event) =>
                        setBoxesByGreenhouse((current) => ({ ...current, [greenhouse]: event.target.value }))
                      }
                      className="h-10 rounded-lg bg-white"
                      aria-label={`Caixas enviadas para a estufa ${greenhouse}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={updateSession.isPending} className="rounded-xl gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Check className="h-4 w-4" aria-hidden="true" />
            {updateSession.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SessionManagementActions({ session }: { session: SessionToManage }) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteSession = trpc.session.delete.useMutation({
    onSuccess: () => {
      invalidateSessionQueries(utils);
      toast.success("Sessão excluída.");
      setDeleteOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <div className="flex items-center justify-end gap-2 border-t border-emerald-100 bg-emerald-50/30 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="h-9 rounded-lg gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          aria-label={`Editar sessão de ${session.id}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Editar</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={deleteSession.isPending}
          className="h-9 rounded-lg gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          aria-label={`Excluir sessão de ${session.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Excluir</span>
        </Button>
      </div>

      <SessionEditor session={session} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Excluir sessão definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível: a sessão será apagada junto com todos os lançamentos de crisântemo vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSession.isPending} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSession.isPending}
              onClick={() => deleteSession.mutate({ id: session.id })}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSession.isPending ? "Excluindo..." : "Excluir sessão e lançamentos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
