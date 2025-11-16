import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// ===== NOVA VERSÃO - FORÇAR REBUILD =====
const VERSION = 'v6.0-FINAL-REBUILD-2025-01-16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVAILABLE_TAGS = [
  // Texto e Redação
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
  
  // Imagem e Design
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
  
  // Vídeo e Animação
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
  
  // Áudio e Voz
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
  
  // Negócios e Produtividade
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
  
  // Chatbots e Assistentes
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
  
  // Tags Extras
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
  "Produtividade"
]);

function sanitizeClassificationResult(result: any, url?: string) {
  console.log('🛡️ FIREWALL - Entrada:', JSON.stringify(result, null, 2));
  
  if (!result || typeof result !== "object") {
    throw new Error("Resultado de classificação inválido");
  }

  // Validar categorias
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

  // Extrair host da URL
  let host = "";
  try {
    if (url) {
      host = new URL(url).hostname.toLowerCase();
    }
  } catch {
    host = (url || "").toLowerCase();
  }

  const nuncaNichoHosts = [
    "midjourney.com",
    "www.midjourney.com",
    "runwayml.com",
    "www.runwayml.com",
    "runway.ml",
    "www.runway.ml",
    "elevenlabs.io",
    "www.elevenlabs.io",
    "copy.ai",
    "www.copy.ai",
    "jasper.ai",
    "www.jasper.ai",
    "descript.com",
    "www.descript.com",
    "synthesia.io",
    "www.synthesia.io",
    "replicate.com",
    "www.replicate.com",
    "heygen.com",
    "www.heygen.com",
    "loom.com",
    "www.loom.com",
  ];

  const isFerramentaAmpla = host && nuncaNichoHosts.some((h) => host.includes(h));

  const categoriasOriginais = {
    principal: result.categoria_principal,
    secundaria: result.categoria_secundaria || null
  };

  if (isFerramentaAmpla) {
    console.log('⚠️ FIREWALL - Ferramenta ampla detectada, removendo NICHO');
    if (result.categoria_principal === "ESPECÍFICAS E NICHO") {
      result.categoria_principal = result.categoria_secundaria || "IMAGEM E DESIGN";
      result.categoria_secundaria = null;
    } else if (result.categoria_secundaria === "ESPECÍFICAS E NICHO") {
      result.categoria_secundaria = null;
    }
  }

  // Sanitizar tags
  let tagsOriginais: string[] = [];

  if (Array.isArray(result.tags_funcionais)) {
    tagsOriginais = result.tags_funcionais;
  } else if (Array.isArray(result.tags)) {
    tagsOriginais = result.tags;
  }

  console.log('📋 FIREWALL - Tags originais do modelo:', tagsOriginais);
  console.log('✅ FIREWALL - Whitelist tem', TAG_WHITELIST.size, 'tags permitidas');
  console.log('❌ FIREWALL - Tags proibidas:', Array.from(TAGS_PROIBIDAS));

  let tagsFiltradas = tagsOriginais.filter((tag) => {
    const isString = typeof tag === "string";
    const inWhitelist = TAG_WHITELIST.has(tag);
    const isProibida = TAGS_PROIBIDAS.has(tag);
    
    console.log(`  🔍 Tag "${tag}": string=${isString}, whitelist=${inWhitelist}, proibida=${isProibida}`);
    
    return isString && inWhitelist && !isProibida;
  });
  
  console.log('✨ FIREWALL - Tags após filtragem:', tagsFiltradas);

  tagsFiltradas = Array.from(new Set(tagsFiltradas));

  if (tagsFiltradas.length > 5) {
    tagsFiltradas = tagsFiltradas.slice(0, 5);
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
    debug_firewall_aplicado: result.debug_firewall_aplicado,
    debug_host: result.debug_host,
    debug_categoria_original: result.debug_categoria_original,
  };
}

const SYSTEM_PROMPT = `Você é um CLASSIFICADOR AUTOMÁTICO de ferramentas de IA para um diretório grande (1500+ ferramentas).

CATEGORIAS OFICIAIS (lista fechada - use no máximo 2):
- IMAGEM E DESIGN
- VÍDEO E ANIMAÇÃO
- ÁUDIO E VOZ
- TEXTO E REDAÇÃO
- CHATBOTS E ASSISTENTES
- CÓDIGO E DESENVOLVIMENTO
- NEGÓCIOS E PRODUTIVIDADE
- EDUCAÇÃO E TREINAMENTO
- SEGURANÇA E PRIVACIDADE
- DADOS E ANALYTICS
- PESQUISA E CIÊNCIA
- ESPECÍFICAS E NICHO

REGRA DE NICHO (OBRIGATÓRIA E PRIORITÁRIA):

A categoria "ESPECÍFICAS E NICHO" só pode ser usada se e somente se a descrição contiver palavras-chave claras relacionadas a setores específicos, como:

- jurídico, contrato, advocacia, tribunal, compliance legal  
- médico, hospital, clínica, saúde, diagnóstico, radiologia  
- contábil, fiscal, impostos, balanço, auditoria  
- financeiro, crédito, empréstimo, banco, trading, investimento  
- educação formal (escolas, universidades, provas oficiais)  
- engenharia, IoT industrial, CAD, manufatura, robótica  
- arquitetura, construção civil, imobiliário  
- pesquisa científica, artigo acadêmico, laboratório  

Se nenhuma dessas palavras aparecer **explicitamente** na descrição, é PROIBIDO usar "ESPECÍFICAS E NICHO".

Ferramentas amplas ou genéricas como:
Midjourney, Runway, ElevenLabs, Replicate, Copy.ai, Jasper, HeyGen, Loom
NUNCA devem usar "ESPECÍFICAS E NICHO".

TAGS FUNCIONAIS PERMITIDAS (whitelist - NÃO inventar novas):
${AVAILABLE_TAGS.join(', ')}

IMPORTANTE:
Você só pode usar tags FUNCIONAIS que existam na whitelist acima.
Qualquer tag que NÃO estiver na lista deve ser automaticamente descartada.
NÃO crie variações, NÃO ajuste texto, NÃO traduza e NÃO invente tags.

LIMITE DURO:
Selecione no máximo 5 tags funcionais. Se o modelo listar mais de 5, você deve retornar apenas as 5 mais relevantes para a descrição.

TAGS PROIBIDAS (NUNCA use estas tags):
- "Design e criatividade"
- "Criação de conteúdo"
- "Criação de marketing"
- "Marketing e publicidade"
- "Interface no-code"
- "Inspiração"
- "Produtividade"

Se essas tags forem sugeridas pela classificação preliminar, REMOVA TODAS elas.

REGRAS OBRIGATÓRIAS:
1. Use NO MÁXIMO 2 categorias: categoria_principal (obrigatória) e categoria_secundaria (opcional)
2. Selecione NO MÁXIMO 5 tags funcionais da whitelist
3. Use APENAS tags da lista fornecida - NÃO invente tags novas
4. NÃO altere o texto das tags (mantenha grafia exata)
5. Evite usar "NEGÓCIOS E PRODUTIVIDADE" como secundária genérica
6. Use "ESPECÍFICAS E NICHO" SOMENTE quando houver evidência clara de setor específico (veja regra de nicho acima)
7. Se categoria_principal = "ESPECÍFICAS E NICHO", NÃO defina categoria_secundaria
8. Retorne APENAS JSON válido, sem texto adicional

FORMATO DE RESPOSTA OBRIGATÓRIO:
{
  "categoria_principal": "CATEGORIA",
  "categoria_secundaria": "CATEGORIA ou null",
  "tags_funcionais": ["tag1", "tag2", "tag3"],
  "tags_caso_uso": [],
  "descricao": "Breve descrição da ferramenta"
}`;

serve(async (req) => {
  console.log('🔥🔥🔥 CLEVER-SERVICE', VERSION, '- INICIADO 🔥🔥🔥');
  console.log('⚠️ NOVO CÓDIGO ATIVO - FIREWALL COMPLETO OPERACIONAL');
  
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
      
      const sanitized = sanitizeClassificationResult(parsed, url);
      
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
      const sanitized = sanitizeClassificationResult(parsed, url);
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
