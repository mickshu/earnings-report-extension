// ======================== 对话模块 (chat.js) ========================
// 抽取自 sidepanel.js，管理AI对话历史和流式渲染

// ======================== 对话功能 ========================

async function sendChatMessage() {
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message || state.isChatting) return;

  if (!state.settings.apiKey) { showSettings(); showToast('请先配置 API Key'); return; }

  input.value = '';
  state.isChatting = true;
  $('#btn-send').disabled = true;

  addChatBubble('user', message);
  state.chatHistory.push({ role: 'user', content: message });

  const aiMsgEl = addChatBubble('ai', '');
  const bubbleEl = aiMsgEl.querySelector('.chat-msg-bubble');
  bubbleEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  try {
    const response = await callLLMChat(state.chatHistory);
    let fullText = '';
    await handleStreamResponse(response, (text) => {
      fullText = text;
      bubbleEl.innerHTML = renderMarkdown(text);
      bubbleEl.classList.add('streaming-cursor');
      $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
    });
    bubbleEl.classList.remove('streaming-cursor');
    bubbleEl.innerHTML = renderMarkdown(fullText);
    state.chatHistory.push({ role: 'assistant', content: fullText });
  } catch (e) {
    bubbleEl.classList.remove('streaming-cursor');
    bubbleEl.innerHTML = `<p style="color:var(--error)">❌ 请求失败：${e.message}</p>`;
    state.chatHistory.pop();
  } finally {
    state.isChatting = false;
    $('#btn-send').disabled = false;
  }
}

function addChatBubble(role, content) {
  const messagesEl = $('#chat-messages');
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'chat-msg-avatar';
  avatar.textContent = role === 'ai' ? '📈' : '👤';
  const bubble = document.createElement('div');
  bubble.className = 'chat-msg-bubble';
  bubble.innerHTML = content ? renderMarkdown(content) : '';

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  messagesEl.appendChild(msgDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msgDiv;
}

// ======================== 工具函数 ========================

function truncateText(text, maxChars) {
  if (text.length <= maxChars) return text;
  const keywords = ['资产负债表', '利润表', '现金流量表', '管理层讨论', '经营情况',
    '营业收入', '净利润', '毛利率', '净资产', '现金流', '主要财务数据',
    '合并资产负债', '合并利润', '合并现金流量'];
  const lines = text.split('\n');
  let importantLines = [], otherLines = [];
  lines.forEach(line => {
    if (keywords.some(kw => line.includes(kw))) importantLines.push(line);
    else otherLines.push(line);
  });
  let result = importantLines.join('\n');
  let remaining = maxChars - result.length;
  if (remaining > 0) {
    for (const line of otherLines) {
      if (remaining <= 0) break;
      result += '\n' + line;
      remaining -= line.length + 1;
    }
  }
  if (result.length > maxChars) {
    result = result.substring(0, maxChars) + '\n\n[...内容已截断...]';
  }
  return result;
}

function showLoading(text) { $('#loading').style.display = ''; $('#loading-text').textContent = text; }
function updateLoading(text) { if ($('#loading').style.display !== 'none') $('#loading-text').textContent = text; }
function hideLoading() { $('#loading').style.display = 'none'; }

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(state.reportMarkdown);
    showToast('📋 报告已复制');
  } catch (e) { showToast('复制失败'); }
}

// ======================== 股票搜索提示 ========================

/**
 * 调用东方财富搜索 API，实时匹配股票
 */
async function searchStockSuggest(keyword) {
  if (!keyword || keyword.length < 1) { hideStockSuggest(); return; }

  // 纯行业/条件描述，不搜索
  if (/^(行业|板块|概念|条件|市值|ROE|PE|PB)/.test(keyword) && keyword.length < 4) {
    hideStockSuggest();
    return;
  }

  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.QuotationCodeTable || !data.QuotationCodeTable.Data || data.QuotationCodeTable.Data.length === 0) {
      hideStockSuggest();
      return;
    }

    const items = data.QuotationCodeTable.Data.filter(item => {
      // 只保留A股
      return item.MktNum === '0' || item.MktNum === '1' || 
             item.SecurityTypeName === '沪A' || item.SecurityTypeName === '深A' ||
             item.SecurityTypeName === '科创板' || item.SecurityTypeName === '创业板';
    }).slice(0, 8);

    if (items.length === 0) { hideStockSuggest(); return; }

    renderStockSuggest(items);
  } catch (e) {
    console.log('股票搜索失败:', e);
    hideStockSuggest();
  }
}

/**
 * 渲染搜索下拉列表
 */
function renderStockSuggest(items) {
  const container = $('#stock-suggest');
  container.innerHTML = '';
  state.suggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    div.dataset.index = idx;

    // 代码（6位 + 交易所后缀）
    const code = item.Code || '';
    const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;

    // 涨跌颜色（中国惯例：涨红跌绿）
    let changeClass = '';
    let changeText = '';
    if (item.ChangePct !== undefined && item.ChangePct !== null) {
      const pct = parseFloat(item.ChangePct);
      if (pct > 0) { changeClass = 'up'; changeText = `+${pct.toFixed(2)}%`; }
      else if (pct < 0) { changeClass = 'down'; changeText = `${pct.toFixed(2)}%`; }
      else { changeText = '0.00%'; }
    }

    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
      ${item.NewPrice ? `<span class="stock-suggest-price">¥${parseFloat(item.NewPrice).toFixed(2)}</span>` : ''}
      ${changeText ? `<span class="stock-suggest-change ${changeClass}">${changeText}</span>` : ''}
    `;

    div.addEventListener('click', () => {
      addStockToInput(fullCode, item.Name || '');
      hideStockSuggest();
    });

    container.appendChild(div);
  });

  container.style.display = '';
}

function updateSuggestActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === state.suggestIndex);
  });
  if (state.suggestIndex >= 0 && items[state.suggestIndex]) {
    items[state.suggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideStockSuggest() {
  const container = $('#stock-suggest');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  state.suggestIndex = -1;
}

/**
 * 将选中的股票添加到输入框和标签
 */
function addStockToInput(code, name) {
  // 添加到标签列表（去重）
  const exists = state.selectedStocks.find(s => s.code === code);
  if (!exists) {
    state.selectedStocks.push({ code, name });
    renderStockTags();
  }

  // 更新 textarea：替换最后一段正在输入的文字
  const textarea = $('#screener-input');
  const text = textarea.value;
  const segments = text.split(/([,，\n])/);
  // 去掉最后一段（正在输入的），保留分隔符
  let result = '';
  for (let i = 0; i < segments.length - 1; i++) {
    result += segments[i];
  }
  // 如果result末尾没有分隔符，加逗号
  if (result && !/[,，\n]$/.test(result)) {
    result += ', ';
  }
  result += `${name}(${code}), `;
  textarea.value = result;
  textarea.focus();

  // 光标放到末尾
  textarea.scrollTop = textarea.scrollHeight;
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

/**
 * 渲染已选股票标签
 */
function renderStockTags() {
  const container = $('#stock-tags');
  if (!container) return;

  container.innerHTML = '';
  state.selectedStocks.forEach((stock, idx) => {
    const tag = document.createElement('span');
    tag.className = 'stock-tag';
    tag.innerHTML = `${stock.name} <button class="stock-tag-remove" data-idx="${idx}">✕</button>`;

    tag.querySelector('.stock-tag-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedStocks.splice(idx, 1);
      renderStockTags();
      // 同步更新 textarea
      syncStockTagsToInput();
    });

    container.appendChild(tag);
  });
}

/**
 * 将标签中的股票同步回 textarea
 */
function syncStockTagsToInput() {
  const textarea = $('#screener-input');
  // 保留非股票的输入内容（行业描述等）
  const lines = textarea.value.split('\n');
  let freeText = '';
  lines.forEach(line => {
    // 如果行不是纯股票代码/名称，保留
    const trimmed = line.trim();
    if (trimmed && !/^[\dA-Z.(),，、\s\u4e00-\u9fa5]+$/.test(trimmed)) {
      freeText += (freeText ? '\n' : '') + trimmed;
    }
  });

  let stockText = state.selectedStocks.map(s => `${s.name}(${s.code})`).join(', ');
  textarea.value = stockText + (freeText ? '\n' + freeText : '');
}

// ======================== 估值计算器 ========================

/**
 * 估值方法参数定义
 * source: 'auto' = 从财报自动填充, 'suggest' = 建议值, 'required' = 必须手动填
 */
// const VAL_METHODS = {
//   dcf: {
//     name: '💵 现金流折现法 (DCF)',
//     desc: '预测未来自由现金流并折现至现值',
//     params: [
//       { key: 'fcf0',       label: '当前自由现金流(亿)',  source: 'auto',   hint: '自动' },
//       { key: 'growth1',    label: '第1阶段增长率(%)',    source: 'suggest', hint: '建议8-15' },
//       { key: 'years1',     label: '第1阶段年数',         source: 'suggest', hint: '建议5-10', defaultVal: 5 },
//       { key: 'growth2',    label: '第2阶段增长率(%)',    source: 'suggest', hint: '建议3-5', defaultVal: 3 },
//       { key: 'years2',     label: '第2阶段年数',         source: 'suggest', hint: '建议5-10', defaultVal: 5 },
//       { key: 'terminalG',  label: '永续增长率(%)',       source: 'suggest', hint: '建议2-3', defaultVal: 2.5 },
//       { key: 'wacc',       label: '折现率WACC(%)',       source: 'auto',   hint: '自动' },
//       { key: 'shares',     label: '总股本(亿股)',         source: 'auto',   hint: '自动' },
//       { key: 'netDebt',    label: '净债务(亿)',           source: 'auto',   hint: '自动' },
//     ]
//   },
//   graham: {
//     name: '🏛 格雷厄姆内在价值',
//     desc: 'V = EPS × (8.5 + 2g) × 4.4/Y',
//     params: [
//       { key: 'eps',        label: '每股收益EPS(元)',      source: 'auto',   hint: '自动' },
//       { key: 'growth',     label: '预期增长率(%)',        source: 'suggest', hint: '建议5-15' },
//       { key: 'aaaYield',   label: 'AAA公司债收益率(%)',  source: 'suggest', hint: '建议4-5', defaultVal: 4.4 },
//     ]
//   },
//   ddm: {
//     name: '💳 股利折现模型 (DDM)',
//     desc: '适用于稳定分红的成熟企业',
//     params: [
//       { key: 'dps',        label: '每股股利DPS(元)',      source: 'auto',   hint: '自动' },
//       { key: 'growth',     label: '股利增长率(%)',        source: 'suggest', hint: '建议3-8' },
//       { key: 'requiredR',  label: '要求回报率(%)',        source: 'auto',   hint: 'WACC+2%' },
//     ]
//   },
//   pe: {
//     name: '📐 相对估值法 (PE/PB)',
//     desc: '基于行业均值乘数推算合理价格',
//     params: [
//       { key: 'eps',        label: '每股收益EPS(元)',      source: 'auto',   hint: '自动' },
//       { key: 'bvps',       label: '每股净资产BVPS(元)',   source: 'auto',   hint: '自动' },
//       { key: 'peAvg',      label: '行业平均PE',           source: 'auto',   hint: '当前PE参考' },
//       { key: 'pbAvg',      label: '行业平均PB',           source: 'auto',   hint: '当前PB参考' },
//     ]
//   },
//   eva: {
//     name: '📊 EVA经济附加值',
//     desc: '价值 = 投入资本 + ∑(ROIC-WACC)×IC/(1+WACC)^t',
//     params: [
//       { key: 'ic',         label: '投入资本(亿)',         source: 'auto',   hint: '自动' },
//       { key: 'roic',       label: 'ROIC(%)',              source: 'auto',   hint: '自动' },
//       { key: 'wacc',       label: 'WACC(%)',              source: 'auto',   hint: '自动' },
//       { key: 'years',      label: '预测年数',             source: 'suggest', hint: '建议10', defaultVal: 10 },
//       { key: 'shares',     label: '总股本(亿股)',         source: 'auto',   hint: '自动' },
//     ]
//   }
// };

function initValuation() {
  renderValParams();
}

// ----- 估值搜索 -----

async function valSearchStock(keyword) {
  if (!keyword) { hideValSuggest(); return; }
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.QuotationCodeTable?.Data?.length) { hideValSuggest(); return; }

    const items = data.QuotationCodeTable.Data.filter(item =>
      item.MktNum === '0' || item.MktNum === '1' ||
      ['沪A','深A','科创板','创业板'].includes(item.SecurityTypeName)
    ).slice(0, 8);

    if (!items.length) { hideValSuggest(); return; }

    // 搜索接口不含行情，需批量查行情
    const secids = items.map(it => {
      const code = it.Code || '';
      return code.startsWith('6') ? `1.${code}` : `0.${code}`;
    }).join(',');
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secids}&fields=f2,f3,f12,f14&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteData = await quoteResp.json();
      const quoteMap = {};
      if (quoteData?.data?.diff) {
        quoteData.data.diff.forEach(q => { quoteMap[q.f12] = { price: q.f2, changePct: q.f3 }; });
      }
      items.forEach(it => {
        const q = quoteMap[it.Code];
        if (q) { it._price = q.price; it._changePct = q.changePct; }
      });
    } catch (e) { /* 行情获取失败，忽略 */ }

    renderValSuggest(items);
  } catch (e) { hideValSuggest(); }
}

function renderValSuggest(items) {
  const container = $('#val-suggest');
  container.innerHTML = '';
  state.valSuggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    const code = item.Code || '';
    const price = item._price;
    const changePct = item._changePct;
    let changeClass = '', changeText = '';
    if (changePct != null) {
      const pct = parseFloat(changePct);
      if (pct > 0) { changeClass = 'up'; changeText = `+${pct.toFixed(2)}%`; }
      else if (pct < 0) { changeClass = 'down'; changeText = `${pct.toFixed(2)}%`; }
      else changeText = '0.00%';
    }
    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
      ${price ? `<span class="stock-suggest-price">¥${parseFloat(price).toFixed(2)}</span>` : ''}
      ${changeText ? `<span class="stock-suggest-change ${changeClass}">${changeText}</span>` : ''}
    `;
    div.addEventListener('click', () => {
      const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;
      selectValStock(fullCode, item.Name || '', parseFloat(price) || 0, parseFloat(changePct) || 0);
      hideValSuggest();
    });
    container.appendChild(div);
  });
  container.style.display = '';
}

function updateValSuggestActive(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === state.valSuggestIndex));
  if (state.valSuggestIndex >= 0 && items[state.valSuggestIndex]) {
    items[state.valSuggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideValSuggest() {
  const c = $('#val-suggest');
  if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  state.valSuggestIndex = -1;
}

// ----- 选择股票 → 拉取数据 → 填充 -----

async function selectValStock(code, name, price, changePct) {
  $('#val-search-input').value = `${name}(${code})`;

  // 显示股票卡片（loading态）
  const card = $('#val-stock-card');
  card.style.display = '';
  $('#val-stock-name').textContent = name;
  $('#val-stock-code').textContent = code;
  $('#val-stock-industry').textContent = '';
  $('#val-stock-price').textContent = price ? `¥${price.toFixed(2)}` : '--';
  const changeEl = $('#val-stock-change');
  if (changePct > 0) { changeEl.textContent = `+${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change up'; }
  else if (changePct < 0) { changeEl.textContent = `${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change down'; }
  else { changeEl.textContent = '0.00%'; changeEl.className = 'val-stock-change'; }

  // 所有指标显示加载中
  const metricIds = ['pe','pb','mv','roe','eps','bps','gm','nm','revg','npg','dar','roic','ocf','fcf','dps','shares'];
  metricIds.forEach(id => { $(`#val-metric-${id}`).textContent = '加载中...'; });

  state.valStock = { code, name, price, changePct, fundamentals: null };
  $('#val-result').style.display = 'none';

  // 拉取财报数据
  await fetchValFundamentals(code);
}

/**
 * 从东方财富拉取基本面数据
 * 使用 datacenter-web API（可靠的 REST 接口）
 */
async function fetchValFundamentals(tsCode) {
  try {
    const code6 = tsCode.replace(/\.(SH|SZ)/, '');
    const secid = tsCode.endsWith('.SZ') ? `0.${code6}` : `1.${code6}`;

    // 1. 实时行情（PE、PB、市值、ROE 等）—— 使用 ulist 接口
    let quoteData = {};
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secid}&fields=f2,f3,f9,f12,f14,f20,f21,f23,f115&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteResult = await quoteResp.json();
      if (quoteResult?.data?.diff?.[0]) quoteData = quoteResult.data.diff[0];
    } catch (e) { console.log('行情接口失败:', e); }

    // 更新卡片上的行情指标
    const pe = quoteData.f9;
    const pb = quoteData.f23;
    const mv = quoteData.f20;
    const roe = quoteData.f115;
    if (pe != null) $('#val-metric-pe').textContent = pe.toFixed(1);
    else $('#val-metric-pe').textContent = '--';
    if (pb != null) $('#val-metric-pb').textContent = pb.toFixed(2);
    else $('#val-metric-pb').textContent = '--';
    if (mv != null) $('#val-metric-mv').textContent = mv >= 100000000 ? `${(mv / 100000000).toFixed(0)}亿` : `${(mv / 10000).toFixed(0)}万`;
    else $('#val-metric-mv').textContent = '--';
    if (roe != null) $('#val-metric-roe').textContent = `${roe.toFixed(1)}%`;
    else $('#val-metric-roe').textContent = '--';

    // 2. 财务主要指标（EPS、BPS、毛利率、净利率、ROE、营收增速 等）
    let finMainData = null;
    try {
      const finMainUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const finMainResp = await fetch(finMainUrl);
      const finMainResult = await finMainResp.json();
      if (finMainResult?.result?.data?.length) {
        finMainData = finMainResult.result.data[0]; // 最新年报
      }
    } catch (e) { console.log('财务主要指标接口失败:', e); }

    // 3. 利润表
    let incomeData = null;
    try {
      const incomeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const incomeResp = await fetch(incomeUrl);
      const incomeResult = await incomeResp.json();
      if (incomeResult?.result?.data?.length) incomeData = incomeResult.result.data[0];
    } catch (e) { console.log('利润表接口失败:', e); }

    // 4. 资产负债表
    let balanceData = null;
    try {
      const bsUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_BALANCE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const bsResp = await fetch(bsUrl);
      const bsResult = await bsResp.json();
      if (bsResult?.result?.data?.length) balanceData = bsResult.result.data[0];
    } catch (e) { console.log('资产负债表接口失败:', e); }

    // 5. 现金流量表
    let cashflowData = null;
    try {
      const cfUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const cfResp = await fetch(cfUrl);
      const cfResult = await cfResp.json();
      if (cfResult?.result?.data?.length) cashflowData = cfResult.result.data[0];
    } catch (e) { console.log('现金流量表接口失败:', e); }

    // 整合基本面数据
    const fund = extractFundamentals(quoteData, finMainData, incomeData, balanceData, cashflowData, tsCode);
    state.valStock.fundamentals = fund;

    // 更新卡片上的丰富指标
    updateValMetrics(fund);

    // 刷新参数表单
    renderValParams();

  } catch (e) {
    console.error('拉取基本面数据失败:', e);
    showToast('获取财务数据失败，请手动填入参数');
    state.valStock.fundamentals = {};
    renderValParams();
  }
}

/**
 * 更新估值卡片上的指标显示
 */
function updateValMetrics(fund) {
  // 盈利能力
  if (fund.eps != null) $('#val-metric-eps').textContent = fund.eps.toFixed(2);
  else $('#val-metric-eps').textContent = '--';
  if (fund.bvps != null) $('#val-metric-bps').textContent = fund.bvps.toFixed(2);
  else $('#val-metric-bps').textContent = '--';
  if (fund.grossMargin != null) $('#val-metric-gm').textContent = `${fund.grossMargin.toFixed(1)}%`;
  else $('#val-metric-gm').textContent = '--';
  if (fund.netMargin != null) $('#val-metric-nm').textContent = `${fund.netMargin.toFixed(1)}%`;
  else $('#val-metric-nm').textContent = '--';

  // 成长/财务健康
  if (fund.revenueGrowth != null) {
    const pct = fund.revenueGrowth;
    const el = $('#val-metric-revg');
    el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
  } else { $('#val-metric-revg').textContent = '--'; }
  if (fund.profitGrowth != null) {
    const pct = fund.profitGrowth;
    const el = $('#val-metric-npg');
    el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
  } else { $('#val-metric-npg').textContent = '--'; }
  if (fund.debtAssetRatio != null) $('#val-metric-dar').textContent = `${fund.debtAssetRatio.toFixed(1)}%`;
  else $('#val-metric-dar').textContent = '--';
  if (fund.roic != null) $('#val-metric-roic').textContent = `${fund.roic.toFixed(1)}%`;
  else $('#val-metric-roic').textContent = '--';

  // 现金流
  if (fund.opCashflowYi != null) $('#val-metric-ocf').textContent = fund.opCashflowYi.toFixed(1);
  else $('#val-metric-ocf').textContent = '--';
  if (fund.fcfYi != null) $('#val-metric-fcf').textContent = fund.fcfYi.toFixed(1);
  else $('#val-metric-fcf').textContent = '--';
  if (fund.dps != null) $('#val-metric-dps').textContent = fund.dps.toFixed(2);
  else $('#val-metric-dps').textContent = '--';
  if (fund.totalSharesYi != null) $('#val-metric-shares').textContent = fund.totalSharesYi.toFixed(2);
  else $('#val-metric-shares').textContent = '--';

  // 行业
  if (fund.industry) $('#val-stock-industry').textContent = fund.industry;
}

/**
 * 从多个接口提取整合基本面数据
 * quoteData: ulist 行情接口
 * finMain: RPT_F10_FINANCE_MAINFINADATA 财务主要指标
 * income: RPT_DMSK_FN_INCOME 利润表
 * balance: RPT_DMSK_FN_BALANCE 资产负债表
 * cashflow: RPT_DMSK_FN_CASHFLOW 现金流量表
 */
function extractFundamentals(quoteData, finMain, income, balance, cashflow, tsCode) {
  const f = {};

  // 从行情接口
  f.pe = safeNum(quoteData.f9);
  f.pb = safeNum(quoteData.f23);
  f.marketCap = safeNum(quoteData.f20);   // 总市值（元）
  f.roe = safeNum(quoteData.f115);

  // ===== 从财务主要指标（RPT_F10_FINANCE_MAINFINADATA）=====
  if (finMain) {
    f.industry = finMain.INDUSTRY_NAME || null;
    f.reportDate = finMain.REPORT_DATE_NAME || finMain.REPORT_DATE || null;
    f.eps = safeNum(finMain.EPSJB);             // 基本每股收益
    f.epsDiluted = safeNum(finMain.EPSKCJB);    // 扣非每股收益
    f.bvps = safeNum(finMain.BPS);              // 每股净资产
    f.dps = safeNum(finMain.MGWFPLR);           // 每股未分配利润 ≈ 每股股利近似
    f.cashPerShare = safeNum(finMain.MGJYXJJE); // 每股经营现金流
    f.revenue = safeNum(finMain.TOTALOPERATEREVE);  // 营业收入
    f.netProfit = safeNum(finMain.PARENTNETPROFIT); // 归母净利润
    f.grossMargin = safeNum(finMain.XSMLL);     // 销售毛利率 %
    f.netMargin = safeNum(finMain.XSJLL);       // 销售净利率 %
    f.revenueGrowth = safeNum(finMain.TOTALOPERATEREVETZ); // 营收同比增长率 %
    f.profitGrowth = safeNum(finMain.PARENTNETPROFITTZ);   // 净利润同比增长率 %
    f.debtAssetRatio = safeNum(finMain.ZCFZL);  // 资产负债率 %
    f.currentRatio = safeNum(finMain.LD);       // 流动比率
    f.totalShares = safeNum(finMain.TOTAL_SHARE);   // 总股本（股）
    f.roic = safeNum(finMain.ROIC);             // ROIC %
    // FCFF
    f.fcffForward = safeNum(finMain.FCFF_FORWARD); // 自由现金流(正推)
    f.fcffBack = safeNum(finMain.FCFF_BACK);       // 自由现金流(反推)
  }

  // ===== 从利润表（RPT_DMSK_FN_INCOME）=====
  if (income) {
    if (!f.revenue) f.revenue = safeNum(income.TOTAL_OPERATE_INCOME);
    if (!f.netProfit) f.netProfit = safeNum(income.PARENT_NETPROFIT);
    f.operateCost = safeNum(income.TOTAL_OPERATE_COST);
    f.operateProfit = safeNum(income.OPERATE_PROFIT);
    f.saleExpense = safeNum(income.SALE_EXPENSE);
    f.manageExpense = safeNum(income.MANAGE_EXPENSE);
    f.financeExpense = safeNum(income.FINANCE_EXPENSE);
    f.deductNetProfit = safeNum(income.DEDUCT_PARENT_NETPROFIT);
    if (!f.revenueGrowth) f.revenueGrowth = safeNum(income.TOI_RATIO);
    if (!f.profitGrowth) f.profitGrowth = safeNum(income.PARENT_NETPROFIT_RATIO);
  }

  // ===== 从资产负债表（RPT_DMSK_FN_BALANCE）=====
  if (balance) {
    f.totalAssets = safeNum(balance.TOTAL_ASSETS);
    f.totalLiab = safeNum(balance.TOTAL_LIABILITIES);
    f.totalEquity = safeNum(balance.TOTAL_EQUITY);
    f.cash = safeNum(balance.MONETARYFUNDS);
    f.inventory = safeNum(balance.INVENTORY);
    f.accountsReceivable = safeNum(balance.ACCOUNTS_RECE);
    f.accountsPayable = safeNum(balance.ACCOUNTS_PAYABLE);
    if (!f.totalShares) f.totalShares = safeNum(balance.TOTAL_SHARE);
    if (!f.debtAssetRatio) f.debtAssetRatio = safeNum(balance.DEBT_ASSET_RATIO);
  }

  // ===== 从现金流量表（RPT_DMSK_FN_CASHFLOW）=====
  if (cashflow) {
    f.opCashflow = safeNum(cashflow.NETCASH_OPERATE);    // 经营活动现金流净额
    f.capEx = safeNum(cashflow.CONSTRUCT_LONG_ASSET);     // 购建固定资产等（资本支出，正值）
    f.investCashflow = safeNum(cashflow.NETCASH_INVEST);  // 投资活动现金流
    f.financeCashflow = safeNum(cashflow.NETCASH_FINANCE); // 筹资活动现金流
  }

  // ===== 计算派生指标 =====
  // 总股本（亿股）
  if (f.totalShares) {
    f.totalSharesYi = f.totalShares / 100000000;
  }
  // EPS 补算
  if (!f.eps && f.netProfit && f.totalShares) {
    f.eps = f.netProfit / f.totalShares;
  }
  // BVPS 补算
  if (!f.bvps && f.totalEquity && f.totalShares) {
    f.bvps = f.totalEquity / f.totalShares;
  }
  // 当前价格（从市值推算）
  if (f.marketCap && f.totalShares) {
    f.currentPrice = f.marketCap / f.totalShares;
  } else if (state.valStock?.price) {
    f.currentPrice = state.valStock.price;
  }
  // 净债务 = 总负债 - 现金
  if (f.totalLiab) {
    f.netDebt = f.cash ? f.totalLiab - f.cash : f.totalLiab;
    f.netDebtYi = f.netDebt / 100000000;
  }
  // 投入资本 ≈ 总资产
  if (f.totalAssets) {
    f.ic = f.totalAssets;
    f.icYi = f.ic / 100000000;
  }
  // 经营现金流（亿）
  if (f.opCashflow) {
    f.opCashflowYi = f.opCashflow / 100000000;
  }
  // 自由现金流 = 经营CF - 资本支出
  if (f.opCashflow != null && f.capEx != null) {
    f.freeCashflow = f.opCashflow - f.capEx;
    f.fcfYi = f.freeCashflow / 100000000;
  } else if (f.fcffForward != null) {
    // 备用：从主指标接口获取的 FCFF
    f.freeCashflow = f.fcffForward;
    f.fcfYi = f.freeCashflow / 100000000;
  } else if (f.fcffBack != null) {
    f.freeCashflow = f.fcffBack;
    f.fcfYi = f.freeCashflow / 100000000;
  }
  // FCF per share
  if (f.freeCashflow && f.totalShares) {
    f.fcfPerShare = f.freeCashflow / f.totalShares;
  }
  // ROIC 补算
  if (!f.roic && f.netProfit && f.ic) {
    f.roic = (f.netProfit / f.ic) * 100;
  }
  // WACC 估算
  f.wacc = estimateWACC(f);
  // PE 隐含增长率（格雷厄姆公式反推）
  if (f.pe) {
    f.impliedGrowth = Math.max(0, (f.pe - 8.5) / 2);
  }

  return f;
}

function safeNum(v) {
  if (v == null || v === '-' || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/**
 * 简单WACC估算
 */
function estimateWACC(f) {
  // Cost of Equity: CAPM简化，取10%
  const ke = 10;
  // Cost of Debt: 取5%
  const kd = 5;
  // 权重
  const equityRatio = f.totalEquity && f.totalAssets ? f.totalEquity / f.totalAssets : 0.7;
  const debtRatio = 1 - equityRatio;
  // 税率
  const taxRate = 0.25;
  // WACC
  return ke * equityRatio + kd * (1 - taxRate) * debtRatio;
}

// ----- 渲染参数表单 -----

function renderValParams() {
  const method = VAL_METHODS[state.valMethod];
  if (!method) return;

  const container = $('#val-params');
  const fund = state.valStock?.fundamentals || {};

  let html = `<div class="val-params-title">📋 ${method.name} 参数</div>`;
  if (fund.reportDate) {
    html += `<div style="font-size:10px;color:var(--text-hint);margin-bottom:6px">数据来源：${fund.reportDate}（东方财富）</div>`;
  }

  method.params.forEach(p => {
    let value = '';
    let hintClass = '';
    let hintText = p.hint || '';

    // 尝试自动填充
    const autoVal = getAutoParamValue(p.key, fund);
    if (autoVal != null) {
      value = typeof autoVal === 'number' ? (Number.isInteger(autoVal) ? autoVal : autoVal.toFixed(2)) : autoVal;
      hintClass = 'auto';
      hintText = '✓ 自动填充';
    } else if (state.valParams[p.key] != null) {
      value = state.valParams[p.key];
    } else if (p.defaultVal != null) {
      value = p.defaultVal;
      hintClass = 'suggest';
      hintText = '建议值';
    }

    html += `
      <div class="val-param-row">
        <span class="val-param-label">${p.label}</span>
        <input type="number" step="any" class="val-param-input" data-key="${p.key}" value="${value}" placeholder="${p.source === 'required' ? '必填' : '选填'}">
        <span class="val-param-hint ${hintClass}">${hintText}</span>
      </div>
    `;
  });

  // 方法说明
  html += `<div style="margin-top:8px;font-size:11px;color:var(--text-hint);line-height:1.5">${method.desc}</div>`;

  container.innerHTML = html;

  // 绑定参数输入事件
  container.querySelectorAll('.val-param-input').forEach(input => {
    input.addEventListener('input', () => {
      state.valParams[input.dataset.key] = input.value;
    });
  });
}

function getAutoParamValue(key, fund) {
  if (!fund) return null;
  const map = {
    fcf0:       fund.fcfYi,
    wacc:       fund.wacc,
    shares:     fund.totalSharesYi,
    netDebt:    fund.netDebtYi,
    eps:        fund.eps,
    bvps:       fund.bvps,
    dps:        fund.dps,
    ic:         fund.icYi,
    roic:       fund.roic,
    growth:     fund.impliedGrowth,
    requiredR:  fund.wacc ? fund.wacc + 2 : null,  // 要求回报率 ≈ WACC + 2%
    peAvg:      fund.pe,                              // 默认用当前PE作为行业PE参考
    pbAvg:      fund.pb,                              // 默认用当前PB作为行业PB参考
  };
  return map[key] ?? null;
}

// ----- 估值计算 -----

function calculateValuation() {
  const method = state.valMethod;
  const fund = state.valStock?.fundamentals || {};

  // 收集参数
  const params = {};
  $$('.val-param-input').forEach(input => {
    const key = input.dataset.key;
    const val = parseFloat(input.value);
    if (isNaN(val)) {
      showToast(`请填写参数：${input.closest('.val-param-row').querySelector('.val-param-label').textContent}`);
      return;
    }
    params[key] = val;
  });

  // 检查必填参数
  const methodDef = VAL_METHODS[method];
  const missingParam = methodDef.params.find(p => {
    const val = params[p.key];
    return val == null || isNaN(val);
  });
  if (missingParam) {
    showToast(`请填写：${missingParam.label}`);
    return;
  }

  let result;
  switch (method) {
    case 'dcf':      result = calcDCF(params); break;
    case 'graham':   result = calcGraham(params); break;
    case 'ddm':      result = calcDDM(params); break;
    case 'pe':       result = calcPE(params); break;
    case 'eva':      result = calcEVA(params); break;
    default: result = null;
  }

  if (result) {
    result.currentPrice = state.valStock?.price || fund.currentPrice;
    result.methodName = methodDef.name;
    renderValResult(result, method, params);
  }
}

/**
 * DCF 两阶段自由现金流折现
 */
function calcDCF(p) {
  const { fcf0, growth1, years1, growth2, years2, terminalG, wacc, shares, netDebt } = p;
  const r = wacc / 100;
  const g1 = growth1 / 100;
  const g2 = growth2 / 100;
  const gt = terminalG / 100;

  // 第1阶段
  let pv1 = 0;
  let fcf = fcf0;
  for (let i = 1; i <= years1; i++) {
    fcf = fcf * (1 + g1);
    pv1 += fcf / Math.pow(1 + r, i);
  }

  // 第2阶段
  let pv2 = 0;
  let fcf2 = fcf;
  for (let i = 1; i <= years2; i++) {
    fcf2 = fcf2 * (1 + g2);
    pv2 += fcf2 / Math.pow(1 + r, years1 + i);
  }

  // 终值
  const terminalFCF = fcf2 * (1 + gt);
  const terminalValue = terminalFCF / (r - gt);
  const pvTerminal = terminalValue / Math.pow(1 + r, years1 + years2);

  const totalPV = pv1 + pv2 + pvTerminal;
  const equityValue = totalPV - netDebt;
  const intrinsicPerShare = equityValue / shares;

  return {
    intrinsicPerShare,
    totalPV: totalPV,
    pv1,
    pv2,
    pvTerminal,
    terminalValue,
    equityValue,
    assumptions: [
      { label: '第1阶段FCF现值', value: formatYi(pv1) },
      { label: '第2阶段FCF现值', value: formatYi(pv2) },
      { label: '终值现值', value: formatYi(pvTerminal) },
      { label: '企业总价值', value: formatYi(totalPV) },
      { label: '净债务', value: formatYi(netDebt) },
      { label: '股权价值', value: formatYi(equityValue) },
    ]
  };
}

/**
 * 格雷厄姆内在价值 V = EPS × (8.5 + 2g) × 4.4/Y
 */
function calcGraham(p) {
  const { eps, growth, aaaYield } = p;
  const g = growth / 100;
  const Y = aaaYield / 100;

  const intrinsicPerShare = eps * (8.5 + 2 * growth) * (4.4 / (Y * 100));
  // 修正: 格雷厄姆公式 V = EPS × (8.5 + 2g) × 4.4/Y
  // 其中Y为AAA债券收益率，g为预期增长率(%)
  const v = eps * (8.5 + 2 * growth) * (4.4 / aaaYield);

  return {
    intrinsicPerShare: v,
    assumptions: [
      { label: 'EPS', value: `${eps.toFixed(2)} 元` },
      { label: '增长率g', value: `${growth}%` },
      { label: 'AAA收益率Y', value: `${aaaYield}%` },
      { label: '因子(8.5+2g)', value: (8.5 + 2 * growth).toFixed(1) },
      { label: '调整系数4.4/Y', value: (4.4 / aaaYield).toFixed(3) },
    ]
  };
}

/**
 * DDM 股利折现模型（两阶段）
 */
function calcDDM(p) {
  const { dps, growth, requiredR } = p;
  const g = growth / 100;
  const r = requiredR / 100;

  // 简化：Gordon增长模型 V = D1 / (r - g)
  const d1 = dps * (1 + g);
  const intrinsicPerShare = d1 / (r - g);

  return {
    intrinsicPerShare,
    assumptions: [
      { label: '当前股利DPS', value: `${dps.toFixed(2)} 元` },
      { label: '下期股利D1', value: `${d1.toFixed(2)} 元` },
      { label: '股利增长率', value: `${growth}%` },
      { label: '要求回报率', value: `${requiredR}%` },
    ]
  };
}

/**
 * 相对估值 PE/PB
 */
function calcPE(p) {
  const { eps, bvps, peAvg, pbAvg } = p;

  const valByPE = eps * peAvg;
  const valByPB = bvps * pbAvg;
  const intrinsicPerShare = (valByPE + valByPB) / 2;  // 简单平均

  return {
    intrinsicPerShare,
    valByPE,
    valByPB,
    assumptions: [
      { label: 'PE估值', value: `¥${valByPE.toFixed(2)}` },
      { label: 'PB估值', value: `¥${valByPB.toFixed(2)}` },
      { label: '行业PE', value: peAvg.toFixed(1) },
      { label: '行业PB', value: pbAvg.toFixed(2) },
      { label: 'EPS', value: `${eps.toFixed(2)} 元` },
      { label: 'BVPS', value: `${bvps.toFixed(2)} 元` },
    ]
  };
}

/**
 * EVA 经济附加值
 */
function calcEVA(p) {
  const { ic, roic, wacc, years, shares } = p;
  const r = wacc / 100;

  let totalEVA = 0;
  let evaList = [];
  for (let t = 1; t <= years; t++) {
    const eva = (roic / 100 - r) * ic / Math.pow(1 + r, t);
    totalEVA += eva;
    if (t <= 5) evaList.push({ year: t, eva });
  }

  const firmValue = ic + totalEVA;
  const intrinsicPerShare = firmValue / shares;

  return {
    intrinsicPerShare,
    totalEVA,
    firmValue,
    evaList,
    assumptions: [
      { label: '投入资本', value: formatYi(ic) },
      { label: 'ROIC', value: `${roic}%` },
      { label: 'WACC', value: `${wacc}%` },
      { label: 'ROIC - WACC', value: `${(roic - wacc).toFixed(2)}%` },
      { label: 'EVA总现值', value: formatYi(totalEVA) },
      { label: '企业价值', value: formatYi(firmValue) },
    ]
  };
}

// ----- 渲染估值结果 -----

function renderValResult(result, method, params) {
  const container = $('#val-result');
  const { intrinsicPerShare, currentPrice } = result;

  // 安全边际
  const safetyMargin = currentPrice > 0
    ? ((intrinsicPerShare - currentPrice) / intrinsicPerShare * 100)
    : 0;

  const isUndervalued = safetyMargin > 10;
  const isOvervalued = safetyMargin < -10;
  const statusClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');
  const statusText = isUndervalued ? '🟢 低估' : (isOvervalued ? '🔴 高估' : '🟡 合理');
  const safetyClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');
  const safetyText = safetyMargin > 0 ? `安全边际 +${safetyMargin.toFixed(1)}%` : `溢价 ${Math.abs(safetyMargin).toFixed(1)}%`;

  let html = `
    <div class="val-result-header">
      <h3>${result.methodName} 估值结果</h3>
    </div>
    <div class="val-result-body">
      <div class="val-core-result">
        <div class="val-intrinsic-label">每股内在价值</div>
        <div class="val-intrinsic-value ${statusClass}">¥${intrinsicPerShare.toFixed(2)}</div>
        <div class="val-safety-margin ${safetyClass}">${statusText} · ${safetyText}</div>
      </div>

      <div class="val-compare-row">
        <span class="val-compare-label">内在价值</span>
        <span class="val-compare-value">¥${intrinsicPerShare.toFixed(2)}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">当前市价</span>
        <span class="val-compare-value">¥${currentPrice?.toFixed(2) || '--'}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">差值</span>
        <span class="val-compare-value" style="color:${isUndervalued ? '#e53935' : (isOvervalued ? '#34a853' : 'inherit')}">${currentPrice ? `¥${(intrinsicPerShare - currentPrice).toFixed(2)}` : '--'}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">安全边际</span>
        <span class="val-compare-value" style="color:${isUndervalued ? '#e53935' : (isOvervalued ? '#34a853' : 'inherit')}">${safetyMargin.toFixed(1)}%</span>
      </div>`;

  // 可视化柱状条
  if (currentPrice > 0) {
    const maxVal = Math.max(intrinsicPerShare, currentPrice) * 1.2;
    const barIntrinsic = Math.min((intrinsicPerShare / maxVal) * 100, 100);
    const barCurrent = Math.min((currentPrice / maxVal) * 100, 100);

    html += `
      <div class="val-bar-wrap">
        <div class="val-bar-label">
          <span>0</span>
          <span>¥${maxVal.toFixed(0)}</span>
        </div>
        <div class="val-bar-track">
          <div class="val-bar-intrinsic" style="width:${barIntrinsic}%">内在价值 ¥${intrinsicPerShare.toFixed(2)}</div>
          <div class="val-bar-marker" style="left:${barCurrent}%" data-label="市价 ¥${currentPrice.toFixed(2)}"></div>
        </div>
      </div>`;
  }

  // 假设明细
  if (result.assumptions) {
    html += `
      <div class="val-assumptions">
        <h4>📊 计算明细</h4>`;
    result.assumptions.forEach(a => {
      html += `<div class="val-assumption-item"><span>${a.label}</span><span>${a.value}</span></div>`;
    });
    html += `</div>`;
  }

  // EVA特有：年度EVA列表
  if (result.evaList) {
    html += `
      <div class="val-assumptions">
        <h4>📈 年度EVA</h4>`;
    result.evaList.forEach(e => {
      html += `<div class="val-assumption-item"><span>第${e.year}年</span><span>${formatYi(e.eva)}</span></div>`;
    });
    html += `</div>`;
  }

  html += `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text-hint);line-height:1.6">
        ⚠️ 估值结果仅供参考，不构成投资建议。不同假设条件下结果差异较大，建议结合多种方法综合判断。
      </div>
    </div>`;

  container.innerHTML = html;
  container.style.display = '';
}

function formatYi(v) {
  if (v == null) return '--';
  if (Math.abs(v) >= 1) return `${v.toFixed(2)}亿`;
  if (Math.abs(v) >= 0.01) return `${(v * 10000).toFixed(0)}万`;
  return `${v.toFixed(4)}亿`;
}

