
// SERVIÇO DE IA LOCAL (OLLAMA)
// Endpoint padrão: http://localhost:11434
// Requer configuração de CORS: OLLAMA_ORIGINS="*"

import { OllamaModel, NewsAnalysis, Timeframe, AIConfig, RODRIGO_PROFILE } from "../types";

const OLLAMA_BASE = "http://localhost:11434";

// Parser cirúrgico para JSON do Llama3 (que muitas vezes adiciona texto antes/depois)
const extractJsonFromLlama = (text: string): any[] => {
    try {
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const clean = text.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(clean);
        }
        
        // Tenta achar objeto único se não for array
        const objStart = text.indexOf('{');
        const objEnd = text.lastIndexOf('}');
        if (objStart !== -1 && objEnd !== -1) {
            return [JSON.parse(text.substring(objStart, objEnd + 1))];
        }

        throw new Error("JSON structure not found");
    } catch (e) {
        console.warn("Falha no parser JSON do Ollama:", e);
        return [];
    }
};

export const checkOllamaHealth = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${OLLAMA_BASE}/`);
        return res.ok;
    } catch (e: any) {
        if (window.location.protocol === 'https:') {
            console.error("ERRO OLLAMA: Bloqueio de Conteúdo Misto. O site está em HTTPS, mas o Ollama é HTTP.");
        }
        return false;
    }
};

export const fetchLocalModels = async (): Promise<OllamaModel[]> => {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`);
        if (!res.ok) throw new Error("Falha ao listar modelos");
        const data = await res.json();
        return data.models || [];
    } catch (e) {
        console.error("Erro ao buscar modelos locais:", e);
        return [];
    }
};

export const analyzeWithOllama = async (contextData: string, topic: string, config: AIConfig): Promise<NewsAnalysis[]> => {
    const prompt = `
    ATUE COMO: Inteligência Privada.
    CONTEXTO: ${contextData}
    PERFIL: ${RODRIGO_PROFILE}
    TÓPICO: ${topic}

    TAREFA: Analise o contexto e extraia insights críticos.
    
    FORMATO JSON OBRIGATÓRIO:
    [
        {
            "title": "Título Curto e Impactante",
            "category": "Categoria (ex: Agro, Política)",
            "narrative": "O que a mídia diz (Resumo)",
            "truth": "A verdade oculta ou fatos puros",
            "relevanceScore": 85,
            "nationalRelevance": 70,
            "personalImpact": "Impacto direto para Rodrigo",
            "muskAdvice": "Conselho estratégico curto"
        }
    ]

    IMPORTANTE: Responda APENAS o JSON. Sem introdução.
    `;

    try {
        const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: config.modelName || 'llama3:latest',
                prompt: prompt,
                stream: false, 
                format: "json", 
                options: {
                    temperature: 0.2, // Baixa temperatura para JSON mais estável
                    num_ctx: 4096 
                }
            })
        });
        
        if (!response.ok) throw new Error("Ollama API Error");
        
        const data = await response.json();
        const parsed = extractJsonFromLlama(data.response);
        
        return parsed.map((item: any) => ({
            id: `ollama-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
            title: item.title || "Análise Local",
            category: item.category || topic,
            timeframe: Timeframe.DAILY,
            narrative: item.narrative || "Processamento local concluído.",
            truth: item.truth || "Verificação pendente.",
            intent: "Análise IA Local",
            action: "Revisar",
            relevanceScore: item.relevanceScore || 50,
            nationalRelevance: item.nationalRelevance || 50,
            personalImpact: item.personalImpact || "N/A",
            scenarios: {
                short: { prediction: "N/A", confidence: 0, impact: "N/A" },
                medium: { prediction: "N/A", confidence: 0, impact: "N/A" },
                long: { prediction: "N/A", confidence: 0, impact: "N/A" }
            },
            muskAdvice: item.muskAdvice,
            dateAdded: new Date().toISOString()
        }));

    } catch (e) {
        console.error("Falha na análise Ollama:", e);
        return [];
    }
};

export const callOllama = async (prompt: string, modelName: string = "llama3:latest"): Promise<string> => {
    try {
        const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false, 
                options: { temperature: 0.3 }
            })
        });
        if (!response.ok) throw new Error("Ollama API Error");
        const data = await response.json();
        return data.response;
    } catch (e) {
        throw e;
    }
};
