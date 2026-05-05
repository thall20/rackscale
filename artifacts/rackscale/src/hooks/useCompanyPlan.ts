import { useAuth } from "@/contexts/useAuth";
import type { Company } from "@/lib/supabase-projects";
import type { CompanyPlan, CompanyPlanStatus } from "@/lib/plans";

export type UseCompanyPlanResult = {
  company: Company | null;
  companyId: string | null;
  companyName: string | null;
  plan: CompanyPlan;
  planStatus: CompanyPlanStatus;
  scenarioLimit: number;
  loading: boolean;
  error: string | null;
};

/**
 * Returns the authenticated user's company plan data.
 *
 * Reads from AuthContext (which already fetches the company record after
 * login) — no additional network requests are made.
 *
 * Safe defaults when plan data is missing:
 *   plan          → "Free"
 *   planStatus    → "active"
 *   scenarioLimit → 3
 */
export function useCompanyPlan(): UseCompanyPlanResult {
  const { company, companyId, loading, profileError } = useAuth();

  const plan: CompanyPlan = company?.plan ?? "Free";
  const planStatus: CompanyPlanStatus = company?.plan_status ?? "active";
  const scenarioLimit: number = company?.scenario_limit ?? 3;

  return {
    company,
    companyId,
    companyName: company?.name ?? null,
    plan,
    planStatus,
    scenarioLimit,
    loading,
    error: profileError,
  };
}
