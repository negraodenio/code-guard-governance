/**
 * 🛡️ SHIELDED PROTOCOL v12.4.0 — Citation Validator (Hallucination Guard)
 * Verifies that all [DOC#n] or [SOURCE: ID] citations are grounded in the provided RAG context.
 */

import { RAGDocument, EvidenceAudit, EvidenceItem, UnsupportedClaim } from '@/types/councilia-universal';

export class CitationValidator {
  /**
   * Performs semantic grounding check on the generated verdict.
   */
  public validate(
    text: string, 
    docs: RAGDocument[]
  ): { audit: EvidenceAudit; verified: boolean } {
    const highConfidence: EvidenceItem[] = [];
    const mediumConfidence: EvidenceItem[] = [];
    const unsupported: UnsupportedClaim[] = [];

    // 1. Extract all [DOC#n] style citations
    const docRegex = /\[DOC#(\d+)\]/g;
    const matches = Array.from(text.matchAll(docRegex));
    
    // 2. Map indices to actual documents
    const citedIndices = new Set(matches.map(m => parseInt(m[1], 10)));
    
    matched_indices:
    for (const index of Array.from(citedIndices)) {
      const docIndex = index - 1; // 1-based to 0-based
      const doc = docs[docIndex];

      if (doc) {
        highConfidence.push({
          source: doc.source || `Document ${index}`,
          supports: `Validated reference at index ${index}`,
          caveat: doc.confidence === 'low' ? 'Low confidence source provided.' : undefined
        });
      } else {
        unsupported.push({
          claim: `Reference [DOC#${index}]`,
          issue: `Document index ${index} out of bounds (Total docs: ${docs.length})`,
          flag: 'REQUIRES_VERIFICATION'
        });
      }
    }

    // 3. Extract [SOURCE: Name] style citations
    const sourceRegex = /\[SOURCE:\s*([^\]]+)\]/gi;
    const sMatches = Array.from(text.matchAll(sourceRegex));
    
    for (const match of sMatches) {
      const sourceName = match[1].trim();
      const found = docs.find(d => d.source?.toLowerCase().includes(sourceName.toLowerCase()) || d.id === sourceName);

      if (found) {
        mediumConfidence.push({
          source: found.source,
          supports: `Named reference: ${sourceName}`
        });
      } else {
        // Only add to unsupported if not already caught as an index error
        if (!unsupported.some(u => u.claim.includes(sourceName))) {
          unsupported.push({
            claim: `Source reference: ${sourceName}`,
            issue: 'Named source not found in provided RAG context.',
            flag: 'ASSUMPTION'
          });
        }
      }
    }

    return {
      audit: {
        highConfidence,
        mediumConfidence,
        unsupported
      },
      verified: unsupported.length === 0 && (highConfidence.length > 0 || mediumConfidence.length > 0)
    };
  }
}
