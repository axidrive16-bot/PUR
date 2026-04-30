"use client";
import { useState, useEffect, useMemo } from "react";
import { computePortfolioMetrics } from "@/domain/aaoifi";
import type { Asset, PortfolioItem } from "@/domain/types";

export interface Portfolio { id:string; name:string; holdings:PortfolioItem[]; createdAt:string; }

const DEFAULT_PORTFOLIOS: Portfolio[] = [
  { id:"p1", name:"Portefeuille principal", holdings:[], createdAt:new Date().toISOString() },
];

export function usePortfolios(){
  const[portfolios,setPf]=useState<Portfolio[]>(()=>{
    try{const v=localStorage.getItem("pur_portfolios");return v?JSON.parse(v):DEFAULT_PORTFOLIOS;}
    catch{return DEFAULT_PORTFOLIOS;}
  });
  const[activeId,setActiveId]=useState<string>(()=>{
    try{return localStorage.getItem("pur_active_pf")||"p1";}
    catch{return "p1";}
  });
  useEffect(()=>{try{localStorage.setItem("pur_portfolios",JSON.stringify(portfolios));}catch{}},[portfolios]);
  useEffect(()=>{try{localStorage.setItem("pur_active_pf",activeId);}catch{}},[activeId]);

  const active=portfolios.find(p=>p.id===activeId)||portfolios[0];
  const createPf=(name:string)=>{const id="p"+Date.now();setPf(ps=>[...ps,{id,name,holdings:[],createdAt:new Date().toISOString()}]);setActiveId(id);};
  const renamePf=(id:string,name:string)=>setPf(ps=>ps.map(p=>p.id===id?{...p,name}:p));
  const deletePf=(id:string)=>{setPf(ps=>{const next=ps.filter(p=>p.id!==id);if(activeId===id&&next.length)setActiveId(next[0].id);return next;});};
  const addToActive=(asset:Asset,qty=1)=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:p.holdings.find(h=>h.ticker===asset.ticker)?p.holdings:[...p.holdings,{...asset,qty,paidPrice:asset.price,_id:null}]}:p));
  const removeFromActive=(ticker:string)=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:p.holdings.filter(h=>h.ticker!==ticker)}:p));
  const updateQty=(ticker:string,delta:number)=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:p.holdings.map(h=>h.ticker===ticker?{...h,qty:Math.max(1,h.qty+delta)}:h)}:p));
  const inActive=(ticker:string)=>active.holdings.some(h=>h.ticker===ticker);
  const getQty=(ticker:string)=>active.holdings.find(h=>h.ticker===ticker)?.qty??0;
  const setHoldingId=(ticker:string,id:string)=>setPf(ps=>ps.map(p=>({...p,holdings:p.holdings.map(h=>h.ticker===ticker?{...h,_id:id}:h)})));
  const syncFromDB=(items:PortfolioItem[])=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:items}:p));
  const metrics=useMemo(()=>computePortfolioMetrics(active.holdings),[active]);

  return{portfolios,active,activeId,setActiveId,createPf,renamePf,deletePf,addToActive,removeFromActive,updateQty,inActive,getQty,setHoldingId,syncFromDB,metrics};
}
