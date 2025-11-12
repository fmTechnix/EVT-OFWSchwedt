import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Activity, Database, Bell, Server, Users, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface AuditLog {
  id: number;
  event_time: string;
  actor_id: number | null;
  actor_role: string | null;
  actor_ip: string;
  actor_agent: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: "info" | "warning" | "error";
  metadata: Record<string, any> | null;
  request_id: string | null;
  source: string;
}

interface SystemHealth {
  users: {
    total: number;
    available_today: number;
    assigned: number;
  };
  push_notifications: {
    success_rate: number;
    total_sent_last_100: number;
    successful: number;
  };
  alarms: {
    last_24h: number;
    total: number;
  };
  system: {
    uptime: number;
    nodejs_version: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

export default function SystemLogs() {
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    severity: "",
    limit: 50,
    offset: 0,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: [
      "/api/admin/audit-logs",
      `?action=${auditFilters.action}&severity=${auditFilters.severity}&limit=${auditFilters.limit}&offset=${auditFilters.offset}`
    ],
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/system-health"],
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" data-testid="icon-severity-error" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" data-testid="icon-severity-warning" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" data-testid="icon-severity-info" />;
    }
  };

  const getSeverityVariant = (severity: string): "default" | "destructive" | "secondary" => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-system-logs">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-system-logs">System-Logs & Überwachung</h1>
        <p className="text-muted-foreground" data-testid="text-system-logs-description">
          Audit-Logs, Server-Metriken und System-Status
        </p>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics" data-testid="tab-metrics">
            <Server className="h-4 w-4 mr-2" />
            Server-Metriken
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <Activity className="h-4 w-4 mr-2" />
            Audit-Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          {healthLoading ? (
            <div className="text-center py-8 text-muted-foreground">Lade System-Metriken...</div>
          ) : systemHealth ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-users-total">{systemHealth.users.total}</div>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <div data-testid="metric-users-available">Verfügbar heute: {systemHealth.users.available_today}</div>
                    <div data-testid="metric-users-assigned">Zugeteilt: {systemHealth.users.assigned}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Push-Benachrichtigungen</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-push-success-rate">
                    {systemHealth.push_notifications.success_rate}%
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <div data-testid="metric-push-successful">
                      Erfolgreich: {systemHealth.push_notifications.successful} / {systemHealth.push_notifications.total_sent_last_100}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alarme</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-alarms-24h">{systemHealth.alarms.last_24h}</div>
                  <div className="text-xs text-muted-foreground mt-2" data-testid="metric-alarms-total">
                    Gesamt: {systemHealth.alarms.total}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-system-uptime">
                    {formatUptime(systemHealth.system.uptime)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <div data-testid="metric-system-nodejs">{systemHealth.system.nodejs_version}</div>
                    <div data-testid="metric-system-memory">
                      RAM: {formatBytes(systemHealth.system.memory.heapUsed)} / {formatBytes(systemHealth.system.memory.heapTotal)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Keine Daten verfügbar</div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter</CardTitle>
              <CardDescription>Audit-Logs nach Kriterien filtern</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Input
                placeholder="Action (z.B. user.login)"
                value={auditFilters.action}
                onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value, offset: 0 })}
                data-testid="input-audit-filter-action"
              />
              <Select
                value={auditFilters.severity || "all"}
                onValueChange={(value) => setAuditFilters({ ...auditFilters, severity: value === "all" ? "" : value, offset: 0 })}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-audit-filter-severity">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-severity-all">Alle</SelectItem>
                  <SelectItem value="info" data-testid="select-severity-info">Info</SelectItem>
                  <SelectItem value="warning" data-testid="select-severity-warning">Warning</SelectItem>
                  <SelectItem value="error" data-testid="select-severity-error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setAuditFilters({ action: "", severity: "", limit: 50, offset: 0 })}
                data-testid="button-audit-filter-reset"
              >
                Zurücksetzen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit-Logs</CardTitle>
              <CardDescription>
                {auditLogs ? `${auditLogs.total} Einträge gesamt` : "Lade Logs..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8 text-muted-foreground">Lade Audit-Logs...</div>
              ) : auditLogs && auditLogs.logs.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zeit</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Benutzer</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.logs.map((log) => (
                          <TableRow key={log.id} data-testid={`audit-log-${log.id}`}>
                            <TableCell className="text-xs" data-testid={`audit-log-time-${log.id}`}>
                              {format(new Date(log.event_time), "dd.MM.yy HH:mm:ss", { locale: de })}
                            </TableCell>
                            <TableCell data-testid={`audit-log-action-${log.id}`}>{log.action}</TableCell>
                            <TableCell>
                              <Badge variant={getSeverityVariant(log.severity)} className="gap-1" data-testid={`audit-log-severity-${log.id}`}>
                                {getSeverityIcon(log.severity)}
                                {log.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs" data-testid={`audit-log-user-${log.id}`}>
                              {log.actor_id ? `#${log.actor_id} (${log.actor_role})` : "System"}
                            </TableCell>
                            <TableCell className="text-xs" data-testid={`audit-log-entity-${log.id}`}>
                              {log.entity_type && log.entity_id ? `${log.entity_type}:${log.entity_id}` : "-"}
                            </TableCell>
                            <TableCell className="text-xs" data-testid={`audit-log-ip-${log.id}`}>
                              {log.actor_ip}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground" data-testid="text-audit-pagination">
                      Zeige {auditFilters.offset + 1} - {Math.min(auditFilters.offset + auditFilters.limit, auditLogs.total)} von {auditLogs.total}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditFilters.offset === 0}
                        onClick={() => setAuditFilters({ ...auditFilters, offset: Math.max(0, auditFilters.offset - auditFilters.limit) })}
                        data-testid="button-audit-prev"
                      >
                        Zurück
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditFilters.offset + auditFilters.limit >= auditLogs.total}
                        onClick={() => setAuditFilters({ ...auditFilters, offset: auditFilters.offset + auditFilters.limit })}
                        data-testid="button-audit-next"
                      >
                        Weiter
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-audit-logs">
                  Keine Audit-Logs gefunden
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
