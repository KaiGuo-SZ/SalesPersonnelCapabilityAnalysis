(() => {
  const $ = (id) => document.getElementById(id);

  const setStatus = (txt) => {
    const el = $("statusText");
    if (el) el.textContent = txt;
  };

  const uniq = (arr) => Array.from(new Set(arr));

  const detectMonthKey = (headers) => {
    const keys = headers || [];
    if (keys.includes("月份")) return "月份";
    const candidates = keys.filter((k) => /月|month|Month|日期|时间/.test(k));
    return candidates.length ? candidates[0] : null;
  };

  const normalizeMonth = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const m = s.match(/(\d{1,2})/);
    if (!m) return s;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const parseTSVUtf16 = async (file) => {
    const buf = await file.arrayBuffer();
    const txt = new TextDecoder("utf-16le").decode(buf);
    const lines = txt.replace(/\u0000/g, "").split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split("\t").map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        const cell = parts[j] ?? "";
        const v = cell.length >= 2 && cell.startsWith("\"") && cell.endsWith("\"") ? cell.slice(1, -1) : cell;
        row[headers[j]] = v;
      }
      rows.push(row);
    }
    return { headers, rows };
  };

  const parseCSVCommaUtf8 = async (file) => {
    const buf = await file.arrayBuffer();
    const txt0 = new TextDecoder("utf-8").decode(buf);
    const txt = txt0.replace(/^\uFEFF/, "");
    const lines = txt.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        const cell = (parts[j] ?? "").trim();
        const v = cell.length >= 2 && cell.startsWith("\"") && cell.endsWith("\"") ? cell.slice(1, -1) : cell;
        row[headers[j]] = v;
      }
      rows.push(row);
    }
    return { headers, rows };
  };

  const renderChecklist = (containerEl, values, selectedSet) => {
    containerEl.innerHTML = values
      .map((v) => {
        const id = `${containerEl.id}_${String(v).replace(/[^\w\u4e00-\u9fa5]/g, "_")}`;
        const checked = selectedSet.has(String(v)) ? "checked" : "";
        return `<label class="checkItem" for="${id}"><input id="${id}" type="checkbox" value="${String(v)}" ${checked} />${String(v)}</label>`;
      })
      .join("");
  };

  const renderChecklistLabeled = (containerEl, items, selectedSet) => {
    containerEl.innerHTML = (items || [])
      .map((it) => {
        const v = String(it?.value ?? "");
        const label = String(it?.label ?? v);
        const id = `${containerEl.id}_${String(v).replace(/[^\w\u4e00-\u9fa5]/g, "_")}`;
        const checked = selectedSet.has(v) ? "checked" : "";
        return `<label class="checkItem" for="${id}"><input id="${id}" type="checkbox" value="${v}" ${checked} />${label}</label>`;
      })
      .join("");
  };

  const setAllChecklist = (containerEl, value) => {
    containerEl.querySelectorAll("input[type=checkbox]").forEach((el) => (el.checked = value));
  };

  const getCheckedValues = (containerEl) => Array.from(containerEl.querySelectorAll("input[type=checkbox]:checked")).map((el) => el.value);

  let rawRows = [];
  let headers = [];
  let monthKey = null;
  let classTypeMap = {};

  const init = () => {
    $("metaUpdatedAt").textContent = "数据更新时间：-";
    $("metaSelection").textContent = "月份：- · 营期：-";
    $("metaLogic").textContent = "统计逻辑：analyze_data.py（口径复刻）";

    const fileInput = $("fileInput");
    const typeFileInput = $("typeFileInput");
    const monthToggle = $("monthToggle");
    const monthPanel = $("monthPanel");
    const monthList = $("monthList");
    const campToggle = $("campToggle");
    const campPanel = $("campPanel");
    const campList = $("campList");
    const lgList = $("lgList");
    const lgToggle = $("lgToggle");
    const lgPanel = $("lgPanel");
    const sgToggle = $("sgToggle");
    const sgPanel = $("sgPanel");
    const sgList = $("sgList");
    const tierToggle = $("tierToggle");
    const tierPanel = $("tierPanel");
    const tierList = $("tierList");
    const empToggle = $("empToggle");
    const empPanel = $("empPanel");
    const empList = $("empList");
    const runBtn = $("runBtn");

    const refreshLargeGroupTitle = () => {
      const selected = getCheckedValues(lgList);
      if (!selected.length) lgToggle.textContent = "选择大组";
      else if (selected.length <= 2) lgToggle.textContent = selected.join("、");
      else lgToggle.textContent = `已选 ${selected.length} 个大组`;
      $("lgHint").textContent = selected.length ? `当前选择：${selected.join("、")}` : "未选择将视为不过滤";
    };

    const refreshSmallGroupTitle = () => {
      const selected = getCheckedValues(sgList);
      if (!selected.length) sgToggle.textContent = "选择小组";
      else if (selected.length <= 2) sgToggle.textContent = selected.join("、");
      else sgToggle.textContent = `已选 ${selected.length} 个小组`;
    };

    const refreshTierTitle = () => {
      const selected = getCheckedValues(tierList);
      const map = { head: "头部", mid: "中部", tail: "尾部" };
      const labels = selected.map((x) => map[String(x)] || String(x));
      if (!labels.length) tierToggle.textContent = "选择分层";
      else if (labels.length <= 2) tierToggle.textContent = labels.join("、");
      else tierToggle.textContent = `已选 ${labels.length} 个`;
    };

    const refreshEmpTitle = () => {
      const selected = getCheckedValues(empList);
      if (!selected.length) empToggle.textContent = "选择入职状态";
      else if (selected.length <= 3) empToggle.textContent = selected.join("、");
      else empToggle.textContent = `已选 ${selected.length} 个`;
    };

    const attachDrop = (toggleEl, panelEl) => {
      toggleEl.onclick = () => panelEl.classList.toggle("hidden");
      document.addEventListener("click", (e) => {
        if (!panelEl || panelEl.classList.contains("hidden")) return;
        const wrap = panelEl.parentElement;
        if (wrap && !wrap.contains(e.target)) panelEl.classList.add("hidden");
      });
    };

    const refreshMonthTitle = () => {
      const selected = getCheckedValues(monthList);
      if (!selected.length) monthToggle.textContent = "选择月份";
      else if (selected.length <= 2) monthToggle.textContent = selected.join("、");
      else monthToggle.textContent = `已选 ${selected.length} 个`;
    };

    const refreshCampTitle = () => {
      const selected = getCheckedValues(campList);
      if (!selected.length) campToggle.textContent = "选择营期";
      else if (selected.length <= 2) campToggle.textContent = selected.join("、");
      else campToggle.textContent = `已选 ${selected.length} 个`;
    };

    const computeCampsByMonths = (selectedMonths) => {
      const campSet = new Set();
      const out = [];
      const monthSet = new Set((selectedMonths || []).map((x) => normalizeMonth(x)));
      for (const r of rawRows) {
        if (monthKey) {
          const mv = normalizeMonth(r[monthKey]);
          if (!monthSet.has(mv)) continue;
        }
        const c = String(r["营期"] ?? "").trim();
        if (!c) continue;
        if (campSet.has(c)) continue;
        campSet.add(c);
        out.push(c);
      }
      out.sort((a, b) => Number(a) - Number(b));
      return out;
    };

    const refreshCampListByMonth = () => {
      const prevChecked = new Set(getCheckedValues(campList).map((x) => String(x)));
      const monthsSelected = getCheckedValues(monthList);
      const camps = computeCampsByMonths(monthsSelected);
      const kept = new Set(camps.filter((c) => prevChecked.has(String(c))));
      const selectedSet = kept.size ? kept : new Set(camps);
      renderChecklist(campList, camps, selectedSet);
      campList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = refreshCampTitle));
      refreshCampTitle();
    };

    const onMonthChanged = () => {
      refreshMonthTitle();
      refreshCampListByMonth();
    };

    attachDrop(monthToggle, monthPanel);
    attachDrop(campToggle, campPanel);
    attachDrop(lgToggle, lgPanel);
    attachDrop(sgToggle, sgPanel);
    attachDrop(tierToggle, tierPanel);
    attachDrop(empToggle, empPanel);

    const tierItems = [
      { value: "head", label: "头部" },
      { value: "mid", label: "中部" },
      { value: "tail", label: "尾部" },
    ];
    renderChecklistLabeled(tierList, tierItems, new Set(tierItems.map((x) => x.value)));
    tierList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = refreshTierTitle));
    refreshTierTitle();

    const empItems = [
      { value: "老", label: "老" },
      { value: "回流", label: "回流" },
      { value: "新", label: "新" },
      { value: "未知", label: "未知" },
    ];
    renderChecklistLabeled(empList, empItems, new Set(empItems.map((x) => x.value)));
    empList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = refreshEmpTitle));
    refreshEmpTitle();

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      setStatus("解析文件中…");
      try {
        const parsed = await parseTSVUtf16(file);
        rawRows = parsed.rows;
        headers = parsed.headers;
        if (!rawRows.length) {
          setStatus("文件为空或解析失败");
          return;
        }

        monthKey = detectMonthKey(headers);
        if (!monthKey) $("monthHint").textContent = "未识别到月份列，将不按月份过滤";
        else $("monthHint").textContent = "";

        const months = monthKey ? uniq(rawRows.map((r) => normalizeMonth(r[monthKey])).filter((v) => v)) : [];
        months.sort((a, b) => String(a).localeCompare(String(b), "zh"));
        renderChecklist(monthList, months, new Set(months));
        monthList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = onMonthChanged));
        onMonthChanged();

        const largeGroups = uniq(rawRows.map((r) => String(r["大组"] ?? "").trim()).filter((v) => v));
        largeGroups.sort((a, b) => String(a).localeCompare(String(b), "zh"));
        const defaults = ["社群一部", "社群三部"].filter((x) => largeGroups.includes(x));
        const selectedSet = defaults.length ? new Set(defaults) : new Set(largeGroups);
        renderChecklist(lgList, largeGroups, selectedSet);
        lgList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = refreshLargeGroupTitle));
        refreshLargeGroupTitle();

        const smallGroups = uniq(rawRows.map((r) => String(r["小组"] ?? "").trim()).filter((v) => v));
        smallGroups.sort((a, b) => String(a).localeCompare(String(b), "zh"));
        renderChecklist(sgList, smallGroups, new Set(smallGroups));
        sgList.querySelectorAll("input[type=checkbox]").forEach((el) => (el.onchange = refreshSmallGroupTitle));
        refreshSmallGroupTitle();

        setStatus(`已导入：${file.name}（${rawRows.length}行）`);
      } catch (e) {
        setStatus(`解析失败：${e?.message || e}`);
      }
    });

    typeFileInput.addEventListener("change", async () => {
      const file = typeFileInput.files?.[0];
      if (!file) return;
      setStatus("解析班长类型中…");
      try {
        const parsed = await parseCSVCommaUtf8(file);
        const rows = parsed.rows || [];
        const map = {};
        rows.forEach((r) => {
          const k =
            String(r["班长"] ?? "").trim() ||
            String(r["班级"] ?? "")
              .replace(/-.*/, "")
              .trim();
          const v = String(r["班长类型"] ?? "").trim();
          if (k) map[k] = v;
        });
        classTypeMap = map;
        $("typeFileHint").textContent = `已导入：${file.name}（${Object.keys(map).length}条）`;
        setStatus("已导入班长类型");
      } catch (e) {
        setStatus(`班长类型解析失败：${e?.message || e}`);
      }
    });

    $("monthAll").onclick = () => {
      setAllChecklist(monthList, true);
      onMonthChanged();
    };
    $("monthClear").onclick = () => {
      setAllChecklist(monthList, false);
      onMonthChanged();
    };
    $("campAll").onclick = () => {
      setAllChecklist(campList, true);
      refreshCampTitle();
    };
    $("campClear").onclick = () => {
      setAllChecklist(campList, false);
      refreshCampTitle();
    };
    $("lgAll").onclick = () => {
      setAllChecklist(lgList, true);
      refreshLargeGroupTitle();
    };
    $("lgClear").onclick = () => {
      setAllChecklist(lgList, false);
      refreshLargeGroupTitle();
    };
    $("sgAll").onclick = () => {
      setAllChecklist(sgList, true);
      refreshSmallGroupTitle();
    };
    $("sgClear").onclick = () => {
      setAllChecklist(sgList, false);
      refreshSmallGroupTitle();
    };
    $("tierAll").onclick = () => {
      setAllChecklist(tierList, true);
      refreshTierTitle();
    };
    $("tierClear").onclick = () => {
      setAllChecklist(tierList, false);
      refreshTierTitle();
    };
    $("empAll").onclick = () => {
      setAllChecklist(empList, true);
      refreshEmpTitle();
    };
    $("empClear").onclick = () => {
      setAllChecklist(empList, false);
      refreshEmpTitle();
    };

    runBtn.addEventListener("click", () => {
      if (!rawRows.length) {
        setStatus("请先导入数据");
        return;
      }
      setStatus("计算中…");
      try {
        const months = getCheckedValues(monthList);
        const camps = getCheckedValues(campList).map((x) => Number(x));
        const largeGroups = getCheckedValues(lgList);
        const smallGroups = getCheckedValues(sgList);
        const tiers = getCheckedValues(tierList);
        const employmentStatuses = getCheckedValues(empList);
        const data = window.computeDashboardData(rawRows, { monthKey, months, camps, largeGroups, smallGroups, tiers, employmentStatuses, classTypeMap });
        window.renderAll(data);
        setStatus("已生成");
      } catch (e) {
        setStatus(`计算失败：${e?.message || e}`);
      }
    });
  };

  document.addEventListener("DOMContentLoaded", init);
})();
