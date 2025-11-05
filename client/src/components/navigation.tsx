import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Truck, Users, TruckIcon, Settings, LogOut, AlertCircle, FileText, Radio } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/mein-einsatz", label: "Mein Einsatz", icon: Truck, show: true },
    { href: "/maengelmeldungen", label: "Mängelmeldung", icon: AlertCircle, show: true },
    { href: "/benutzer", label: "Benutzer", icon: Users, show: user.role === "admin" },
    { href: "/kalender", label: "Kalender", icon: Users, show: true },
    { href: "/fahrzeuge", label: "Fahrzeuge", icon: TruckIcon, show: user.role === "admin" },
    { href: "/aao", label: "AAO", icon: FileText, show: user.role === "admin" },
    { href: "/alarm-historie", label: "Alarme", icon: Radio, show: true },
    { href: "/einstellungen", label: "Einstellungen", icon: Settings, show: user.role === "admin" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-red-800 bg-red-600 text-white shadow-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
          <img 
            src="/feuerwehr-logo.png" 
            alt="Feuerwehr Schwedt/Oder" 
            className="h-12 w-auto"
          />
          <span>EVT</span>
        </div>
        
        <nav className="flex items-center gap-1">
          {navItems.filter(item => item.show).map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`text-white hover:bg-red-700 ${location === item.href ? "bg-red-700" : ""}`}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-white hover:bg-red-700"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
