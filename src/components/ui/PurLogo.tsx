"use client";
import { T } from "./tokens";

export function PurLogo({size=32,showName=true}:{size?:number;showName?:boolean}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <div style={{width:size,height:size,borderRadius:size*0.25,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none">
          <path d="M6 20V5C6 5 6 3 8 3C10 3 12 3 12 6C12 9 9 9 9 9" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 9C9 9 10.5 11.5 12 12" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M12 12L18 6" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M14.5 6H18V9.5" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {showName&&(
        <div>
          <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:size*0.59,fontWeight:800,color:T.text,letterSpacing:"-0.03em",lineHeight:1}}>PUR</div>
          <div style={{fontSize:9,color:T.textMuted,letterSpacing:"0.05em",lineHeight:1,marginTop:1}}>Invest with confidence</div>
        </div>
      )}
    </div>
  );
}
