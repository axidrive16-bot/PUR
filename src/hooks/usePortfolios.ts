"use client";
import { useEffect, useMemo, useState } from "react";
import { computePortfolioMetrics } from "@/domain/aaoifi";
import { useUserStore } from "@/store/usePortfolioStore";
import type { Asset, PortfolioItem } from "@/domain/types";

export interface Portfolio { id:string; name:string; holdings:PortfolioItem[]; createdAt:string; }

function defaultPortfolios(): Portfolio[] {
  return [{ id:"p1", name:"Portefeuille principal", holdings:[], createdAt:new Date().toISOString() }];
}

function readPortfolios(key: string): Portfolio[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultPortfolios();
  } catch {
    return defaultPortfolios();
  }
}

function readActiveId(key: string): string {
  try { return localStorage.getItem(key) || "p1"; }
  catch { return "p1"; }
}

export function usePortfolios(){
  const userId = useUserStore(s => s.id || "guest");
  const storageKey = `pur_portfolios:${userId}`;
  const activeKey = `pur_active_pf:${userId}`;

  const[portfolios,setPf]=useState<Portfolio[]>(()=>readPortfolios(storageKey));
  const[activeId,setActiveId]=useState<string>(()=>readActiveId(activeKey));
  const[loadedStorageKey,setLoadedStorageKey]=useState(storageKey);

  useEffect(()=>{
    setPf(readPortfolios(storageKey));
    setActiveId(readActiveId(activeKey));
    setLoadedStorageKey(storageKey);
  },[storageKey,activeKey]);

  useEffect(()=>{
    if(loadedStorageKey!==storageKey)return;
    try{localStorage.setItem(storageKey,JSON.stringify(portfolios));}catch{}
  },[portfolios,storageKey,loadedStorageKey]);

  useEffect(()=>{
    if(loadedStorageKey!==storageKey)return;
    try{localStorage.setItem(activeKey,activeId);}catch{}
  },[activeId,activeKey,storageKey,loadedStorageKey]);

  const active=portfolios.find(p=>p.id===activeId)||portfolios[0]||defaultPortfolios()[0];
  const createPf=(name:string)=>{const id="p"+Date.now();setPf(ps=>[...ps,{id,name,holdings:[],createdAt:new Date().toISOString()}]);setActiveId(id);return id;};
  const renamePf=(id:string,name:string)=>setPf(ps=>ps.map(p=>p.id===id?{...p,name}:p));
  const deletePf=(id:string)=>{setPf(ps=>{const next=ps.filter(p=>p.id!==id);if(activeId===id&&next.length)setActiveId(next[0].id);return next.length?next:defaultPortfolios();});};
  const addToActive=(asset:Asset,qty=1,targetId=active.id)=>setPf(ps=>ps.map(p=>p.id===targetId?{...p,holdings:p.holdings.find(h=>h.ticker===asset.ticker)?p.holdings:[...p.holdings,{...asset,qty,paidPrice:asset.price,_id:null}]}:p));
  const removeFromActive=(ticker:string)=>setPf(ps=>ps.map(p=>p.id===active.id?{...p,holdings:p.holdings.filter(h=>h.ticker!==ticker)}:p));
  const updateQty=(ticker:string,delta:number)=>setPf(ps=>ps.map(p=>p.id===active.id?{...p,holdings:p.holdings.map(h=>h.ticker===ticker?{...h,qty:Math.max(1,h.qty+delta)}:h)}:p));
  const inActive=(ticker:string)=>active.holdings.some(h=>h.ticker===ticker);
  const getQty=(ticker:string)=>active.holdings.find(h=>h.ticker===ticker)?.qty??0;
  const setHoldingId=(ticker:string,id:string)=>setPf(ps=>ps.map(p=>({...p,holdings:p.holdings.map(h=>h.ticker===ticker?{...h,_id:id}:h)})));
  const syncFromDB=(items:PortfolioItem[])=>setPf(ps=>ps.map(p=>p.id===active.id?{...p,holdings:items}:p));
  const metrics=useMemo(()=>computePortfolioMetrics(active.holdings),[active]);

  return{portfolios,active,activeId,setActiveId,createPf,renamePf,deletePf,addToActive,removeFromActive,updateQty,inActive,getQty,setHoldingId,syncFromDB,metrics};
}
