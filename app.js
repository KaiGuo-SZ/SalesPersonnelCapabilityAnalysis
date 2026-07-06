(function () {
    const state = {
        fileName: '',
        rawRows: [],
        columns: [],
        prepared: null,
        targetYingqi: [],
        historyYingqi: [],
        groupCards: [],
        currentStep: 1,
        maxUnlockedStep: 1,
        currentView: 'overall',
        result: null
    };

    let groupId = 1;

    const elements = {
        alerts: document.getElementById('global-alerts-v2'),
        workflowStatus: document.getElementById('workflow-status'),
        stepperMeta: document.getElementById('stepper-meta'),
        stepperItems: Array.from(document.querySelectorAll('.stepper-item')),
        stepPanels: Array.from(document.querySelectorAll('.stage-panel')),
        fileInput: document.getElementById('file-input-v2'),
        importFileName: document.getElementById('import-file-name'),
        importRowCount: document.getElementById('import-row-count'),
        importYingqiCount: document.getElementById('import-yingqi-count'),
        importStatusText: document.getElementById('import-status-text'),
        importFieldHints: document.getElementById('import-field-hints'),
        goStep2: document.getElementById('go-step-2'),
        targetCheckboxList: document.getElementById('target-checkbox-list'),
        targetSelectionSummary: document.getElementById('target-selection-summary'),
        targetSelectAll: document.getElementById('target-select-all'),
        targetClearAll: document.getElementById('target-clear-all'),
        targetYingqiNote: document.getElementById('target-yingqi-note'),
        historyCheckboxList: document.getElementById('history-checkbox-list'),
        historySelectionSummary: document.getElementById('history-selection-summary'),
        historySelectAll: document.getElementById('history-select-all'),
        historyClearAll: document.getElementById('history-clear-all'),
        goStep3: document.getElementById('go-step-3'),
        groupConfigs: document.getElementById('group-configs-v2'),
        analyzeBtn: document.getElementById('analyze-btn-v2'),
        resetBtn: document.getElementById('reset-btn-v2'),
        resultTitle: document.getElementById('result-title-v2'),
        resultDesc: document.getElementById('result-desc-v2'),
        resultBadges: document.getElementById('result-badges-v2'),
        resultViewSwitcher: document.getElementById('result-view-switcher'),
        resultOverview: document.getElementById('result-overview-v2'),
        resultContent: document.getElementById('result-content-v2'),
        groupTemplate: document.getElementById('group-card-template-v2')
    };

    function unique(items) {
        return Array.from(new Set(items));
    }

    function sortZh(items) {
        return items.slice().sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'));
    }

    function sortNumeric(items) {
        return items.slice().sort((a, b) => Number(a) - Number(b));
    }

    function sortNumericDesc(items) {
        return items.slice().sort((a, b) => Number(b) - Number(a));
    }

    function formatPeriodLabel(periods) {
        const sorted = sortNumeric(unique((periods || []).map((item) => Number(item)).filter((item) => item > 0)));
        if (!sorted.length) {
            return '';
        }
        return `${sorted.join('、')}期`;
    }

    function buildTargetGroupKey(yingqi, groupName) {
        return `${yingqi}::${groupName}`;
    }

    function createGroupCard(yingqi, name) {
        return {
            id: `group-${groupId++}`,
            yingqi: yingqi || 0,
            name: name || '',
            search: '',
            composing: false,
            buckets: {
                available: [],
                test: [],
                control: []
            },
            selected: {
                available: [],
                test: [],
                control: []
            }
        };
    }

    function setWorkflowStatus(text) {
        elements.workflowStatus.textContent = text;
    }

    function clearRenderedResult() {
        state.result = null;
        state.currentView = 'overall';
        elements.resultBadges.innerHTML = '';
        elements.resultOverview.innerHTML = '';
        elements.resultContent.innerHTML = '';
        elements.resultTitle.textContent = '分析结果';
        elements.resultDesc.textContent = '查看整体、大组与历史结果。';
        window.ABToolRenderV2.disposeCharts();
    }

    function invalidateAnalysis(preserveStep) {
        clearRenderedResult();
        state.maxUnlockedStep = Math.min(state.maxUnlockedStep, preserveStep);
        if (state.currentStep > preserveStep) {
            state.currentStep = preserveStep;
            renderPanels();
        }
        renderStepper();
        updateWorkflowStatus();
    }

    function stepIsUnlocked(step) {
        return step <= state.maxUnlockedStep;
    }

    function unlockStep(step) {
        state.maxUnlockedStep = Math.max(state.maxUnlockedStep, step);
        renderStepper();
    }

    function goToStep(step) {
        if (!stepIsUnlocked(step)) {
            return;
        }
        state.currentStep = step;
        renderStepper();
        renderPanels();
        updateWorkflowStatus();
        window.ABToolRenderV2.resizeCharts();
    }

    function renderStepper() {
        elements.stepperMeta.textContent = `Step ${state.currentStep} / 4`;
        elements.stepperItems.forEach((item) => {
            const step = Number(item.dataset.stepTarget);
            item.disabled = !stepIsUnlocked(step);
            item.classList.toggle('is-active', step === state.currentStep);
        });
    }

    function renderPanels() {
        elements.stepPanels.forEach((panel) => {
            panel.classList.toggle('is-active', Number(panel.dataset.stepPanel) === state.currentStep);
        });
    }

    function updateWorkflowStatus() {
        if (!state.prepared || !state.prepared.rows.length) {
            setWorkflowStatus('待导入数据');
            return;
        }
        if (state.currentStep === 1) {
            setWorkflowStatus('数据已导入');
            return;
        }
        if (state.currentStep === 2) {
            setWorkflowStatus('待确认营期');
            return;
        }
        if (state.currentStep === 3) {
            setWorkflowStatus('待完成分组');
            return;
        }
        setWorkflowStatus('分析结果已生成');
    }

    function getAvailableYingqi() {
        if (!state.prepared) {
            return [];
        }
        return sortNumeric(unique(state.prepared.rows.map((row) => row['营期']).filter((item) => item > 0)));
    }

    function getTargetRows() {
        if (!state.prepared || !state.targetYingqi.length) {
            return [];
        }
        const targetSet = new Set(state.targetYingqi.map(Number));
        return state.prepared.rows.filter((row) => targetSet.has(row['营期']));
    }

    function getAvailableGroupOptions() {
        const targetRows = getTargetRows();
        const periodMap = new Map();
        targetRows.forEach((row) => {
            if (!row['大组']) {
                return;
            }
            if (!periodMap.has(row['营期'])) {
                periodMap.set(row['营期'], []);
            }
            periodMap.get(row['营期']).push(row['大组']);
        });
        return sortNumeric(Array.from(periodMap.keys())).flatMap((yingqi) => sortZh(unique(periodMap.get(yingqi))).map((groupName) => ({
            key: buildTargetGroupKey(yingqi, groupName),
            yingqi,
            name: groupName
        })));
    }

    function getClassesForGroup(yingqi, groupName) {
        return sortZh(unique(
            getTargetRows()
                .filter((row) => row['营期'] === Number(yingqi) && row['大组'] === groupName)
                .map((row) => row['班级'])
                .filter(Boolean)
        ));
    }

    function getAssignedClasses() {
        return unique(state.groupCards.flatMap((card) => card.buckets.test.concat(card.buckets.control)));
    }

    function updateImportSummary() {
        const rows = state.prepared ? state.prepared.rows.length : 0;
        const yingqiCount = getAvailableYingqi().length;
        const hasGroupColumn = state.columns.includes('大组');
        const isImportReady = !!state.prepared && !state.prepared.missingKeyColumns.length && hasGroupColumn && !!rows;
        elements.importFileName.textContent = state.fileName || '未选择文件';
        elements.importRowCount.textContent = String(rows);
        elements.importYingqiCount.textContent = String(yingqiCount);
        if (!state.prepared) {
            elements.importStatusText.textContent = '等待导入';
        } else if (state.prepared.missingKeyColumns.length || !hasGroupColumn) {
            elements.importStatusText.textContent = '字段不完整';
        } else {
            elements.importStatusText.textContent = '可进入下一步';
        }
        window.ABToolRenderV2.renderImportHints(elements.importFieldHints, state.prepared || { missingKeyColumns: [], missingOptionalColumns: [] });
        if (state.prepared && !hasGroupColumn) {
            elements.importFieldHints.innerHTML += '<div class="hint-item"><strong>缺少必需字段：</strong>大组。V2 的分组配置依赖该字段，请使用包含大组列的模板。</div>';
        }
        elements.goStep2.disabled = !isImportReady;
    }

    function populateYingqiOptions() {
        const yingqiList = sortNumericDesc(getAvailableYingqi());
        const selectedSet = new Set(state.targetYingqi.map(String));
        state.targetYingqi = state.targetYingqi.filter((item) => yingqiList.map(String).includes(String(item)));
        elements.targetCheckboxList.classList.toggle('is-disabled', !yingqiList.length);
        elements.targetSelectAll.disabled = !yingqiList.length;
        elements.targetClearAll.disabled = !yingqiList.length;
        elements.targetCheckboxList.innerHTML = yingqiList.length
            ? yingqiList.map((yingqi) => {
                const checked = selectedSet.has(String(yingqi));
                return `
                    <label class="history-option ${checked ? 'is-selected' : ''}">
                        <input type="checkbox" value="${yingqi}" ${checked ? 'checked' : ''}>
                        <span class="history-option-copy">
                            <strong>${yingqi}期</strong>
                        </span>
                    </label>
                `;
            }).join('')
            : '<div class="hint-item">请先导入数据。</div>';
        elements.targetSelectionSummary.textContent = state.targetYingqi.length
            ? `已选 ${state.targetYingqi.length} 个营期`
            : '请选择测试营期';
        elements.targetYingqiNote.textContent = yingqiList.length
            ? `共识别 ${yingqiList.length} 个营期。`
            : '导入后将自动展示所有可用营期。';
    }

    function populateHistoryOptions() {
        const targetSet = new Set(state.targetYingqi.map(String));
        const yingqiList = sortNumericDesc(getAvailableYingqi().filter((yingqi) => !targetSet.has(String(yingqi))));
        const selectedSet = new Set(state.historyYingqi.map(String));
        state.historyYingqi = state.historyYingqi.filter((item) => yingqiList.map(String).includes(String(item)));

        elements.historyCheckboxList.classList.toggle('is-disabled', !yingqiList.length);
        elements.historySelectAll.disabled = !yingqiList.length;
        elements.historyClearAll.disabled = !yingqiList.length;
        elements.historyCheckboxList.innerHTML = yingqiList.length
            ? yingqiList.map((yingqi) => {
                const checked = selectedSet.has(String(yingqi));
                return `
                    <label class="history-option ${checked ? 'is-selected' : ''}">
                        <input type="checkbox" value="${yingqi}" ${checked ? 'checked' : ''}>
                        <span class="history-option-copy">
                            <strong>${yingqi}期</strong>
                        </span>
                    </label>
                `;
            }).join('')
            : '<div class="hint-item">请先选择测试营期。</div>';
        elements.historySelectionSummary.textContent = state.historyYingqi.length
            ? `已选 ${state.historyYingqi.length} 个营期`
            : '未勾选历史营期，则不分析维度三';
        elements.goStep3.disabled = !state.targetYingqi.length;
    }

    function resetGroups() {
        const groupOptions = getAvailableGroupOptions();
        state.groupCards = groupOptions.map((groupInfo) => {
            const card = createGroupCard(groupInfo.yingqi, groupInfo.name);
            card.buckets.available = getClassesForGroup(groupInfo.yingqi, groupInfo.name);
            return card;
        });
        renderGroupCards();
        updateGroupStats();
    }

    function ensureGroupsReady() {
        if (!state.groupCards.length) {
            resetGroups();
        }
    }

    function rebaseGroupBuckets(group) {
        if (!group.name) {
            group.buckets = { available: [], test: [], control: [] };
            group.selected = { available: [], test: [], control: [] };
            return;
        }
        const allClasses = getClassesForGroup(group.yingqi, group.name);
        const test = group.buckets.test.filter((item) => allClasses.includes(item));
        const control = group.buckets.control.filter((item) => allClasses.includes(item));
        const assigned = new Set(test.concat(control));
        const available = allClasses.filter((item) => !assigned.has(item));
        group.buckets = { available, test, control };
        group.selected = {
            available: group.selected.available.filter((item) => available.includes(item)),
            test: group.selected.test.filter((item) => test.includes(item)),
            control: group.selected.control.filter((item) => control.includes(item))
        };
    }

    function parseSearchKeywords(keyword) {
        return unique(
            String(keyword || '')
                .split(/[\s,，、;；]+/)
                .map((item) => item.trim().toLowerCase())
                .filter(Boolean)
        );
    }

    function getFilteredItems(group, bucket) {
        const tokens = parseSearchKeywords(group.search);
        const source = group.buckets[bucket] || [];
        if (!tokens.length) {
            return source;
        }
        return source.filter((item) => {
            const text = String(item || '').toLowerCase();
            return tokens.some((token) => text.includes(token));
        });
    }

    function renderSingleBucket(cardElement, group, bucket) {
        const listSelectorMap = {
            available: '.assignment-list-available-v2',
            test: '.assignment-list-test-v2',
            control: '.assignment-list-control-v2'
        };
        const countSelectorMap = {
            available: '.group-count-available-v2',
            test: '.group-count-test-v2',
            control: '.group-count-control-v2'
        };
        const listElement = cardElement.querySelector(listSelectorMap[bucket]);
        const countElement = cardElement.querySelector(countSelectorMap[bucket]);
        if (!listElement || !countElement) {
            return;
        }
        const labelMap = {
            available: '待分配',
            test: '测试组',
            control: '对照组'
        };
        countElement.textContent = `${labelMap[bucket]} ${group.buckets[bucket].length}`;
        renderAssignmentItems(group, bucket, listElement);
    }

    function rerenderGroupCard(cardId) {
        const group = state.groupCards.find((item) => item.id === cardId);
        if (!group) {
            return;
        }
        const cardElement = elements.groupConfigs.querySelector(`.group-card[data-group-id="${cardId}"]`);
        if (!cardElement) {
            renderGroupCards();
            return;
        }
        ['available', 'test', 'control'].forEach((bucket) => renderSingleBucket(cardElement, group, bucket));
    }

    function moveSelected(cardId, source, target) {
        const group = state.groupCards.find((item) => item.id === cardId);
        if (!group) {
            return;
        }
        const selectedItems = group.selected[source];
        if (!selectedItems.length) {
            return;
        }
        group.buckets[source] = group.buckets[source].filter((item) => !selectedItems.includes(item));
        group.buckets[target] = sortZh(unique(group.buckets[target].concat(selectedItems)));
        group.selected[source] = [];
        rebaseGroupBuckets(group);
        invalidateAnalysis(3);
        renderGroupCards();
        updateGroupStats();
    }

    function toggleGroupSelection(cardId, bucket, className, checked) {
        const group = state.groupCards.find((item) => item.id === cardId);
        if (!group) {
            return;
        }
        const next = new Set(group.selected[bucket]);
        if (checked) {
            next.add(className);
        } else {
            next.delete(className);
        }
        group.selected[bucket] = sortZh(Array.from(next));
    }

    function selectVisible(cardId, bucket) {
        const group = state.groupCards.find((item) => item.id === cardId);
        if (!group) {
            return;
        }
        const visible = getFilteredItems(group, bucket);
        group.selected[bucket] = sortZh(unique(visible));
        rerenderGroupCard(cardId);
    }

    function renderAssignmentItems(group, bucket, listElement) {
        const items = getFilteredItems(group, bucket);
        if (!items.length) {
            listElement.innerHTML = '<div class="empty-assignment">当前没有可展示的班级。</div>';
            return;
        }
        const selectedSet = new Set(group.selected[bucket]);
        listElement.innerHTML = items.map((item) => `
            <label class="assignment-item">
                <input type="checkbox" value="${escapeHtml(item)}" ${selectedSet.has(item) ? 'checked' : ''}>
                <div>
                    <strong>${escapeHtml(item)}</strong>
                    <span>${bucket === 'available' ? '待进一步分配' : bucket === 'test' ? '已进入测试组' : '已进入对照组'}</span>
                </div>
            </label>
        `).join('');
        Array.from(listElement.querySelectorAll('input[type="checkbox"]')).forEach((checkbox) => {
            checkbox.addEventListener('change', (event) => {
                toggleGroupSelection(group.id, bucket, event.target.value, event.target.checked);
            });
        });
    }

    function renderGroupCards() {
        elements.groupConfigs.innerHTML = '';
        if (!state.groupCards.length) {
            elements.groupConfigs.innerHTML = '<div class="hint-item">当前测试营期下没有可用的大组数据。</div>';
            return;
        }

        state.groupCards.forEach((group) => {
            rebaseGroupBuckets(group);
            const fragment = elements.groupTemplate.content.cloneNode(true);
            const cardElement = fragment.querySelector('.group-card');
            cardElement.dataset.groupId = group.id;
            fragment.querySelector('.group-card-name-v2').textContent = `${group.yingqi}期 · ${group.name}`;

            const searchInput = fragment.querySelector('.group-search-input-v2');
            searchInput.value = group.search;
            searchInput.addEventListener('input', (event) => {
                group.search = event.target.value;
                if (!group.composing) {
                    rerenderGroupCard(group.id);
                }
            });
            searchInput.addEventListener('compositionstart', () => {
                group.composing = true;
            });
            searchInput.addEventListener('compositionend', (event) => {
                group.composing = false;
                group.search = event.target.value;
                rerenderGroupCard(group.id);
            });

            fragment.querySelector('.group-count-available-v2').textContent = `待分配 ${group.buckets.available.length}`;
            fragment.querySelector('.group-count-test-v2').textContent = `测试组 ${group.buckets.test.length}`;
            fragment.querySelector('.group-count-control-v2').textContent = `对照组 ${group.buckets.control.length}`;
            fragment.querySelector('.group-meta-text-v2').textContent = `共 ${getClassesForGroup(group.yingqi, group.name).length} 个候选班级。`;

            Array.from(fragment.querySelectorAll('.select-visible-btn-v2')).forEach((button) => {
                button.addEventListener('click', () => selectVisible(group.id, button.dataset.bucket));
            });

            Array.from(fragment.querySelectorAll('.move-btn-v2')).forEach((button) => {
                button.addEventListener('click', () => moveSelected(group.id, button.dataset.source, button.dataset.target));
            });

            renderAssignmentItems(group, 'available', fragment.querySelector('.assignment-list-available-v2'));
            renderAssignmentItems(group, 'test', fragment.querySelector('.assignment-list-test-v2'));
            renderAssignmentItems(group, 'control', fragment.querySelector('.assignment-list-control-v2'));

            elements.groupConfigs.appendChild(fragment);
        });
    }

    function updateGroupStats() {
        const namedCards = state.groupCards.filter((card) => card.name);
        const allNamedCardsValid = namedCards.length > 0 && namedCards.every((card) => card.buckets.test.length && card.buckets.control.length);
        elements.analyzeBtn.disabled = !(state.targetYingqi.length && allNamedCardsValid);
    }

    function buildConfigForMetrics() {
        return {
            targetYingqi: state.targetYingqi,
            historyYingqi: state.historyYingqi,
            groups: state.groupCards
                .filter((card) => card.name)
                .map((card) => ({
                    yingqi: card.yingqi,
                    name: card.name,
                    testText: card.buckets.test.join('\n'),
                    controlText: card.buckets.control.join('\n')
                }))
        };
    }

    function updateResultMeta(result) {
        elements.resultTitle.textContent = `${result.targetLabel} AB 测试分析结果`;
        elements.resultDesc.textContent = result.hasHistory
            ? `历史对照：${result.historyLabel}`
            : '未启用历史对照';
        elements.resultBadges.innerHTML = `
            <span class="badge-soft">测试营期 ${result.targetLabel}</span>
            ${result.hasHistory ? `<span class="badge-soft">历史营期 ${result.historyYingqi.join(', ')}</span>` : ''}
            <span class="badge-soft">未分组班级 ${result.metadata.unassignedTargetClassCount}</span>
        `;
    }

    function renderResultView() {
        if (!state.result) {
            return;
        }
        if (!state.result.hasHistory && state.currentView === 'history') {
            state.currentView = 'overall';
        }
        window.ABToolRenderV2.renderOverview(elements.resultOverview, state.result);
        window.ABToolRenderV2.renderResultContent(elements.resultContent, state.result, state.currentView);
        Array.from(elements.resultViewSwitcher.querySelectorAll('.view-switch')).forEach((button) => {
            if (button.dataset.resultView === 'history') {
                button.style.display = state.result.hasHistory ? '' : 'none';
            }
            button.classList.toggle('is-active', button.dataset.resultView === state.currentView);
        });
        window.ABToolRenderV2.resizeCharts();
    }

    function resetWorkspace() {
        state.fileName = '';
        state.rawRows = [];
        state.columns = [];
        state.prepared = null;
        state.targetYingqi = [];
        state.historyYingqi = [];
        state.groupCards = [];
        state.currentStep = 1;
        state.maxUnlockedStep = 1;
        state.currentView = 'overall';
        elements.fileInput.value = '';
        clearRenderedResult();
        window.ABToolRenderV2.renderAlerts(elements.alerts, [], []);
        updateImportSummary();
        populateYingqiOptions();
        populateHistoryOptions();
        resetGroups();
        renderStepper();
        renderPanels();
        updateWorkflowStatus();
    }

    async function handleFileImport(file) {
        if (!file) {
            return;
        }
        try {
            setWorkflowStatus('正在解析数据');
            const parsed = await window.ABToolParser.parseCSVFile(file);
            const prepared = window.ABToolMetrics.prepareRows(parsed.rows, parsed.columns);
            state.fileName = file.name;
            state.rawRows = parsed.rows;
            state.columns = parsed.columns;
            state.prepared = prepared;
            state.targetYingqi = [];
            state.historyYingqi = [];
            state.currentStep = 1;
            state.maxUnlockedStep = 1;
            clearRenderedResult();
            updateImportSummary();
            populateYingqiOptions();
            populateHistoryOptions();
            resetGroups();
            if (!prepared.missingKeyColumns.length && prepared.rows.length && parsed.columns.includes('大组')) {
                unlockStep(2);
            }
            goToStep(1);
            updateWorkflowStatus();
            const warnings = prepared.missingOptionalColumns.length
                ? [`检测到 ${prepared.missingOptionalColumns.length} 个可选字段缺失，部分图表或指标可能受影响。`]
                : [];
            window.ABToolRenderV2.renderAlerts(elements.alerts, prepared.missingKeyColumns.length ? ['当前 CSV 缺少必需字段，请检查模板。'] : [], warnings);
        } catch (error) {
            window.ABToolRenderV2.renderAlerts(elements.alerts, [error.message || '文件解析失败，请检查 CSV 格式。'], []);
            setWorkflowStatus('导入失败');
        }
    }

    function bindEvents() {
        elements.fileInput.addEventListener('change', (event) => {
            const file = event.target.files && event.target.files[0];
            handleFileImport(file);
        });

        elements.goStep2.addEventListener('click', () => goToStep(2));

        elements.targetCheckboxList.addEventListener('change', (event) => {
            if (!event.target.matches('input[type="checkbox"]')) {
                return;
            }
            const checkbox = event.target;
            const next = new Set(state.targetYingqi.map(String));
            if (checkbox.checked) {
                next.add(String(checkbox.value));
            } else {
                next.delete(String(checkbox.value));
            }
            state.targetYingqi = sortNumeric(Array.from(next).map((item) => Number(item)));
            state.historyYingqi = [];
            invalidateAnalysis(2);
            populateYingqiOptions();
            populateHistoryOptions();
            resetGroups();
            updateGroupStats();
        });

        elements.targetSelectAll.addEventListener('click', () => {
            state.targetYingqi = getAvailableYingqi();
            state.historyYingqi = [];
            invalidateAnalysis(2);
            populateYingqiOptions();
            populateHistoryOptions();
            resetGroups();
            updateGroupStats();
        });

        elements.targetClearAll.addEventListener('click', () => {
            state.targetYingqi = [];
            state.historyYingqi = [];
            invalidateAnalysis(2);
            populateYingqiOptions();
            populateHistoryOptions();
            resetGroups();
            updateGroupStats();
        });

        elements.historyCheckboxList.addEventListener('change', (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                const checkbox = event.target;
                const value = checkbox.value;
                const next = new Set(state.historyYingqi.map(String));
                if (checkbox.checked) {
                    next.add(String(value));
                } else {
                    next.delete(String(value));
                }
                state.historyYingqi = sortNumeric(Array.from(next).map((item) => Number(item)));
                invalidateAnalysis(2);
                populateHistoryOptions();
            }
        });

        elements.historySelectAll.addEventListener('click', () => {
            const targetSet = new Set(state.targetYingqi.map(String));
            state.historyYingqi = getAvailableYingqi().filter((yingqi) => !targetSet.has(String(yingqi)));
            invalidateAnalysis(2);
            populateHistoryOptions();
        });

        elements.historyClearAll.addEventListener('click', () => {
            state.historyYingqi = [];
            invalidateAnalysis(2);
            populateHistoryOptions();
        });

        elements.goStep3.addEventListener('click', () => {
            if (!state.targetYingqi.length) {
                return;
            }
            unlockStep(3);
            resetGroups();
            renderGroupCards();
            updateGroupStats();
            goToStep(3);
        });

        elements.analyzeBtn.addEventListener('click', () => {
            if (!state.prepared) {
                return;
            }
            const config = buildConfigForMetrics();
            const result = window.ABToolMetrics.computeDashboard(state.prepared.rows, config);
            window.ABToolRenderV2.renderAlerts(elements.alerts, result.errors || [], result.warnings || []);
            if (result.errors && result.errors.length) {
                return;
            }
            state.result = result;
            state.currentView = 'overall';
            updateResultMeta(result);
            renderResultView();
            unlockStep(4);
            goToStep(4);
        });

        elements.resultViewSwitcher.addEventListener('click', (event) => {
            const button = event.target.closest('.view-switch');
            if (!button) {
                return;
            }
            state.currentView = button.dataset.resultView;
            renderResultView();
        });

        elements.resetBtn.addEventListener('click', resetWorkspace);

        elements.stepperItems.forEach((item) => {
            item.addEventListener('click', () => {
                const step = Number(item.dataset.stepTarget);
                goToStep(step);
            });
        });

        Array.from(document.querySelectorAll('[data-prev-step]')).forEach((button) => {
            button.addEventListener('click', () => goToStep(Number(button.dataset.prevStep)));
        });
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function init() {
        bindEvents();
        resetWorkspace();
    }

    init();
})();
