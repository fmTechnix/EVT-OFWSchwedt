import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Vehicle, User, Einsatz, Settings, Termin } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isAfter } from "date-fns";
import { de } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/public"],
  });

  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  const { data: termine, isLoading: termineLoading } = useQuery<Termin[]>({
    queryKey: ["/api/termine"],
  });

  const isLoading = vehiclesLoading || usersLoading || einsatzLoading || termineLoading;
  
  // Get next 3 upcoming Termine
  const upcomingTermine = termine
    ?.filter((termin) => {
      const terminDate = parseISO(`${termin.datum}T${termin.uhrzeit}`);
      return isAfter(terminDate, new Date());
    })
    .sort((a, b) => {
      const dateA = parseISO(`${a.datum}T${a.uhrzeit}`);
      const dateB = parseISO(`${b.datum}T${b.uhrzeit}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3) || [];

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
                    {users?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Kameraden hinterlegt</p>
                </div>
              </CardContent>
            </Card>

            {/* Nächste Termine für Members */}
            <Card className="shadow-lg hover-elevate transition-all md:col-span-2" data-testid="card-upcoming-termine">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Nächste Termine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTermine.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-termine">
                    Keine anstehenden Termine
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingTermine.map((termin) => {
                      const terminDate = parseISO(`${termin.datum}T${termin.uhrzeit}`);
                      return (
                        <div
                          key={termin.id}
                          className="border rounded-md p-3 hover-elevate"
                          data-testid={`termin-${termin.id}`}
                        >
                          <p className="font-semibold" data-testid={`text-titel-${termin.id}`}>
                            {termin.titel}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-datum-${termin.id}`}>
                            {format(terminDate, "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                          </p>
                          {termin.ort && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-ort-${termin.id}`}>
                              📍 {termin.ort}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/kalender">
                  <Button variant="outline" className="w-full" data-testid="button-all-termine">
                    Alle Termine anzeigen
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
                    {users?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Kameraden hinterlegt</p>
                </div>
                {user?.role === "admin" && (
                  <Link href="/benutzer">
                    <Button className="w-full" data-testid="button-manage-benutzer">
                      Verwalten
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Nächste Termine für Admin/Moderator */}
            <Card className="shadow-lg hover-elevate transition-all lg:col-span-3" data-testid="card-upcoming-termine">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Nächste Termine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTermine.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-termine">
                    Keine anstehenden Termine
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {upcomingTermine.map((termin) => {
                      const terminDate = parseISO(`${termin.datum}T${termin.uhrzeit}`);
                      return (
                        <div
                          key={termin.id}
                          className="border rounded-md p-3 hover-elevate"
                          data-testid={`termin-${termin.id}`}
                        >
                          <p className="font-semibold" data-testid={`text-titel-${termin.id}`}>
                            {termin.titel}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-datum-${termin.id}`}>
                            {format(terminDate, "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                          </p>
                          {termin.ort && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-ort-${termin.id}`}>
                              📍 {termin.ort}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/kalender">
                  <Button variant="outline" className="w-full" data-testid="button-all-termine">
                    Alle Termine anzeigen
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
