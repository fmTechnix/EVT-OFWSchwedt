import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Vehicle, MaengelMeldung, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Camera, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Maengelmeldungen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [beschreibung, setBeschreibung] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: meldungen, isLoading: meldungenLoading } = useQuery<MaengelMeldung[]>({
    queryKey: ["/api/maengelmeldungen"],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/benutzer"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { vehicle_id: number; beschreibung: string; fotos: string[] }) => {
      return await apiRequest("POST", "/api/maengelmeldungen", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maengelmeldungen"] });
      toast({
        title: "Mängelmeldung erstellt",
        description: "Die Mängelmeldung wurde erfolgreich erstellt",
      });
      setIsDialogOpen(false);
      setSelectedVehicleId("");
      setBeschreibung("");
      setFotos([]);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Mängelmeldung konnte nicht erstellt werden",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PUT", `/api/maengelmeldungen/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maengelmeldungen"] });
      toast({
        title: "Status aktualisiert",
        description: "Der Status wurde erfolgreich aktualisiert",
      });
    },
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const MAX_PHOTOS = 5;
    const MAX_SIZE = 1.5 * 1024 * 1024; // 1.5MB original (becomes ~2MB base64)

    if (fotos.length + files.length > MAX_PHOTOS) {
      toast({
        variant: "destructive",
        title: "Zu viele Fotos",
        description: `Maximal ${MAX_PHOTOS} Fotos erlaubt`,
      });
      return;
    }

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_SIZE) {
        toast({
          variant: "destructive",
          title: "Foto zu groß",
          description: `${file.name} ist zu groß (max 1.5MB)`,
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Ungültiger Dateityp",
          description: `${file.name} ist kein Bild`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFotos((prev) => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !beschreibung) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte Fahrzeug und Beschreibung ausfüllen",
      });
      return;
    }

    createMutation.mutate({
      vehicle_id: parseInt(selectedVehicleId),
      beschreibung,
      fotos,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      offen: { variant: "destructive", label: "Offen" },
      in_bearbeitung: { variant: "secondary", label: "In Bearbeitung" },
      behoben: { variant: "default", label: "Behoben" },
    };

    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const filteredMeldungen = meldungen?.filter((meldung) => {
    const vehicleMatch = filterVehicle === "all" || meldung.vehicle_id === parseInt(filterVehicle);
    const statusMatch = filterStatus === "all" || meldung.status === filterStatus;
    return vehicleMatch && statusMatch;
  });

  const getUserName = (userId: string) => {
    const melder = allUsers?.find(u => u.id === userId);
    return melder ? `${melder.vorname} ${melder.nachname}` : "Unbekannt";
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    return vehicle?.name || `Fahrzeug #${vehicleId}`;
  };

  if (vehiclesLoading || meldungenLoading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-4 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Mängelmeldungen</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-meldung">
                <AlertCircle className="w-4 h-4 mr-2" />
                Neuer Mangel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Mängelmeldung erstellen</DialogTitle>
                <DialogDescription>
                  Melden Sie Mängel oder Defekte an Fahrzeugen mit Fotodokumentation
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Fahrzeug *</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger data-testid="select-vehicle-dialog">
                      <SelectValue placeholder="Fahrzeug auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()} data-testid={`select-vehicle-option-${vehicle.id}`}>
                          {vehicle.name} ({vehicle.funk})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beschreibung">Beschreibung *</Label>
                  <Textarea
                    id="beschreibung"
                    placeholder="Beschreiben Sie den Mangel..."
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                    rows={4}
                    data-testid="textarea-beschreibung"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fotos">Fotos (optional - max 5, je 1.5MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fotos"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoCapture}
                      className="hidden"
                      data-testid="input-fotos"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("fotos")?.click()}
                      disabled={fotos.length >= 5}
                      data-testid="button-add-photo"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Foto hinzufügen
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {fotos.length}/5 Foto(s)
                    </span>
                  </div>
                  
                  {fotos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {fotos.map((foto, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={foto} 
                            alt={`Foto ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => setFotos(fotos.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-dialog"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-meldung"
                  >
                    {createMutation.isPending ? "Wird erstellt..." : "Meldung erstellen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-vehicle">Fahrzeug</Label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger id="filter-vehicle" data-testid="select-filter-vehicle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Fahrzeuge</SelectItem>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" data-testid="select-filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="offen">Offen</SelectItem>
                    <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                    <SelectItem value="behoben">Behoben</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meldungen Liste */}
        <div className="space-y-4">
          {filteredMeldungen?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Keine Mängelmeldungen gefunden</p>
              </CardContent>
            </Card>
          ) : (
            filteredMeldungen?.map((meldung) => (
              <Card key={meldung.id} className="hover-elevate transition-all" data-testid={`card-meldung-${meldung.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {getVehicleName(meldung.vehicle_id)}
                      </CardTitle>
                      <CardDescription>
                        Gemeldet von {getUserName(meldung.melder_id)} am {format(new Date(meldung.erstellt_am), "PPP 'um' HH:mm", { locale: de })}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(meldung.status)}
                      {(user?.role === "admin" || user?.role === "moderator") && meldung.status !== "behoben" && (
                        <Select
                          value={meldung.status}
                          onValueChange={(status) => updateStatusMutation.mutate({ id: meldung.id, status })}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`select-status-${meldung.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offen">Offen</SelectItem>
                            <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                            <SelectItem value="behoben">Behoben</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Beschreibung:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{meldung.beschreibung}</p>
                  </div>

                  {meldung.fotos && meldung.fotos.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Fotos ({meldung.fotos.length}):</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {meldung.fotos.map((foto, index) => (
                          <img
                            key={index}
                            src={foto}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md border cursor-pointer hover-elevate transition-all"
                            onClick={() => window.open(foto, "_blank")}
                            data-testid={`image-foto-${meldung.id}-${index}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {meldung.behoben_am && (
                    <p className="text-sm text-muted-foreground">
                      Behoben am {format(new Date(meldung.behoben_am), "PPP 'um' HH:mm", { locale: de })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
