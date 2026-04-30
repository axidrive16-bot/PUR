"use client";
import { createContext, useContext } from "react";
import type { ChartPoint, ChartPeriod } from "@/domain/types";

// ── Design Tokens ─────────────────────────────────────────────────
export const T = {
  bg:"#F7F5F0", surface:"#FFFFFF", surface2:"#F2F0EB", surface3:"#ECEAE4",
  border:"rgba(0,0,0,0.07)", borderMid:"rgba(0,0,0,0.12)",
  forest:"#1A3A2A", emerald:"#208640", leaf:"#4A7C3F", mint:"#C8E6C9",
  gold:"#C9A84C", goldLight:"#FDF3E0",
  text:"#1A1A16", textSub:"#6B6960", textMuted:"#A8A49C",
  green:"#208640", greenBg:"#EAF3DE",
  amber:"#B07D2A", amberBg:"#FDF3E0",
  red:"#A32D2D", redBg:"#FCEBEB",
  darkBg:"#111A14", darkSurface:"#1A2A20",
};

// ── Currency context ──────────────────────────────────────────────
export const EUR_USD = 0.92;
export const CurrCtx = createContext<{
  cur: "USD"|"EUR";
  setCur: (c:"USD"|"EUR") => void;
  fmtP: (v:number) => string;
  sym: string;
  rate: number;
}>({ cur:"USD", setCur:()=>{}, fmtP:(v)=>`${v.toFixed(2)}$`, sym:"$", rate:1 });
export const useCur = () => useContext(CurrCtx);

// ── Status map ────────────────────────────────────────────────────
export const STATUS: any = {
  "conforme":     { color:"#208640", bg:"#EAF3DE", label:"Conforme",      icon:"✅" },
  "douteux":      { color:"#B07D2A", bg:"#FDF3E0", label:"Douteux",       icon:"⚠️" },
  "non conforme": { color:"#A32D2D", bg:"#FCEBEB", label:"Non conforme",  icon:"❌" },
  "halal":        { color:"#208640", bg:"#EAF3DE", label:"Conforme",      icon:"✅" },
  "non-halal":    { color:"#A32D2D", bg:"#FCEBEB", label:"Non conforme",  icon:"❌" },
};

// ── Subscription constants ────────────────────────────────────────
export const SUB = { PRICE: 9.99, TRIAL: 14 };

// ── Chart / sector colors ─────────────────────────────────────────
export const SECTOR_COLORS = ["#2563EB","#DC2626","#EA580C","#D97706","#7C3AED","#0891B2","#059669","#9333EA"];

// ── Score label helper ────────────────────────────────────────────
export function scoreInfo(score: number) {
  if (score >= 75) return { label:"Conforme ✓",   color:T.green, bg:T.greenBg };
  if (score >= 40) return { label:"À surveiller", color:T.amber, bg:T.amberBg };
  return               { label:"Non conforme",    color:T.red,   bg:T.redBg   };
}

// ── Chart point generators ────────────────────────────────────────
export function genPts(base: number, vol: number, n: number, tr: number): ChartPoint[] {
  let p = base*(1-tr*.5); const now = Date.now();
  const pts: ChartPoint[] = Array.from({length:n}, (_,i) => {
    p *= (1+(Math.random()-.48)*vol+tr/n);
    return { t:now-(n-i)*(86400000/n)*n, v:parseFloat(p.toFixed(2)) };
  });
  pts[pts.length-1].v = base; return pts;
}
export function mkP(b:number,v:number,t:number): Record<ChartPeriod,ChartPoint[]> {
  return {"1D":genPts(b,v*.3,48,t*.02),"1S":genPts(b,v*.5,56,t*.05),"1M":genPts(b,v,60,t*.15),"1A":genPts(b,v*1.5,52,t)};
}

// ── Base Styles ───────────────────────────────────────────────────
import React from "react";
export const BS = {
  pageHeader: {padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"} as React.CSSProperties,
  pageTitle:  {fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-.5px"} as React.CSSProperties,
  input:      {flex:1,height:50,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"0 15px",fontSize:14,outline:"none",background:T.surface,color:T.text,fontFamily:"inherit",transition:"border-color .2s"} as React.CSSProperties,
  iconBtn:    {width:44,height:44,borderRadius:12,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"} as React.CSSProperties,
  btnPrimary: {width:"100%",height:50,background:T.forest,border:"none",borderRadius:13,color:"#E8F0EB",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  btnGhost:   {height:44,background:"none",border:`1px solid ${T.border}`,borderRadius:11,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer"} as React.CSSProperties,
  microBtn:   {height:28,padding:"0 10px",background:"none",border:"1px solid",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  segCtrl:    {display:"flex",background:T.surface2,borderRadius:11,padding:3} as React.CSSProperties,
  seg:        {flex:1,height:34,background:"none",border:"none",borderRadius:9,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all .15s"} as React.CSSProperties,
  segActive:  {background:T.surface,color:T.text,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"} as React.CSSProperties,
};
