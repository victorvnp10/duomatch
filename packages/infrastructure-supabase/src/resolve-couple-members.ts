import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoupleMembers {
  userId: string;
  partnerId: string;
}

/**
 * The application-layer ports take only a coupleId; the caller's own id
 * (`userId`) comes from the authenticated Supabase session, and `partnerId`
 * is derived as whichever of the couple's two members that isn't.
 */
export const resolveCoupleMembers = async (
  client: SupabaseClient,
  coupleId: string,
): Promise<CoupleMembers> => {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("No authenticated Supabase user for couple lookup");
  }
  const userId = authData.user.id;

  const { data: couple, error } = await client
    .from("couples")
    .select("member_a, member_b")
    .eq("id", coupleId)
    .single();
  if (error || !couple) {
    throw new Error(`Couple ${coupleId} not found`);
  }

  const partnerId = couple.member_a === userId ? couple.member_b : couple.member_a;
  return { userId, partnerId };
};
