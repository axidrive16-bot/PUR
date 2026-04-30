"use client";
import { memo } from "react";
import { T, scoreInfo } from "./tokens";

export const ScoreRing = memo(({score,size=64}:{score:number;size?:number})=>{
  const si=scoreInfo(score); const r=size*.37, c=2*Math.PI*r;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score}/100 — ${si.label}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface2} strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={si.color} strokeWidth="5"
          strokeDasharray={`${(score/100)*c} ${c}`} strokeDashoffset={c*.25}
          strokeLinecap="round" style={{transition:"stroke-dasharray .9s ease"}}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fill={si.color} fontSize={size*.24} fontWeight="800" fontFamily="'Cabinet Grotesk',sans-serif">{score}</text>
      </svg>
      <div style={{background:si.bg,color:si.color,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:100,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{si.label}</div>
    </div>
  );
});
ScoreRing.displayName="ScoreRing";
