import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { SYSTEM_PROMPT_V2 } from "./system-prompt.ts";

const VERSION = 'v7.1-STRICT-FIREWALL-2025-01-17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVAILABLE_TAGS = [
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
  "Geração de conteúdo SEO",
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
  "Designer de interface UI/UX",
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
  "Conversão de slides em vídeo",
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
  "Mídia multilingue voz",
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
  "IA para marketing",
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
  "IA para onboarding",
  "Chrome Extension / Plugin",
  "API disponível",
  "Multi-idiomas",
  "Ferramenta para equipes",
  "Integrações (Zapier, Slack, Google, etc.)",
  "Ferramenta para mobile",
  "Compatível com Outros Softwares (Figma, Photoshop, Final Cut, etc.)"
];

const TAG_WHITELIST = new Set(AVAILABLE_TAGS);

const TAGS_PROIBIDAS = new Set<string>([
  "Design e criatividade",
  "Criação de conteúdo",
  "Criação de marketing",
  "Marketing e publicidade",
  "Interface no-code",
  "Inspiração",
  "Produtividade",
  "Geração de imagens",
  "Edição de imagens",
  "Geração de áudio",
  "Síntese de voz",
  "Geração de vídeo",
  "Edição de vídeo",
  "Transcrição de áudio",
  "Geração de código",
  "Geração de texto",
  "Processamento de linguagem natural",
  "Desenvolvimento de software",
  "Automação de workflows",
  "Gerenciamento de tarefas",
  "Suporte multiplataforma",
  "Integração com outras ferramentas",
  "Assistente pessoal",
  "Escritor AI"
]);

const FERRAMENTAS_AMPLAS_EXTENDED = [
  "midjourney.com", "www.midjourney.com",
  "runwayml.com", "www.runwayml.com", "runway.ml", "www.runway.ml",
  "elevenlabs.io", "www.elevenlabs.io",
  "copy.ai", "www.copy.ai",
  "jasper.ai", "www.jasper.ai",
  "descript.com", "www.descript.com",
  "synthesia.io", "www.synthesia.io",
  "replicate.com", "www.replicate.com",
  "heygen.com", "www.heygen.com",
  "loom.com", "www.loom.com",
  "runware.ai", "www.runware.ai",
  "figma.com", "www.figma.com",
  "canva.com", "www.canva.com",
  "huggingface.co", "modal.com", "runpod.io"
];

const KEYWORDS_NICHO_EXTENDED = [
  "legal", "law", "contract", "compliance", "tribunal", "advocacia", "jurídico", "contrato",
  "medical", "health", "hospital", "diagnosis", "patient", "clinical", "médico", "saúde", "clínica",
  "banking", "finance", "trading", "investment", "credit", "loan", "financeiro", "banco",
  "accounting", "tax", "fiscal", "audit", "contábil", "impostos",
  "school", "university", "education", "learning", "educação", "escola", "universidade",
  "engineering", "CAD", "manufacturing", "industrial", "IoT", "engenharia",
  "architecture", "construction", "building", "arquitetura", "construção",
  "research", "scientific", "lab", "academic", "journal", "científico", "pesquisa"
];

function detectNichoKeywords(description: string, url: string): number {
  const textoBusca = `${description} ${url}`.toLowerCase();
  return KEYWORDS_NICHO_EXTENDED.filter(kw => textoBusca.includes(kw.toLowerCase())).length;
}

function sanitizeClassificationResult(result: any, url?: string, description?: string) {
  console.log('🛡️ FIREWALL - Entrada:', JSON.stringify(result, null, 2));
  
  if (!result || typeof result !== "object") {
    throw new Error("Resultado de classificação inválido");
  }

  const categoriasValidas = [
    "IMAGEM E DESIGN",
    "VÍDEO E ANIMAÇÃO",
    "ÁUDIO E VOZ",
    "TEXTO E REDAÇÃO",
    "CHATBOTS E ASSISTENTES",
    "CÓDIGO E DESENVOLVIMENTO",
    "NEGÓCIOS E PRODUTIVIDADE",
    "EDUCAÇÃO E TREINAMENTO",
    "SEGURANÇA E PRIVACIDADE",
    "DADOS E ANALYTICS",
    "PESQUISA E CIÊNCIA",
    "ESPECÍFICAS E NICHO",
  ];

  if (!result.categoria_principal || typeof result.categoria_principal !== "string") {
    throw new Error("categoria_principal ausente ou inválida");
  }

  if (!categoriasValidas.includes(result.categoria_principal)) {
    throw new Error(`categoria_principal inválida: ${result.categoria_principal}`);
  }

  if (result.categoria_secundaria) {
    if (typeof result.categoria_secundaria !== "string") {
      result.categoria_secundaria = null;
    } else if (!categoriasValidas.includes(result.categoria_secundaria)) {
      result.categoria_secundaria = null;
    } else if (result.categoria_secundaria === result.categoria_principal) {
      result.categoria_secundaria = null;
    }
  }

  let host = "";
  try {
    if (url) {
      host = new URL(url).hostname.toLowerCase();
    }
  } catch {
    host = (url || "").toLowerCase();
  }

  const isFerramentaAmpla = host && FERRAMENTAS_AMPLAS_EXTENDED.some((h) => host.includes(h));

  const categoriasOriginais = {
    principal: result.categoria_principal,
    secundaria: result.categoria_secundaria || null
  };

  const warnings: string[] = [];

  if (isFerramentaAmpla) {
    console.log('⚠️ FIREWALL - Ferramenta ampla detectada, removendo NICHO');
    if (result.categoria_principal === "ESPECÍFICAS E NICHO") {
      warnings.push('Ferramenta ampla/conhecida categorizada incorretamente como NICHO');
      result.categoria_principal = result.categoria_secundaria || "CÓDIGO E DESENVOLVIMENTO";
      result.categoria_secundaria = null;
    } else if (result.categoria_secundaria === "ESPECÍFICAS E NICHO") {
      warnings.push('Categoria secundária NICHO removida (ferramenta ampla)');
      result.categoria_secundaria = null;
    }
  }

  if (result.categoria_principal === "ESPECÍFICAS E NICHO" && description) {
    const nichoKeywordCount = detectNichoKeywords(description, url || '');
    if (nichoKeywordCount < 2) {
      warnings.push(`Categoria NICHO sem evidência suficiente (${nichoKeywordCount} palavra-chave encontrada)`);
      result.categoria_principal = result.categoria_secundaria || "NEGÓCIOS E PRODUTIVIDADE";
      result.categoria_secundaria = null;
    }
  }

  let tagsOriginais: string[] = [];

  if (Array.isArray(result.tags_funcionais)) {
    tagsOriginais = result.tags_funcionais;
  } else if (Array.isArray(result.tags)) {
    tagsOriginais = result.tags;
  } else {
    tagsOriginais = [];
  }

  console.log('📋 FIREWALL - Tags originais do modelo:', tagsOriginais);
  console.log('✅ FIREWALL - Whitelist tem', TAG_WHITELIST.size, 'tags permitidas');
  console.log('❌ FIREWALL - Tags proibidas:', Array.from(TAGS_PROIBIDAS));

  let tagsFiltradas: string[] = [];
  let tagsRemovidasProibidas: string[] = [];
  let tagsRemovidasInvalidas: string[] = [];

  for (const tag of tagsOriginais) {
    if (typeof tag !== "string") {
      console.log(`  ❌ Removida (não é string): ${tag}`);
      continue;
    }

    if (TAGS_PROIBIDAS.has(tag)) {
      console.log(`  ❌ Removida (proibida): "${tag}"`);
      tagsRemovidasProibidas.push(tag);
      continue;
    }

    if (!TAG_WHITELIST.has(tag)) {
      console.log(`  ❌ Removida (não está na whitelist): "${tag}"`);
      tagsRemovidasInvalidas.push(tag);
      continue;
    }

    console.log(`  ✅ Aprovada: "${tag}"`);
    tagsFiltradas.push(tag);
  }

  if (tagsRemovidasProibidas.length > 0) {
    warnings.push(`Tags proibidas removidas: ${tagsRemovidasProibidas.join(', ')}`);
  }

  if (tagsRemovidasInvalidas.length > 0) {
    warnings.push(`Tags inválidas (não estão na whitelist): ${tagsRemovidasInvalidas.join(', ')}`);
  }

  console.log('✨ FIREWALL - Tags após filtragem:', tagsFiltradas);

  tagsFiltradas = Array.from(new Set(tagsFiltradas));

  const originalLength = tagsFiltradas.length;
  if (tagsFiltradas.length > 5) {
    warnings.push(`Limite de 5 tags excedido (${tagsFiltradas.length} tags). Mantendo apenas as 5 primeiras.`);
    tagsFiltradas = tagsFiltradas.slice(0, 5);
  }

  if (tagsFiltradas.length === 0) {
    warnings.push('ERRO CRÍTICO: Nenhuma tag válida após filtragem');
  }

  result.tags_funcionais = tagsFiltradas;
  result.tags = tagsFiltradas;

  if (Array.isArray(result.tags_caso_uso)) {
    result.tags_caso_uso = Array.from(new Set(result.tags_caso_uso));
  } else {
    result.tags_caso_uso = [];
  }

  result.debug_firewall_aplicado = true;
  result.debug_host = host;
  result.debug_categoria_original = categoriasOriginais;
  result.debug_warnings = warnings;
  result.confianca = result.confianca || (warnings.length > 0 ? 0.7 : 0.85);

  console.log('🛡️ FIREWALL - Saída:', JSON.stringify(result, null, 2));

  return result;
}

function convertToFrontendFormat(result: any): any {
  const categories: string[] = [];
  
  if (result.categoria_principal) {
    categories.push(result.categoria_principal);
  }
  
  if (result.categoria_secundaria) {
    categories.push(result.categoria_secundaria);
  }

  const tags = Array.isArray(result.tags_funcionais) 
    ? result.tags_funcionais 
    : (Array.isArray(result.tags) ? result.tags : []);

  return {
    categories,
    tags,
    description: result.descricao || result.description || "",
    confidence: result.confianca || 0.8,
    reasoning: result.reasoning || '',
    debug_firewall_aplicado: result.debug_firewall_aplicado,
    debug_host: result.debug_host,
    debug_categoria_original: result.debug_categoria_original,
    debug_warnings: result.debug_warnings || [],
  };
}

const SYSTEM_PROMPT = SYSTEM_PROMPT_V2.replace('[Lista completa de tags disponíveis será fornecida]', AVAILABLE_TAGS.join(', '));

serve(async (req) => {
  console.log('🔥🔥🔥 CLEVER-SERVICE', VERSION, '- INICIADO 🔥🔥🔥');
  console.log('⚠️ FIREWALL RIGOROSO ATIVO - TAGS PROIBIDAS SERÃO REMOVIDAS');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, description, provider = 'openai' } = await req.json();
    console.log('📝 Classificando:', { url, provider });

    if (!url) {
      throw new Error('URL é obrigatória');
    }

    const userPrompt = description 
      ? `URL: ${url}\n\nDescrição: ${description}`
      : `URL: ${url}`;

    let result;

    if (provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY não configurada');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('❌ Erro OpenAI:', data);
        throw new Error(data.error?.message || 'Erro na API da OpenAI');
      }

      const content = data.choices[0].message.content;
      console.log('✅ Resposta OpenAI recebida');
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ Conteúdo não contém JSON válido:', content);
        throw new Error('Resposta não contém JSON válido');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('🔍 PARSED (ANTES FIREWALL):', JSON.stringify(parsed, null, 2));

      const sanitized = sanitizeClassificationResult(parsed, url, description);
      
      result = convertToFrontendFormat(sanitized);
      console.log('📤 RESULT FINAL:', JSON.stringify(result, null, 2));
    } else {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!anthropicApiKey) {
        throw new Error('ANTHROPIC_API_KEY não configurada');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API da Anthropic');
      }

      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      const sanitized = sanitizeClassificationResult(parsed, url, description);
      result = convertToFrontendFormat(sanitized);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});