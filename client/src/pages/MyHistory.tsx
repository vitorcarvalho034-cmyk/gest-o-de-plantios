import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flower2, Sun, Package, Layers, Calendar, AlertCircle, TrendingDown, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type GreenhouseEntry = { greenhouse: 1 | 2 | 3 | 4; seedlingsSent?: number; seedlings: number };

function formatDate(d: Date | string) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

function ConfirmStatusBadge({ status }: { status: string | null | undefined }) {
  if (status === "confirmed") return (
    <Badge className="text-xs bg-green-100 text-green-700 border-green-200 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Confirmado
    </Badge>
  );
  if (status === "rejected") return (
    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
      <XCircle className="w-3 h-3" /> Contestado
    </Badge>
  );
  return (
    <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
      <Clock className="w-3 h-3" /> Pendente
    </Badge>
  );
}

function ChrysCard({
  p,
  onConfirm,
  onReject,
}: {
  p: {
    id: number;
    plantingDate: Date | string;
    greenhouses: unknown;
    totalSeedlingsSent?: number;
    totalSeedlings: number;
    totalBoxes: number;
    discountBoxes: number;
    discountReason?: string | null;
    absenceReason?: string | null;
    confirmStatus?: string | null;
    confirmRejectionReason?: string | null;
  };
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ghs = p.greenhouses as GreenhouseEntry[];
  const net = p.totalBoxes - p.discountBoxes;
  const hasNotes = p.discountReason || p.absenceReason || p.confirmRejectionReason;
  const isPending = !p.confirmStatus || p.confirmStatus === "pending";

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm overflow-hidden",
      p.confirmStatus === "confirmed" ? "border-green-200" :
      p.confirmStatus === "rejected" ? "border-red-200" : "border-border"
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Flower2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{formatDate(p.plantingDate)}</span>
            {ghs.map((g, i) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">E{g.greenhouse}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {p.totalSeedlingsSent != null && p.totalSeedlingsSent > 0 && (
              <span className="text-xs text-blue-600 font-medium">📦 {p.totalSeedlingsSent.toLocaleString()} env.</span>
            )}
            <span className="text-xs text-green-700 font-medium">🌱 {p.totalSeedlings.toLocaleString()} plant.</span>
            <ConfirmStatusBadge status={p.confirmStatus} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-primary">{net}</p>
          <p className="text-xs text-muted-foreground">caixas</p>
        </div>
        {(hasNotes || p.discountBoxes > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="flex border-t border-border/60">
        <div className="flex-1 py-2.5 text-center border-r border-border/60">
          <p className="text-xs text-muted-foreground">Bruto</p>
          <p className="text-sm font-semibold">{p.totalBoxes}</p>
        </div>
        <div className="flex-1 py-2.5 text-center border-r border-border/60">
          <p className="text-xs text-muted-foreground">Desconto</p>
          <p className={cn("text-sm font-semibold", p.discountBoxes > 0 ? "text-destructive" : "text-muted-foreground")}>
            {p.discountBoxes > 0 ? `-${p.discountBoxes}` : "—"}
          </p>
        </div>
        <div className="flex-1 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">Líquido</p>
          <p className="text-sm font-bold text-green-700">{net}</p>
        </div>
      </div>

      {/* Expanded notes */}
      {expanded && (
        <div className="border-t border-border/60 px-4 py-3 bg-muted/30 space-y-2">
          {p.discountReason && (
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive">Motivo do desconto</p>
                <p className="text-xs text-foreground">{p.discountReason}</p>
              </div>
            </div>
          )}
          {p.absenceReason && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-600">Motivo de ausência</p>
                <p className="text-xs text-foreground">{p.absenceReason}</p>
              </div>
            </div>
          )}
          {p.confirmRejectionReason && (
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-600">Motivo da contestação</p>
                <p className="text-xs text-foreground">{p.confirmRejectionReason}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation buttons — only for pending */}
      {isPending && (
        <div className="border-t border-border/60 p-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(p.id)}
            className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(p.id)}
            className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl gap-1.5 text-xs font-semibold"
          >
            <XCircle className="w-4 h-4" /> Contestar
          </Button>
        </div>
      )}
    </div>
  );
}

function SunCard({
  p,
  onConfirm,
  onReject,
}: {
  p: {
    id: number;
    plantingDate: Date | string;
    trays: number;
    discountTrays: number;
    discountReason?: string | null;
    absenceReason?: string | null;
    confirmStatus?: string | null;
    confirmRejectionReason?: string | null;
  };
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const net = p.trays - p.discountTrays;
  const hasNotes = p.discountReason || p.absenceReason || p.confirmRejectionReason;
  const isPending = !p.confirmStatus || p.confirmStatus === "pending";

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm overflow-hidden",
      p.confirmStatus === "confirmed" ? "border-green-200" :
      p.confirmStatus === "rejected" ? "border-red-200" : "border-amber-200"
    )}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sun className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{formatDate(p.plantingDate)}</span>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Girassol</p>
            <ConfirmStatusBadge status={p.confirmStatus} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-amber-600">{net}</p>
          <p className="text-xs text-muted-foreground">bandejas</p>
        </div>
        {(hasNotes || p.discountTrays > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="flex border-t border-amber-100">
        <div className="flex-1 py-2.5 text-center border-r border-amber-100">
          <p className="text-xs text-muted-foreground">Bruto</p>
          <p className="text-sm font-semibold">{p.trays}</p>
        </div>
        <div className="flex-1 py-2.5 text-center border-r border-amber-100">
          <p className="text-xs text-muted-foreground">Desconto</p>
          <p className={cn("text-sm font-semibold", p.discountTrays > 0 ? "text-destructive" : "text-muted-foreground")}>
            {p.discountTrays > 0 ? `-${p.discountTrays}` : "—"}
          </p>
        </div>
        <div className="flex-1 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">Líquido</p>
          <p className="text-sm font-bold text-amber-700">{net}</p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-amber-100 px-4 py-3 bg-amber-50/50 space-y-2">
          {p.discountReason && (
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive">Motivo do desconto</p>
                <p className="text-xs text-foreground">{p.discountReason}</p>
              </div>
            </div>
          )}
          {p.absenceReason && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-600">Motivo de ausência</p>
                <p className="text-xs text-foreground">{p.absenceReason}</p>
              </div>
            </div>
          )}
          {p.confirmRejectionReason && (
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-600">Motivo da contestação</p>
                <p className="text-xs text-foreground">{p.confirmRejectionReason}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isPending && (
        <div className="border-t border-amber-100 p-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(p.id)}
            className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(p.id)}
            className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl gap-1.5 text-xs font-semibold"
          >
            <XCircle className="w-4 h-4" /> Contestar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyHistory() {
  const { employee } = useEmployeeAuth();
  const utils = trpc.useUtils();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; type: "chrysanthemum" | "sunflower"; id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: chrysHistory, isLoading: chrysLoading } = trpc.chrysanthemum.myHistory.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: !!employee }
  );
  const { data: sunHistory, isLoading: sunLoading } = trpc.sunflower.myHistory.useQuery(
    { from: from || undefined, to: to || undefined },
    { enabled: !!employee }
  );

  const chrysConfirm = trpc.chrysanthemum.confirm.useMutation({
    onSuccess: () => {
      toast.success("✅ Lançamento confirmado!");
      utils.chrysanthemum.myHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const chrysReject = trpc.chrysanthemum.reject.useMutation({
    onSuccess: () => {
      toast.success("Contestação registrada.");
      setRejectDialog(null);
      setRejectReason("");
      utils.chrysanthemum.myHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sunConfirm = trpc.sunflower.confirm.useMutation({
    onSuccess: () => {
      toast.success("✅ Lançamento confirmado!");
      utils.sunflower.myHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sunReject = trpc.sunflower.reject.useMutation({
    onSuccess: () => {
      toast.success("Contestação registrada.");
      setRejectDialog(null);
      setRejectReason("");
      utils.sunflower.myHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = (type: "chrysanthemum" | "sunflower", id: number) => {
    if (type === "chrysanthemum") chrysConfirm.mutate({ id });
    else sunConfirm.mutate({ id });
  };

  const handleOpenReject = (type: "chrysanthemum" | "sunflower", id: number) => {
    setRejectDialog({ open: true, type, id });
    setRejectReason("");
  };

  const handleSubmitReject = () => {
    if (!rejectReason.trim()) { toast.error("Informe o motivo da contestação"); return; }
    if (!rejectDialog) return;
    if (rejectDialog.type === "chrysanthemum") chrysReject.mutate({ id: rejectDialog.id, reason: rejectReason });
    else sunReject.mutate({ id: rejectDialog.id, reason: rejectReason });
  };

  const totalChrysNet = chrysHistory?.reduce((s, p) => s + p.totalBoxes - p.discountBoxes, 0) ?? 0;
  const totalSunNet = sunHistory?.reduce((s, p) => s + p.trays - p.discountTrays, 0) ?? 0;
  const pendingCount = (chrysHistory?.filter(p => !p.confirmStatus || p.confirmStatus === "pending").length ?? 0)
    + (sunHistory?.filter(p => !p.confirmStatus || p.confirmStatus === "pending").length ?? 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Meu Histórico</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Seus registros de plantio</p>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {pendingCount} lançamento{pendingCount > 1 ? "s" : ""} aguardando sua confirmação
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">Verifique se as informações estão corretas e confirme ou conteste.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Crisântemo</span>
          </div>
          <p className="text-3xl font-bold text-primary">{totalChrysNet}</p>
          <p className="text-xs text-muted-foreground mt-0.5">caixas (líquido)</p>
        </div>
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Girassol</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{totalSunNet}</p>
          <p className="text-xs text-muted-foreground mt-0.5">bandejas (líquido)</p>
        </div>
      </div>

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

      {/* Tabs */}
      <Tabs defaultValue="chrysanthemum">
        <TabsList className="grid grid-cols-2 w-full h-12 bg-muted/60 rounded-xl">
          <TabsTrigger
            value="chrysanthemum"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
          >
            <Flower2 className="w-4 h-4" />
            Crisântemo
            {chrysHistory && chrysHistory.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                {chrysHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sunflower"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white font-medium"
          >
            <Sun className="w-4 h-4" />
            Girassol
            {sunHistory && sunHistory.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-white/20 text-white border-0">
                {sunHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chrysanthemum" className="mt-4 space-y-3">
          {chrysLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {!chrysLoading && (!chrysHistory || chrysHistory.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Flower2 className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Seus plantios de crisântemo aparecerão aqui</p>
            </div>
          )}
          {chrysHistory?.map((p) => (
            <ChrysCard
              key={p.id}
              p={p}
              onConfirm={(id) => handleConfirm("chrysanthemum", id)}
              onReject={(id) => handleOpenReject("chrysanthemum", id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="sunflower" className="mt-4 space-y-3">
          {sunLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {!sunLoading && (!sunHistory || sunHistory.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Sun className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Seus plantios de girassol aparecerão aqui</p>
            </div>
          )}
          {sunHistory?.map((p) => (
            <SunCard
              key={p.id}
              p={p}
              onConfirm={(id) => handleConfirm("sunflower", id)}
              onReject={(id) => handleOpenReject("sunflower", id)}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectDialog?.open} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectReason(""); } }}>
        <DialogContent className="mx-4 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Contestar Lançamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Informe o motivo pelo qual as informações deste lançamento estão incorretas. O administrador será notificado.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Motivo da contestação *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: A quantidade de caixas está errada, foram plantadas apenas 5 caixas e não 8..."
                rows={4}
                className="resize-none rounded-xl text-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setRejectDialog(null); setRejectReason(""); }}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReject}
              disabled={chrysReject.isPending || sunReject.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {chrysReject.isPending || sunReject.isPending ? "Enviando..." : "Enviar Contestação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
