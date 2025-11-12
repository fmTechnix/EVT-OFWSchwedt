import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Fahrzeuge from "@/pages/fahrzeuge";
import Kameraden from "@/pages/kameraden";
import Kalender from "@/pages/kalender";
import MeinEinsatz from "@/pages/mein-einsatz";
import Einstellungen from "@/pages/einstellungen";
import Maengelmeldungen from "@/pages/maengelmeldungen";
import AaoVerwaltung from "@/pages/aao-verwaltung";
import AlarmHistorie from "@/pages/alarm-historie";
import SystemLogs from "@/pages/system-logs";
import DownloadPage from "@/pages/download";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img 
            src="/feuerwehr-logo.png" 
            alt="Feuerwehr Schwedt/Oder" 
            className="h-24 w-auto mx-auto"
          />
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/" />;
  }
  
  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img 
            src="/feuerwehr-logo.png" 
            alt="Feuerwehr Schwedt/Oder" 
            className="h-24 w-auto mx-auto"
          />
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/mein-einsatz">
        <ProtectedRoute>
          <MeinEinsatz />
        </ProtectedRoute>
      </Route>
      
      <Route path="/benutzer">
        <ProtectedRoute adminOnly>
          <Kameraden />
        </ProtectedRoute>
      </Route>
      
      <Route path="/kalender">
        <ProtectedRoute>
          <Kalender />
        </ProtectedRoute>
      </Route>
      
      <Route path="/maengelmeldungen">
        <ProtectedRoute>
          <Maengelmeldungen />
        </ProtectedRoute>
      </Route>
      
      <Route path="/fahrzeuge">
        <ProtectedRoute adminOnly>
          <Fahrzeuge />
        </ProtectedRoute>
      </Route>
      
      <Route path="/einstellungen">
        <ProtectedRoute adminOnly>
          <Einstellungen />
        </ProtectedRoute>
      </Route>
      
      <Route path="/aao">
        <ProtectedRoute adminOnly>
          <AaoVerwaltung />
        </ProtectedRoute>
      </Route>
      
      <Route path="/alarm-historie">
        <ProtectedRoute>
          <AlarmHistorie />
        </ProtectedRoute>
      </Route>
      
      <Route path="/system-logs">
        <ProtectedRoute adminOnly>
          <SystemLogs />
        </ProtectedRoute>
      </Route>
      
      <Route path="/download">
        <ProtectedRoute adminOnly>
          <DownloadPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
