import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Kamerad, InsertKamerad, Qualifikation } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function Kameraden() {
  const [name, setName] = useState("");
  const [selectedQuals, setSelectedQuals] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: kameraden, isLoading } = useQuery<Kamerad[]>({
    queryKey: ["/api/kameraden"],
  });

  const { data: qualifikationen, isLoading: qualsLoading } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMutation.mutate({
      name: name.trim(),
      qualifikationen: selectedQuals,
    });
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
            Kameraden ({kameraden?.length || 0})
          </h1>
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
      </main>
    </div>
  );
}
