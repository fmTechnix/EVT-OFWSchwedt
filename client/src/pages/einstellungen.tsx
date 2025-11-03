import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings, Einsatz } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Einstellungen() {
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  const [schichtlaenge, setSchichtlaenge] = useState("");
  const [minAgt, setMinAgt] = useState("");
  const [minMaschinist, setMinMaschinist] = useState("");
  const [minGf, setMinGf] = useState("");
  const [stichwort, setStichwort] = useState("");
  const [mannschaftsbedarf, setMannschaftsbedarf] = useState("");
  const [bemerkung, setBemerkung] = useState("");

  useEffect(() => {
    if (settings) {
      setSchichtlaenge(settings.schichtlaenge_std.toString());
      setMinAgt(settings.min_agt.toString());
      setMinMaschinist(settings.min_maschinist.toString());
      setMinGf(settings.min_gf.toString());
    }
  }, [settings]);

  useEffect(() => {
    if (einsatz) {
      setStichwort(einsatz.stichwort);
      setMannschaftsbedarf(einsatz.mannschaftsbedarf.toString());
      setBemerkung(einsatz.bemerkung);
    }
  }, [einsatz]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/settings", {
        schichtlaenge_std: parseInt(schichtlaenge),
        min_agt: parseInt(minAgt),
        min_maschinist: parseInt(minMaschinist),
        min_gf: parseInt(minGf),
      });
      await apiRequest("PUT", "/api/einsatz", {
        stichwort,
        mannschaftsbedarf: parseInt(mannschaftsbedarf),
        bemerkung,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/einsatz"] });
      queryClient.invalidateQueries({ queryKey: ["/api/besetzungscheck"] });
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Einstellungen wurden erfolgreich aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const isLoading = settingsLoading || einsatzLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="text-4xl">⚙️</span>
          Einstellungen
        </h1>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Einsatz & Mindestanforderungen</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="schichtlaenge">Schichtlänge (Std)</Label>
                    <Input
                      id="schichtlaenge"
                      type="number"
                      min="0"
                      value={schichtlaenge}
                      onChange={(e) => setSchichtlaenge(e.target.value)}
                      required
                      data-testid="input-schichtlaenge"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-agt">Min. AGT</Label>
                    <Input
                      id="min-agt"
                      type="number"
                      min="0"
                      value={minAgt}
                      onChange={(e) => setMinAgt(e.target.value)}
                      required
                      data-testid="input-min-agt"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-maschinist">Min. Maschinist</Label>
                    <Input
                      id="min-maschinist"
                      type="number"
                      min="0"
                      value={minMaschinist}
                      onChange={(e) => setMinMaschinist(e.target.value)}
                      required
                      data-testid="input-min-maschinist"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-gf">Min. Gruppenführer</Label>
                    <Input
                      id="min-gf"
                      type="number"
                      min="0"
                      value={minGf}
                      onChange={(e) => setMinGf(e.target.value)}
                      required
                      data-testid="input-min-gf"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stichwort">Stichwort</Label>
                    <Input
                      id="stichwort"
                      value={stichwort}
                      onChange={(e) => setStichwort(e.target.value)}
                      required
                      data-testid="input-stichwort"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mannschaftsbedarf">Mannschaftsbedarf</Label>
                    <Input
                      id="mannschaftsbedarf"
                      type="number"
                      min="0"
                      value={mannschaftsbedarf}
                      onChange={(e) => setMannschaftsbedarf(e.target.value)}
                      required
                      data-testid="input-mannschaftsbedarf"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bemerkung">Bemerkung</Label>
                  <Textarea
                    id="bemerkung"
                    value={bemerkung}
                    onChange={(e) => setBemerkung(e.target.value)}
                    rows={3}
                    data-testid="input-bemerkung"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={saveMutation.isPending}
                  data-testid="button-save"
                >
                  {saveMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
