import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Radio, TestTube2, MapPin, Clock, Car, Bell } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { AlarmEvent, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AlarmHistorie() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [simulatorData, setSimulatorData] = useState(`{
  "einsatznummer": "2024-TEST-001",
  "alarmierungszeit": "${new Date().toISOString()}",
  "ort": "Schwedt/Oder",
  "ortsteil": "Stadtmitte",
  "strasse": "Musterstraße",
  "hausnummer": "42",
  "einsatzart": "Brandeinsatz",
  "stichwort": "B:Klein",
  "sondersignal": true,
  "alarmierte_einsatzmittel": ["LF 10", "DLK 23"],
  "alarmierte_wachen": ["Feuerwehr Schwedt"]
}`);

  const { data: alarme, isLoading } = useQuery<AlarmEvent[]>({
    queryKey: ["/api/alarm/events"],
  });

  const { data: allUsers } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const simulateMutation = useMutation({
    mutationFn: async (data: { alarmData: any; notifyUserIds: string[] }) => {
      return apiRequest("POST", "/api/alarm/simulate", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alarm/events"] });
      setIsSimulatorOpen(false);
      setSelectedUserIds([]);
      toast({
        title: "Alarm simuliert",
        description: "Der Test-Alarm wurde erfolgreich verarbeitet",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Simulieren",
        variant: "destructive",
      });
    },
  });

  const handleSimulate = () => {
    try {
      const parsedData = JSON.parse(simulatorData);
      simulateMutation.mutate({
        alarmData: parsedData,
        notifyUserIds: selectedUserIds,
      });
    } catch (error) {
      toast({
        title: "Ungültiges JSON-Format",
        description: error instanceof Error ? error.message : "Bitte überprüfen Sie die Eingabe",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (allUsers) {
      setSelectedUserIds(allUsers.map(u => u.id));
    }
  };

  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };

  const getKategorieColor = (stichwort: string) => {
    if (stichwort.startsWith("B:")) return "destructive";
    if (stichwort.startsWith("H:")) return "default";
    return "secondary";
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alarm-Historie</h1>
            <p className="text-muted-foreground">DE-Alarm Schnittstelle</p>
          </div>
          {user?.role === "admin" && (
            <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-open-simulator">
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Alarm simulieren
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle>Alarm-Simulator</DialogTitle>
                  <DialogDescription>
                    Testen Sie die automatische Besatzungszuteilung mit simulierten Alarmdaten
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Alarm-Daten (JSON)</Label>
                    <Textarea
                      data-testid="input-simulator-data"
                      value={simulatorData}
                      onChange={(e) => setSimulatorData(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Push-Benachrichtigungen senden an
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={selectAllUsers}
                          data-testid="button-select-all-users"
                        >
                          Alle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={deselectAllUsers}
                          data-testid="button-deselect-all-users"
                        >
                          Keine
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-4">
                      <div className="space-y-3">
                        {allUsers && allUsers.length > 0 ? (
                          allUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-3">
                              <Checkbox
                                id={`user-${u.id}`}
                                checked={selectedUserIds.includes(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                                data-testid={`checkbox-user-${u.id}`}
                              />
                              <Label
                                htmlFor={`user-${u.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {u.vorname} {u.nachname}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({u.username})
                                </span>
                              </Label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Keine Benutzer gefunden
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      {selectedUserIds.length} von {allUsers?.length || 0} Kameraden ausgewählt
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSimulatorOpen(false)}
                      data-testid="button-cancel-simulator"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleSimulate}
                      disabled={simulateMutation.isPending}
                      data-testid="button-simulate"
                    >
                      {simulateMutation.isPending ? "Simuliert..." : "Simulieren"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Lädt...</p>
            </CardContent>
          </Card>
        ) : !alarme || alarme.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Radio className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Keine Alarme empfangen</p>
                <p className="text-sm text-muted-foreground">
                  Alarme von der DE-Alarm App werden hier angezeigt
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {alarme.map((alarm) => (
              <Card key={alarm.id} data-testid={`card-alarm-${alarm.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">
                          {alarm.einsatznummer}
                        </CardTitle>
                        <Badge variant={getKategorieColor(alarm.stichwort)}>
                          {alarm.stichwort}
                        </Badge>
                        {alarm.sondersignal && (
                          <Badge variant="destructive">
                            <Radio className="h-3 w-3 mr-1" />
                            Sondersignal
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(alarm.alarmierungszeit), "PPpp", { locale: de })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {alarm.verarbeitet ? (
                        <Badge variant="default">Verarbeitet</Badge>
                      ) : (
                        <Badge variant="secondary">Ausstehend</Badge>
                      )}
                      {alarm.crew_neu_zugeteilt && (
                        <Badge variant="default">Besatzung zugeteilt</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{alarm.ort}</p>
                          {alarm.ortsteil && (
                            <p className="text-muted-foreground">{alarm.ortsteil}</p>
                          )}
                          {alarm.strasse && (
                            <p className="text-muted-foreground">
                              {alarm.strasse} {alarm.hausnummer}
                            </p>
                          )}
                          {alarm.objekt && (
                            <p className="text-muted-foreground">{alarm.objekt}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Einsatzart</p>
                      <Badge variant="outline">{alarm.einsatzart}</Badge>
                    </div>
                  </div>

                  {alarm.alarmierte_einsatzmittel && alarm.alarmierte_einsatzmittel.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Car className="h-4 w-4" />
                        Alarmierte Einsatzmittel
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {alarm.alarmierte_einsatzmittel.map((mittel, idx) => (
                          <Badge key={idx} variant="secondary">
                            {mittel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {alarm.alarmierte_wachen && alarm.alarmierte_wachen.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Alarmierte Wachen</p>
                      <div className="flex flex-wrap gap-2">
                        {alarm.alarmierte_wachen.map((wache, idx) => (
                          <Badge key={idx} variant="outline">
                            {wache}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {alarm.zusaetzliche_ortsangaben && (
                    <div>
                      <p className="text-sm font-medium mb-1">Zusätzliche Ortsangaben</p>
                      <p className="text-sm text-muted-foreground">
                        {alarm.zusaetzliche_ortsangaben}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
