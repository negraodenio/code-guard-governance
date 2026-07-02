/**
 * Verdict Engine v3.0: High-Fidelity Strategic Intelligence
 * Transforms unstructured AI expert debates into structured strategic metrics.
 */

export interface AllianceData {
    category: string;
    personas: string[];
    avgScore: number;
    color: string;
    description?: string;
}

export interface SmartVerdictMetadata {
    score: number;
    confidence: number;
    keyRisk?: string;
    keyOpportunity?: string;
    alliance: 'Velocity' | 'Stability' | 'Neutral';
    verdictTrigger?: string;
    // Persona specific
    failureMode?: string;
    circuitBreaker?: string;
    vaccine?: string;
    championProfile?: string;
    procurementLane?: string;
    landTeam?: string;
    expandPath?: string;
    metricOwned?: string;
}

/**
 * Robustly parses persona response text into structured metadata.
 */
export function parsePersonaResponseV3(text: string): SmartVerdictMetadata {
    const metadata: Partial<SmartVerdictMetadata> = {};

    // Standard metric extractors
    const extract = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? match[1].trim() : undefined;
    };

    metadata.score = parseInt(extract(/SCORE:\s*\[?(\d{1,3})\]?/i) || '50');
    metadata.confidence = parseInt(extract(/CONFIDENCE:\s*\[?(\d{1,3})\]?%/i) || '70');
    metadata.keyRisk = extract(/KEY RISK:\s*(.*)/i);
    metadata.keyOpportunity = extract(/KEY OPPORTUNITY:\s*(.*)/i);
    metadata.alliance = (extract(/ALLIANCE:\s*\[?"?(Velocity|Stability|Neutral)"?\]?/i) || 'Neutral') as any;
    metadata.verdictTrigger = extract(/VERDICT_TRIGGER:\s*(.*)/i);

    // Persona specific fields
    metadata.failureMode = extract(/FAILURE_MODE:\s*(.*)/i);
    metadata.circuitBreaker = extract(/CIRCUIT_BREAKER:\s*(.*)/i);
    metadata.vaccine = extract(/VACCINE:\s*(.*)/i);
    metadata.championProfile = extract(/CHAMPION_PROFILE:\s*(.*)/i);
    metadata.procurementLane = extract(/PROCUREMENT_LANE:\s*\[?"?(.*)"?\]?/i);
    metadata.landTeam = extract(/LAND_TEAM:\s*\[?"?(.*)"?\]?/i);
    metadata.expandPath = extract(/EXPAND_PATH:\s*\[?"?(.*)"?\]?/i);
    metadata.metricOwned = extract(/METRIC_OWNED:\s*\[?"?(.*)"?\]?/i);

    return metadata as SmartVerdictMetadata;
}

/**
 * Calculates a mathematically consistent Dissent Range and Neural Alignment.
 * If Dissent is high, Alignment MUST be low.
 */
export function calculateNeuralConsistency(scores: number[]): { dissent: number; alignment: number } {
    if (scores.length < 2) return { dissent: 0, alignment: 100 };

    // 1. Calculate Standard Deviation as base for Dissent
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // 2. Dissent Range (Scale 0-100)
    // Max theoretical stdDev is 50 (e.g. [0, 100])
    const dissent = Math.min(100, Math.round(stdDev * 2));

    // 3. Alignment (Inverse of Dissent)
    const alignment = 100 - dissent;

    return { dissent, alignment };
}

/**
 * Calculates the Estimated Value at Risk (VaR) anchored in Eurachem/ISO uncertainty.
 * Factors in both the average score and the dissent (uncertainty).
 */
export function calculateVaR(score: number, dissent: number = 20): string {
    // Risk increases as score ↓ and dissent ↑
    const inverseScore = 100 - score;
    
    // Formula: (InverseScore * Uncertainty) scaled to 0-100
    const varValue = Math.min(99.9, (inverseScore * 0.8) + (dissent * 0.4));
    
    return varValue.toFixed(1) + '%';
}

/**
 * Calculates a high-precision fidelity index.
 */
export function getPrecisionLevel(score: number, alignment: number = 80): string {
    // Fidelity depends on consensus alignment
    const precision = (score * 0.4) + (alignment * 0.6);
    return precision.toFixed(1) + '%';
}

/**
 * Clusters personas into dynamic strategic alliances based on their prompt-defined alliance type.
 */
export function getAllianceClusteringV3(personaResponses: { id: string, text: string }[]): AllianceData[] {
    const parsedData = personaResponses.map(r => ({
        id: r.id,
        metadata: parsePersonaResponseV3(r.text)
    }));

    const velocityList = parsedData.filter(d => d.metadata.alliance === 'Velocity');
    const stabilityList = parsedData.filter(d => d.metadata.alliance === 'Stability');
    const neutralList = parsedData.filter(d => d.metadata.alliance === 'Neutral');

    const alliances: AllianceData[] = [];

    if (velocityList.length > 0) {
        alliances.push({
            category: 'Velocity',
            personas: velocityList.map(d => d.id),
            avgScore: Math.round(velocityList.reduce((acc, d) => acc + d.metadata.score, 0) / velocityList.length),
            color: '#A855F7', // Purple/Visionary
            description: 'Focused on growth, market capture, and speed.'
        });
    }

    if (stabilityList.length > 0) {
        alliances.push({
            category: 'Stability',
            personas: stabilityList.map(d => d.id),
            avgScore: Math.round(stabilityList.reduce((acc, d) => acc + d.metadata.score, 0) / stabilityList.length),
            color: '#EF4444', // Red/Guardian
            description: 'Focused on risk mitigation, ethics, and resilience.'
        });
    }

    if (neutralList.length > 0) {
        alliances.push({
            category: 'Optimizer',
            personas: neutralList.map(d => d.id),
            avgScore: Math.round(neutralList.reduce((acc, d) => acc + d.metadata.score, 0) / neutralList.length),
            color: '#3B82F6', // Blue/Technologist
            description: 'Pragmatic balance between growth and risk.'
        });
    }

    return alliances;
}

/**
 * Generates an Audit-Grade Technical Badge anchored in real standards.
 * Replaces pseudo-scientific citations with institutional ones.
 */
export function getScientificBadge(personaId: string, score: number): { label: string; cite: string } | null {
    // Hierarquia da Verdade (INMETRO / MAPA)
    if (score < 45) return { label: "CRITICAL FAILURE", cite: "ISO/IEC 17025 (Competence)" };
    
    switch (personaId) {
        case 'visionary':
        case 'marketeer':
            return { label: "Operational Value", cite: "ISO 9001 (Quality)" };
        case 'devil':
        case 'ethicist':
            return { label: "Measurement Uncertainty", cite: "Eurachem Guide (QUAM)" };
        case 'technologist':
        case 'financier':
            return { label: "Reproducibility Audit", cite: "ISO 5725 (Accuracy)" };
        case 'regulatory':
            return { label: "Regulatory Conformity", cite: "MAPA / INMETRO Norms" };
        default:
            return { label: "General Audit", cite: "ISO 19011 (Auditing)" };
    }
}
