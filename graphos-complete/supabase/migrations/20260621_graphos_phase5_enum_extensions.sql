-- GraphOS Phase 5: Enum type extensions for memory, classification, and new relationships
ALTER TYPE entity_kind ADD VALUE IF NOT EXISTS 'memory';
ALTER TYPE entity_kind ADD VALUE IF NOT EXISTS 'classification';
ALTER TYPE rel_kind ADD VALUE IF NOT EXISTS 'USES_MEMORY';
ALTER TYPE rel_kind ADD VALUE IF NOT EXISTS 'INTEGRATES_WITH';
ALTER TYPE rel_kind ADD VALUE IF NOT EXISTS 'BASED_ON';
ALTER TYPE rel_kind ADD VALUE IF NOT EXISTS 'DEPLOYS_IN';
