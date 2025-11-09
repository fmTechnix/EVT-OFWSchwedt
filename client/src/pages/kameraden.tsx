import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Qualifikation } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Trash2, Key, Search, Users, Download, Upload } from "lucide-react";

export default function Kameraden() {
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nachname" | "vorname" | "username">("nachname");
  const [editingUser, setEditingUser] = useState<Omit<User, "password"> | null>(null);
  const [editingQuals, setEditingQuals] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: users, isLoading: usersLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users", { search: searchTerm, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("sortBy", sortBy);
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: qualifikationen, isLoading: qualsLoading } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/register", { vorname, nachname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Benutzer registriert",
        description: `Login: ${vorname.toLowerCase()}${nachname.toLowerCase()} mit Passwort "Feuer123"`,
        duration: 10000,
      });
      setRegisterDialogOpen(false);
      setVorname("");
      setNachname("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnte nicht registriert werden",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return await apiRequest("PATCH", `/api/users/${id}/role`, { role });
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

  const updateQualsMutation = useMutation({
    mutationFn: async ({ id, qualifikationen }: { id: string; qualifikationen: string[] }) => {
      return await apiRequest("PATCH", `/api/users/${id}/qualifikationen`, { qualifikationen });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Qualifikationen aktualisiert",
        description: "Die Qualifikationen wurden erfolgreich geändert",
      });
      setEditingUser(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Qualifikationen konnten nicht aktualisiert werden",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/users/${id}/reset-password`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Passwort zurückgesetzt",
        description: 'Passwort wurde auf "Feuer123" zurückgesetzt',
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Passwort konnte nicht zurückgesetzt werden",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnte nicht gelöscht werden",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/users/export", {
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
      a.download = "benutzer.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export erfolgreich",
        description: "Benutzerdaten wurden als CSV exportiert",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Export fehlgeschlagen",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await apiRequest("POST", "/api/users/import", { csvData });
      return await response.json();
    },
    onSuccess: (data: { imported: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Import erfolgreich",
        description: `${data.imported} Benutzer importiert, ${data.skipped} übersprungen`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Import fehlgeschlagen",
      });
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      importMutation.mutate(csvData);
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = "";
  };

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/users/seed", {});
      return await response.json();
    },
    onSuccess: (data: { created: number; skipped: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Testbenutzer erstellt",
        description: data.message,
        duration: 5000,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Testbenutzer konnten nicht erstellt werden",
      });
    },
  });

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vorname || !nachname) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte Vor- und Nachname eingeben",
      });
      return;
    }
    registerMutation.mutate();
  };

  const handleOpenEditQuals = (u: Omit<User, "password">) => {
    setEditingUser(u);
    setEditingQuals(u.qualifikationen);
  };

  const handleSaveQuals = () => {
    if (editingUser) {
      updateQualsMutation.mutate({ id: editingUser.id, qualifikationen: editingQuals });
    }
  };

  const toggleQual = (kuerzel: string) => {
    if (editingQuals.includes(kuerzel)) {
      setEditingQuals(editingQuals.filter(q => q !== kuerzel));
    } else {
      setEditingQuals([...editingQuals, kuerzel]);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>Keine Berechtigung</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Sie haben keine Berechtigung, diese Seite anzuzeigen.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Benutzer
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" data-testid="button-add-user">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Benutzer hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] w-[95vw]">
                    <DialogHeader>
                      <DialogTitle>Neuen Benutzer registrieren</DialogTitle>
                      <DialogDescription>
                        Erstellen Sie einen neuen Benutzer. Der Benutzername wird automatisch aus Vor- und Nachname generiert.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitRegister}>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="vorname">Vorname</Label>
                          <Input
                            id="vorname"
                            data-testid="input-vorname"
                            value={vorname}
                            onChange={(e) => setVorname(e.target.value)}
                            placeholder="Max"
                          />
                        </div>
                        <div>
                          <Label htmlFor="nachname">Nachname</Label>
                          <Input
                            id="nachname"
                            data-testid="input-nachname"
                            value={nachname}
                            onChange={(e) => setNachname(e.target.value)}
                            placeholder="Mustermann"
                          />
                        </div>
                        {vorname && nachname && (
                          <div className="text-sm text-muted-foreground">
                            Benutzername: {vorname.toLowerCase()}{nachname.toLowerCase()}
                            <br />
                            Passwort: Feuer123 (muss beim ersten Login geändert werden)
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" data-testid="button-submit-register" disabled={registerMutation.isPending}>
                          {registerMutation.isPending ? "Wird erstellt..." : "Benutzer erstellen"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  data-testid="button-export-users"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="button-import-users"
                >
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImport}
                      className="hidden"
                      disabled={importMutation.isPending}
                    />
                  </label>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-users"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {seedMutation.isPending ? "Erstelle..." : "77 Testbenutzer"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Benutzer suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-search"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nachname">Nach Nachname</SelectItem>
                    <SelectItem value="vorname">Nach Vorname</SelectItem>
                    <SelectItem value="username">Nach Username</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="w-full overflow-x-auto">
                  <div className="min-w-[640px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vorname</TableHead>
                          <TableHead>Nachname</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Rolle</TableHead>
                          <TableHead>Qualifikationen</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users && users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Keine Benutzer gefunden
                            </TableCell>
                          </TableRow>
                        ) : (
                          users?.map((u) => (
                            <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                              <TableCell data-testid={`text-vorname-${u.id}`}>{u.vorname}</TableCell>
                              <TableCell data-testid={`text-nachname-${u.id}`}>{u.nachname}</TableCell>
                              <TableCell data-testid={`text-username-${u.id}`}>{u.username}</TableCell>
                              <TableCell>
                                <Select
                                  value={u.role}
                                  onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                                  data-testid={`select-role-${u.id}`}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {u.qualifikationen.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">Keine</span>
                                  ) : (
                                    u.qualifikationen.map((q) => (
                                      <Badge key={q} variant="secondary" data-testid={`badge-qual-${q}-${u.id}`}>
                                        {q}
                                      </Badge>
                                    ))
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditQuals(u)}
                                    data-testid={`button-edit-quals-${u.id}`}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Bearbeiten
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetPasswordMutation.mutate(u.id)}
                                    data-testid={`button-reset-password-${u.id}`}
                                    title="Passwort zurücksetzen"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUserMutation.mutate(u.id)}
                                    data-testid={`button-delete-user-${u.id}`}
                                    title="Benutzer löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}

              {users && users.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {users.length} Benutzer gesamt
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Qualifications Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Qualifikationen bearbeiten</DialogTitle>
            <DialogDescription>
              {editingUser && `${editingUser.vorname} ${editingUser.nachname} (${editingUser.username})`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {qualsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {qualifikationen?.map((qual) => (
                  <div key={qual.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`qual-${qual.id}`}
                      checked={editingQuals.includes(qual.kuerzel)}
                      onCheckedChange={() => toggleQual(qual.kuerzel)}
                      data-testid={`checkbox-qual-${qual.kuerzel}`}
                    />
                    <label
                      htmlFor={`qual-${qual.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <span className="font-bold">{qual.kuerzel}</span> - {qual.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} data-testid="button-cancel-quals">
              Abbrechen
            </Button>
            <Button onClick={handleSaveQuals} disabled={updateQualsMutation.isPending} data-testid="button-save-quals">
              {updateQualsMutation.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
