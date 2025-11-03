import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Kamerad, InsertKamerad, Qualifikation, User } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";

export default function Kameraden() {
  const [name, setName] = useState("");
  const [selectedQuals, setSelectedQuals] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: kameraden, isLoading } = useQuery<Kamerad[]>({
    queryKey: ["/api/kameraden"],
  });

  const { data: qualifikationen, isLoading: qualsLoading } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertKamerad) => {
      return await apiRequest("POST", "/api/kameraden", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kameraden"] });
      setName("");
      setSelectedQuals([]);
      toast({
        title: "Kamerad hinzugefügt",
        description: "Der Kamerad wurde erfolgreich hinzugefügt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Kamerad konnte nicht hinzugefügt werden",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/kameraden/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kameraden"] });
      toast({
        title: "Kamerad gelöscht",
        description: "Der Kamerad wurde erfolgreich gelöscht",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Kamerad konnte nicht gelöscht werden",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/kameraden/seed", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kameraden"] });
      toast({
        title: "Beispieldaten erstellt",
        description: "77 Beispielkameraden wurden erfolgreich generiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Beispieldaten konnten nicht erstellt werden",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/register", { vorname, nachname });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Benutzer registriert",
        description: `Login: ${vorname.toLowerCase()}.${nachname.toLowerCase()} mit Passwort "Feuer123"`,
        duration: 10000,
      });
      setDialogOpen(false);
      setVorname("");
      setNachname("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message.includes("409") ? "Benutzer existiert bereits" : "Registrierung fehlgeschlagen",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMutation.mutate({
      name: name.trim(),
      qualifikationen: selectedQuals,
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  const handleDelete = (id: number, kameradName: string) => {
    if (confirm(`Kamerad "${kameradName}" wirklich löschen?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleQualChange = (qual: string, checked: boolean) => {
    if (checked) {
      setSelectedQuals([...selectedQuals, qual]);
    } else {
      setSelectedQuals(selectedQuals.filter(q => q !== qual));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">👥</span>
            Kameraden & Benutzer
          </h1>
        </div>

        <Tabs defaultValue="kameraden" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="kameraden">Kameraden ({kameraden?.length || 0})</TabsTrigger>
            <TabsTrigger value="benutzer">Benutzer ({users?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="kameraden">
            <div className="flex justify-end mb-4">
              {user?.role === "admin" && (
                <Button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed"
                >
                  77 Beispiele generieren
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kameraden Liste */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Kameradenliste</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Qualifikationen</TableHead>
                            {user?.role === "admin" && <TableHead className="w-24"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kameraden?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                Noch keine Kameraden vorhanden
                              </TableCell>
                            </TableRow>
                          ) : (
                            kameraden?.map((kamerad) => (
                              <TableRow key={kamerad.id} data-testid={`row-kamerad-${kamerad.id}`}>
                                <TableCell className="font-semibold" data-testid={`text-name-${kamerad.id}`}>
                                  {kamerad.name}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {kamerad.qualifikationen.map((qual) => (
                                      <Badge key={qual} variant="secondary" className="text-xs">
                                        {qual}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                {user?.role === "admin" && (
                                  <TableCell>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDelete(kamerad.id, kamerad.name)}
                                      disabled={deleteMutation.isPending}
                                      data-testid={`button-delete-${kamerad.id}`}
                                    >
                                      Löschen
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Neuer Kamerad */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Neuer Kamerad</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z.B. Max Mustermann"
                        required
                        data-testid="input-name"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Qualifikationen</Label>
                      {qualsLoading ? (
                        <Skeleton className="h-24 w-full" />
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {qualifikationen?.map((qual) => (
                            <div key={qual.kuerzel} className="flex items-center space-x-2">
                              <Checkbox
                                id={qual.kuerzel}
                                checked={selectedQuals.includes(qual.kuerzel)}
                                onCheckedChange={(checked) => handleQualChange(qual.kuerzel, checked as boolean)}
                                data-testid={`checkbox-${qual.kuerzel.toLowerCase()}`}
                              />
                              <label
                                htmlFor={qual.kuerzel}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {qual.kuerzel}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={createMutation.isPending}
                      data-testid="button-add-kamerad"
                    >
                      {createMutation.isPending ? "Wird gespeichert..." : "Kamerad hinzufügen"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="benutzer">
            <div className="flex justify-end mb-4">
              {user?.role === "admin" && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-register-user">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Benutzer registrieren
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Neuen Benutzer registrieren</DialogTitle>
                      <DialogDescription>
                        Der Benutzer erhält das Standard-Passwort "Feuer123" und muss es beim ersten Login ändern.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vorname">Vorname</Label>
                        <Input
                          id="vorname"
                          value={vorname}
                          onChange={(e) => setVorname(e.target.value)}
                          placeholder="z.B. Max"
                          required
                          data-testid="input-vorname"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nachname">Nachname</Label>
                        <Input
                          id="nachname"
                          value={nachname}
                          onChange={(e) => setNachname(e.target.value)}
                          placeholder="z.B. Mustermann"
                          required
                          data-testid="input-nachname"
                          className="h-11"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        Login: <strong>{vorname && nachname ? `${vorname.toLowerCase()}.${nachname.toLowerCase()}` : "(wird generiert)"}</strong>
                        <br />
                        Passwort: <strong>Feuer123</strong>
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
                          disabled={registerMutation.isPending}
                          className="h-11"
                          data-testid="button-submit-register"
                        >
                          {registerMutation.isPending ? "Wird erstellt..." : "Registrieren"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Benutzerverwaltung</CardTitle>
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
                        {user?.role === "admin" && <TableHead className="w-48">Aktion</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((u) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium" data-testid={`text-username-${u.id}`}>
                              {u.username}
                            </TableCell>
                            <TableCell data-testid={`text-name-${u.id}`}>
                              {u.name}
                            </TableCell>
                            <TableCell data-testid={`text-role-${u.id}`}>
                              {u.role === "admin" ? "Administrator" : u.role === "moderator" ? "Moderator" : "Mitglied"}
                            </TableCell>
                            {user?.role === "admin" && (
                              <TableCell>
                                <Select
                                  value={u.role}
                                  onValueChange={(role) => updateUserRoleMutation.mutate({ userId: u.id, role })}
                                  disabled={updateUserRoleMutation.isPending}
                                >
                                  <SelectTrigger 
                                    className="h-9 w-[150px]" 
                                    data-testid={`select-role-${u.id}`}
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
                            )}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
