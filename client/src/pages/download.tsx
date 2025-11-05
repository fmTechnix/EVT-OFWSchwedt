import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileArchive, FolderOpen } from "lucide-react";

export default function DownloadPage() {
  const handleDownload = () => {
    window.location.href = "/download/evt-projekt.zip";
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-6 w-6" />
            EVT-Projekt Download
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Lade das komplette EVT-Projekt als ZIP-Archiv herunter (22 MB).
            </p>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Enthält:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>Kompletter Quellcode (Frontend + Backend)</li>
                <li>Alle Konfigurationsdateien</li>
                <li>Deployment-Skripte und Dokumentation</li>
                <li>Schema und Migrationen</li>
                <li>Service Worker & PWA-Manifest</li>
                <li>AAO-Seed-Daten für Brandenburg</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                ⚠️ Wichtig:
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                Nach dem Entpacken die Dependencies installieren.
              </p>
            </div>

            <Button 
              onClick={handleDownload} 
              size="lg" 
              className="w-full"
              data-testid="button-download-zip"
            >
              <Download className="mr-2 h-5 w-5" />
              evt-projekt.zip herunterladen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
