// src/config/council.ts
// CouncilIA v2.3 — ACE Engine — 6 Models, 6 Personas, Adversarial Debate

export type Region = 'EU' | 'US' | 'APAC' | 'GCC' | 'CN';
export type Sensitivity = 'public' | 'business' | 'code' | 'pii' | 'regulated';

export const councilConfig = {
    personas: {
        visionary: {
            id: 'visionary',
            name: 'Visionary',
            emoji: '🔮',
            role: 'Analyze the big-picture potential. What is the 10x opportunity? How could this reshape the market? Think like a venture capitalist evaluating a Series A.',
        },
        technologist: {
            id: 'technologist',
            name: 'Technologist',
            emoji: '⚙️',
            role: 'Evaluate technical feasibility, architecture choices, scalability limits, and engineering complexity. Think like a CTO who has built 3 startups.',
        },
        devil: {
            id: 'devil',
            name: "Devil's Advocate",
            emoji: '😈',
            role: 'Find every possible flaw, risk, and failure mode. Attack the idea ruthlessly. Think like a short-seller researching why this will fail.',
        },
        marketeer: {
            id: 'marketeer',
            name: 'Market Analyst',
            emoji: '📊',
            role: 'Analyze TAM/SAM/SOM, competitive landscape, customer acquisition costs, pricing strategy, and go-to-market viability. Think like a McKinsey partner.',
        },
        ethicist: {
            id: 'ethicist',
            name: 'Ethics & Risk',
            emoji: '⚖️',
            role: 'Evaluate regulatory risks, ethical implications, bias potential, data privacy concerns, and reputational risks. Think like a compliance officer at a top law firm.',
        },
        financier: {
            id: 'financier',
            name: 'Financial Strategist',
            emoji: '💰',
            role: 'Analyze unit economics, burn rate projections, revenue models, funding requirements, and path to profitability. Think like a CFO with PE experience.',
        },
    },
};

export type PersonaId = keyof typeof councilConfig.personas;

export type ModelConfig = { provider: 'openrouter' | 'siliconflow'; model: string };

const models: Record<string, ModelConfig> = {
    deepseek: { provider: 'openrouter', model: 'deepseek/deepseek-r1' },
    gemini: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    llama: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' },
    mistral: { provider: 'openrouter', model: 'mistralai/mistral-large-2411' },
    gpt4o: { provider: 'openrouter', model: 'openai/gpt-4o-2024-08-06' },
    kimi: { provider: 'openrouter', model: 'qwen/qwen-2.5-coder-32b-instruct' },
    qwen: { provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct' },
};

export function blockChina(region: Region, sensitivity: Sensitivity): boolean {
    return region === 'EU' && (sensitivity === 'pii' || sensitivity === 'regulated' || sensitivity === 'code');
}

export interface CouncilAssignment {
    assign: Record<PersonaId, ModelConfig>;
    judge: {
        provider: 'openrouter' | 'siliconflow';
        primary: string;
        fallback: string;
        zdr: boolean;
    };
}

export function getCouncilConfig(region: Region, sensitivity: Sensitivity): CouncilAssignment {
    const euSensitive = blockChina(region, sensitivity);

    if (euSensitive) {
        return {
            assign: {
                visionary: models.gemini,
                technologist: models.mistral,
                devil: models.llama,
                marketeer: models.gemini,
                ethicist: models.mistral,
                financier: models.llama,
            },
            judge: {
                provider: 'openrouter',
                primary: 'openai/gpt-4o',
                fallback: 'mistralai/mistral-medium-3',
                zdr: false,
            },
        };
    }

    return {
        assign: {
            visionary: models.deepseek,
            technologist: models.kimi,
            devil: models.llama,
            marketeer: models.gemini,
            ethicist: models.mistral,
            financier: models.qwen,
        },
        judge: {
            provider: 'openrouter',
            primary: 'openai/gpt-4o',
            fallback: 'deepseek/deepseek-r1',
            zdr: true,
        },
    };
}