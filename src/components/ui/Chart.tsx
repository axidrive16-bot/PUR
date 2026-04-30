"use client";
import { useState, useCallback, useRef, memo } from "react";
import type { ChartPoint } from "@/domain/types";
import { T, useCur } from "./tokens";

// ── Chart avec Y-axis visible ─────────────────────────────────────
export const Chart = memo(({data,color=T.emerald,height=130,showYAxis=true,label="",rawCurrency=false}:{
  data:ChartPoint[];color?:string;height?:number;showYAxis?:boolean;label?:string;rawCurrency?:boolean;
})=>{
  const{sym,rate}=useCur();
  const r=rawCurrency?1:rate;
  const[hov,setHov]=useState<number|null>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const W=340,H=height,PT=8,PB=22,PL=showYAxis?42:8,PR=8;
  const cW=W-PL-PR,cH=H-PT-PB;
  const vals=data.map(d=>d.v);
  const min=vals.length?Math.min(...vals):0,max=vals.length?Math.max(...vals):1;
  const range=max-min||1;
  const yStep=(range/3);
  const yTicks=[min,min+yStep,min+yStep*2,max].map(v=>Math.round(v));
  const pts=data.map((d,i)=>({x:PL+(i/(data.length-1||1))*cW,y:PT+cH-((d.v-min)/range)*cH,v:d.v,t:d.t}));
  const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`M${pts[0]?.x||PL},${PT+cH} ${pts.map(p=>`L${p.x},${p.y}`).join(" ")} L${pts[pts.length-1]?.x||PL+cW},${PT+cH} Z`;
  const gid=`g${color.replace(/[^a-z0-9]/gi,"")}${data.length}`;
  const hovPt=hov!==null?pts[hov]:null;
  const fmtV=(v:number)=>{const cv=v*r;return cv>=1000?`${(cv/1000).toFixed(1)}k`:`${cv.toFixed(0)}`;};
  const fmtT=(ts:number)=>{const d=new Date(ts);return d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});};
  const onMove=useCallback((e:React.MouseEvent|React.TouchEvent)=>{
    if(!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const cx="touches" in e?e.touches[0]?.clientX||0:e.clientX;
    const xS=(cx-rect.left)*(W/rect.width);
    let ci=0,md=Infinity;
    pts.forEach((p,i)=>{const d=Math.abs(p.x-xS);if(d<md){md=d;ci=i;}});
    setHov(ci);
  },[pts]);

  if(!data.length)return(
    <div style={{height,background:T.surface2,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:12,color:T.textMuted}}>Données en cours de chargement…</span>
    </div>
  );

  return(
    <div>
      <div style={{height:22,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
        {hovPt?(
          <><span style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:"'DM Serif Display',serif"}}>{fmtV(hovPt.v)}{sym}</span><span style={{fontSize:11,color:T.textMuted}}>{fmtT(hovPt.t)}</span></>
        ):<span style={{fontSize:11,color:T.textMuted}}>{label}</span>}
      </div>
      <div style={{cursor:"crosshair"}} onMouseMove={onMove} onMouseLeave={()=>setHov(null)} onTouchMove={onMove} onTouchEnd={()=>setHov(null)}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}} role="img" aria-label="Graphique de valeur">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".15"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {yTicks.map((v,i)=>{
            const y=PT+cH-((v-min)/range)*cH;
            return<line key={i} x1={PL} y1={y} x2={PL+cW} y2={y} stroke={T.border} strokeWidth="1" strokeDasharray="3,4"/>;
          })}
          {showYAxis&&yTicks.map((v,i)=>{
            const y=PT+cH-((v-min)/range)*cH;
            return<text key={i} x={PL-5} y={y+1} textAnchor="end" dominantBaseline="middle" fontSize="9" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">{fmtV(v)}{sym}</text>;
          })}
          <path d={area} fill={`url(#${gid})`}/>
          <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1={PL} y1={PT+cH+1} x2={PL+cW} y2={PT+cH+1} stroke={T.border} strokeWidth="1"/>
          {[0,Math.floor(data.length/2),data.length-1].map(idx=>pts[idx]&&(
            <text key={idx} x={pts[idx].x} y={H-4} textAnchor={idx===0?"start":idx===data.length-1?"end":"middle"} fontSize="9" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">
              {fmtT(data[idx].t)}
            </text>
          ))}
          {hovPt&&<>
            <line x1={hovPt.x} y1={PT} x2={hovPt.x} y2={PT+cH} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".5"/>
            <circle cx={hovPt.x} cy={hovPt.y} r="4" fill={color} stroke={T.surface} strokeWidth="2"/>
          </>}
        </svg>
      </div>
    </div>
  );
});
Chart.displayName="Chart";

// ── Mini Sparkline ────────────────────────────────────────────────
export const Spark = memo(({pts,color=T.emerald}:{pts:ChartPoint[];color?:string})=>{
  if(!pts?.length||pts.length<2)return null;
  const vals=pts.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=52,H=22;
  const ps=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*(H*.85)}`).join(" ");
  return<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><polyline points={ps} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
});
Spark.displayName="Spark";

// ── Donut/Pie Chart ───────────────────────────────────────────────
function polarToCart(cx:number,cy:number,r:number,deg:number){const rad=deg*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}

export function PieChart({segments}:{segments:{label:string;pct:number;color:string}[]}){
  const[hov,setHov]=useState<number|null>(null);
  const R=52,ri=30,cx=70,cy=70;
  let angle=-90;
  const paths=segments.filter(s=>s.pct>0).map((s,i)=>{
    const start=angle;const sweep=(s.pct/100)*360;
    const sA=polarToCart(cx,cy,R,start),eA=polarToCart(cx,cy,R,start+sweep);
    const iE=polarToCart(cx,cy,ri,start+sweep),iS=polarToCart(cx,cy,ri,start);
    const large=sweep>180?1:0;
    const d=`M${sA.x.toFixed(2)},${sA.y.toFixed(2)} A${R},${R} 0 ${large} 1 ${eA.x.toFixed(2)},${eA.y.toFixed(2)} L${iE.x.toFixed(2)},${iE.y.toFixed(2)} A${ri},${ri} 0 ${large} 0 ${iS.x.toFixed(2)},${iS.y.toFixed(2)} Z`;
    angle+=sweep;
    return{d,color:s.color,label:s.label,pct:s.pct,i};
  });
  const hSeg=hov!==null?segments[hov]:null;
  return(
    <div style={{display:"flex",gap:16,alignItems:"center"}}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{flexShrink:0}}>
        {paths.map(p=>(
          <path key={p.i} d={p.d} fill={p.color} opacity={hov===null||hov===p.i?1:0.5}
            onMouseEnter={()=>setHov(p.i)} onMouseLeave={()=>setHov(null)}
            style={{cursor:"pointer",transition:"opacity .15s"}}/>
        ))}
        {hSeg?(
          <><text x={cx} y={cy-4} textAnchor="middle" fontSize="15" fontWeight="800" fill={T.text} fontFamily="'Cabinet Grotesk',sans-serif">{hSeg.pct.toFixed(0)}%</text>
          <text x={cx} y={cy+10} textAnchor="middle" fontSize="8" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">{hSeg.label.slice(0,10)}</text></>
        ):(
          <text x={cx} y={cy+5} textAnchor="middle" fontSize="11" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">Secteurs</text>
        )}
      </svg>
      <div style={{flex:1}}>
        {segments.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer",opacity:hov===null||hov===i?1:0.55,transition:"opacity .15s"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:T.textSub,flex:1}}>{s.label}</span>
            <span style={{fontSize:11,fontWeight:700,color:T.text}}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
