import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Login fehlgeschlagen");
      }

      const user = await response.json();
      
      // Check if user must change password
      if (user.muss_passwort_aendern) {
        setShowPasswordChange(true);
        setOldPassword(password); // Set old password to current password
      } else {
        await login(username, password);
        toast({
          title: "Erfolgreich eingeloggt",
          description: "Willkommen im Einsatzverwaltungstool",
        });
        setLocation("/");
      }
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein",
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      await apiRequest("POST", "/api/auth/change-password", {
        oldPassword,
        newPassword,
      });
      
      // Now login with new credentials
      await login(username, newPassword);
      
      toast({
        title: "Passwort geändert",
        description: "Ihr Passwort wurde erfolgreich geändert",
      });
      
      setShowPasswordChange(false);
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Passwort konnte nicht geändert werden",
      });
    } finally {
      setIsChangingPassword(false);
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
                placeholder="Benutzername eingeben"
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
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showPasswordChange} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Sie müssen Ihr Passwort beim ersten Login ändern. Bitte wählen Sie ein sicheres Passwort (mindestens 6 Zeichen).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                required
                data-testid="input-new-password"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                required
                data-testid="input-confirm-password"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isChangingPassword}
              data-testid="button-change-password"
            >
              {isChangingPassword ? "Wird geändert..." : "Passwort ändern"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
