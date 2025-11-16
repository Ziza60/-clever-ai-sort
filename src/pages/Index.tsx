import { useState, useEffect } from "react";
import { SupabaseConfig } from "@/components/SupabaseConfig";
import { ToolClassifier } from "@/components/ToolClassifier";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const Index = () => {
  const [showConfig, setShowConfig] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configured = !!(localStorage.getItem("supabase_url") && localStorage.getItem("supabase_anon_key"));
    setIsConfigured(configured);
    setShowConfig(!configured);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      {showConfig ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="mb-2 text-4xl font-bold">AI Tool Classifier</h1>
              <p className="text-lg text-muted-foreground">Configure seu Supabase externo para começar</p>
            </div>
            <SupabaseConfig onConfigured={() => {
              setIsConfigured(true);
              setShowConfig(false);
            }} />
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
              <h1 className="mb-2 text-4xl font-bold">AI Tool Classifier</h1>
              <p className="text-lg text-muted-foreground">Classifique ferramentas de IA usando Claude ou GPT-4o</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowConfig(true)}
              className="ml-4"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <ToolClassifier />
        </div>
      )}
    </div>
  );
};

export default Index;
