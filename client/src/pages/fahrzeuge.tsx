import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vehicle, InsertVehicle, VehicleConfig } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Settings, Users } from "lucide-react";

export default function Fahrzeuge() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Fahrzeuge
        </h1>

        <Tabs defaultValue="fahrzeuge" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fahrzeuge" data-testid="tab-fahrzeuge">
              <Truck className="h-4 w-4 mr-2" />
              Fahrzeugliste
            </TabsTrigger>
            <TabsTrigger value="konfigurationen" data-testid="tab-konfigurationen">
              <Settings className="h-4 w-4 mr-2" />
              Konfigurationen
            </TabsTrigger>
            <TabsTrigger value="zuteilung" data-testid="tab-zuteilung">
              <Users className="h-4 w-4 mr-2" />
              Automatische Zuteilung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fahrzeuge" className="mt-6">
            <FahrzeuglisteTab />
          </TabsContent>

          <TabsContent value="konfigurationen" className="mt-6">
            <KonfigurationenTab />
          </TabsContent>

          <TabsContent value="zuteilung" className="mt-6">
            <ZuteilungTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FahrzeuglisteTab() {
  const [name, setName] = useState("");
  const [funk, setFunk] = useState("");
  const [besatzung, setBesatzung] = useState("9");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/vehicles/seed", {});
      return await response.json();
    },
    onSuccess: (data: { created: number; skipped: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Fahrzeuge erstellt",
        description: data.message,
        duration: 5000,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeuge konnten nicht erstellt werden",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertVehicle }) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setEditDialogOpen(false);
      setEditingVehicle(null);
      toast({
        title: "Fahrzeug aktualisiert",
        description: "Das Fahrzeug wurde erfolgreich aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeug konnte nicht aktualisiert werden",
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

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    
    updateMutation.mutate({
      id: editingVehicle.id,
      data: {
        name: editingVehicle.name,
        funk: editingVehicle.funk,
        besatzung: editingVehicle.besatzung,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fahrzeugliste</CardTitle>
              <CardDescription>Einfache Fahrzeugverwaltung für Funk und Besatzung</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-vehicles"
            >
              <Truck className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Erstelle..." : "Aus Konfigurationen"}
            </Button>
          </div>
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
                    <TableHead className="w-40">Aktionen</TableHead>
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(vehicle)}
                              data-testid={`button-edit-${vehicle.id}`}
                            >
                              Bearbeiten
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id, vehicle.name)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${vehicle.id}`}
                            >
                              Löschen
                            </Button>
                          </div>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrzeug bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingVehicle?.name || ""}
                onChange={(e) => setEditingVehicle(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="z.B. HLF 20"
                required
                data-testid="input-edit-name"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-funk">Funkrufname</Label>
              <Input
                id="edit-funk"
                value={editingVehicle?.funk || ""}
                onChange={(e) => setEditingVehicle(prev => prev ? { ...prev, funk: e.target.value } : null)}
                placeholder="z.B. Florian Schwedt 01/43-01"
                required
                data-testid="input-edit-funk"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-besatzung">Besatzung</Label>
              <Input
                id="edit-besatzung"
                type="number"
                min="1"
                value={editingVehicle?.besatzung || ""}
                onChange={(e) => setEditingVehicle(prev => prev ? { ...prev, besatzung: parseInt(e.target.value) || 0 } : null)}
                placeholder="z.B. 9"
                required
                data-testid="input-edit-besatzung"
                className="h-11"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMutation.isPending ? "Speichert..." : "Speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KonfigurationenTab() {
  const { data: configs, isLoading } = useQuery<VehicleConfig[]>({
    queryKey: ["/api/vehicle-configs"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fahrzeug-Konfigurationen</CardTitle>
          <CardDescription>
            Detaillierte Konfigurationen für automatische Besatzungszuteilung
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs?.map((config) => (
          <VehicleConfigCard key={config.id} config={config} />
        ))}
        
        {configs?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Keine Fahrzeug-Konfigurationen vorhanden
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function VehicleConfigCard({ config }: { config: VehicleConfig }) {
  const slots = config.slots as any[];
  const constraints = config.constraints as any;

  return (
    <Card className="shadow-lg" data-testid={`card-config-${config.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{config.vehicle}</span>
          <Badge variant="outline">{config.type}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm">Positionen ({slots.length})</h4>
          <ScrollArea className="h-48">
            <div className="space-y-2 pr-4">
              {slots.map((slot, index) => (
                <div key={index} className="text-sm border-l-2 border-primary pl-3 py-1">
                  <div className="font-medium">{slot.position}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {slot.requires && slot.requires.length > 0 && (
                      <div>
                        Benötigt: {slot.requires.map((q: string) => (
                          <Badge key={q} variant="secondary" className="mr-1 text-xs">{q}</Badge>
                        ))}
                      </div>
                    )}
                    {slot.prefer && slot.prefer.length > 0 && (
                      <div>
                        Bevorzugt: {slot.prefer.map((q: string) => (
                          <Badge key={q} variant="outline" className="mr-1 text-xs">{q}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {constraints && Object.keys(constraints).length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Constraints</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(constraints).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SlotAssignment {
  position: string;
  assignedUser: { id: string; vorname: string; nachname: string; qualifikationen: string[] } | null;
  required: string[];
  prefer: string[];
  addons_required: string[];
  allow_fallback: boolean;
}

interface VehicleAssignment {
  vehicle: string;
  type: string;
  slots: SlotAssignment[];
  fulfilled: boolean;
  constraintsMet: boolean;
  warnings: string[];
}

interface CrewAssignmentResult {
  assignments: VehicleAssignment[];
  unassignedUsers: { id: string; vorname: string; nachname: string; qualifikationen: string[] }[];
  totalFulfilled: number;
  totalVehicles: number;
  warnings: string[];
}

function ZuteilungTab() {
  const [result, setResult] = useState<CrewAssignmentResult | null>(null);
  const { toast } = useToast();

  const assignmentMutation = useMutation({
    mutationFn: async (): Promise<CrewAssignmentResult> => {
      const response = await apiRequest("POST", "/api/crew-assignment", {});
      return await response.json();
    },
    onSuccess: (data: CrewAssignmentResult) => {
      setResult(data);
      toast({
        title: "Zuteilung abgeschlossen",
        description: `${data.totalFulfilled}/${data.totalVehicles} Fahrzeuge vollständig besetzt`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Automatische Zuteilung konnte nicht durchgeführt werden",
      });
    },
  });

  const handleAssignment = () => {
    assignmentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automatische Besatzungszuteilung</CardTitle>
          <CardDescription>
            Weist Kameraden automatisch zu Fahrzeugpositionen basierend auf Qualifikationen zu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleAssignment}
            disabled={assignmentMutation.isPending}
            className="w-full md:w-auto"
            data-testid="button-run-assignment"
          >
            {assignmentMutation.isPending ? "Zuteilung läuft..." : "Automatische Zuteilung starten"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.warnings.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="text-yellow-800 dark:text-yellow-200">
                  Warnungen ({result.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {result.warnings.map((warning, index) => (
                    <li key={index} data-testid={`warning-${index}`}>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6">
            {result.assignments.map((assignment, index) => (
              <VehicleAssignmentCard key={index} assignment={assignment} />
            ))}
          </div>

          {result.unassignedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nicht zugewiesen ({result.unassignedUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.unassignedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" data-testid={`unassigned-${user.id}`}>
                      {user.vorname} {user.nachname}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!result && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground max-w-md mx-auto">
                Klicken Sie auf "Automatische Zuteilung starten", um Kameraden optimal zu Fahrzeugpositionen zuzuweisen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VehicleAssignmentCard({ assignment }: { assignment: VehicleAssignment }) {
  return (
    <Card 
      className={`shadow-lg ${!assignment.fulfilled ? 'border-yellow-500' : assignment.constraintsMet ? 'border-green-500' : 'border-orange-500'}`}
      data-testid={`vehicle-assignment-${assignment.vehicle}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{assignment.vehicle}</CardTitle>
            <CardDescription>{assignment.type}</CardDescription>
          </div>
          <div className="flex gap-2">
            {assignment.fulfilled ? (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                Vollständig besetzt
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
                Unvollständig
              </Badge>
            )}
            {assignment.constraintsMet ? (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                Constraints erfüllt
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                Constraints nicht erfüllt
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assignment.slots.map((slot, index) => (
            <div 
              key={index} 
              className={`border-l-4 pl-4 py-2 ${slot.assignedUser ? 'border-green-500' : 'border-gray-300'}`}
              data-testid={`slot-${assignment.vehicle}-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{slot.position}</div>
                  {slot.assignedUser ? (
                    <div className="text-sm mt-1">
                      <Badge variant="default" className="mr-2">
                        {slot.assignedUser.vorname} {slot.assignedUser.nachname}
                      </Badge>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {slot.assignedUser.qualifikationen.map((qual) => (
                          <Badge key={qual} variant="outline" className="text-xs">
                            {qual}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-1">
                      Nicht besetzt
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground ml-4">
                  {slot.required.length > 0 && (
                    <div className="mb-1">
                      <span className="font-medium">Benötigt:</span> {slot.required.join(", ")}
                    </div>
                  )}
                  {slot.prefer.length > 0 && (
                    <div>
                      <span className="font-medium">Bevorzugt:</span> {slot.prefer.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {assignment.warnings.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">Fahrzeug-Warnungen:</h4>
            <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              {assignment.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
