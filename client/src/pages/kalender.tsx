import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TerminMitStats, TerminZusage, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, Download, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export default function Kalender() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: termine, isLoading: termineLoading } = useQuery<TerminMitStats[]>({
    queryKey: ["/api/termine"],
  });

  const { data: users } = useQuery<{ id: string; vorname: string; nachname: string }[]>({
    queryKey: ["/api/users/public"],
  });

  const [formData, setFormData] = useState({
    titel: "",
    beschreibung: "",
    datum: "",
    uhrzeit: "",
    ort: "",
  });

  const createTerminMutation = useMutation({
    mutationFn: async () => {
      // ersteller_id wird automatisch vom Backend gesetzt
      return await apiRequest("POST", "/api/termine", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/termine"] });
      toast({
        title: "Termin erstellt",
        description: "Der Termin wurde erfolgreich erstellt",
      });
      setDialogOpen(false);
      setFormData({
        titel: "",
        beschreibung: "",
        datum: "",
        uhrzeit: "",
        ort: "",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Termin konnte nicht erstellt werden",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTerminMutation.mutate();
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/termine/export", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export fehlgeschlagen");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "termine.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export erfolgreich",
        description: "Die Termine wurden als CSV-Datei heruntergeladen",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Export fehlgeschlagen",
      });
    }
  };

  const canCreateTermin = user?.role === "admin" || user?.role === "moderator";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Kalender</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="h-11"
              data-testid="button-export"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportieren
            </Button>
            {canCreateTermin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11" data-testid="button-create-termin">
                    <Plus className="mr-2 h-4 w-4" />
                    Neuer Termin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl w-[95vw]">
                  <DialogHeader>
                    <DialogTitle>Neuen Termin erstellen</DialogTitle>
                    <DialogDescription>
                      Erstellen Sie einen neuen Kalendereintrag
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="titel">Titel</Label>
                      <Input
                        id="titel"
                        value={formData.titel}
                        onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
                        placeholder="z.B. Übung Atemschutz"
                        required
                        data-testid="input-titel"
                        className="h-11"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="datum">Datum</Label>
                        <Input
                          id="datum"
                          type="date"
                          value={formData.datum}
                          onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                          required
                          data-testid="input-datum"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="uhrzeit">Uhrzeit</Label>
                        <Input
                          id="uhrzeit"
                          type="time"
                          value={formData.uhrzeit}
                          onChange={(e) => setFormData({ ...formData, uhrzeit: e.target.value })}
                          required
                          data-testid="input-uhrzeit"
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ort">Ort (optional)</Label>
                      <Input
                        id="ort"
                        value={formData.ort}
                        onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
                        placeholder="z.B. Feuerwache Schwedt"
                        data-testid="input-ort"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
                      <Textarea
                        id="beschreibung"
                        value={formData.beschreibung}
                        onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                        placeholder="Weitere Details zum Termin..."
                        rows={4}
                        data-testid="input-beschreibung"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="h-11"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTerminMutation.isPending}
                        className="h-11"
                        data-testid="button-submit-termin"
                      >
                        {createTerminMutation.isPending ? "Wird erstellt..." : "Termin erstellen"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {termineLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : termine && termine.length > 0 ? (
            termine.map((termin) => (
              <TerminCard
                key={termin.id}
                termin={termin}
                users={users || []}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">Keine Termine vorhanden</p>
                {canCreateTermin && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Klicken Sie auf "Neuer Termin", um einen Termin hinzuzufügen
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function TerminCard({ termin, users, currentUserId }: {
  termin: TerminMitStats;
  users: { id: string; vorname: string; nachname: string }[];
  currentUserId?: string;
}) {
  const { toast } = useToast();

  const { data: zusagen, isLoading: zusagenLoading } = useQuery<TerminZusage[]>({
    queryKey: ["/api/termine", termin.id, "zusagen"],
    queryFn: async () => {
      const response = await fetch(`/api/termine/${termin.id}/zusagen`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Fehler beim Laden");
      return response.json();
    },
  });

  const zusageMutation = useMutation({
    mutationFn: async (status: "zugesagt" | "abgesagt") => {
      return await apiRequest("POST", `/api/termine/${termin.id}/zusage`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/termine", termin.id, "zusagen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/termine"] }); // Update stats in dashboard
      toast({
        title: "Gespeichert",
        description: "Ihre Zusage wurde gespeichert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Zusage konnte nicht gespeichert werden",
      });
    },
  });

  const ersteller = users.find((u) => u.id === termin.ersteller_id);
  const zugesagt = zusagen?.filter((z) => z.status === "zugesagt") || [];
  const abgesagt = zusagen?.filter((z) => z.status === "abgesagt") || [];
  const meineZusage = zusagen?.find((z) => z.user_id === currentUserId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="shadow-lg" data-testid={`card-termin-${termin.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2" data-testid={`text-titel-${termin.id}`}>
              {termin.titel}
            </CardTitle>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div data-testid={`text-datum-${termin.id}`}>
                📅 {formatDate(termin.datum)}
              </div>
              <div data-testid={`text-uhrzeit-${termin.id}`}>
                🕐 {termin.uhrzeit} Uhr
              </div>
              <div data-testid={`text-ort-${termin.id}`}>
                📍 {termin.ort}
              </div>
              <div data-testid={`text-ersteller-${termin.id}`}>
                👤 {ersteller ? `${ersteller.vorname} ${ersteller.nachname}` : "Unbekannt"}
              </div>
            </div>
          </div>
          {meineZusage && (
            <Badge
              variant={meineZusage.status === "zugesagt" ? "default" : "destructive"}
              className="ml-4"
              data-testid={`badge-meine-zusage-${termin.id}`}
            >
              {meineZusage.status === "zugesagt" ? "Zugesagt" : "Abgesagt"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6" data-testid={`text-beschreibung-${termin.id}`}>
          {termin.beschreibung}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            onClick={() => zusageMutation.mutate("zugesagt")}
            disabled={zusageMutation.isPending}
            variant={meineZusage?.status === "zugesagt" ? "default" : "outline"}
            className="h-11"
            data-testid={`button-zusagen-${termin.id}`}
          >
            <Check className="mr-2 h-4 w-4" />
            Zusagen
          </Button>
          <Button
            onClick={() => zusageMutation.mutate("abgesagt")}
            disabled={zusageMutation.isPending}
            variant={meineZusage?.status === "abgesagt" ? "destructive" : "outline"}
            className="h-11"
            data-testid={`button-absagen-${termin.id}`}
          >
            <X className="mr-2 h-4 w-4" />
            Absagen
          </Button>
        </div>

        {zusagenLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 text-green-600">
                  ✓ Zugesagt ({zugesagt.length})
                </h4>
                <div className="space-y-1" data-testid={`list-zugesagt-${termin.id}`}>
                  {zugesagt.map((z) => {
                    const user = users.find((u) => u.id === z.user_id);
                    return (
                      <div key={z.id} className="text-muted-foreground">
                        {user ? `${user.vorname} ${user.nachname}` : "Unbekannt"}
                      </div>
                    );
                  })}
                  {zugesagt.length === 0 && (
                    <div className="text-muted-foreground italic">Keine Zusagen</div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-red-600">
                  ✗ Abgesagt ({abgesagt.length})
                </h4>
                <div className="space-y-1" data-testid={`list-abgesagt-${termin.id}`}>
                  {abgesagt.map((z) => {
                    const user = users.find((u) => u.id === z.user_id);
                    return (
                      <div key={z.id} className="text-muted-foreground">
                        {user ? `${user.vorname} ${user.nachname}` : "Unbekannt"}
                      </div>
                    );
                  })}
                  {abgesagt.length === 0 && (
                    <div className="text-muted-foreground italic">Keine Absagen</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
