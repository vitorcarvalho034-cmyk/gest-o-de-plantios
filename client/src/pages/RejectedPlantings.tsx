import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle, Flower2, Sun, Pencil, X, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type GreenhouseEntry = { greenhouse: number; seedlingsSent: number; seedlings: number };

export default function RejectedPlantings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.rejected.list.useQuery();

  const [editingChrys, setEditingChrys] = useState<null | {
    id: number; employeeName?: string; greenhouses: GreenhouseEntry[];
    discountBoxes: number; discountReason: string; absenceReason: string;
  }>(null);

  const [editingSunflower, setEditingSunflower] = useState<null | {
    id: number; employeeName?: string;
    trays: number; discountTrays: number; discountReason: string; absenceReason: string;
  }>(null);

  const editChrys = trpc.rejected.editChrysanthemum.useMutation({
    onSuccess: () => {
      toast.success("Lançamento corrigido e reenviado para confirmação!");
      utils.rejected.list.invalidate();
      setEditingChrys(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const editSunflower = trpc.rejected.editSunflower.useMutation({
    onSuccess: () => {
      toast.success("Lançamento corrigido e reenviado para confirmação!");
      utils.rejected.list.invalidate();
      setEditingSunflower(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const totalRejected = (data?.chrysanthemum?.length ?? 0) + (data?.sunflower?.length ?? 0);

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertTriangle size={20} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#14532d" }}>Contestações</h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
            {totalRejected === 0 ? "Nenhuma pendente" : `${totalRejected} lançamento${totalRejected > 1 ? "s" : ""} contestado${totalRejected > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Carregando...</div>
      ) : totalRejected === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
          <p style={{ color: "#6b7280", fontSize: "15px" }}>Nenhum lançamento contestado no momento.</p>
        </div>
      ) : (
        <>
          {/* Crisântemo */}
          {(data?.chrysanthemum?.length ?? 0) > 0 && (
            <section style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Flower2 size={16} color="#16a34a" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Crisântemo ({data!.chrysanthemum.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data!.chrysanthemum.map((p) => {
                  const greenhouses = p.greenhouses as GreenhouseEntry[];
                  return (
                    <div key={p.id} style={{ background: "white", border: "1.5px solid #fecaca", borderRadius: "12px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "#111827" }}>
                            Funcionário #{p.employeeId}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                            {format(new Date(p.plantingDate), "dd/MM/yyyy", { locale: ptBR })} · {p.totalBoxes} caixas
                          </p>
                          {p.confirmRejectionReason && (
                            <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                              <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>
                                Motivo da contestação:
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#7f1d1d" }}>
                                {p.confirmRejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingChrys({
                            id: p.id,
                            greenhouses: greenhouses,
                            discountBoxes: p.discountBoxes,
                            discountReason: p.discountReason ?? "",
                            absenceReason: p.absenceReason ?? "",
                          })}
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                        >
                          <Pencil size={13} /> Corrigir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Girassol */}
          {(data?.sunflower?.length ?? 0) > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Sun size={16} color="#d97706" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Girassol ({data!.sunflower.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data!.sunflower.map((p) => (
                  <div key={p.id} style={{ background: "white", border: "1.5px solid #fde68a", borderRadius: "12px", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "#111827" }}>
                          Funcionário #{p.employeeId}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                          {format(new Date(p.plantingDate), "dd/MM/yyyy", { locale: ptBR })} · {p.trays} bandejas
                        </p>
                        {p.confirmRejectionReason && (
                          <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#d97706", fontWeight: 600 }}>Motivo da contestação:</p>
                            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#78350f" }}>{p.confirmRejectionReason}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingSunflower({
                          id: p.id,
                          trays: p.trays,
                          discountTrays: p.discountTrays,
                          discountReason: p.discountReason ?? "",
                          absenceReason: p.absenceReason ?? "",
                        })}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#d97706", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                      >
                        <Pencil size={13} /> Corrigir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal: Editar Crisântemo */}
      {editingChrys && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#14532d" }}>Corrigir — Crisântemo</h2>
              <button onClick={() => setEditingChrys(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            {/* Estufas */}
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "10px" }}>Estufas</p>
            {editingChrys.greenhouses.map((g, i) => (
              <div key={i} style={{ background: "#f0fdf4", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: "13px", color: "#16a34a" }}>Estufa {g.greenhouse}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Mudas enviadas</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={g.seedlingsSent}
                      onChange={e => {
                        const updated = editingChrys.greenhouses.map((gh, idx) =>
                          idx === i ? { ...gh, seedlingsSent: Number(e.target.value) } : gh
                        );
                        setEditingChrys(prev => prev ? { ...prev, greenhouses: updated } : null);
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Mudas plantadas</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={g.seedlings}
                      onChange={e => {
                        const updated = editingChrys.greenhouses.map((gh, idx) =>
                          idx === i ? { ...gh, seedlings: Number(e.target.value) } : gh
                        );
                        setEditingChrys(prev => prev ? { ...prev, greenhouses: updated } : null);
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Desconto */}
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Desconto (caixas)</label>
              <input
                type="number"
                inputMode="numeric"
                value={editingChrys.discountBoxes}
                onChange={e => setEditingChrys(prev => prev ? { ...prev, discountBoxes: Number(e.target.value) } : null)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "15px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginTop: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Motivo do desconto</label>
              <textarea
                value={editingChrys.discountReason}
                onChange={e => setEditingChrys(prev => prev ? { ...prev, discountReason: e.target.value } : null)}
                rows={2}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", resize: "none" }}
              />
            </div>

            {/* Resumo */}
            <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "12px", marginTop: "12px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>
                Total plantado: {editingChrys.greenhouses.reduce((s, g) => s + g.seedlings, 0).toLocaleString()} mudas
                = {Math.floor(editingChrys.greenhouses.reduce((s, g) => s + g.seedlings, 0) / 1000) - editingChrys.discountBoxes} caixas líquidas
              </p>
            </div>

            <button
              onClick={() => editChrys.mutate({
                id: editingChrys.id,
                greenhouses: editingChrys.greenhouses.map(g => ({ ...g, greenhouse: g.greenhouse as 1|2|3|4 })),
                discountBoxes: editingChrys.discountBoxes,
                discountReason: editingChrys.discountReason || undefined,
              })}
              disabled={editChrys.isPending}
              style={{ width: "100%", marginTop: "16px", padding: "13px", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
            >
              {editChrys.isPending ? "Salvando..." : "Salvar e Reenviar para Confirmação"}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Editar Girassol */}
      {editingSunflower && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#14532d" }}>Corrigir — Girassol</h2>
              <button onClick={() => setEditingSunflower(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Bandejas plantadas</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editingSunflower.trays}
                  onChange={e => setEditingSunflower(prev => prev ? { ...prev, trays: Number(e.target.value) } : null)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Desconto (bandejas)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editingSunflower.discountTrays}
                  onChange={e => setEditingSunflower(prev => prev ? { ...prev, discountTrays: Number(e.target.value) } : null)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Motivo do desconto</label>
                <textarea
                  value={editingSunflower.discountReason}
                  onChange={e => setEditingSunflower(prev => prev ? { ...prev, discountReason: e.target.value } : null)}
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", resize: "none" }}
                />
              </div>
            </div>

            <div style={{ background: "#fffbeb", borderRadius: "10px", padding: "12px", marginTop: "12px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#d97706", fontWeight: 600 }}>
                Bandejas líquidas: {editingSunflower.trays - editingSunflower.discountTrays}
              </p>
            </div>

            <button
              onClick={() => editSunflower.mutate({
                id: editingSunflower.id,
                trays: editingSunflower.trays,
                discountTrays: editingSunflower.discountTrays,
                discountReason: editingSunflower.discountReason || undefined,
              })}
              disabled={editSunflower.isPending}
              style={{ width: "100%", marginTop: "16px", padding: "13px", background: "linear-gradient(135deg,#d97706,#b45309)", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
            >
              {editSunflower.isPending ? "Salvando..." : "Salvar e Reenviar para Confirmação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
