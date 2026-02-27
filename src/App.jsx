import { useState, useMemo, useEffect } from "react";

const STEPS_HONSEN = ["エントリー","ES提出","WEBテスト","一次面接","二次面接","最終面接","内定"];
const STEPS_INTERN = ["エントリー","ES提出","WEBテスト","選考面接","参加確定"];
const TERMINAL = ["辞退","不合格"];
const INDUSTRIES = ["IT","商社","製造","金融","コンサル","広告","医療","食品","小売","その他"];
const TABS = ["ホーム","企業","カレンダー","OB/OG"];
const TAB_ICONS = ["home","list","calendar","people"];

const STORAGE_KEY = "shukatsu_v2";
const OBOG_KEY = "shukatsu_obog_v2";

const SAMPLE = [
  {id:1,type:"honsen",company:"テクノロジー株式会社",industry:"IT",status:"最終面接",deadline:"2025-03-15",rating:5,es:"御社のDX推進への取り組みに強く共感しています。",motivation:"エンジニアとして事業の核心に関わりたい。",dates:[{label:"最終面接",date:"2025-03-15",time:"14:00",place:"本社会議室"}],memo:"代表との面談あり。逆質問を3つ準備する。"},
  {id:2,type:"honsen",company:"グローバル商事",industry:"商社",status:"二次面接",deadline:"2025-03-22",rating:4,es:"",motivation:"海外駐在のチャンスがある。",dates:[{label:"二次面接",date:"2025-03-22",time:"10:30",place:"オンライン"}],memo:"英語面接含む。"},
  {id:3,type:"intern",company:"スタートアップ社",industry:"IT",status:"参加確定",deadline:"",rating:4,es:"",motivation:"実際の開発現場を体験したい。",dates:[{label:"開始日",date:"2025-03-01",time:"09:00",place:"渋谷オフィス"}],memo:"2週間インターン。"},
  {id:4,type:"honsen",company:"大手メーカー",industry:"製造",status:"内定",deadline:"",rating:5,es:"",motivation:"第一志望！",dates:[],memo:"条件面談の日程調整中。"},
  {id:5,type:"intern",company:"コンサルA社",industry:"コンサル",status:"ES提出",deadline:"2025-02-28",rating:3,es:"",motivation:"",dates:[],memo:""},
];
const SAMPLE_OBOG = [
  {id:1,company:"テクノロジー株式会社",name:"田中 太郎",year:"2022年卒",department:"エンジニア",date:"2025-02-10",method:"カフェ",notes:"面接では「なぜエンジニアか」を深掘りされる。残業は月20時間程度。",contact:""},
];

const todayStr = () => new Date().toISOString().split("T")[0];
const daysUntil = d => d ? Math.ceil((new Date(d)-new Date(todayStr()))/86400000) : null;
const nextId = arr => arr.length===0?1:Math.max(...arr.map(e=>e.id))+1;

const statusColor = (status,type) => {
  if(status==="内定"||status==="参加確定") return "#16a34a";
  if(status==="辞退") return "#9ca3af";
  if(status==="不合格") return "#dc2626";
  const steps=type==="intern"?STEPS_INTERN:STEPS_HONSEN;
  const i=steps.indexOf(status),last=steps.length-1;
  return "hsl("+(220-(i/Math.max(last,1))*30)+",60%,52%)";
};

const exportCSV = entries => {
  const h=["種別","企業名","業界","ステータス","締め切り","志望度","メモ"];
  const rows=entries.map(e=>[e.type==="intern"?"インターン":"本選考",e.company,e.industry,e.status,e.deadline,e.rating,'"'+e.memo+'"']);
  const csv=[h,...rows].map(r=>r.join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download="shukatsu.csv";a.click();
};

// ── 共通 ─────────────────────────────────────────────────────
const inp = {width:"100%",background:"#f9fafb",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 13px",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const lbl = {display:"block",fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:5};

function StatusDot({status,type}){
  const color=statusColor(status,type);
  return <span style={{display:"inline-block",width:8,height:8,borderRadius:99,background:color,marginRight:5,flexShrink:0}}/>;
}

function Stars({value,onChange}){
  return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=>(
    <span key={i} onClick={()=>onChange&&onChange(i)} style={{fontSize:14,cursor:onChange?"pointer":"default",color:i<=value?"#f59e0b":"#d1d5db"}}>{"\u2605"}</span>
  ))}</div>;
}

function DeadlineLabel({deadline}){
  if(!deadline) return null;
  const d=daysUntil(deadline);
  let color="#9ca3af",text=deadline.slice(5).replace("-","/");
  if(d===null) return null;
  if(d<0){color="#d1d5db";text="期限切れ";}
  else if(d===0){color="#dc2626";text="今日締切";}
  else if(d<=3){color="#dc2626";text="あと"+d+"日";}
  else if(d<=7){color="#d97706";text="あと"+d+"日";}
  return <span style={{fontSize:11,color,fontWeight:d<=7?700:400}}>{text}</span>;
}

function ProgressDots({status,type}){
  const steps=type==="intern"?STEPS_INTERN:STEPS_HONSEN;
  const idx=steps.indexOf(status);
  if(idx<0) return null;
  const color=statusColor(status,type);
  return(
    <div style={{display:"flex",gap:3,marginTop:8,alignItems:"center"}}>
      {steps.map((_,i)=>(
        <div key={i} style={{height:3,flex:1,borderRadius:99,background:i<=idx?color:"#e5e7eb",transition:"background .2s"}}/>
      ))}
      <span style={{fontSize:10,color:"#9ca3af",marginLeft:4,whiteSpace:"nowrap"}}>{idx+1}/{steps.length}</span>
    </div>
  );
}

// ── 企業追加/編集モーダル ─────────────────────────────────────
function Modal({entry,onClose,onSave}){
  const isNew=!entry;
  const [form,setForm]=useState(entry||{type:"honsen",company:"",industry:"IT",status:"エントリー",deadline:"",rating:3,es:"",motivation:"",memo:"",dates:[]});
  const [mtab,setMtab]=useState("基本");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const stages=[...(form.type==="intern"?STEPS_INTERN:STEPS_HONSEN),...TERMINAL];
  const addDate=()=>set("dates",[...(form.dates||[]),{label:"",date:"",time:"",place:""}]);
  const upd=(i,k,v)=>{const d=[...form.dates];d[i]={...d[i],[k]:v};set("dates",d);};
  const del=(i)=>set("dates",form.dates.filter((_,j)=>j!==i));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#e5e7eb",borderRadius:99,margin:"0 auto 18px"}}/>
        <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#111827"}}>{isNew?"企業を追加":"編集"}</h2>
        <div style={{display:"flex",gap:6,marginBottom:16,background:"#f3f4f6",borderRadius:8,padding:3}}>
          {[["honsen","本選考"],["intern","インターン"]].map(([v,l])=>(
            <button key={v} onClick={()=>{set("type",v);set("status","エントリー");}}
              style={{flex:1,padding:"8px 0",border:"none",cursor:"pointer",borderRadius:6,background:form.type===v?"#fff":"transparent",color:form.type===v?"#111827":"#6b7280",fontWeight:600,fontSize:13,fontFamily:"inherit",boxShadow:form.type===v?"0 1px 3px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #e5e7eb",marginBottom:16}}>
          {["基本","ES・メモ","日程"].map(t=>(
            <button key={t} onClick={()=>setMtab(t)} style={{padding:"7px 12px",border:"none",background:"none",cursor:"pointer",fontWeight:600,fontSize:12,color:mtab===t?"#4f46e5":"#6b7280",borderBottom:mtab===t?"2px solid #4f46e5":"2px solid transparent",marginBottom:-1,fontFamily:"inherit"}}>
              {t}
            </button>
          ))}
        </div>
        {mtab==="基本"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={lbl}>{"企業名"}</label><input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="例：株式会社〇〇" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>業界</label><select value={form.industry} onChange={e=>set("industry",e.target.value)} style={inp}>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
              <div><label style={lbl}>ステータス</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{stages.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label style={lbl}>締め切り日</label><input type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)} style={inp}/></div>
            <div><label style={lbl}>志望度</label><Stars value={form.rating} onChange={v=>set("rating",v)}/></div>
            <div><label style={lbl}>メモ</label><textarea value={form.memo} onChange={e=>set("memo",e.target.value)} rows={2} placeholder="自由記述..." style={{...inp,resize:"vertical"}}/></div>
          </div>
        )}
        {mtab==="ES・メモ"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={lbl}>ES・自己PR</label><textarea value={form.es} onChange={e=>set("es",e.target.value)} rows={5} placeholder="エントリーシートの内容..." style={{...inp,resize:"vertical"}}/></div>
            <div><label style={lbl}>志望動機</label><textarea value={form.motivation} onChange={e=>set("motivation",e.target.value)} rows={4} placeholder="志望動機のポイント..." style={{...inp,resize:"vertical"}}/></div>
          </div>
        )}
        {mtab==="日程"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <label style={{...lbl,marginBottom:0}}>日程</label>
              <button onClick={addDate} style={{fontSize:12,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{"+ 追加"}</button>
            </div>
            {(form.dates||[]).length===0&&<p style={{color:"#9ca3af",fontSize:13,textAlign:"center",padding:"16px 0"}}>日程なし</p>}
            {(form.dates||[]).map((d,i)=>(
              <div key={i} style={{background:"#f9fafb",borderRadius:8,padding:12,marginBottom:8,border:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={d.label} onChange={e=>upd(i,"label",e.target.value)} placeholder="ラベル（例：一次面接）" style={{...inp,flex:1}}/>
                  <button onClick={()=>del(i)} style={{color:"#ef4444",background:"none",border:"none",fontSize:18,cursor:"pointer",padding:"0 4px"}}>{"×"}</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <input type="date" value={d.date} onChange={e=>upd(i,"date",e.target.value)} style={inp}/>
                  <input type="time" value={d.time} onChange={e=>upd(i,"time",e.target.value)} style={inp}/>
                </div>
                <input value={d.place} onChange={e=>upd(i,"place",e.target.value)} placeholder="場所（例：本社、オンライン）" style={inp}/>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,padding:"12px 0",background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:8,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
          <button onClick={()=>{if(!form.company.trim())return;onSave(form);}} style={{flex:2,padding:"12px 0",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            {isNew?"追加する":"保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ホーム ────────────────────────────────────────────────────
function HomeTab({entries,setTab,setModal}){
  const td=todayStr();
  const alerts=entries.filter(e=>{const d=daysUntil(e.deadline);return d!==null&&d>=0&&d<=7&&!TERMINAL.includes(e.status);});
  const upcoming=entries.flatMap(e=>(e.dates||[]).filter(d=>d.date>=td).map(d=>({...d,company:e.company}))).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||"")).slice(0,4);
  const s={h:entries.filter(e=>e.type==="honsen").length,i:entries.filter(e=>e.type==="intern").length,o:entries.filter(e=>e.status==="内定").length};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[["本選考",s.h,"#4f46e5"],["インターン",s.i,"#d97706"],["内定",s.o,"#16a34a"]].map(([name,val,color])=>(
          <div key={name} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color}}>{val}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{name}</div>
          </div>
        ))}
      </div>

      {alerts.length>0&&(
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 14px"}}>
          <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#92400e"}}>{"締め切り間近"}</p>
          {alerts.map(e=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#78350f",paddingTop:3}}>
              <span>{e.company}</span><DeadlineLabel deadline={e.deadline}/>
            </div>
          ))}
        </div>
      )}

      {s.o>0&&(
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:18}}>{"🎉"}</span>
          <span style={{fontSize:14,fontWeight:600,color:"#15803d"}}>{"内定 "+s.o+"社獲得中！"}</span>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{margin:0,fontSize:12,fontWeight:600,color:"#6b7280"}}>{"直近の予定"}</p>
          <button onClick={()=>setTab(2)} style={{fontSize:12,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{"カレンダー →"}</button>
        </div>
        {upcoming.length===0
          ?<p style={{margin:0,color:"#9ca3af",fontSize:13,textAlign:"center",padding:"12px 0"}}>{"予定はありません"}</p>
          :upcoming.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",paddingBottom:i<upcoming.length-1?10:0,borderBottom:i<upcoming.length-1?"1px solid #f3f4f6":"none",marginBottom:i<upcoming.length-1?10:0}}>
              <div style={{background:"#eef2ff",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:44,flexShrink:0}}>
                <div style={{fontSize:11,color:"#4f46e5",fontWeight:700}}>{(d.date||"").slice(5).replace("-","/")}</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>{d.time||"--:--"}</div>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:"#111827"}}>{d.company}</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{d.label}{d.place?" · "+d.place:""}</div>
              </div>
            </div>
          ))
        }
      </div>

      <button onClick={()=>setModal("new")} style={{background:"#fff",border:"1.5px dashed #d1d5db",borderRadius:10,padding:"14px 0",cursor:"pointer",color:"#9ca3af",fontWeight:600,fontSize:14,fontFamily:"inherit"}}>
        {"+ 企業を追加"}
      </button>
    </div>
  );
}

// ── 企業一覧 ──────────────────────────────────────────────────
function ListTab({entries,setModal,onDelete}){
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [expandId,setExpandId]=useState(null);
  const td=todayStr();
  const list=useMemo(()=>{
    let l=filter==="all"?entries:entries.filter(e=>e.type===filter);
    if(search){const q=search.toLowerCase();l=l.filter(e=>e.company.toLowerCase().includes(q)||e.status.includes(q)||e.industry.includes(q));}
    return l.sort((a,b)=>{if(!a.deadline&&!b.deadline)return 0;if(!a.deadline)return 1;if(!b.deadline)return -1;return a.deadline.localeCompare(b.deadline);});
  },[entries,filter,search]);
  return(
    <div>
      <div style={{display:"flex",gap:0,background:"#f3f4f6",borderRadius:8,padding:3,marginBottom:12}}>
        {[["all","すべて"],["honsen","本選考"],["intern","インターン"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{flex:1,padding:"7px 0",border:"none",cursor:"pointer",borderRadius:6,background:filter===v?"#fff":"transparent",color:filter===v?"#111827":"#6b7280",fontWeight:600,fontSize:12,fontFamily:"inherit",boxShadow:filter===v?"0 1px 3px rgba(0,0,0,.06)":"none",transition:"all .15s"}}>
            {l}
          </button>
        ))}
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{...inp,marginBottom:12}}/>
      {list.length===0
        ?<div style={{textAlign:"center",padding:"48px 0",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:8}}>{"📭"}</div><div style={{fontSize:13}}>{"該当なし"}</div></div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {list.map(entry=>{
            const expanded=expandId===entry.id;
            const color=statusColor(entry.status,entry.type);
            return(
              <div key={entry.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"12px 14px",cursor:"pointer"}} onClick={()=>setExpandId(expanded?null:entry.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14,color:"#111827"}}>{entry.company}</span>
                        <span style={{fontSize:10,background:entry.type==="intern"?"#fef3c7":"#eef2ff",color:entry.type==="intern"?"#d97706":"#4f46e5",borderRadius:4,padding:"1px 6px",fontWeight:600}}>{entry.type==="intern"?"インターン":"本選考"}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <div style={{display:"flex",alignItems:"center"}}><StatusDot status={entry.status} type={entry.type}/><span style={{fontSize:12,color:"#374151"}}>{entry.status}</span></div>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{entry.industry}</span>
                        <DeadlineLabel deadline={entry.deadline}/>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8,flexShrink:0}}>
                      <Stars value={entry.rating}/>
                      <span style={{fontSize:11,color:"#9ca3af"}}>{expanded?"▲":"▼"}</span>
                    </div>
                  </div>
                  {!TERMINAL.includes(entry.status)&&<ProgressDots status={entry.status} type={entry.type}/>}
                </div>
                {expanded&&(
                  <div style={{borderTop:"1px solid #f3f4f6",padding:"12px 14px",background:"#fafafa"}}>
                    {entry.motivation&&<div style={{marginBottom:8}}><p style={{margin:"0 0 3px",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{"志望動機"}</p><p style={{margin:0,fontSize:13,lineHeight:1.6,color:"#374151"}}>{entry.motivation}</p></div>}
                    {entry.memo&&<div style={{marginBottom:8}}><p style={{margin:"0 0 3px",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{"メモ"}</p><p style={{margin:0,fontSize:13,lineHeight:1.6,color:"#374151"}}>{entry.memo}</p></div>}
                    {(entry.dates||[]).length>0&&(
                      <div style={{marginBottom:8}}>
                        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{"日程"}</p>
                        {entry.dates.map((d,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,paddingBottom:2}}>
                            <span style={{color:"#6b7280"}}>{d.label}</span>
                            <span style={{fontWeight:600,color:d.date>=td?"#4f46e5":"#9ca3af"}}>{d.date} {d.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button onClick={()=>setModal(entry)} style={{flex:1,padding:"8px 0",background:"#eef2ff",color:"#4f46e5",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>{"編集"}</button>
                      <button onClick={()=>onDelete(entry.id)} style={{flex:1,padding:"8px 0",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>{"削除"}</button>
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
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const allDates=entries.flatMap(e=>(e.dates||[]).map(d=>({...d,company:e.company,status:e.status,type:e.type})));
  const getEvents=d=>{const ds=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");return allDates.filter(e=>e.date===ds);};
  const td=todayStr();
  const monthStr=year+"-"+String(month+1).padStart(2,"0");
  const monthEvents=allDates.filter(e=>e.date&&e.date.startsWith(monthStr)).sort((a,b)=>a.date.localeCompare(b.date));
  const prev=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const next=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={prev} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:15,color:"#374151"}}>{"‹"}</button>
        <span style={{fontWeight:700,fontSize:15,color:"#111827"}}>{year+"年 "+(month+1)+"月"}</span>
        <button onClick={next} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:15,color:"#374151"}}>{"›"}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:2}}>
        {["日","月","火","水","木","金","土"].map((d,i)=>(
          <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:i===0?"#dc2626":i===6?"#2563eb":"#9ca3af",padding:"4px 0"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
        {Array(firstDay).fill(null).map((_,i)=><div key={"p"+i}/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const ds=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
          const events=getEvents(d);
          const isToday=ds===td;
          const dow=(firstDay+d-1)%7;
          return(
            <div key={d} style={{minHeight:36,borderRadius:6,padding:"3px 2px",background:isToday?"#eef2ff":"#fff",border:"1px solid "+(isToday?"#c7d2fe":"#f3f4f6")}}>
              <div style={{fontSize:11,fontWeight:isToday?700:400,color:isToday?"#4f46e5":dow===0?"#dc2626":dow===6?"#2563eb":"#374151",textAlign:"center"}}>{d}</div>
              {events.slice(0,1).map((e,i)=>(
                <div key={i} style={{fontSize:8,background:statusColor(e.status,e.type),color:"#fff",borderRadius:2,padding:"1px 2px",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label||e.company}</div>
              ))}
              {events.length>1&&<div style={{fontSize:8,color:"#9ca3af",textAlign:"center"}}>{"+"+(events.length-1)}</div>}
            </div>
          );
        })}
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:600,color:"#6b7280"}}>{(month+1)+"月の予定"}</p>
        {monthEvents.length===0
          ?<p style={{margin:0,color:"#9ca3af",fontSize:13,textAlign:"center",padding:"10px 0"}}>{"予定はありません"}</p>
          :monthEvents.map((e,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:i<monthEvents.length-1?10:0,borderBottom:i<monthEvents.length-1?"1px solid #f3f4f6":"none",marginBottom:i<monthEvents.length-1?10:0}}>
              <div style={{background:"#eef2ff",borderRadius:6,padding:"5px 8px",textAlign:"center",minWidth:40,flexShrink:0}}>
                <div style={{fontSize:11,color:"#4f46e5",fontWeight:700}}>{(e.date||"").slice(5).replace("-","/")}</div>
                <div style={{fontSize:9,color:"#9ca3af"}}>{e.time||"--:--"}</div>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:"#111827"}}>{e.company}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{e.label}{e.place?" · "+e.place:""}</div>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#e5e7eb",borderRadius:99,margin:"0 auto 16px"}}/>
        <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#111827"}}>{isNew?"OB/OG訪問を記録":"編集"}</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={lbl}>企業名</label><input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="企業名" style={inp} list="co-list"/><datalist id="co-list">{companies.map(c=><option key={c} value={c}/>)}</datalist></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={lbl}>お名前</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="田中 太郎" style={inp}/></div>
            <div><label style={lbl}>卒業年度</label><input value={form.year} onChange={e=>set("year",e.target.value)} placeholder="2022年卒" style={inp}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={lbl}>部署・職種</label><input value={form.department} onChange={e=>set("department",e.target.value)} placeholder="エンジニア" style={inp}/></div>
            <div><label style={lbl}>訪問日</label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp}/></div>
          </div>
          <div><label style={lbl}>訪問方法</label><select value={form.method} onChange={e=>set("method",e.target.value)} style={inp}>{["","カフェ","オンライン","会社","その他"].map(m=><option key={m}>{m}</option>)}</select></div>
          <div><label style={lbl}>メモ</label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={4} placeholder="仕事内容、社風、選考アドバイスなど..." style={{...inp,resize:"vertical"}}/></div>
          <div><label style={lbl}>連絡先（任意）</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="メールアドレスなど" style={inp}/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:18}}>
          <button onClick={onClose} style={{flex:1,padding:"12px 0",background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:8,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
          <button onClick={()=>{if(!form.company.trim()||!form.name.trim())return;onSave(form);}} style={{flex:2,padding:"12px 0",background:"#16a34a",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
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
    setObog(p=>{const n=modal==="new"?[...p,{...form,id:nextId(p)}]:p.map(o=>o.id===modal.id?{...form,id:o.id}:o);localStorage.setItem(OBOG_KEY,JSON.stringify(n));return n;});
    setModal(null);
  };
  const del=(id)=>setObog(p=>{const n=p.filter(o=>o.id!==id);localStorage.setItem(OBOG_KEY,JSON.stringify(n));return n;});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:12,color:"#9ca3af"}}>{obog.length+"件"}</span>
        <button onClick={()=>setModal("new")} style={{background:"#16a34a",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:12,color:"#fff",fontWeight:600}}>{"+ 追加"}</button>
      </div>
      {obog.length===0
        ?<div style={{textAlign:"center",padding:"48px 0",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:8}}>{"👥"}</div><div style={{fontSize:13}}>{"記録がありません"}</div></div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {obog.map(o=>{
            const expanded=expandId===o.id;
            return(
              <div key={o.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"12px 14px",cursor:"pointer"}} onClick={()=>setExpandId(expanded?null:o.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <p style={{margin:"0 0 4px",fontWeight:700,fontSize:14,color:"#111827"}}>{o.name} <span style={{fontWeight:400,color:"#9ca3af",fontSize:12}}>{"("+o.year+")"}</span></p>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:11,background:"#f0fdf4",color:"#16a34a",borderRadius:4,padding:"1px 6px",fontWeight:600}}>{o.company}</span>
                        {o.department&&<span style={{fontSize:11,color:"#9ca3af"}}>{o.department}</span>}
                        {o.date&&<span style={{fontSize:11,color:"#9ca3af"}}>{o.date}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:11,color:"#9ca3af"}}>{expanded?"▲":"▼"}</span>
                  </div>
                </div>
                {expanded&&(
                  <div style={{borderTop:"1px solid #f3f4f6",padding:"12px 14px",background:"#fafafa"}}>
                    {o.notes&&<div style={{marginBottom:8}}><p style={{margin:"0 0 3px",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{"メモ"}</p><p style={{margin:0,fontSize:13,lineHeight:1.7,color:"#374151",whiteSpace:"pre-wrap"}}>{o.notes}</p></div>}
                    {o.contact&&<div style={{marginBottom:8}}><p style={{margin:"0 0 3px",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{"連絡先"}</p><p style={{margin:0,fontSize:13,color:"#4f46e5"}}>{o.contact}</p></div>}
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button onClick={()=>setModal(o)} style={{flex:1,padding:"8px 0",background:"#eef2ff",color:"#4f46e5",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>{"編集"}</button>
                      <button onClick={()=>del(o.id)} style={{flex:1,padding:"8px 0",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>{"削除"}</button>
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

// ── アイコン ─────────────────────────────────────────────────
function Icon({name,active}){
  const color=active?"#4f46e5":"#9ca3af";
  const s={width:20,height:20,display:"block"};
  if(name==="home") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if(name==="list") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
  if(name==="calendar") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if(name==="people") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  return null;
}

// ── メインアプリ ──────────────────────────────────────────────
export default function App(){
  const [entries,setEntries]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY);return s?JSON.parse(s):SAMPLE;}catch{return SAMPLE;}});
  const [obog,setObog]=useState(()=>{try{const s=localStorage.getItem(OBOG_KEY);return s?JSON.parse(s):SAMPLE_OBOG;}catch{return SAMPLE_OBOG;}});
  const [tab,setTab]=useState(0);
  const [modal,setModal]=useState(null);
  const [deleteId,setDeleteId]=useState(null);

  useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));},[entries]);

  const save=(form)=>{
    if(modal==="new") setEntries(p=>[...p,{...form,id:nextId(p)}]);
    else setEntries(p=>p.map(e=>e.id===modal.id?{...form,id:e.id}:e));
    setModal(null);
  };

  return(
    <div style={{background:"#f9fafb",minHeight:"100vh",fontFamily:"-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif",color:"#111827",maxWidth:520,margin:"0 auto",paddingBottom:80}}>
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}select,textarea,input{font-family:inherit;}"}</style>
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"14px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h1 style={{margin:0,fontSize:17,fontWeight:700,color:"#111827",letterSpacing:"-.3px"}}>{"就活トラッカー"}</h1>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>exportCSV(entries)} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,color:"#6b7280",fontWeight:600}}>{"CSV"}</button>
            {tab<=1&&<button onClick={()=>setModal("new")} style={{background:"#4f46e5",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}}>{"+ 追加"}</button>}
          </div>
        </div>
      </div>

      <div style={{padding:"16px 16px 0"}}>
        {tab===0&&<HomeTab entries={entries} setTab={setTab} setModal={setModal}/>}
        {tab===1&&<ListTab entries={entries} setModal={setModal} onDelete={setDeleteId}/>}
        {tab===2&&<CalendarTab entries={entries}/>}
        {tab===3&&<ObogTab entries={entries} obog={obog} setObog={setObog}/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"#fff",borderTop:"1px solid #e5e7eb",display:"flex",zIndex:10,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px 12px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit"}}>
            <Icon name={TAB_ICONS[i]} active={tab===i}/>
            <span style={{fontSize:9,fontWeight:600,color:tab===i?"#4f46e5":"#9ca3af",letterSpacing:".3px"}}>{t}</span>
          </button>
        ))}
      </div>

      {modal&&<Modal entry={modal==="new"?null:modal} onClose={()=>setModal(null)} onSave={save}/>}

      {deleteId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:24}}>
          <div style={{background:"#fff",borderRadius:12,padding:24,width:"100%",maxWidth:280,textAlign:"center"}}>
            <p style={{margin:"0 0 4px",fontWeight:700,fontSize:15,color:"#111827"}}>{"削除しますか？"}</p>
            <p style={{margin:"0 0 18px",fontSize:13,color:"#9ca3af"}}>{"この操作は元に戻せません"}</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setDeleteId(null)} style={{flex:1,padding:"10px 0",background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:8,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{"キャンセル"}</button>
              <button onClick={()=>{setEntries(p=>p.filter(e=>e.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:"10px 0",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{"削除"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
