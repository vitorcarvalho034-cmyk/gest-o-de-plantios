import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Leaf } from "lucide-react";

const DEFAULT_EMPLOYEES = [
  { name: "Funcionário 01", username: "func01", password: "senha01", role: "employee" as const },
  { name: "Funcionário 02", username: "func02", password: "senha02", role: "employee" as const },
  { name: "Funcionário 03", username: "func03", password: "senha03", role: "employee" as const },
  { name: "Funcionário 04", username: "func04", password: "senha04", role: "employee" as const },
  { name: "Funcionário 05", username: "func05", password: "senha05", role: "employee" as const },
  { name: "Funcionário 06", username: "func06", password: "senha06", role: "employee" as const },
  { name: "Funcionário 07", username: "func07", password: "senha07", role: "employee" as const },
  { name: "Funcionário 08", username: "func08", password: "senha08", role: "employee" as const },
  { name: "Funcionário 09", username: "func09", password: "senha09", role: "employee" as const },
  { name: "Funcionário 10", username: "func10", password: "senha10", role: "employee" as const },
  { name: "Funcionário 11", username: "func11", password: "senha11", role: "employee" as const },
  { name: "Funcionário 12", username: "func12", password: "senha12", role: "employee" as const },
  { name: "Funcionário 13", username: "func13", password: "senha13", role: "employee" as const },
  { name: "Funcionário 14", username: "func14", password: "senha14", role: "employee" as const },
  { name: "Funcionário 15", username: "func15", password: "senha15", role: "employee" as const },
  { name: "Lançador", username: "lancador", password: "lancador123", role: "launcher" as const },
  { name: "Administrador", username: "admin", password: "admin123", role: "admin" as const },
];

export default function Setup() {
  const [adminSecret, setAdminSecret] = useState("");
  const [done, setDone] = useState(false);

  const seedMutation = trpc.employee.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} usuários criados com sucesso!`);
      setDone(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) { toast.error("Informe a chave de administrador"); return; }
    seedMutation.mutate({ employees: DEFAULT_EMPLOYEES, adminSecret });
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.16_0.05_148)] to-[oklch(0.30_0.09_148)] p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold mb-2">Setup Concluído!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Todos os usuários foram criados. Acesse o sistema com as credenciais padrão.
            </p>
            <Button onClick={() => window.location.href = "/"} className="w-full">
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.16_0.05_148)] to-[oklch(0.30_0.09_148)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(134,239,172,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-white">Configuração Inicial</h1>
          <p className="text-white/60 text-sm mt-1 flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5" /> Gestão de Plantio
          </p>
        </div>
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Criar Usuários Padrão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Este processo cria 15 funcionários, 1 lançador e 1 administrador com credenciais padrão.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Chave de Administrador (JWT_SECRET)</Label>
                <Input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Chave secreta do servidor"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Esta chave é o valor da variável JWT_SECRET configurada no servidor.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Usuários que serão criados:</p>
                <p>• 15 funcionários: func01–func15 / senha01–senha15</p>
                <p>• Lançador: lancador / lancador123</p>
                <p>• Administrador: admin / admin123</p>
                <p className="text-amber-600 font-medium mt-2">⚠ Altere as senhas após o primeiro acesso.</p>
              </div>

              <Button type="submit" className="w-full h-11" disabled={seedMutation.isPending}>
                {seedMutation.isPending ? "Criando usuários..." : "Criar Usuários"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
