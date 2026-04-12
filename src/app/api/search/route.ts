import { NextRequest, NextResponse } from "next/server";
import { fmpService } from "@/lib/fmp";

const DEMO_TICKERS = [
  { ticker:"AAPL", name:"Apple Inc.",      exchange:"NASDAQ" },
  { ticker:"MSFT", name:"Microsoft Corp.", exchange:"NASDAQ" },
  { ticker:"TSLA", name:"Tesla Inc.",      exchange:"NASDAQ" },
  { ticker:"AMZN", name:"Amazon.com",      exchange:"NASDAQ" },
  { ticker:"NKE",  name:"Nike Inc.",       exchange:"NYSE"   },
];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  if (!process.env.FMP_API_KEY) {
    const results = DEMO_TICKERS.filter(t =>
      t.ticker.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase())
    );
    return NextResponse.json({ results });
  }

  try {
    const data = await fmpService.search(q);
    return NextResponse.json({
      results: (data ?? []).map(r => ({ ticker:r.symbol, name:r.name, exchange:r.exchangeShortName })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
