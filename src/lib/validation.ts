export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  corrections: Partial<ClassificationResult>;
  confidence: number;
}

export interface ClassificationResult {
  categoria_principal: string;
  categoria_secundaria?: string | null;
  tags_funcionais: string[];
  tags_caso_uso: string[];
  descricao: string;
  confianca?: number;
  reasoning?: string;
}

const FERRAMENTAS_AMPLAS_PATTERNS = {
  infrastructure: ['replicate.com', 'huggingface.co', 'modal.com', 'runpod.io', 'runware.ai'],
  professional_design: ['figma.com', 'adobe.com', 'sketch.com', 'canva.com'],
  multi_purpose: [
    'midjourney.com', 'runway.ml', 'runwayml.com', 'elevenlabs.io',
    'copy.ai', 'jasper.ai', 'descript.com', 'synthesia.io',
    'heygen.com', 'loom.com', 'openai.com', 'anthropic.com'
  ],
  creative_suites: ['microsoft.com/designer', 'google.com', 'freepik.com']
};

const KEYWORDS_NICHO = {
  juridico: ['legal', 'law', 'contract', 'compliance', 'tribunal', 'advocacia', 'jurídico', 'contrato'],
  medico: ['medical', 'health', 'hospital', 'diagnosis', 'patient', 'clinical', 'médico', 'saúde', 'clínica'],
  financeiro: ['banking', 'finance', 'trading', 'investment', 'credit', 'loan', 'financeiro', 'banco'],
  contabil: ['accounting', 'tax', 'fiscal', 'audit', 'contábil', 'impostos'],
  educacional: ['school', 'university', 'education', 'learning', 'course', 'educação', 'escola', 'universidade'],
  engenharia: ['engineering', 'CAD', 'manufacturing', 'industrial', 'IoT', 'engenharia'],
  arquitetura: ['architecture', 'construction', 'building', 'arquitetura', 'construção'],
  cientifico: ['research', 'scientific', 'lab', 'academic', 'journal', 'científico', 'pesquisa']
};

const TAG_REDUNDANCY_PAIRS = [
  ['Geração de texto', 'Copywriting'],
  ['Editor de vídeo IA', 'Geração de vídeo a partir de texto'],
  ['IA para fotos', 'Edição automática de imagem']
];

function isFerramentaAmpla(url: string): { isAmpla: boolean; reason: string; category: string } {
  const host = new URL(url).hostname.toLowerCase();

  for (const [category, patterns] of Object.entries(FERRAMENTAS_AMPLAS_PATTERNS)) {
    if (patterns.some(pattern => host.includes(pattern))) {
      return {
        isAmpla: true,
        reason: `Ferramenta conhecida da categoria: ${category}`,
        category
      };
    }
  }
  return { isAmpla: false, reason: '', category: '' };
}

function detectarNicho(description: string, url: string): { nicho: string | null; keywords: string[] } {
  const textoBusca = `${description} ${url}`.toLowerCase();

  for (const [nicho, keywords] of Object.entries(KEYWORDS_NICHO)) {
    const matchedKeywords = keywords.filter(kw => textoBusca.includes(kw.toLowerCase()));
    if (matchedKeywords.length >= 2) {
      return { nicho, keywords: matchedKeywords };
    }
  }

  return { nicho: null, keywords: [] };
}

function checkTagRedundancy(tags: string[]): string[] {
  const redundantTags: string[] = [];

  for (const [tag1, tag2] of TAG_REDUNDANCY_PAIRS) {
    if (tags.includes(tag1) && tags.includes(tag2)) {
      redundantTags.push(`${tag1} / ${tag2}`);
    }
  }

  return redundantTags;
}

export function validateClassification(
  result: any,
  url: string,
  description: string
): ValidationResult {
  const warnings: string[] = [];
  const corrections: any = {};
  let confidence = result.confianca || 0.8;

  const ampla = isFerramentaAmpla(url);

  if (ampla.isAmpla) {
    if (result.categoria_principal === 'ESPECÍFICAS E NICHO') {
      warnings.push(`⚠️ ${ampla.reason} - Não deve usar categoria NICHO`);
      corrections.categoria_principal = result.categoria_secundaria || 'CÓDIGO E DESENVOLVIMENTO';
      corrections.categoria_secundaria = null;
      confidence -= 0.2;
    }

    if (result.categoria_secundaria === 'ESPECÍFICAS E NICHO') {
      warnings.push(`⚠️ Categoria secundária NICHO removida (${ampla.reason})`);
      corrections.categoria_secundaria = null;
      confidence -= 0.1;
    }
  }

  if (result.tags_funcionais?.length === 0 || result.tags?.length === 0) {
    warnings.push('❌ Nenhuma tag funcional atribuída - possível erro na classificação');
    confidence -= 0.3;
  }

  if (result.categoria_principal === 'ESPECÍFICAS E NICHO') {
    const nichoDetectado = detectarNicho(description, url);

    if (!nichoDetectado.nicho) {
      warnings.push('⚠️ Categoria NICHO sem evidência de setor específico detectado');
      corrections.categoria_principal = result.categoria_secundaria || 'NEGÓCIOS E PRODUTIVIDADE';
      corrections.categoria_secundaria = null;
      confidence -= 0.25;
    } else {
      warnings.push(`✅ Nicho confirmado: ${nichoDetectado.nicho} (${nichoDetectado.keywords.join(', ')})`);
    }
  }

  const tags = result.tags_funcionais || result.tags || [];
  const redundantTags = checkTagRedundancy(tags);
  if (redundantTags.length > 0) {
    warnings.push(`⚠️ Tags redundantes detectadas: ${redundantTags.join(', ')}`);
    confidence -= 0.05;
  }

  if (tags.length > 5) {
    warnings.push(`⚠️ Mais de 5 tags atribuídas (${tags.length}) - limite recomendado é 5`);
  }

  const hasDescription = description && description.trim().length > 0;
  if (!hasDescription && confidence > 0.6) {
    warnings.push('ℹ️ Classificação baseada apenas na URL - confiança pode ser limitada');
    confidence = Math.min(confidence, 0.6);
  }

  corrections.confianca = confidence;

  return {
    isValid: warnings.filter(w => w.startsWith('❌')).length === 0,
    warnings,
    corrections,
    confidence
  };
}

export function calculateMetrics(results: Array<any>) {
  const metrics = {
    totalClassified: results.length,
    byCategory: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
    averageConfidence: 0,
    warningsCount: 0,
    emptyTagsCount: 0,
    successCount: 0,
    errorCount: 0
  };

  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const item of results) {
    if (item.error) {
      metrics.errorCount++;
      continue;
    }

    if (!item.result) continue;

    metrics.successCount++;

    const categories = item.result.categories || [];
    for (const cat of categories) {
      metrics.byCategory[cat] = (metrics.byCategory[cat] || 0) + 1;
    }

    const tags = item.result.tags || [];
    if (tags.length === 0) {
      metrics.emptyTagsCount++;
    }

    if (item.result.debug_warnings?.length > 0) {
      metrics.warningsCount++;
    }

    if (item.result.confidence) {
      totalConfidence += item.result.confidence;
      confidenceCount++;
    }
  }

  if (confidenceCount > 0) {
    metrics.averageConfidence = totalConfidence / confidenceCount;
  }

  return metrics;
}
