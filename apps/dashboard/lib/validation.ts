import { z } from "zod";

export const INDUSTRY_PROFILES = [
  "financial_services",
  "insurance",
  "healthcare",
  "saas",
  "retail",
  "manufacturing",
  "telecommunications",
  "energy",
  "logistics",
  "government",
  "education",
  "other",
] as const;

export type IndustryProfile = (typeof INDUSTRY_PROFILES)[number];

export const INDUSTRY_LABELS: Record<IndustryProfile, string> = {
  financial_services: "Financial Services",
  insurance: "Insurance",
  healthcare: "Healthcare",
  saas: "SaaS / Technology",
  retail: "Retail / E-commerce",
  manufacturing: "Manufacturing",
  telecommunications: "Telecommunications",
  energy: "Energy",
  logistics: "Logistics",
  government: "Government",
  education: "Education",
  other: "Other",
};

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  orgName: z.string().min(2, "Organisation name is required"),
  industry: z.enum(INDUSTRY_PROFILES),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createAgentSchema = z.object({
  agent_code: z.string().min(2).max(20),
  name: z.string().min(2).max(255),
  description: z.string().min(1),
  version: z.string().default("1.0.0"),
  agent_type: z.enum([
    "autonomous",
    "assistive",
    "supervisory",
    "gateway",
    "orchestrator",
    "retrieval",
    "classifier",
  ]),
  risk_level: z.enum(["critical", "high", "medium", "low"]),
  ai_act_risk_class: z.enum(["unacceptable", "high", "limited", "minimal"]),
  oversight_level: z.enum([
    "l1_automated",
    "l2_human_review",
    "l3_human_approval",
    "l4_human_in_loop",
  ]),
  owner_user_id: z.string().uuid(),
  model_name: z.string().optional(),
  model_provider: z.string().optional(),
  model_version: z.string().optional(),
  model_is_local: z.boolean().default(false),
  deployment_env: z.enum(["development", "staging", "production"]).default("development"),
  deployment_region: z.string().optional(),
  deployment_type: z
    .enum(["on_premises", "private_cloud", "hybrid", "public_cloud"])
    .default("on_premises"),
  business_domain: z.string().optional(),
  department: z.string().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().min(1).optional(),
  version: z.string().optional(),
  agent_type: z
    .enum(["autonomous", "assistive", "supervisory", "gateway", "orchestrator", "retrieval", "classifier"])
    .optional(),
  risk_level: z.enum(["critical", "high", "medium", "low"]).optional(),
  ai_act_risk_class: z.enum(["unacceptable", "high", "limited", "minimal"]).optional(),
  oversight_level: z
    .enum(["l1_automated", "l2_human_review", "l3_human_approval", "l4_human_in_loop"])
    .optional(),
  owner_user_id: z.string().uuid().optional(),
  model_name: z.string().optional(),
  model_provider: z.string().optional(),
  model_version: z.string().optional(),
  model_is_local: z.boolean().optional(),
  model_endpoint: z.string().optional(),
  deployment_env: z.enum(["development", "staging", "production"]).optional(),
  deployment_region: z.string().optional(),
  deployment_type: z.enum(["on_premises", "private_cloud", "hybrid", "public_cloud"]).optional(),
  business_domain: z.string().optional(),
  department: z.string().optional(),
  status: z
    .enum(["pending_registration", "registered", "approved", "active", "suspended", "under_review", "decommissioned"])
    .optional(),
  technical_owner_id: z.string().uuid().optional().nullable(),
});

export const createSystemSchema = z.object({
  system_code: z.string().min(2).max(20),
  name: z.string().min(2).max(255),
  description: z.string().min(1),
  intended_purpose: z.string().min(1),
  risk_class: z.enum(["unacceptable", "high", "limited", "minimal"]),
  lifecycle: z
    .enum([
      "concept",
      "development",
      "testing",
      "pre_market_review",
      "conformity_assessed",
      "production",
      "under_significant_modification",
      "post_market_surveillance",
      "decommissioned",
    ])
    .default("development"),
  organisation_role: z
    .enum(["provider", "deployer", "provider_and_deployer", "importer", "distributor"])
    .default("deployer"),
  annex_iii_sector: z
    .enum([
      "biometric_identification",
      "critical_infrastructure",
      "education_vocational_training",
      "employment_worker_management",
      "essential_services_benefits",
      "law_enforcement",
      "migration_asylum_border",
      "administration_of_justice",
      "not_annex_iii",
    ])
    .optional(),
  owner_user_id: z.string().uuid(),
  technical_owner_id: z.string().uuid().optional(),
  business_domain: z.string().optional(),
  deployment_env: z.string().optional(),
  deployment_region: z.string().optional(),
});

export const updateSystemSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().min(1).optional(),
  intended_purpose: z.string().min(1).optional(),
  risk_class: z.enum(["unacceptable", "high", "limited", "minimal"]).optional(),
  lifecycle: z
    .enum([
      "concept",
      "development",
      "testing",
      "pre_market_review",
      "conformity_assessed",
      "production",
      "under_significant_modification",
      "post_market_surveillance",
      "decommissioned",
    ])
    .optional(),
  owner_user_id: z.string().uuid().optional(),
  business_domain: z.string().optional(),
  deployment_env: z.string().optional(),
  deployment_region: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateSystemInput = z.infer<typeof createSystemSchema>;
export type UpdateSystemInput = z.infer<typeof updateSystemSchema>;