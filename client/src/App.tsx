import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EmployeeAuthProvider, useEmployeeAuth } from "./contexts/EmployeeAuthContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Launch from "./pages/Launch";
import MyHistory from "./pages/MyHistory";
import AdminPanel from "./pages/AdminPanel";
import UserManagement from "./pages/UserManagement";
import RejectedPlantings from "./pages/RejectedPlantings";
import NotFound from "./pages/NotFound";

function ProtectedRoutes() {
  const { employee, loading } = useEmployeeAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(134,239,172,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/launch" component={Launch} />
        <Route path="/my-history" component={MyHistory} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/admin/users" component={UserManagement} />
        <Route path="/rejected" component={RejectedPlantings} />
        <Route path="/setup" component={Setup} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <EmployeeAuthProvider>
            <ProtectedRoutes />
          </EmployeeAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
