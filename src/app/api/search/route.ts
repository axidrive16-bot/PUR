import { NextRequest, NextResponse } from "next/server";
import { fmpService, FMP_AVAILABLE } from "@/services/market";
import { MOCK_TICKERS } from "@/services/market";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  if (!FMP_AVAILABLE) {
    const ql = q.toLowerCase();
    const results = MOCK_TICKERS.filter(t =>
      t.ticker.toLowerCase().includes(ql) ||
      t.name.toLowerCase().includes(ql)
    ).map(t => ({ ticker: t.ticker, name: t.name, exchange: t.exchange }));
    return NextResponse.json({ results });
  }

  try {
    const data = await fmpService.search(q);
    return NextResponse.json({
      results: (data ?? []).map(r => ({ ticker:r.symbol, name:r.name, exchange:r.exchange })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
