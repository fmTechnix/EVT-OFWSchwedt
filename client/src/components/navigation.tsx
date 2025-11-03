import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Truck, Users, TruckIcon, Settings, LogOut } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { href: "/", label: "📊 Dashboard", icon: LayoutDashboard, show: true },
    { href: "/mein-einsatz", label: "🚒 Mein Einsatz", icon: Truck, show: true },
    { href: "/kameraden", label: "👥 Kameraden", icon: Users, show: true },
    { href: "/fahrzeuge", label: "🚛 Fahrzeuge", icon: TruckIcon, show: user.role === "admin" },
    { href: "/einstellungen", label: "⚙️ Einstellungen", icon: Settings, show: user.role === "admin" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
                className={location === item.href ? "bg-muted" : ""}
                data-testid={`link-${item.label.split(' ')[1].toLowerCase()}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            ⎋ Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
