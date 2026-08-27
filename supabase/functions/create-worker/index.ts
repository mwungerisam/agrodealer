import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const authorization = request.headers.get("Authorization");
  if (!authorization) return Response.json({ error: "Unauthorized" }, { status: 401, headers });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = authorization.replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "owner") return Response.json({ error: "Owner access required" }, { status: 403, headers });

  const { email, fullName, phone, branchId, initialPassword } = await request.json();
  if (!email || !fullName || !branchId || !initialPassword) {
    return Response.json({ error: "Name, email, branch, and an initial password are required" }, { status: 400, headers });
  }
  if (String(initialPassword).length < 8) {
    return Response.json({ error: "The initial password must contain at least 8 characters" }, { status: 400, headers });
  }

  // Create the account directly rather than sending an invitation email. This
  // keeps worker onboarding available when the provider's email quota is busy.
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: initialPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim(), phone: phone?.trim() ?? "" },
  });
  if (error || !data.user) return Response.json({ error: error?.message ?? "Could not create worker" }, { status: 400, headers });
  const { error: roleError } = await admin.from("user_roles").upsert({ user_id: data.user.id, role: "manager", branch_id: branchId }, { onConflict: "user_id" });
  if (roleError) return Response.json({ error: roleError.message }, { status: 400, headers });
  return Response.json({ ok: true }, { headers });
});
