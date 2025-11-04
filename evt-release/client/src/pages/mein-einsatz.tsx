import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BesetzungscheckResult, Einsatz, Availability } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { addDays, startOfWeek, format } from "date-fns";
import { de } from "date-fns/locale";
import { AvailabilityTemplates } from "@/components/availability-templates";
import { ReminderSettings } from "@/components/reminder-settings";

export default function MeinEinsatz() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery<BesetzungscheckResult>({
    queryKey: ["/api/besetzungscheck"],
  });
  
  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  // Get next Monday
  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If Sunday, next day; else days until next Monday
    return startOfWeek(addDays(today, daysUntilMonday), { weekStartsOn: 1 });
  };

  const [weekStart, setWeekStart] = useState(getNextMonday());
  
  // Generate week days (Monday-Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const { data: availabilities, isLoading: availabilitiesLoading } = useQuery<Availability[]>({
    queryKey: ["/api/availabilities"],
    enabled: !!user,
  });

  const [weekAvailability, setWeekAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const availabilityMap: Record<string, boolean> = {};
    weekDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      if (availabilities) {
        const avail = availabilities.find((a) => a.date === dateStr);
        availabilityMap[dateStr] = avail?.status === "available";
      } else {
        availabilityMap[dateStr] = false;
      }
    });
    setWeekAvailability(availabilityMap);
  }, [availabilities, weekDays]);

  const saveAvailabilityMutation = useMutation({
    mutationFn: async () => {
      const availabilityData = weekDays.map((day) => ({
        date: format(day, "yyyy-MM-dd"),
        status: weekAvailability[format(day, "yyyy-MM-dd")] ? "available" : "unavailable",
      }));
      
      return await apiRequest("POST", "/api/availabilities/week", { availabilities: availabilityData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] });
      toast({
        title: "Verfügbarkeit gespeichert",
        description: "Deine Verfügbarkeit für die Woche wurde aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Verfügbarkeit konnte nicht gespeichert werden",
      });
    },
  });

  const toggleDay = (dateStr: string) => {
    setWeekAvailability((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Calendar className="w-8 h-8" />
          Meine Verfügbarkeit & Besetzungscheck
        </h1>

        {/* Week Availability Section */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Verfügbarkeit für nächste Woche (Montag-Sonntag)</CardTitle>
            <CardDescription>
              Gib an, an welchen Tagen du verfügbar bist. Die automatische Zuteilung erfolgt basierend auf deiner Verfügbarkeit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availabilitiesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {weekDays.map((day, index) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isAvailable = weekAvailability[dateStr] || false;
                    const dayName = format(day, "EEEE", { locale: de });
                    const dayDate = format(day, "dd.MM.", { locale: de });
                    
                    return (
                      <Button
                        key={dateStr}
                        onClick={() => toggleDay(dateStr)}
                        variant="outline"
                        className={`p-4 h-auto border-2 transition-all ${
                          isAvailable
                            ? "bg-green-500/10 border-green-500 hover:bg-green-500/20"
                            : "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                        }`}
                        data-testid={`day-${index}`}
                      >
                        <div className="text-center">
                          <div className="font-semibold text-sm">{dayName}</div>
                          <div className="text-xs text-muted-foreground mt-1">{dayDate}</div>
                          <div className="mt-2">
                            {isAvailable ? (
                              <CheckCircle2 className="w-6 h-6 mx-auto text-green-500" />
                            ) : (
                              <XCircle className="w-6 h-6 mx-auto text-destructive" />
                            )}
                          </div>
                          <div className="text-xs font-medium mt-1">
                            {isAvailable ? "Verfügbar" : "Nicht verfügbar"}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => saveAvailabilityMutation.mutate()}
                  disabled={saveAvailabilityMutation.isPending}
                  className="w-full"
                  data-testid="button-save-availability"
                >
                  {saveAvailabilityMutation.isPending ? "Wird gespeichert..." : "Verfügbarkeit speichern"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates and Reminder Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AvailabilityTemplates weekStartDate={format(weekStart, "yyyy-MM-dd")} />
          <ReminderSettings />
        </div>

        {/* Besetzungscheck Section */}
        {isLoading || einsatzLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Aktuelle Besetzung</h2>
            <Card className="shadow-lg mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4 text-lg">
                  <div>
                    <span className="text-muted-foreground">Stichwort:</span>
                    <span className="font-semibold ml-2">
                      {einsatz?.stichwort || "-"}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-muted-foreground">Bedarf gesamt:</span>
                    <span className="font-semibold ml-2" data-testid="text-bedarf">
                      {data?.minima.mannschaftsbedarf || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vorhanden */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Vorhanden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AGT:</span>
                    <span className="font-bold text-lg" data-testid="text-agt-vorhanden">
                      {data?.vorhanden.agt || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maschinist:</span>
                    <span className="font-bold text-lg" data-testid="text-maschinist-vorhanden">
                      {data?.vorhanden.maschinist || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GF:</span>
                    <span className="font-bold text-lg" data-testid="text-gf-vorhanden">
                      {data?.vorhanden.gf || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Gesamt:</span>
                    <span className="font-bold text-xl" data-testid="text-gesamt-vorhanden">
                      {data?.vorhanden.gesamt || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Minima */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Mindestanforderungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AGT ≥</span>
                    <span className="font-bold text-lg" data-testid="text-agt-min">
                      {data?.minima.min_agt || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maschinist ≥</span>
                    <span className="font-bold text-lg" data-testid="text-maschinist-min">
                      {data?.minima.min_maschinist || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GF ≥</span>
                    <span className="font-bold text-lg" data-testid="text-gf-min">
                      {data?.minima.min_gf || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Gesamt ≥</span>
                    <span className="font-bold text-xl" data-testid="text-gesamt-min">
                      {data?.minima.mannschaftsbedarf || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.erfuellt ? (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-green-600 dark:text-green-400" data-testid="text-status">
                            Mindestanforderungen erfüllt
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-full justify-center py-2 bg-green-500/5">
                        ✅ Einsatzbereit
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <XCircle className="w-8 h-8 text-destructive flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-destructive" data-testid="text-status">
                            Anforderungen nicht erfüllt
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-full justify-center py-2 bg-destructive/5">
                        ❌ Nicht einsatzbereit
                      </Badge>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Passe die Minima unter Einstellungen an
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
