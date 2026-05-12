"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { T } from "./tokens";

type ToastType = "success" | "error" | "info" | string;
type ToastFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastFn>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({children}:{children:React.ReactNode}){
  const[ts,set]=useState<{id:number;msg:string;type:ToastType}[]>([]);
  const add=useCallback<ToastFn>((msg,type="success")=>{
    const id=Date.now();
    set(t=>[...t,{id,msg,type}]);
    setTimeout(()=>set(t=>t.filter(x=>x.id!==id)),3000);
  },[]);
  const value = useMemo(() => add, [add]);

  return(
    <ToastContext.Provider value={value}>
      {children}
      <div style={{position:"fixed",top:52,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:394,zIndex:999,display:"flex",flexDirection:"column",gap:7,pointerEvents:"none"}}>
        {ts.map(t=>(
          <div key={t.id} role="alert" style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:12,padding:"11px 15px",display:"flex",gap:10,alignItems:"center",animation:"toastIn .3s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
            <span>{t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
