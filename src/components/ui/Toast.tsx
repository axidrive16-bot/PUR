"use client";
import { useState, useCallback } from "react";
import { T } from "./tokens";

export let _toast: ((m:string,t?:string)=>void) | null = null;
export const useToast = () => _toast ?? ((_m:string) => {});

export function ToastProvider({children}:{children:React.ReactNode}){
  const[ts,set]=useState<{id:number;msg:string;type:string}[]>([]);
  const add=useCallback((msg:string,type="success")=>{
    const id=Date.now();
    set(t=>[...t,{id,msg,type}]);
    setTimeout(()=>set(t=>t.filter(x=>x.id!==id)),3000);
  },[]);
  _toast=add;
  return(
    <>
      {children}
      <div style={{position:"fixed",top:52,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:394,zIndex:999,display:"flex",flexDirection:"column",gap:7,pointerEvents:"none"}}>
        {ts.map(t=>(
          <div key={t.id} role="alert" style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:12,padding:"11px 15px",display:"flex",gap:10,alignItems:"center",animation:"toastIn .3s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
            <span>{t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}
