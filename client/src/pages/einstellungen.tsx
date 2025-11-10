import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings, Einsatz, Qualifikation, User, PushLog } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, RefreshCw, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Einstellungen() {
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  const { data: qualifikationen, isLoading: qualifikationenLoading } = useQuery<Qualifikation[]>({
    queryKey: ["/api/qualifikationen"],
  });

  const [minAgt, setMinAgt] = useState("");
  const [minMaschinist, setMinMaschinist] = useState("");
  const [minGf, setMinGf] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"manual" | "auto_aao">("manual");
  const [stichwort, setStichwort] = useState("");
  const [mannschaftsbedarf, setMannschaftsbedarf] = useState("");
  const [bemerkung, setBemerkung] = useState("");
  
  // Qualifikation form state
  const [qualKuerzel, setQualKuerzel] = useState("");
  const [qualName, setQualName] = useState("");
  const [qualBeschreibung, setQualBeschreibung] = useState("");

  // Push Logs state
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMessageType, setFilterMessageType] = useState<string>("all");
  const [testPushUserId, setTestPushUserId] = useState<string>("");

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Build query URL with parameters for API
  const pushLogsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterUserId !== "all") params.append("userId", filterUserId);
    if (filterStatus !== "all") params.append("status", filterStatus);
    if (filterMessageType !== "all") params.append("messageType", filterMessageType);
    const queryString = params.toString();
    return `/api/push/logs${queryString ? `?${queryString}` : ""}`;
  }, [filterUserId, filterStatus, filterMessageType]);

  // Query key uses only the URL since it already contains all filter parameters
  const { data: pushLogs, isLoading: pushLogsLoading, refetch: refetchPushLogs} = useQuery<PushLog[]>({
    queryKey: [pushLogsUrl],
  });

  useEffect(() => {
    if (settings) {
      setMinAgt(settings.min_agt.toString());
      setMinMaschinist(settings.min_maschinist.toString());
      setMinGf(settings.min_gf.toString());
      setAssignmentMode(settings.assignment_mode as "manual" | "auto_aao");
    }
  }, [settings]);

  useEffect(() => {
    if (einsatz) {
      setStichwort(einsatz.stichwort);
      setMannschaftsbedarf(einsatz.mannschaftsbedarf.toString());
      setBemerkung(einsatz.bemerkung);
    }
  }, [einsatz]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/settings", {
        min_agt: parseInt(minAgt),
        min_maschinist: parseInt(minMaschinist),
        min_gf: parseInt(minGf),
        assignment_mode: assignmentMode,
      });
      await apiRequest("PUT", "/api/einsatz", {
        stichwort,
        mannschaftsbedarf: parseInt(mannschaftsbedarf),
        bemerkung,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/einsatz"] });
      queryClient.invalidateQueries({ queryKey: ["/api/besetzungscheck"] });
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Einstellungen wurden erfolgreich aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const addQualifikationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/qualifikationen", {
        kuerzel: qualKuerzel,
        name: qualName,
        beschreibung: qualBeschreibung,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifikationen"] });
      setQualKuerzel("");
      setQualName("");
      setQualBeschreibung("");
      toast({
        title: "Qualifikation hinzugefügt",
        description: "Die Qualifikation wurde erfolgreich erstellt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Qualifikation konnte nicht erstellt werden",
      });
    },
  });

  const deleteQualifikationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/qualifikationen/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifikationen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kameraden"] });
      toast({
        title: "Qualifikation gelöscht",
        description: "Die Qualifikation wurde erfolgreich entfernt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Qualifikation konnte nicht gelöscht werden",
      });
    },
  });

  const testPushMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/push/test/${userId}`);
    },
    onSuccess: () => {
      // Invalidate all push log queries by matching the URL prefix
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return typeof firstKey === 'string' && firstKey.startsWith('/api/push/logs');
        },
      });
      setTestPushUserId("");
      toast({
        title: "Test-Push gesendet",
        description: "Die Test-Benachrichtigung wurde versendet",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Test-Push konnte nicht gesendet werden",
      });
    },
  });

  const handleAddQualifikation = (e: React.FormEvent) => {
    e.preventDefault();
    addQualifikationMutation.mutate();
  };

  const handleTestPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (testPushUserId) {
      testPushMutation.mutate(testPushUserId);
    }
  };

  const isLoading = settingsLoading || einsatzLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400" data-testid={`badge-status-success`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Erfolgreich
          </Badge>
        );
      case "error":
        return (
          <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400" data-testid={`badge-status-error`}>
            <XCircle className="w-3 h-3 mr-1" />
            Fehler
          </Badge>
        );
      case "no_subscription":
        return (
          <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" data-testid={`badge-status-no-sub`}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Kein Abo
          </Badge>
        );
      default:
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    return user ? `${user.vorname} ${user.nachname}` : `User #${userId}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="text-4xl">⚙️</span>
          Einstellungen
        </h1>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="allgemein" data-testid="tab-allgemein">
              Allgemein
            </TabsTrigger>
            <TabsTrigger value="qualifikationen" data-testid="tab-qualifikationen">
              Qualifikationen
            </TabsTrigger>
            <TabsTrigger value="push-logs" data-testid="tab-push-logs">
              Push-Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Einsatz & Mindestanforderungen</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="min-agt">Min. AGT</Label>
                        <Input
                          id="min-agt"
                          type="number"
                          min="0"
                          value={minAgt}
                          onChange={(e) => setMinAgt(e.target.value)}
                          required
                          data-testid="input-min-agt"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="min-maschinist">Min. Maschinist</Label>
                        <Input
                          id="min-maschinist"
                          type="number"
                          min="0"
                          value={minMaschinist}
                          onChange={(e) => setMinMaschinist(e.target.value)}
                          required
                          data-testid="input-min-maschinist"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="min-gf">Min. Gruppenführer</Label>
                        <Input
                          id="min-gf"
                          type="number"
                          min="0"
                          value={minGf}
                          onChange={(e) => setMinGf(e.target.value)}
                          required
                          data-testid="input-min-gf"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assignment-mode">Fahrzeugzuweisung</Label>
                        <Select 
                          value={assignmentMode} 
                          onValueChange={(value: "manual" | "auto_aao") => setAssignmentMode(value)}
                        >
                          <SelectTrigger id="assignment-mode" data-testid="select-assignment-mode">
                            <SelectValue placeholder="Modus auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual" data-testid="option-manual">
                              Manuell / Plantechnisch
                            </SelectItem>
                            <SelectItem value="auto_aao" data-testid="option-auto-aao">
                              Automatisch (DE-Alarm + AAO)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {assignmentMode === "manual" 
                            ? "Fahrzeugbesatzung wird manuell geplant" 
                            : "Bei Alarm werden Fahrzeuge automatisch nach AAO-Stichworten zugeteilt"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stichwort">Stichwort</Label>
                        <Input
                          id="stichwort"
                          value={stichwort}
                          onChange={(e) => setStichwort(e.target.value)}
                          required
                          data-testid="input-stichwort"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mannschaftsbedarf">Mannschaftsbedarf</Label>
                        <Input
                          id="mannschaftsbedarf"
                          type="number"
                          min="0"
                          value={mannschaftsbedarf}
                          onChange={(e) => setMannschaftsbedarf(e.target.value)}
                          required
                          data-testid="input-mannschaftsbedarf"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bemerkung">Bemerkung</Label>
                      <Textarea
                        id="bemerkung"
                        value={bemerkung}
                        onChange={(e) => setBemerkung(e.target.value)}
                        rows={3}
                        data-testid="input-bemerkung"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={saveMutation.isPending}
                      data-testid="button-save"
                    >
                      {saveMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifikationen" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Qualifikationen verwalten</CardTitle>
              </CardHeader>
              <CardContent>
                {qualifikationenLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <ScrollArea className="w-full overflow-x-auto">
                        <div className="min-w-[640px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kürzel</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Beschreibung</TableHead>
                                <TableHead className="w-20">Aktionen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {qualifikationen && qualifikationen.length > 0 ? (
                                qualifikationen.map((qual) => (
                                  <TableRow key={qual.id}>
                                    <TableCell className="font-medium">{qual.kuerzel}</TableCell>
                                    <TableCell>{qual.name}</TableCell>
                                    <TableCell>{qual.beschreibung}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteQualifikationMutation.mutate(qual.id)}
                                        disabled={deleteQualifikationMutation.isPending}
                                        data-testid={`button-delete-qual-${qual.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    Keine Qualifikationen vorhanden
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    </div>

                    <form onSubmit={handleAddQualifikation} className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Neue Qualifikation hinzufügen</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="qual-kuerzel">Kürzel</Label>
                          <Input
                            id="qual-kuerzel"
                            value={qualKuerzel}
                            onChange={(e) => setQualKuerzel(e.target.value)}
                            placeholder="z.B. AGT"
                            required
                            data-testid="input-qual-kuerzel"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="qual-name">Name</Label>
                          <Input
                            id="qual-name"
                            value={qualName}
                            onChange={(e) => setQualName(e.target.value)}
                            placeholder="z.B. Atemschutzgeräteträger"
                            required
                            data-testid="input-qual-name"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="qual-beschreibung">Beschreibung</Label>
                          <Input
                            id="qual-beschreibung"
                            value={qualBeschreibung}
                            onChange={(e) => setQualBeschreibung(e.target.value)}
                            placeholder="z.B. Berechtigung zum Tragen von Atemschutz"
                            required
                            data-testid="input-qual-beschreibung"
                            className="h-11"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={addQualifikationMutation.isPending}
                        data-testid="button-add-qualifikation"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {addQualifikationMutation.isPending ? "Wird hinzugefügt..." : "Qualifikation hinzufügen"}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="push-logs" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Push-Benachrichtigungsprotokolle</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchPushLogs()}
                    disabled={pushLogsLoading}
                    data-testid="button-refresh-logs"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${pushLogsLoading ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="filter-user">Benutzer</Label>
                      <Select value={filterUserId} onValueChange={setFilterUserId}>
                        <SelectTrigger id="filter-user" data-testid="select-filter-user">
                          <SelectValue placeholder="Alle Benutzer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-all-users">Alle Benutzer</SelectItem>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                              {user.vorname} {user.nachname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-status">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filter-status" data-testid="select-filter-status">
                          <SelectValue placeholder="Alle Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-all-status">Alle Status</SelectItem>
                          <SelectItem value="success" data-testid="option-status-success">Erfolgreich</SelectItem>
                          <SelectItem value="error" data-testid="option-status-error">Fehler</SelectItem>
                          <SelectItem value="no_subscription" data-testid="option-status-no-sub">Kein Abo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-message-type">Nachrichtentyp</Label>
                      <Select value={filterMessageType} onValueChange={setFilterMessageType}>
                        <SelectTrigger id="filter-message-type" data-testid="select-filter-message-type">
                          <SelectValue placeholder="Alle Typen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-all-types">Alle Typen</SelectItem>
                          <SelectItem value="assignment_change" data-testid="option-type-assignment">Zuteilungsänderung</SelectItem>
                          <SelectItem value="availability_reminder" data-testid="option-type-reminder">Verfügbarkeitserinnerung</SelectItem>
                          <SelectItem value="alarm" data-testid="option-type-alarm">Alarm</SelectItem>
                          <SelectItem value="test" data-testid="option-type-test">Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    {pushLogsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <ScrollArea className="w-full overflow-x-auto">
                        <div className="min-w-[800px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Zeitpunkt</TableHead>
                                <TableHead>Empfänger</TableHead>
                                <TableHead>Typ</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Nachricht</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pushLogs && pushLogs.length > 0 ? (
                                pushLogs.map((log) => (
                                  <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                                    <TableCell className="text-sm" data-testid={`log-time-${log.id}`}>
                                      {format(new Date(log.sent_at), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                                    </TableCell>
                                    <TableCell className="font-medium" data-testid={`log-user-${log.id}`}>
                                      {getUserName(log.user_id)}
                                    </TableCell>
                                    <TableCell data-testid={`log-type-${log.id}`}>
                                      <Badge variant="outline">{log.message_type || "-"}</Badge>
                                    </TableCell>
                                    <TableCell data-testid={`log-status-${log.id}`}>
                                      {getStatusBadge(log.status)}
                                    </TableCell>
                                    <TableCell data-testid={`log-message-${log.id}`}>
                                      <div className="max-w-md">
                                        <p className="font-medium text-sm">{log.title}</p>
                                        {log.body && (
                                          <p className="text-sm text-muted-foreground truncate">{log.body}</p>
                                        )}
                                        {log.error_message && (
                                          <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                                    Keine Push-Logs vorhanden
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Test-Push senden</h3>
                    <form onSubmit={handleTestPush} className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="test-push-user">Empfänger auswählen</Label>
                          <Select value={testPushUserId} onValueChange={setTestPushUserId}>
                            <SelectTrigger id="test-push-user" data-testid="select-test-push-user">
                              <SelectValue placeholder="Benutzer auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {users?.map((user) => (
                                <SelectItem key={user.id} value={user.id} data-testid={`option-test-user-${user.id}`}>
                                  {user.vorname} {user.nachname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="submit"
                            disabled={!testPushUserId || testPushMutation.isPending}
                            data-testid="button-send-test-push"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {testPushMutation.isPending ? "Wird gesendet..." : "Test-Push senden"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
