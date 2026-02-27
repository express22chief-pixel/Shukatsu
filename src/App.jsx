import { useState, useMemo, useCallback } from "react";

// ── 定数 ──────────────────────────────────────────────────────
const STEPS_HONSEN = ["エントリー","ES提出","WEBテスト","一次面接","二次面接","最終面接","内定"];
const STEPS_INTERN = ["エントリー","ES提出","WEBテスト","選考面接","参加確定"];
const TERMINAL = ["辞退","不合格"];
const INDUSTRIES = ["IT","商社","製造","金融","コンサル","広告","医療","食品","小売","その他"];
const TABS = ["ホーム","企業一覧","カレンダー","OB/OG","AIサポート"];
const TAB_ICONS = ["🏠","📋","📅","👥","✨"];

const C = {
  bg:"#f5f6f8", card:"#fff", border:"#e8eaed", text:"#111827",
  sub:"#6b7280", accent:"#4f46e5", intern:"#d97706",
  danger:"#ef4444", ok:"#22c55e", ai:"#7c3aed"
};

const SAMPLE = [
  {id:1,type:"honsen",company:"テクノロジー株式会社",industry:"IT",status:"最終面接",deadline:"2025-03-15",rating:5,
   es:"御社のDX推進への取り組みに強く共感しています。学生時代にWebアプリ開発で培った技術力を活かし、貴社のプロダクト開発に貢献したいと考えています。",
   motivation:"エンジニアとして事業の核心に関わりたい。裁量が大きく成長できる環境。",
   dates:[{label:"最終面接",date:"2025-03-15",time:"14:00",place:"本社会議室"}],
   memo:"代表との面談あり。逆質問を3つ準備する。"},
  {id:2,type:"honsen",company:"グローバル商事",industry:"商社",status:"二次面接",deadline:"2025-03-22",rating:4,
   es:"グローバルなビジネス展開に携わりたいという強い思いがあります。",
   motivation:"海外駐在のチャンスがある。多様な商材を扱える。",
   dates:[{label:"二次面接",date:"2025-03-22",time:"10:30",place:"オンライン"}],
   memo:"英語面接含む。TOEICスコアを確認しておく。"},
  {id:3,type:"intern",company:"スタートアップ社",industry:"IT",status:"参加確定",deadline:"",rating:4,
   es:"",motivation:"実際の開発現場を体験したい。",
   dates:[{label:"インターン開始",date:"2025-03-01",time:"09:00",place:"渋谷オフィス"}],
   memo:"2週間。開発チーム配属予定。"},
  {id:4,type:"honsen",company:"大手メーカー",industry:"製造",status:"内定",deadline:"",rating:5,
   es:"ものづくりへの情熱と、チームで課題を解決する力を発揮したい。",
   motivation:"第一志望！安定性と技術力の高さ。",
   dates:[],memo:"条件面談の日程調整中。"},
  {id:5,type:"intern",company:"コンサルA社",industry:"コンサル",status:"ES提出",deadline:"2025-02-28",rating:3,
   es:"",motivation:"コンサルの思考法を学びたい。",dates:[],memo:""},
];

const SAMPLE_OBOG = [
  {id:1,companyId:1,company:"テクノロジー株式会社",name:"田中 太郎",year:"2022年卒",department:"エンジニア",date:"2025-02-10",method:"カフェ",notes:"文化系出身でも活躍できると言っていた。面接では「なぜエンジニアか」を深堀りされるとのこと。残業は月平均20時間程度。",contact:"tanaka@example.com"},
  {id:2,companyId:2,company:"グローバル商事",name:"佐藤 花子",year:"2021年卒",department:"営業部",date:"2025-01-25",method:"オンライン",notes:"海外赴任は入社3〜5年目が多い。語学力より主体性を重視する社風。面接は穏やかだが深い質問が来る。",contact:""},
];

// ── ユーティリティ ────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const daysUntil = d => d ? Math.ceil((new Date(d)-new Date(todayStr()))/86400000) : null;
const statusColor = (status, type) => {
  if (status==="内定"||status==="参加確定") return C.ok;
  if (status==="辞退") return "#94a3b8";
  if (status==="不合格") return C.danger;
  const steps = type==="intern"?STEPS_INTERN:STEPS_HONSEN;
  const i = steps.indexOf(status), last = steps.length-1;
  return `hsl(${220-(i/Math.max(last,1))*40},65%,55%)`;
};
const nextId = arr => Math.max(0,...arr.map(e=>e.id))+1;
const exportCSV = entries => {
  const h = ["種別","企業名","業界","ステータス","締め切り","志望度","メモ"];
  const rows = entries.map(e=>[e.type==="intern"?"インターン":"本選考",e.company,e.industry,e.status,e.deadline,e.rating,`"${e.memo}"`]);
  const csv = [h,...rows].map(r=>r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download="shukatsu.csv"; a.click();
};

// ── 共通スタイル ─────────────────────────────────────────────
const inp = { width:"100%",background:"#f1f3f9",border:"1.5px solid #e8eaed",borderRadius:10,padding:"11px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit" };
const lbl = { display:"block",fontSize:12,fontWeight:700,color:C.sub,marginBottom:5,letterSpacing:".4px" };
const pill = (color) => ({ background:color+"18",color,border:`1px solid ${color}38`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,whiteSpace:"nowrap",display:"inline-block" });
const cardStyle = (extra={}) => ({ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,...extra });

function Tag({label,color}){ return <span style={pill(color)}>{label}</span>; }
function Stars({value,onChange}){
  return <div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(i=>(
    <span key={i} onClick={()=>onChange?.(i)} style={{fontSize:18,cursor:onChange?"pointer":"default",color:i<=value?"#f59e0b":"#d1d5db"}}>★</span>
  ))}</div>;
}
function DeadlineBadge({deadline}){
  if(!deadline) return null;
  const d=daysUntil(deadline);
  let color=C.sub,label=deadline;
  if(d<0){color="#94a3b8";label="期限切れ";}
  else if(d===0){color:C.danger;label="今日締切！";}
  else if(d<=3){color=C.danger;label=`あと${d}日`;}
  else if(d<=7){color:C.intern;label=`あと${d}日`;}
  return <span style={{fontSize:12,color,fontWeight:d!==null&&d<=7?700:400}}>📅 {label}</span>;
}
function StepBar({status,type}){
  const steps=type==="intern"?STEPS_INTERN:STEPS_HONSEN;
  const idx=steps.indexOf(status); if(idx<0)return null;
  const color=statusColor(status,type);
  return(
    <div style={{display:"flex",gap:3,alignItems:"center",marginTop:8}}>
      {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:99,background:i<=idx?color:"#e8eaed"}}/>)}
      <span style={{fontSize:11,color:C.sub,marginLeft:6,whiteSpace:"nowrap"}}>{idx+1}/{steps.length}</span>
    </div>
  );
}

// ── 企業追加/編集モーダル ─────────────────────────────────────
function EntryModal({entry,onClose,onSave}){
  const isNew=!entry;
  const [form,setForm]=useState(entry||{type:"honsen",company:"",industry:"IT",status:"エントリー",deadline:"",rating:3,es:"",motivation:"",memo:"",dates:[]});
  const [activeTab,setActiveTab]=useState("基本");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const stages=[...(form.type==="intern"?STEPS_INTERN:STEPS_HONSEN),...TERMINAL];
  const addDate=()=>set("dates",[...(form.dates||[]),{label:"",date:"",time:"",place:""}]);
  const updDate=(i,k,v)=>{const d=[...form.dates];d[i]={...d[i],[k]:v};set("dates",d);};
  const delDate=(i)=>set("dates",form.dates.filter((_,j)=>j!==i));
  const modalTabs=["基本","ES・メモ","日程"];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#d1d5db",borderRadius:99,margin:"0 auto 16px"}}/>
        <h2 style={{margin:"0 0 14px",fontSize:18,fontWeight:800}}>{isNew?"企業を追加":"編集"}</h2>
        {/* type toggle */}
        <div style={{display:"flex",gap:6,marginBottom:14,background:"#f1f3f9",borderRadius:12,padding:4}}>
          {[["honsen","🎯 本選考"],["intern","🌱 インターン"]].map(([v,l])=>(
            <button key={v} onClick={()=>{set("type",v);set("status","エントリー");}}
              style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",borderRadius:9,background:form.type===v?C.card:"transparent",color:form.type===v?C.text:C.sub,fontWeight:700,fontSize:14,boxShadow:form.type===v?"0 1px 4px rgba(0,0,0,.1)":"none",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
        {/* sub tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.border}`}}>
          {modalTabs.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontWeight:700,fontSize:13,color:activeTab===t?C.accent:C.sub,borderBottom:activeTab===t?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-1,fontFamily:"inherit"}}>
              {t}
            </button>
          ))}
        </div>
        {activeTab==="基本"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={lbl}>企業名 <span style={{color:C.danger}}>*</span></label><input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="例：株式会社〇〇" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>業界</label><select value={form.industry} onChange={e=>set("industry",e.target.value)} style={inp}>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
              <div><label style={lbl}>ステータス</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{stages.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label style={lbl}>締め切り日</label><input type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)} style={inp}/></div>
            <div><label style={lbl}>志望度</label><Stars value={form.rating} onChange={v=>set("rating",v)}/></div>
            <div><label style={lbl}>メモ</label><textarea value={form.memo} onChange={e=>set("memo",e.target.value)} rows={2} placeholder="自由記述..." style={{...inp,resize:"vertical"}}/></div>
          </div>
        )}
        {activeTab==="ES・メモ"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={lbl}>ES・自己PR</label><textarea value={form.es} onChange={e=>set("es",e.target.value)} rows={5} placeholder="エントリーシートの内容を保存..." style={{...inp,resize:"vertical"}}/></div>
            <div><label style={lbl}>志望動機</label><textarea value={form.motivation} onChange={e=>set("motivation",e.target.value)} rows={4} placeholder="志望動機のポイントを記録..." style={{...inp,resize:"vertical"}}/></div>
          </div>
        )}
        {activeTab==="日程"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <label style={{...lbl,marginBottom:0}}>面接・イベント日程</label>
              <button onClick={addDate} style={{fontSize:13,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>+ 追加</button>
            </div>
            {(form.dates||[]).length===0&&<div style={{color:C.sub,fontSize:13,textAlign:"center",padding:"20px 0"}}>日程が登録されていません</div>}
            {(form.dates||[]).map((d,i)=>(
              <div key={i} style={{...cardStyle(),padding:12,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <input value={d.label} onChange={e=>updDate(i,"label",e.target.value)} placeholder="ラベル（例：一次面接）" style={{...inp,flex:1,marginRight:8}}/>
                  <button onClick={()=>delDate(i)} style={{color:C.danger,background:"none",border:"none",fontSize:18,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <input type="date" value={d.date} onChange={e=>updDate(i,"date",e.target.value)} style={inp}/>
                  <input type="time" value={d.time} onChange={e=>updDate(i,"time",e.target.value)} style={inp}/>
                </div>
                <input value={d.place} onChange={e=>updDate(i,"place",e.target.value)} placeholder="場所（例：本社、オンライン）" style={inp}/>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,padding:"12px 0",background:"#f1f3f9",color:C.sub,border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
          <button onClick={()=>{if(!form.company.trim())return;onSave(form);}} style={{flex:2,padding:"12px 0",background:C.accent,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
            {isNew?"追加する":"保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ホーム ────────────────────────────────────────────────────
function HomeTab({entries,obog,setTab,setModal}){
  const td=todayStr();
  const alerts=entries.filter(e=>{const d=daysUntil(e.deadline);return d!==null&&d>=0&&d<=7&&!TERMINAL.includes(e.status);});
  const upcomingDates=entries.flatMap(e=>(e.dates||[]).filter(d=>d.date>=td).map(d=>({...d,company:e.company,type:e.type}))).sort((a,b)=>a.date.localeCompare(b.date)||a.time?.localeCompare(b.time||"")).slice(0,5);
  const stats={all:entries.length,honsen:entries.filter(e=>e.type==="honsen").length,intern:entries.filter(e=>e.type==="intern").length,offer:entries.filter(e=>e.status==="内定").length};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[["📋",`${stats.honsen}社`,`本選考`,C.accent],["🌱",`${stats.intern}社`,`インターン`,C.intern],["🎉",`${stats.offer}社`,"内定",C.ok],["📝",`${stats.all}社`,"総エントリー","#6b7280"]].map(([icon,val,name,color])=>(
          <div key={name} style={{...cardStyle({padding:"14px 16px"})}}>
            <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:24,fontWeight:800,color}}>{val}</div>
            <div style={{fontSize:12,color:C.sub}}>{name}</div>
          </div>
        ))}
      </div>
      {/* alerts */}
      {alerts.length>0&&(
        <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px"}}>
          <div style={{fontWeight:700,fontSize:13,color:"#92400e",marginBottom:6}}>⚠️ 締め切りが近い企業</div>
          {alerts.map(e=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#92400e",paddingTop:4}}>
              <span>{e.company}</span><DeadlineBadge deadline={e.deadline}/>
            </div>
          ))}
        </div>
      )}
      {/* upcoming */}
      <div style={cardStyle({padding:16})}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📅 直近の予定</span>
          <button onClick={()=>setTab(2)} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>カレンダーを見る →</button>
        </div>
        {upcomingDates.length===0
          ?<div style={{color:C.sub,fontSize:13,textAlign:"center",padding:"12px 0"}}>予定はありません</div>
          :upcomingDates.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",paddingBottom:10,borderBottom:i<upcomingDates.length-1?`1px solid ${C.border}`:"none",marginBottom:i<upcomingDates.length-1?10:0}}>
              <div style={{background:C.accent+"18",borderRadius:10,padding:"6px 10px",textAlign:"center",minWidth:48}}>
                <div style={{fontSize:11,color:C.accent,fontWeight:700}}>{d.date?.slice(5)}</div>
                <div style={{fontSize:11,color:C.sub}}>{d.time||"--:--"}</div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{d.company}</div>
                <div style={{fontSize:12,color:C.sub}}>{d.label}{d.place&&` · ${d.place}`}</div>
              </div>
            </div>
          ))
        }
      </div>
      {/* quick add */}
      <button onClick={()=>setModal("new")} style={{...cardStyle({padding:"14px 16px",border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:C.sub,fontWeight:700,fontSize:15,fontFamily:"inherit"})}>
        + 企業を追加
      </button>
    </div>
  );
}

// ── 企業一覧 ──────────────────────────────────────────────────
function ListTab({entries,setModal,onDelete}){
  const [search,setSearch]=useState("");
  const [tab,setTab]=useState("all");
  const [expandId,setExpandId]=useState(null);
  const filtered=useMemo(()=>{
    let list=entries;
    if(tab!=="all") list=list.filter(e=>e.type===tab);
    if(search){const q=search.toLowerCase();list=list.filter(e=>e.company.toLowerCase().includes(q)||e.status.includes(q)||e.industry.includes(q));}
    return list.sort((a,b)=>{if(!a.deadline&&!b.deadline)return 0;if(!a.deadline)return 1;if(!b.deadline)return -1;return a.deadline.localeCompare(b.deadline);});
  },[entries,tab,search]);
  const td=todayStr();
  return(
    <div>
      <div style={{display:"flex",gap:0,background:"#f1f3f9",borderRadius:10,padding:3,marginBottom:12}}>
        {[["all","すべて"],["honsen","本選考"],["intern","インターン"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:"7px 4px",border:"none",cursor:"pointer",borderRadius:8,background:tab===v?C.card:"transparent",color:tab===v?C.text:C.sub,fontWeight:700,fontSize:13,boxShadow:tab===v?"0 1px 4px rgba(0,0,0,.08)":"none",fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>
      <div style={{position:"relative",marginBottom:12}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.sub}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="企業名・ステータスで検索..." style={{...inp,paddingLeft:36}}/>
      </div>
      {filtered.length===0
        ?<div style={{textAlign:"center",padding:"60px 0",color:C.sub}}><div style={{fontSize:36,marginBottom:8}}>📭</div><div>該当する企業がありません</div></div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(entry=>{
            const expanded=expandId===entry.id;
            const color=statusColor(entry.status,entry.type);
            const days=daysUntil(entry.deadline);
            const urgent=days!==null&&days>=0&&days<=3&&!TERMINAL.includes(entry.status);
            return(
              <div key={entry.id} style={{...cardStyle({border:`1px solid ${urgent?"#fcd34d":C.border}`,overflow:"hidden"})}}>
                <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExpandId(expanded?null:entry.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:5}}>
                        <span style={{fontWeight:700,fontSize:16}}>{entry.company}</span>
                        <Tag label={entry.type==="intern"?"インターン":"本選考"} color={entry.type==="intern"?C.intern:C.accent}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <Tag label={entry.status} color={color}/>
                        <span style={{fontSize:12,color:C.sub}}>{entry.industry}</span>
                        {entry.deadline&&<DeadlineBadge deadline={entry.deadline}/>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8,flexShrink:0}}>
                      <Stars value={entry.rating}/>
                      <span style={{fontSize:13,color:C.sub}}>{expanded?"▲":"▼"}</span>
                    </div>
                  </div>
                  {!TERMINAL.includes(entry.status)&&<StepBar status={entry.status} type={entry.type}/>}
                </div>
                {expanded&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:"#fafbfc"}}>
                    {entry.motivation&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:3}}>志望動機</div><div style={{fontSize:14,lineHeight:1.6}}>{entry.motivation}</div></div>}
                    {entry.es&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:3}}>ES・自己PR</div><div style={{fontSize:13,lineHeight:1.6,color:C.sub,whiteSpace:"pre-wrap"}}>{entry.es.length>100?entry.es.slice(0,100)+"...":entry.es}</div></div>}
                    {entry.memo&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:3}}>メモ</div><div style={{fontSize:14,lineHeight:1.6}}>{entry.memo}</div></div>}
                    {entry.dates?.length>0&&(
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:6}}>日程</div>
                        {entry.dates.map((d,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,paddingBottom:3}}>
                            <span style={{color:C.sub}}>{d.label}</span>
                            <span style={{fontWeight:600,color:d.date>=td?C.accent:C.sub}}>{d.date} {d.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>setModal(entry)} style={{flex:1,padding:"9px 0",background:C.accent+"18",color:C.accent,border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>✏️ 編集</button>
                      <button onClick={()=>onDelete(entry.id)} style={{flex:1,padding:"9px 0",background:C.danger+"18",color:C.danger,border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>🗑 削除</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ── カレンダー ────────────────────────────────────────────────
function CalendarTab({entries}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [selected,setSelected]=useState(null);
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const pad=Array(firstDay).fill(null);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const allDates=entries.flatMap(e=>(e.dates||[]).map(d=>({...d,company:e.company,type:e.type,status:e.status})));
  const getEvents=d=>{
    const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return allDates.filter(e=>e.date===ds);
  };
  const td=todayStr();
  const todayDate=new Date();
  const monthStr=`${year}-${String(month+1).padStart(2,"0")}`;
  const monthEvents=allDates.filter(e=>e.date?.startsWith(monthStr)).sort((a,b)=>a.date.localeCompare(b.date)||a.time?.localeCompare(b.time||""));
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return(
    <div>
      {/* ナビ */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={prevMonth} style={{background:"#f1f3f9",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:16}}>‹</button>
        <span style={{fontWeight:800,fontSize:18}}>{year}年 {month+1}月</span>
        <button onClick={nextMonth} style={{background:"#f1f3f9",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:16}}>›</button>
      </div>
      {/* 曜日 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["日","月","火","水","木","金","土"].map((d,i)=>(
          <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:i===0?C.danger:i===6?"#3b82f6":C.sub,padding:"4px 0"}}>{d}</div>
        ))}
      </div>
      {/* グリッド */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
        {pad.map((_,i)=><div key={`p${i}`}/>)}
        {days.map(d=>{
          const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const events=getEvents(d);
          const isToday=ds===td;
          const isSel=selected===ds;
          const dow=(firstDay+d-1)%7;
          return(
            <div key={d} onClick={()=>setSelected(isSel?null:ds)}
              style={{minHeight:44,borderRadius:8,padding:"4px 3px",cursor:"pointer",position:"relative",
                background:isSel?C.accent+"22":isToday?C.accent+"12":"transparent",
                border:`1px solid ${isSel?C.accent:isToday?C.accent+"44":C.border}`}}>
              <div style={{fontSize:13,fontWeight:isToday?800:400,color:isToday?C.accent:dow===0?C.danger:dow===6?"#3b82f6":C.text,textAlign:"center"}}>{d}</div>
              {events.slice(0,2).map((e,i)=>(
                <div key={i} style={{fontSize:9,background:statusColor(e.status,e.type),color:"#fff",borderRadius:3,padding:"1px 3px",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label||e.company}</div>
              ))}
              {events.length>2&&<div style={{fontSize:9,color:C.sub,textAlign:"center"}}>+{events.length-2}</div>}
            </div>
          );
        })}
      </div>
      {/* 選択日の詳細 */}
      {selected&&getEvents(parseInt(selected.split("-")[2])).length>0&&(
        <div style={cardStyle({padding:14,marginBottom:14})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>{selected} の予定</div>
          {getEvents(parseInt(selected.split("-")[2])).map((e,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:i<getEvents(parseInt(selected.split("-")[2])).length-1?10:0,borderBottom:i<getEvents(parseInt(selected.split("-")[2])).length-1?`1px solid ${C.border}`:"none",marginBottom:i<getEvents(parseInt(selected.split("-")[2])).length-1?10:0}}>
              <div style={{background:C.accent+"18",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:52}}>
                <div style={{fontSize:13,fontWeight:700,color:C.accent}}>{e.time||"--:--"}</div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{e.company}</div>
                <div style={{fontSize:12,color:C.sub}}>{e.label}{e.place&&` · ${e.place}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 今月の一覧 */}
      <div style={cardStyle({padding:16})}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{month+1}月の予定一覧</div>
        {monthEvents.length===0
          ?<div style={{color:C.sub,fontSize:13,textAlign:"center",padding:"12px 0"}}>今月の予定はありません</div>
          :monthEvents.map((e,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:10,borderBottom:i<monthEvents.length-1?`1px solid ${C.border}`:"none",marginBottom:i<monthEvents.length-1?10:0}}>
              <div style={{background:C.accent+"18",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:52,flexShrink:0}}>
                <div style={{fontSize:12,color:C.accent,fontWeight:700}}>{e.date?.slice(5)}</div>
                <div style={{fontSize:11,color:C.sub}}>{e.time||"--:--"}</div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{e.company}</div>
                <div style={{fontSize:12,color:C.sub}}>{e.label}{e.place&&` · ${e.place}`}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── OB/OG ────────────────────────────────────────────────────
function ObogModal({entry,companies,onClose,onSave}){
  const isNew=!entry;
  const [form,setForm]=useState(entry||{company:"",name:"",year:"",department:"",date:"",method:"",notes:"",contact:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#d1d5db",borderRadius:99,margin:"0 auto 16px"}}/>
        <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:800}}>{isNew?"OB/OG訪問を記録":"編集"}</h2>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={lbl}>企業名</label>
            <input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="企業名" style={inp} list="company-list"/>
            <datalist id="company-list">{companies.map(c=><option key={c} value={c}/>)}</datalist>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={lbl}>お名前</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="田中 太郎" style={inp}/></div>
            <div><label style={lbl}>卒業年度</label><input value={form.year} onChange={e=>set("year",e.target.value)} placeholder="2022年卒" style={inp}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={lbl}>部署・職種</label><input value={form.department} onChange={e=>set("department",e.target.value)} placeholder="エンジニア" style={inp}/></div>
            <div><label style={lbl}>訪問日</label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp}/></div>
          </div>
          <div><label style={lbl}>訪問方法</label>
            <select value={form.method} onChange={e=>set("method",e.target.value)} style={inp}>
              {["","カフェ","オンライン","会社","その他"].map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={lbl}>聞いた内容・メモ</label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={4} placeholder="仕事内容、社風、選考アドバイスなど..." style={{...inp,resize:"vertical"}}/></div>
          <div><label style={lbl}>連絡先（任意）</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="メールアドレスなど" style={inp}/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,padding:"12px 0",background:"#f1f3f9",color:C.sub,border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
          <button onClick={()=>{if(!form.company.trim()||!form.name.trim())return;onSave(form);}} style={{flex:2,padding:"12px 0",background:"#059669",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
            {isNew?"記録する":"保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ObogTab({entries,obog,setObog}){
  const [modal,setModal]=useState(null);
  const [expandId,setExpandId]=useState(null);
  const companies=entries.map(e=>e.company);
  const save=(form)=>{
    if(modal==="new") setObog(p=>[...p,{...form,id:nextId(p)}]);
    else setObog(p=>p.map(o=>o.id===modal.id?{...form,id:o.id}:o));
    setModal(null);
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:14,color:C.sub}}>{obog.length}件の訪問記録</div>
        <button onClick={()=>setModal("new")} style={{background:"#059669",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700}}>+ 記録追加</button>
      </div>
      {obog.length===0
        ?<div style={{textAlign:"center",padding:"60px 0",color:C.sub}}><div style={{fontSize:36,marginBottom:8}}>👥</div><div>OB/OG訪問の記録がありません</div></div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {obog.map(o=>{
            const expanded=expandId===o.id;
            return(
              <div key={o.id} style={cardStyle({overflow:"hidden"})}>
                <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExpandId(expanded?null:o.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{o.name} <span style={{fontWeight:400,color:C.sub,fontSize:13}}>({o.year})</span></div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <Tag label={o.company} color="#059669"/>
                        {o.department&&<span style={{fontSize:12,color:C.sub}}>{o.department}</span>}
                        {o.date&&<span style={{fontSize:12,color:C.sub}}>📅 {o.date}</span>}
                        {o.method&&<span style={{fontSize:12,color:C.sub}}>📍 {o.method}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:13,color:C.sub,marginLeft:8,flexShrink:0}}>{expanded?"▲":"▼"}</span>
                  </div>
                </div>
                {expanded&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:"#fafbfc"}}>
                    {o.notes&&<div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:4}}>メモ・聞いた内容</div><div style={{fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{o.notes}</div></div>}
                    {o.contact&&<div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:4}}>連絡先</div><div style={{fontSize:14,color:C.accent}}>{o.contact}</div></div>}
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button onClick={()=>setModal(o)} style={{flex:1,padding:"9px 0",background:"#05996918",color:"#059669",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>✏️ 編集</button>
                      <button onClick={()=>setObog(p=>p.filter(x=>x.id!==o.id))} style={{flex:1,padding:"9px 0",background:C.danger+"18",color:C.danger,border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>🗑 削除</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      {modal&&<ObogModal entry={modal==="new"?null:modal} companies={companies} onClose={()=>setModal(null)} onSave={save}/>}
    </div>
  );
}

// ── AIサポート ────────────────────────────────────────────────
function AiTab({entries}){
  const [mode,setMode]=useState(null); // null | "es" | "interview" | "chat"
  const [selectedCompany,setSelectedCompany]=useState("");
  const [userInput,setUserInput]=useState("");
  const [messages,setMessages]=useState([]);
  const [loading,setLoading]=useState(false);
  const company=entries.find(e=>e.company===selectedCompany);
  const modes=[
    {key:"es",icon:"📝",label:"ES添削",desc:"エントリーシートの内容をAIが添削・改善提案"},
    {key:"interview",icon:"🎤",label:"面接対策",desc:"想定質問と回答例をAIが生成"},
    {key:"chat",icon:"💬",label:"就活相談",desc:"なんでも就活の悩みを相談"},
  ];
  const buildPrompt=()=>{
    const base=company?`企業:${company.company}(${company.industry}業界)\nステータス:${company.status}\n志望動機:${company.motivation||"未記入"}\nES:${company.es||"未記入"}\n\n`:"";
    if(mode==="es") return `${base}以下のESを就活のプロとして添削してください。具体的な改善点と改善案を日本語で教えてください。\n\n${userInput}`;
    if(mode==="interview") return `${base}この企業の面接で想定される質問を5つ挙げ、それぞれの回答ポイントを教えてください。`;
    return userInput;
  };
  const send=async()=>{
    if(!userInput.trim()&&mode!=="interview") return;
    const prompt=buildPrompt();
    const newMsg=[...messages,{role:"user",content:mode==="interview"?`${selectedCompany}の面接対策をしてください`:userInput}];
    setMessages(newMsg);
    setUserInput("");
    setLoading(true);
    try{
      // APIキーはサーバーサイド（/api/chat）で管理 - クライアントには公開しない
      const res=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system:"あなたは就活の専門家アドバイザーです。日本語で簡潔かつ具体的にアドバイスしてください。",
          messages:[...messages,{role:"user",content:prompt}]
        })
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"API error");
      const reply=data.content?.[0]?.text||"エラーが発生しました";
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    }catch(e){
      setMessages(p=>[...p,{role:"assistant",content:`エラーが発生しました: ${e.message}`}]);
    }
    setLoading(false);
  };
  if(!mode) return(
    <div>
      <div style={{background:"linear-gradient(135deg,#ede9fe,#ddd6fe)",borderRadius:14,padding:"16px 20px",marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:28}}>✨</span>
        <div><div style={{fontWeight:700,color:"#4c1d95"}}>AIサポート</div><div style={{fontSize:13,color:"#6d28d9"}}>就活をAIがサポートします</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {modes.map(m=>(
          <button key={m.key} onClick={()=>setMode(m.key)}
            style={{...cardStyle({padding:"16px 18px",cursor:"pointer",border:`1px solid ${C.border}`,background:C.card,textAlign:"left",display:"flex",gap:14,alignItems:"center",fontFamily:"inherit"})}}
          >
            <span style={{fontSize:28}}>{m.icon}</span>
            <div><div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{m.label}</div><div style={{fontSize:13,color:C.sub}}>{m.desc}</div></div>
            <span style={{marginLeft:"auto",color:C.sub}}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <button onClick={()=>{setMode(null);setMessages([]);setUserInput("");}} style={{background:"#f1f3f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontWeight:700,fontSize:14,color:C.sub}}>‹ 戻る</button>
        <span style={{fontWeight:700,fontSize:16}}>{modes.find(m=>m.key===mode)?.icon} {modes.find(m=>m.key===mode)?.label}</span>
      </div>
      {(mode==="es"||mode==="interview")&&(
        <div style={{marginBottom:12}}>
          <label style={lbl}>対象企業（任意）</label>
          <select value={selectedCompany} onChange={e=>setSelectedCompany(e.target.value)} style={inp}>
            <option value="">企業を選択...</option>
            {entries.map(e=><option key={e.id}>{e.company}</option>)}
          </select>
        </div>
      )}
      {/* メッセージ */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,minHeight:0}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",padding:"30px 0",color:C.sub}}>
            <div style={{fontSize:32,marginBottom:8}}>{modes.find(m=>m.key===mode)?.icon}</div>
            <div style={{fontSize:14}}>{mode==="interview"?"企業を選んで「面接対策を開始」を押してください":mode==="es"?"ESの内容を入力して送信してください":"就活について何でも聞いてください"}</div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
              background:m.role==="user"?C.accent:"#f1f3f9",color:m.role==="user"?"#fff":C.text,
              fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",justifyContent:"flex-start"}}>
            <div style={{background:"#f1f3f9",borderRadius:"14px 14px 14px 4px",padding:"12px 16px",color:C.sub,fontSize:14}}>考え中...</div>
          </div>
        )}
      </div>
      {/* 入力 */}
      <div style={{display:"flex",gap:8,flexShrink:0}}>
        {mode==="interview"
          ?<button onClick={send} disabled={loading} style={{flex:1,padding:"12px 0",background:loading?"#d1d5db":C.ai,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {loading?"生成中...":"面接対策を開始"}
          </button>
          :<>
            <textarea value={userInput} onChange={e=>setUserInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder={mode==="es"?"ESの内容を貼り付けてください...":"メッセージを入力..."}
              rows={2} style={{...inp,flex:1,resize:"none"}}/>
            <button onClick={send} disabled={loading||!userInput.trim()}
              style={{background:loading||!userInput.trim()?"#d1d5db":C.ai,color:"#fff",border:"none",borderRadius:10,padding:"0 16px",cursor:loading||!userInput.trim()?"not-allowed":"pointer",fontWeight:700,fontSize:18,flexShrink:0}}>
              ↑
            </button>
          </>
        }
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────────
export default function App(){
  const [entries,setEntries]=useState(SAMPLE);
  const [obog,setObog]=useState(SAMPLE_OBOG);
  const [tab,setTab]=useState(0);
  const [modal,setModal]=useState(null);
  const [deleteId,setDeleteId]=useState(null);
  const save=(form)=>{
    if(modal==="new") setEntries(p=>[...p,{...form,id:nextId(p)}]);
    else setEntries(p=>p.map(e=>e.id===modal.id?{...form,id:e.id}:e));
    setModal(null);
  };
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",color:C.text,maxWidth:520,margin:"0 auto",paddingBottom:80}}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}select,textarea,input{font-family:inherit;}input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{opacity:.5;}`}</style>
      {/* ヘッダー */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"14px 20px 10px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-.5px"}}>就活トラッカー</h1>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>exportCSV(entries)} style={{background:"#f1f3f9",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:13,color:C.sub,fontWeight:700}}>⬇ CSV</button>
            {tab<=1&&<button onClick={()=>setModal("new")} style={{background:C.accent,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700}}>+ 追加</button>}
          </div>
        </div>
      </div>
      {/* コンテンツ */}
      <div style={{padding:"14px 16px"}}>
        {tab===0&&<HomeTab entries={entries} obog={obog} setTab={setTab} setModal={setModal}/>}
        {tab===1&&<ListTab entries={entries} setModal={setModal} onDelete={setDeleteId}/>}
        {tab===2&&<CalendarTab entries={entries}/>}
        {tab===3&&<ObogTab entries={entries} obog={obog} setObog={setObog}/>}
        {tab===4&&<AiTab entries={entries}/>}
      </div>
      {/* ボトムナビ */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:10}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px 14px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit"}}>
            <span style={{fontSize:20}}>{TAB_ICONS[i]}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===i?C.accent:C.sub}}>{t}</span>
            {tab===i&&<div style={{position:"absolute",bottom:0,width:24,height:2,background:C.accent,borderRadius:99}}/>}
          </button>
        ))}
      </div>
      {/* モーダル */}
      {modal&&<EntryModal entry={modal==="new"?null:modal} onClose={()=>setModal(null)} onSave={save}/>}
      {/* 削除確認 */}
      {deleteId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:24}}>
          <div style={{background:C.card,borderRadius:16,padding:28,width:"100%",maxWidth:320,textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>🗑️</div>
            <div style={{fontWeight:700,marginBottom:6}}>削除しますか？</div>
            <div style={{color:C.sub,fontSize:14,marginBottom:20}}>この操作は元に戻せません</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDeleteId(null)} style={{flex:1,padding:"12px 0",background:"#f1f3f9",color:C.sub,border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
              <button onClick={()=>{setEntries(p=>p.filter(e=>e.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:"12px 0",background:C.danger,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
