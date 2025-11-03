import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Vehicle, Kamerad, Einsatz, Settings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: kameraden, isLoading: kameradenLoading } = useQuery<Kamerad[]>({
    queryKey: ["/api/kameraden"],
  });

  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  const isLoading = vehiclesLoading || kameradenLoading || einsatzLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          Dashboard
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : user?.role === "member" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kalender & Termine für Members */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-kalender">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Kalender & Termine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Aktuelle Termine einsehen und Zusagen verwalten
                </p>
                <Link href="/kalender">
                  <Button className="w-full" data-testid="button-view-kalender">
                    Kalender öffnen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Fahrzeuge für Members */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-fahrzeuge">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚛</span>
                  Fahrzeuge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-vehicle-count">
                    {vehicles?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Fahrzeuge hinterlegt</p>
                </div>
                <Link href="/fahrzeuge">
                  <Button className="w-full" data-testid="button-view-vehicles">
                    Anzeigen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Kameraden für Members */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-kameraden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  Kameraden
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-kamerad-count">
                    {kameraden?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Kameraden hinterlegt</p>
                </div>
                <Link href="/kameraden">
                  <Button className="w-full" data-testid="button-view-kameraden">
                    Anzeigen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Besetzungsprüfung für Members */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-besetzung">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚒</span>
                  Besetzungsprüfung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-1">Aktuelle Einsatzbereitschaft prüfen</p>
                <Link href="/mein-einsatz">
                  <Button className="w-full" data-testid="button-check-einsatz">
                    Prüfung starten
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Besetzung & Bedarf für Admin/Moderator */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-besetzung">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚒</span>
                  Besetzung & Bedarf
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Stichwort</p>
                  <p className="font-semibold" data-testid="text-stichwort">{einsatz?.stichwort || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mannschaftsbedarf</p>
                  <p className="text-2xl font-bold" data-testid="text-bedarf">{einsatz?.mannschaftsbedarf || 0}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Einstellungen → Mindestrollen & Stichwort
                </p>
                <Link href="/mein-einsatz">
                  <Button className="w-full" data-testid="button-check-einsatz">
                    Mein Einsatz prüfen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Fahrzeuge für Admin/Moderator */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-fahrzeuge">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚛</span>
                  Fahrzeuge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-vehicle-count">
                    {vehicles?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Fahrzeuge hinterlegt</p>
                </div>
                {user?.role === "admin" && (
                  <Link href="/fahrzeuge">
                    <Button className="w-full" data-testid="button-manage-vehicles">
                      Verwalten
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Kameraden für Admin/Moderator */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-kameraden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  Kameraden
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-kamerad-count">
                    {kameraden?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Kameraden hinterlegt</p>
                </div>
                <Link href="/kameraden">
                  <Button className="w-full" data-testid="button-view-kameraden">
                    Anzeigen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
