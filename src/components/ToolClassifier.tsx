import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Loader2, Upload, Download, FileJson, Save, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { getSupabase } from "@/integrations/supabase/client";
import { validateClassification, calculateMetrics } from "@/lib/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClassificationResult {
  categories: string[];
  tags: string[];
  description?: string;
  confidence?: number;
  reasoning?: string;
  debug_warnings?: string[];
  debug_firewall_aplicado?: boolean;
  debug_host?: string;
}

const STORAGE_KEY = 'classifier_batch_results';

// Amostra de teste (10 ferramentas principais)
const TEST_SAMPLE_URLS = [
  "https://www.midjourney.com",
  "https://runwayml.com",
  "https://elevenlabs.io",
  "https://www.copy.ai",
  "https://www.jasper.ai",
  "https://www.descript.com",
  "https://www.synthesia.io",
  "https://replicate.com",
  "https://www.heygen.com",
  "https://www.loom.com"
];

// URLs de teste de ferramentas de IA reais
const EXAMPLE_URLS = [
  "https://www.midjourney.com",
  "https://www.runway.ml",
  "https://elevenlabs.io",
  "https://www.copy.ai",
  "https://www.jasper.ai",
  "https://www.descript.com",
  "https://www.synthesia.io",
  "https://www.replicate.com",
  "https://www.heygen.com",
  "https://www.loom.com"
];

// Lista completa de tags disponíveis organizadas por categoria
const AVAILABLE_TAGS = {
  "Texto e Redação": [
    "Copywriting",
    "Geração de texto",
    "Escrita criativa",
    "Resumo automático",
    "Reformulação de texto",
    "Storytelling",
    "E-mails automáticos",
    "Blog generator",
    "Editor de artigos",
    "Documentação automática",
    "Parafraseador",
    "Roteiros / Scripts",
    "Ferramentas educacionais (para estudantes)",
    "Verificador gramatical/ortográfico",
    "Geração de conteúdo SEO"
  ],
  "Imagem e Design": [
    "Gerador de arte",
    "IA para fotos",
    "Edição automática de imagem",
    "Background remover",
    "Colorização automática",
    "Criação de logo",
    "Thumbnail generator",
    "Ilustração AI",
    "Geração de avatar",
    "Stylization / Filtros artísticos",
    "Cartoonizer",
    "Mockup generator",
    "IA para design gráfico",
    "Criação de banner/post digital",
    "Designer de interface UI/UX"
  ],
  "Vídeo e Animação": [
    "Editor de vídeo IA",
    "Geração de vídeo a partir de texto",
    "Texto para animação",
    "Clipping automático",
    "Ferramentas para YouTube/TikTok/Reels",
    "Avatar animado",
    "Motion graphics AI",
    "Legendador automático",
    "Extração de highlights",
    "Efeitos especiais IA",
    "Ferramentas para webinar ou apresentações",
    "Geração de trailers",
    "História animada/manual storyboard",
    "Conversão de slides em vídeo"
  ],
  "Áudio e Voz": [
    "Text-to-speech",
    "Clonagem de voz",
    "Narrador automático",
    "Criação de podcast",
    "Editor de áudio IA",
    "Transcrição de áudio/vídeo",
    "Música generativa",
    "Ambient sound generator",
    "Tradução automática voz",
    "Ferramentas para audiobooks",
    "Conversão voz para texto",
    "Enhancer de áudio (limpeza ruído)",
    "Dublagem automática",
    "Mídia multilingue voz"
  ],
  "Negócios e Produtividade": [
    "Automação de tarefas",
    "Agendamento automático",
    "CRM inteligente",
    "Gerenciador de projetos",
    "Gestão de tempo",
    "IA para reuniões",
    "Análise de dados de vendas",
    "E-mail inteligente",
    "IA para planilhas",
    "Dashboards automáticos",
    "Gestão financeira",
    "Follow-up automático",
    "Gestão de equipes",
    "Ferramentas para trabalho remoto",
    "E-mail marketing",
    "CRM e segmentação",
    "Campanhas multicanal",
    "IA para marketing"
  ],
  "Chatbots e Assistentes": [
    "Chatbot multi-idiomas",
    "Atendimento automático",
    "Suporte ao cliente IA",
    "FAQ inteligente",
    "Voice Bot",
    "Integrações omnichannel",
    "IA para central telefônica",
    "IA para WhatsApp/Telegram/etc.",
    "Avatar conversacional",
    "Assistente para reuniões",
    "IA para onboarding"
  ],
  "Recursos Extras": [
    "Chrome Extension / Plugin",
    "API disponível",
    "Multi-idiomas",
    "Ferramenta para equipes",
    "Integrações (Zapier, Slack, Google, etc.)",
    "Ferramenta para mobile",
    "Compatível com Outros Softwares (Figma, Photoshop, Final Cut, etc.)"
  ]
};

export const ToolClassifier = () => {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<"claude" | "openai">("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(2000); // 2 segundos entre requisições
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<Array<{url: string; result?: ClassificationResult; error?: string}>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importedData, setImportedData] = useState<{filename: string; url?: string; description?: string; provider?: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restaurar resultados salvos ao montar o componente
  useEffect(() => {
    const savedResults = localStorage.getItem(STORAGE_KEY);
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        setBatchResults(parsed);
        toast.info(`${parsed.length} resultados restaurados da sessão anterior`);
      } catch (error) {
        console.error('Erro ao restaurar resultados:', error);
      }
    }
  }, []);

  // Salvar automaticamente quando batchResults mudar
  useEffect(() => {
    if (batchResults.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batchResults));
    }
  }, [batchResults]);

  const handleClassify = async () => {
    const urls = url.trim().split('\n').filter(u => u.trim());
    
    if (urls.length === 0) {
      toast.error("Por favor, insira pelo menos uma URL");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setBatchResults([]);
    setProgress({ current: 0, total: urls.length });

    const supabase = getSupabase();
    const results: Array<{url: string; result?: ClassificationResult; error?: string}> = [];

    // Processar URLs sequencialmente com delay entre cada uma
    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (!success && retries < maxRetries) {
        try {
          const { data, error: invokeError } = await supabase.functions.invoke('clever-service', {
            body: {
              url: currentUrl.trim(),
              description: description.trim() || undefined,
              provider,
            },
          });

          if (invokeError) throw invokeError;

          if (!data || data.error) {
            // Se for erro 429, aguarda mais tempo antes de tentar novamente
            if (data.error?.includes("429")) {
              retries++;
              if (retries < maxRetries) {
                const waitTime = delayBetweenRequests * retries * 2;
                console.log(`Rate limit atingido para ${currentUrl}. Aguardando ${waitTime}ms antes de tentar novamente (tentativa ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
            }
            throw new Error(data.error || "Erro ao classificar");
          }

          const validation = validateClassification(data, currentUrl, description.trim());
          const enrichedResult = { ...data, ...validation.corrections };

          results.push({
            url: currentUrl,
            result: enrichedResult,
            validation: {
              warnings: validation.warnings,
              confidence: validation.confidence
            }
          });
          success = true;
        } catch (error) {
          console.error(`Erro ao processar ${currentUrl}:`, error);
          if (retries >= maxRetries - 1) {
            results.push({ 
              url: currentUrl, 
              error: error instanceof Error ? error.message : "Erro desconhecido" 
            });
            success = true; // Para de tentar
          } else {
            retries++;
            await new Promise(resolve => setTimeout(resolve, delayBetweenRequests * retries));
          }
        }
      }

      setProgress({ current: i + 1, total: urls.length });
      setBatchResults([...results]);

      // Delay entre requisições
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    setIsLoading(false);
    
    const successCount = results.filter(r => r.result).length;
    const errorCount = results.filter(r => r.error).length;
    
    if (urls.length === 1 && results[0].result) {
      setResult(results[0].result);
      if (results[0].validation) {
        setValidationResult(results[0].validation);
      }
      toast.success("Ferramenta classificada com sucesso!");
    } else {
      toast.success(`Processamento concluído! ${successCount} sucesso, ${errorCount} erros`);
    }
  };

  const processJSONFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error("Por favor, selecione um arquivo JSON");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        const importedFields: string[] = [];
        const importData: {filename: string; url?: string; description?: string; provider?: string} = {
          filename: file.name
        };
        
        // Formato de exportação com múltiplas ferramentas
        if (json.tools && Array.isArray(json.tools)) {
          const urls = json.tools
            .map((tool: any) => tool.url)
            .filter((url: string) => url)
            .join('\n');
          
          if (urls) {
            setUrl(urls);
            importData.url = urls;
            importedFields.push(`${json.tools.length} URLs`);
          }
          
          if (json.category) {
            importedFields.push(`Categoria: ${json.category}`);
          }
          
          toast.success(`Arquivo importado! ${json.tools.length} ferramentas encontradas`);
          setImportedData(importData);
          return;
        }
        
        // Formato de entrada direto
        if (json.url) {
          setUrl(json.url);
          importData.url = json.url;
          importedFields.push("URL");
        }
        if (json.description) {
          setDescription(json.description);
          importData.description = json.description;
          importedFields.push("Descrição");
        }
        if (json.provider && (json.provider === "claude" || json.provider === "openai")) {
          setProvider(json.provider);
          importData.provider = json.provider;
          importedFields.push("Provider");
        }
        
        // Formato de resultado exportado (com result.categories e result.tags)
        if (json.result) {
          if (json.url) {
            setUrl(json.url);
            importData.url = json.url;
            if (!importedFields.includes("URL")) importedFields.push("URL");
          }
          if (json.description) {
            setDescription(json.description);
            importData.description = json.description;
            if (!importedFields.includes("Descrição")) importedFields.push("Descrição");
          }
          if (json.provider) {
            setProvider(json.provider);
            importData.provider = json.provider;
            if (!importedFields.includes("Provider")) importedFields.push("Provider");
          }
          setResult(json.result);
          importedFields.push("Resultado");
        }
        
        setImportedData(importData);
        
        if (importedFields.length > 0) {
          toast.success(`Arquivo importado! Campos preenchidos: ${importedFields.join(", ")}`);
        } else {
          toast.warning("Arquivo importado, mas nenhum campo foi encontrado");
        }
      } catch (error) {
        console.error("Erro ao importar JSON:", error);
        toast.error("Erro ao ler arquivo JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processJSONFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processJSONFile(file);
    }
  };

  const handleExportJSON = () => {
    if (!result && batchResults.length === 0) {
      toast.error("Nenhum resultado para exportar");
      return;
    }

    const exportData = batchResults.length > 0 ? {
      batch: true,
      total: batchResults.length,
      results: batchResults,
      description,
      provider,
      timestamp: new Date().toISOString(),
    } : {
      url,
      description,
      provider,
      result,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url_download = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url_download;
    link.download = `classification-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url_download);

    toast.success("Arquivo JSON exportado!");
  };

  const handleClearResults = () => {
    setBatchResults([]);
    setResult(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Resultados limpos!");
  };

  const loadTestSample = () => {
    setUrl(TEST_SAMPLE_URLS.join('\n'));
    toast.success("🧪 Amostra de teste carregada (10 ferramentas)");
  };

  const loadExampleUrls = () => {
    setUrl(EXAMPLE_URLS.join('\n'));
    toast.success("10 URLs de ferramentas de IA carregadas para teste");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Classificador de Ferramentas de IA (Pipeline de 2 Etapas)</CardTitle>
          <CardDescription>
            Classificação em duas etapas: OpenAI gera a descrição detalhada e classificação preliminar, depois Claude valida e corrige.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batchResults.length > 0 && (
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Save className="h-4 w-4 text-accent" />
                      Resultados Salvos
                    </h3>
                    <Badge variant="secondary">{batchResults.length} classificações</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>✓ {batchResults.filter(r => r.result).length} sucessos</p>
                    <p>✓ {batchResults.filter(r => r.error).length} erros</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Os resultados são salvos automaticamente e podem ser exportados a qualquer momento
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={handleExportJSON}
                      size="sm"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Resultados
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearResults}
                      size="sm"
                      className="flex-1"
                    >
                      Limpar Resultados
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {importedData && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-primary" />
                      Arquivo Importado
                    </h3>
                    <Badge variant="secondary">{importedData.filename}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {importedData.url && (
                      <p>✓ URL: {importedData.url.substring(0, 50)}{importedData.url.length > 50 ? "..." : ""}</p>
                    )}
                    {importedData.description && (
                      <p>✓ Descrição: {importedData.description.substring(0, 50)}{importedData.description.length > 50 ? "..." : ""}</p>
                    )}
                    {importedData.provider && (
                      <p>✓ Provider: {importedData.provider === "claude" ? "Claude Sonnet 4" : "GPT-4o"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <FileJson className={`h-10 w-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging ? "Solte o arquivo aqui" : "Arraste um arquivo JSON aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique nos botões abaixo
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importar JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={!result && batchResults.length === 0}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar {batchResults.length > 0 ? `(${batchResults.length})` : 'JSON'}
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    🧪 Kit de Teste Rápido
                    <Badge variant="secondary" className="ml-2">10 ferramentas</Badge>
                  </h3>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={loadTestSample}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    🚀 Carregar Teste
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>• Midjourney (geração de imagem)</div>
                  <div>• Runway (edição de vídeo)</div>
                  <div>• ElevenLabs (síntese de voz)</div>
                  <div>• Copy.ai (copywriting)</div>
                  <div>• Jasper (geração de texto)</div>
                  <div>• Descript (edição de áudio)</div>
                  <div>• Synthesia (avatar animado)</div>
                  <div>• Replicate (modelos ML)</div>
                  <div>• HeyGen (vídeo com avatar)</div>
                  <div>• Loom (gravação de tela)</div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2">
                  ⚡ Clique no botão acima para carregar as 10 URLs e testar o classificador
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📋 Tags Disponíveis no Sistema</CardTitle>
              <CardDescription>
                Lista completa de todas as tags que o classificador pode atribuir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(AVAILABLE_TAGS).map(([category, tags]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({tags.length} {tags.length === 1 ? 'tag' : 'tags'})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs hover:bg-muted/50 transition-colors cursor-default"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="url">URLs das Ferramentas * (uma por linha)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={loadTestSample}
                  className="text-xs bg-blue-500 hover:bg-blue-600"
                >
                  🧪 Carregar 10 URLs de Teste
                </Button>
              </div>
            </div>
            <Textarea
              id="url"
              placeholder="https://exemplo.com/ferramenta-1&#10;https://exemplo.com/ferramenta-2&#10;https://exemplo.com/ferramenta-3"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Cole múltiplas URLs, uma por linha. Processamento sequencial com delay configurável.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione informações extras sobre a ferramenta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider de IA</Label>
              <Select value={provider} onValueChange={(value: "claude" | "openai") => setProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude Sonnet 4</SelectItem>
                  <SelectItem value="openai">GPT-4o</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delayBetweenRequests">Delay entre Requisições</Label>
              <Select 
                value={delayBetweenRequests.toString()} 
                onValueChange={(value) => setDelayBetweenRequests(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1 segundo</SelectItem>
                  <SelectItem value="2000">2 segundos (recomendado)</SelectItem>
                  <SelectItem value="3000">3 segundos</SelectItem>
                  <SelectItem value="5000">5 segundos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Delay entre cada requisição para evitar rate limit (429)
              </p>
            </div>
          </div>

          {isLoading && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button 
            onClick={handleClassify} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Classificando {progress.current > 0 ? `(${progress.current}/${progress.total})` : "..."}
              </>
            ) : (
              "Classificar Ferramentas"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && !isLoading && batchResults.length === 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultado da Classificação</CardTitle>
                <CardDescription>
                  Categorias e tags identificadas pela IA
                </CardDescription>
              </div>
              {result.confidence && (
                <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
                  Confiança: {(result.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationResult && validationResult.warnings && validationResult.warnings.length > 0 && (
              <Alert variant={validationResult.warnings.some((w: string) => w.startsWith('❌')) ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Avisos de Validação</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.warnings.map((w: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        {w.startsWith('✅') && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
                        {w.startsWith('⚠️') && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
                        {w.startsWith('❌') && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                        {w.startsWith('ℹ️') && <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                        <span>{w.replace(/^(✅|⚠️|❌|ℹ️)\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.reasoning && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Justificativa da Classificação</AlertTitle>
                <AlertDescription className="text-sm">
                  {result.reasoning}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Categorias</h3>
              <div className="flex flex-wrap gap-2">
                {result.categories.map((category) => (
                  <Badge key={category} variant="default">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    ✅ Pipeline de 2 Etapas Concluído
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Etapa 1</Badge>
                      <span className="text-muted-foreground">OpenAI gerou descrição + classificação preliminar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Etapa 2</Badge>
                      <span className="text-muted-foreground">Claude validou e corrigiu a classificação</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Descrição Detalhada (Gerada pela OpenAI)</h3>
                <div className="bg-muted/30 rounded-md p-4 text-sm text-foreground/90 border border-border/50">
                  {result.description}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {result.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {result.tags.length > 4 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                        +{result.tags.length - 4} mais
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Todas as tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {batchResults.length > 0 && (
        <>
          <Card className="bg-gradient-to-r from-blue-500/10 to-green-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Estatísticas da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Classificado</p>
                  <p className="text-2xl font-bold">{batchResults.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-green-500">
                    {((batchResults.filter(r => r.result).length / batchResults.length) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Confiança Média</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const validResults = batchResults.filter(r => r.result?.confidence);
                      if (validResults.length === 0) return 'N/A';
                      const avg = validResults.reduce((acc, r) => acc + (r.result?.confidence || 0), 0) / validResults.length;
                      return `${(avg * 100).toFixed(0)}%`;
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Com Avisos</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {batchResults.filter(r => r.validation?.warnings?.length > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados do Processamento em Lote</CardTitle>
                  <CardDescription>
                    {batchResults.filter(r => r.result).length} classificações bem-sucedidas, {batchResults.filter(r => r.error).length} erros • Pipeline OpenAI → Claude
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-green-500/10">
                  ✅ Validado pelo Claude
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {batchResults.map((item, index) => (
                <Card key={index} className={item.error ? "border-destructive/50" : "border-primary/20"}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium break-all">{item.url}</p>
                        <Badge variant={item.error ? "destructive" : "default"}>
                          {item.error ? "Erro" : "Sucesso"}
                        </Badge>
                      </div>
                      {item.error && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                      {item.result && (
                        <div className="space-y-2">
                          {item.validation?.warnings && item.validation.warnings.length > 0 && (
                            <div className="text-xs space-y-1 mb-2">
                              {item.validation.warnings.slice(0, 2).map((w: string, wIdx: number) => (
                                <div key={wIdx} className="flex items-center gap-1 text-muted-foreground">
                                  {w.startsWith('✅') && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                  {w.startsWith('⚠️') && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                                  {w.startsWith('❌') && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                  <span className="truncate">{w.replace(/^(✅|⚠️|❌|ℹ️)\s*/, '').substring(0, 80)}</span>
                                </div>
                              ))}
                              {item.validation.warnings.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{item.validation.warnings.length - 2} mais avisos</span>
                              )}
                            </div>
                          )}

                          {item.result.confidence && (
                            <Badge variant="outline" className="text-xs mb-2">
                              {(item.result.confidence * 100).toFixed(0)}% confiança
                            </Badge>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {item.result.categories.slice(0, 3).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.result.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.result.tags.length > 4 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge variant="outline" className="text-xs opacity-60 cursor-pointer hover:opacity-100 hover:bg-accent">
                                    +{item.result.tags.length - 4}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Todas as tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {item.result.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                   </div>
                                 </PopoverContent>
                               </Popover>
                             )}
                           </div>
                           {item.result.description && (
                             <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2 mt-2">
                               <p className="line-clamp-2">{item.result.description}</p>
                             </div>
                           )}
                         </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
};
