import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users, Plus, Pencil, KeyRound, ToggleLeft, ToggleRight, X, Check, Shield, Leaf, Tractor
} from "lucide-react";

type Role = "employee" | "launcher" | "admin";

const ROLE_LABELS: Record<Role, string> = {
  employee: "Funcionário",
  launcher: "Lançador",
  admin: "Administrador",
};

const ROLE_COLORS: Record<Role, string> = {
  employee: "#16a34a",
  launcher: "#0369a1",
  admin: "#7c3aed",
};

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  employee: <Leaf size={14} />,
  launcher: <Tractor size={14} />,
  admin: <Shield size={14} />,
};

type Employee = {
  id: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: Date;
};

export default function UserManagement() {
  const utils = trpc.useUtils();
  const { data: employees, isLoading } = trpc.users.list.useQuery();

  // Modais
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [resetingUser, setResetingUser] = useState<Employee | null>(null);

  // Formulário de criação
  const [createForm, setCreateForm] = useState({ name: "", username: "", password: "", role: "employee" as Role });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Formulário de edição
  const [editForm, setEditForm] = useState({ name: "", username: "", role: "employee" as Role });

  // Formulário de reset de senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.users.list.invalidate();
      setShowCreate(false);
      setCreateForm({ name: "", username: "", password: "", role: "employee" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado!");
      utils.users.list.invalidate();
      setEditingUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setResetingUser(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.active ? "Usuário ativado!" : "Usuário desativado!");
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function validateCreate() {
    const errs: Record<string, string> = {};
    if (!createForm.name || createForm.name.length < 2) errs.name = "Nome obrigatório (mín. 2 caracteres)";
    if (!createForm.username || createForm.username.length < 3) errs.username = "Usuário mínimo 3 caracteres";
    if (!/^[a-z0-9_]+$/.test(createForm.username)) errs.username = "Apenas letras minúsculas, números e _";
    if (!createForm.password || createForm.password.length < 4) errs.password = "Senha mínima 4 caracteres";
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleCreate() {
    if (!validateCreate()) return;
    createMutation.mutate(createForm);
  }

  function openEdit(emp: Employee) {
    setEditForm({ name: emp.name, username: emp.username, role: emp.role });
    setEditingUser(emp);
  }

  function handleUpdate() {
    if (!editingUser) return;
    updateMutation.mutate({ id: editingUser.id, name: editForm.name, username: editForm.username, role: editForm.role });
  }

  function handleResetPassword() {
    if (!resetingUser) return;
    if (newPassword.length < 4) { toast.error("Senha mínima 4 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("Senhas não conferem"); return; }
    resetPasswordMutation.mutate({ id: resetingUser.id, newPassword });
  }

  const active = employees?.filter(e => e.active) ?? [];
  const inactive = employees?.filter(e => !e.active) ?? [];

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#16a34a,#15803d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={20} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#14532d" }}>Usuários</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{employees?.length ?? 0} cadastrados</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "white", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Carregando...</div>
      ) : (
        <>
          {/* Ativos */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              Ativos ({active.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {active.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp as Employee}
                  onEdit={openEdit}
                  onReset={e => { setResetingUser(e); setNewPassword(""); setConfirmPassword(""); }}
                  onToggle={e => toggleActiveMutation.mutate({ id: e.id, active: false })}
                  toggleLabel="Desativar"
                  toggleIcon={<ToggleRight size={15} />}
                  toggleColor="#dc2626"
                />
              ))}
            </div>
          </div>

          {/* Inativos */}
          {inactive.length > 0 && (
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Inativos ({inactive.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {inactive.map(emp => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp as Employee}
                    onEdit={openEdit}
                    onReset={e => { setResetingUser(e); setNewPassword(""); setConfirmPassword(""); }}
                    onToggle={e => toggleActiveMutation.mutate({ id: e.id, active: true })}
                    toggleLabel="Ativar"
                    toggleIcon={<ToggleLeft size={15} />}
                    toggleColor="#16a34a"
                    dimmed
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Criar usuário */}
      {showCreate && (
        <Modal title="Novo Usuário" onClose={() => setShowCreate(false)}>
          <FormField label="Nome completo" error={createErrors.name}>
            <input
              value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: João Silva"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Usuário (login)" error={createErrors.username}>
            <input
              value={createForm.username}
              onChange={e => setCreateForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
              placeholder="Ex: joao_silva"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Senha" error={createErrors.password}>
            <input
              type="password"
              value={createForm.password}
              onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 4 caracteres"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Perfil">
            <RoleSelect value={createForm.role} onChange={r => setCreateForm(f => ({ ...f, role: r }))} />
          </FormField>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            style={{ ...btnPrimary, width: "100%", marginTop: "8px" }}
          >
            {createMutation.isPending ? "Criando..." : "Criar Usuário"}
          </button>
        </Modal>
      )}

      {/* Modal: Editar usuário */}
      {editingUser && (
        <Modal title={`Editar — ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <FormField label="Nome completo">
            <input
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Usuário (login)">
            <input
              value={editForm.username}
              onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Perfil">
            <RoleSelect value={editForm.role} onChange={r => setEditForm(f => ({ ...f, role: r }))} />
          </FormField>
          <button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            style={{ ...btnPrimary, width: "100%", marginTop: "8px" }}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </Modal>
      )}

      {/* Modal: Redefinir senha */}
      {resetingUser && (
        <Modal title={`Redefinir Senha — ${resetingUser.name}`} onClose={() => setResetingUser(null)}>
          <FormField label="Nova senha">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Confirmar nova senha">
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              style={inputStyle}
            />
          </FormField>
          <button
            onClick={handleResetPassword}
            disabled={resetPasswordMutation.isPending}
            style={{ ...btnPrimary, width: "100%", marginTop: "8px", background: "linear-gradient(135deg,#0369a1,#0284c7)" }}
          >
            {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmployeeCard({
  emp, onEdit, onReset, onToggle, toggleLabel, toggleIcon, toggleColor, dimmed
}: {
  emp: Employee;
  onEdit: (e: Employee) => void;
  onReset: (e: Employee) => void;
  onToggle: (e: Employee) => void;
  toggleLabel: string;
  toggleIcon: React.ReactNode;
  toggleColor: string;
  dimmed?: boolean;
}) {
  const role = emp.role as Role;
  return (
    <div style={{
      background: dimmed ? "#f9fafb" : "white",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "14px 16px",
      opacity: dimmed ? 0.7 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: `${ROLE_COLORS[role]}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: ROLE_COLORS[role], fontWeight: 700, fontSize: "16px",
          }}>
            {emp.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "15px", color: "#111827" }}>{emp.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>@{emp.username}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                fontSize: "11px", fontWeight: 600,
                color: ROLE_COLORS[role],
                background: `${ROLE_COLORS[role]}15`,
                padding: "2px 7px", borderRadius: "20px",
              }}>
                {ROLE_ICONS[role]} {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: "6px" }}>
          <ActionBtn onClick={() => onEdit(emp)} color="#16a34a" title="Editar"><Pencil size={14} /></ActionBtn>
          <ActionBtn onClick={() => onReset(emp)} color="#0369a1" title="Redefinir senha"><KeyRound size={14} /></ActionBtn>
          <ActionBtn onClick={() => onToggle(emp)} color={toggleColor} title={toggleLabel}>{toggleIcon}</ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, color, title, children }: { onClick: () => void; color: string; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "32px", height: "32px", borderRadius: "8px",
        background: `${color}15`, border: `1px solid ${color}30`,
        color, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000, padding: "0",
    }}>
      <div style={{
        background: "white", borderRadius: "20px 20px 0 0",
        padding: "24px 20px", width: "100%", maxWidth: "480px",
        maxHeight: "90vh", overflowY: "auto",
        animation: "slideUp 0.25s cubic-bezier(0.23,1,0.32,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#14532d" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {children}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{label}</label>
      {children}
      {error && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  const roles: Role[] = ["employee", "launcher", "admin"];
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {roles.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          style={{
            flex: 1, padding: "10px 4px", borderRadius: "10px", border: "2px solid",
            borderColor: value === r ? ROLE_COLORS[r] : "#e5e7eb",
            background: value === r ? `${ROLE_COLORS[r]}15` : "white",
            color: value === r ? ROLE_COLORS[r] : "#6b7280",
            fontWeight: value === r ? 700 : 500,
            fontSize: "12px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
            transition: "all 0.15s",
          }}
        >
          {ROLE_ICONS[r]}
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: "10px",
  border: "1.5px solid #e5e7eb", fontSize: "15px", color: "#111827",
  background: "white", outline: "none", boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "13px 20px", borderRadius: "10px",
  background: "linear-gradient(135deg,#16a34a,#15803d)",
  color: "white", border: "none", fontWeight: 700,
  fontSize: "15px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
};
