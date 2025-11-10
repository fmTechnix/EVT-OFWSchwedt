import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayoutDashboard, Truck, Users, TruckIcon, Settings, LogOut, AlertCircle, FileText, Radio, Menu } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const visibleItems = navItems.filter(item => item.show);

  return (
    <header className="sticky top-0 z-50 border-b border-red-800 bg-red-600 text-white shadow-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-3 font-bold text-base md:text-lg tracking-tight">
          <img 
            src="/feuerwehr-logo.png" 
            alt="Feuerwehr Schwedt/Oder" 
            className="h-10 md:h-12 w-auto"
          />
          <span className="hidden sm:inline">EVT</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {visibleItems.map((item) => (
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

        {/* Mobile Hamburger Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-red-700"
              data-testid="button-mobile-menu"
              aria-label="Menü öffnen"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-white dark:bg-black p-0">
            <SheetHeader className="border-b border-border p-6 bg-red-600 text-white">
              <SheetTitle className="text-white flex items-center gap-3">
                <img 
                  src="/feuerwehr-logo.png" 
                  alt="Feuerwehr Schwedt/Oder" 
                  className="h-10 w-auto"
                />
                EVT Menü
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-4">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 text-left ${
                        location === item.href ? "bg-red-100 text-red-700" : "text-foreground"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid={`mobile-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-left text-red-600 hover:bg-red-50 hover:text-red-700 mt-4 border-t pt-4"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                data-testid="mobile-button-logout"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
