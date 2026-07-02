"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const RISK_CLASSES = [
  { value: "minimal", label: "Minimal" },
  { value: "limited", label: "Limited" },
  { value: "high", label: "High" },
  { value: "unacceptable", label: "Unacceptable" },
];

const LIFECYCLES = [
  { value: "concept", label: "Concept" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "production", label: "Production" },
];

const ROLES = [
  { value: "provider", label: "Provider" },
  { value: "deployer", label: "Deployer" },
  { value: "provider_and_deployer", label: "Provider & Deployer" },
  { value: "importer", label: "Importer" },
  { value: "distributor", label: "Distributor" },
];

const ANNEX_III = [
  { value: "not_annex_iii", label: "Not Annex III" },
  { value: "biometric_identification", label: "Biometric Identification" },
  { value: "critical_infrastructure", label: "Critical Infrastructure" },
  { value: "education_vocational_training", label: "Education / Vocational Training" },
  { value: "employment_worker_management", label: "Employment / Worker Management" },
  { value: "essential_services_benefits", label: "Essential Services / Benefits" },
  { value: "law_enforcement", label: "Law Enforcement" },
  { value: "migration_asylum_border", label: "Migration / Asylum / Border" },
  { value: "administration_of_justice", label: "Administration of Justice" },
];

export function SystemForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    system_code: "",
    name: "",
    description: "",
    intended_purpose: "",
    risk_class: "minimal",
    lifecycle: "development",
    organisation_role: "deployer",
    annex_iii_sector: "not_annex_iii",
    owner_user_id: "",
    business_domain: "",
    deployment_env: "",
    deployment_region: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create system");
      }

      const data = await res.json();
      router.push(`/systems/${data.system.system_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create system");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="border-b border-border-dark pb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Identity
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="System Code"
            value={form.system_code}
            onChange={(e) => set("system_code", e.target.value)}
            placeholder="CREDIT-AI-001"
            required
          />
          <Input
            label="Business Domain"
            value={form.business_domain}
            onChange={(e) => set("business_domain", e.target.value)}
            placeholder="Credit Risk"
          />
        </div>
        <div className="mt-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Credit Scoring AI System"
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the AI system and its components"
            className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Intended Purpose
          </label>
          <textarea
            value={form.intended_purpose}
            onChange={(e) => set("intended_purpose", e.target.value)}
            placeholder="What is this AI system designed to do? Required for AI Act Art. 11."
            className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
            required
          />
        </div>
      </div>

      <div className="border-b border-border-dark pb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Classification
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Risk Class"
            options={RISK_CLASSES}
            value={form.risk_class}
            onChange={(e) => set("risk_class", e.target.value)}
          />
          <Select
            label="Lifecycle"
            options={LIFECYCLES}
            value={form.lifecycle}
            onChange={(e) => set("lifecycle", e.target.value)}
          />
          <Select
            label="Organisation Role"
            options={ROLES}
            value={form.organisation_role}
            onChange={(e) => set("organisation_role", e.target.value)}
          />
          <Select
            label="Annex III Sector"
            options={ANNEX_III}
            value={form.annex_iii_sector}
            onChange={(e) => set("annex_iii_sector", e.target.value)}
          />
        </div>
      </div>

      <div className="border-b border-border-dark pb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Owner
        </h3>
        <Input
          label="Owner User ID"
          value={form.owner_user_id}
          onChange={(e) => set("owner_user_id", e.target.value)}
          placeholder="UUID of the owner"
          required
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Deployment
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Environment"
            value={form.deployment_env}
            onChange={(e) => set("deployment_env", e.target.value)}
            placeholder="development / staging / production"
          />
          <Input
            label="Region"
            value={form.deployment_region}
            onChange={(e) => set("deployment_region", e.target.value)}
            placeholder="eu-west-1"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          Create AI System
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}