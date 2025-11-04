import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2, Plus, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

type AvailabilityTemplate = {
  id: number;
  user_id: string;
  name: string;
  weekdays: string[];
  start_time: string;
  end_time: string;
  status: string;
  active: boolean;
};

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So",
};

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function AvailabilityTemplates({ weekStartDate }: { weekStartDate: string }) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    weekdays: [] as string[],
    start_time: "08:00",
    end_time: "16:00",
    status: "available" as "available" | "unavailable",
  });

  const { data: templates, isLoading } = useQuery<AvailabilityTemplate[]>({
    queryKey: ["/api/availability/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/availability/templates", newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/templates"] });
      setIsCreating(false);
      setNewTemplate({
        name: "",
        weekdays: [],
        start_time: "08:00",
        end_time: "16:00",
        status: "available",
      });
      toast({
        title: "Vorlage erstellt",
        description: "Die Vorlage wurde erfolgreich erstellt",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/availability/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/templates"] });
      toast({
        title: "Vorlage gelöscht",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest("POST", `/api/availability/templates/${templateId}/apply`, {
        weekStartDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] });
      toast({
        title: "Vorlage angewendet",
        description: "Die Vorlage wurde auf die Woche angewendet",
      });
    },
  });

  const toggleWeekday = (day: string) => {
    setNewTemplate((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day],
    }));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Verfügbarkeitsvorlagen
        </CardTitle>
        <CardDescription>
          Erstelle Vorlagen für wiederkehrende Verfügbarkeiten (z.B. Schichtpläne)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              className="w-full"
              data-testid="button-create-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Vorlage erstellen
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Vorlagenname</Label>
                <Input
                  id="template-name"
                  placeholder="z.B. Frühschicht Mo-Fr"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                  }
                  data-testid="input-template-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Wochentage</Label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={newTemplate.weekdays.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWeekday(day)}
                      data-testid={`button-weekday-${day}`}
                    >
                      {WEEKDAY_LABELS[day]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Von</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newTemplate.start_time}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({ ...prev, start_time: e.target.value }))
                    }
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">Bis</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newTemplate.end_time}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={
                    !newTemplate.name || newTemplate.weekdays.length === 0 || createMutation.isPending
                  }
                  data-testid="button-save-template"
                >
                  Speichern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  data-testid="button-cancel-template"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {!isLoading && templates && templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between border rounded-lg p-3 hover-elevate"
                >
                  <div className="flex-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")} • {template.start_time} - {template.end_time}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => applyMutation.mutate(template.id)}
                      disabled={applyMutation.isPending}
                      data-testid={`button-apply-template-${template.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Anwenden
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
