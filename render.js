(function () {
    const chartStore = new Map();
    const plotlyChartIds = new Set();
    const palette = ['#2F5BEA', '#22A699', '#1F2937', '#E59E2C', '#7C6CF2', '#D35D6E', '#4C8BF5', '#7A8799'];
    const percentKeys = new Set(['转化率', '待支付率', '待支付转率', '个销占比']);
    const floatKeys = new Set(['ROI', '添加产值', '客单价']);
    const integerKeys = new Set(['添加人数', '转化人数', '添加数']);
    const moneyKeys = new Set(['流水', '成本']);
    const detailColumns = window.ABToolMetrics.ALL_METRICS;

    function escapeHtml(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function simplifyLegendName(name) {
        return String(name || '').replace(/社群/g, '');
    }

    function formatPercent(value) {
        return `${(Number(value || 0) * 100).toFixed(2)}%`;
    }

    function formatSignedPercent(value) {
        const number = Number(value || 0) * 100;
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
    }

    function formatFloat(value) {
        return Number(value || 0).toFixed(2);
    }

    function formatSignedFloat(value) {
        const number = Number(value || 0);
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}`;
    }

    function formatInteger(value) {
        return `${Math.round(Number(value || 0))}`;
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    }

    function formatChartNumber(value) {
        return Number(value || 0).toFixed(1);
    }

    function formatChartValue(value, precision, suffix) {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        return `${Number(value || 0).toFixed(precision)}${suffix || ''}`;
    }

    function formatCell(key, value, row) {
        const isDiff = row && row.label === '差值(测-对)';
        if (percentKeys.has(key)) {
            const text = isDiff ? formatSignedPercent(value) : formatPercent(value);
            if (isDiff) {
                const cls = Number(value || 0) > 0 ? 'diff-pos' : Number(value || 0) < 0 ? 'diff-neg' : 'diff-zero';
                return `<span class="${cls}">${text}</span>`;
            }
            return text;
        }
        if (floatKeys.has(key)) {
            const text = isDiff ? formatSignedFloat(value) : formatFloat(value);
            if (isDiff) {
                const cls = Number(value || 0) > 0 ? 'diff-pos' : Number(value || 0) < 0 ? 'diff-neg' : 'diff-zero';
                return `<span class="${cls}">${text}</span>`;
            }
            return text;
        }
        if (integerKeys.has(key)) {
            return formatInteger(value);
        }
        if (moneyKeys.has(key)) {
            return formatMoney(value);
        }
        return escapeHtml(value);
    }

    function disposeCharts() {
        chartStore.forEach((chart) => chart.dispose());
        chartStore.clear();
        if (window.Plotly) {
            plotlyChartIds.forEach((elementId) => {
                const element = document.getElementById(elementId);
                if (element) {
                    try {
                        window.Plotly.purge(element);
                    } catch (_) {
                        // noop
                    }
                    element.innerHTML = '';
                }
            });
        }
        plotlyChartIds.clear();
    }

    function getChartInstance(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            return null;
        }
        let chart = chartStore.get(elementId);
        if (!chart) {
            chart = window.echarts.init(element);
            chartStore.set(elementId, chart);
        }
        return chart;
    }

    function setChartOption(elementId, option) {
        const chart = getChartInstance(elementId);
        if (chart) {
            chart.setOption(option, true);
        }
    }

    function baseChartOption() {
        return {
            color: palette,
            textStyle: {
                color: '#0F172A',
                fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
            },
            legend: {
                type: 'scroll',
                top: 0,
                icon: 'roundRect',
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 14,
                textStyle: { color: '#5B687A', fontWeight: 600, fontSize: 11 }
            },
            grid: { left: 40, right: 16, top: 40, bottom: 26 },
            xAxis: {
                axisLine: { lineStyle: { color: 'rgba(148,163,184,0.24)' } },
                axisTick: { show: false },
                axisLabel: { color: '#6B7787', fontWeight: 500, fontSize: 10 }
            },
            yAxis: {
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
                axisLabel: { color: '#90A0B7', fontWeight: 500, fontSize: 10 }
            },
            tooltip: {
                backgroundColor: 'rgba(255,255,255,0.96)',
                borderColor: 'rgba(148,163,184,0.2)',
                borderWidth: 1,
                textStyle: { color: '#0F172A', fontSize: 12 },
                padding: [10, 12],
                extraCssText: 'box-shadow: 0 10px 24px rgba(15,23,42,0.08); border-radius: 12px;'
            }
        };
    }

    function renderLineChart(elementId, labels, series, options) {
        const config = Object.assign({ suffix: '', precision: 1 }, options || {});
        const option = baseChartOption();
        option.tooltip.trigger = 'axis';
        option.tooltip.valueFormatter = (value) => formatChartValue(value, config.precision, config.suffix);
        option.xAxis.type = 'category';
        option.xAxis.data = labels;
        option.yAxis.type = 'value';
        option.yAxis.axisLabel.formatter = (value) => formatChartValue(value, config.precision, config.suffix);
        option.series = series.map((item) => ({
            name: simplifyLegendName(item.name),
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 1.5, cap: 'round' },
            label: {
                show: true,
                position: 'top',
                fontWeight: 600,
                fontSize: 10,
                color: '#334155',
                formatter(params) {
                    return formatChartValue(params.value, config.precision, config.suffix);
                }
            },
            data: item.data.map((value) => Number(value || 0).toFixed(config.precision))
        }));
        setChartOption(elementId, option);
    }

    function renderBarChart(elementId, labels, series, options) {
        const config = Object.assign({ suffix: '', precision: 1 }, options || {});
        const option = baseChartOption();
        option.tooltip.trigger = 'axis';
        option.tooltip.axisPointer = { type: 'shadow' };
        option.tooltip.valueFormatter = (value) => formatChartValue(value, config.precision, config.suffix);
        option.xAxis.type = 'category';
        option.xAxis.data = labels;
        option.yAxis.type = 'value';
        option.yAxis.axisLabel.formatter = (value) => formatChartValue(value, config.precision, config.suffix);
        option.series = series.map((item) => ({
            name: simplifyLegendName(item.name),
            type: 'bar',
            barMaxWidth: 18,
            label: {
                show: true,
                fontWeight: 600,
                fontSize: 10,
                color: '#334155',
                formatter(params) {
                    return formatChartValue(params.value, config.precision, config.suffix);
                }
            },
            data: item.data.map((value) => {
                const numeric = Number(value || 0);
                return {
                    value: Number(numeric.toFixed(config.precision)),
                    itemStyle: {
                        borderRadius: numeric >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6]
                    },
                    label: {
                        position: numeric >= 0 ? 'top' : 'bottom'
                    }
                };
            })
        }));
        setChartOption(elementId, option);
    }

    function renderSummaryComparisonChart(elementId, rows) {
        const validRows = rows.filter((row) => row.label !== '差值(测-对)');
        const metrics = ['转化率', '待支付率', '待支付转率', '个销占比'];
        const metricPrecision = { 转化率: 1, 待支付率: 2, 待支付转率: 1, 个销占比: 1 };
        const primaryMetrics = new Set(['转化率', '待支付率']);
        const legend = [];
        const series = [];
        validRows.forEach((row) => {
            const rawName = row['大组'] ? `${row['大组']}-${row.label}` : row.label;
            const name = simplifyLegendName(rawName);
            legend.push(name);
            series.push({
                name,
                type: 'bar',
                yAxisIndex: 0,
                barMaxWidth: 16,
                itemStyle: { borderRadius: [6, 6, 0, 0] },
                data: metrics.map((metric) => (primaryMetrics.has(metric) ? (row[metric] || 0) * 100 : null)),
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#334155',
                    formatter(params) {
                        const metric = metrics[params.dataIndex];
                        return params.value === null ? '' : formatChartValue(params.value, metricPrecision[metric] || 1, '%');
                    }
                }
            });
            series.push({
                name,
                type: 'bar',
                yAxisIndex: 1,
                barMaxWidth: 16,
                itemStyle: { borderRadius: [6, 6, 0, 0] },
                data: metrics.map((metric) => (primaryMetrics.has(metric) ? null : (row[metric] || 0) * 100)),
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#334155',
                    formatter(params) {
                        const metric = metrics[params.dataIndex];
                        return params.value === null ? '' : formatChartValue(params.value, metricPrecision[metric] || 1, '%');
                    }
                }
            });
        });

        const option = baseChartOption();
        option.legend.data = legend;
        option.tooltip.trigger = 'axis';
        option.tooltip.axisPointer = { type: 'shadow' };
        option.tooltip.formatter = (params) => {
            const filtered = (params || []).filter((item) => item.value !== null && item.value !== undefined && item.value !== '');
            if (!filtered.length) {
                return '';
            }
            const metric = filtered[0].axisValue;
            return [
                `<div style="font-size:11px;color:#94A3B8;margin-bottom:6px;">${escapeHtml(metric)}</div>`,
                filtered.map((item) => `
                    <div style="display:flex;justify-content:space-between;gap:18px;align-items:center;">
                        <span>${escapeHtml(item.seriesName)}</span>
                        <strong>${formatChartValue(item.value, metricPrecision[metric] || 1, '%')}</strong>
                    </div>
                `).join('')
            ].join('');
        };
        option.grid = { left: 40, right: 40, top: 40, bottom: 26 };
        option.xAxis = { type: 'category', data: metrics, axisTick: { show: false }, axisLine: { lineStyle: { color: 'rgba(148,163,184,0.24)' } }, axisLabel: { color: '#475569', fontWeight: 600, fontSize: 10 } };
        option.yAxis = [
            { type: 'value', axisLabel: { formatter: (value) => `${value}%`, color: '#90A0B7', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
            { type: 'value', axisLabel: { formatter: (value) => `${value}%`, color: '#90A0B7', fontSize: 10 }, splitLine: { show: false } }
        ];
        option.series = series;
        setChartOption(elementId, option);
    }

    function renderHeatmap(elementId, dataset) {
        const element = document.getElementById(elementId);
        if (!element || !window.Plotly || !dataset) {
            return;
        }
        plotlyChartIds.add(elementId);
        const xLabels = (dataset.xLabels || []).map((label) => String(label).toLowerCase());
        const yLabels = dataset.yLabels || [];
        const zValues = yLabels.map((_, yIndex) => xLabels.map((_, xIndex) => {
            const matched = (dataset.values || []).find((item) => item[0] === xIndex && item[1] === yIndex);
            return Number(matched ? matched[2] : 0);
        }));
        const textValues = zValues.map((row) => row.map((value) => `${Number(value || 0).toFixed(1)}%`));

        window.Plotly.newPlot(element, [{
            type: 'heatmap',
            x: xLabels,
            y: yLabels,
            z: zValues,
            colorscale: [[0, '#f8fafc'], [0.35, '#bfdbfe'], [0.7, '#86efac'], [1, '#fde68a']],
            text: textValues,
            texttemplate: '%{text}',
            textfont: {
                family: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
                size: 10,
                color: '#0f172a'
            },
            hovertemplate: '%{y}<br>%{x}<br>%{text}<extra></extra>',
            colorbar: {
                thickness: 10,
                len: 0.72,
                y: 0.5,
                outlinewidth: 0,
                tickfont: { size: 10, color: '#475569' }
            },
            xgap: 1,
            ygap: 1
        }], {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 90, r: 18, t: 20, b: 46 },
            xaxis: {
                color: '#475569',
                gridcolor: 'rgba(15, 23, 42, 0.06)',
                zerolinecolor: 'rgba(15, 23, 42, 0.06)'
            },
            yaxis: {
                type: 'category',
                categoryorder: 'array',
                categoryarray: yLabels,
                autorange: 'reversed',
                color: '#475569',
                gridcolor: 'rgba(15, 23, 42, 0.06)',
                zerolinecolor: 'rgba(15, 23, 42, 0.06)'
            }
        }, {
            responsive: true,
            displayModeBar: false
        });
    }

    function buildMetricHeatmapDataset(dailySalesMap, metricIndex, scheme) {
        const dayKeys = window.ABToolMetrics.ORDER_STRUCT_DAYS;
        const xLabels = dayKeys.map((day) => day.replace('day', 'Day'));
        const seriesNames = Object.keys(dailySalesMap || {});
        const yLabels = seriesNames.map((name) => simplifyLegendName(name));
        const values = [];
        yLabels.forEach((_, yIndex) => {
            const originName = seriesNames[yIndex];
            dayKeys.forEach((day, xIndex) => {
                const dayData = dailySalesMap[originName] && dailySalesMap[originName][day];
                values.push([xIndex, yIndex, Number(dayData ? dayData[metricIndex] : 0)]);
            });
        });
        return { xLabels, yLabels, values, scheme };
    }

    function renderAlerts(container, errors, warnings) {
        if (!container) {
            return;
        }
        const sections = [];
        if (errors && errors.length) {
            sections.push(`
                <div class="alert alert-danger" role="alert">
                    <div class="fw-semibold mb-1">当前配置无法生成结果</div>
                    <ul class="warning-list">${errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `);
        }
        if (warnings && warnings.length) {
            sections.push(`
                <div class="alert alert-warning" role="alert">
                    <div class="fw-semibold mb-1">分析提示</div>
                    <ul class="warning-list">${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `);
        }
        container.innerHTML = sections.join('');
    }

    function renderImportHints(container, prepared) {
        if (!container) {
            return;
        }
        const items = [];
        if (prepared.missingKeyColumns && prepared.missingKeyColumns.length) {
            items.push(`<div class="hint-item"><strong>缺少必需字段：</strong>${prepared.missingKeyColumns.map(escapeHtml).join('、')}</div>`);
        }
        if (prepared.missingOptionalColumns && prepared.missingOptionalColumns.length) {
            items.push(`<div class="hint-item"><strong>缺少可选字段：</strong>${prepared.missingOptionalColumns.slice(0, 8).map(escapeHtml).join('、')}${prepared.missingOptionalColumns.length > 8 ? ' ...' : ''}</div>`);
        }
        if (!items.length) {
            items.push('<div class="hint-item">字段校验通过，可进入下一步配置。</div>');
        }
        container.innerHTML = items.join('');
    }

    function renderOverview(container, result) {
        if (!container || !result) {
            return;
        }
        container.innerHTML = '';
    }

    function renderBasicTable(columns, rows, headerLabels) {
        const headers = columns.map((column) => `<th>${escapeHtml((headerLabels && headerLabels[column]) || column)}</th>`).join('');
        const body = rows.map((row) => `
            <tr>
                ${columns.map((column, index) => (
                    index < 2 && (column === 'label' || column === '大组')
                        ? `<th>${escapeHtml(row[column])}</th>`
                        : `<td>${formatCell(column, row[column], row)}</td>`
                )).join('')}
            </tr>
        `).join('');
        return `<div class="table-shell"><table class="table table-hover align-middle"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    function renderMetricDetailTable(rows, includeGroupColumn) {
        const header = includeGroupColumn ? '<th></th><th></th>' : '<th></th>';
        let body = '';
        if (includeGroupColumn) {
            const grouped = [];
            rows.forEach((row) => {
                let item = grouped.find((entry) => entry.name === row['大组']);
                if (!item) {
                    item = { name: row['大组'], rows: [] };
                    grouped.push(item);
                }
                item.rows.push(row);
            });
            body = grouped.map((group) => group.rows.map((row, index) => `
                <tr>
                    ${index === 0 ? `<th rowspan="${group.rows.length}">${escapeHtml(group.name)}</th>` : ''}
                    <th>${escapeHtml(row.label)}</th>
                    ${detailColumns.map((column) => `<td>${formatPercent(row[column])}</td>`).join('')}
                </tr>
            `).join('')).join('');
        } else {
            body = rows.map((row) => `
                <tr>
                    <th>${escapeHtml(row.label)}</th>
                    ${detailColumns.map((column) => `<td>${formatPercent(row[column])}</td>`).join('')}
                </tr>
            `).join('');
        }
        return `
            <div class="table-shell">
                <table class="table table-hover align-middle">
                    <thead><tr>${header}${detailColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    function renderClassTable(rows) {
        const headers = ['对应大组', '营期', '测试分组', '班级', '添加人数', '转化人数', '转化率', '待支付率', '待支付转率', '流水', '成本', 'ROI', '添加产值', '客单价'];
        return `
            <div class="table-shell">
                <table class="table table-hover align-middle">
                    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${rows.map((row) => `
                            <tr>
                                <td>${escapeHtml(row['对应大组'])}</td>
                                <td>${escapeHtml(row['营期'])}期</td>
                                <td><span class="group-tag ${row['测试分组'] === '测试组' ? 'group-tag-test' : row['测试分组'] === '对照组' ? 'group-tag-control' : 'group-tag-neutral'}">${escapeHtml(row['测试分组'])}</span></td>
                                <td>${escapeHtml(row['班级'])}</td>
                                <td>${formatInteger(row['添加人数'])}</td>
                                <td>${formatInteger(row['转化人数'])}</td>
                                <td>${formatPercent(row['转化率'])}</td>
                                <td>${formatPercent(row['待支付率'])}</td>
                                <td>${formatPercent(row['待支付转率'])}</td>
                                <td>${formatMoney(row['流水'])}</td>
                                <td>${formatMoney(row['成本'])}</td>
                                <td>${formatFloat(row['ROI'])}</td>
                                <td>${formatFloat(row['添加产值'])}</td>
                                <td>${formatFloat(row['客单价'])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function getViewConfig(result, viewKey) {
        if (viewKey === 'group') {
            return {
                title: '大组视角',
                desc: `${result.byGroup.groups.map((group) => simplifyLegendName(group.name)).join(' / ')} × 测试组 / 对照组`,
                summaryRows: result.byGroup.summaryRows,
                process: result.byGroup.process,
                salesTrend: result.byGroup.salesTrend,
                heatmaps: {
                    order: Object.assign({ scheme: 'order' }, result.byGroup.orderHeatmap),
                    conversion: buildMetricHeatmapDataset(result.byGroup.dailySales, 0, 'conversion'),
                    pending: buildMetricHeatmapDataset(result.byGroup.dailySales, 1, 'pending'),
                    pendingConversion: buildMetricHeatmapDataset(result.byGroup.dailySales, 2, 'pending_conversion')
                },
                detailTableHtml: renderMetricDetailTable(result.byGroup.detailRows, true),
                extraDetailHtml: renderBasicTable(['大组', 'label', '添加数', '转化率', '待支付率', '待支付转率', '个销占比', 'ROI', '添加产值', '客单价'], result.byGroup.summaryRows)
            };
        }
        if (viewKey === 'history' && result.hasHistory && result.history) {
            return {
                title: '历史视角',
                desc: `${result.targetLabel}测试 / 对照 vs ${result.historyLabel}`,
                summaryRows: result.history.summaryRows,
                process: result.history.process,
                salesTrend: result.history.salesTrend,
                heatmaps: {
                    order: Object.assign({ scheme: 'order' }, result.history.orderHeatmap),
                    conversion: buildMetricHeatmapDataset(result.history.dailySales, 0, 'conversion'),
                    pending: buildMetricHeatmapDataset(result.history.dailySales, 1, 'pending'),
                    pendingConversion: buildMetricHeatmapDataset(result.history.dailySales, 2, 'pending_conversion')
                },
                detailTableHtml: renderMetricDetailTable(result.history.detailRows, false),
                extraDetailHtml: renderBasicTable(['label', '添加数', '转化率', '待支付率', '待支付转率', '个销占比', 'ROI', '添加产值', '客单价'], result.history.summaryRows)
            };
        }
        return {
            title: '整体视角',
            desc: '测试组 vs 对照组整体表现',
            summaryRows: [result.overall.summaryRows[0], result.overall.summaryRows[1], result.overall.summaryRows[2], result.overall.summaryRows[3]],
            process: result.overall.process,
            salesTrend: result.overall.salesTrend,
            heatmaps: {
                order: Object.assign({ scheme: 'order' }, result.overall.orderHeatmap),
                conversion: buildMetricHeatmapDataset(result.overall.dailySales, 0, 'conversion'),
                pending: buildMetricHeatmapDataset(result.overall.dailySales, 1, 'pending'),
                pendingConversion: buildMetricHeatmapDataset(result.overall.dailySales, 2, 'pending_conversion')
            },
            detailTableHtml: renderMetricDetailTable(result.overall.detailRows, false),
            extraDetailHtml: renderClassTable(result.overall.classDetails)
        };
    }

    function buildSummaryMetricCards(rows) {
        const diffRow = rows.find((row) => row.label === '差值(测-对)');
        if (diffRow) {
            return [
                { label: '转化率差值', value: formatSignedPercent(diffRow['转化率']), meta: '测试组相对对照组' },
                { label: '待支付率差值', value: formatSignedPercent(diffRow['待支付率']), meta: '测试组相对对照组' },
                { label: 'ROI 差值', value: formatSignedFloat(diffRow['ROI']), meta: '测试组相对对照组' },
                { label: '客单价差值', value: formatSignedFloat(diffRow['客单价']), meta: '测试组相对对照组' }
            ];
        }
        const focusRow = rows[0] || {};
        return [
            { label: '转化率', value: formatPercent(focusRow['转化率']), meta: escapeHtml(focusRow.label || '当前行') },
            { label: '待支付率', value: formatPercent(focusRow['待支付率']), meta: escapeHtml(focusRow.label || '当前行') },
            { label: 'ROI', value: formatFloat(focusRow['ROI']), meta: escapeHtml(focusRow.label || '当前行') },
            { label: '客单价', value: formatFloat(focusRow['客单价']), meta: escapeHtml(focusRow.label || '当前行') }
        ];
    }

    function buildSectionShell(title, desc, innerHtml) {
        return `
            <section class="result-section">
                <div class="result-section-head">
                    <div>
                        <h3 class="result-section-title">${escapeHtml(title)}</h3>
                        ${desc ? `<p class="result-section-desc">${escapeHtml(desc)}</p>` : ''}
                    </div>
                </div>
                ${innerHtml}
            </section>
        `;
    }

    function renderResultContent(container, result, viewKey) {
        if (!container || !result) {
            return;
        }
        disposeCharts();
        const view = getViewConfig(result, viewKey);
        const summaryMetricCards = buildSummaryMetricCards(view.summaryRows);

        container.innerHTML = [
            buildSectionShell(view.title, '', `
                <div class="summary-metric-grid">
                    ${summaryMetricCards.map((item) => `
                        <div class="summary-metric-card">
                            <span class="label">${item.label}</span>
                            <span class="value">${item.value}</span>
                            <span class="meta">${item.meta}</span>
                        </div>
                    `).join('')}
                </div>
            `),
            buildSectionShell('核心对比', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-7">
                        <div class="analysis-card-head">
                            <div>
                                <h4 class="analysis-card-title">汇总指标表</h4>
                            </div>
                        </div>
                        ${renderBasicTable(viewKey === 'group'
                            ? ['大组', 'label', '添加数', '转化率', '待支付率', '待支付转率', '个销占比', 'ROI', '添加产值', '客单价']
                            : ['label', '添加数', '转化率', '待支付率', '待支付转率', '个销占比', 'ROI', '添加产值', '客单价'],
                        view.summaryRows)}
                    </div>
                    <div class="analysis-card span-5">
                        <div class="analysis-card-head">
                            <div>
                                <h4 class="analysis-card-title">汇总指标对比图</h4>
                            </div>
                        </div>
                        <div id="v2-summary-chart" class="chart-host"></div>
                    </div>
                </div>
            `),
            buildSectionShell('过程指标', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">晨读趋势</h4></div></div><div id="v2-process-chendu" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">到播趋势</h4></div></div><div id="v2-process-daobo" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">留存趋势</h4></div></div><div id="v2-process-liucun" class="chart-host"></div></div>
                </div>
            `),
            buildSectionShell('过程衰减', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">晨读衰减</h4></div></div><div id="v2-decay-chendu" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">到播衰减</h4></div></div><div id="v2-decay-daobo" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">留存衰减</h4></div></div><div id="v2-decay-liucun" class="chart-host"></div></div>
                </div>
            `),
            buildSectionShell('销售指标', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">Day3-7 转率</h4></div></div><div id="v2-sales-zhuanlv" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">Day3-7 待支付率</h4></div></div><div id="v2-sales-daizhifulv" class="chart-host"></div></div>
                    <div class="analysis-card span-4"><div class="analysis-card-head"><div><h4 class="analysis-card-title">Day3-7 待支付转率</h4></div></div><div id="v2-sales-daizhifuzhuan" class="chart-host"></div></div>
                </div>
            `),
            buildSectionShell('D3-D7 热力图', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-6"><div class="analysis-card-head"><div><h4 class="analysis-card-title">D3-D7 出单占比</h4></div></div><div id="v2-heatmap-order" class="chart-host chart-heatmap"></div></div>
                    <div class="analysis-card span-6"><div class="analysis-card-head"><div><h4 class="analysis-card-title">D3-D7 转率</h4></div></div><div id="v2-heatmap-conversion" class="chart-host chart-heatmap"></div></div>
                    <div class="analysis-card span-6"><div class="analysis-card-head"><div><h4 class="analysis-card-title">D3-D7 待支付率</h4></div></div><div id="v2-heatmap-pending" class="chart-host chart-heatmap"></div></div>
                    <div class="analysis-card span-6"><div class="analysis-card-head"><div><h4 class="analysis-card-title">D3-D7 待支付转率</h4></div></div><div id="v2-heatmap-pending-conversion" class="chart-host chart-heatmap"></div></div>
                </div>
            `),
            buildSectionShell('明细数据', '', `
                <div class="analysis-grid">
                    <div class="analysis-card span-12">
                        <div class="analysis-card-head"><div><h4 class="analysis-card-title">汇总 / 明细</h4></div></div>
                        ${view.detailTableHtml}
                    </div>
                    <div class="analysis-card span-12">
                        <div class="analysis-card-head"><div><h4 class="analysis-card-title">${viewKey === 'overall' ? '班级明细' : '补充汇总'}</h4></div></div>
                        ${view.extraDetailHtml}
                    </div>
                </div>
            `)
        ].join('');

        renderSummaryComparisonChart('v2-summary-chart', view.summaryRows);
        renderLineChart('v2-process-chendu', view.process.chendu.labels, view.process.chendu.series, { suffix: '%', precision: 1 });
        renderLineChart('v2-process-daobo', view.process.daobo.labels, view.process.daobo.series, { suffix: '%', precision: 1 });
        renderLineChart('v2-process-liucun', view.process.liucun.labels, view.process.liucun.series, { suffix: '%', precision: 1 });
        renderBarChart('v2-decay-chendu', view.process.chenduDecay.labels, view.process.chenduDecay.series, { suffix: '%', precision: 1 });
        renderBarChart('v2-decay-daobo', view.process.daoboDecay.labels, view.process.daoboDecay.series, { suffix: '%', precision: 1 });
        renderBarChart('v2-decay-liucun', view.process.liucunDecay.labels, view.process.liucunDecay.series, { suffix: '%', precision: 1 });
        renderLineChart('v2-sales-zhuanlv', view.salesTrend.zhuanlv.labels, view.salesTrend.zhuanlv.series, { suffix: '%', precision: 1 });
        renderLineChart('v2-sales-daizhifulv', view.salesTrend.daizhifulv.labels, view.salesTrend.daizhifulv.series, { suffix: '%', precision: 2 });
        renderLineChart('v2-sales-daizhifuzhuan', view.salesTrend.daizhifuzhuan.labels, view.salesTrend.daizhifuzhuan.series, { suffix: '%', precision: 1 });
        renderHeatmap('v2-heatmap-order', view.heatmaps.order);
        renderHeatmap('v2-heatmap-conversion', view.heatmaps.conversion);
        renderHeatmap('v2-heatmap-pending', view.heatmaps.pending);
        renderHeatmap('v2-heatmap-pending-conversion', view.heatmaps.pendingConversion);
    }

    function resizeCharts() {
        chartStore.forEach((chart) => chart.resize());
        if (window.Plotly) {
            plotlyChartIds.forEach((elementId) => {
                const element = document.getElementById(elementId);
                if (element) {
                    try {
                        window.Plotly.Plots.resize(element);
                    } catch (_) {
                        // noop
                    }
                }
            });
        }
    }

    window.addEventListener('resize', resizeCharts);

    window.ABToolRenderV2 = {
        renderAlerts,
        renderImportHints,
        renderOverview,
        renderResultContent,
        resizeCharts,
        disposeCharts
    };
})();
