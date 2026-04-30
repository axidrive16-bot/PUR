"use client";
import { T } from "./tokens";

// ── Skeleton ──────────────────────────────────────────────────────
export function Sk({w="100%",h=14,r=7}:{w?:string|number;h?:number;r?:number}){
  return(
    <div style={{width:w,height:h,borderRadius:r,background:`linear-gradient(90deg,${T.surface2} 25%,${T.surface} 50%,${T.surface2} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
  );
}

// ── Modal bottom sheet ────────────────────────────────────────────
export const Modal=({children,onClose}:{children:React.ReactNode;onClose:()=>void})=>(
  <div role="dialog" aria-modal="true" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(6px)",animation:"fadeIn .2s ease"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.surface,width:"100%",maxWidth:430,borderRadius:"20px 20px 0 0",padding:"20px 22px 44px",maxHeight:"92vh",overflowY:"auto",animation:"sheetUp .32s cubic-bezier(.34,1.2,.64,1)"}}>
      <div style={{width:36,height:4,borderRadius:2,background:T.border,margin:"0 auto 20px"}}/>
      {children}
    </div>
  </div>
);
