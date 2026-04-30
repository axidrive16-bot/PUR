"use client";
import { useState } from "react";
import { auth } from "@/lib/auth";
import { useUserStore } from "@/store/usePortfolioStore";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { T, BS } from "@/components/ui/tokens";
import { PurLogo } from "@/components/ui/PurLogo";

function withTimeout<T>(p:Promise<T>,ms=8000):Promise<T>{
  return Promise.race([p,new Promise<never>((_,r)=>setTimeout(()=>r(new Error("timeout")),ms))]);
}

export function AuthModal({onClose}:{onClose:()=>void}){
  const[mode,setMode]=useState<"signin"|"signup">("signin");
  const[email,setEmail]=useState("");const[pw,setPw]=useState("");const[pw2,setPw2]=useState("");
  const[loading,setL]=useState(false);const[err,setErr]=useState("");
  const[showPw,setShowPw]=useState(false);const[showPw2,setShowPw2]=useState(false);
  const toast=useToast();

  const submit=async()=>{
    setErr("");if(!email||!pw){setErr("Tous les champs sont requis.");return;}
    if(mode==="signup"&&pw!==pw2){setErr("Les mots de passe ne correspondent pas.");return;}
    setL(true);
    try{
      if(mode==="signup"){
        const res=await withTimeout(fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})}));
        const json=await res.json();
        if(json.error){setErr(json.error);return;}
        const{error}=await withTimeout(auth.signIn(email,pw));
        if(error){setErr(error);return;}
      }else{
        const{error}=await withTimeout(auth.signIn(email,pw));
        if(error){
          if(error.toLowerCase().includes("invalid")||error.toLowerCase().includes("credentials")){
            setErr("Email ou mot de passe incorrect.");
          }else if(error.toLowerCase().includes("confirm")){
            setErr("Email non confirmé. Recréez votre compte.");
          }else{
            setErr(error);
          }
          return;
        }
      }
      toast("Bienvenue !");
      onClose();
    }catch(e:any){
      if(useUserStore.getState().id!=="guest"){toast("Bienvenue !");onClose();return;}
      if(e?.message==="timeout"){setErr("Délai dépassé. Vérifiez votre connexion.");}
      else{setErr("Erreur réseau. Réessayez.");}
    }finally{
      setL(false);
    }
  };

  const EyeOff=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
  const EyeOn=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const eyeStyle:React.CSSProperties={position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:4,color:T.textMuted,display:"flex",alignItems:"center"};

  return(
    <Modal onClose={onClose}>
      <div style={{marginBottom:18,textAlign:"center"}}><PurLogo size={30}/></div>
      <div style={{...BS.segCtrl,marginBottom:16}}>
        {(["signin","signup"] as const).map((id,i)=><button key={id} onClick={()=>{setMode(id);setErr("");}} style={{...BS.seg,...(mode===id?BS.segActive:{})}}>{["Se connecter","Créer un compte"][i]}</button>)}
      </div>
      {err&&<div style={{background:T.redBg,border:`1px solid ${T.red}30`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:T.red}}>{err}</div>}
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Email</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@email.com" style={{...BS.input,width:"100%",boxSizing:"border-box",marginBottom:12}}/>
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Mot de passe</label>
      <div style={{position:"relative",marginBottom:mode==="signup"?12:20}}>
        <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{...BS.input,width:"100%",boxSizing:"border-box",paddingRight:42,marginBottom:0}}/>
        <button type="button" onClick={()=>setShowPw(v=>!v)} aria-label={showPw?"Masquer":"Afficher"} style={eyeStyle}>{showPw?<EyeOff/>:<EyeOn/>}</button>
      </div>
      {mode==="signup"&&<>
        <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Confirmer</label>
        <div style={{position:"relative",marginBottom:20}}>
          <input type={showPw2?"text":"password"} value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...BS.input,width:"100%",boxSizing:"border-box",paddingRight:42,marginBottom:0}}/>
          <button type="button" onClick={()=>setShowPw2(v=>!v)} aria-label={showPw2?"Masquer":"Afficher"} style={eyeStyle}>{showPw2?<EyeOff/>:<EyeOn/>}</button>
        </div>
      </>}
      <button style={{...BS.btnPrimary,opacity:loading?.7:1}} onClick={submit} disabled={loading}>{loading?"Chargement…":mode==="signin"?"Se connecter":"Créer mon compte"}</button>
    </Modal>
  );
}
