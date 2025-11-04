import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

type ReminderSettings = {
  user_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_weekdays: string[];
  last_reminder_sent?: Date;
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

export function ReminderSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: settings, isLoading } = useQuery<ReminderSettings>({
    queryKey: ["/api/availability/reminder-settings"],
    enabled: !!user,
  });

  const [localSettings, setLocalSettings] = useState<Partial<ReminderSettings>>({
    reminder_enabled: false,
    reminder_time: "18:00",
    reminder_weekdays: ["sunday"],
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", "/api/availability/reminder-settings", localSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/reminder-settings"] });
      toast({
        title: "Einstellungen gespeichert",
        description: "Deine Erinnerungseinstellungen wurden aktualisiert",
      });
    },
  });

  const toggleWeekday = (day: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      reminder_weekdays: prev.reminder_weekdays?.includes(day)
        ? prev.reminder_weekdays.filter((d) => d !== day)
        : [...(prev.reminder_weekdays || []), day],
    }));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Erinnerungen
        </CardTitle>
        <CardDescription>
          Lass dich per Push-Benachrichtigung daran erinnern, deine Verfügbarkeit zu aktualisieren
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminder-enabled">Erinnerungen aktivieren</Label>
              <div className="text-sm text-muted-foreground">
                Erhalte Push-Benachrichtigungen zur Aktualisierung deiner Verfügbarkeit
              </div>
            </div>
            <Switch
              id="reminder-enabled"
              checked={localSettings.reminder_enabled || false}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, reminder_enabled: checked }))
              }
              data-testid="switch-reminder-enabled"
            />
          </div>

          {localSettings.reminder_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Erinnerungszeit</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={localSettings.reminder_time}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({ ...prev, reminder_time: e.target.value }))
                  }
                  data-testid="input-reminder-time"
                />
              </div>

              <div className="space-y-2">
                <Label>An welchen Tagen?</Label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={
                        localSettings.reminder_weekdays?.includes(day) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleWeekday(day)}
                      data-testid={`button-reminder-${day}`}
                    >
                      {WEEKDAY_LABELS[day]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || isLoading}
            className="w-full"
            data-testid="button-save-reminder"
          >
            {updateMutation.isPending ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
