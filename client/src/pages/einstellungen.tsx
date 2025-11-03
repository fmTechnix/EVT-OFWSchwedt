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
import type { Settings, Einsatz, Qualifikation, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Einstellungen() {
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  const { data: qualifikationen, isLoading: qualifikationenLoading } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const [schichtlaenge, setSchichtlaenge] = useState("");
  const [minAgt, setMinAgt] = useState("");
  const [minMaschinist, setMinMaschinist] = useState("");
  const [minGf, setMinGf] = useState("");
  const [stichwort, setStichwort] = useState("");
  const [mannschaftsbedarf, setMannschaftsbedarf] = useState("");
  const [bemerkung, setBemerkung] = useState("");
  
  // Qualifikation form state
  const [qualKuerzel, setQualKuerzel] = useState("");
  const [qualName, setQualName] = useState("");
  const [qualBeschreibung, setQualBeschreibung] = useState("");

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

  const addQualifikationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/qualifikationen", {
        kuerzel: qualKuerzel,
        name: qualName,
        beschreibung: qualBeschreibung,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifikationen"] });
      setQualKuerzel("");
      setQualName("");
      setQualBeschreibung("");
      toast({
        title: "Qualifikation hinzugefügt",
        description: "Die Qualifikation wurde erfolgreich erstellt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Qualifikation konnte nicht erstellt werden",
      });
    },
  });

  const deleteQualifikationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/qualifikationen/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifikationen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kameraden"] });
      toast({
        title: "Qualifikation gelöscht",
        description: "Die Qualifikation wurde erfolgreich entfernt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Qualifikation konnte nicht gelöscht werden",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Rolle aktualisiert",
        description: "Die Benutzerrolle wurde erfolgreich geändert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rolle konnte nicht aktualisiert werden",
      });
    },
  });

  const handleAddQualifikation = (e: React.FormEvent) => {
    e.preventDefault();
    addQualifikationMutation.mutate();
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

        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle>Benutzer und Rollen</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead className="w-48">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                          {user.username}
                        </TableCell>
                        <TableCell data-testid={`text-name-${user.id}`}>
                          {user.name}
                        </TableCell>
                        <TableCell data-testid={`text-role-${user.id}`}>
                          {user.role === "admin" ? "Administrator" : user.role === "moderator" ? "Moderator" : "Mitglied"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                            disabled={updateUserRoleMutation.isPending}
                          >
                            <SelectTrigger 
                              className="h-9 w-[150px]" 
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="member">Mitglied</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Keine Benutzer vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle>Qualifikationen verwalten</CardTitle>
          </CardHeader>
          <CardContent>
            {qualifikationenLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kürzel</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead className="w-20">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualifikationen && qualifikationen.length > 0 ? (
                        qualifikationen.map((qual) => (
                          <TableRow key={qual.id}>
                            <TableCell className="font-medium">{qual.kuerzel}</TableCell>
                            <TableCell>{qual.name}</TableCell>
                            <TableCell>{qual.beschreibung}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteQualifikationMutation.mutate(qual.id)}
                                disabled={deleteQualifikationMutation.isPending}
                                data-testid={`button-delete-qual-${qual.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Keine Qualifikationen vorhanden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <form onSubmit={handleAddQualifikation} className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Neue Qualifikation hinzufügen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qual-kuerzel">Kürzel</Label>
                      <Input
                        id="qual-kuerzel"
                        value={qualKuerzel}
                        onChange={(e) => setQualKuerzel(e.target.value)}
                        placeholder="z.B. AGT"
                        required
                        data-testid="input-qual-kuerzel"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qual-name">Name</Label>
                      <Input
                        id="qual-name"
                        value={qualName}
                        onChange={(e) => setQualName(e.target.value)}
                        placeholder="z.B. Atemschutzgeräteträger"
                        required
                        data-testid="input-qual-name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qual-beschreibung">Beschreibung</Label>
                      <Input
                        id="qual-beschreibung"
                        value={qualBeschreibung}
                        onChange={(e) => setQualBeschreibung(e.target.value)}
                        placeholder="z.B. Berechtigung zum Tragen von Atemschutz"
                        required
                        data-testid="input-qual-beschreibung"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={addQualifikationMutation.isPending}
                    data-testid="button-add-qualifikation"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addQualifikationMutation.isPending ? "Wird hinzugefügt..." : "Qualifikation hinzufügen"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
