(() => {
  const fmtNum = (v, d = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return Number(v).toFixed(d);
  };

  const fmtPct = (v, d = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return `${(Number(v) * 100).toFixed(d)}%`;
  };

  const fmtInt = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return String(Math.round(Number(v)));
  };

  const csvEscape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const buildCsvText = (headers, rows) => {
    const head = (headers || []).map(csvEscape).join(",");
    const body = (rows || []).map((r) => (r || []).map(csvEscape).join(",")).join("\n");
    return `\uFEFF${head}\n${body}\n`;
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  const formatTs = (d0) => {
    const d = d0 instanceof Date ? d0 : new Date();
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  };

  const downloadTextFile = (filename, text, mime = "text/csv;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const splitQueryTokens = (q0) => {
    const s = String(q0 ?? "").trim().toLowerCase();
    if (!s) return [];
    return s
      .split(/[\s,，;；、]+/g)
      .map((x) => x.trim())
      .filter((x) => x);
  };

  const tierLabelShort = (t) => {
    if (t === "head") return "头部";
    if (t === "mid") return "中部";
    if (t === "tail") return "尾部";
    return "未知";
  };

  const typeTagHtml = (v0) => {
    const v = String(v0 ?? "").trim();
    if (!v) return `<span class="typeTag unknown">-</span>`;
    if (v === "老") return `<span class="typeTag old">老</span>`;
    if (v === "新") return `<span class="typeTag new">新</span>`;
    if (v === "回流") return `<span class="typeTag back">回流</span>`;
    return `<span class="typeTag unknown">${v}</span>`;
  };

  const classTagHtml = (v0) => {
    const v = String(v0 ?? "").trim();
    if (v === "小班") return `<span class="classTag small">小班</span>`;
    if (v === "中班") return `<span class="classTag mid">中班</span>`;
    if (v === "大班") return `<span class="classTag large">大班</span>`;
    return `<span class="classTag unknown">未知</span>`;
  };

  const flagTagHtml = (isTrue, textTrue, textFalse) => {
    if (isTrue) return `<span class="tierTag head">${textTrue}</span>`;
    return `<span class="tierTag tail">${textFalse}</span>`;
  };

  const renderTypeMiniTable = (dist, tableEl) => {
    if (!tableEl) return;
    const items = dist?.items || [];
    const thead = `
      <thead>
        <tr>
          <th>班长类型</th>
          <th>班长数</th>
          <th>占比</th>
        </tr>
      </thead>
    `;
    const tbody = `
      <tbody>
        ${items
          .map((it) => {
            const pctTxt = `${(Number(it.pct || 0) * 100).toFixed(2)}%`;
            return `<tr><td>${it.type}</td><td>${it.count}</td><td>${pctTxt}</td></tr>`;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;
  };

  const renderTypePie = (dist, chartEl) => {
    if (!chartEl || !window.echarts) return null;
    const items = dist?.items || [];
    const colorFor = (t) => {
      if (t === "老") return "#1d4ed8";
      if (t === "回流") return "#0f766e";
      if (t === "新") return "#7c3aed";
      return "rgba(15, 23, 42, 0.35)";
    };
    const pie = echarts.init(chartEl);
    pie.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: 0, left: "center", textStyle: { color: "rgba(15, 23, 42, 0.72)" } },
      series: [
        {
          name: "班长类型",
          type: "pie",
          radius: ["46%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          labelLayout: { hideOverlap: true },
          label: { show: true, color: "rgba(15, 23, 42, 0.72)", formatter: (p) => `${p.value}人\n${p.percent.toFixed(1)}%` },
          labelLine: { length: 10, length2: 8, lineStyle: { color: "rgba(15, 23, 42, 0.25)" } },
          data: items.map((it) => ({ name: it.type, value: it.count, itemStyle: { color: colorFor(it.type) } })),
        },
      ],
    });
    return pie;
  };

  const renderTypeTierStack = (typeKey, typeName, rows, chartEl) => {
    if (!chartEl || !window.echarts) return null;
    const list = (rows || []).filter((r) => String(r["班长类型"] ?? "").trim() === typeKey);
    const categories = ["整体", "社群一部", "社群三部"];
    const pick = (lg) => list.find((r) => String(r["大组"] ?? "").trim() === lg) || null;
    const head = [];
    const mid = [];
    const tail = [];
    categories.forEach((lg) => {
      const r = pick(lg);
      head.push(Number((r?.["头部占比_num"] ?? 0) * 100));
      mid.push(Number((r?.["中部占比_num"] ?? 0) * 100));
      tail.push(Number((r?.["尾部占比_num"] ?? 0) * 100));
    });

    const axisLabelColor = "rgba(15, 23, 42, 0.72)";
    const axisLineColor = "rgba(15, 23, 42, 0.18)";
    const splitLineColor = "rgba(15, 23, 42, 0.10)";

    const chart = echarts.init(chartEl);
    chart.setOption({
      backgroundColor: "transparent",
      title: { show: false, text: typeName },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${Number(v).toFixed(1)}%` },
      legend: { top: 6, left: "center", data: ["头部", "中部", "尾部"], textStyle: { color: axisLabelColor } },
      grid: { left: 40, right: 18, top: 36, bottom: 40 },
      xAxis: { type: "category", data: categories, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", max: 100, axisLabel: { color: axisLabelColor, formatter: "{value}%" }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          name: "尾部",
          type: "bar",
          stack: "pct",
          barWidth: 44,
          itemStyle: { color: "#ef4444" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: tail,
        },
        {
          name: "中部",
          type: "bar",
          stack: "pct",
          barWidth: 44,
          itemStyle: { color: "#f59e0b" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: mid,
        },
        {
          name: "头部",
          type: "bar",
          stack: "pct",
          barWidth: 44,
          itemStyle: { color: "#22c55e" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: head,
        },
      ],
    });
    return chart;
  };

  const renderTypeMetricsTable = (rows, tableEl) => {
    if (!tableEl) return;
    const list = (rows || []).slice();
    const roiNums = list.map((r) => r.ROI_num).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const roiMin = roiNums.length ? Math.min(...roiNums) : null;
    const roiMax = roiNums.length ? Math.max(...roiNums) : null;
    const cvrNums = list.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const cvrMax = cvrNums.length ? Math.max(...cvrNums) : 0;
    const cvrScale = Math.max(0.05, cvrMax);

    const columns = [
      { key: "班长类型", label: "班长类型" },
      { key: "大组", label: "大组" },
      { key: "班长数", label: "班长数" },
      { key: "转化率", label: "转化率" },
      { key: "ROI", label: "ROI" },
      { key: "人均承载", label: "人均承载" },
      { key: "添加产值", label: "添加产值" },
      { key: "个销占比", label: "个销占比" },
      { key: "D6-7转率", label: "D6-7转化占比" },
      { key: "超大盘率", label: "超大盘率" },
      { key: "头部占比", label: "头部占比" },
      { key: "中部占比", label: "中部占比" },
      { key: "尾部占比", label: "尾部占比" },
    ];

    const thead = `<thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>`;
    const tbody = `
      <tbody>
        ${list
          .map((r) => {
            const cells = columns
              .map((c) => {
                if (c.key === "班长类型") return `<td>${typeTagHtml(r[c.key])}</td>`;
                if (c.key === "ROI") {
                  const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.18);
                  const v = r.ROI ?? "-";
                  return `<td style="background:${bg}">${String(v)}</td>`;
                }
                if (c.key === "转化率") {
                  const vNum = r["转化率_num"];
                  const vTxt = r["转化率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", cvrScale)}</td>`;
                }
                if (c.key === "个销占比") {
                  const vNum = r["个销占比_num"];
                  const vTxt = r["个销占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "D6-7转率") {
                  const vNum = r["D6-7转率_num"];
                  const vTxt = r["D6-7转率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                }
                if (c.key === "超大盘率") {
                  const vNum = r["超大盘率_num"];
                  const vTxt = r["超大盘率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "头部占比") {
                  const vNum = r["头部占比_num"];
                  const vTxt = r["头部占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                }
                if (c.key === "中部占比") {
                  const vNum = r["中部占比_num"];
                  const vTxt = r["中部占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "尾部占比") {
                  const vNum = r["尾部占比_num"];
                  const vTxt = r["尾部占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                const v = r[c.key] ?? "-";
                return `<td>${String(v)}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;
  };

  const renderFirstPeriodTable = (rows, tableEl) => {
    if (!tableEl) return;
    const list = (rows || []).slice();
    const roiNums = list.map((r) => r.ROI_num).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const roiMin = roiNums.length ? Math.min(...roiNums) : null;
    const roiMax = roiNums.length ? Math.max(...roiNums) : null;
    const cvrNums = list.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const cvrMax = cvrNums.length ? Math.max(...cvrNums) : 0;
    const cvrScale = Math.max(0.05, cvrMax);

    const columns = [
      { key: "大组", label: "大组" },
      { key: "小组", label: "小组" },
      { key: "班长", label: "班长" },
      { key: "营期", label: "营期" },
      { key: "添加数", label: "添加数" },
      { key: "总单数", label: "总单数" },
      { key: "转化率", label: "转化率" },
      { key: "ROI", label: "ROI" },
      { key: "添加产值", label: "添加产值" },
      { key: "产值排名", label: "产值排名" },
      { key: "是否超大盘", label: "是否超大盘" },
      { key: "D6-7转率", label: "D6-7转化占比" },
      { key: "个销占比", label: "个销占比" },
    ];
    const thead = `<thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>`;
    const tbody = `
      <tbody>
        ${list
          .map((r) => {
            const cells = columns
              .map((c) => {
                if (c.key === "ROI") {
                  const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.18);
                  const v = r.ROI ?? "-";
                  return `<td style="background:${bg}">${String(v)}</td>`;
                }
                if (c.key === "转化率") {
                  const vNum = r["转化率_num"];
                  const vTxt = r["转化率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", cvrScale)}</td>`;
                }
                if (c.key === "个销占比") {
                  const vNum = r["个销占比_num"];
                  const vTxt = r["个销占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "D6-7转率") {
                  const vNum = r["D6-7转率_num"];
                  const vTxt = r["D6-7转率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                }
                if (c.key === "是否超大盘") {
                  return `<td>${flagTagHtml(!!r["超大盘_bool"], "超大盘", "未超大盘")}</td>`;
                }
                const v = r[c.key] ?? "-";
                return `<td>${String(v)}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const mix = (a, b, t) => a + (b - a) * t;

  const mixRgb = (c1, c2, t) => {
    const r = Math.round(mix(c1[0], c2[0], t));
    const g = Math.round(mix(c1[1], c2[1], t));
    const b = Math.round(mix(c1[2], c2[2], t));
    return [r, g, b];
  };

  const roiHeatBg = (roi, minRoi, maxRoi, alpha = 0.22) => {
    if (roi === null || roi === undefined || Number.isNaN(roi)) return "";
    if (minRoi === null || maxRoi === null || minRoi === undefined || maxRoi === undefined) return "";
    const denom = maxRoi - minRoi;
    const tRaw = denom <= 0 ? 1 : (roi - minRoi) / denom;
    const t = clamp01(tRaw);
    const red = [239, 68, 68];
    const yellow = [245, 158, 11];
    const green = [34, 197, 94];
    const rgb = t < 0.5 ? mixRgb(red, yellow, t / 0.5) : mixRgb(yellow, green, (t - 0.5) / 0.5);
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  };

  const barCellHtml = (value01, labelText, fillClass = "", maxValue = 1) => {
    if (value01 === null || value01 === undefined || Number.isNaN(value01) || maxValue === null || maxValue === undefined || Number.isNaN(maxValue) || maxValue <= 0) {
      return `<div class="barCell"><div class="barText">-</div></div>`;
    }
    const w = clamp01(Number(value01) / Number(maxValue)) * 100;
    return `
      <div class="barCell">
        <div class="barFill ${fillClass}" style="width:${w}%"></div>
        <div class="barText">${labelText}</div>
      </div>
    `;
  };

  const barWidthFor = (n, min = 16, max = 44) => {
    const denom = Math.max(1, Number(n) || 1);
    const w = Math.floor(520 / denom);
    return Math.max(min, Math.min(max, w));
  };

  const renderPerformanceTable = (rows, trendsByMonitor, tableEl, opts) => {
    if (!tableEl) return;
    const list = (rows || []).slice();
    const roiNums = list.map((r) => r.ROI_num).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const roiMin = roiNums.length ? Math.min(...roiNums) : null;
    const roiMax = roiNums.length ? Math.max(...roiNums) : null;
    const cvrNums = list.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const cvrMax = cvrNums.length ? Math.max(...cvrNums) : 0;
    const cvrScale = Math.max(0.05, cvrMax);

    const columns = [
      { key: "大组", label: "大组" },
      { key: "小组", label: "小组" },
      { key: "班长", label: "班长" },
      { key: "ROI", label: "ROI", sortKey: "ROI_num" },
      { key: "转化率", label: "转化率", sortKey: "转化率_num" },
      { key: "个销占比", label: "个销占比", sortKey: "个销占比_num" },
      { key: "均承载", label: "均承载", sortKey: "均承载_num" },
      { key: "添加成本", label: "添加成本", sortKey: "添加成本_num" },
      { key: "添加产值", label: "添加产值", sortKey: "添加产值_num" },
      { key: "营期数", label: "营期数", sortKey: "营期数_num" },
      { key: "超大盘率", label: "超大盘率", sortKey: "超大盘率_num" },
      { key: "平均百分位", label: "平均百分位", sortKey: "平均百分位_num" },
      { key: "客单价", label: "客单价", sortKey: "客单价_num" },
      { key: "标准差", label: "标准差", sortKey: "标准差_num" },
      { key: "CV", label: "CV", sortKey: "CV_num" },
      { key: "趋势斜率", label: "趋势斜率", sortKey: "趋势斜率_num" },
    ];

    const sortKey = opts?.sortKey || "";
    const sortDir = opts?.sortDir || "asc";
    const sortMark = (c) => {
      if (!c.sortKey) return "";
      if (c.sortKey !== sortKey) return `<span class="sortMark">↕</span>`;
      return sortDir === "asc" ? `<span class="sortMark active">▲</span>` : `<span class="sortMark active">▼</span>`;
    };
    const thead = `<thead><tr>${columns
      .map((c) => {
        if (!c.sortKey) return `<th>${c.label}</th>`;
        return `<th class="sortTh" data-sort="${c.sortKey}">${c.label}${sortMark(c)}</th>`;
      })
      .join("")}</tr></thead>`;
    const tbody = `
      <tbody>
        ${list
          .map((r, idx) => {
            const cells = columns
              .map((c) => {
                if (c.key === "ROI") {
                  const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.18);
                  const v = r.ROI ?? "-";
                  return `<td style="background:${bg}">${String(v)}</td>`;
                }
                if (c.key === "转化率") {
                  const vNum = r["转化率_num"];
                  const vTxt = r["转化率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", cvrScale)}</td>`;
                }
                if (c.key === "个销占比") {
                  const vNum = r["个销占比_num"];
                  const vTxt = r["个销占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "超大盘率") {
                  const vNum = r["超大盘率_num"];
                  const vTxt = r["超大盘率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "趋势斜率") {
                  const vNum = r["趋势斜率_num"];
                  const vTxt = r["趋势斜率"] ?? "-";
                  if (vNum === null || vNum === undefined || Number.isNaN(vNum)) return `<td>${String(vTxt)}</td>`;
                  const cls = Number(vNum) >= 0 ? "pos" : "neg";
                  return `<td><span class="slopeTag ${cls}">${String(vTxt)}</span></td>`;
                }
                const v = r[c.key] ?? "-";
                return `<td>${String(v)}</td>`;
              })
              .join("");

            const colSpan = columns.length;
            const m = String(r["班长"] ?? "");
            const cid1 = `perfChartRoi_${idx}`;
            const cid2 = `perfChartArpu_${idx}`;
            const cid3 = `perfChartCvr_${idx}`;
            const cid4 = `perfChartZ_${idx}`;
            return `
              <tr class="perfMainRow" data-idx="${idx}" data-monitor="${m}">${cells}</tr>
              <tr class="perfDetailRow hidden" data-idx="${idx}">
                <td colspan="${colSpan}">
                  <div class="perfExpand">
                    <div class="perfChartGrid">
                      <div class="perfChart" id="${cid1}"></div>
                      <div class="perfChart" id="${cid2}"></div>
                      <div class="perfChart" id="${cid3}"></div>
                      <div class="perfChart" id="${cid4}"></div>
                    </div>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;

    tableEl.querySelectorAll("th.sortTh").forEach((th) => {
      th.onclick = () => {
        const k = th.getAttribute("data-sort") || "";
        if (!k) return;
        const cb = opts?.onSort;
        if (typeof cb === "function") cb(k);
      };
    });

    const axisLabelColor = "rgba(15, 23, 42, 0.72)";
    const axisLineColor = "rgba(15, 23, 42, 0.18)";
    const splitLineColor = "rgba(15, 23, 42, 0.10)";

    const lineOpt = (title, xData, yName, yData, color, valueFmt, axisFmt) => ({
      backgroundColor: "transparent",
      title: { text: title, left: 8, top: 6, textStyle: { fontSize: 12, fontWeight: 650, color: "rgba(15, 23, 42, 0.86)" } },
      tooltip: { trigger: "axis", valueFormatter: valueFmt },
      grid: { left: 42, right: 12, top: 40, bottom: 34 },
      xAxis: { type: "category", data: xData, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", axisLabel: { color: axisLabelColor, formatter: axisFmt }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          name: yName,
          type: "line",
          data: yData,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          label: { show: true, position: "top", color: "rgba(15, 23, 42, 0.72)", fontSize: 10, formatter: (p) => valueFmt(p.value) },
        },
      ],
    });

    const attach = () => {
      const mainRows = Array.from(tableEl.querySelectorAll(".perfMainRow"));
      mainRows.forEach((row) => {
        row.onclick = () => {
          const idx = row.dataset.idx;
          const monitor = row.dataset.monitor;
          const detail = tableEl.querySelector(`.perfDetailRow[data-idx="${idx}"]`);
          if (!detail) return;
          const isHidden = detail.classList.contains("hidden");
          detail.classList.toggle("hidden");
          row.classList.toggle("expanded", isHidden);
          if (!isHidden) return;
          if (detail.dataset.rendered === "1") return;
          detail.dataset.rendered = "1";

          const t = trendsByMonitor?.[monitor];
          const x = (t?.camps || []).map((v) => String(v));
          const roi = (t?.roi || []).map((v) => (v === null || v === undefined ? null : Number(v)));
          const marketRoi = (t?.market_roi || []).map((v) => (v === null || v === undefined ? null : Number(v)));
          const arpu = (t?.arpu || []).map((v) => (v === null || v === undefined ? null : Number(v)));
          const marketArpu = (t?.market_arpu || []).map((v) => (v === null || v === undefined ? null : Number(v)));
          const cvr = (t?.cvr || []).map((v) => (v === null || v === undefined ? null : Number(v)));
          const z = (t?.z || []).map((v) => (v === null || v === undefined ? null : Number(v)));

          const chartRoi = document.getElementById(`perfChartRoi_${idx}`);
          const chartArpu = document.getElementById(`perfChartArpu_${idx}`);
          const chartCvr = document.getElementById(`perfChartCvr_${idx}`);
          const chartZ = document.getElementById(`perfChartZ_${idx}`);
          if (!window.echarts) return;

          const fmt2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "-" : Number(v).toFixed(2));
          const fmtPct2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "-" : `${(Number(v) * 100).toFixed(2)}%`);

          const c1 = echarts.init(chartRoi);
          c1.setOption({
            backgroundColor: "transparent",
            title: { text: "ROI - 营期趋势", left: 8, top: 6, textStyle: { fontSize: 12, fontWeight: 650, color: "rgba(15, 23, 42, 0.86)" } },
            tooltip: { trigger: "axis", valueFormatter: fmt2 },
            legend: { top: 8, right: 12, data: ["班长ROI", "大盘ROI"], textStyle: { color: "rgba(15, 23, 42, 0.62)", fontSize: 11 } },
            grid: { left: 42, right: 12, top: 46, bottom: 34 },
            xAxis: { type: "category", data: x, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
            yAxis: { type: "value", axisLabel: { color: axisLabelColor, formatter: (v) => Number(v).toFixed(2) }, splitLine: { lineStyle: { color: splitLineColor } } },
            series: [
              {
                name: "大盘ROI",
                type: "line",
                data: marketRoi,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, type: "dashed", color: "rgba(15, 23, 42, 0.35)" },
                itemStyle: { color: "rgba(15, 23, 42, 0.35)" },
              },
              {
                name: "班长ROI",
                type: "line",
                data: roi,
                smooth: true,
                showSymbol: true,
                symbolSize: 6,
                lineStyle: { width: 2, color: "rgba(37, 99, 235, 0.92)" },
                itemStyle: { color: "rgba(37, 99, 235, 0.92)" },
                label: { show: true, position: "top", color: "rgba(15, 23, 42, 0.72)", fontSize: 10, formatter: (p) => fmt2(p.value) },
              },
            ],
          });
          const c2 = echarts.init(chartArpu);
          c2.setOption({
            backgroundColor: "transparent",
            title: { text: "添加产值 - 营期趋势", left: 8, top: 6, textStyle: { fontSize: 12, fontWeight: 650, color: "rgba(15, 23, 42, 0.86)" } },
            tooltip: { trigger: "axis", valueFormatter: fmt2 },
            legend: { top: 8, right: 12, data: ["班长添加产值", "大盘添加产值"], textStyle: { color: "rgba(15, 23, 42, 0.62)", fontSize: 11 } },
            grid: { left: 42, right: 12, top: 46, bottom: 34 },
            xAxis: { type: "category", data: x, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
            yAxis: { type: "value", axisLabel: { color: axisLabelColor, formatter: (v) => Number(v).toFixed(2) }, splitLine: { lineStyle: { color: splitLineColor } } },
            series: [
              {
                name: "大盘添加产值",
                type: "line",
                data: marketArpu,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, type: "dashed", color: "rgba(15, 23, 42, 0.35)" },
                itemStyle: { color: "rgba(15, 23, 42, 0.35)" },
              },
              {
                name: "班长添加产值",
                type: "line",
                data: arpu,
                smooth: true,
                showSymbol: true,
                symbolSize: 6,
                lineStyle: { width: 2, color: "rgba(99, 102, 241, 0.92)" },
                itemStyle: { color: "rgba(99, 102, 241, 0.92)" },
                label: { show: true, position: "top", color: "rgba(15, 23, 42, 0.72)", fontSize: 10, formatter: (p) => fmt2(p.value) },
              },
            ],
          });
          const c3 = echarts.init(chartCvr);
          c3.setOption(lineOpt("转化率 - 营期趋势", x, "转化率", cvr, "rgba(34, 197, 94, 0.92)", fmtPct2, (v) => `${(Number(v) * 100).toFixed(2)}%`));
          const c4 = echarts.init(chartZ);
          c4.setOption(lineOpt("Z-score - 营期趋势", x, "Z-score", z, "rgba(15, 23, 42, 0.72)", fmt2, (v) => Number(v).toFixed(2)));

          const store = opts?.chartStore;
          if (store) store.push(c1, c2, c3, c4);
        };
      });
    };

    attach();
  };

  const renderTierStatsTable = (tierStats, tableEl) => {
    if (!tableEl) return;
    const tiers = (tierStats?.tiers || []).map((t) => ({
      tier: t.tier,
      count: t.count ?? 0,
      pct: t.pct ?? 0,
    }));
    const thead = `
      <thead>
        <tr>
          <th>分层</th>
          <th>班长数</th>
          <th>占比</th>
        </tr>
      </thead>
    `;
    const tbody = `
      <tbody>
        ${tiers
          .map((t) => {
            const pctTxt = `${(Number(t.pct) * 100).toFixed(2)}%`;
            return `<tr><td>${tierLabelShort(t.tier)}</td><td>${t.count}</td><td>${pctTxt}</td></tr>`;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;
  };

  const renderAggTable = (rows, dimKey, tableEl) => {
    if (!tableEl) return;
    const list = (rows || []).slice();
    list.sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));

    const roiNums = list.map((r) => r.ROI_num).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const roiMin = roiNums.length ? Math.min(...roiNums) : null;
    const roiMax = roiNums.length ? Math.max(...roiNums) : null;

    const cvrNums = list.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const cvrMax = cvrNums.length ? Math.max(...cvrNums) : 0;
    const cvrScale = Math.max(0.05, cvrMax);

    const columns = [
      { key: dimKey, label: dimKey },
      { key: "转化率", label: "转化率" },
      { key: "ROI", label: "ROI" },
      { key: "人均承载", label: "人均承载" },
      { key: "添加产值", label: "添加产值" },
      { key: "个销占比", label: "个销占比" },
      { key: "D6-7转率", label: "D6-7转化占比" },
      { key: "超大盘率", label: "超大盘率" },
    ];

    const thead = `<thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>`;
    const tbody = `
      <tbody>
        ${list
          .map((r) => {
            const cells = columns
              .map((c) => {
                if (c.key === "ROI") {
                  const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.18);
                  const v = r.ROI ?? "-";
                  return `<td style="background:${bg}">${String(v)}</td>`;
                }
                if (c.key === "转化率") {
                  const vNum = r["转化率_num"];
                  const vTxt = r["转化率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", cvrScale)}</td>`;
                }
                if (c.key === "个销占比") {
                  const vNum = r["个销占比_num"];
                  const vTxt = r["个销占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "D6-7转率") {
                  const vNum = r["D6-7转率_num"];
                  const vTxt = r["D6-7转率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                }
                if (c.key === "超大盘率") {
                  const vNum = r["超大盘率_num"];
                  const vTxt = r["超大盘率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                const v = r[c.key] ?? "-";
                return `<td>${String(v)}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("")}
      </tbody>
    `;
    tableEl.innerHTML = thead + tbody;
  };

  const renderMonitorTable = (rows, ctx) => {
    const table = document.getElementById("monitorTable");
    const roiMin = ctx?.roiMin ?? null;
    const roiMax = ctx?.roiMax ?? null;
    const cvrScale = ctx?.cvrScale ?? 0.05;

    const columns = [
      { key: "大组", label: "大组" },
      { key: "小组", label: "小组" },
      { key: "班长", label: "班长" },
      { key: "班长类型", label: "班长类型" },
      { key: "roi_tier", label: "分层" },
      { key: "添加数", label: "添加数" },
      { key: "总单数", label: "总单数" },
      { key: "转化率", label: "转化率" },
      { key: "总成本", label: "总成本" },
      { key: "总流水", label: "总流水" },
      { key: "ROI", label: "ROI" },
      { key: "添加产值", label: "添加产值" },
      { key: "个销占比", label: "个销占比" },
      { key: "D6-7转率", label: "D6-7转化占比" },
      { key: "接量营期数", label: "接量营期数" },
      { key: "超大盘次数", label: "超大盘次数" },
      { key: "超大盘率", label: "超大盘率" },
    ];

    const thead = `
      <thead>
        <tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>
      </thead>
    `;

    const tbody = `
      <tbody>
        ${rows
          .map((r) => {
            const cells = columns
              .map((c) => {
                if (c.key === "roi_tier") {
                  const t = r.roi_tier || "unknown";
                  const cls = t === "head" ? "head" : t === "mid" ? "mid" : "tail";
                  return `<td><span class="tierTag ${cls}">${tierLabelShort(t)}</span></td>`;
                }
                if (c.key === "班长类型") {
                  return `<td>${typeTagHtml(r["班长类型"])}</td>`;
                }
                if (c.key === "ROI") {
                  const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.22);
                  const v = r[c.key] ?? "-";
                  return `<td style="background:${bg}">${String(v)}</td>`;
                }
                if (c.key === "转化率") {
                  const vNum = r["转化率_num"];
                  const vTxt = r["转化率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", cvrScale)}</td>`;
                }
                if (c.key === "个销占比") {
                  const vNum = r["个销占比_num"];
                  const vTxt = r["个销占比"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                if (c.key === "D6-7转率") {
                  const vNum = r["D6-7转率_num"];
                  const vTxt = r["D6-7转率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                }
                if (c.key === "超大盘率") {
                  const vNum = r["超大盘率_num"];
                  const vTxt = r["超大盘率"] ?? "-";
                  return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                }
                const v = r[c.key] ?? "-";
                return `<td>${String(v)}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("")}
      </tbody>
    `;
    table.innerHTML = thead + tbody;
  };

  const disposeCharts = () => {
    const charts = window.__toolCharts || [];
    charts.forEach((c) => {
      try {
        c.dispose();
      } catch {}
    });
    window.__toolCharts = [];
    const perfCharts = window.__perfCharts || [];
    perfCharts.forEach((c) => {
      try {
        c.dispose();
      } catch {}
    });
    window.__perfCharts = [];
  };

  const renderAll = (data) => {
    if (!data) return;
    disposeCharts();

    document.getElementById("metaUpdatedAt").textContent = `数据更新时间：${data.meta?.updated_at || "-"}`;
    document.getElementById("metaLogic").textContent = `统计逻辑：${data.meta?.logic_ref || "-"}`;
    const sel = data.meta?.selection;
    const months = sel?.months?.length ? sel.months.join("、") : "-";
    const camps = sel?.camps?.length ? sel.camps.join(",") : "-";
    const lgs = sel?.large_groups?.length ? sel.large_groups.join("、") : "-";
    const sgs = sel?.small_groups?.length ? sel.small_groups.join("、") : "-";
    const tiers = sel?.tiers?.length ? sel.tiers.join("、") : "-";
    const emps = sel?.employment_statuses?.length ? sel.employment_statuses.join("、") : "-";
    document.getElementById("metaSelection").textContent = `月份：${months} · 营期：${camps} · 大组：${lgs} · 小组：${sgs} · 分层：${tiers} · 入职状态：${emps}`;
    const hintEl = document.getElementById("tierLegendHint");
    if (hintEl) hintEl.textContent = "分层说明：头部 ROI≥0.8；中部 0.6≤ROI<0.8；尾部 ROI<0.6";

    document.getElementById("kpiOverallRoi").textContent = fmtNum(data.overall?.ROI, 2);
    document.getElementById("kpiOverallCvr").textContent = fmtPct(data.overall?.转化率, 2);
    document.getElementById("kpiOverallArpu").textContent = fmtNum(data.overall?.添加产值, 2);
    document.getElementById("kpiMonitorCount").textContent = String(data.overall?.班长数 ?? "-");

    renderTierStatsTable(data.roi_tiers?.overall, document.getElementById("overallTierTable"));

    if (!window.echarts) return;
    const charts = [];
    window.__toolCharts = charts;
    window.__perfCharts = [];

    const axisLabelColor = "rgba(15, 23, 42, 0.72)";
    const axisLineColor = "rgba(15, 23, 42, 0.18)";
    const splitLineColor = "rgba(15, 23, 42, 0.10)";
    const labelColor = "rgba(15, 23, 42, 0.86)";

    const overallTiers = data.roi_tiers?.overall?.tiers || [];
    const chartOverallTier = echarts.init(document.getElementById("chartOverallTier"));
    charts.push(chartOverallTier);
    chartOverallTier.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: 0, left: "center", textStyle: { color: axisLabelColor } },
      series: [
        {
          name: "ROI分层",
          type: "pie",
          radius: ["46%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          labelLayout: { hideOverlap: true },
          label: { show: true, color: axisLabelColor, formatter: (p) => `${p.value}人\n${p.percent.toFixed(1)}%` },
          labelLine: { length: 10, length2: 8, lineStyle: { color: "rgba(15, 23, 42, 0.25)" } },
          itemStyle: { borderColor: "rgba(0,0,0,0)", borderWidth: 2 },
          data: overallTiers.map((t) => ({
            name: tierLabelShort(t.tier),
            value: t.count,
            itemStyle: { color: t.tier === "head" ? "#22c55e" : t.tier === "mid" ? "#f59e0b" : "#ef4444" },
          })),
        },
      ],
    });

    const largeRows = (data.tables?.large_group || []).slice().sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));
    const groupsByLarge = largeRows.map((r) => r["大组"]).filter((v) => v);
    const tierMap = data.roi_tiers?.by_large_group || {};
    const headPct = [];
    const midPct = [];
    const tailPct = [];
    const headCnt = [];
    const midCnt = [];
    const tailCnt = [];
    groupsByLarge.forEach((g) => {
      const t = tierMap[g];
      const tiers = t?.tiers || [];
      const h = tiers.find((x) => x.tier === "head");
      const m = tiers.find((x) => x.tier === "mid");
      const ta = tiers.find((x) => x.tier === "tail");
      headPct.push(((h?.pct ?? 0) * 100).toFixed(2));
      midPct.push(((m?.pct ?? 0) * 100).toFixed(2));
      tailPct.push(((ta?.pct ?? 0) * 100).toFixed(2));
      headCnt.push(h?.count ?? 0);
      midCnt.push(m?.count ?? 0);
      tailCnt.push(ta?.count ?? 0);
    });

    const chartLargeGroupTierStack = echarts.init(document.getElementById("chartLargeGroupTierStack"));
    charts.push(chartLargeGroupTierStack);
    chartLargeGroupTierStack.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (items) => {
          const i = items?.[0]?.dataIndex ?? 0;
          const name = groupsByLarge[i] ?? "-";
          return [
            `<div style="font-weight:650">${name}</div>`,
            `头部：${headCnt[i]}人 · ${Number(headPct[i] || 0).toFixed(1)}%`,
            `中部：${midCnt[i]}人 · ${Number(midPct[i] || 0).toFixed(1)}%`,
            `尾部：${tailCnt[i]}人 · ${Number(tailPct[i] || 0).toFixed(1)}%`,
          ].join("<br/>");
        },
      },
      legend: { top: 6, left: "center", data: ["头部", "中部", "尾部"], textStyle: { color: axisLabelColor } },
      grid: { left: 40, right: 18, top: 36, bottom: 70 },
      xAxis: { type: "category", data: groupsByLarge, axisLabel: { rotate: 24, color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", max: 100, axisLabel: { color: axisLabelColor, formatter: "{value}%" }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          name: "尾部",
          type: "bar",
          stack: "pct",
          barWidth: barWidthFor(groupsByLarge.length, 18, 44),
          itemStyle: { color: "#ef4444" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: tailPct.map((v) => Number(v)),
        },
        {
          name: "中部",
          type: "bar",
          stack: "pct",
          barWidth: barWidthFor(groupsByLarge.length, 18, 44),
          itemStyle: { color: "#f59e0b" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: midPct.map((v) => Number(v)),
        },
        {
          name: "头部",
          type: "bar",
          stack: "pct",
          barWidth: barWidthFor(groupsByLarge.length, 18, 44),
          itemStyle: { color: "#22c55e" },
          label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => (Number(p.value) <= 0 ? "" : `${Number(p.value).toFixed(0)}%`) },
          data: headPct.map((v) => Number(v)),
        },
      ],
    });

    const chartLargeGroupRoi = echarts.init(document.getElementById("chartLargeGroupRoi"));
    charts.push(chartLargeGroupRoi);
    const largeBarW = barWidthFor(largeRows.length, 18, 44);
    chartLargeGroupRoi.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 40, right: 18, top: 26, bottom: 70 },
      xAxis: { type: "category", data: largeRows.map((r) => r["大组"]), axisLabel: { rotate: 28, color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", axisLabel: { color: axisLabelColor }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          type: "bar",
          data: largeRows.map((r) => ({ value: r.ROI_num, itemStyle: { color: (r.ROI_num ?? 0) >= 0.8 ? "#22c55e" : (r.ROI_num ?? 0) >= 0.6 ? "#f59e0b" : "#ef4444" } })),
          barWidth: largeBarW,
          label: { show: true, position: "top", color: labelColor, fontSize: 11, formatter: (p) => (p.value === null || p.value === undefined ? "-" : Number(p.value).toFixed(2)) },
        },
      ],
    });

    const supervisorRows = (data.tables?.supervisor || []).slice().sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));
    const chartSupervisorRoi = echarts.init(document.getElementById("chartSupervisorRoi"));
    charts.push(chartSupervisorRoi);
    chartSupervisorRoi.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 40, right: 18, top: 26, bottom: 50 },
      xAxis: { type: "category", data: supervisorRows.map((r) => r["主管"]), axisLabel: { rotate: 18, color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", axisLabel: { color: axisLabelColor }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          type: "bar",
          data: supervisorRows.map((r) => ({ value: r.ROI_num, itemStyle: { color: (r.ROI_num ?? 0) >= 0.8 ? "#22c55e" : (r.ROI_num ?? 0) >= 0.6 ? "#f59e0b" : "#ef4444" } })),
          barWidth: barWidthFor(supervisorRows.length, 18, 44),
          label: { show: true, position: "top", color: labelColor, fontSize: 11, formatter: (p) => (p.value === null || p.value === undefined ? "-" : Number(p.value).toFixed(2)) },
        },
      ],
    });

    const smallRows = (data.tables?.small_group || []).slice().sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));
    const chartSmallGroupRoi = echarts.init(document.getElementById("chartSmallGroupRoi"));
    charts.push(chartSmallGroupRoi);
    chartSmallGroupRoi.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 40, right: 18, top: 26, bottom: 70 },
      xAxis: { type: "category", data: smallRows.map((r) => r["小组"]), axisLabel: { rotate: 28, color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
      yAxis: { type: "value", axisLabel: { color: axisLabelColor }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          type: "bar",
          data: smallRows.map((r) => ({ value: r.ROI_num, itemStyle: { color: (r.ROI_num ?? 0) >= 0.8 ? "#22c55e" : (r.ROI_num ?? 0) >= 0.6 ? "#f59e0b" : "#ef4444" } })),
          barWidth: barWidthFor(smallRows.length, 16, 40),
          label: { show: true, position: "top", color: labelColor, fontSize: 11, formatter: (p) => (p.value === null || p.value === undefined ? "-" : Number(p.value).toFixed(2)) },
        },
      ],
    });

    renderAggTable(data.tables?.large_group, "大组", document.getElementById("tableLargeGroup"));
    renderAggTable(data.tables?.supervisor, "主管", document.getElementById("tableSupervisor"));
    renderAggTable(data.tables?.small_group, "小组", document.getElementById("tableSmallGroup"));

    const monitorRows = (data.tables?.monitor || []).slice().sort((a, b) => (b.ROI_num ?? -999) - (a.ROI_num ?? -999));
    const roiNums2 = monitorRows.map((r) => r.ROI_num).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const roiMin = roiNums2.length ? Math.min(...roiNums2) : null;
    const roiMax = roiNums2.length ? Math.max(...roiNums2) : null;
    const cvrNums2 = monitorRows.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    const cvrMax2 = cvrNums2.length ? Math.max(...cvrNums2) : 0;
    const cvrScale2 = Math.max(0.05, cvrMax2);

    const largeGroupFullRows = document.getElementById("largeGroupFullRows");
    largeGroupFullRows.innerHTML = "";
    groupsByLarge.forEach((g, idx) => {
      const tierStats = data.roi_tiers?.by_large_group?.[g];
      const tiers = tierStats?.tiers || [];
      const chartId = `chartLargeGroupTierFull_${idx}`;
      const tierTableId = `tierTableLarge_${idx}`;
      const tableId = `tableLargeMonitors_${idx}`;

      const row = document.createElement("div");
      row.className = "lgFullRow";
      row.innerHTML = `
        <div class="lgFullHeader">
          <div class="lgFullName">${g}</div>
        </div>
        <div class="lgFullBody">
          <div class="lgFullLeft">
            <div class="chart chartLg" id="${chartId}"></div>
            <div class="miniWrap">
              <table class="miniTable" id="${tierTableId}"></table>
            </div>
          </div>
          <div class="lgFullRight">
            <div class="tableWrap">
              <table class="table tableCompact" id="${tableId}"></table>
            </div>
          </div>
        </div>
      `;
      largeGroupFullRows.appendChild(row);

      renderTierStatsTable(tierStats, document.getElementById(tierTableId));

      const groupMonitors = monitorRows.filter((r) => r["大组"] === g);
      const groupCvrNums = groupMonitors.map((r) => r["转化率_num"]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
      const groupCvrMax = groupCvrNums.length ? Math.max(...groupCvrNums) : 0;
      const groupCvrScale = Math.max(0.05, groupCvrMax);

      const columns = [
        { key: "班长", label: "班长" },
        { key: "班长类型", label: "班长类型" },
        { key: "roi_tier", label: "分层" },
        { key: "ROI", label: "ROI" },
        { key: "转化率", label: "转化率" },
        { key: "个销占比", label: "个销占比" },
        { key: "D6-7转率", label: "D6-7转化占比" },
        { key: "超大盘率", label: "超大盘率" },
      ];

      const tableEl = document.getElementById(tableId);
      const thead = `<thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>`;
      const tbody = `
        <tbody>
          ${groupMonitors
            .map((r) => {
              const cells = columns
                .map((c) => {
                  if (c.key === "roi_tier") {
                    const t = r.roi_tier || "unknown";
                    const cls = t === "head" ? "head" : t === "mid" ? "mid" : "tail";
                    return `<td><span class="tierTag ${cls}">${tierLabelShort(t)}</span></td>`;
                  }
                  if (c.key === "班长类型") {
                    return `<td>${typeTagHtml(r["班长类型"])}</td>`;
                  }
                  if (c.key === "ROI") {
                    const bg = roiHeatBg(r.ROI_num, roiMin, roiMax, 0.22);
                    const v = r.ROI ?? "-";
                    return `<td style="background:${bg}">${String(v)}</td>`;
                  }
                  if (c.key === "转化率") {
                    const vNum = r["转化率_num"];
                    const vTxt = r["转化率"] ?? "-";
                    return `<td>${barCellHtml(vNum, String(vTxt), "", groupCvrScale)}</td>`;
                  }
                  if (c.key === "个销占比") {
                    const vNum = r["个销占比_num"];
                    const vTxt = r["个销占比"] ?? "-";
                    return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                  }
                  if (c.key === "D6-7转率") {
                    const vNum = r["D6-7转率_num"];
                    const vTxt = r["D6-7转率"] ?? "-";
                    return `<td>${barCellHtml(vNum, String(vTxt), "green", 1)}</td>`;
                  }
                  if (c.key === "超大盘率") {
                    const vNum = r["超大盘率_num"];
                    const vTxt = r["超大盘率"] ?? "-";
                    return `<td>${barCellHtml(vNum, String(vTxt), "", 1)}</td>`;
                  }
                  const v = r[c.key] ?? "-";
                  return `<td>${String(v)}</td>`;
                })
                .join("");
              return `<tr>${cells}</tr>`;
            })
            .join("")}
        </tbody>
      `;
      tableEl.innerHTML = thead + tbody;

      const chartEl = document.getElementById(chartId);
      const pie = echarts.init(chartEl);
      charts.push(pie);
      pie.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "item" },
        legend: { bottom: 0, left: "center", textStyle: { color: axisLabelColor } },
        series: [
          {
            name: "大组内ROI分层",
            type: "pie",
            radius: ["46%", "72%"],
            center: ["50%", "42%"],
            label: { show: true, position: "inside", color: "rgba(255,255,255,0.92)", fontSize: 11, formatter: (p) => `${p.value}人\n${p.percent.toFixed(0)}%` },
            labelLine: { show: false },
            data: tiers.map((t) => ({ name: tierLabelShort(t.tier), value: t.count, itemStyle: { color: t.tier === "head" ? "#22c55e" : t.tier === "mid" ? "#f59e0b" : "#ef4444" } })),
          },
        ],
      });
    });

    const searchEl = document.getElementById("monitorSearch");
    const tierEl = document.getElementById("tierFilter");
    const applyMonitorFilter = () => {
      const q = (searchEl.value || "").trim().toLowerCase();
      const t = tierEl.value;
      const filtered = monitorRows.filter((r) => {
        if (t !== "all" && r.roi_tier !== t) return false;
        if (!q) return true;
        const hay = `${r["班长"] || ""} ${r["大组"] || ""} ${r["小组"] || ""}`.toLowerCase();
        return hay.includes(q);
      });
      renderMonitorTable(filtered, { roiMin, roiMax, cvrScale: cvrScale2 });
    };
    searchEl.oninput = applyMonitorFilter;
    tierEl.onchange = applyMonitorFilter;
    applyMonitorFilter();

    const tabBtns = Array.from(document.querySelectorAll(".tabBtn"));
    const tabOverview = document.getElementById("tab_overview");
    const tabDetail = document.getElementById("tab_detail");
    const tabEmployment = document.getElementById("tab_employment");
    const tabPerformance = document.getElementById("tab_performance");
    const tabUpgrade = document.getElementById("tab_upgrade");
    const setTab = (tab) => {
      tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
      if (tab === "detail") {
        tabDetail.classList.remove("hidden");
        tabOverview.classList.add("hidden");
        tabEmployment.classList.add("hidden");
        tabPerformance.classList.add("hidden");
        tabUpgrade.classList.add("hidden");
      } else if (tab === "employment") {
        tabEmployment.classList.remove("hidden");
        tabOverview.classList.add("hidden");
        tabDetail.classList.add("hidden");
        tabPerformance.classList.add("hidden");
        tabUpgrade.classList.add("hidden");
      } else if (tab === "performance") {
        tabPerformance.classList.remove("hidden");
        tabOverview.classList.add("hidden");
        tabDetail.classList.add("hidden");
        tabEmployment.classList.add("hidden");
        tabUpgrade.classList.add("hidden");
      } else if (tab === "upgrade") {
        tabUpgrade.classList.remove("hidden");
        tabOverview.classList.add("hidden");
        tabDetail.classList.add("hidden");
        tabEmployment.classList.add("hidden");
        tabPerformance.classList.add("hidden");
      } else {
        tabOverview.classList.remove("hidden");
        tabDetail.classList.add("hidden");
        tabEmployment.classList.add("hidden");
        tabPerformance.classList.add("hidden");
        tabUpgrade.classList.add("hidden");
      }
      charts.forEach((c) => c.resize());
      ;(window.__perfCharts || []).forEach((c) => {
        try {
          c.resize();
        } catch {}
      });
    };
    tabBtns.forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));

    if (data.employment) {
      const distOverall = data.employment.type_dist?.overall;
      const distLg1 = data.employment.type_dist?.["社群一部"];
      const distLg3 = data.employment.type_dist?.["社群三部"];
      const c1 = renderTypePie(distOverall, document.getElementById("chartTypeOverall"));
      const c2 = renderTypePie(distLg1, document.getElementById("chartTypeLg1"));
      const c3 = renderTypePie(distLg3, document.getElementById("chartTypeLg3"));
      [c1, c2, c3].forEach((c) => c && charts.push(c));
      renderTypeMiniTable(distOverall, document.getElementById("tableTypeOverall"));
      renderTypeMiniTable(distLg1, document.getElementById("tableTypeLg1"));
      renderTypeMiniTable(distLg3, document.getElementById("tableTypeLg3"));
      const t1 = renderTypeTierStack("新", "新人", data.employment.type_metrics, document.getElementById("chartTypeTierNew"));
      const t2 = renderTypeTierStack("回流", "回流", data.employment.type_metrics, document.getElementById("chartTypeTierBack"));
      const t3 = renderTypeTierStack("老", "老人", data.employment.type_metrics, document.getElementById("chartTypeTierOld"));
      ;[t1, t2, t3].forEach((c) => c && charts.push(c));
      renderTypeMetricsTable(data.employment.type_metrics, document.getElementById("tableTypeMetrics"));
      renderFirstPeriodTable(data.employment.new_first, document.getElementById("tableNewFirst"));
      renderFirstPeriodTable(data.employment.back_first, document.getElementById("tableBackFirst"));
    }

    const perfSearchEl = document.getElementById("perfSearch");
    const perfExportBtn = document.getElementById("perfExportBtn");
    const perfExportByDayBtn = document.getElementById("perfExportByDayBtn");
    const perfRecent3Btn = document.getElementById("perfRecent3Btn");
    const perfRowsAll = (data.tables?.performance_monitor || []).slice();
    const perfRowsLast3 = (data.tables?.performance_monitor_last3 || []).slice();
    const perfTrendsAll = data.performance?.trends || {};
    const perfTrendsLast3 = data.performance?.trends_last3 || {};
    let perfSortKey = "平均百分位_num";
    let perfSortDir = "asc";
    let perfLastRows = [];
    let perfUseRecent3 = false;
    const getPerfRows = () => (perfUseRecent3 ? perfRowsLast3 : perfRowsAll);
    const getPerfTrends = () => (perfUseRecent3 ? perfTrendsLast3 : perfTrendsAll);
    const renderPerf = () => {
      const perfRows = getPerfRows();
      const perfTrends = getPerfTrends();
      const tokens = splitQueryTokens(perfSearchEl?.value || "");
      const filtered = perfRows.filter((r) => {
        if (!tokens.length) return true;
        const hay = `${r["班长"] || ""} ${r["大组"] || ""} ${r["小组"] || ""}`.toLowerCase();
        return tokens.some((t) => hay.includes(t));
      });
      const dir = perfSortDir === "desc" ? -1 : 1;
      filtered.sort((a, b) => {
        const av0 = a?.[perfSortKey];
        const bv0 = b?.[perfSortKey];
        const av = av0 === null || av0 === undefined || Number.isNaN(av0) ? Number.POSITIVE_INFINITY : Number(av0);
        const bv = bv0 === null || bv0 === undefined || Number.isNaN(bv0) ? Number.POSITIVE_INFINITY : Number(bv0);
        if (av !== bv) return (av - bv) * dir;
        return ((b["添加产值_num"] ?? -999) - (a["添加产值_num"] ?? -999)) * dir;
      });
      perfLastRows = filtered.slice();
      (window.__perfCharts || []).forEach((c) => {
        try {
          c.dispose();
        } catch {}
      });
      window.__perfCharts = [];
      renderPerformanceTable(filtered, perfTrends, document.getElementById("perfTable"), {
        chartStore: window.__perfCharts,
        sortKey: perfSortKey,
        sortDir: perfSortDir,
        onSort: (k) => {
          if (k === perfSortKey) perfSortDir = perfSortDir === "asc" ? "desc" : "asc";
          else {
            perfSortKey = k;
            perfSortDir = "asc";
          }
          renderPerf();
        },
      });
      if (perfRecent3Btn) {
        perfRecent3Btn.classList.toggle("active", perfUseRecent3);
        perfRecent3Btn.textContent = perfUseRecent3 ? "查看全部营期" : "仅看各班长近3期";
      }
    };
    if (perfSearchEl) perfSearchEl.oninput = renderPerf;
    if (perfRecent3Btn) {
      perfRecent3Btn.onclick = () => {
        perfUseRecent3 = !perfUseRecent3;
        renderPerf();
      };
    }
    if (perfExportBtn) {
      perfExportBtn.onclick = () => {
        const perfRows = getPerfRows();
        const perfTrends = getPerfTrends();
        const baseRows = (perfLastRows && perfLastRows.length ? perfLastRows : perfRows).slice();
        if (!baseRows.length) return;

        const ts = formatTs(new Date());

        const fmt2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "" : Number(v).toFixed(2));
        const fmtPct2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "" : `${(Number(v) * 100).toFixed(2)}%`);

        const baseByMonitor = new Map();
        baseRows.forEach((r) => baseByMonitor.set(String(r["班长"] ?? ""), r));

        const pairsByMonitor = new Map();
        let maxPeriods = 0;
        Array.from(baseByMonitor.keys()).forEach((monitor) => {
          const t = perfTrends?.[monitor];
          const camps = t?.camps || [];
          const openTs = t?.open_ts || [];
          const pairs = [];
          for (let i = 0; i < camps.length; i += 1) {
            const camp = camps[i];
            const campNum = camp === null || camp === undefined || camp === "" ? Number.NaN : Number(camp);
            const ot0 = openTs?.[i];
            const ot = ot0 === null || ot0 === undefined || Number.isNaN(ot0) ? Number.NEGATIVE_INFINITY : Number(ot0);
            pairs.push({
              camp,
              campNum,
              openTs: ot,
              roi: t?.roi?.[i],
              marketRoi: t?.market_roi?.[i],
              arpu: t?.arpu?.[i],
              marketArpu: t?.market_arpu?.[i],
              cvr: t?.cvr?.[i],
              z: t?.z?.[i],
            });
          }
          pairs.sort((a, b) => {
            if (a.openTs !== b.openTs) return a.openTs - b.openTs;
            const an = Number.isNaN(a.campNum) ? Number.NEGATIVE_INFINITY : a.campNum;
            const bn = Number.isNaN(b.campNum) ? Number.NEGATIVE_INFINITY : b.campNum;
            return an - bn;
          });
          pairsByMonitor.set(monitor, pairs);
          maxPeriods = Math.max(maxPeriods, pairs.length);
        });

        const baseHeaders = [
          "大组",
          "小组",
          "班长",
          "ROI",
          "转化率",
          "个销占比",
          "均承载",
          "添加成本",
          "添加产值",
          "营期数",
          "超大盘率",
          "平均百分位",
          "客单价",
          "标准差",
          "CV",
          "趋势斜率",
        ];

        const trendHeaders = [];
        for (let j = 1; j <= maxPeriods; j += 1) {
          const s = `-${j}`;
          trendHeaders.push(
            `营期_${s}`,
            `ROI_${s}`,
            `大盘ROI_${s}`,
            `添加产值_${s}`,
            `大盘添加产值_${s}`,
            `转化率_${s}`,
            `Z-score_${s}`
          );
        }

        const allHeaders = baseHeaders.concat(trendHeaders);
        const allRows = [];
        Array.from(baseByMonitor.entries()).forEach(([monitor, base]) => {
          const pairs = pairsByMonitor.get(monitor) || [];
          const row = [
            base?.["大组"] ?? "",
            base?.["小组"] ?? "",
            monitor,
            base?.["ROI"] ?? "",
            base?.["转化率"] ?? "",
            base?.["个销占比"] ?? "",
            base?.["均承载"] ?? "",
            base?.["添加成本"] ?? "",
            base?.["添加产值"] ?? "",
            base?.["营期数"] ?? "",
            base?.["超大盘率"] ?? "",
            base?.["平均百分位"] ?? "",
            base?.["客单价"] ?? "",
            base?.["标准差"] ?? "",
            base?.["CV"] ?? "",
            base?.["趋势斜率"] ?? "",
          ];
          for (let j = 1; j <= maxPeriods; j += 1) {
            const idx = pairs.length - j;
            if (idx < 0) {
              row.push("", "", "", "", "", "", "");
              continue;
            }
            const p = pairs[idx];
            row.push(p?.camp ?? "", fmt2(p?.roi), fmt2(p?.marketRoi), fmt2(p?.arpu), fmt2(p?.marketArpu), fmtPct2(p?.cvr), fmt2(p?.z));
          }
          allRows.push(row);
        });
        downloadTextFile(`班长业绩分析_全量_${ts}.csv`, buildCsvText(allHeaders, allRows));
      };
    }
    if (perfExportByDayBtn) {
      perfExportByDayBtn.onclick = () => {
        const perfRows = getPerfRows();
        const perfTrends = getPerfTrends();
        const baseRows = (perfLastRows && perfLastRows.length ? perfLastRows : perfRows).slice();
        if (!baseRows.length) return;

        const campRows = (data.tables?.monitor_camp || []).slice();
        const campIndex = new Map();
        campRows.forEach((r) => {
          const m = String(r["班长"] ?? "").trim();
          const camp = r["营期"];
          const ot = r["开营时间_ts"];
          const key = `${m}||${camp}||${ot}`;
          if (m) campIndex.set(key, r);
        });

        const campMarket = new Map();
        campRows.forEach((r) => {
          const proj = String(r["项目"] ?? "").trim();
          const camp = r["营期"];
          const ot = r["开营时间_ts"];
          const key = `${proj}||${camp}||${ot}`;
          const cur = campMarket.get(key) || { flow: 0, cost: 0, add: 0, orders: 0, personalOrders: 0, pendingRateW: 0, pendingRateDen: 0, pendingTurnW: 0, pendingTurnDen: 0, d: {} };
          cur.flow += Number(r["总流水_num"] || 0);
          cur.cost += Number(r["总成本_num"] || 0);
          const addCnt = Number(r["添加数_num"] || 0);
          cur.add += addCnt;
          const orders = Number(r["总单数_num"] || 0);
          cur.orders += orders;
          cur.personalOrders += (Number(r["个销占比_num"] || 0) || 0) * orders;
          cur.d[3] = (cur.d[3] || 0) + (Number(r["day3转率_num"] || 0) || 0) * addCnt;
          cur.d[4] = (cur.d[4] || 0) + (Number(r["day4转率_num"] || 0) || 0) * addCnt;
          cur.d[5] = (cur.d[5] || 0) + (Number(r["day5转率_num"] || 0) || 0) * addCnt;
          cur.d[6] = (cur.d[6] || 0) + (Number(r["day6转率_num"] || 0) || 0) * addCnt;
          cur.d[7] = (cur.d[7] || 0) + (Number(r["day7转率_num"] || 0) || 0) * addCnt;
          cur.pendingRateW += (Number(r["待支付率_num"] || 0) || 0) * orders;
          cur.pendingRateDen += orders;
          cur.pendingTurnW += (Number(r["待支付转率_num"] || 0) || 0) * orders;
          cur.pendingTurnDen += orders;
          campMarket.set(key, cur);
        });

        const ts = formatTs(new Date());
        const fmt2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "" : Number(v).toFixed(2));
        const fmtPct2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "" : `${(Number(v) * 100).toFixed(2)}%`);

        const headers = [
          "营期",
          "大组",
          "小组",
          "班长",
          "ROI",
          "转化率",
          "大盘转化率",
          "个销占比",
          "大盘个销占比",
          "均承载",
          "添加成本",
          "添加产值",
          "大盘产值",
          "待支付率",
          "大盘待支付率",
          "待支付转化率",
          "大盘待支付转化率",
          "定金人数",
          "定金回收率",
          "高沉浸率",
          "高沉浸转率",
          "day3转率",
          "day4转率",
          "day5转率",
          "day6转率",
          "day7转率",
          "day3大盘转率",
          "day4大盘转率",
          "day5大盘转率",
          "day6大盘转率",
          "day7大盘转率",
        ];

        const baseByMonitor = new Map();
        baseRows.forEach((r) => baseByMonitor.set(String(r["班长"] ?? ""), r));

        const allRows = [];
        Array.from(baseByMonitor.keys()).forEach((monitor) => {
          const t = perfTrends?.[monitor];
          const camps = t?.camps || [];
          const openTs = t?.open_ts || [];
          for (let i = 0; i < camps.length; i += 1) {
            const camp = camps[i];
            const ot = openTs?.[i];
            const key = `${monitor}||${camp}||${ot}`;
            const r = campIndex.get(key);
            if (!r) continue;
            const proj = String(r["项目"] ?? "").trim();
            const mktKey = `${proj}||${r["营期"]}||${r["开营时间_ts"]}`;
            const mkt = campMarket.get(mktKey) || { flow: 0, cost: 0, add: 0, orders: 0, personalOrders: 0, pendingRateW: 0, pendingRateDen: 0, pendingTurnW: 0, pendingTurnDen: 0, d: {} };
            const marketArpu = mkt.add ? mkt.flow / mkt.add : 0;
            const marketCvr = mkt.add ? mkt.orders / mkt.add : 0;
            const marketPersonalShare = mkt.orders ? mkt.personalOrders / mkt.orders : 0;
            const marketPendingRate = mkt.pendingRateDen ? mkt.pendingRateW / mkt.pendingRateDen : 0;
            const marketPendingTurn = mkt.pendingTurnDen ? mkt.pendingTurnW / mkt.pendingTurnDen : 0;
            const marketDay = (d) => (mkt.add ? (mkt.d?.[d] || 0) / mkt.add : 0);
            const addCost = Number(r["添加数_num"] || 0) ? Number(r["总成本_num"] || 0) / Number(r["添加数_num"] || 0) : 0;
            allRows.push([
              r["营期"] ?? "",
              r["大组"] ?? "",
              r["小组"] ?? "",
              monitor,
              r["ROI"] ?? "",
              r["转化率"] ?? "",
              fmtPct2(marketCvr),
              r["个销占比"] ?? "",
              fmtPct2(marketPersonalShare),
              r["添加数"] ?? "",
              fmt2(addCost),
              r["添加产值"] ?? "",
              fmt2(marketArpu),
              r["待支付率"] ?? "",
              fmtPct2(marketPendingRate),
              r["待支付转率"] ?? "",
              fmtPct2(marketPendingTurn),
              r["定金人数"] ?? "",
              r["定金回收率"] ?? "",
              r["高沉浸率"] ?? "",
              r["高沉浸转率"] ?? "",
              r["day3转率"] ?? "",
              r["day4转率"] ?? "",
              r["day5转率"] ?? "",
              r["day6转率"] ?? "",
              r["day7转率"] ?? "",
              fmtPct2(marketDay(3)),
              fmtPct2(marketDay(4)),
              fmtPct2(marketDay(5)),
              fmtPct2(marketDay(6)),
              fmtPct2(marketDay(7)),
            ]);
          }
        });
        downloadTextFile(`营期BYDAY数据.csv`, buildCsvText(headers, allRows));
      };
    }
    const renderUpgrade = () => {
      const up = data.upgrade;
      const k1 = document.getElementById("kpiUpgradeRateDedup");
      const k2 = document.getElementById("kpiUpgradeRateTimes");
      const k3 = document.getElementById("kpiPeopleEff");
      const k4 = document.getElementById("kpiUpgradeMonitorCnt");
      const k5 = document.getElementById("kpiUpgradeMonitorCntTimes");
      const k6 = document.getElementById("kpiUpgradeCampCnt");

      if (!up) {
        [k1, k2, k3, k4, k5, k6].forEach((el) => el && (el.textContent = "-"));
        const tableEl = document.getElementById("upgradeMonitorTable");
        const expandEl = document.getElementById("upgradeExpand");
        if (tableEl) tableEl.innerHTML = "";
        if (expandEl) expandEl.innerHTML = "";
        return;
      }

      k1.textContent = up.overall?.升班率_去重 ?? "-";
      k2.textContent = up.overall?.升班率_班次 ?? "-";
      k3.textContent = up.overall?.人效 ?? "-";
      k4.textContent = up.overall?.覆盖班长数 ?? "-";
      k5.textContent = up.overall?.覆盖班长数_班次 ?? "-";
      k6.textContent = up.overall?.覆盖营期数 ?? "-";

      const campRows = (up.by_camp || []).slice();
      const camps = campRows.map((r) => r["营期"]);

      const chartUpgradeRate = echarts.init(document.getElementById("chartUpgradeRate"));
      charts.push(chartUpgradeRate);
      chartUpgradeRate.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis" },
        legend: { top: 0, left: "left", textStyle: { color: axisLabelColor } },
        grid: { left: 66, right: 22, top: 44, bottom: 34 },
        xAxis: { type: "category", data: camps, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: [
          { type: "value", axisLabel: { color: axisLabelColor, margin: 10 }, splitLine: { lineStyle: { color: splitLineColor } } },
          { type: "value", axisLabel: { color: axisLabelColor, margin: 10, formatter: (v) => `${(v * 100).toFixed(0)}%` }, splitLine: { show: false } },
        ],
        series: [
          {
            name: "总班长数",
            type: "bar",
            yAxisIndex: 0,
            barMaxWidth: 28,
            z: 1,
            itemStyle: { color: "rgba(71, 85, 105, 0.25)" },
            label: { show: true, position: "top", color: axisLabelColor, formatter: (p) => fmtInt(p.value || 0) },
            data: campRows.map((r) => r["班长数"] || 0),
          },
          {
            name: "升班率",
            type: "line",
            yAxisIndex: 1,
            smooth: 0.25,
            symbol: "circle",
            symbolSize: 6,
            z: 2,
            lineStyle: { width: 2, color: "rgba(245, 158, 11, 0.65)" },
            itemStyle: { color: "rgba(245, 158, 11, 0.65)" },
            label: { show: true, position: "top", color: axisLabelColor, formatter: (p) => `${(Number(p.value || 0) * 100).toFixed(1)}%` },
            data: campRows.map((r) => r["升班率_num"] || 0),
          },
        ],
      });

      const chartPeopleEff = echarts.init(document.getElementById("chartPeopleEff"));
      charts.push(chartPeopleEff);
      chartPeopleEff.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis" },
        grid: { left: 66, right: 22, top: 18, bottom: 34 },
        xAxis: { type: "category", data: camps, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: "value", axisLabel: { color: axisLabelColor, margin: 10 }, splitLine: { lineStyle: { color: splitLineColor } } },
        series: [
          {
            name: "人效",
            type: "line",
            smooth: 0.25,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: { width: 2, color: "#0f766e" },
            itemStyle: { color: "#0f766e" },
            label: { show: true, position: "top", color: axisLabelColor, formatter: (p) => Number(p.value || 0).toFixed(1) },
            data: campRows.map((r) => r["人效_num"] || 0),
          },
        ],
      });

      const chartClassTypeStack = echarts.init(document.getElementById("chartClassTypeStack"));
      charts.push(chartClassTypeStack);
      chartClassTypeStack.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0, left: "left", textStyle: { color: axisLabelColor } },
        grid: { left: 66, right: 22, top: 44, bottom: 34 },
        xAxis: { type: "category", data: camps, axisLabel: { color: axisLabelColor }, axisLine: { lineStyle: { color: axisLineColor } } },
        yAxis: { type: "value", axisLabel: { color: axisLabelColor, margin: 10 }, splitLine: { lineStyle: { color: splitLineColor } } },
        series: [
          {
            name: "未知",
            type: "bar",
            stack: "t",
            barMaxWidth: 24,
            itemStyle: { color: "rgba(15, 23, 42, 0.25)" },
            label: { show: true, position: "inside", color: axisLabelColor, formatter: (p) => (Number(p.value || 0) > 0 ? fmtInt(p.value || 0) : "") },
            labelLayout: { hideOverlap: true },
            data: campRows.map((r) => r["未知班长数"] || 0),
          },
          {
            name: "小班",
            type: "bar",
            stack: "t",
            barMaxWidth: 24,
            itemStyle: { color: "rgba(29, 78, 216, 0.55)" },
            label: { show: true, position: "inside", color: "#fff", formatter: (p) => (Number(p.value || 0) > 0 ? fmtInt(p.value || 0) : "") },
            labelLayout: { hideOverlap: true },
            data: campRows.map((r) => r["小班班长数"] || 0),
          },
          {
            name: "中班",
            type: "bar",
            stack: "t",
            barMaxWidth: 24,
            itemStyle: { color: "rgba(245, 158, 11, 0.75)" },
            label: { show: true, position: "inside", color: "#0f172a", formatter: (p) => (Number(p.value || 0) > 0 ? fmtInt(p.value || 0) : "") },
            labelLayout: { hideOverlap: true },
            data: campRows.map((r) => r["中班班长数"] || 0),
          },
          {
            name: "大班",
            type: "bar",
            stack: "t",
            barMaxWidth: 24,
            itemStyle: { color: "rgba(239, 68, 68, 0.75)" },
            label: { show: true, position: "inside", color: "#fff", formatter: (p) => (Number(p.value || 0) > 0 ? fmtInt(p.value || 0) : "") },
            labelLayout: { hideOverlap: true },
            data: campRows.map((r) => r["大班班长数"] || 0),
          },
        ],
      });

      const classTypeTableEl = document.getElementById("upgradeClassTypeTable");
      if (classTypeTableEl) {
        const rows = (up.class_type_metrics || []).slice();
        let sortKey2 = "ROI_num";
        let sortDir2 = "desc";

        const th2 = (label, key) => {
          const active = key === sortKey2;
          const icon = active ? (sortDir2 === "asc" ? "▲" : "▼") : "↕";
          return `<th class="sortable" data-key="${key}">${label} <span class="sortIcon">${icon}</span></th>`;
        };
        const render = () => {
          const dir = sortDir2 === "desc" ? -1 : 1;
          rows.sort((a, b) => {
            const av0 = a?.[sortKey2];
            const bv0 = b?.[sortKey2];
            const av = av0 === null || av0 === undefined || Number.isNaN(av0) ? Number.NEGATIVE_INFINITY : Number(av0);
            const bv = bv0 === null || bv0 === undefined || Number.isNaN(bv0) ? Number.NEGATIVE_INFINITY : Number(bv0);
            if (av !== bv) return (av - bv) * dir;
            return String(a["班型"] || "").localeCompare(String(b["班型"] || ""), "zh");
          });
          classTypeTableEl.innerHTML = `
            <thead>
              <tr>
                <th>班型</th>
                ${th2("班长数(班次)", "班长数_班次_num")}
                ${th2("人效", "人效_num")}
                ${th2("ROI", "ROI_num")}
                ${th2("添加产值", "添加产值_num")}
                ${th2("转化率", "转化率_num")}
                ${th2("D3出单占比", "D3出单占比_num")}
                ${th2("D6-7出单占比", "D6-7出单占比_num")}
                ${th2("待支付率", "待支付率_num")}
                ${th2("待支付转率", "待支付转率_num")}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r) => {
                  return `
                    <tr>
                      <td>${classTagHtml(r["班型"])}</td>
                      <td>${r["班长数_班次"]}</td>
                      <td>${r["人效"]}</td>
                      <td>${r["ROI"]}</td>
                      <td>${r["添加产值"]}</td>
                      <td>${r["转化率"]}</td>
                      <td>${r["D3出单占比"]}</td>
                      <td>${r["D6-7出单占比"]}</td>
                      <td>${r["待支付率"]}</td>
                      <td>${r["待支付转率"]}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          `;
          Array.from(classTypeTableEl.querySelectorAll("th.sortable")).forEach((h) => {
            h.onclick = () => {
              const k = h.dataset.key;
              if (!k) return;
              if (k === sortKey2) sortDir2 = sortDir2 === "asc" ? "desc" : "asc";
              else {
                sortKey2 = k;
                sortDir2 = "desc";
              }
              render();
            };
          });
        };
        render();
      }

      const searchEl = document.getElementById("upgradeSearch");
      const tableEl = document.getElementById("upgradeMonitorTable");
      const allRows = (up.monitors?.list || []).slice();
      const timeline = up.monitors?.timeline_by_monitor || {};
      const market = up.market || {};
      const marketRoi = market.roi || null;
      const marketCvr = market.cvr || null;
      const marketArpu = market.arpu || null;
      let sortKey = "升班期数_num";
      let sortDir = "desc";
      let expanded = null;
      let upgradeCharts = [];

      const safeDomId = (s0) => String(s0 || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const momSpan = (text, v0) => {
        const v = Number(v0);
        if (!Number.isFinite(v) || !text || text === "-") return `${text || "-"}`;
        const cls = v > 0 ? "momUp" : v < 0 ? "momDown" : "";
        return cls ? `<span class="${cls}">${text}</span>` : `${text}`;
      };

      const buildExpandHtml = (monitor) => {
        const rows = (timeline?.[monitor] || []).slice().sort((a, b) => Number(a["营期"] || 0) - Number(b["营期"] || 0));
        const sid = safeDomId(monitor);
        const idRoi = `up_trend_roi_${sid}`;
        const idArpu = `up_trend_arpu_${sid}`;
        const idCvr = `up_trend_cvr_${sid}`;
        const head = `
          <div class="expandHead">
            <div class="expandTitle">${monitor}</div>
            <button class="btn" type="button" data-collapse="1">收起</button>
          </div>
        `;
        const chartsHtml = `
          <div class="upgradeTrendGrid">
            <div class="miniChart" id="${idCvr}"></div>
            <div class="miniChart" id="${idArpu}"></div>
            <div class="miniChart" id="${idRoi}"></div>
          </div>
        `;
        const thead = `
          <thead>
            <tr>
              <th>营期</th>
              <th>班型</th>
              <th>班长数</th>
              <th>添加数</th>
              <th>转化率</th>
              <th>添加产值</th>
              <th>ROI</th>
              <th>总成本</th>
              <th>总流水</th>
            </tr>
          </thead>
        `;
        const tbody = `
          <tbody>
            ${rows
              .map((r) => {
                const t = String(r["班型"] ?? "未知");
                const cls = t === "中班" ? "mid" : t === "大班" ? "large" : t === "小班" ? "small" : "unknown";
                return `
                  <tr class="classRow ${cls}">
                    <td>${r["营期"] ?? ""}</td>
                    <td>${classTagHtml(t)}</td>
                    <td>${r["班长数"] ?? ""}</td>
                    <td>${r["添加数"] ?? ""}</td>
                    <td>${r["转化率"] ?? ""}</td>
                    <td>${r["添加产值"] ?? ""}</td>
                    <td>${r["ROI"] ?? ""}</td>
                    <td>${r["总成本"] ?? ""}</td>
                    <td>${r["总流水"] ?? ""}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        `;
        return `${head}${chartsHtml}<div class="tableWrap"><table class="table tableCompact">${thead}${tbody}</table></div>`;
      };

      const disposeUpgradeCharts = () => {
        (upgradeCharts || []).forEach((c) => {
          try {
            c.dispose();
          } catch {}
        });
        upgradeCharts = [];
        window.__upgradeCharts = [];
      };

      const buildMiniLineOption = ({ title, camps, yFormatter, monitorName, seriesColor, values, marketValues }) => {
        return {
          backgroundColor: "transparent",
          title: { text: title, left: "center", top: 0, textStyle: { fontSize: 12, fontWeight: 650, color: axisLabelColor } },
          tooltip: { trigger: "axis" },
          legend: { show: true, top: 22, left: "center", textStyle: { color: axisLabelColor, fontSize: 11 } },
          grid: { left: 56, right: 16, top: 46, bottom: 26 },
          xAxis: { type: "category", data: camps, axisLabel: { color: axisLabelColor, fontSize: 10 }, axisLine: { lineStyle: { color: axisLineColor } } },
          yAxis: {
            type: "value",
            axisLabel: { color: axisLabelColor, fontSize: 10, margin: 10, formatter: yFormatter || ((v) => v) },
            splitLine: { lineStyle: { color: splitLineColor } },
          },
          series: [
            {
              name: monitorName,
              type: "line",
              smooth: 0.25,
              symbol: "circle",
              symbolSize: 5,
              lineStyle: { width: 2, color: seriesColor },
              itemStyle: { color: seriesColor },
              data: values,
            },
            {
              name: "大盘",
              type: "line",
              smooth: 0.25,
              symbol: "none",
              lineStyle: { width: 2, type: "dashed", color: "rgba(15, 23, 42, 0.45)" },
              data: marketValues,
            },
          ],
        };
      };

      const renderUpgradeCharts = (monitor) => {
        disposeUpgradeCharts();
        const sid = safeDomId(monitor);
        const elRoi = document.getElementById(`up_trend_roi_${sid}`);
        const elArpu = document.getElementById(`up_trend_arpu_${sid}`);
        const elCvr = document.getElementById(`up_trend_cvr_${sid}`);
        if (!elRoi || !elArpu || !elCvr) return;
        const rows = (timeline?.[monitor] || []).slice().sort((a, b) => Number(a["营期"] || 0) - Number(b["营期"] || 0));
        const camps = rows.map((r) => r["营期"]);

        const cvrChart = echarts.init(elCvr);
        const arpuChart = echarts.init(elArpu);
        const roiChart = echarts.init(elRoi);
        upgradeCharts = [cvrChart, arpuChart, roiChart];
        window.__upgradeCharts = upgradeCharts;

        cvrChart.setOption(
          buildMiniLineOption({
            title: "转化率",
            camps,
            yFormatter: (v) => `${(Number(v) * 100).toFixed(0)}%`,
            monitorName: "班长",
            seriesColor: "rgba(15, 118, 110, 0.85)",
            values: rows.map((r) => Number(r["转化率_num"] || 0)),
            marketValues: camps.map((c) => (marketCvr?.get?.(c) ?? 0)),
          })
        );
        arpuChart.setOption(
          buildMiniLineOption({
            title: "添加产值",
            camps,
            monitorName: "班长",
            seriesColor: "rgba(37, 99, 235, 0.85)",
            values: rows.map((r) => Number(r["添加产值_num"] || 0)),
            marketValues: camps.map((c) => (marketArpu?.get?.(c) ?? 0)),
          })
        );
        roiChart.setOption(
          buildMiniLineOption({
            title: "ROI",
            camps,
            monitorName: "班长",
            seriesColor: "rgba(245, 158, 11, 0.85)",
            values: rows.map((r) => Number(r["ROI_num"] || 0)),
            marketValues: camps.map((c) => (marketRoi?.get?.(c) ?? 0)),
          })
        );
      };

      const renderTable = () => {
        const q = (searchEl?.value || "").trim().toLowerCase();
        const filtered = allRows.filter((r) => {
          if (!q) return true;
          const hay = `${r["班长"] || ""} ${r["大组"] || ""} ${r["小组"] || ""}`.toLowerCase();
          return hay.includes(q);
        });
        if (expanded && !filtered.some((r) => String(r["班长"] || "") === String(expanded))) expanded = null;
        const dir = sortDir === "desc" ? -1 : 1;
        filtered.sort((a, b) => {
          const av0 = a?.[sortKey];
          const bv0 = b?.[sortKey];
          const av = av0 === null || av0 === undefined || Number.isNaN(av0) ? Number.NEGATIVE_INFINITY : Number(av0);
          const bv = bv0 === null || bv0 === undefined || Number.isNaN(bv0) ? Number.NEGATIVE_INFINITY : Number(bv0);
          if (av !== bv) return (av - bv) * dir;
          return String(a["班长"] || "").localeCompare(String(b["班长"] || ""), "zh");
        });
        const th = (label, key) => {
          const active = key === sortKey;
          const icon = active ? (sortDir === "asc" ? "▲" : "▼") : "↕";
          return `<th class="sortable" data-key="${key}">${label} <span class="sortIcon">${icon}</span></th>`;
        };
        const colSpan = 16;
        tableEl.innerHTML = `
          <thead>
            <tr>
              <th>大组</th>
              <th>小组</th>
              <th>班长</th>
              ${th("总营期数", "总营期数_num")}
              ${th("升班期数", "升班期数_num")}
              ${th("升班率", "升班率_num")}
              ${th("中班期数", "中班期数_num")}
              ${th("大班期数", "大班期数_num")}
              ${th("最近营期", "最近营期_num")}
              <th>最近班型</th>
              ${th("最近ROI", "最近ROI_num")}
              ${th("ROI环比", "最近ROI环比_num")}
              ${th("最近转化率", "最近转化率_num")}
              ${th("转化率环比", "最近转化率环比_num")}
              ${th("最近添加产值", "最近添加产值_num")}
              ${th("添加产值环比", "最近添加产值环比_num")}
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((r) => {
                const m = String(r["班长"] || "");
                const base = `
                  <tr class="clickRow" data-monitor="${r["班长"]}">
                    <td>${r["大组"] || ""}</td>
                    <td>${r["小组"] || ""}</td>
                    <td class="strong">${r["班长"] || ""}</td>
                    <td>${r["总营期数"] || ""}</td>
                    <td>${r["升班期数"] || ""}</td>
                    <td>${r["升班率"] || ""}</td>
                    <td>${r["中班期数"] || ""}</td>
                    <td>${r["大班期数"] || ""}</td>
                    <td>${r["最近营期"] || ""}</td>
                    <td>${classTagHtml(r["最近班型"])}</td>
                    <td>${r["最近ROI"] || ""}</td>
                    <td>${momSpan(r["最近ROI环比"] || "", r["最近ROI环比_num"])}</td>
                    <td>${r["最近转化率"] || ""}</td>
                    <td>${momSpan(r["最近转化率环比"] || "", r["最近转化率环比_num"])}</td>
                    <td>${r["最近添加产值"] || ""}</td>
                    <td>${momSpan(r["最近添加产值环比"] || "", r["最近添加产值环比_num"])}</td>
                  </tr>
                `;
                if (expanded && String(expanded) === m) {
                  const expandHtml = buildExpandHtml(m);
                  return `${base}<tr class="expandRow"><td colspan="${colSpan}"><div class="expandInline">${expandHtml}</div></td></tr>`;
                }
                return base;
              })
              .join("")}
          </tbody>
        `;
        Array.from(tableEl.querySelectorAll("th.sortable")).forEach((h) => {
          h.onclick = () => {
            const k = h.dataset.key;
            if (!k) return;
            if (k === sortKey) sortDir = sortDir === "asc" ? "desc" : "asc";
            else {
              sortKey = k;
              sortDir = "desc";
            }
            renderTable();
          };
        });
        Array.from(tableEl.querySelectorAll("tr.clickRow")).forEach((tr) => {
          tr.onclick = () => {
            const m = tr.dataset.monitor;
            if (!m) return;
            expanded = expanded === m ? null : m;
            renderTable();
          };
        });
        const collapseBtn = tableEl.querySelector('button[data-collapse="1"]');
        if (collapseBtn)
          collapseBtn.onclick = (e) => {
            e.stopPropagation();
            expanded = null;
            renderTable();
          };

        if (expanded) renderUpgradeCharts(expanded);
        else disposeUpgradeCharts();
      };

      if (searchEl) searchEl.oninput = () => renderTable();
      renderTable();
    };

    renderPerf();
    renderUpgrade();

    window.onresize = () => {
      charts.forEach((c) => c.resize());
      ;(window.__perfCharts || []).forEach((c) => {
        try {
          c.resize();
        } catch {}
      });
      ;(window.__upgradeCharts || []).forEach((c) => {
        try {
          c.resize();
        } catch {}
      });
    };
    setTab("overview");
  };

  window.renderAll = renderAll;
})();
