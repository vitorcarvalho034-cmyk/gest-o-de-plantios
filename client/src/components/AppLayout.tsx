import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Leaf,
  Users,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["employee", "launcher", "admin"] },
  { href: "/launch", label: "Lançar", icon: <PlusCircle className="w-5 h-5" />, roles: ["launcher", "admin"] },
  { href: "/rejected", label: "Contestações", icon: <AlertTriangle className="w-5 h-5" />, roles: ["launcher", "admin"] },
  { href: "/my-history", label: "Histórico", icon: <History className="w-5 h-5" />, roles: ["employee", "launcher", "admin"] },
  { href: "/admin", label: "Admin", icon: <ShieldCheck className="w-5 h-5" />, roles: ["admin"] },
  { href: "/admin/users", label: "Usuários", icon: <Users className="w-5 h-5" />, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { employee } = useEmployeeAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const utils = trpc.useUtils();

  const logoutMutation = trpc.employee.logout.useMutation({
    onSuccess: () => {
      // Limpar cookie JWT
      document.cookie = "emp_session=; path=/; max-age=0; SameSite=Lax";
      utils.employee.me.invalidate();
      toast.success("Sessão encerrada");
      window.location.href = "/";
    },
  });

  const filteredNav = navItems.filter((item) =>
    employee ? item.roles.includes(employee.role) : false
  );

  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar-background flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-serif font-semibold text-sm leading-tight truncate">Gestão de Plantio</p>
            <p className="text-sidebar-foreground/50 text-xs flex items-center gap-1">
              <Leaf className="w-3 h-3" /> Sistema Agrícola
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                {item.icon}
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sidebar-primary-foreground text-xs font-bold">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sidebar-foreground text-xs font-semibold truncate">{employee?.name}</p>
              <p className="text-sidebar-foreground/50 text-xs capitalize">
                {employee?.role === "admin" ? "Administrador" : employee?.role === "launcher" ? "Lançador" : "Funcionário"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(134,239,172,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                <span className="text-sidebar-foreground font-serif font-semibold">Gestão de Plantio</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground/70 p-2 rounded-lg hover:bg-sidebar-accent">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sidebar-primary-foreground text-sm font-bold">
                    {employee?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sidebar-foreground text-sm font-semibold">{employee?.name}</p>
                  <p className="text-sidebar-foreground/50 text-xs">
                    {employee?.role === "admin" ? "Administrador" : employee?.role === "launcher" ? "Lançador" : "Funcionário"}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {filteredNav.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all",
                      isActive(item.href)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>

            <div className="px-3 pb-6 pt-2 border-t border-sidebar-border">
              <button
                onClick={() => logoutMutation.mutate()}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground text-base font-medium transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair da conta
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar-background text-sidebar-foreground shadow-md flex-shrink-0" style={{ minHeight: "56px" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" />
            <span className="font-serif font-semibold text-sm">Gestão de Plantio</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page content — with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-safe">
          {children}
        </main>

        {/* ── Mobile bottom navigation ── */}
        <nav
          className="md:hidden flex items-stretch bg-white border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex-shrink-0"
          style={{ height: "var(--bottom-nav-height)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {filteredNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  <span className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-xl transition-all",
                    active ? "bg-primary/10" : ""
                  )}>
                    {item.icon}
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium leading-none",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
