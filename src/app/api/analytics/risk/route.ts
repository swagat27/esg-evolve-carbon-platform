import { NextRequest } from "next/server";

// Minimal valid handler to fix build; returns mock risk metrics
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = Number(url.searchParams.get("orgId") ?? 1);
  const horizonMonths = Number(url.searchParams.get("horizonMonths") ?? 3);

  const risk = {
    orgId,
    horizonMonths,
    metrics: {
      var95: 12.3, // Value at Risk (95%)
      expectedShortfall: 18.7,
      beta: 0.82,
      volatility: 0.27,
    },
    updatedAt: new Date().toISOString(),
  };

  return Response.json(risk);
}