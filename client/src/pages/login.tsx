import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(username, password);
      toast({
        title: "Erfolgreich eingeloggt",
        description: "Willkommen im Einsatzverwaltungstool",
      });
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login fehlgeschlagen",
        description: "Benutzername oder Passwort ist falsch",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <img 
            src="/feuerwehr-logo.png" 
            alt="Feuerwehr Schwedt/Oder" 
            className="h-32 w-auto mx-auto"
          />
          <CardTitle className="text-3xl font-bold">EVT Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Einsatzverwaltungstool für die Feuerwehr Schwedt/Oder
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin oder member"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="input-username"
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="admin oder member"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Anmelden..." : "Anmelden"}
              </Button>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="text-xs">
                  Demo: admin/admin
                </Badge>
                <Badge variant="outline" className="text-xs">
                  member/member
                </Badge>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
