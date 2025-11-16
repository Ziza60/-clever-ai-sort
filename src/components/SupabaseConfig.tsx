import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Helper functions for cookie management
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const SupabaseConfig = ({ onConfigured }: { onConfigured: () => void }) => {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");

  useEffect(() => {
    // Try localStorage first
    let savedUrl = localStorage.getItem("supabase_url");
    let savedKey = localStorage.getItem("supabase_anon_key");
    
    // If not in localStorage, try cookies (backup)
    if (!savedUrl || !savedKey) {
      savedUrl = getCookie("supabase_url");
      savedKey = getCookie("supabase_anon_key");
      
      // Restore to localStorage if found in cookies
      if (savedUrl && savedKey) {
        localStorage.setItem("supabase_url", savedUrl);
        localStorage.setItem("supabase_anon_key", savedKey);
      }
    }
    
    if (savedUrl && savedKey) {
      setUrl(savedUrl);
      setAnonKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    if (!url || !anonKey) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    // Validação básica
    if (!url.includes("supabase.co")) {
      toast.error("URL do Supabase inválida");
      return;
    }

    // Save to both localStorage and cookies
    localStorage.setItem("supabase_url", url);
    localStorage.setItem("supabase_anon_key", anonKey);
    setCookie("supabase_url", url, 365);
    setCookie("supabase_anon_key", anonKey, 365);
    
    toast.success("Configuração salva!");
    onConfigured();
  };

  const isConfigured = localStorage.getItem("supabase_url") && localStorage.getItem("supabase_anon_key");

  if (isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supabase Configurado ✓</CardTitle>
          <CardDescription>
            Conectado ao seu projeto Supabase externo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem("supabase_url");
              localStorage.removeItem("supabase_anon_key");
              deleteCookie("supabase_url");
              deleteCookie("supabase_anon_key");
              window.location.reload();
            }}
          >
            Reconfigurar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configurar Supabase Externo</CardTitle>
        <CardDescription>
          Insira as credenciais do seu projeto Supabase (Plano Gratuito)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Project URL</Label>
          <Input
            id="url"
            placeholder="https://seu-projeto.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Encontre em: Supabase Dashboard → Settings → API → Project URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="anonKey">Anon Public Key</Label>
          <Input
            id="anonKey"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Encontre em: Supabase Dashboard → Settings → API → Project API keys → anon public
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
};
