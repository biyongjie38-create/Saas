import { createRequestId, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, toAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { countUsageForDay } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const requestId = createRequestId();
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const supabaseClient = await createServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, { supabaseClient });
  const limitPerDay = user.plan === "free" ? 5 : 200;

  return okJsonResponse(
    {
      user,
      usage: {
        used_today: usedToday,
        limit_per_day: limitPerDay,
        remaining: Math.max(0, limitPerDay - usedToday)
      }
    },
    requestId
  );
}
