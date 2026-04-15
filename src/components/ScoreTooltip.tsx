"use client";
import { useState } from "react";

const INFOS: Record<string,{title:string;desc:string}> = {
  score:  {title:"Score de conformité",  desc:"Mesure le respect des critères sur 3 ratios : dette (max 33%), revenus sensibles (max 5%), liquidités (max 33%). Score ≥ 75 = Conforme."},
  esg:    {title:"Score ESG",            desc:"Environnement, Social, Gouvernance. Mesure la responsabilité de l'entreprise vis-à-vis de la planète, de ses employés et de sa gouvernance."},
  divers: {title:"Diversification",      desc:"Répartition de vos actifs entre secteurs et entreprises. Un portefeuille diversifié réduit le risque lié à une seule entreprise."},
  risque: {title:"Score de sécurité",    desc:"Basé sur la volatilité (beta) de chaque actif. Plus il est élevé, plus votre portefeuille est stable face aux variations de marché."},
};

export function InfoTooltip({id}:{id:string}){
  const[show,setShow]=useState(false);
  const info=INFOS[id];if(!info)return null;
  return(
    <div style={{position:"relative",display:"inline-flex"}}>
      <button
        onClick={e=>{e.stopPropagation();setShow(s=>!s);}}
        onBlur={()=>setTimeout(()=>setShow(false),150)}
        style={{width:15,height:15,borderRadius:8,background:"rgba(0,0,0,0.07)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#A8A49C",fontWeight:700,flexShrink:0,lineHeight:1}}
        aria-label={`Info : ${info.title}`}
      >ℹ</button>
      {show&&(
        <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",width:190,background:"#FFFFFF",border:"1px solid rgba(0,0,0,0.09)",borderRadius:12,padding:"11px 13px",zIndex:100,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1A1A16",marginBottom:4}}>{info.title}</div>
          <div style={{fontSize:10,color:"#6B6960",lineHeight:1.65}}>{info.desc}</div>
        </div>
      )}
    </div>
  );
}
