import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EmployeeAuthProvider, useEmployeeAuth } from "./contexts/EmployeeAuthContext";
import AppLayout from "./components/AppLayout";
import { BRAND_LOGO_URL } from "@/const";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Launch from "./pages/Launch";
import ManageRecords from "./pages/ManageRecords";
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
              <img src={BRAND_LOGO_URL} alt="" className="w-10 h-10 object-contain" />
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
        <Route path="/manage" component={ManageRecords} />
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
