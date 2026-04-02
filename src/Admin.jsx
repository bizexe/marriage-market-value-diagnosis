import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = ["#E84B8A","#C4167A","#FFB7C5","#8B5070","#6B9080","#D4527A","#B0607A","#9A7080"];

const GENDER_MAP = { 0: "男性", 1: "女性" };
const AGE_MAP = ["20-25歳","26-29歳","30-33歳","34-37歳","38-42歳","43歳以上"];
const INCOME_MAP = ["〜300万","300-400万","400-500万","500-700万","700-1000万","1000万以上"];
const RANK_ORDER = ["S","A","B","C","D"];
const RANK_LABEL = { S:"Sランク", A:"Aランク", B:"Bランク", C:"Cランク", D:"Dランク" };
const RANK_COLOR = { S:"#C4167A", A:"#D4527A", B:"#B0607A", C:"#9A7080", D:"#8B7D8B" };

function countBy(arr, key, mapFn) {
  const counts = {};
  arr.forEach(r => {
    const v = mapFn ? mapFn(r[key]) : r[key];
    if (v != null) counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
}

function toChartData(counts, order) {
  if (order) return order.map(k => ({ name: k, count: counts[k] || 0 }));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function dailyTrend(results) {
  const byDay = {};
  results.forEach(r => {
    const d = r.created_at?.slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });
  return Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date: date.slice(5), count }));
}

/* ── Styles ── */
const page = {
  minHeight: "100vh",
  background: "#f8f6f3",
  fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif",
  color: "#333",
};
const container = { maxWidth: 1100, margin: "0 auto", padding: "24px 16px" };
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 28 };
const card = {
  background: "#fff", borderRadius: 14, padding: "18px 20px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #eee",
};
const kpiVal = { fontSize: 32, fontWeight: 900, color: "#C4167A", margin: "4px 0" };
const kpiLabel = { fontSize: 12, color: "#888", fontWeight: 600 };
const chartCard = {
  ...card, marginBottom: 20, padding: "20px",
};
const sectionTitle = { fontSize: 15, fontWeight: 700, color: "#5A3050", margin: "0 0 14px" };
const tableWrap = {
  overflowX: "auto", background: "#fff", borderRadius: 14,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #eee",
};
const th = {
  padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#888",
  background: "#faf8f5", borderBottom: "1px solid #eee", textAlign: "left",
  whiteSpace: "nowrap", position: "sticky", top: 0,
};
const td = {
  padding: "9px 12px", fontSize: 13, borderBottom: "1px solid #f4f2ef",
  whiteSpace: "nowrap",
};
const rankBadge = (rank) => ({
  display: "inline-block", padding: "2px 10px", borderRadius: 10,
  fontSize: 11, fontWeight: 700,
  background: (RANK_COLOR[rank] || "#888") + "15",
  color: RANK_COLOR[rank] || "#888",
});
const filterBar = {
  display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
};
const selectStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd",
  fontSize: 13, fontFamily: "inherit", background: "#fff",
};

/* ── Login Gate ── */
function LoginGate({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr(false);
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-password": pw },
      });
      if (!res.ok) { setErr(true); setLoading(false); return; }
      const json = await res.json();
      onLogin(pw, json.results);
    } catch {
      setErr(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ ...page, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ ...card, maxWidth: 360, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#5A3050", margin: "0 0 6px" }}>🔒 管理画面</h1>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>パスワードを入力してください</p>
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="パスワード"
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
            border: err ? "2px solid #E84B8A" : "1px solid #ddd", fontSize: 15,
            fontFamily: "inherit", outline: "none", marginBottom: 14,
          }}
        />
        {err && <p style={{ color: "#E84B8A", fontSize: 12, marginBottom: 10 }}>パスワードが正しくありません</p>}
        <button
          onClick={submit} disabled={loading || !pw}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: "#C4167A", color: "#fff", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1,
          }}
        >{loading ? "読み込み中..." : "ログイン"}</button>
      </div>
    </div>
  );
}

/* ── Dashboard ── */
export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [results, setResults] = useState([]);
  const [genderFilter, setGenderFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleLogin = (pw, data) => {
    setPassword(pw);
    setResults(data || []);
    setAuthed(true);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        const json = await res.json();
        setResults(json.results || []);
      }
    } catch {}
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let d = results;
    if (genderFilter !== "all") d = d.filter(r => String(r.gender) === genderFilter);
    if (rankFilter !== "all") d = d.filter(r => r.rank === rankFilter);
    return d;
  }, [results, genderFilter, rankFilter]);

  // KPIs
  const total = filtered.length;
  const avgH = total ? Math.round(filtered.reduce((s, r) => s + (r.hensachi || 0), 0) / total) : 0;
  const ctaRate = total ? Math.round(filtered.filter(r => r.clicked_cta).length / total * 100) : 0;
  const lineRate = total ? Math.round(filtered.filter(r => r.clicked_line).length / total * 100) : 0;
  const maleCount = filtered.filter(r => r.gender === 0).length;
  const femaleCount = filtered.filter(r => r.gender === 1).length;

  // Charts
  const genderData = [
    { name: "男性", count: maleCount },
    { name: "女性", count: femaleCount },
  ].filter(d => d.count > 0);

  const ageData = toChartData(
    countBy(filtered, "q_age", v => AGE_MAP[v] || "不明"),
    AGE_MAP
  );

  const incomeData = toChartData(
    countBy(filtered, "q_income", v => INCOME_MAP[v] || "不明"),
    INCOME_MAP
  );

  const rankData = toChartData(
    countBy(filtered, "rank"),
    RANK_ORDER
  ).map(d => ({ ...d, name: RANK_LABEL[d.name] || d.name }));

  const henBins = useMemo(() => {
    const bins = { "25-29":0,"30-34":0,"35-39":0,"40-44":0,"45-49":0,"50-54":0,"55-59":0,"60-64":0,"65-69":0,"70-75":0 };
    filtered.forEach(r => {
      const h = r.hensachi;
      if (h == null) return;
      if (h < 30) bins["25-29"]++;
      else if (h < 35) bins["30-34"]++;
      else if (h < 40) bins["35-39"]++;
      else if (h < 45) bins["40-44"]++;
      else if (h < 50) bins["45-49"]++;
      else if (h < 55) bins["50-54"]++;
      else if (h < 60) bins["55-59"]++;
      else if (h < 65) bins["60-64"]++;
      else if (h < 70) bins["65-69"]++;
      else bins["70-75"]++;
    });
    return Object.entries(bins).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const trend = useMemo(() => dailyTrend(filtered), [filtered]);

  if (!authed) return <LoginGate onLogin={handleLogin} />;

  return (
    <div style={page}>
      <div style={container}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#5A3050", margin: 0 }}>📊 診断結果ダッシュボード</h1>
            <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>全 {results.length} 件のデータ</p>
          </div>
          <button onClick={refresh} disabled={refreshing} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd",
            background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            color: "#5A3050", fontWeight: 600, opacity: refreshing ? 0.5 : 1,
          }}>
            {refreshing ? "更新中..." : "🔄 データ更新"}
          </button>
        </div>

        {/* Filters */}
        <div style={filterBar}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>フィルタ:</span>
          <select style={selectStyle} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
            <option value="all">性別：すべて</option>
            <option value="0">男性のみ</option>
            <option value="1">女性のみ</option>
          </select>
          <select style={selectStyle} value={rankFilter} onChange={e => setRankFilter(e.target.value)}>
            <option value="all">ランク：すべて</option>
            {RANK_ORDER.map(r => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
          </select>
          {(genderFilter !== "all" || rankFilter !== "all") && (
            <button onClick={() => { setGenderFilter("all"); setRankFilter("all"); }}
              style={{ ...selectStyle, cursor: "pointer", color: "#E84B8A", borderColor: "#E84B8A" }}>
              ✕ リセット
            </button>
          )}
          <span style={{ fontSize: 12, color: "#aaa" }}>（{filtered.length}件表示中）</span>
        </div>

        {/* KPI Cards */}
        <div style={cardGrid}>
          <div style={card}>
            <p style={kpiLabel}>診断実施数</p>
            <p style={kpiVal}>{total.toLocaleString()}</p>
          </div>
          <div style={card}>
            <p style={kpiLabel}>平均偏差値</p>
            <p style={kpiVal}>{avgH}</p>
          </div>
          <div style={card}>
            <p style={kpiLabel}>相談CTA押下率</p>
            <p style={kpiVal}>{ctaRate}%</p>
          </div>
          <div style={card}>
            <p style={kpiLabel}>LINE追加率</p>
            <p style={kpiVal}>{lineRate}%</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 20 }}>
          <div style={chartCard}>
            <p style={sectionTitle}>性別割合</p>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={genderData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                    outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={12}>
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color: "#aaa", fontSize: 13 }}>データなし</p>}
          </div>
          <div style={chartCard}>
            <p style={sectionTitle}>日別推移（直近30日）</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#E84B8A" strokeWidth={2.5}
                  dot={{ fill: "#E84B8A", r: 3 }} name="件数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={chartCard}>
            <p style={sectionTitle}>年齢分布</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#E84B8A" radius={[4,4,0,0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={chartCard}>
            <p style={sectionTitle}>年収分布</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incomeData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#D4527A" radius={[4,4,0,0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={chartCard}>
            <p style={sectionTitle}>ランク分布</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rankData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]} name="人数">
                  {rankData.map((d, i) => <Cell key={i} fill={RANK_COLOR[RANK_ORDER[i]] || "#888"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={chartCard}>
            <p style={sectionTitle}>偏差値ヒストグラム</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={henBins} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#FFB7C5" radius={[4,4,0,0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div style={chartCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ ...sectionTitle, margin: 0 }}>回答一覧（新しい順）</p>
            <button onClick={() => {
              const header = "日時,ニックネーム,性別,年齢,年収,偏差値,ランク,CTA,LINE\n";
              const rows = filtered.map(r =>
                `${r.created_at?.slice(0,16)},${r.nickname},${GENDER_MAP[r.gender]||""},${AGE_MAP[r.q_age]||""},${INCOME_MAP[r.q_income]||""},${r.hensachi},${r.rank},${r.clicked_cta?"○":""},${r.clicked_line?"○":""}`
              ).join("\n");
              const blob = new Blob(["\uFEFF"+header+rows], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `diagnosis_export_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
            }} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd",
              background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              color: "#5A3050", fontWeight: 600,
            }}>📥 CSV出力</button>
          </div>
          <div style={{ ...tableWrap, maxHeight: 480, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={th}>日時</th>
                  <th style={th}>ニックネーム</th>
                  <th style={th}>性別</th>
                  <th style={th}>年齢</th>
                  <th style={th}>年収</th>
                  <th style={th}>偏差値</th>
                  <th style={th}>ランク</th>
                  <th style={th}>スペック</th>
                  <th style={th}>人間力</th>
                  <th style={th}>リテラシー</th>
                  <th style={th}>ライフ</th>
                  <th style={th}>タイミング</th>
                  <th style={th}>CTA</th>
                  <th style={th}>LINE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? "#fff" : "#fdfbf9" }}>
                    <td style={td}>{r.created_at?.slice(0, 16).replace("T", " ")}</td>
                    <td style={td}>{r.nickname}</td>
                    <td style={td}>{GENDER_MAP[r.gender] || "-"}</td>
                    <td style={td}>{AGE_MAP[r.q_age] || "-"}</td>
                    <td style={td}>{INCOME_MAP[r.q_income] || "-"}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#C4167A" }}>{r.hensachi}</td>
                    <td style={td}><span style={rankBadge(r.rank)}>{r.rank}</span></td>
                    <td style={td}>{r.hensachi_spec}</td>
                    <td style={td}>{r.hensachi_human}</td>
                    <td style={td}>{r.hensachi_literacy}</td>
                    <td style={td}>{r.hensachi_life}</td>
                    <td style={td}>{r.hensachi_timing}</td>
                    <td style={td}>{r.clicked_cta ? "✅" : ""}</td>
                    <td style={td}>{r.clicked_line ? "✅" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>データがありません</p>
            )}
            {filtered.length > 200 && (
              <p style={{ textAlign: "center", padding: 12, color: "#aaa", fontSize: 12 }}>
                先頭200件を表示中（全{filtered.length}件）。CSVで全件出力できます。
              </p>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#ccc", fontSize: 11, marginTop: 30, paddingBottom: 20 }}>
          Marriage Market Value Diagnosis — Admin Dashboard
        </p>
      </div>
    </div>
  );
}
