import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Vehicle, User, Termin, CurrentAssignment, Availability } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isAfter } from "date-fns";
import { de } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/public"],
  });

  const { data: termine, isLoading: termineLoading } = useQuery<Termin[]>({
    queryKey: ["/api/termine"],
  });

  const today = new Date().toISOString().split('T')[0];
  
  const { data: myAssignment, isLoading: assignmentLoading } = useQuery<CurrentAssignment | null>({
    queryKey: ["/api/my-assignment"],
    enabled: !!user,
  });

  const { data: allAssignments, isLoading: allAssignmentsLoading } = useQuery<CurrentAssignment[]>({
    queryKey: ["/api/current-assignments"],
    enabled: !!user && !!myAssignment,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<Availability | null>({
    queryKey: ["/api/availability", today],
    enabled: user?.role === "member",
  });

  const { data: vehicleConfigs } = useQuery<any[]>({
    queryKey: ["/api/vehicle-configs"],
    enabled: !!user && !!myAssignment,
  });

  const availabilityMutation = useMutation({
    mutationFn: async (status: "available" | "unavailable") => {
      const response = await apiRequest("POST", "/api/availability", {
        date: today,
        status,
        reason: status === "unavailable" ? "Heute nicht verfügbar" : null,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current-assignments"] });
      toast({
        title: "Verfügbarkeit aktualisiert",
        description: "Ihre Verfügbarkeit wurde erfolgreich geändert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Verfügbarkeit konnte nicht aktualisiert werden",
      });
    },
  });

  const isLoading = vehiclesLoading || usersLoading || termineLoading;
  
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
            {/* Verfügbarkeit */}
            <Card className="shadow-lg hover-elevate transition-all" data-testid="card-availability">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  Meine Verfügbarkeit heute
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="availability-toggle" className="text-base">
                    {availability?.status === "unavailable" ? "Nicht verfügbar" : "Verfügbar"}
                  </Label>
                  <Switch
                    id="availability-toggle"
                    data-testid="switch-availability"
                    checked={availability?.status !== "unavailable"}
                    disabled={availabilityMutation.isPending}
                    onCheckedChange={(checked) => {
                      availabilityMutation.mutate(checked ? "available" : "unavailable");
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {availability?.status === "unavailable" 
                    ? "Sie sind heute als nicht verfügbar markiert" 
                    : "Sie sind heute als verfügbar markiert"}
                </p>
              </CardContent>
            </Card>

            {/* Meine Zuteilung */}
            <Card className="shadow-lg hover-elevate transition-all md:col-span-2" data-testid="card-my-assignment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚛</span>
                  Meine Zuteilung
                </CardTitle>
                <CardDescription>
                  Ihre aktuelle Fahrzeug- und Positionszuteilung
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : myAssignment ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fahrzeug</p>
                        <p className="font-semibold" data-testid="text-my-vehicle">
                          {vehicleConfigs?.find(vc => vc.id === myAssignment.vehicle_config_id)?.vehicle || `ID: ${myAssignment.vehicle_config_id}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="font-semibold" data-testid="text-my-position">
                          {myAssignment.position}
                        </p>
                      </div>
                      {myAssignment.trupp_partner_id && (
                        <div>
                          <p className="text-sm text-muted-foreground">Trupp-Partner</p>
                          <p className="font-semibold" data-testid="text-my-partner">
                            {users?.find(u => u.id === myAssignment.trupp_partner_id)
                              ? `${users.find(u => u.id === myAssignment.trupp_partner_id)?.vorname} ${users.find(u => u.id === myAssignment.trupp_partner_id)?.nachname}`
                              : "Wird geladen..."}
                          </p>
                        </div>
                      )}
                    </div>
                    {allAssignments && allAssignments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold mb-2">Gesamte Fahrzeugbesetzung:</p>
                        <div className="space-y-1">
                          {allAssignments
                            .filter(a => a.vehicle_config_id === myAssignment.vehicle_config_id)
                            .map((assignment, idx) => {
                              const assignedUser = users?.find(u => u.id === assignment.user_id);
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{assignment.position}</span>
                                  <Badge variant={assignment.user_id === user?.id ? "default" : "outline"}>
                                    {assignedUser ? `${assignedUser.vorname} ${assignedUser.nachname}` : "Unbekannt"}
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-assignment">
                    Sie sind derzeit keinem Fahrzeug zugeteilt.
                  </p>
                )}
              </CardContent>
            </Card>

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

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Meine Zuteilung für Admin/Moderator */}
            <Card className="shadow-lg hover-elevate transition-all lg:col-span-3" data-testid="card-my-assignment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚛</span>
                  Meine Zuteilung
                </CardTitle>
                <CardDescription>
                  Ihre aktuelle Fahrzeug- und Positionszuteilung
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : myAssignment ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fahrzeug</p>
                        <p className="text-xl font-bold" data-testid="text-my-vehicle">
                          {vehicleConfigs?.find(vc => vc.id === myAssignment.vehicle_config_id)?.vehicle || `ID: ${myAssignment.vehicle_config_id}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="text-xl font-bold" data-testid="text-my-position">
                          {myAssignment.position}
                        </p>
                      </div>
                      {myAssignment.trupp_partner_id && (
                        <div>
                          <p className="text-sm text-muted-foreground">Trupp-Partner</p>
                          <p className="text-xl font-bold" data-testid="text-my-partner">
                            {users?.find(u => u.id === myAssignment.trupp_partner_id)
                              ? `${users.find(u => u.id === myAssignment.trupp_partner_id)?.vorname} ${users.find(u => u.id === myAssignment.trupp_partner_id)?.nachname}`
                              : "Wird geladen..."}
                          </p>
                        </div>
                      )}
                    </div>
                    {allAssignments && allAssignments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold mb-2">Gesamte Fahrzeugbesetzung:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {allAssignments
                            .filter(a => a.vehicle_config_id === myAssignment.vehicle_config_id)
                            .map((assignment, idx) => {
                              const assignedUser = users?.find(u => u.id === assignment.user_id);
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded border">
                                  <span className="text-muted-foreground font-medium">{assignment.position}</span>
                                  <Badge variant={assignment.user_id === user?.id ? "default" : "outline"}>
                                    {assignedUser ? `${assignedUser.vorname} ${assignedUser.nachname}` : "Unbekannt"}
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-assignment">
                    Sie sind derzeit keinem Fahrzeug zugeteilt. Führen Sie eine automatische Zuteilung durch.
                  </p>
                )}
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
