import React, { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  Search, X, ChevronUp, ChevronDown, MapPin, Package,
  DollarSign, TrendingUp, Users, RotateCcw
} from "lucide-react";

/* ----------------------------- design tokens ----------------------------- */
const COLORS = {
  paper: "#EAE6DA",
  paperDark: "#E1DCCC",
  ink: "#1C1B17",
  inkSoft: "#5B5748",
  line: "#C9C2AC",
  signal: "#B23A2E",
  teal: "#2E6B5E",
  tealDeep: "#1D473D",
  mustard: "#CC9A3B",
};

/* ------------------------------ seeded RNG -------------------------------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260709);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weightedPick = (entries) => {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rand() * total;
  for (const [val, w] of entries) { if ((r -= w) <= 0) return val; }
  return entries[0][0];
};

/* -------------------------------- reference data --------------------------- */
const MONTHS = [
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026"
];
const MONTH_SEASONALITY = [1,0.95,1,1.05,1.4,1.7,1.1,0.85,0.9,0.95,1,1.05];

const CATEGORIES = [
  { name: "Electronics", weight: 26, priceRange: [45, 420] },
  { name: "Apparel", weight: 22, priceRange: [18, 140] },
  { name: "Home & Garden", weight: 18, priceRange: [22, 260] },
  { name: "Beauty", weight: 14, priceRange: [12, 95] },
  { name: "Sports & Outdoors", weight: 12, priceRange: [20, 210] },
  { name: "Toys & Games", weight: 8, priceRange: [10, 80] },
];
const CHANNELS = [["Web", 45], ["Mobile App", 40], ["Marketplace", 15]];
const SEGMENTS = [["Returning", 50], ["New", 35], ["VIP", 15]];

/* US tile-grid coordinates (stylized cartogram, not literal geography) */
const STATE_GRID = {
  AK:[0,0], ME:[11,0],
  WA:[1,1], ID:[2,1], MT:[3,1], ND:[4,1], MN:[5,1], WI:[6,1], MI:[8,1], VT:[10,1], NH:[11,1],
  OR:[1,2], NV:[2,2], WY:[3,2], SD:[4,2], IA:[5,2], IL:[6,2], IN:[7,2], OH:[8,2], PA:[9,2], NY:[10,2], MA:[11,2],
  CA:[1,3], UT:[2,3], CO:[3,3], NE:[4,3], MO:[6,3], KY:[7,3], WV:[8,3], VA:[9,3], NJ:[10,3], CT:[11,3],
  AZ:[2,4], NM:[3,4], KS:[4,4], AR:[6,4], TN:[7,4], NC:[8,4], MD:[9,4], DE:[10,4], RI:[11,4],
  OK:[4,5], LA:[6,5], MS:[7,5], AL:[8,5], SC:[9,5], DC:[10,5],
  TX:[3,6], GA:[8,6],
  HI:[0,7], FL:[9,7],
};
const STATE_WEIGHT = {
  CA:14,TX:12,NY:10,FL:10,IL:6,PA:6,OH:5,GA:5,NC:5,MI:5,NJ:4,VA:4,WA:5,AZ:4,MA:4,
  TN:3,IN:3,MO:3,MD:3,WI:3,CO:4,MN:3,SC:3,AL:2,LA:2,KY:2,OR:3,OK:2,CT:2,UT:2,IA:2,
  NV:2,AR:2,MS:2,KS:2,NM:2,NE:1,WV:1,ID:1,HI:1,NH:1,ME:1,MT:1,RI:1,DE:1,SD:1,ND:1,
  AK:1,VT:1,WY:1,DC:2,
};
const STATE_LIST = Object.keys(STATE_GRID);

/* -------------------------------- data generation --------------------------- */
function generateOrders(count) {
  const catEntries = CATEGORIES.map((c) => [c.name, c.weight]);
  const stateEntries = STATE_LIST.map((s) => [s, STATE_WEIGHT[s]]);
  const orders = [];
  for (let i = 0; i < count; i++) {
    const monthIdx = weightedPick(MONTH_SEASONALITY.map((w, idx) => [idx, w]));
    const day = 1 + Math.floor(rand() * 27);
    const state = weightedPick(stateEntries);
    const catName = weightedPick(catEntries);
    const cat = CATEGORIES.find((c) => c.name === catName);
    const channel = weightedPick(CHANNELS);
    const segment = weightedPick(SEGMENTS);
    const qty = 1 + Math.floor(rand() * 4);
    const [lo, hi] = cat.priceRange;
    let unit = lo + rand() * (hi - lo);
    if (segment === "VIP") unit *= 1.25;
    unit *= MONTH_SEASONALITY[monthIdx] > 1.2 ? 1.08 : 1;
    const revenue = Math.round(unit * qty * 100) / 100;
    orders.push({
      id: `ORD-${(100000 + i).toString()}`,
      monthIdx,
      dateLabel: `${MONTHS[monthIdx].split(" ")[0]} ${day}, ${MONTHS[monthIdx].split(" ")[1]}`,
      sortDate: monthIdx * 31 + day,
      state,
      category: catName,
      channel,
      segment,
      qty,
      revenue,
    });
  }
  return orders;
}

/* --------------------------------- component -------------------------------- */
export default function SalesManifestDashboard() {
  const ALL_ORDERS = useMemo(() => generateOrders(7500), []);

  const [monthRange, setMonthRange] = useState([0, 11]);
  const [activeCats, setActiveCats] = useState(new Set());
  const [activeChannels, setActiveChannels] = useState(new Set());
  const [stateFilter, setStateFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("sortDate");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const toggleSet = (setter, current, value) => {
    const next = new Set(current);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
    setPage(1);
  };

  const filtered = useMemo(() => {
    return ALL_ORDERS.filter((o) => {
      if (o.monthIdx < monthRange[0] || o.monthIdx > monthRange[1]) return false;
      if (activeCats.size && !activeCats.has(o.category)) return false;
      if (activeChannels.size && !activeChannels.has(o.channel)) return false;
      if (stateFilter && o.state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.id.toLowerCase().includes(q) && !o.state.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ALL_ORDERS, monthRange, activeCats, activeChannels, stateFilter, search]);

  const kpis = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + o.revenue, 0);
    const totalOrders = filtered.length;
    const aov = totalOrders ? totalRevenue / totalOrders : 0;
    const vipShare = totalOrders
      ? filtered.filter((o) => o.segment === "VIP").length / totalOrders
      : 0;
    return { totalRevenue, totalOrders, aov, vipShare };
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const buckets = MONTHS.map((label, idx) => ({ label, revenue: 0, orders: 0 }));
    filtered.forEach((o) => {
      buckets[o.monthIdx].revenue += o.revenue;
      buckets[o.monthIdx].orders += 1;
    });
    return buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) }));
  }, [filtered]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    CATEGORIES.forEach((c) => (map[c.name] = 0));
    filtered.forEach((o) => (map[o.category] += o.revenue));
    return CATEGORIES.map((c) => ({ name: c.name, revenue: Math.round(map[c.name]) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const stateRevenue = useMemo(() => {
    const map = {};
    STATE_LIST.forEach((s) => (map[s] = 0));
    filtered.forEach((o) => (map[o.state] += o.revenue));
    return map;
  }, [filtered]);
  const maxStateRevenue = Math.max(1, ...Object.values(stateRevenue));

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const fmtMoney = (n) =>
    "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  const resetFilters = () => {
    setMonthRange([0, 11]);
    setActiveCats(new Set());
    setActiveChannels(new Set());
    setStateFilter(null);
    setSearch("");
    setPage(1);
  };

  const anyFilterActive =
    monthRange[0] !== 0 || monthRange[1] !== 11 || activeCats.size ||
    activeChannels.size || stateFilter || search;

  const SortIcon = ({ col }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : null;

  return (
    <div className="manifest-root">
      <style>{`
        .manifest-root {
          --paper: ${COLORS.paper};
          --paper-dark: ${COLORS.paperDark};
          --ink: ${COLORS.ink};
          --ink-soft: ${COLORS.inkSoft};
          --line: ${COLORS.line};
          --signal: ${COLORS.signal};
          --teal: ${COLORS.teal};
          --teal-deep: ${COLORS.tealDeep};
          --mustard: ${COLORS.mustard};
          background: var(--paper);
          color: var(--ink);
          font-family: 'Inter', sans-serif;
          padding: 28px 24px 48px;
          min-height: 100%;
          box-sizing: border-box;
        }
        .manifest-root * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .condensed { font-family: 'Barlow Condensed', sans-serif; }

        .header-strip {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 3px solid var(--ink);
          padding-bottom: 14px; margin-bottom: 4px;
        }
        .title-block { display: flex; align-items: baseline; gap: 14px; }
        .title-block h1 {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700; text-transform: uppercase;
          font-size: 34px; letter-spacing: 0.5px; margin: 0;
        }
        .title-sub { font-size: 12px; color: var(--ink-soft); letter-spacing: 1px; text-transform: uppercase; }
        .stamp {
          border: 2.5px solid var(--signal); color: var(--signal);
          font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
          text-transform: uppercase; font-size: 13px; letter-spacing: 1.5px;
          padding: 6px 12px; transform: rotate(-4deg);
          border-radius: 3px; white-space: nowrap;
        }
        .tear-line {
          height: 0; border-top: 2px dashed var(--line); margin: 10px 0 22px;
        }

        .kpi-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
          margin-bottom: 22px;
        }
        .kpi-box {
          background: var(--paper-dark);
          border: 1px solid var(--line);
          border-left: 4px solid var(--teal);
          padding: 14px 16px; border-radius: 2px;
        }
        .kpi-box.signal { border-left-color: var(--signal); }
        .kpi-box.mustard { border-left-color: var(--mustard); }
        .kpi-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
          color: var(--ink-soft); display: flex; align-items: center; gap: 6px;
          margin-bottom: 6px;
        }
        .kpi-value { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 24px; }

        .filter-bar {
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
          background: var(--paper-dark); border: 1px solid var(--line);
          padding: 12px 14px; border-radius: 2px; margin-bottom: 22px;
        }
        .chip {
          font-family: 'IBM Plex Mono', monospace; font-size: 11.5px;
          border: 1px solid var(--line); background: var(--paper);
          padding: 5px 10px; border-radius: 12px; cursor: pointer;
          color: var(--ink-soft); transition: all .12s ease; user-select: none;
        }
        .chip.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .search-wrap {
          display: flex; align-items: center; gap: 6px;
          background: var(--paper); border: 1px solid var(--line);
          padding: 5px 10px; border-radius: 4px; margin-left: auto;
        }
        .search-wrap input {
          border: none; background: transparent; outline: none;
          font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; width: 150px;
          color: var(--ink);
        }
        .reset-btn {
          display: flex; align-items: center; gap: 5px;
          font-size: 11.5px; color: var(--signal); background: none; border: none;
          cursor: pointer; font-family: 'IBM Plex Mono', monospace;
        }

        .grid-2col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-bottom: 18px; }
        .panel {
          background: var(--paper-dark); border: 1px solid var(--line);
          padding: 16px 18px; border-radius: 2px;
        }
        .panel h3 {
          font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;
          font-size: 15px; letter-spacing: 1px; margin: 0 0 12px;
          display: flex; justify-content: space-between; align-items: center;
        }

        .us-grid {
          display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px;
          aspect-ratio: 12 / 8;
        }
        .state-tile {
          font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          border-radius: 2px; cursor: pointer; color: var(--paper);
          border: 1px solid rgba(0,0,0,0.15);
        }
        .state-tile.dim { opacity: 0.35; }
        .state-tile.selected { outline: 2px solid var(--signal); outline-offset: 1px; }

        table.manifest-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; }
        table.manifest-table th {
          text-align: left; text-transform: uppercase; font-size: 10.5px;
          letter-spacing: 0.5px; color: var(--ink-soft); font-weight: 600;
          border-bottom: 2px solid var(--ink); padding: 8px 10px; cursor: pointer;
          user-select: none; white-space: nowrap;
        }
        table.manifest-table th span { display: inline-flex; align-items: center; gap: 3px; }
        table.manifest-table td { padding: 7px 10px; border-bottom: 1px dashed var(--line); }
        table.manifest-table tbody tr:hover { background: var(--paper-dark); }
        .seg-tag {
          font-size: 10px; padding: 1px 6px; border-radius: 8px; text-transform: uppercase;
        }
        .seg-VIP { background: var(--mustard); color: var(--ink); }
        .seg-New { background: var(--teal); color: var(--paper); }
        .seg-Returning { background: transparent; color: var(--ink-soft); border: 1px solid var(--line); }

        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12px; color: var(--ink-soft); }
        .pagination button {
          font-family: 'IBM Plex Mono', monospace; border: 1px solid var(--line);
          background: var(--paper); padding: 4px 10px; border-radius: 3px; cursor: pointer;
        }
        .pagination button:disabled { opacity: 0.35; cursor: default; }

        .month-scrubber { display: flex; gap: 4px; flex-wrap: wrap; }
        .month-btn {
          font-family: 'IBM Plex Mono', monospace; font-size: 10.5px;
          border: 1px solid var(--line); background: var(--paper); padding: 4px 7px;
          cursor: pointer; border-radius: 3px; color: var(--ink-soft);
        }
        .month-btn.in-range { background: var(--teal); color: var(--paper); border-color: var(--teal); }

        @media (max-width: 900px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
          .grid-2col { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* header */}
      <div className="header-strip">
        <div className="title-block">
          <h1>Sales Manifest</h1>
          <span className="title-sub">Order Ledger &middot; FY25&ndash;26</span>
        </div>
        <div className="stamp">{filtered.length.toLocaleString()} orders on file</div>
      </div>
      <div className="tear-line" />

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi-box">
          <div className="kpi-label"><DollarSign size={13} /> Total Revenue</div>
          <div className="kpi-value">{fmtMoney(kpis.totalRevenue)}</div>
        </div>
        <div className="kpi-box signal">
          <div className="kpi-label"><Package size={13} /> Orders</div>
          <div className="kpi-value">{kpis.totalOrders.toLocaleString()}</div>
        </div>
        <div className="kpi-box">
          <div className="kpi-label"><TrendingUp size={13} /> Avg Order Value</div>
          <div className="kpi-value">{fmtMoney(kpis.aov)}</div>
        </div>
        <div className="kpi-box mustard">
          <div className="kpi-label"><Users size={13} /> VIP Share</div>
          <div className="kpi-value">{(kpis.vipShare * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* filters */}
      <div className="filter-bar">
        <div className="month-scrubber">
          {MONTHS.map((m, idx) => (
            <button
              key={m}
              className={`month-btn ${idx >= monthRange[0] && idx <= monthRange[1] ? "in-range" : ""}`}
              onClick={() => {
                if (idx === monthRange[0] && idx === monthRange[1]) { setMonthRange([0, 11]); return; }
                if (idx < monthRange[0] || (idx > monthRange[0] && idx > monthRange[1])) setMonthRange([monthRange[0], idx].sort((a,b)=>a-b));
                else setMonthRange([idx, monthRange[1]].sort((a,b)=>a-b));
                setPage(1);
              }}
            >{m.split(" ")[0]}</button>
          ))}
        </div>
        {CATEGORIES.map((c) => (
          <span
            key={c.name}
            className={`chip ${activeCats.has(c.name) ? "active" : ""}`}
            onClick={() => toggleSet(setActiveCats, activeCats, c.name)}
          >{c.name}</span>
        ))}
        {CHANNELS.map(([ch]) => (
          <span
            key={ch}
            className={`chip ${activeChannels.has(ch) ? "active" : ""}`}
            onClick={() => toggleSet(setActiveChannels, activeChannels, ch)}
          >{ch}</span>
        ))}
        <div className="search-wrap">
          <Search size={13} color={COLORS.inkSoft} />
          <input
            placeholder="order id / state"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {anyFilterActive && (
          <button className="reset-btn" onClick={resetFilters}>
            <RotateCcw size={12} /> reset
          </button>
        )}
      </div>

      {/* trend + category */}
      <div className="grid-2col">
        <div className="panel">
          <h3>Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: COLORS.inkSoft }} tickFormatter={(v)=>v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: COLORS.inkSoft }} tickFormatter={(v)=>`$${Math.round(v/1000)}k`} />
              <Tooltip
                contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, background: COLORS.paper, border: `1px solid ${COLORS.line}` }}
                formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke={COLORS.tealDeep} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: COLORS.inkSoft }} tickFormatter={(v)=>`$${Math.round(v/1000)}k`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10.5, fontFamily: "IBM Plex Mono", fill: COLORS.ink }} />
              <Tooltip
                contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, background: COLORS.paper, border: `1px solid ${COLORS.line}` }}
                formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill={COLORS.mustard} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* map */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>
          <span><MapPin size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Regional Performance (tile map)</span>
          {stateFilter && (
            <span className="chip active" onClick={() => setStateFilter(null)}>
              {stateFilter} <X size={10} style={{ verticalAlign: "-1px" }} />
            </span>
          )}
        </h3>
        <div className="us-grid">
          {STATE_LIST.map((s) => {
            const [col, row] = STATE_GRID[s];
            const val = stateRevenue[s];
            const intensity = 0.15 + 0.85 * (val / maxStateRevenue);
            const dim = stateFilter && stateFilter !== s;
            return (
              <div
                key={s}
                className={`state-tile ${dim ? "dim" : ""} ${stateFilter === s ? "selected" : ""}`}
                style={{
                  gridColumn: col + 1, gridRow: row + 1,
                  background: `rgba(46, 107, 94, ${intensity})`,
                }}
                title={`${s}: ${fmtMoney(val)}`}
                onClick={() => { setStateFilter(stateFilter === s ? null : s); setPage(1); }}
              >{s}</div>
            );
          })}
        </div>
      </div>

      {/* table */}
      <div className="panel">
        <h3>Order Ledger</h3>
        <table className="manifest-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("id")}><span>Order ID <SortIcon col="id" /></span></th>
              <th onClick={() => handleSort("sortDate")}><span>Date <SortIcon col="sortDate" /></span></th>
              <th onClick={() => handleSort("state")}><span>State <SortIcon col="state" /></span></th>
              <th onClick={() => handleSort("category")}><span>Category <SortIcon col="category" /></span></th>
              <th onClick={() => handleSort("channel")}><span>Channel <SortIcon col="channel" /></span></th>
              <th>Segment</th>
              <th onClick={() => handleSort("qty")}><span>Qty <SortIcon col="qty" /></span></th>
              <th onClick={() => handleSort("revenue")}><span>Revenue <SortIcon col="revenue" /></span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.dateLabel}</td>
                <td>{o.state}</td>
                <td style={{ fontFamily: "Inter" }}>{o.category}</td>
                <td style={{ fontFamily: "Inter" }}>{o.channel}</td>
                <td><span className={`seg-tag seg-${o.segment}`}>{o.segment}</span></td>
                <td>{o.qty}</td>
                <td>{fmtMoney(o.revenue)}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 20, color: COLORS.inkSoft }}>
                No orders match these filters. Try widening the date range.
              </td></tr>
            )}
          </tbody>
        </table>
        <div className="pagination">
          <span>{sorted.length.toLocaleString()} orders &middot; page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>&larr; prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>next &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
