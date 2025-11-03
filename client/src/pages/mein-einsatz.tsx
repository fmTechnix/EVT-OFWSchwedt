import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BesetzungscheckResult, Einsatz } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle } from "lucide-react";

export default function MeinEinsatz() {
  const { data, isLoading } = useQuery<BesetzungscheckResult>({
    queryKey: ["/api/besetzungscheck"],
  });
  
  const { data: einsatz, isLoading: einsatzLoading } = useQuery<Einsatz>({
    queryKey: ["/api/einsatz"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <span className="text-4xl">🚒</span>
          Mein Einsatz - Besetzungscheck
        </h1>

        {isLoading || einsatzLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <Card className="shadow-lg mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4 text-lg">
                  <div>
                    <span className="text-muted-foreground">Stichwort:</span>
                    <span className="font-semibold ml-2">
                      {einsatz?.stichwort || "-"}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-muted-foreground">Bedarf gesamt:</span>
                    <span className="font-semibold ml-2" data-testid="text-bedarf">
                      {data?.minima.mannschaftsbedarf || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vorhanden */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Vorhanden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AGT:</span>
                    <span className="font-bold text-lg" data-testid="text-agt-vorhanden">
                      {data?.vorhanden.agt || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maschinist:</span>
                    <span className="font-bold text-lg" data-testid="text-maschinist-vorhanden">
                      {data?.vorhanden.maschinist || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GF:</span>
                    <span className="font-bold text-lg" data-testid="text-gf-vorhanden">
                      {data?.vorhanden.gf || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Gesamt:</span>
                    <span className="font-bold text-xl" data-testid="text-gesamt-vorhanden">
                      {data?.vorhanden.gesamt || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Minima */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Mindestanforderungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AGT ≥</span>
                    <span className="font-bold text-lg" data-testid="text-agt-min">
                      {data?.minima.min_agt || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maschinist ≥</span>
                    <span className="font-bold text-lg" data-testid="text-maschinist-min">
                      {data?.minima.min_maschinist || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GF ≥</span>
                    <span className="font-bold text-lg" data-testid="text-gf-min">
                      {data?.minima.min_gf || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Gesamt ≥</span>
                    <span className="font-bold text-xl" data-testid="text-gesamt-min">
                      {data?.minima.mannschaftsbedarf || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.erfuellt ? (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-green-600 dark:text-green-400" data-testid="text-status">
                            Mindestanforderungen erfüllt
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-full justify-center py-2 bg-green-500/5">
                        ✅ Einsatzbereit
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <XCircle className="w-8 h-8 text-destructive flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-destructive" data-testid="text-status">
                            Anforderungen nicht erfüllt
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-full justify-center py-2 bg-destructive/5">
                        ❌ Nicht einsatzbereit
                      </Badge>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Passe die Minima unter Einstellungen an
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
