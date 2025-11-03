import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Fahrzeuge() {
  const [name, setName] = useState("");
  const [funk, setFunk] = useState("");
  const [besatzung, setBesatzung] = useState("9");
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setName("");
      setFunk("");
      setBesatzung("9");
      toast({
        title: "Fahrzeug hinzugefügt",
        description: "Das Fahrzeug wurde erfolgreich hinzugefügt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeug konnte nicht hinzugefügt werden",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Fahrzeug gelöscht",
        description: "Das Fahrzeug wurde erfolgreich gelöscht",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeug konnte nicht gelöscht werden",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMutation.mutate({
      name: name.trim(),
      funk: funk.trim(),
      besatzung: parseInt(besatzung) || 0,
    });
  };

  const handleDelete = (id: number, vehicleName: string) => {
    if (confirm(`Fahrzeug "${vehicleName}" wirklich löschen?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="text-4xl">🚛</span>
          Fahrzeuge
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fahrzeuge Liste */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Fahrzeugliste</CardTitle>
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
                        <TableHead>Funkrufname</TableHead>
                        <TableHead className="text-center">Besatzung</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Noch keine Fahrzeuge vorhanden
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicles?.map((vehicle) => (
                          <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                            <TableCell className="font-semibold" data-testid={`text-name-${vehicle.id}`}>
                              {vehicle.name}
                            </TableCell>
                            <TableCell data-testid={`text-funk-${vehicle.id}`}>
                              {vehicle.funk}
                            </TableCell>
                            <TableCell className="text-center" data-testid={`text-besatzung-${vehicle.id}`}>
                              {vehicle.besatzung}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(vehicle.id, vehicle.name)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${vehicle.id}`}
                              >
                                Löschen
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Neues Fahrzeug */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Neues Fahrzeug</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. HLF 20"
                    required
                    data-testid="input-name"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funk">Funkrufname</Label>
                  <Input
                    id="funk"
                    value={funk}
                    onChange={(e) => setFunk(e.target.value)}
                    placeholder="z.B. Florian Schwedt 1/46/1"
                    data-testid="input-funk"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="besatzung">Besatzung</Label>
                  <Input
                    id="besatzung"
                    type="number"
                    min="0"
                    value={besatzung}
                    onChange={(e) => setBesatzung(e.target.value)}
                    required
                    data-testid="input-besatzung"
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={createMutation.isPending}
                  data-testid="button-add-vehicle"
                >
                  {createMutation.isPending ? "Wird gespeichert..." : "Fahrzeug hinzufügen"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
