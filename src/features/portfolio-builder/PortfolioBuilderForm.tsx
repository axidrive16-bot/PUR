"use client";
import { useState } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import { T, BS } from "@/components/ui/tokens";
import type { BuilderInput, Strategy, RiskLevel, Diversif, Region } from "./types";

const SECTORS_ALL = ["Tech","Healthcare","Energy","Luxury","Consumer Goods","Artificial Intelligence","Cybersecurity","Clean Energy","Dividend Stocks","Industrials","European stocks"];
const AMOUNTS     = [1000, 5000, 10000];
const STRATEGIES: { id: Strategy; label: string; icon: string }[] = [
  { id:"growth",         label:"Croissance",       icon:"📈" },
  { id:"dividends",      label:"Dividendes",        icon:"💰" },
  { id:"balanced",       label:"Équilibré",         icon:"⚖️" },
  { id:"defensive",      label:"Défensif",          icon:"🛡️" },
  { id:"high-conviction",label:"High Conviction",   icon:"🎯" },
  { id:"diversified",    label:"Diversifié",         icon:"🌍" },
];
const RISKS: { id: RiskLevel; label: string }[] = [
  { id:"Conservative", label:"Conservateur" },
  { id:"Balanced",     label:"Équilibré"    },
  { id:"Dynamic",      label:"Dynamique"    },
];
const DIVERSIFS: { id: Diversif; label: string; desc: string }[] = [
  { id:"concentrated",        label:"Concentré",         desc:"3-4 actifs" },
  { id:"balanced",            label:"Équilibré",          desc:"5-7 actifs" },
  { id:"highly-diversified",  label:"Très diversifié",   desc:"8-11 actifs" },
];
const REGIONS: { id: Region; label: string }[] = [
  { id:"us",     label:"🇺🇸 Américain" },
  { id:"europe", label:"🇪🇺 Européen"  },
  { id:"global", label:"🌍 Global"     },
];

function Chip<T extends string>({ value, selected, onSelect, label }: { value: T; selected: boolean; onSelect: (v: T) => void; label: string }) {
  return (
    <button onClick={() => onSelect(value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${selected ? T.forest : T.border}`, background: selected ? T.greenBg : T.surface, color: selected ? T.forest : T.textSub, fontSize: 13, fontWeight: selected ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", flexShrink: 0 }}>
      {label}
    </button>
  );
}

function SectorPill({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${selected ? T.forest : T.mint}`, background: selected ? T.forest : T.greenBg, color: selected ? "#E8F0EB" : T.forest, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
      {selected && "✓ "}{label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{children}</p>;
}

interface Props { onGenerate: (input: BuilderInput) => void; loading: boolean; }

export function PortfolioBuilderForm({ onGenerate, loading }: Props) {
  const prefs = useUserStore(s => s.preferences);

  const [amount, setAmount]   = useState<number>(5000);
  const [custom, setCustom]   = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [strategy, setStrat]  = useState<Strategy>("balanced");
  const [risk, setRisk]       = useState<RiskLevel>("Balanced");
  const [sectors, setSectors] = useState<string[]>(prefs?.sectors?.filter(s => SECTORS_ALL.includes(s)) ?? []);
  const [diversif, setDiv]    = useState<Diversif>("balanced");
  const [region, setRegion]   = useState<Region>("global");

  const toggleSector = (s: string) => setSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const finalAmount = useCustom ? (parseFloat(custom) || 1000) : amount;

  const handleGenerate = () => onGenerate({ amount: finalAmount, strategy, risk, sectors, diversif, region });

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Disclaimer */}
      <div style={{ background: T.amberBg, border: `1px solid ${T.amber}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: T.amber, lineHeight: 1.6 }}>
        ⚠️ <strong>Simulation éducative uniquement.</strong> Ce portfolio est une proposition virtuelle et ne constitue pas un conseil en investissement.
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 22 }}>
        <Label>Montant à investir</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {AMOUNTS.map(a => (
            <Chip key={a} value={a as any} selected={!useCustom && amount === a} onSelect={v => { setAmount(v as number); setUseCustom(false); }} label={`${a.toLocaleString("fr-FR")} €`} />
          ))}
          <button onClick={() => setUseCustom(true)} style={{ padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${useCustom ? T.forest : T.border}`, background: useCustom ? T.greenBg : T.surface, color: useCustom ? T.forest : T.textSub, fontSize: 13, fontWeight: useCustom ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
            Personnalisé
          </button>
        </div>
        {useCustom && <input type="number" min="100" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Ex : 7500" style={{ ...BS.input, width: "100%", boxSizing: "border-box" }} />}
      </div>

      {/* Strategy */}
      <div style={{ marginBottom: 22 }}>
        <Label>Stratégie</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STRATEGIES.map(s => (
            <button key={s.id} onClick={() => setStrat(s.id)} style={{ padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${strategy === s.id ? T.forest : T.border}`, background: strategy === s.id ? T.greenBg : T.surface, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: strategy === s.id ? 700 : 500, color: strategy === s.id ? T.forest : T.text }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div style={{ marginBottom: 22 }}>
        <Label>Profil de risque</Label>
        <div style={{ display: "flex", gap: 8 }}>
          {RISKS.map(r => <Chip key={r.id} value={r.id} selected={risk === r.id} onSelect={setRisk} label={r.label} />)}
        </div>
      </div>

      {/* Sectors */}
      <div style={{ marginBottom: 22 }}>
        <Label>Secteurs d'intérêt</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SECTORS_ALL.map(s => <SectorPill key={s} label={s} selected={sectors.includes(s)} onToggle={() => toggleSector(s)} />)}
        </div>
      </div>

      {/* Diversification */}
      <div style={{ marginBottom: 22 }}>
        <Label>Diversification</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DIVERSIFS.map(d => (
            <button key={d.id} onClick={() => setDiv(d.id)} style={{ padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${diversif === d.id ? T.forest : T.border}`, background: diversif === d.id ? T.greenBg : T.surface, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: diversif === d.id ? 700 : 500, color: diversif === d.id ? T.forest : T.text }}>{d.label}</span>
              <span style={{ fontSize: 11, color: T.textMuted }}>{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div style={{ marginBottom: 28 }}>
        <Label>Zone géographique</Label>
        <div style={{ display: "flex", gap: 8 }}>
          {REGIONS.map(r => <Chip key={r.id} value={r.id} selected={region === r.id} onSelect={setRegion} label={r.label} />)}
        </div>
      </div>

      <button onClick={handleGenerate} disabled={loading} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Génération en cours…" : "Générer mon portfolio halal →"}
      </button>
    </div>
  );
}
