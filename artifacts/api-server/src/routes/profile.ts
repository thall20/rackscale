import { Router, type IRouter } from "express";
import { getSupabaseAdmin } from "../lib/supabase-admin";

const router: IRouter = Router();

type ProfileRow = { id: string; company_id: string };
type CompanyRow = { id: string };

/**
 * POST /api/profile/ensure
 *
 * Called by the frontend after every login.
 * Uses the service-role key to check for an existing profile and create a
 * default company + profile if one does not exist.
 * Returns { companyId, profileId, created: boolean }.
 */
router.post("/profile/ensure", async (req, res): Promise<void> => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const admin = getSupabaseAdmin();

  // Verify token and get the Supabase user
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = userData.user;

  // Check if a profile already exists for this user
  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle() as { data: ProfileRow | null; error: unknown };

  if (profileError) {
    req.log.error({ err: profileError }, "Failed to query profile");
    res.status(500).json({ error: "Failed to query profile" });
    return;
  }

  if (existingProfile) {
    res.json({
      companyId: existingProfile.company_id,
      profileId: existingProfile.id,
      created: false,
    });
    return;
  }

  // --- No profile yet: create company then profile ---

  // Use the company name provided at signup, falling back to email domain
  const email = user.email ?? "";
  const domain = email.split("@")[1] ?? "company";
  const metaCompanyName = user.user_metadata?.company_name as string | undefined;
  const companyName = metaCompanyName?.trim() ||
    domain
      .split(".")[0]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: newCompany, error: companyError } = await db
    .from("companies")
    .insert({ name: companyName, domain })
    .select("id")
    .single() as { data: CompanyRow | null; error: unknown };

  if (companyError || !newCompany) {
    req.log.error({ err: companyError }, "Failed to create company");
    res.status(500).json({ error: "Failed to create company" });
    return;
  }

  const { data: newProfile, error: newProfileError } = await db
    .from("profiles")
    .insert({
      id: user.id,
      company_id: newCompany.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    })
    .select("id, company_id")
    .single() as { data: ProfileRow | null; error: unknown };

  if (newProfileError || !newProfile) {
    req.log.error({ err: newProfileError }, "Failed to create profile");
    res.status(500).json({ error: "Failed to create profile" });
    return;
  }

  res.status(201).json({
    companyId: newProfile.company_id,
    profileId: newProfile.id,
    created: true,
  });
});

export default router;
