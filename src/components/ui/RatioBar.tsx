"use client";
import { useState, memo } from "react";
import { T } from "./tokens";

export const RatioBar = memo(({label,value,max,detail}:{label:string;value:number;max:number;detail:string})=>{
  const[open,setOpen]=useState(false);
  const ok=value<max, pct=Math.min((value/max)*100,100), color=ok?T.green:T.red;
  return(
    <div style={{marginBottom:13}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontFamily:"inherit"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:17,height:17,borderRadius:5,background:ok?T.greenBg:T.redBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color,fontWeight:800}}>{ok?"✓":"✕"}</div>
          <span style={{fontSize:13,color:T.textSub}}>{label}</span>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color}}>{value}%</span>
          <span style={{fontSize:11,color:T.textMuted}}>/ {max}%</span>
          <span style={{fontSize:10,color:T.textMuted}}>{open?"▲":"▼"}</span>
        </div>
      </button>
      <div style={{height:5,background:T.surface2,borderRadius:100,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:100,transition:"width .8s ease"}}/>
      </div>
      {open&&<div style={{fontSize:12,color:T.textSub,marginTop:8,padding:"10px 12px",background:T.surface2,borderRadius:8,lineHeight:1.7}}>{detail}</div>}
    </div>
  );
});
RatioBar.displayName="RatioBar";
