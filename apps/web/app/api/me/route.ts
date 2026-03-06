import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, toAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { getDailyLimitByPlan } from "@/lib/quota";
import { countUsageForDay } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export const GET = withApiRoute(async (_request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, {
    supabaseClient,
    action: "analyze"
  });
  const limitPerDay = getDailyLimitByPlan(user.plan);

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
});
