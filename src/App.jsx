import { useState, useMemo, useEffect } from "react";

const DEFAULT_STEPS_HONSEN = ["エントリー","ES提出","WEBテスト","一次面接","二次面接","最終面接","内定"];
const DEFAULT_STEPS_INTERN = ["エントリー","ES提出","WEBテスト","選考面接","参加確定"];
const TERMINAL = ["辞退","不合格"];
const INDUSTRIES_KEY = "shukatsu_industries";
const DEFAULT_INDUSTRIES = ["IT","商社","製造","金融","コンサル","広告","医療","食品","小売","その他"];
const loadIndustries = () => { try { const s = localStorage.getItem(INDUSTRIES_KEY); return s ? JSON.parse(s) : DEFAULT_INDUSTRIES; } catch { return DEFAULT_INDUSTRIES; } };
const TABS = ["ホーム","企業","カレンダー","OB/OG","設定"];
const TAB_ICONS = ["home","list","calendar","people","settings"];
const STORAGE_KEY = "shukatsu_v3";
const OBOG_KEY = "shukatsu_obog_v3";

const TUTORIAL_KEY = "shukatsu_tutorial_done";

const todayStr = () => new Date().toISOString().split("T")[0];
const daysUntil = d => d ? Math.ceil((new Date(d) - new Date(todayStr())) / 86400000) : null;
const nextId = arr => arr.length === 0 ? 1 : Math.max(...arr.map(e => e.id)) + 1;
const getSteps = entry => entry.customSteps || (entry.type === "intern" ? DEFAULT_STEPS_INTERN : DEFAULT_STEPS_HONSEN);

const statusColor = (status, steps) => {
  if (status === "内定" || status === "参加確定") return "#16a34a";
  if (status === "辞退") return "#9ca3af";
  if (status === "不合格") return "#dc2626";
  const i = steps.indexOf(status), last = steps.length - 1;
  return "hsl(" + (220 - (i / Math.max(last, 1)) * 30) + ",60%,52%)";
};

const exportCSV = entries => {
  const h = ["種別","企業名","業界","ステータス","締め切り","志望度","メモ"];
  const rows = entries.map(e => [e.type === "intern" ? "インターン" : "本選考", e.company, e.industry, e.status, e.deadline, e.rating, '"' + e.memo + '"']);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + [h, ...rows].map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" }));
  a.download = "shukatsu.csv"; a.click();
};

// ── スタイル ─────────────────────────────────────────────────
const inp = { width: "100%", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 13px", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5 };
const ACCENT = "#4f46e5";

function StatusDot({ status, steps }) {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: statusColor(status, steps), marginRight: 5, flexShrink: 0 }} />;
}

function RatingPicker({ value, onChange }) {
  const labels = ["", "低", "やや低", "普通", "高", "最高"];
  const colors = ["", "#9ca3af", "#6b7280", "#d97706", "#2563eb", "#16a34a"];
  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i)}
            style={{ flex: 1, padding: "10px 0", border: "2px solid " + (value === i ? colors[i] : "#e5e7eb"), borderRadius: 8, background: value === i ? colors[i] + "18" : "#fff", color: value === i ? colors[i] : "#9ca3af", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            {i}
          </button>
        ))}
      </div>
      {value > 0 && <div style={{ textAlign: "center", fontSize: 12, color: colors[value], fontWeight: 600, marginTop: 5 }}>{labels[value]}</div>}
    </div>
  );
}

function ProgressBar({ status, steps }) {
  const idx = steps.indexOf(status);
  if (idx < 0) return null;
  const color = statusColor(status, steps);
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 8, alignItems: "center" }}>
      {steps.map((_, i) => (
        <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= idx ? color : "#e5e7eb", transition: "background .2s" }} />
      ))}
      <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4, whiteSpace: "nowrap" }}>{idx + 1}/{steps.length}</span>
    </div>
  );
}

function DeadlineLabel({ deadline }) {
  if (!deadline) return null;
  const d = daysUntil(deadline);
  let color = "#9ca3af", text = deadline.slice(5).replace("-", "/");
  if (d === null) return null;
  if (d < 0) { color = "#d1d5db"; text = "期限切れ"; }
  else if (d === 0) { color = "#dc2626"; text = "今日締切"; }
  else if (d <= 3) { color = "#dc2626"; text = "あと" + d + "日"; }
  else if (d <= 7) { color = "#d97706"; text = "あと" + d + "日"; }
  return <span style={{ fontSize: 11, color, fontWeight: d <= 7 ? 700 : 400 }}>{text}</span>;
}

// ── 選考フロー設定 ─────────────────────────────────────────────
function StepsEditor({ steps, onChange }) {
  const [newStep, setNewStep] = useState("");
  const add = () => { if (!newStep.trim()) return; onChange([...steps, newStep.trim()]); setNewStep(""); };
  const remove = i => onChange(steps.filter((_, j) => j !== i));
  const move = (i, dir) => { const s = [...steps]; [s[i], s[i + dir]] = [s[i + dir], s[i]]; onChange(s); };
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px" }}>
            <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{i + 1}. {s}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#e5e7eb" : "#6b7280", fontSize: 13, padding: "0 3px" }}>{"▲"}</button>
            <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} style={{ background: "none", border: "none", cursor: i === steps.length - 1 ? "default" : "pointer", color: i === steps.length - 1 ? "#e5e7eb" : "#6b7280", fontSize: 13, padding: "0 3px" }}>{"▼"}</button>
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 15, padding: "0 3px" }}>{"×"}</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="ステップを追加..." style={{ ...inp, flex: 1 }} />
        <button onClick={add} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>{"追加"}</button>
      </div>
    </div>
  );
}

// ── 企業モーダル ──────────────────────────────────────────────
function Modal({ entry, onClose, onSave, industries }) {
  const isNew = !entry;
  const defSteps = entry ? getSteps(entry) : DEFAULT_STEPS_HONSEN;
  const [form, setForm] = useState(entry || { type: "honsen", company: "", industry: "IT", status: "エントリー", customSteps: null, deadline: "", rating: 3, es: "", motivation: "", interviewNotes: [], customMemos: [], dates: [], memo: "" });
  const [mtab, setMtab] = useState("基本");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const steps = form.customSteps || (form.type === "intern" ? DEFAULT_STEPS_INTERN : DEFAULT_STEPS_HONSEN);
  const allStatuses = [...steps, ...TERMINAL];

  // 面接メモ
  const addRound = () => set("interviewNotes", [...(form.interviewNotes || []), { round: (steps[1] || "面接"), date: "", qa: [] }]);
  const updRound = (i, k, v) => { const n = [...form.interviewNotes]; n[i] = { ...n[i], [k]: v }; set("interviewNotes", n); };
  const delRound = i => set("interviewNotes", form.interviewNotes.filter((_, j) => j !== i));
  const addQA = i => { const n = [...form.interviewNotes]; n[i].qa = [...(n[i].qa || []), { q: "", a: "" }]; set("interviewNotes", n); };
  const updQA = (ri, qi, k, v) => { const n = [...form.interviewNotes]; n[ri].qa[qi] = { ...n[ri].qa[qi], [k]: v }; set("interviewNotes", n); };
  const delQA = (ri, qi) => { const n = [...form.interviewNotes]; n[ri].qa = n[ri].qa.filter((_, j) => j !== qi); set("interviewNotes", n); };

  // カスタムメモ
  const addMemo = () => set("customMemos", [...(form.customMemos || []), { label: "", content: "" }]);
  const updMemo = (i, k, v) => { const n = [...form.customMemos]; n[i] = { ...n[i], [k]: v }; set("customMemos", n); };
  const delMemo = i => set("customMemos", form.customMemos.filter((_, j) => j !== i));

  // 日程
  const addDate = () => set("dates", [...(form.dates || []), { label: "", date: "", time: "", place: "" }]);
  const updDate = (i, k, v) => { const n = [...form.dates]; n[i] = { ...n[i], [k]: v }; set("dates", n); };
  const delDate = i => set("dates", form.dates.filter((_, j) => j !== i));

  const mtabs = ["基本", "選考フロー", "ES・志望", "面接メモ", "メモ帳", "日程"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 99, margin: "0 auto 18px" }} />
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{isNew ? "企業を追加" : entry.company}</h2>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
          {[["honsen", "本選考"], ["intern", "インターン"]].map(([v, l]) => (
            <button key={v} onClick={() => { set("type", v); set("status", "エントリー"); set("customSteps", null); }}
              style={{ flex: 1, padding: "8px 0", border: "none", cursor: "pointer", borderRadius: 6, background: form.type === v ? "#fff" : "transparent", color: form.type === v ? "#111827" : "#6b7280", fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all .15s" }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #e5e7eb", marginBottom: 16, gap: 0 }}>
          {mtabs.map(t => (
            <button key={t} onClick={() => setMtab(t)} style={{ padding: "7px 12px", border: "none", background: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, color: mtab === t ? ACCENT : "#6b7280", borderBottom: mtab === t ? "2px solid " + ACCENT : "2px solid transparent", marginBottom: -1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t}
            </button>
          ))}
        </div>

        {mtab === "基本" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={lbl}>{"企業名"}</label><input value={form.company} onChange={e => set("company", e.target.value)} placeholder="例：株式会社〇〇" style={inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>業界</label><select value={form.industry} onChange={e => set("industry", e.target.value)} style={inp}>{(industries || DEFAULT_INDUSTRIES).map(i => <option key={i}>{i}</option>)}</select></div>
              <div><label style={lbl}>ステータス</label><select value={form.status} onChange={e => set("status", e.target.value)} style={inp}>{allStatuses.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label style={lbl}>締め切り日</label><input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={inp} /></div>
            <div><label style={lbl}>志望度</label><RatingPicker value={form.rating} onChange={v => set("rating", v)} /></div>
            <div><label style={lbl}>ひとことメモ</label><textarea value={form.memo} onChange={e => set("memo", e.target.value)} rows={2} placeholder="自由記述..." style={{ ...inp, resize: "vertical" }} /></div>
          </div>
        )}

        {mtab === "選考フロー" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>{"この企業の選考ステップを自由にカスタマイズできます。"}</p>
            </div>
            {!form.customSteps && (
              <button onClick={() => set("customSteps", [...steps])} style={{ width: "100%", padding: "10px 0", background: "#eef2ff", color: ACCENT, border: "1px solid #c7d2fe", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>
                {"デフォルトをベースにカスタマイズする"}
              </button>
            )}
            {form.customSteps && (
              <div>
                <StepsEditor steps={form.customSteps} onChange={s => set("customSteps", s)} />
                <button onClick={() => set("customSteps", null)} style={{ marginTop: 12, width: "100%", padding: "8px 0", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {"デフォルトに戻す"}
                </button>
              </div>
            )}
            {!form.customSteps && (
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#9ca3af" }}>現在のデフォルトフロー：</p>
                {steps.map((s, i) => <div key={i} style={{ fontSize: 13, color: "#374151", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>{i + 1}. {s}</div>)}
              </div>
            )}
          </div>
        )}

        {mtab === "ES・志望" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={lbl}>ES・自己PR</label><textarea value={form.es} onChange={e => set("es", e.target.value)} rows={6} placeholder="エントリーシートの内容を貼り付け..." style={{ ...inp, resize: "vertical" }} /></div>
            <div><label style={lbl}>志望動機</label><textarea value={form.motivation} onChange={e => set("motivation", e.target.value)} rows={4} placeholder="志望動機のポイント..." style={{ ...inp, resize: "vertical" }} /></div>
          </div>
        )}

        {mtab === "面接メモ" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>面接ラウンドごとにQ&Aを記録</p>
              <button onClick={addRound} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{"+ ラウンド追加"}</button>
            </div>
            {(form.interviewNotes || []).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "16px 0" }}>{"まだ記録がありません"}</p>}
            {(form.interviewNotes || []).map((round, ri) => (
              <div key={ri} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={round.round} onChange={e => updRound(ri, "round", e.target.value)} placeholder="例：一次面接" style={{ ...inp, flex: 1 }} />
                  <input type="date" value={round.date} onChange={e => updRound(ri, "date", e.target.value)} style={{ ...inp, flex: 1 }} />
                  <button onClick={() => delRound(ri)} style={{ color: "#dc2626", background: "none", border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{"×"}</button>
                </div>
                {(round.qa || []).map((qa, qi) => (
                  <div key={qi} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>{"Q" + (qi + 1)}</span>
                      <button onClick={() => delQA(ri, qi)} style={{ color: "#dc2626", background: "none", border: "none", fontSize: 14, cursor: "pointer" }}>{"×"}</button>
                    </div>
                    <input value={qa.q} onChange={e => updQA(ri, qi, "q", e.target.value)} placeholder="質問内容..." style={{ ...inp, marginBottom: 6 }} />
                    <textarea value={qa.a} onChange={e => updQA(ri, qi, "a", e.target.value)} placeholder="回答・メモ..." rows={2} style={{ ...inp, resize: "vertical" }} />
                  </div>
                ))}
                <button onClick={() => addQA(ri)} style={{ width: "100%", padding: "7px 0", background: "#eef2ff", color: ACCENT, border: "1px dashed #c7d2fe", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {"+ 質問を追加"}
                </button>
              </div>
            ))}
          </div>
        )}

        {mtab === "メモ帳" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>自由にメモ項目を追加できます</p>
              <button onClick={addMemo} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{"+ 項目追加"}</button>
            </div>
            {(form.customMemos || []).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "16px 0" }}>{"項目がありません"}</p>}
            {(form.customMemos || []).map((m, i) => (
              <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={m.label} onChange={e => updMemo(i, "label", e.target.value)} placeholder="項目名（例：企業研究、OB情報）" style={{ ...inp, flex: 1 }} />
                  <button onClick={() => delMemo(i)} style={{ color: "#dc2626", background: "none", border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{"×"}</button>
                </div>
                <textarea value={m.content} onChange={e => updMemo(i, "content", e.target.value)} placeholder="内容を入力..." rows={3} style={{ ...inp, resize: "vertical" }} />
              </div>
            ))}
          </div>
        )}

        {mtab === "日程" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>面接・説明会の日程</p>
              <button onClick={addDate} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{"+ 追加"}</button>
            </div>
            {(form.dates || []).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "16px 0" }}>{"日程なし"}</p>}
            {(form.dates || []).map((d, i) => (
              <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={d.label} onChange={e => updDate(i, "label", e.target.value)} placeholder="ラベル（例：最終面接）" style={{ ...inp, flex: 1 }} />
                  <button onClick={() => delDate(i)} style={{ color: "#dc2626", background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>{"×"}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input type="date" value={d.date} onChange={e => updDate(i, "date", e.target.value)} style={inp} />
                  <input type="time" value={d.time} onChange={e => updDate(i, "time", e.target.value)} style={inp} />
                </div>
                <input value={d.place} onChange={e => updDate(i, "place", e.target.value)} placeholder="場所（例：本社、オンライン）" style={inp} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
          <button onClick={() => { if (!form.company.trim()) return; onSave(form); }} style={{ flex: 2, padding: "12px 0", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {isNew ? "追加する" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ホーム ────────────────────────────────────────────────────
function HomeTab({ entries, setTab, setModal, showPassRate, setShowPassRate }) {
  const td = todayStr();
  const alerts = entries.filter(e => { const d = daysUntil(e.deadline); return d !== null && d >= 0 && d <= 7 && !TERMINAL.includes(e.status); });
  const upcoming = entries.flatMap(e => (e.dates || []).filter(d => d.date >= td).map(d => ({ ...d, company: e.company }))).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")).slice(0, 4);
  const active = entries.filter(e => !e.archived);
  const s = { h: active.filter(e => e.type === "honsen").length, i: active.filter(e => e.type === "intern").length, o: active.filter(e => e.status === "内定").length };
  // 通過率計算
  const honsenAll = entries.filter(e => e.type === "honsen");
  const steps = DEFAULT_STEPS_HONSEN;
  const passRates = steps.slice(0, -1).map((step, i) => {
    const atStep = honsenAll.filter(e => {
      const si = getSteps(e).indexOf(e.status);
      const ti = getSteps(e).indexOf(step);
      return si >= ti || TERMINAL.includes(e.status) || e.status === "内定";
    }).length;
    const passed = honsenAll.filter(e => {
      const si = getSteps(e).indexOf(e.status);
      const ti = getSteps(e).indexOf(step);
      return si > ti || e.status === "内定";
    }).length;
    return { step, atStep, passed, rate: atStep > 0 ? Math.round(passed / atStep * 100) : null };
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[["本選考", s.h, ACCENT], ["インターン", s.i, "#d97706"], ["内定", s.o, "#16a34a"]].map(([name, val, color]) => (
          <div key={name} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{name}</div>
          </div>
        ))}
      </div>
      {showPassRate && honsenAll.length >= 2 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{"選考通過率（本選考）"}</p>
            <button onClick={() => setShowPassRate(false)} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>{"非表示"}</button>
          </div>
          {passRates.filter(r => r.atStep > 0).map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#374151" }}>{r.step}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.rate >= 50 ? "#16a34a" : r.rate >= 30 ? "#d97706" : "#dc2626" }}>
                  {r.rate !== null ? r.rate + "%" : "-"}
                </span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (r.rate || 0) + "%", background: r.rate >= 50 ? "#16a34a" : r.rate >= 30 ? "#d97706" : "#ef4444", borderRadius: 99, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{r.passed + "/" + r.atStep + "社通過"}</div>
            </div>
          ))}
        </div>
      )}
      {!showPassRate && honsenAll.length >= 2 && (
        <button onClick={() => setShowPassRate(true)} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 0", cursor: "pointer", color: "#9ca3af", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>
          {"📊 通過率を表示"}
        </button>
      )}
      {alerts.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>{"締め切り間近"}</p>
          {alerts.map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#78350f", paddingTop: 3 }}>
              <span>{e.company}</span><DeadlineLabel deadline={e.deadline} />
            </div>
          ))}
        </div>
      )}
      {s.o > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>{"🎉"}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>{"内定 " + s.o + "社獲得中！"}</span>
        </div>
      )}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{"直近の予定"}</p>
          <button onClick={() => setTab(2)} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{"カレンダー →"}</button>
        </div>
        {upcoming.length === 0
          ? <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "12px 0" }}>{"予定はありません"}</p>
          : upcoming.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: i < upcoming.length - 1 ? 10 : 0, borderBottom: i < upcoming.length - 1 ? "1px solid #f3f4f6" : "none", marginBottom: i < upcoming.length - 1 ? 10 : 0 }}>
              <div style={{ background: "#eef2ff", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{(d.date || "").slice(5).replace("-", "/")}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{d.time || "--:--"}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{d.company}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{d.label}{d.place ? " · " + d.place : ""}</div>
              </div>
            </div>
          ))}
      </div>
      <button onClick={() => setModal("new")} style={{ background: "#fff", border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "14px 0", cursor: "pointer", color: "#9ca3af", fontWeight: 600, fontSize: 14, fontFamily: "inherit" }}>
        {"+ 企業を追加"}
      </button>
    </div>
  );
}

// ── 企業一覧 ──────────────────────────────────────────────────
function ListTab({ entries, setModal, onDelete, onArchive, obog }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandId, setExpandId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const td = todayStr();
  const list = useMemo(() => {
    let l = entries.filter(e => !!e.archived === showArchived);
    if (filter !== "all") l = l.filter(e => e.type === filter);
    if (search) {
      const q = search.toLowerCase();
      l = l.filter(e =>
        e.company.toLowerCase().includes(q) ||
        e.status.includes(q) ||
        e.industry.includes(q) ||
        (e.memo || "").toLowerCase().includes(q) ||
        (e.motivation || "").toLowerCase().includes(q) ||
        (e.es || "").toLowerCase().includes(q) ||
        (e.customMemos || []).some(m => (m.content || "").toLowerCase().includes(q)) ||
        (e.interviewNotes || []).some(r => (r.qa || []).some(qa => (qa.q + qa.a).toLowerCase().includes(q)))
      );
    }
    return l.sort((a, b) => { if (!a.deadline && !b.deadline) return 0; if (!a.deadline) return 1; if (!b.deadline) return -1; return a.deadline.localeCompare(b.deadline); });
  }, [entries, filter, search, showArchived]);

  const ratingColors = ["", "#9ca3af", "#6b7280", "#d97706", "#2563eb", "#16a34a"];
  const ratingLabels = ["", "低", "やや低", "普通", "高", "最高"];

  return (
    <div>
      <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 8, padding: 3, marginBottom: 12 }}>
        {[["all", "すべて"], ["honsen", "本選考"], ["intern", "インターン"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ flex: 1, padding: "7px 0", border: "none", cursor: "pointer", borderRadius: 6, background: filter === v ? "#fff" : "transparent", color: filter === v ? "#111827" : "#6b7280", fontWeight: 600, fontSize: 12, fontFamily: "inherit", transition: "all .15s" }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="メモ・ESも含めて検索..." style={{ ...inp, flex: 1, margin: 0 }} />
        <button onClick={() => setShowArchived(p => !p)} style={{ flexShrink: 0, padding: "10px 12px", background: showArchived ? "#374151" : "#f3f4f6", color: showArchived ? "#fff" : "#6b7280", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {showArchived ? "アーカイブ中" : "📦"}
        </button>
      </div>
      {list.length === 0
        ? <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{"📭"}</div><div style={{ fontSize: 13 }}>{"該当なし"}</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(entry => {
            const expanded = expandId === entry.id;
            const steps = getSteps(entry);
            const color = statusColor(entry.status, steps);
            return (
              <div key={entry.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpandId(expanded ? null : entry.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{entry.company}</span>
                        <span style={{ fontSize: 10, background: entry.type === "intern" ? "#fef3c7" : "#eef2ff", color: entry.type === "intern" ? "#d97706" : ACCENT, borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{entry.type === "intern" ? "インターン" : "本選考"}</span>
                        {entry.customSteps && <span style={{ fontSize: 9, background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>{"カスタム"}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center" }}><StatusDot status={entry.status} steps={steps} /><span style={{ fontSize: 12, color: "#374151" }}>{entry.status}</span></div>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{entry.industry}</span>
                        <DeadlineLabel deadline={entry.deadline} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: 8, flexShrink: 0 }}>
                      {entry.rating > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: ratingColors[entry.rating] }}>{"志望度 " + ratingLabels[entry.rating]}</span>}
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{expanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {!TERMINAL.includes(entry.status) && <ProgressBar status={entry.status} steps={steps} />}
                </div>
                {expanded && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 14px", background: "#fafafa" }}>
                    {entry.motivation && <div style={{ marginBottom: 8 }}><p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"志望動機"}</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#374151" }}>{entry.motivation}</p></div>}
                    {entry.memo && <div style={{ marginBottom: 8 }}><p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"メモ"}</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#374151" }}>{entry.memo}</p></div>}
                    {(entry.interviewNotes || []).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"面接メモ"}</p>
                        {entry.interviewNotes.map((r, i) => (
                          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px", marginBottom: 6 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: ACCENT }}>{r.round}{r.date ? " · " + r.date : ""}</p>
                            {(r.qa || []).map((qa, j) => (
                              <div key={j} style={{ fontSize: 12, paddingTop: 4, borderTop: j > 0 ? "1px solid #f3f4f6" : "none", marginTop: j > 0 ? 4 : 0 }}>
                                <p style={{ margin: "0 0 2px", color: "#374151", fontWeight: 600 }}>{"Q: " + qa.q}</p>
                                {qa.a && <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>{"A: " + qa.a}</p>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {(entry.customMemos || []).filter(m => m.content).map((m, i) => (
                      <div key={i} style={{ marginBottom: 8 }}><p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{m.label || "メモ"}</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#374151", whiteSpace: "pre-wrap" }}>{m.content}</p></div>
                    ))}
                    {(entry.dates || []).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"日程"}</p>
                        {entry.dates.map((d, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 2 }}>
                            <span style={{ color: "#6b7280" }}>{d.label}</span>
                            <span style={{ fontWeight: 600, color: d.date >= td ? ACCENT : "#9ca3af" }}>{d.date} {d.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* OB/OG紐付け表示 */}
                    {obog && obog.filter(o => o.company === entry.company).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"OB/OG"}</p>
                        {obog.filter(o => o.company === entry.company).map((o, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#374151", padding: "3px 0" }}>
                            {"👤 " + o.name + "（" + o.year + "・" + o.department + "）"}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* ESコピー */}
                    {entry.es && (
                      <button onClick={() => { navigator.clipboard.writeText(entry.es); alert("ESをコピーしました"); }}
                        style={{ display: "block", width: "100%", padding: "7px 0", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit", marginBottom: 8 }}>
                        {"📋 ESをコピー"}
                      </button>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={() => setModal(entry)} style={{ flex: 2, padding: "8px 0", background: "#eef2ff", color: ACCENT, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>{"編集"}</button>
                      <button onClick={() => onArchive(entry.id)} style={{ flex: 1, padding: "8px 0", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>{entry.archived ? "戻す" : "📦"}</button>
                      <button onClick={() => onDelete(entry.id)} style={{ flex: 1, padding: "8px 0", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>{"削除"}</button>
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
function CalendarTab({ entries }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates = entries.flatMap(e => (e.dates || []).map(d => ({ ...d, company: e.company, status: e.status, steps: getSteps(e) })));
  const getEvents = d => { const ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); return allDates.filter(e => e.date === ds); };
  const td = todayStr();
  const monthStr = year + "-" + String(month + 1).padStart(2, "0");
  const monthEvents = allDates.filter(e => e.date && e.date.startsWith(monthStr)).sort((a, b) => a.date.localeCompare(b.date));
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={prev} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: "#374151" }}>{"‹"}</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{year + "年 " + (month + 1) + "月"}</span>
        <button onClick={next} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: "#374151" }}>{"›"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 2 }}>
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#9ca3af", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 16 }}>
        {Array(firstDay).fill(null).map((_, i) => <div key={"p" + i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
          const events = getEvents(d);
          const isToday = ds === td;
          const dow = (firstDay + d - 1) % 7;
          return (
            <div key={d} style={{ minHeight: 36, borderRadius: 6, padding: "3px 2px", background: isToday ? "#eef2ff" : "#fff", border: "1px solid " + (isToday ? "#c7d2fe" : "#f3f4f6") }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? ACCENT : dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "#374151", textAlign: "center" }}>{d}</div>
              {events.slice(0, 1).map((e, i) => (
                <div key={i} style={{ fontSize: 8, background: statusColor(e.status, e.steps), color: "#fff", borderRadius: 2, padding: "1px 2px", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label || e.company}</div>
              ))}
              {events.length > 1 && <div style={{ fontSize: 8, color: "#9ca3af", textAlign: "center" }}>{"+" + (events.length - 1)}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{(month + 1) + "月の予定"}</p>
        {monthEvents.length === 0
          ? <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "10px 0" }}>{"予定はありません"}</p>
          : monthEvents.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: i < monthEvents.length - 1 ? 10 : 0, borderBottom: i < monthEvents.length - 1 ? "1px solid #f3f4f6" : "none", marginBottom: i < monthEvents.length - 1 ? 10 : 0 }}>
              <div style={{ background: "#eef2ff", borderRadius: 6, padding: "5px 8px", textAlign: "center", minWidth: 40, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{(e.date || "").slice(5).replace("-", "/")}</div>
                <div style={{ fontSize: 9, color: "#9ca3af" }}>{e.time || "--:--"}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{e.company}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{e.label}{e.place ? " · " + e.place : ""}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── OB/OG ────────────────────────────────────────────────────
function ObogModal({ entry, companies, onClose, onSave }) {
  const isNew = !entry;
  const [form, setForm] = useState(entry || { company: "", name: "", year: "", department: "", date: "", method: "", notes: "", contact: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 99, margin: "0 auto 16px" }} />
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{isNew ? "OB/OG訪問を記録" : "編集"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={lbl}>企業名</label><input value={form.company} onChange={e => set("company", e.target.value)} placeholder="企業名" style={inp} list="co-list" /><datalist id="co-list">{companies.map(c => <option key={c} value={c} />)}</datalist></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={lbl}>お名前</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="田中 太郎" style={inp} /></div>
            <div><label style={lbl}>卒業年度</label><input value={form.year} onChange={e => set("year", e.target.value)} placeholder="2022年卒" style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={lbl}>部署・職種</label><input value={form.department} onChange={e => set("department", e.target.value)} placeholder="エンジニア" style={inp} /></div>
            <div><label style={lbl}>訪問日</label><input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} /></div>
          </div>
          <div><label style={lbl}>訪問方法</label><select value={form.method} onChange={e => set("method", e.target.value)} style={inp}>{["", "カフェ", "オンライン", "会社", "その他"].map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label style={lbl}>メモ</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={4} placeholder="仕事内容、社風、選考アドバイスなど..." style={{ ...inp, resize: "vertical" }} /></div>
          <div><label style={lbl}>連絡先（任意）</label><input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="メールアドレスなど" style={inp} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
          <button onClick={() => { if (!form.company.trim() || !form.name.trim()) return; onSave(form); }} style={{ flex: 2, padding: "12px 0", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {isNew ? "記録する" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ObogTab({ entries, obog, setObog }) {
  const [modal, setModal] = useState(null);
  const [expandId, setExpandId] = useState(null);
  const companies = entries.map(e => e.company);
  const save = form => { setObog(p => { const n = modal === "new" ? [...p, { ...form, id: nextId(p) }] : p.map(o => o.id === modal.id ? { ...form, id: o.id } : o); localStorage.setItem(OBOG_KEY, JSON.stringify(n)); return n; }); setModal(null); };
  const del = id => setObog(p => { const n = p.filter(o => o.id !== id); localStorage.setItem(OBOG_KEY, JSON.stringify(n)); return n; });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{obog.length + "件"}</span>
        <button onClick={() => setModal("new")} style={{ background: "#16a34a", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 600 }}>{"+ 追加"}</button>
      </div>
      {obog.length === 0
        ? <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{"👥"}</div><div style={{ fontSize: 13 }}>{"記録がありません"}</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {obog.map(o => {
            const expanded = expandId === o.id;
            return (
              <div key={o.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpandId(expanded ? null : o.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{o.name} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 12 }}>{"(" + o.year + ")"}</span></p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{o.company}</span>
                        {o.department && <span style={{ fontSize: 11, color: "#9ca3af" }}>{o.department}</span>}
                        {o.date && <span style={{ fontSize: 11, color: "#9ca3af" }}>{o.date}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{expanded ? "▲" : "▼"}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 14px", background: "#fafafa" }}>
                    {o.notes && <div style={{ marginBottom: 8 }}><p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"メモ"}</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{o.notes}</p></div>}
                    {o.contact && <div style={{ marginBottom: 8 }}><p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{"連絡先"}</p><p style={{ margin: 0, fontSize: 13, color: ACCENT }}>{o.contact}</p></div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => setModal(o)} style={{ flex: 1, padding: "8px 0", background: "#eef2ff", color: ACCENT, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>{"編集"}</button>
                      <button onClick={() => del(o.id)} style={{ flex: 1, padding: "8px 0", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>{"削除"}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      {modal && <ObogModal entry={modal === "new" ? null : modal} companies={companies} onClose={() => setModal(null)} onSave={save} />}
    </div>
  );
}

// ── 設定タブ ──────────────────────────────────────────────────
function SettingsTab({ industries, setIndustries, onShowTutorial }) {
  const [newItem, setNewItem] = useState("");
  const add = () => {
    const v = newItem.trim();
    if (!v || industries.includes(v)) return;
    setIndustries(p => [...p, v]);
    setNewItem("");
  };
  const remove = name => setIndustries(p => p.filter(i => i !== name));
  const reset = () => { if (window.confirm("デフォルトに戻しますか？")) setIndustries(DEFAULT_INDUSTRIES); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{"業界リスト"}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{"企業追加・編集時に表示される業界の選択肢"}</p>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {industries.map(name => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f3f4f6", borderRadius: 20, padding: "5px 10px 5px 12px" }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{name}</span>
                <button onClick={() => remove(name)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 15, lineHeight: 1, padding: "0 1px", display: "flex", alignItems: "center" }}>{"×"}</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="業界を追加..." style={{ ...inp, flex: 1 }} />
            <button onClick={add} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap" }}>{"追加"}</button>
          </div>
          <button onClick={reset} style={{ marginTop: 10, width: "100%", padding: "8px 0", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#9ca3af", fontSize: 12, fontFamily: "inherit" }}>
            {"デフォルトに戻す"}
          </button>
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{"ヘルプ"}</p>
        </div>
        <button onClick={onShowTutorial} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 14, color: "#111827" }}>{"チュートリアルを見る"}</span>
          <span style={{ color: "#9ca3af" }}>{"›"}</span>
        </button>
      </div>
    </div>
  );
}

// ── チュートリアル ────────────────────────────────────────────
const TUTORIAL_SLIDES = [
  {
    icon: "👋",
    title: "就活トラッカーへようこそ",
    desc: "選考状況・面接メモ・日程を一元管理できるアプリです。まずは基本的な使い方を確認しましょう。",
    color: "#4f46e5",
    bg: "#eef2ff",
  },
  {
    icon: "🏢",
    title: "企業を追加しよう",
    desc: "右上の「+ 追加」ボタンから企業を登録できます。本選考・インターンの切り替えも可能です。",
    color: "#d97706",
    bg: "#fffbeb",
    tip: "ヒント: 志望度は1〜5で設定できます",
  },
  {
    icon: "📋",
    title: "選考フローをカスタマイズ",
    desc: "企業ごとに選考ステップを自由に設定できます。編集画面の「選考フロー」タブから変更できます。",
    color: "#16a34a",
    bg: "#f0fdf4",
    tip: "ヒント: ステップの並び替えや追加が自由にできます",
  },
  {
    icon: "🎤",
    title: "面接メモを記録しよう",
    desc: "面接ごとに質問と回答を記録できます。「面接メモ」タブからラウンドを追加して使いましょう。",
    color: "#2563eb",
    bg: "#eff6ff",
    tip: "ヒント: 質問は自由に追加・削除できます",
  },
  {
    icon: "📅",
    title: "日程をカレンダーで管理",
    desc: "企業に日程を登録すると、カレンダーに表示されます。締め切りが近い企業はホームでアラートが出ます。",
    color: "#7c3aed",
    bg: "#f5f3ff",
    tip: "ヒント: ホーム画面に直近の予定が表示されます",
  },
  {
    icon: "💾",
    title: "データは自動保存されます",
    desc: "入力したデータはこのデバイスに自動保存されます。CSV出力でバックアップも可能です。",
    color: "#0891b2",
    bg: "#ecfeff",
    tip: "ヒント: ホーム画面に追加するとアプリのように使えます",
  },
];

function Tutorial({ onDone }) {
  const [page, setPage] = useState(0);
  const slide = TUTORIAL_SLIDES[page];
  const isLast = page === TUTORIAL_SLIDES.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "28px 24px 48px", width: "100%", maxWidth: 520 }}>
        {/* ページドット */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {TUTORIAL_SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 99, background: i === page ? slide.color : "#e5e7eb", transition: "all .3s" }} />
          ))}
        </div>
        {/* アイコン */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: slide.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>
          {slide.icon}
        </div>
        {/* テキスト */}
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800, color: "#111827", textAlign: "center", letterSpacing: "-.3px" }}>{slide.title}</h2>
        <p style={{ margin: "0 0 16px", fontSize: 15, color: "#374151", textAlign: "center", lineHeight: 1.7 }}>{slide.desc}</p>
        {slide.tip && (
          <div style={{ background: slide.bg, borderRadius: 8, padding: "8px 14px", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: slide.color, fontWeight: 600 }}>{slide.tip}</p>
          </div>
        )}
        {/* ボタン */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {page > 0 && (
            <button onClick={() => setPage(p => p - 1)} style={{ flex: 1, padding: "13px 0", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              {"戻る"}
            </button>
          )}
          {!isLast && (
            <button onClick={() => setPage(p => p + 1)} style={{ flex: 2, padding: "13px 0", background: slide.color, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              {"次へ"}
            </button>
          )}
          {isLast && (
            <button onClick={onDone} style={{ flex: 1, padding: "13px 0", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              {"はじめる"}
            </button>
          )}
        </div>
        <button onClick={onDone} style={{ display: "block", width: "100%", marginTop: 12, padding: "8px 0", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, fontFamily: "inherit" }}>
          {"スキップ"}
        </button>
      </div>
    </div>
  );
}

function Icon({ name, active }) {
  const c = active ? ACCENT : "#9ca3af";
  const s = { width: 20, height: 20, display: "block" };
  if (name === "home") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
  if (name === "list") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
  if (name === "calendar") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  if (name === "people") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  if (name === "settings") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  return null;
}

export default function App() {
  const [entries, setEntries] = useState(() => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [obog, setObog] = useState(() => { try { const s = localStorage.getItem(OBOG_KEY); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState(null);
  const [industries, setIndustries] = useState(loadIndustries);
  const [deleteId, setDeleteId] = useState(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_KEY));
  const [showPassRate, setShowPassRate] = useState(true);

  const finishTutorial = () => { localStorage.setItem(TUTORIAL_KEY, "1"); setShowTutorial(false); };

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem(INDUSTRIES_KEY, JSON.stringify(industries)); }, [industries]);

  const save = form => {
    if (modal === "new") setEntries(p => [...p, { ...form, id: nextId(p) }]);
    else setEntries(p => p.map(e => e.id === modal.id ? { ...form, id: e.id } : e));
    setModal(null);
  };

  const archiveEntry = id => setEntries(p => p.map(e => e.id === id ? { ...e, archived: !e.archived } : e));

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif", color: "#111827", maxWidth: 520, margin: "0 auto", paddingBottom: 80 }}>
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}select,textarea,input{font-family:inherit;}"}</style>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>{"就活トラッカー"}</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => exportCSV(entries)} style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{"CSV"}</button>
            {tab <= 1 && <button onClick={() => setModal("new")} style={{ background: ACCENT, border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600 }}>{"+ 追加"}</button>}
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        {tab === 0 && <HomeTab entries={entries} setTab={setTab} setModal={setModal} showPassRate={showPassRate} setShowPassRate={setShowPassRate} />}
        {tab === 1 && <ListTab entries={entries} setModal={setModal} onDelete={setDeleteId} onArchive={archiveEntry} obog={obog} />}
        {tab === 2 && <CalendarTab entries={entries} />}
        {tab === 3 && <ObogTab entries={entries} obog={obog} setObog={setObog} />}
        {tab === 4 && <SettingsTab industries={industries} setIndustries={setIndustries} onShowTutorial={() => setShowTutorial(true)} />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", zIndex: 10 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
            <Icon name={TAB_ICONS[i]} active={tab === i} />
            <span style={{ fontSize: 9, fontWeight: 600, color: tab === i ? ACCENT : "#9ca3af" }}>{t}</span>
          </button>
        ))}
      </div>
      {showTutorial && <Tutorial onDone={finishTutorial} />}
      {modal && <Modal entry={modal === "new" ? null : modal} industries={industries} onClose={() => setModal(null)} onSave={save} />}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 280, textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{"削除しますか？"}</p>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#9ca3af" }}>{"この操作は元に戻せません"}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px 0", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{"キャンセル"}</button>
              <button onClick={() => { setEntries(p => p.filter(e => e.id !== deleteId)); setDeleteId(null); }} style={{ flex: 1, padding: "10px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{"削除"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
