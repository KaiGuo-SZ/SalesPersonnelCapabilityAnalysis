(() => {
  const supervisorMapping = {
    铃兰邓门: "邓子林",
    北斗七星: "李可嘉",
    超星不凡: "薛世轩",
    纵横四海: "王佳宇",
    两广总督: "冯波",
    铃兰泽门: "付泽",
    量子启明: "冯波",
  };

  const toInt = (v) => {
    const n = parseInt(String(v ?? "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  };

  const toFloat = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeMonth = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const m = s.match(/(\d{1,2})/);
    if (!m) return s;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const cleanMoney = (v) => {
    const s = String(v ?? "")
      .trim()
      .replace(/^\"|\"$/g, "")
      .replace(/,/g, "");
    if (!s) return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const cleanPercent = (v) => {
    const s0 = String(v ?? "")
      .trim()
      .replace(/^\"|\"$/g, "");
    if (!s0) return 0;
    const s = s0.endsWith("%") ? s0.slice(0, -1) : s0;
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return 0;
    return s0.endsWith("%") ? n / 100 : n > 1 ? n / 100 : n;
  };

  const toDateTs = (v) => {
    const s0 = String(v ?? "").trim();
    if (!s0) return null;
    const s = s0.replace(/\u0000/g, "").trim();
    const m = s.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})(?:\D+(\d{1,2})\D?(\d{1,2}))?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      const hh = m[4] ? parseInt(m[4], 10) : 0;
      const mm = m[5] ? parseInt(m[5], 10) : 0;
      if (!Number.isFinite(y) || !Number.isFinite(mon) || !Number.isFinite(d)) return null;
      const dt = new Date(y, mon - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
      const ts = dt.getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    const m2 = s.match(/^\s*(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D?(\d{1,2}))?\s*$/);
    if (m2) {
      const y = new Date().getFullYear();
      const mon = parseInt(m2[1], 10);
      const d = parseInt(m2[2], 10);
      const hh = m2[3] ? parseInt(m2[3], 10) : 0;
      const mm = m2[4] ? parseInt(m2[4], 10) : 0;
      if (!Number.isFinite(mon) || !Number.isFinite(d)) return null;
      const dt = new Date(y, mon - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
      const ts = dt.getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    return null;
  };

  const fmtNum = (v, d = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "0.00";
    return Number(v).toFixed(d);
  };

  const fmtPct = (v, d = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "0.00%";
    return `${(Number(v) * 100).toFixed(d)}%`;
  };

  const fmtInt = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "0";
    return String(Math.round(Number(v)));
  };

  const extractMonitor = (className) => {
    const s = String(className ?? "");
    return s.replace(/[\(（\*].*/, "").trim();
  };

  const cleanClassName = (className) => {
    return String(className ?? "")
      .replace(/-.*/, "")
      .trim();
  };

  const normalizeClassScale = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "unknown";
    if (s === "小班") return "small";
    if (s === "中班") return "mid";
    if (s === "大班") return "large";
    return "unknown";
  };

  const classScaleScore = (t) => {
    if (t === "large") return 3;
    if (t === "mid") return 2;
    if (t === "small") return 1;
    return 0;
  };

  const classScaleLabel = (t) => {
    if (t === "small") return "小班";
    if (t === "mid") return "中班";
    if (t === "large") return "大班";
    return "未知";
  };

  const tierFromRoi = (roi) => {
    if (roi === null || roi === undefined || Number.isNaN(roi)) return "unknown";
    if (roi >= 0.8) return "head";
    if (roi >= 0.6) return "mid";
    return "tail";
  };

  const tierLabel = (tier) => {
    if (tier === "head") return "头部";
    if (tier === "mid") return "中部";
    if (tier === "tail") return "尾部";
    return "未知";
  };

  const tierStats = (rows, nameKey = "班长") => {
    const enriched = rows
      .map((r) => {
        const roi = typeof r.ROI_num === "number" ? r.ROI_num : toFloat(r.ROI_num);
        const tier = tierFromRoi(roi);
        return { ...r, ROI_num: roi, roi_tier: tier };
      })
      .filter((r) => r.roi_tier !== "unknown");
    const total = enriched.length;
    const buckets = { head: [], mid: [], tail: [] };
    enriched.forEach((r) => buckets[r.roi_tier].push(r));
    Object.keys(buckets).forEach((k) => buckets[k].sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999)));
    const pct = (n) => (total === 0 ? 0 : n / total);
    return {
      total,
      tiers: ["head", "mid", "tail"].map((t) => ({
        tier: t,
        label: tierLabel(t),
        count: buckets[t].length,
        pct: pct(buckets[t].length),
        people: buckets[t].map((r) => ({ name: r[nameKey], roi: r.ROI_num })),
      })),
    };
  };

  const groupFirst = (dst, key, value) => {
    if (dst[key] === undefined || dst[key] === null || dst[key] === "") dst[key] = value;
  };

  const safeDiv = (a, b) => {
    if (!b) return 0;
    return a / b;
  };

  const mean = (arr) => {
    const xs = (arr || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (!xs.length) return 0;
    return xs.reduce((s, x) => s + Number(x), 0) / xs.length;
  };

  const stddev = (arr) => {
    const xs = (arr || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(v)).map((v) => Number(v));
    if (!xs.length) return 0;
    const m = mean(xs);
    const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
    return Math.sqrt(v);
  };

  const linearSlope = (points) => {
    const ps = (points || [])
      .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (ps.length < 2) return 0;
    const mx = mean(ps.map((p) => p.x));
    const my = mean(ps.map((p) => p.y));
    const cov = ps.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
    const vx = ps.reduce((s, p) => s + (p.x - mx) * (p.x - mx), 0);
    if (!vx) return 0;
    return cov / vx;
  };

  const percentileFromRank = (rank, total) => {
    if (!total) return 0;
    const r = Math.max(1, Math.min(total, Number(rank) || 1));
    return r / total;
  };

  const computeDashboardData = (rawRows, opts) => {
    const monthKey = opts?.monthKey || null;
    const selectedMonths = new Set((opts?.months || []).map((x) => normalizeMonth(x)));
    const selectedCamps = new Set((opts?.camps || []).map((x) => Number(x)));
    const selectedLargeGroups = new Set((opts?.largeGroups || []).map((x) => String(x)));
    const selectedSmallGroups = new Set((opts?.smallGroups || []).map((x) => String(x)));
    const selectedTiers = new Set((opts?.tiers || []).map((x) => String(x)));
    const selectedEmployment = new Set((opts?.employmentStatuses || []).map((x) => String(x)));
    const classTypeMap = opts?.classTypeMap || {};

    const filtered = [];
    for (const r of rawRows) {
      if (monthKey) {
        const mv = normalizeMonth(r[monthKey]);
        if (selectedMonths.size > 0 && !selectedMonths.has(mv)) continue;
      }
      const camp = toInt(r["营期"]);
      if (camp === null) continue;
      if (selectedCamps.size > 0 && !selectedCamps.has(camp)) continue;
      filtered.push({ ...r, 营期_int: camp });
    }

    const smsRows = [];
    const mainRows = [];
    for (const r of filtered) {
      const cls = cleanClassName(r["班级"]);
      if (cls.includes("短信")) smsRows.push(r);
      if (selectedLargeGroups.size > 0) {
        const lg = String(r["大组"] ?? "").trim();
        if (!selectedLargeGroups.has(lg)) continue;
      }
      if (selectedSmallGroups.size > 0) {
        const sg = String(r["小组"] ?? "").trim();
        if (!selectedSmallGroups.has(sg)) continue;
      }
      mainRows.push(r);
    }

    const prepare = (rows) => {
      return rows.map((r) => {
        const cls = cleanClassName(r["班级"]);
        const camp = r.营期_int;
        const smallGroup = String(r["小组"] ?? "").trim();
        const rawMonitor = String(r["班长"] ?? "").trim();
        const monitor0 = extractMonitor(cls);
        const monitor = rawMonitor || monitor0 || smallGroup || String(r["大组"] ?? "").trim() || "未知";
        const classScaleNorm = normalizeClassScale(r["班型"]);
        const supervisor = supervisorMapping[smallGroup] || "";
        const cleaned = { ...r };
        cleaned["班级"] = cls;
        cleaned["成本"] = cleanMoney(r["总成本"] ?? r["成本"]);
        ["获客", "添加人数", "转化人数", "流水", "定金人数", "day3单数", "day4单数", "day5单数", "day6单数", "day7单数"].forEach((c) => (cleaned[c] = cleanMoney(r[c])));
        cleaned["个销占比_num"] = cleanPercent(r["个销占比"]);
        cleaned["待支付率_num"] = cleanPercent(r["待支付率"]);
        cleaned["待支付转率_num"] = cleanPercent(r["待支付转率"]);
        cleaned["定金回收率_num"] = cleanPercent(r["定金回收率"]);
        cleaned["高沉浸率_num"] = cleanPercent(r["高沉浸率"]);
        cleaned["高沉浸转率_num"] = cleanPercent(r["高沉浸转率"]);
        const totalOrders = cleaned["转化人数"];
        const dayCnt = (day) => {
          const cntKey = `day${day}单数`;
          if (Object.prototype.hasOwnProperty.call(r || {}, cntKey) && String(r?.[cntKey] ?? "").trim() !== "") return cleanMoney(r[cntKey]);
          const pctKey = `day${day}出单占比`;
          if (Object.prototype.hasOwnProperty.call(r || {}, pctKey) && String(r?.[pctKey] ?? "").trim() !== "") return totalOrders * cleanPercent(r[pctKey]);
          return 0;
        };
        cleaned["day3单数"] = dayCnt(3);
        cleaned["day4单数"] = dayCnt(4);
        cleaned["day5单数"] = dayCnt(5);
        cleaned["day6单数"] = dayCnt(6);
        cleaned["day7单数"] = dayCnt(7);
        cleaned["班长"] = monitor;
        cleaned["班长类型"] = String(classTypeMap[monitor] ?? "").trim();
        cleaned["班型_norm"] = classScaleNorm;
        cleaned["营期_int"] = camp;
        cleaned["主管"] = supervisor;
        cleaned["个销单数"] = cleaned["转化人数"] * cleaned["个销占比_num"];
        cleaned["D6_7出单数"] = cleaned["day6单数"] + cleaned["day7单数"];
        return cleaned;
      });
    };

    const mainPrepared = prepare(mainRows);
    const groupedByMonitorCamp = new Map();
    for (const r of mainPrepared) {
      const key = `${r["班长"]}||${r["营期_int"]}`;
      const cur = groupedByMonitorCamp.get(key) || {
        班长: r["班长"],
        班长类型: "",
        班型_norm: "unknown",
        班型_score: 0,
        班长Set: new Set(),
        营期: r["营期_int"],
        大组: "",
        小组: "",
        主管: "",
        添加人数: 0,
        转化人数: 0,
        成本: 0,
        流水: 0,
        day3单数: 0,
        day4单数: 0,
        day5单数: 0,
        day6单数: 0,
        day7单数: 0,
        个销单数: 0,
        D6_7出单数: 0,
        定金人数: 0,
        定金回收率_wsum: 0,
        定金回收率_w: 0,
        高沉浸率_wsum: 0,
        高沉浸率_w: 0,
        高沉浸转率_wsum: 0,
        高沉浸转率_w: 0,
        待支付率_wsum: 0,
        待支付率_w: 0,
        待支付转率_wsum: 0,
        待支付转率_w: 0,
      };
      groupFirst(cur, "班长类型", String(r["班长类型"] ?? "").trim());
      groupFirst(cur, "大组", String(r["大组"] ?? "").trim());
      groupFirst(cur, "小组", String(r["小组"] ?? "").trim());
      groupFirst(cur, "主管", String(r["主管"] ?? "").trim());
      const m = String(r["班长"] ?? "").trim();
      if (m) cur.班长Set.add(m);
      const s = classScaleScore(r["班型_norm"]);
      if (s > (cur["班型_score"] || 0)) {
        cur["班型_score"] = s;
        cur["班型_norm"] = r["班型_norm"];
      }
      cur["添加人数"] += r["添加人数"];
      cur["转化人数"] += r["转化人数"];
      cur["成本"] += r["成本"];
      cur["流水"] += r["流水"];
      cur["day3单数"] += r["day3单数"];
      cur["day4单数"] += r["day4单数"];
      cur["day5单数"] += r["day5单数"];
      cur["day6单数"] += r["day6单数"];
      cur["day7单数"] += r["day7单数"];
      cur["个销单数"] += r["个销单数"];
      cur["D6_7出单数"] += r["D6_7出单数"];
      cur["定金人数"] += Number(r["定金人数"] || 0);
      const wDep = Number(r["定金人数"] || 0);
      cur["定金回收率_wsum"] += (Number(r["定金回收率_num"] || 0) || 0) * wDep;
      cur["定金回收率_w"] += wDep;
      const wAdd = Number(r["添加人数"] || 0);
      cur["高沉浸率_wsum"] += (Number(r["高沉浸率_num"] || 0) || 0) * wAdd;
      cur["高沉浸率_w"] += wAdd;
      cur["高沉浸转率_wsum"] += (Number(r["高沉浸转率_num"] || 0) || 0) * wAdd;
      cur["高沉浸转率_w"] += wAdd;
      const w = r["转化人数"];
      cur["待支付率_wsum"] += (r["待支付率_num"] || 0) * w;
      cur["待支付率_w"] += w;
      cur["待支付转率_wsum"] += (r["待支付转率_num"] || 0) * w;
      cur["待支付转率_w"] += w;
      groupedByMonitorCamp.set(key, cur);
    }

    for (const v of groupedByMonitorCamp.values()) {
      v["班长数"] = v.班长Set ? v.班长Set.size : 0;
      v["班型"] = classScaleLabel(v["班型_norm"]);
      v["day3转率_num"] = safeDiv(v["day3单数"], v["添加人数"]);
      v["day4转率_num"] = safeDiv(v["day4单数"], v["添加人数"]);
      v["day5转率_num"] = safeDiv(v["day5单数"], v["添加人数"]);
      v["day6转率_num"] = safeDiv(v["day6单数"], v["添加人数"]);
      v["day7转率_num"] = safeDiv(v["day7单数"], v["添加人数"]);
      v["D3出单占比_num"] = safeDiv(v["day3单数"], v["转化人数"]);
      v["待支付率_num"] = safeDiv(v["待支付率_wsum"], v["待支付率_w"]);
      v["待支付转率_num"] = safeDiv(v["待支付转率_wsum"], v["待支付转率_w"]);
      v["定金回收率_num"] = safeDiv(v["定金回收率_wsum"], v["定金回收率_w"]);
      v["高沉浸率_num"] = safeDiv(v["高沉浸率_wsum"], v["高沉浸率_w"]);
      v["高沉浸转率_num"] = safeDiv(v["高沉浸转率_wsum"], v["高沉浸转率_w"]);
      delete v.班长Set;
      delete v.班型_score;
    }

    let groupedRows = Array.from(groupedByMonitorCamp.values());

    if (selectedEmployment.size > 0) {
      groupedRows = groupedRows.filter((r) => {
        const t0 = String(r["班长类型"] ?? "").trim();
        const t = t0 ? t0 : "未知";
        return selectedEmployment.has(t);
      });
    }

    if (selectedTiers.size > 0) {
      const agg = new Map();
      for (const r of groupedRows) {
        const m = String(r["班长"] ?? "");
        const cur = agg.get(m) || { flow: 0, cost: 0 };
        cur.flow += r["流水"] || 0;
        cur.cost += r["成本"] || 0;
        agg.set(m, cur);
      }
      const allow = new Set();
      for (const [m, v] of agg.entries()) {
        const roi = safeDiv(v.flow, v.cost);
        const tier = tierFromRoi(roi);
        if (selectedTiers.has(tier)) allow.add(m);
      }
      groupedRows = groupedRows.filter((r) => allow.has(String(r["班长"] ?? "")));
    }

    const campArpuMarket = new Map();
    for (const r of groupedRows) {
      const camp = r["营期"];
      const cur = campArpuMarket.get(camp) || { flow: 0, add: 0 };
      cur.flow += r["流水"] || 0;
      cur.add += r["添加人数"] || 0;
      campArpuMarket.set(camp, cur);
    }
    for (const [camp, v] of campArpuMarket.entries()) {
      campArpuMarket.set(camp, v.add ? v.flow / v.add : 0);
    }

    const campRoiMarket = new Map();
    for (const r of groupedRows) {
      const camp = r["营期"];
      const cur = campRoiMarket.get(camp) || { flow: 0, cost: 0 };
      cur.flow += r["流水"] || 0;
      cur.cost += r["成本"] || 0;
      campRoiMarket.set(camp, cur);
    }
    for (const [camp, v] of campRoiMarket.entries()) {
      campRoiMarket.set(camp, v.cost ? v.flow / v.cost : 0);
    }

    const campCvrMarket = new Map();
    for (const r of groupedRows) {
      const camp = r["营期"];
      const cur = campCvrMarket.get(camp) || { order: 0, add: 0 };
      cur.order += r["转化人数"] || 0;
      cur.add += r["添加人数"] || 0;
      campCvrMarket.set(camp, cur);
    }
    for (const [camp, v] of campCvrMarket.entries()) {
      campCvrMarket.set(camp, v.add ? v.order / v.add : 0);
    }

    for (const r of groupedRows) {
      const marketArpu = campArpuMarket.get(r["营期"]) || 0;
      const arpu = safeDiv(r["流水"], r["添加人数"]);
      r["超大盘次数"] = arpu > marketArpu ? 1 : 0;
    }

    const monitorAgg = new Map();
    for (const r of groupedRows) {
      const key = r["班长"];
      const cur = monitorAgg.get(key) || {
        班长: r["班长"],
        班长类型: "",
        大组: r["大组"],
        小组: r["小组"],
        添加数: 0,
        总单数: 0,
        总成本: 0,
        总流水: 0,
        个销单数_sum: 0,
        D6_7出单数: 0,
        超大盘次数: 0,
        campSet: new Set(),
      };
      groupFirst(cur, "班长类型", String(r["班长类型"] ?? "").trim());
      cur["添加数"] += r["添加人数"];
      cur["总单数"] += r["转化人数"];
      cur["总成本"] += r["成本"];
      cur["总流水"] += r["流水"];
      cur["个销单数_sum"] += r["个销单数"];
      cur["D6_7出单数"] += r["D6_7出单数"];
      cur["超大盘次数"] += r["超大盘次数"];
      cur.campSet.add(r["营期"]);
      monitorAgg.set(key, cur);
    }

    const monitorTable = [];
    for (const v of monitorAgg.values()) {
      const 接量营期数 = v.campSet.size;
      const 转化率_num = safeDiv(v["总单数"], v["添加数"]);
      const ROI_num = safeDiv(v["总流水"], v["总成本"]);
      const 添加产值_num = safeDiv(v["总流水"], v["添加数"]);
      const 个销占比_num = safeDiv(v["个销单数_sum"], v["总单数"]);
      const D6_7转率_num = safeDiv(v["D6_7出单数"], v["总单数"]);
      const 超大盘率_num = safeDiv(v["超大盘次数"], 接量营期数);
      const row = {
        大组: v["大组"],
        小组: v["小组"],
        班长: v["班长"],
        班长类型: String(v["班长类型"] ?? "").trim(),
        添加数: fmtInt(v["添加数"]),
        总单数: fmtInt(v["总单数"]),
        转化率: fmtPct(转化率_num),
        总成本: fmtNum(v["总成本"], 2),
        总流水: fmtNum(v["总流水"], 2),
        ROI: fmtNum(ROI_num, 2),
        添加产值: fmtNum(添加产值_num, 2),
        个销占比: fmtPct(个销占比_num),
        "D6-7出单数": fmtInt(v["D6_7出单数"]),
        "D6-7转率": fmtPct(D6_7转率_num),
        接量营期数: fmtInt(接量营期数),
        超大盘次数: fmtInt(v["超大盘次数"]),
        超大盘率: fmtPct(超大盘率_num),
        ROI_num,
        转化率_num,
        个销占比_num,
        "D6-7转率_num": D6_7转率_num,
        超大盘率_num,
        添加产值_num,
        总流水_num: v["总流水"],
        总成本_num: v["总成本"],
        添加数_num: v["添加数"],
        总单数_num: v["总单数"],
        roi_tier: tierFromRoi(ROI_num),
      };
      monitorTable.push(row);
    }
    monitorTable.sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));

    const overallTotalFlow = monitorTable.reduce((s, r) => s + (r.总流水_num || 0), 0);
    const overallTotalCost = monitorTable.reduce((s, r) => s + (r.总成本_num || 0), 0);
    const overallTotalAdd = monitorTable.reduce((s, r) => s + (r.添加数_num || 0), 0);
    const overallTotalOrders = monitorTable.reduce((s, r) => s + (r.总单数_num || 0), 0);

    const overall = {
      总流水: overallTotalFlow,
      总成本: overallTotalCost,
      添加数: overallTotalAdd,
      总单数: overallTotalOrders,
      ROI: safeDiv(overallTotalFlow, overallTotalCost),
      转化率: safeDiv(overallTotalOrders, overallTotalAdd),
      添加产值: safeDiv(overallTotalFlow, overallTotalAdd),
      班长数: monitorTable.length,
    };

    const aggGroup = (keyName) => {
      const m = new Map();
      for (const r of groupedRows) {
        const k = String(r[keyName] ?? "").trim();
        if (!k) continue;
        const cur = m.get(k) || {
          [keyName]: k,
          添加数: 0,
          总单数: 0,
          总成本: 0,
          总流水: 0,
          个销单数_sum: 0,
          D6_7出单数: 0,
          超大盘次数: 0,
          班长Set: new Set(),
          总营期数: 0,
        };
        cur["添加数"] += r["添加人数"];
        cur["总单数"] += r["转化人数"];
        cur["总成本"] += r["成本"];
        cur["总流水"] += r["流水"];
        cur["个销单数_sum"] += r["个销单数"];
        cur["D6_7出单数"] += r["D6_7出单数"];
        cur["超大盘次数"] += r["超大盘次数"];
        cur["总营期数"] += 1;
        cur.班长Set.add(r["班长"]);
        m.set(k, cur);
      }
      const out = [];
      for (const v of m.values()) {
        const 班长数 = v.班长Set.size;
        const 转化率_num = safeDiv(v["总单数"], v["添加数"]);
        const ROI_num = safeDiv(v["总流水"], v["总成本"]);
        const 人均承载_num = safeDiv(v["添加数"], 班长数);
        const 添加产值_num = safeDiv(v["总流水"], v["添加数"]);
        const 个销占比_num = safeDiv(v["个销单数_sum"], v["总单数"]);
        const D6_7转率_num = safeDiv(v["D6_7出单数"], v["总单数"]);
        const 超大盘率_num = safeDiv(v["超大盘次数"], v["总营期数"]);
        out.push({
          [keyName]: v[keyName],
          转化率: fmtPct(转化率_num),
          ROI: fmtNum(ROI_num, 2),
          人均承载: fmtNum(人均承载_num, 2),
          添加产值: fmtNum(添加产值_num, 2),
          个销占比: fmtPct(个销占比_num),
          "D6-7转率": fmtPct(D6_7转率_num),
          超大盘率: fmtPct(超大盘率_num),
          ROI_num,
          转化率_num,
          人均承载_num,
          添加产值_num,
          个销占比_num,
          "D6-7转率_num": D6_7转率_num,
          超大盘率_num,
        });
      }
      out.sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));
      return out;
    };

    const largeGroupTable = aggGroup("大组");
    const supervisorTable = aggGroup("主管");
    const smallGroupTable = aggGroup("小组");

    const overallTier = tierStats(monitorTable, "班长");
    const byLarge = {};
    const byGroup = new Map();
    for (const r of monitorTable) {
      const g = String(r["大组"] ?? "").trim();
      if (!g) continue;
      const arr = byGroup.get(g) || [];
      arr.push(r);
      byGroup.set(g, arr);
    }
    for (const [g, arr] of byGroup.entries()) {
      byLarge[g] = tierStats(arr, "班长");
    }

    const buildTypeDist = (monitorRows) => {
      const rows = (monitorRows || []).map((r) => String(r["班长类型"] ?? "").trim());
      const total = rows.length;
      const cnt = { 老: 0, 新: 0, 回流: 0, 未知: 0 };
      rows.forEach((t) => {
        if (t === "老") cnt["老"] += 1;
        else if (t === "新") cnt["新"] += 1;
        else if (t === "回流") cnt["回流"] += 1;
        else cnt["未知"] += 1;
      });
      const items = ["老", "回流", "新", "未知"].map((k) => ({
        type: k,
        count: cnt[k],
        pct: total ? cnt[k] / total : 0,
      }));
      return { total, items };
    };

    const monitorTierMap = new Map(monitorTable.map((r) => [String(r["班长"]), r.roi_tier]));

    const typeMetrics = (() => {
      const groups = new Map();
      for (const r of groupedRows) {
        const type0 = String(r["班长类型"] ?? "").trim() || "未知";
        const lg = String(r["大组"] ?? "").trim() || "-";
        const key = `${type0}||${lg}`;
        const cur = groups.get(key) || {
          班长类型: type0,
          大组: lg,
          添加数: 0,
          总单数: 0,
          总成本: 0,
          总流水: 0,
          个销单数_sum: 0,
          D6_7出单数: 0,
          超大盘次数: 0,
          总营期数: 0,
          班长Set: new Set(),
          head: 0,
          mid: 0,
          tail: 0,
        };
        cur["添加数"] += r["添加人数"];
        cur["总单数"] += r["转化人数"];
        cur["总成本"] += r["成本"];
        cur["总流水"] += r["流水"];
        cur["个销单数_sum"] += r["个销单数"];
        cur["D6_7出单数"] += r["D6_7出单数"];
        cur["超大盘次数"] += r["超大盘次数"];
        cur["总营期数"] += 1;
        const monitor = String(r["班长"]);
        if (!cur.班长Set.has(monitor)) {
          cur.班长Set.add(monitor);
          const tier = monitorTierMap.get(monitor);
          if (tier === "head") cur.head += 1;
          else if (tier === "mid") cur.mid += 1;
          else if (tier === "tail") cur.tail += 1;
        }
        groups.set(key, cur);
      }

      const addSummaryRows = new Map();
      for (const v of groups.values()) {
        const key = `${v["班长类型"]}||整体`;
        const cur = addSummaryRows.get(key) || {
          班长类型: v["班长类型"],
          大组: "整体",
          添加数: 0,
          总单数: 0,
          总成本: 0,
          总流水: 0,
          个销单数_sum: 0,
          D6_7出单数: 0,
          超大盘次数: 0,
          总营期数: 0,
          班长Set: new Set(),
          head: 0,
          mid: 0,
          tail: 0,
        };
        cur["添加数"] += v["添加数"];
        cur["总单数"] += v["总单数"];
        cur["总成本"] += v["总成本"];
        cur["总流水"] += v["总流水"];
        cur["个销单数_sum"] += v["个销单数_sum"];
        cur["D6_7出单数"] += v["D6_7出单数"];
        cur["超大盘次数"] += v["超大盘次数"];
        cur["总营期数"] += v["总营期数"];
        v.班长Set.forEach((m) => cur.班长Set.add(m));
        cur.head += v.head;
        cur.mid += v.mid;
        cur.tail += v.tail;
        addSummaryRows.set(key, cur);
      }

      const all = Array.from(groups.values()).concat(Array.from(addSummaryRows.values()));
      const out = all.map((v) => {
        const 班长数 = v.班长Set.size;
        const 转化率_num = safeDiv(v["总单数"], v["添加数"]);
        const ROI_num = safeDiv(v["总流水"], v["总成本"]);
        const 人均承载_num = safeDiv(v["添加数"], 班长数);
        const 添加产值_num = safeDiv(v["总流水"], v["添加数"]);
        const 个销占比_num = safeDiv(v["个销单数_sum"], v["总单数"]);
        const D6_7转率_num = safeDiv(v["D6_7出单数"], v["总单数"]);
        const 超大盘率_num = safeDiv(v["超大盘次数"], v["总营期数"]);
        const headPct_num = 班长数 ? v.head / 班长数 : 0;
        const midPct_num = 班长数 ? v.mid / 班长数 : 0;
        const tailPct_num = 班长数 ? v.tail / 班长数 : 0;
        return {
          班长类型: v["班长类型"],
          大组: v["大组"],
          班长数: fmtInt(班长数),
          转化率: fmtPct(转化率_num),
          ROI: fmtNum(ROI_num, 2),
          人均承载: fmtNum(人均承载_num, 2),
          添加产值: fmtNum(添加产值_num, 2),
          个销占比: fmtPct(个销占比_num),
          "D6-7转率": fmtPct(D6_7转率_num),
          超大盘率: fmtPct(超大盘率_num),
          头部占比: fmtPct(headPct_num),
          中部占比: fmtPct(midPct_num),
          尾部占比: fmtPct(tailPct_num),
          ROI_num,
          转化率_num,
          人均承载_num,
          添加产值_num,
          个销占比_num,
          "D6-7转率_num": D6_7转率_num,
          超大盘率_num,
          头部占比_num: headPct_num,
          中部占比_num: midPct_num,
          尾部占比_num: tailPct_num,
        };
      });
      out.sort((a, b) => {
        const t = String(a["班长类型"]).localeCompare(String(b["班长类型"]), "zh");
        if (t !== 0) return t;
        const aO = a["大组"] === "整体" ? 0 : 1;
        const bO = b["大组"] === "整体" ? 0 : 1;
        if (aO !== bO) return aO - bO;
        return String(a["大组"]).localeCompare(String(b["大组"]), "zh");
      });
      return out;
    })();

    const monitorCampTable = (() => {
      const allowMonitors = new Set(groupedRows.map((r) => String(r["班长"] ?? "").trim()).filter((x) => x));
      const grouped = new Map();
      for (const r of mainPrepared) {
        const monitor = String(r["班长"] ?? "").trim();
        if (!monitor || (allowMonitors.size > 0 && !allowMonitors.has(monitor))) continue;
        const project = String(r["项目"] ?? "").trim();
        const camp = r["营期_int"];
        const openTime = String(r["开营时间"] ?? "").trim();
        const key = `${monitor}||${project}||${camp}||${openTime}`;
        const cur = grouped.get(key) || {
          项目: project,
          班长: monitor,
          班长类型: "",
          班型_norm: "unknown",
          班型_score: 0,
          班长Set: new Set(),
          营期: camp,
          开营时间: openTime,
          开营时间_ts: null,
          大组: "",
          小组: "",
          添加数_num: 0,
          总单数_num: 0,
          总成本_num: 0,
          总流水_num: 0,
          day3单数: 0,
          day4单数: 0,
          day5单数: 0,
          day6单数: 0,
          day7单数: 0,
          个销单数: 0,
          D6_7出单数: 0,
          定金人数: 0,
          定金回收率_wsum: 0,
          定金回收率_w: 0,
          高沉浸率_wsum: 0,
          高沉浸率_w: 0,
          高沉浸转率_wsum: 0,
          高沉浸转率_w: 0,
          待支付率_wsum: 0,
          待支付率_w: 0,
          待支付转率_wsum: 0,
          待支付转率_w: 0,
        };
        groupFirst(cur, "班长类型", String(r["班长类型"] ?? "").trim());
        groupFirst(cur, "大组", String(r["大组"] ?? "").trim());
        groupFirst(cur, "小组", String(r["小组"] ?? "").trim());
        const m = String(r["班长"] ?? "").trim();
        if (m) cur.班长Set.add(m);
        const s = classScaleScore(r["班型_norm"]);
        if (s > (cur["班型_score"] || 0)) {
          cur["班型_score"] = s;
          cur["班型_norm"] = r["班型_norm"];
        }
        const openTs = toDateTs(openTime);
        if (openTs !== null && openTs !== undefined && Number.isFinite(openTs)) {
          const prev = cur["开营时间_ts"];
          if (prev === null || prev === undefined || !Number.isFinite(prev) || openTs > prev) cur["开营时间_ts"] = openTs;
        }
        cur["添加数_num"] += Number(r["添加人数"] || 0);
        cur["总单数_num"] += Number(r["转化人数"] || 0);
        cur["总成本_num"] += Number(r["成本"] || 0);
        cur["总流水_num"] += Number(r["流水"] || 0);
        cur["day3单数"] += Number(r["day3单数"] || 0);
        cur["day4单数"] += Number(r["day4单数"] || 0);
        cur["day5单数"] += Number(r["day5单数"] || 0);
        cur["day6单数"] += Number(r["day6单数"] || 0);
        cur["day7单数"] += Number(r["day7单数"] || 0);
        cur["个销单数"] += Number(r["个销单数"] || 0);
        cur["D6_7出单数"] += Number(r["D6_7出单数"] || 0);
        cur["定金人数"] += Number(r["定金人数"] || 0);
        const wDep = Number(r["定金人数"] || 0);
        cur["定金回收率_wsum"] += (Number(r["定金回收率_num"] || 0) || 0) * wDep;
        cur["定金回收率_w"] += wDep;
        const wAdd = Number(r["添加人数"] || 0);
        cur["高沉浸率_wsum"] += (Number(r["高沉浸率_num"] || 0) || 0) * wAdd;
        cur["高沉浸率_w"] += wAdd;
        cur["高沉浸转率_wsum"] += (Number(r["高沉浸转率_num"] || 0) || 0) * wAdd;
        cur["高沉浸转率_w"] += wAdd;
        const w = Number(r["转化人数"] || 0);
        cur["待支付率_wsum"] += (Number(r["待支付率_num"] || 0) || 0) * w;
        cur["待支付率_w"] += w;
        cur["待支付转率_wsum"] += (Number(r["待支付转率_num"] || 0) || 0) * w;
        cur["待支付转率_w"] += w;
        grouped.set(key, cur);
      }
      const out = Array.from(grouped.values()).map((v) => {
        const 添加数_num = v["添加数_num"];
        const 总单数_num = v["总单数_num"];
        const 总成本_num = v["总成本_num"];
        const 总流水_num = v["总流水_num"];
        const 转化率_num = safeDiv(总单数_num, 添加数_num);
        const ROI_num = safeDiv(总流水_num, 总成本_num);
        const 添加产值_num = safeDiv(总流水_num, 添加数_num);
        const 个销占比_num = safeDiv(v["个销单数"], 总单数_num);
        const D6_7转率_num = safeDiv(v["D6_7出单数"], 总单数_num);
        const day3转率_num = safeDiv(v["day3单数"], 添加数_num);
        const day4转率_num = safeDiv(v["day4单数"], 添加数_num);
        const day5转率_num = safeDiv(v["day5单数"], 添加数_num);
        const day6转率_num = safeDiv(v["day6单数"], 添加数_num);
        const day7转率_num = safeDiv(v["day7单数"], 添加数_num);
        const D3出单占比_num = safeDiv(v["day3单数"], 总单数_num);
        const 待支付率_num = safeDiv(v["待支付率_wsum"], v["待支付率_w"]);
        const 待支付转率_num = safeDiv(v["待支付转率_wsum"], v["待支付转率_w"]);
        const 定金回收率_num = safeDiv(v["定金回收率_wsum"], v["定金回收率_w"]);
        const 高沉浸率_num = safeDiv(v["高沉浸率_wsum"], v["高沉浸率_w"]);
        const 高沉浸转率_num = safeDiv(v["高沉浸转率_wsum"], v["高沉浸转率_w"]);
        const 班长数_num = v.班长Set ? v.班长Set.size : 0;
        return {
          项目: v["项目"],
          大组: v["大组"],
          小组: v["小组"],
          班长: v["班长"],
          班长类型: String(v["班长类型"] ?? "").trim() || "未知",
          班型: classScaleLabel(v["班型_norm"]),
          班型_norm: v["班型_norm"],
          班长数: fmtInt(班长数_num),
          营期: v["营期"],
          开营时间: v["开营时间"],
          开营时间_ts: v["开营时间_ts"],
          添加数: fmtInt(添加数_num),
          总单数: fmtInt(总单数_num),
          转化率: fmtPct(转化率_num),
          ROI: fmtNum(ROI_num, 2),
          添加产值: fmtNum(添加产值_num, 2),
          总成本: fmtNum(总成本_num, 0),
          总流水: fmtNum(总流水_num, 0),
          超大盘: "否",
          "D3出单占比": fmtPct(D3出单占比_num, 1),
          day3转率: fmtPct(day3转率_num, 2),
          day4转率: fmtPct(day4转率_num, 2),
          day5转率: fmtPct(day5转率_num, 2),
          day6转率: fmtPct(day6转率_num, 2),
          day7转率: fmtPct(day7转率_num, 2),
          "D6-7转率": fmtPct(D6_7转率_num),
          待支付率: fmtPct(待支付率_num, 1),
          待支付转率: fmtPct(待支付转率_num, 1),
          定金人数: fmtInt(v["定金人数"]),
          定金回收率: fmtPct(定金回收率_num, 1),
          高沉浸率: fmtPct(高沉浸率_num, 1),
          高沉浸转率: fmtPct(高沉浸转率_num, 1),
          个销占比: fmtPct(个销占比_num),
          ROI_num,
          转化率_num,
          添加产值_num,
          添加数_num,
          总单数_num,
          总成本_num,
          总流水_num,
          班长数_num,
          "D3出单占比_num": D3出单占比_num,
          day3转率_num,
          day4转率_num,
          day5转率_num,
          day6转率_num,
          day7转率_num,
          "D6-7转率_num": D6_7转率_num,
          待支付率_num,
          待支付转率_num,
          定金人数_num: Number(v["定金人数"] || 0),
          定金回收率_num,
          高沉浸率_num,
          高沉浸转率_num,
          个销占比_num,
          超大盘_bool: false,
        };
      });

      const marketArpuMap = new Map();
      out.forEach((r) => {
        const proj = String(r["项目"] ?? "").trim();
        const camp = r["营期"];
        const ot = r["开营时间_ts"];
        const key = `${proj}||${camp}||${ot}`;
        const cur = marketArpuMap.get(key) || { flow: 0, add: 0 };
        cur.flow += Number(r["总流水_num"] || 0);
        cur.add += Number(r["添加数_num"] || 0);
        marketArpuMap.set(key, cur);
      });
      for (const [k, v] of marketArpuMap.entries()) marketArpuMap.set(k, v.add ? v.flow / v.add : 0);
      out.forEach((r) => {
        const proj = String(r["项目"] ?? "").trim();
        const camp = r["营期"];
        const ot = r["开营时间_ts"];
        const key = `${proj}||${camp}||${ot}`;
        const marketArpu = Number(marketArpuMap.get(key) || 0);
        const arpu = Number(r["添加产值_num"] || 0);
        r["超大盘_bool"] = arpu > marketArpu;
        r["超大盘"] = r["超大盘_bool"] ? "是" : "否";
      });

      out.sort((a, b) => {
        const at = a["开营时间_ts"];
        const bt = b["开营时间_ts"];
        const an = at === null || at === undefined || Number.isNaN(at) ? Number.NEGATIVE_INFINITY : Number(at);
        const bn = bt === null || bt === undefined || Number.isNaN(bt) ? Number.NEGATIVE_INFINITY : Number(bt);
        if (an !== bn) return an - bn;
        return (a.营期 ?? 0) - (b.营期 ?? 0);
      });
      out.forEach((v) => {
        delete v.班型_score;
        delete v.班长Set;
      });
      return out;
    })();

    const campToRows = new Map();
    for (const r of monitorCampTable) {
      const camp = r["营期"];
      const arr = campToRows.get(camp) || [];
      arr.push(r);
      campToRows.set(camp, arr);
    }

    for (const [, arr] of campToRows.entries()) {
      const sorted = arr.slice().sort((a, b) => (b["添加产值_num"] ?? -999) - (a["添加产值_num"] ?? -999));
      const m = mean(sorted.map((r) => r["添加产值_num"]));
      const sd = stddev(sorted.map((r) => r["添加产值_num"]));
      const total = sorted.length;
      sorted.forEach((r, idx) => {
        const rank = idx + 1;
        const pct = percentileFromRank(rank, total);
        const z = sd ? (Number(r["添加产值_num"] || 0) - m) / sd : 0;
        r["添加产值百分位_num"] = pct;
        r["添加产值百分位"] = fmtPct(pct, 0);
        r["Z_score_num"] = z;
        r["Z_score"] = fmtNum(z, 2);
      });
    }

    const campRowsByMonitor = new Map();
    for (const r of monitorCampTable) {
      const m = String(r["班长"] ?? "");
      const arr = campRowsByMonitor.get(m) || [];
      arr.push(r);
      campRowsByMonitor.set(m, arr);
    }

    const sortPerformanceRows = (rows) => {
      rows.sort((a, b) => {
        const ap = a["平均百分位_num"];
        const bp = b["平均百分位_num"];
        const aV = ap === null || ap === undefined || Number.isNaN(ap) ? Number.POSITIVE_INFINITY : Number(ap);
        const bV = bp === null || bp === undefined || Number.isNaN(bp) ? Number.POSITIVE_INFINITY : Number(bp);
        if (aV !== bV) return aV - bV;
        return (b["添加产值_num"] ?? -999) - (a["添加产值_num"] ?? -999);
      });
      return rows;
    };

    const buildPerformanceOutputs = (recentLimit = null) => {
      const table = [];
      const trends = {};
      for (const [m, arr] of campRowsByMonitor.entries()) {
        const rowsSorted = arr.slice().sort((a, b) => {
          const at = a["开营时间_ts"];
          const bt = b["开营时间_ts"];
          const an = at === null || at === undefined || Number.isNaN(at) ? Number.NEGATIVE_INFINITY : Number(at);
          const bn = bt === null || bt === undefined || Number.isNaN(bt) ? Number.NEGATIVE_INFINITY : Number(bt);
          if (an !== bn) return an - bn;
          return (a["营期"] ?? 0) - (b["营期"] ?? 0);
        });
        const rows = rowsSorted.slice(recentLimit && recentLimit > 0 ? -recentLimit : 0);
        if (!rows.length) continue;
        const first = rows[0] || {};
        const addSum = rows.reduce((s, x) => s + Number(x["添加数_num"] || 0), 0);
        const orderSum = rows.reduce((s, x) => s + Number(x["总单数_num"] || 0), 0);
        const costSum = rows.reduce((s, x) => s + Number(x["总成本_num"] || 0), 0);
        const flowSum = rows.reduce((s, x) => s + Number(x["总流水_num"] || 0), 0);
        const personalOrderSum = rows.reduce((s, x) => s + Number(x["个销占比_num"] || 0) * Number(x["总单数_num"] || 0), 0);
        const aboveCnt = rows.reduce((s, x) => s + (x["超大盘_bool"] ? 1 : 0), 0);
        const campArpu = rows.map((x) => x["添加产值_num"]);
        const meanArpu = mean(campArpu);
        const sdArpu = stddev(campArpu);
        const cv = meanArpu ? sdArpu / meanArpu : 0;
        const slope = linearSlope(rows.map((x) => ({ x: x["营期"], y: x["添加产值_num"] })));
        const avgPct = mean(rows.map((x) => x["添加产值百分位_num"]));
        const ROI_num = safeDiv(flowSum, costSum);
        const 转化率_num = safeDiv(orderSum, addSum);
        const 均承载_num = safeDiv(addSum, rows.length);
        const 添加成本_num = safeDiv(costSum, addSum);
        const 添加产值_num = safeDiv(flowSum, addSum);
        const 个销占比_num = safeDiv(personalOrderSum, orderSum);
        const 超大盘率_num = safeDiv(aboveCnt, rows.length);
        const 客单价_num = safeDiv(flowSum, orderSum);
        table.push({
          大组: first["大组"],
          小组: first["小组"],
          班长: m,
          ROI: fmtNum(ROI_num, 2),
          转化率: fmtPct(转化率_num),
          个销占比: fmtPct(个销占比_num),
          均承载: fmtInt(均承载_num),
          添加成本: fmtNum(添加成本_num, 2),
          添加产值: fmtNum(添加产值_num, 2),
          营期数: fmtInt(rows.length),
          超大盘率: fmtPct(超大盘率_num),
          平均百分位: fmtPct(avgPct, 0),
          客单价: fmtNum(客单价_num, 2),
          标准差: fmtNum(sdArpu, 2),
          CV: fmtNum(cv, 2),
          趋势斜率: fmtNum(slope, 4),
          ROI_num,
          转化率_num,
          个销占比_num,
          均承载_num,
          添加成本_num,
          添加产值_num,
          营期数_num: rows.length,
          超大盘率_num,
          平均百分位_num: avgPct,
          客单价_num,
          标准差_num: sdArpu,
          CV_num: cv,
          趋势斜率_num: slope,
        });
        trends[m] = {
          camps: rows.map((r) => r["营期"]),
          open_ts: rows.map((r) => r["开营时间_ts"]),
          roi: rows.map((r) => r["ROI_num"]),
          market_roi: rows.map((r) => campRoiMarket.get(r["营期"]) || 0),
          arpu: rows.map((r) => r["添加产值_num"]),
          market_arpu: rows.map((r) => campArpuMarket.get(r["营期"]) || 0),
          cvr: rows.map((r) => r["转化率_num"]),
          z: rows.map((r) => r["Z_score_num"]),
        };
      }
      return { table: sortPerformanceRows(table), trends };
    };

    const performanceAll = buildPerformanceOutputs();
    const performanceLast3 = buildPerformanceOutputs(3);

    const upgrade = (() => {
      const fmtMom = (cur0, prev0) => {
        const cur = Number(cur0);
        const prev = Number(prev0);
        if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return "-";
        const v = (cur - prev) / prev;
        if (!Number.isFinite(v)) return "-";
        const s = `${(v * 100).toFixed(1)}%`;
        return v > 0 ? `+${s}` : s;
      };

      const campAgg = new Map();
      const monitorAll = new Set();
      const upgradeMonitors = new Set();
      for (const r of groupedRows) {
        const camp = Number(r["营期"]);
        const m = String(r["班长"] ?? "").trim();
        if (!m) continue;
        monitorAll.add(m);
        const t = String(r["班型_norm"] ?? "unknown");
        if (t === "mid" || t === "large") upgradeMonitors.add(m);
        const cur = campAgg.get(camp) || { total: 0, small: 0, mid: 0, large: 0, unknown: 0, add: 0 };
        cur.total += 1;
        if (t === "small") cur.small += 1;
        else if (t === "mid") cur.mid += 1;
        else if (t === "large") cur.large += 1;
        else cur.unknown += 1;
        cur.add += Number(r["添加人数"] || 0);
        campAgg.set(camp, cur);
      }

      const camps = Array.from(campAgg.keys()).sort((a, b) => a - b);
      const byCamp = camps.map((camp) => {
        const v = campAgg.get(camp) || { total: 0, small: 0, mid: 0, large: 0, unknown: 0, add: 0 };
        const upgradeCnt = v.mid + v.large;
        const upgradeRate = safeDiv(upgradeCnt, v.total);
        const midRate = safeDiv(v.mid, v.total);
        const largeRate = safeDiv(v.large, v.total);
        const peopleEff = safeDiv(v.add, v.total);
        return {
          营期: camp,
          班长数: v.total,
          小班班长数: v.small,
          中班班长数: v.mid,
          大班班长数: v.large,
          未知班长数: v.unknown,
          升班班长数: upgradeCnt,
          添加人数_sum: v.add,
          升班率_num: upgradeRate,
          中班率_num: midRate,
          大班率_num: largeRate,
          人效_num: peopleEff,
          升班率: fmtPct(upgradeRate, 2),
          中班率: fmtPct(midRate, 2),
          大班率: fmtPct(largeRate, 2),
          人效: fmtNum(peopleEff, 2),
        };
      });

      const sum = byCamp.reduce(
        (acc, r) => {
          acc.total += Number(r["班长数"] || 0);
          acc.mid += Number(r["中班班长数"] || 0);
          acc.large += Number(r["大班班长数"] || 0);
          acc.add += Number(r["添加人数_sum"] || 0);
          return acc;
        },
        { total: 0, mid: 0, large: 0, add: 0 }
      );
      const upgradeTotal = sum.mid + sum.large;
      const upgradeRateTimes = safeDiv(upgradeTotal, sum.total);
      const upgradeRateDedup = safeDiv(upgradeMonitors.size, monitorAll.size);
      const overall = {
        升班率_num: upgradeRateTimes,
        升班率_去重_num: upgradeRateDedup,
        升班率_班次_num: upgradeRateTimes,
        中班率_num: safeDiv(sum.mid, sum.total),
        大班率_num: safeDiv(sum.large, sum.total),
        人效_num: safeDiv(sum.add, sum.total),
        覆盖班长数_num: monitorAll.size,
        覆盖班长数_班次_num: sum.total,
        覆盖营期数_num: byCamp.length,
        升班率: fmtPct(upgradeRateTimes, 2),
        升班率_去重: fmtPct(upgradeRateDedup, 1),
        升班率_班次: fmtPct(upgradeRateTimes, 1),
        中班率: fmtPct(safeDiv(sum.mid, sum.total), 2),
        大班率: fmtPct(safeDiv(sum.large, sum.total), 2),
        人效: fmtInt(safeDiv(sum.add, sum.total)),
        覆盖班长数: fmtInt(monitorAll.size),
        覆盖班长数_班次: fmtInt(sum.total),
        覆盖营期数: fmtInt(byCamp.length),
      };

      const timelineByMonitor = {};
      const list = [];
      for (const m of Array.from(upgradeMonitors.values())) {
        const rows = (campRowsByMonitor.get(m) || []).slice().sort((a, b) => a["营期"] - b["营期"]);
        timelineByMonitor[m] = rows.map((r) => ({
          营期: r["营期"],
          班型: r["班型"],
          班型_norm: r["班型_norm"],
          班长数: r["班长数"],
          班长数_num: r["班长数_num"],
          添加数: r["添加数"],
          转化率: r["转化率"],
          添加产值: r["添加产值"],
          ROI: r["ROI"],
          总成本: r["总成本"],
          总流水: r["总流水"],
          添加数_num: r["添加数_num"],
          转化率_num: r["转化率_num"],
          添加产值_num: r["添加产值_num"],
          ROI_num: r["ROI_num"],
          总成本_num: r["总成本_num"],
          总流水_num: r["总流水_num"],
        }));

        const midCnt = rows.filter((r) => r["班型_norm"] === "mid").length;
        const largeCnt = rows.filter((r) => r["班型_norm"] === "large").length;
        const last = rows[rows.length - 1];
        const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
        const totalPeriods = rows.length;
        const upgradePeriods = midCnt + largeCnt;
        const upgradeRate = safeDiv(upgradePeriods, totalPeriods);
        const avgRoi = mean(rows.map((r) => Number(r["ROI_num"] || 0)));
        const avgCvr = mean(rows.map((r) => Number(r["转化率_num"] || 0)));
        const avgArpu = mean(rows.map((r) => Number(r["添加产值_num"] || 0)));
        const prevRoiNum = prev ? Number(prev?.["ROI_num"] || 0) : 0;
        const prevCvrNum = prev ? Number(prev?.["转化率_num"] || 0) : 0;
        const prevArpuNum = prev ? Number(prev?.["添加产值_num"] || 0) : 0;
        const roiMomNum = prev && prevRoiNum ? (Number(last?.["ROI_num"] || 0) - prevRoiNum) / prevRoiNum : null;
        const cvrMomNum = prev && prevCvrNum ? (Number(last?.["转化率_num"] || 0) - prevCvrNum) / prevCvrNum : null;
        const arpuMomNum = prev && prevArpuNum ? (Number(last?.["添加产值_num"] || 0) - prevArpuNum) / prevArpuNum : null;
        list.push({
          大组: String(last?.["大组"] ?? ""),
          小组: String(last?.["小组"] ?? ""),
          班长: m,
          总营期数: fmtInt(totalPeriods),
          中班期数: fmtInt(midCnt),
          大班期数: fmtInt(largeCnt),
          升班期数: fmtInt(midCnt + largeCnt),
          升班率: fmtPct(upgradeRate, 1),
          最近营期: last?.["营期"] ?? "",
          最近班型: last?.["班型"] ?? "未知",
          最近ROI: last?.["ROI"] ?? "-",
          最近ROI环比: prev ? fmtMom(last?.["ROI_num"], prev?.["ROI_num"]) : "-",
          最近转化率: last?.["转化率"] ?? "-",
          最近转化率环比: prev ? fmtMom(last?.["转化率_num"], prev?.["转化率_num"]) : "-",
          最近添加产值: last?.["添加产值"] ?? "-",
          最近添加产值环比: prev ? fmtMom(last?.["添加产值_num"], prev?.["添加产值_num"]) : "-",
          平均ROI: fmtNum(avgRoi, 2),
          平均转化率: fmtPct(avgCvr, 2),
          平均添加产值: fmtNum(avgArpu, 2),
          总营期数_num: totalPeriods,
          中班期数_num: midCnt,
          大班期数_num: largeCnt,
          升班期数_num: midCnt + largeCnt,
          升班率_num: upgradeRate,
          最近营期_num: Number(last?.["营期"] || 0),
          最近ROI_num: Number(last?.["ROI_num"] || 0),
          最近ROI环比_num: roiMomNum,
          最近转化率_num: Number(last?.["转化率_num"] || 0),
          最近转化率环比_num: cvrMomNum,
          最近添加产值_num: Number(last?.["添加产值_num"] || 0),
          最近添加产值环比_num: arpuMomNum,
          平均ROI_num: avgRoi,
          平均转化率_num: avgCvr,
          平均添加产值_num: avgArpu,
        });
      }
      list.sort((a, b) => (b["最近营期_num"] || 0) - (a["最近营期_num"] || 0));

      const classTypeAgg = (type) => {
        const rows = groupedRows.filter((r) => String(r["班型_norm"] || "unknown") === type);
        const addSum = rows.reduce((s, r) => s + Number(r["添加人数"] || 0), 0);
        const orderSum = rows.reduce((s, r) => s + Number(r["转化人数"] || 0), 0);
        const flowSum = rows.reduce((s, r) => s + Number(r["流水"] || 0), 0);
        const costSum = rows.reduce((s, r) => s + Number(r["成本"] || 0), 0);
        const rowCnt = rows.length;
        const d3Sum = rows.reduce((s, r) => s + Number(r["day3单数"] || 0), 0);
        const d67Sum = rows.reduce((s, r) => s + Number(r["D6_7出单数"] || 0), 0);
        const pendingRateWsum = rows.reduce((s, r) => s + Number(r["待支付率_wsum"] || 0), 0);
        const pendingRateW = rows.reduce((s, r) => s + Number(r["待支付率_w"] || 0), 0);
        const pendingTurnWsum = rows.reduce((s, r) => s + Number(r["待支付转率_wsum"] || 0), 0);
        const pendingTurnW = rows.reduce((s, r) => s + Number(r["待支付转率_w"] || 0), 0);

        const peopleEff = safeDiv(addSum, rowCnt);
        const roi = safeDiv(flowSum, costSum);
        const arpu = safeDiv(flowSum, addSum);
        const cvr = safeDiv(orderSum, addSum);
        const d3Share = safeDiv(d3Sum, orderSum);
        const d67Share = safeDiv(d67Sum, orderSum);
        const pendingRate = safeDiv(pendingRateWsum, pendingRateW);
        const pendingTurn = safeDiv(pendingTurnWsum, pendingTurnW);

        return {
          班型: classScaleLabel(type),
          班型_norm: type,
          班长数_班次: fmtInt(rowCnt),
          人效: fmtInt(peopleEff),
          ROI: fmtNum(roi, 2),
          添加产值: fmtNum(arpu, 2),
          转化率: fmtPct(cvr, 1),
          D3出单占比: fmtPct(d3Share, 1),
          "D6-7出单占比": fmtPct(d67Share, 1),
          待支付率: fmtPct(pendingRate, 1),
          待支付转率: fmtPct(pendingTurn, 1),
          班长数_班次_num: rowCnt,
          人效_num: peopleEff,
          ROI_num: roi,
          添加产值_num: arpu,
          转化率_num: cvr,
          D3出单占比_num: d3Share,
          "D6-7出单占比_num": d67Share,
          待支付率_num: pendingRate,
          待支付转率_num: pendingTurn,
        };
      };
      const class_type_metrics = ["small", "mid", "large"].map(classTypeAgg);

      return {
        overall,
        by_camp: byCamp,
        market: { roi: campRoiMarket, cvr: campCvrMarket, arpu: campArpuMarket },
        class_type_metrics,
        monitors: { list, timeline_by_monitor: timelineByMonitor },
      };
    })();

    const buildFirstPeriod = (typeValue) => {
      const firstMap = new Map();
      for (const r of monitorCampTable) {
        if (String(r["班长类型"]) !== typeValue) continue;
        const m = String(r["班长"]);
        const cur = firstMap.get(m);
        if (!cur || r["营期"] < cur["营期"]) firstMap.set(m, r);
      }

      const campRanks = new Map();
      const campTotals = new Map();
      const campToRows = new Map();
      for (const r of monitorCampTable) {
        const camp = r["营期"];
        const arr = campToRows.get(camp) || [];
        arr.push(r);
        campToRows.set(camp, arr);
      }
      for (const [camp, arr] of campToRows.entries()) {
        const sorted = arr
          .slice()
          .sort((a, b) => (b["添加产值_num"] ?? -999) - (a["添加产值_num"] ?? -999));
        campTotals.set(camp, sorted.length);
        const map = new Map();
        sorted.forEach((r, idx) => map.set(String(r["班长"]), idx + 1));
        campRanks.set(camp, map);
      }

      const out = Array.from(firstMap.values()).map((r) => {
        const rank = campRanks.get(r["营期"])?.get(String(r["班长"])) || 0;
        const total = campTotals.get(r["营期"]) || 0;
        const pct = total ? rank / total : 0;
        return {
          大组: r["大组"],
          小组: r["小组"],
          班长: r["班长"],
          营期: r["营期"],
          添加数: r["添加数"],
          总单数: r["总单数"],
          转化率: r["转化率"],
          ROI: r["ROI"],
          添加产值: r["添加产值"],
          产值排名: `${Math.round(pct * 100)}%`,
          是否超大盘: r["超大盘_bool"] ? "超大盘" : "未超大盘",
          "D6-7转率": r["D6-7转率"],
          个销占比: r["个销占比"],
          ROI_num: r["ROI_num"],
          转化率_num: r["转化率_num"],
          添加产值_num: r["添加产值_num"],
          产值排名_num: pct,
          "D6-7转率_num": r["D6-7转率_num"],
          个销占比_num: r["个销占比_num"],
          超大盘_bool: r["超大盘_bool"],
        };
      });

      out.sort((a, b) => (b["添加产值_num"] ?? -999) - (a["添加产值_num"] ?? -999));
      return out;
    };

    const employment = {
      type_dist: {
        overall: buildTypeDist(monitorTable),
        社群一部: buildTypeDist(monitorTable.filter((r) => r["大组"] === "社群一部")),
        社群三部: buildTypeDist(monitorTable.filter((r) => r["大组"] === "社群三部")),
      },
      type_metrics: typeMetrics,
      new_first: buildFirstPeriod("新"),
      back_first: buildFirstPeriod("回流"),
    };

    const meta = {
      updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      logic_ref: "analyze_data.py（口径复刻）",
      selection: {
        month_key: monthKey,
        months: Array.from(selectedMonths),
        camps: Array.from(selectedCamps).sort((a, b) => a - b),
        large_groups: Array.from(selectedLargeGroups),
        small_groups: Array.from(selectedSmallGroups),
        tiers: Array.from(selectedTiers),
        employment_statuses: Array.from(selectedEmployment),
      },
      roi_thresholds: { head: 0.8, mid: 0.6 },
      note: `浏览器本地计算；主口径不剔除短信/自然流（避免 ROI 偏差）；班长类型：${Object.keys(classTypeMap || {}).length ? "已导入" : "未导入"}；班型：${mainPrepared.some((r) => String(r["班型_norm"] || "") !== "unknown") ? "已识别" : "未识别"}`,
    };

    return {
      meta,
      overall,
      roi_tiers: { overall: overallTier, by_large_group: byLarge },
      tables: {
        monitor: monitorTable,
        monitor_camp: monitorCampTable,
        large_group: largeGroupTable,
        supervisor: supervisorTable,
        small_group: smallGroupTable,
        performance_monitor: performanceAll.table,
        performance_monitor_last3: performanceLast3.table,
      },
      performance: { trends: performanceAll.trends, trends_last3: performanceLast3.trends },
      upgrade,
      employment,
    };
  };

  window.computeDashboardData = computeDashboardData;
})();
