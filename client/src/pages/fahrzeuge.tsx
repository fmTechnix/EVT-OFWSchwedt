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
import { Truck, Settings, Users, Pencil, Plus, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Qualifikation } from "@shared/schema";

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fahrzeuge" data-testid="tab-fahrzeuge">
              <Truck className="h-4 w-4 mr-2" />
              Fahrzeuge
            </TabsTrigger>
            <TabsTrigger value="zuteilung" data-testid="tab-zuteilung">
              <Users className="h-4 w-4 mr-2" />
              Automatische Zuteilung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fahrzeuge" className="mt-6">
            <FahrzeugeTab />
          </TabsContent>

          <TabsContent value="zuteilung" className="mt-6">
            <ZuteilungTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FahrzeugeTab() {
  const [editingConfig, setEditingConfig] = useState<VehicleConfig | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleFunk, setNewVehicleFunk] = useState("");
  const [newVehicleBesatzung, setNewVehicleBesatzung] = useState("9");
  const { toast } = useToast();
  
  const { data: configs, isLoading } = useQuery<VehicleConfig[]>({
    queryKey: ["/api/vehicle-configs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-configs"] });
      setCreateDialogOpen(false);
      setNewVehicleName("");
      setNewVehicleFunk("");
      setNewVehicleBesatzung("9");
      toast({
        title: "Fahrzeug erstellt",
        description: "Das Fahrzeug wurde mit Standard-Konfiguration erstellt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeug konnte nicht erstellt werden",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/vehicle-configs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Fahrzeug gelöscht",
        description: "Das Fahrzeug wurde gelöscht",
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

  const handleEdit = (config: VehicleConfig) => {
    setEditingConfig(config);
    setEditDialogOpen(true);
  };

  const handleDelete = (config: VehicleConfig) => {
    if (confirm(`Fahrzeug "${config.vehicle}" wirklich löschen?`)) {
      deleteMutation.mutate(config.id);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newVehicleName.trim();
    const trimmedFunk = newVehicleFunk.trim();
    const besatzungNum = parseInt(newVehicleBesatzung);
    
    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeugname darf nicht leer sein",
      });
      return;
    }
    
    if (!trimmedFunk) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Funkrufname darf nicht leer sein",
      });
      return;
    }
    
    if (isNaN(besatzungNum) || besatzungNum < 1) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Besatzungsgröße muss eine Zahl größer als 0 sein",
      });
      return;
    }
    
    createMutation.mutate({
      name: trimmedName,
      funk: trimmedFunk,
      besatzung: besatzungNum,
    });
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fahrzeuge</CardTitle>
              <CardDescription>
                Fahrzeuge verwalten und Besatzungskonfiguration anpassen
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              data-testid="button-create-vehicle"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neues Fahrzeug
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs?.map((config) => (
          <VehicleConfigCard 
            key={config.id} 
            config={config} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        
        {configs?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Keine Fahrzeuge vorhanden. Klicke auf "Neues Fahrzeug" um zu starten.
            </CardContent>
          </Card>
        )}
      </div>

      {editingConfig && (
        <VehicleConfigEditDialog
          config={editingConfig}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingConfig(null);
          }}
        />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Neues Fahrzeug anlegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-vehicle-name">Fahrzeugname</Label>
              <Input
                id="new-vehicle-name"
                value={newVehicleName}
                onChange={(e) => setNewVehicleName(e.target.value)}
                placeholder="z.B. HLF 20, MTF, DL 30"
                required
                data-testid="input-new-vehicle-name"
              />
            </div>
            <div>
              <Label htmlFor="new-vehicle-funk">Funkrufname</Label>
              <Input
                id="new-vehicle-funk"
                value={newVehicleFunk}
                onChange={(e) => setNewVehicleFunk(e.target.value)}
                placeholder="z.B. Florian Schwedt 24/43-01"
                required
                data-testid="input-new-vehicle-funk"
              />
            </div>
            <div>
              <Label htmlFor="new-vehicle-besatzung">Besatzungsgröße</Label>
              <Input
                id="new-vehicle-besatzung"
                type="number"
                min="1"
                max="20"
                value={newVehicleBesatzung}
                onChange={(e) => setNewVehicleBesatzung(e.target.value)}
                required
                data-testid="input-new-vehicle-besatzung"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Die Besatzungskonfiguration wird automatisch basierend auf dem Fahrzeugtyp erstellt.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                data-testid="button-cancel-create"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-save-create"
              >
                {createMutation.isPending ? "Erstellt..." : "Erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehicleConfigEditDialog({ 
  config, 
  open, 
  onOpenChange 
}: { 
  config: VehicleConfig; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [vehicleName, setVehicleName] = useState(config.vehicle);
  const [vehicleType, setVehicleType] = useState(config.type);
  const [vehicleFunk, setVehicleFunk] = useState("");
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [slots, setSlots] = useState<any[]>(JSON.parse(JSON.stringify(config.slots)) || []);
  const { toast } = useToast();
  
  const { data: qualifikationen } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  // Find matching vehicle and set funk value
  useState(() => {
    if (vehicles) {
      const matchingVehicle = vehicles.find(v => v.name === config.vehicle);
      if (matchingVehicle) {
        setVehicleFunk(matchingVehicle.funk);
        setVehicleId(matchingVehicle.id);
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/vehicle-configs/${config.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-configs"] });
      onOpenChange(false);
      toast({
        title: "Konfiguration gespeichert",
        description: "Die Fahrzeug-Konfiguration wurde aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Konfiguration konnte nicht gespeichert werden",
      });
    },
  });

  const handleSave = () => {
    if (!vehicleName.trim()) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeugname darf nicht leer sein",
      });
      return;
    }
    
    if (!vehicleType.trim()) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fahrzeugtyp darf nicht leer sein",
      });
      return;
    }
    
    updateMutation.mutate({
      vehicle: vehicleName.trim(),
      type: vehicleType.trim(),
      slots,
      constraints: config.constraints || {},
    });
  };

  const addSlot = () => {
    setSlots([...slots, { position: `Platz ${slots.length + 1}`, requires: [], prefer: [] }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: string, value: any) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const toggleQualification = (slotIndex: number, field: 'requires' | 'prefer', qual: string) => {
    const slot = slots[slotIndex];
    const qualList = slot[field] || [];
    const newQualList = qualList.includes(qual)
      ? qualList.filter((q: string) => q !== qual)
      : [...qualList, qual];
    updateSlot(slotIndex, field, newQualList);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fahrzeug-Konfiguration bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-vehicle-name">Fahrzeugname</Label>
              <Input
                id="edit-vehicle-name"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="z.B. HLF 20, MTF, DL 30"
                data-testid="input-edit-vehicle-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-vehicle-type">Fahrzeugtyp</Label>
              <Input
                id="edit-vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="z.B. HLF, MTW, DL"
                data-testid="input-edit-vehicle-type"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Positionen ({slots.length})</h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addSlot}
              data-testid="button-add-slot"
            >
              <Plus className="h-4 w-4 mr-1" />
              Position hinzufügen
            </Button>
          </div>

          <div className="space-y-4">
            {slots.map((slot, index) => (
              <Card key={index} data-testid={`slot-editor-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={slot.position}
                      onChange={(e) => updateSlot(index, 'position', e.target.value)}
                      placeholder="Position"
                      className="max-w-xs"
                      data-testid={`input-position-${index}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSlot(index)}
                      data-testid={`button-remove-slot-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Benötigte Qualifikationen
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {qualifikationen?.map((qual) => (
                        <div key={qual.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`requires-${index}-${qual.id}`}
                            checked={(slot.requires || []).includes(qual.kuerzel)}
                            onCheckedChange={() => toggleQualification(index, 'requires', qual.kuerzel)}
                            data-testid={`checkbox-requires-${index}-${qual.kuerzel}`}
                          />
                          <label
                            htmlFor={`requires-${index}-${qual.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {qual.kuerzel}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Bevorzugte Qualifikationen
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {qualifikationen?.map((qual) => (
                        <div key={qual.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`prefer-${index}-${qual.id}`}
                            checked={(slot.prefer || []).includes(qual.kuerzel)}
                            onCheckedChange={() => toggleQualification(index, 'prefer', qual.kuerzel)}
                            data-testid={`checkbox-prefer-${index}-${qual.kuerzel}`}
                          />
                          <label
                            htmlFor={`prefer-${index}-${qual.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {qual.kuerzel}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit-config"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-config"
          >
            {updateMutation.isPending ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VehicleConfigCard({ 
  config, 
  onEdit, 
  onDelete 
}: { 
  config: VehicleConfig; 
  onEdit: (config: VehicleConfig) => void;
  onDelete: (config: VehicleConfig) => void;
}) {
  const slots = config.slots as any[];
  const constraints = config.constraints as any;

  return (
    <Card className="shadow-lg" data-testid={`card-config-${config.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{config.vehicle}</span>
            <Badge variant="outline">{config.type}</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(config)}
              data-testid={`button-edit-config-${config.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(config)}
              data-testid={`button-delete-config-${config.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
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
  const { toast } = useToast();

  const { data: result, isLoading } = useQuery<CrewAssignmentResult>({
    queryKey: ["/api/crew-assignment"],
  });

  const assignmentMutation = useMutation({
    mutationFn: async (): Promise<CrewAssignmentResult> => {
      const response = await apiRequest("POST", "/api/crew-assignment", {});
      return await response.json();
    },
    onSuccess: (data: CrewAssignmentResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crew-assignment"] });
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : result && result.assignments.length > 0 ? (
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
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground max-w-md mx-auto">
                Noch keine Zuteilung vorhanden. Klicken Sie auf "Automatische Zuteilung starten", um Kameraden optimal zu Fahrzeugpositionen zuzuweisen.
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
