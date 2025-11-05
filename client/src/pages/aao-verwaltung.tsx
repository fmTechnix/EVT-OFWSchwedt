import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAaoStichwortSchema, type AaoStichwort, type Vehicle } from "@shared/schema";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = insertAaoStichwortSchema.extend({
  stichwort: z.string().min(1, "Stichwort erforderlich"),
  kategorie: z.enum(["brand", "hilfeleistung", "sonstige"]),
  beschreibung: z.string().min(1, "Beschreibung erforderlich"),
  fahrzeuge: z.array(z.string()).min(1, "Mindestens ein Fahrzeug erforderlich"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AaoVerwaltung() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStichwort, setEditingStichwort] = useState<AaoStichwort | null>(null);
  const [deletingStichwort, setDeletingStichwort] = useState<AaoStichwort | null>(null);

  const { data: stichworte, isLoading } = useQuery<AaoStichwort[]>({
    queryKey: ["/api/aao"],
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const defaultFormValues: FormValues = {
    stichwort: "",
    kategorie: "brand",
    beschreibung: "",
    fahrzeuge: [],
    bemerkung: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return apiRequest("POST", "/api/aao", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aao"] });
      setIsCreateDialogOpen(false);
      form.reset(defaultFormValues);
      toast({
        title: "Erfolgreich",
        description: "AAO-Stichwort wurde erstellt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: FormValues }) => {
      return apiRequest("PATCH", `/api/aao/${id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aao"] });
      setEditingStichwort(null);
      form.reset(defaultFormValues);
      toast({
        title: "Erfolgreich",
        description: "AAO-Stichwort wurde aktualisiert",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/aao/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aao"] });
      setDeletingStichwort(null);
      toast({
        title: "Erfolgreich",
        description: "AAO-Stichwort wurde gelöscht",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (stichwort: AaoStichwort) => {
    setEditingStichwort(stichwort);
    form.reset({
      stichwort: stichwort.stichwort,
      kategorie: stichwort.kategorie as "brand" | "hilfeleistung" | "sonstige",
      beschreibung: stichwort.beschreibung,
      fahrzeuge: stichwort.fahrzeuge,
      bemerkung: stichwort.bemerkung || "",
    });
  };

  const toggleVehicle = (vehicleName: string, currentVehicles: string[], onChange: (value: string[]) => void) => {
    console.log("Toggle called for:", vehicleName);
    console.log("Current vehicles before:", currentVehicles);
    
    if (currentVehicles.includes(vehicleName)) {
      const newVehicles = currentVehicles.filter(v => v !== vehicleName);
      console.log("Removing vehicle, new array:", newVehicles);
      onChange(newVehicles);
    } else {
      const newVehicles = [...currentVehicles, vehicleName];
      console.log("Adding vehicle, new array:", newVehicles);
      onChange(newVehicles);
    }
  };

  const handleSubmit = (values: FormValues) => {
    if (editingStichwort) {
      updateMutation.mutate({ id: editingStichwort.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getCategoryBadge = (kategorie: string) => {
    const colors = {
      brand: "destructive",
      hilfeleistung: "default",
      sonstige: "secondary",
    } as const;
    return <Badge variant={colors[kategorie as keyof typeof colors] || "secondary"}>{kategorie}</Badge>;
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AAO-Verwaltung</h1>
            <p className="text-muted-foreground">Alarm- und Ausrückeordnung</p>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingStichwort} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingStichwort(null);
              form.reset(defaultFormValues);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                data-testid="button-create-aao" 
                onClick={() => {
                  setIsCreateDialogOpen(true);
                  form.reset(defaultFormValues);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Stichwort hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingStichwort ? "Stichwort bearbeiten" : "Neues Stichwort"}
                </DialogTitle>
                <DialogDescription>
                  Definieren Sie, welche Fahrzeuge bei welchem Alarmstichwort ausrücken sollen
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="stichwort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stichwort</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-stichwort"
                            placeholder="z.B. B:Klein oder H:VU"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Format: Kategorie:Name (z.B. B:Klein, H:VU)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kategorie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorie</FormLabel>
                        <FormControl>
                          <select
                            data-testid="select-kategorie"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="brand">Brand</option>
                            <option value="hilfeleistung">Hilfeleistung</option>
                            <option value="sonstige">Sonstige</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="beschreibung"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beschreibung</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="input-beschreibung"
                            placeholder="Kurze Beschreibung des Einsatzszenarios"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fahrzeuge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fahrzeuge auswählen</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {vehiclesLoading ? (
                              <p className="text-sm text-muted-foreground">Lädt Fahrzeuge...</p>
                            ) : !vehicles || vehicles.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Keine Fahrzeuge verfügbar</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {vehicles.map((vehicle) => {
                                  const isSelected = field.value.includes(vehicle.funk);
                                  console.log(`Vehicle ${vehicle.funk}: selected=${isSelected}, field.value=`, field.value);
                                  return (
                                    <Button
                                      key={vehicle.id}
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleVehicle(vehicle.funk, field.value, field.onChange)}
                                      data-testid={`button-vehicle-${vehicle.funk}`}
                                    >
                                      {vehicle.funk}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Wählen Sie die Fahrzeuge aus, die bei diesem Stichwort alarmiert werden sollen
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bemerkung"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bemerkungen (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="input-bemerkungen"
                            placeholder="Zusätzliche Hinweise"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingStichwort(null);
                        form.reset(defaultFormValues);
                      }}
                      data-testid="button-cancel"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      data-testid="button-submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingStichwort ? "Aktualisieren" : "Erstellen"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Lädt...</p>
            </CardContent>
          </Card>
        ) : !stichworte || stichworte.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Keine AAO-Stichworte vorhanden</p>
                <p className="text-sm text-muted-foreground">
                  Erstellen Sie Ihr erstes Stichwort, um die Alarm- und Ausrückeordnung zu definieren
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {stichworte.map((stichwort) => (
              <Card key={stichwort.id} data-testid={`card-aao-${stichwort.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{stichwort.stichwort}</CardTitle>
                        {getCategoryBadge(stichwort.kategorie)}
                      </div>
                      <CardDescription>{stichwort.beschreibung}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-edit-${stichwort.id}`}
                        onClick={() => handleEdit(stichwort)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-${stichwort.id}`}
                        onClick={() => setDeletingStichwort(stichwort)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Fahrzeuge:</p>
                      <div className="flex flex-wrap gap-2">
                        {stichwort.fahrzeuge.map((fahrzeug, idx) => (
                          <Badge key={idx} variant="outline" data-testid={`badge-vehicle-${idx}`}>
                            {fahrzeug}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {stichwort.bemerkung && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Bemerkungen:</p>
                        <p className="text-sm">{stichwort.bemerkung}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingStichwort} onOpenChange={(open) => !open && setDeletingStichwort(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stichwort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Stichwort "{deletingStichwort?.stichwort}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deletingStichwort && deleteMutation.mutate(deletingStichwort.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
