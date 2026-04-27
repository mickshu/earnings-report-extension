// ======================== 股票分析模块 (stock-analysis.js) ========================
// 抽取自 sidepanel.js，管理股票搜索、数据获取、分析报告生成

// ======================== 股票分析模块 ========================

/**
 * 股票搜索（股票分析入口）
 */
async function saSearchStock(keyword) {
  if (!keyword) { hideSASuggest(); return; }
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.QuotationCodeTable?.Data?.length) { hideSASuggest(); return; }

    const items = data.QuotationCodeTable.Data.filter(item =>
      item.MktNum === '0' || item.MktNum === '1' ||
      ['沪A','深A','科创板','创业板'].includes(item.SecurityTypeName)
    ).slice(0, 8);

    if (!items.length) { hideSASuggest(); return; }
    renderSASuggest(items);
  } catch (e) { hideSASuggest(); }
}

function renderSASuggest(items) {
  const container = $('#sa-suggest');
  container.innerHTML = '';
  state.saSuggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    const code = item.Code || '';
    // 带行情数据的下拉
    const price = item.MktNum != null ? '' : '';
    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
    `;
    div.addEventListener('click', () => {
      const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;
      const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
      selectSAStock(fullCode, item.Name || '', secid);
      hideSASuggest();
    });
    container.appendChild(div);
  });
  container.style.display = '';
}

function updateSASuggestActive(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === state.saSuggestIndex));
  if (state.saSuggestIndex >= 0 && items[state.saSuggestIndex]) {
    items[state.saSuggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideSASuggest() {
  const c = $('#sa-suggest');
  if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  state.saSuggestIndex = -1;
}

/**
 * 选择股票 → 获取行情 + 基本面 → 显示卡片
 */
async function selectSAStock(code, name, secid) {
  $('#sa-search-input').value = `${name}(${code})`;

  // 显示卡片（loading态）
  const card = $('#sa-stock-card');
  card.style.display = '';
  $('#sa-stock-name').textContent = name;
  $('#sa-stock-code').textContent = code;
  $('#sa-stock-industry').textContent = '';
  $('#sa-stock-price').textContent = '--';
  $('#sa-stock-change').textContent = '--';
  $('#sa-stock-change').className = 'val-stock-change';

  const metricIds = ['pe','pb','mv','roe','gm','nm','revg','npg','dar','roic','ocf','fcf'];
  metricIds.forEach(id => { $(`#sa-metric-${id}`).textContent = '加载中...'; });

  state.saStock = { code, name, secid };
  state.saFundamentals = null;
  state.saMarkdown = '';
  $('#sa-result').style.display = 'none';

  // 拉取数据
  await fetchSAFundamentals(code, secid);
}

/**
 * 从东方财富拉取行情 + 财务数据
 */
async function fetchSAFundamentals(tsCode, secid) {
  try {
    const code6 = tsCode.replace(/\.(SH|SZ)/, '');
    if (!secid) secid = tsCode.endsWith('.SZ') ? `0.${code6}` : `1.${code6}`;

    // 1. 实时行情
    let quoteData = {};
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secid}&fields=f2,f3,f9,f12,f14,f20,f21,f23,f115&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteResult = await quoteResp.json();
      if (quoteResult?.data?.diff?.[0]) quoteData = quoteResult.data.diff[0];
    } catch (e) { console.log('行情接口失败:', e); }

    // 更新行情
    const price = quoteData.f2 != null ? quoteData.f2 : null;
    const changePct = quoteData.f3 != null ? quoteData.f3 : null;
    if (price != null) $('#sa-stock-price').textContent = `¥${price.toFixed(2)}`;
    else $('#sa-stock-price').textContent = '--';
    const changeEl = $('#sa-stock-change');
    if (changePct != null) {
      if (changePct > 0) { changeEl.textContent = `+${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change up'; }
      else if (changePct < 0) { changeEl.textContent = `${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change down'; }
      else { changeEl.textContent = '0.00%'; changeEl.className = 'val-stock-change'; }
    } else { changeEl.textContent = '--'; changeEl.className = 'val-stock-change'; }

    state.saStock.price = price;
    state.saStock.changePct = changePct;

    const pe = quoteData.f9;
    const pb = quoteData.f23;
    const mv = quoteData.f20;
    const roe = quoteData.f115;
    if (pe != null) $('#sa-metric-pe').textContent = pe.toFixed(1);
    else $('#sa-metric-pe').textContent = '--';
    if (pb != null) $('#sa-metric-pb').textContent = pb.toFixed(2);
    else $('#sa-metric-pb').textContent = '--';
    if (mv != null) $('#sa-metric-mv').textContent = mv >= 100000000 ? `${(mv / 100000000).toFixed(0)}亿` : `${(mv / 10000).toFixed(0)}万`;
    else $('#sa-metric-mv').textContent = '--';
    if (roe != null) $('#sa-metric-roe').textContent = `${roe.toFixed(1)}%`;
    else $('#sa-metric-roe').textContent = '--';

    // 2. 财务主要指标（最近2期用于对比）
    let finMainData = null;
    let finMainDataPrev = null;
    try {
      const finMainUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const finMainResp = await fetch(finMainUrl);
      const finMainResult = await finMainResp.json();
      if (finMainResult?.result?.data?.length) {
        finMainData = finMainResult.result.data[0];
        if (finMainResult.result.data.length > 1) finMainDataPrev = finMainResult.result.data[1];
      }
    } catch (e) { console.log('财务主要指标接口失败:', e); }

    // 更新指标卡
    if (finMainData) {
      if (finMainData.XSMLL != null) $('#sa-metric-gm').textContent = `${parseFloat(finMainData.XSMLL).toFixed(1)}%`;
      else $('#sa-metric-gm').textContent = '--';
      if (finMainData.XSJLL != null) $('#sa-metric-nm').textContent = `${parseFloat(finMainData.XSJLL).toFixed(1)}%`;
      else $('#sa-metric-nm').textContent = '--';
      if (finMainData.TOTALOPERATEREVETZ != null) {
        const pct = parseFloat(finMainData.TOTALOPERATEREVETZ);
        const el = $('#sa-metric-revg');
        el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
        el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
      } else { $('#sa-metric-revg').textContent = '--'; }
      if (finMainData.PARENTNETPROFITTZ != null) {
        const pct = parseFloat(finMainData.PARENTNETPROFITTZ);
        const el = $('#sa-metric-npg');
        el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
        el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
      } else { $('#sa-metric-npg').textContent = '--'; }
      if (finMainData.ZCFZL != null) $('#sa-metric-dar').textContent = `${parseFloat(finMainData.ZCFZL).toFixed(1)}%`;
      else $('#sa-metric-dar').textContent = '--';
      if (finMainData.ROIC != null) $('#sa-metric-roic').textContent = `${parseFloat(finMainData.ROIC).toFixed(1)}%`;
      else $('#sa-metric-roic').textContent = '--';
      if (finMainData.INDUSTRY_NAME) $('#sa-stock-industry').textContent = finMainData.INDUSTRY_NAME;
    }

    // 3. 利润表
    let incomeData = null;
    let incomeDataPrev = null;
    try {
      const incomeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const incomeResp = await fetch(incomeUrl);
      const incomeResult = await incomeResp.json();
      if (incomeResult?.result?.data?.length) {
        incomeData = incomeResult.result.data[0];
        if (incomeResult.result.data.length > 1) incomeDataPrev = incomeResult.result.data[1];
      }
    } catch (e) { console.log('利润表接口失败:', e); }

    // 4. 资产负债表
    let balanceData = null;
    try {
      const bsUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_BALANCE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const bsResp = await fetch(bsUrl);
      const bsResult = await bsResp.json();
      if (bsResult?.result?.data?.length) balanceData = bsResult.result.data[0];
    } catch (e) { console.log('资产负债表接口失败:', e); }

    // 5. 现金流量表
    let cashflowData = null;
    try {
      const cfUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const cfResp = await fetch(cfUrl);
      const cfResult = await cfResp.json();
      if (cfResult?.result?.data?.length) cashflowData = cfResult.result.data[0];
    } catch (e) { console.log('现金流量表接口失败:', e); }

    // 6. 获取近5年主要财务指标（用于趋势分析）
    let finMainMultiYear = [];
    try {
      const myUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=20&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=REPORT_DATE,REPORT_DATE_NAME,EPSJB,BPS,XSMLL,XSJLL,PARENTNETPROFITTZ,TOTALOPERATEREVETZ,ZCFZL,ROEJQ,ROIC&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const myResp = await fetch(myUrl);
      const myResult = await myResp.json();
      if (myResult?.result?.data?.length) finMainMultiYear = myResult.result.data;
    } catch (e) { console.log('多年指标接口失败:', e); }

    // 更新现金流指标
    const fund = extractFundamentals(quoteData, finMainData, incomeData, balanceData, cashflowData, tsCode);
    state.saFundamentals = fund;
    if (fund.opCashflowYi != null) $('#sa-metric-ocf').textContent = fund.opCashflowYi.toFixed(1);
    else $('#sa-metric-ocf').textContent = '--';
    if (fund.fcfYi != null) $('#sa-metric-fcf').textContent = fund.fcfYi.toFixed(1);
    else $('#sa-metric-fcf').textContent = '--';

    // 存储多年数据供分析使用
    state.saFundamentals._multiYear = finMainMultiYear;
    state.saFundamentals._incomePrev = incomeDataPrev;
    state.saFundamentals._finMainPrev = finMainDataPrev;

    // 5. 机构持股数据（最近两期对比）
    try {
      const holderUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=END_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_F10_EH_FREEHOLDERS&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const holderResp = await fetch(holderUrl);
      const holderResult = await holderResp.json();
      if (holderResult?.result?.data?.length) {
        state.saFundamentals._holderData = holderResult.result.data[0];
        state.saFundamentals._holderDataPrev = holderResult.result.data[1] || null;
      }
    } catch (e) { console.log('机构持股接口失败:', e); }

    // 6. 十大流通股东变化
    try {
      const topHolderUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=END_DATE&sortTypes=-1&pageSize=10&pageNumber=1&reportName=RPT_F10_EH_FREEHOLDERS&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const topHolderResp = await fetch(topHolderUrl);
      const topHolderResult = await topHolderResp.json();
      if (topHolderResult?.result?.data?.length) {
        state.saFundamentals._topHolders = topHolderResult.result.data;
      }
    } catch (e) { console.log('十大流通股东接口失败:', e); }

    // 7. 获取行业特色指标数据
    try {
      const industry = finMainData?.INDUSTRY_NAME || '';
      const industryConfig = matchIndustryConfig(industry);
      if (industryConfig) {
        console.log(`[行业指标] 识别到行业: ${industryConfig.name}`);
        
        // 计算行业特色指标
        const industryMetrics = {};
        
        // 研发投入占比
        if (incomeData && finMainData) {
          const rAndD = incomeData.RESEARCH_DEVELOPE_INCOME || 0;
          const revenue = incomeData.TOTAL_OPERATE_INCOME || finMainData.TOTALOPERATEREVENUE || 1;
          if (rAndD > 0 && revenue > 0) {
            const rdRatio = (rAndD / revenue * 100);
            industryMetrics.r_and_d_ratio = `${rdRatio.toFixed(2)}%`;
            industryMetrics.r_and_d_amount = (rAndD / 100000000).toFixed(2) + '亿元';
          }
        }
        
        // 毛利率
        if (finMainData && finMainData.XSMLL != null) {
          industryMetrics.gross_margin = `${parseFloat(finMainData.XSMLL).toFixed(2)}%`;
        }
        
        // 存货周转率
        if (incomeData && balanceData) {
          const operateCost = incomeData.OPERATE_COST || 0;
          const inventory = balanceData.INVENTORY || 0;
          if (inventory > 0 && operateCost > 0) {
            const invTurnover = operateCost / inventory;
            industryMetrics.inventory_turnover = invTurnover.toFixed(2) + '次/年';
          }
        }
        
        // 保存行业指标
        if (Object.keys(industryMetrics).length > 0) {
          state.saFundamentals._industryMetrics = industryMetrics;
          console.log(`[行业指标] 获取到数据:`, industryMetrics);
        }
      }
    } catch (e) { console.log('行业指标计算失败:', e); }

    // 8. 获取融资融券数据（最近60个交易日）
    try {
      const marginUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=0&lmt=60&end=20500101`;
      const marginResp = await fetch(marginUrl);
      const marginResult = await marginResp.json();
      if (marginResult?.data?.klines) {
        state.saFundamentals._marginData = marginResult.data.klines.map(line => {
          const parts = line.split(',');
          return {
            date: parts[0],
            financeBalance: parseFloat(parts[1]) || 0,
            buyAmount: parseFloat(parts[2]) || 0,
            repayAmount: parseFloat(parts[3]) || 0,
            securitiesBalance: parseFloat(parts[4]) || 0,
            sellAmount: parseFloat(parts[5]) || 0,
            repaySecAmount: parseFloat(parts[6]) || 0
          };
        }).filter(d => d.financeBalance > 0 || d.securitiesBalance > 0);
        console.log(`[融资融券] 获取到 ${state.saFundamentals._marginData.length} 条数据`);
      }
    } catch (e) { console.log('融资融券接口失败:', e); }

    // 9. 获取主力资金流向数据（最近60个交易日）
    try {
      const fflowUrl = `https://push2his.eastmoney.com/api/qt/stock/fflow/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&lmt=60`;
      const fflowResult = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'HOTSPOT_FETCH', url: fflowUrl }, (resp) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          if (!resp || resp.error) { reject(new Error(resp?.error || '请求失败')); return; }
          resolve(resp.data);
        });
      });
      if (fflowResult?.data?.klines) {
        state.saFundamentals._northData = fflowResult.data.klines.map(line => {
          const parts = line.split(',');
          return {
            date: parts[0],
            mainNet: parseFloat(parts[1]) || 0,       // 主力净流入(元)
            smallNet: parseFloat(parts[2]) || 0,       // 小单净流入(元)
            midNet: parseFloat(parts[3]) || 0,         // 中单净流入(元)
            superNet: parseFloat(parts[4]) || 0,       // 超大单净流入(元)
            bigNet: parseFloat(parts[5]) || 0          // 大单净流入(元)
          };
        });
        console.log(`[资金流向] 获取到 ${state.saFundamentals._northData.length} 条数据`);
      }
    } catch (e) { console.log('资金流向接口失败:', e); }

    // 10. 获取管理层/高管数据
    try {
      const marketPrefix = tsCode.endsWith('.SZ') ? 'SZ' : 'SH';
      const mgmtUrl = `https://emweb.securities.eastmoney.com/PC_HSF10/CompanyManagement/PageAjax?code=${marketPrefix}${code6}`;
      const mgmtResp = await fetch(mgmtUrl);
      const mgmtResult = await mgmtResp.json();
      if (mgmtResult?.gglb?.length) {
        state.saFundamentals._mgmtData = mgmtResult.gglb;
        console.log(`[管理层] 获取到 ${mgmtResult.gglb.length} 位高管数据`);
      }
    } catch (e) { console.log('管理层接口失败:', e); }

    // 如果当前K线图Tab处于激活状态，自动加载K线图
    const activeKlineTab = document.querySelector('.sa-stock-card .sa-info-tab[data-infotab="kline"].active');
    if (activeKlineTab) {
      loadKlineChart('main');
    }

    // 如果当前资金流向Tab处于激活状态，自动加载资金流向图
    const activeNorthTab = document.querySelector('.sa-stock-card .sa-info-tab[data-infotab="north"].active');
    if (activeNorthTab) {
      loadNorthChart('main');
    }

  } catch (e) {
    console.error('拉取股票数据失败:', e);
    showToast('获取股票数据失败');
  }
}

/**
 * 运行股票分析
 */
/**
 * 获取当前分析风格对应的 System Prompt
 */
function getActiveSAPrompt() {
  const style = state.saAnalysisStyle || 'masters';
  if (typeof INVESTMENT_MASTER_PROMPTS !== 'undefined' && INVESTMENT_MASTER_PROMPTS[style]) {
    return INVESTMENT_MASTER_PROMPTS[style];
  }
  return STOCK_ANALYSIS_SYSTEM_PROMPT;
}

/**
 * 获取分析风格的显示名称
 */
function getSAStyleName() {
  const names = {
    masters: '七大师综合', buffett: '巴菲特', lynch: '林奇',
    fisher: '费雪', munger: '芒格', marks: '马克斯',
    duanyongping: '段永平', dalio: '达利欧'
  };
  return names[state.saAnalysisStyle] || '七大师综合';
}

/**
 * 运行股票分析
 */
async function runStockAnalysis() {
  if (state.isSARunning) return;
  if (!state.saStock || !state.saFundamentals) {
    showToast('请先搜索并选择一只股票');
    return;
  }
  if (!getActiveLLMService()?.apiKey) {
    showSettings();
    showToast('请先配置 LLM API Key');
    return;
  }

  state.isSARunning = true;

  // 同步折叠面板的指标数据
  syncCollapsedMetrics();

  // 隐藏搜索区和完整信息卡，显示折叠信息卡 + loading
  $('.sa-container').style.display = 'none';
  $('#sa-stock-card-collapsed').style.display = '';
  $('#sa-collapse-body').style.display = 'none';
  $('#sa-collapse-arrow').classList.remove('expanded');
  $('#sa-result').style.display = 'none';
  $('#sa-loading').style.display = '';
  $('#sa-loading-text').textContent = '正在构建分析数据...';

  try {
    // 构建分析数据文本
    const analysisText = buildStockAnalysisText();
    if (!analysisText || analysisText.trim().length < 50) {
      throw new Error('数据不足，无法进行分析');
    }

    // 调用 LLM
    const styleName = getSAStyleName();
    $('#sa-loading-text').textContent = `正在以\${styleName}视角进行投资分析...`;
    const stylePrefix = state.saAnalysisStyle !== 'masters' ? `请以\${styleName}的投资哲学为核心视角，` : '请';
    const userPrompt = `${stylePrefix}对以下股票数据进行全方位投资分析：\n---\n${analysisText}\n---\n${state.saAnalysisStyle !== 'masters' ? `请严格按照\${styleName}的分析框架和输出格式输出报告。` : '请严格按照七大师综合投资分析框架的10大维度输出报告，尤其关注七大师共识与分歧分析。'}尤其关注估值分析和投资策略建议。${state.saFundamentals?._mgmtData?.length ? '\n\n请特别关注管理层稳定性风险，结合管理层变动频率、关键人依赖度、利益一致性和背景匹配度给出综合评估，并给出风险等级（高/中/低）。' : ''}`;
    const result = await callLLM(getActiveSAPrompt(), userPrompt, true, 'stock-analysis');

    if (result) {
      state.saMarkdown = result;
      renderSAReport(result);
      $('#sa-loading').style.display = 'none';
      $('#sa-result').style.display = '';
      buildTOC();
      buildTTSSectionsFrom($('#sa-content'));
    } else {
      throw new Error('LLM调用返回为空');
    }
  } catch (e) {
    $('#sa-loading').style.display = 'none';
    $('#sa-stock-card-collapsed').style.display = 'none';
    console.error('股票分析错误:', e);
    if (e.message.includes('API key') || e.message.includes('401')) {
      showSettings();
      showToast('API Key 无效');
    } else {
      showToast('分析失败：' + e.message);
    }
    $('.sa-container').style.display = '';
  } finally {
    state.isSARunning = false;
  }
}

/**
 * 构建股票分析数据文本
 */
function buildStockAnalysisText() {
  const stock = state.saStock;
  const f = state.saFundamentals;
  if (!stock || !f) return '';

  let text = `# ${stock.name}(${stock.code}) 投资分析数据\n\n`;

  // 当前行情
  text += `## 当前行情\n`;
  text += `- 股票名称: ${stock.name}\n`;
  text += `- 股票代码: ${stock.code}\n`;
  if (f.industry) text += `- 所属行业: ${f.industry}\n`;
  if (f.currentPrice) text += `- 当前股价: ¥${f.currentPrice.toFixed(2)}\n`;
  else if (stock.price) text += `- 当前股价: ¥${stock.price.toFixed(2)}\n`;
  if (stock.changePct != null) text += `- 今日涨跌幅: ${stock.changePct > 0 ? '+' : ''}${stock.changePct.toFixed(2)}%\n`;
  if (f.marketCap) text += `- 总市值: ${(f.marketCap / 100000000).toFixed(2)}亿元\n`;
  if (f.pe != null) text += `- PE(TTM): ${f.pe.toFixed(1)}\n`;
  if (f.pb != null) text += `- PB: ${f.pb.toFixed(2)}\n`;
  text += `\n`;

  // 财务主要指标
  text += `## 财务主要指标（最新报告期）\n`;
  if (f.reportDate) text += `- 报告期: ${f.reportDate}\n`;
  if (f.eps != null) text += `- 基本每股收益(EPS): ${f.eps.toFixed(2)}元\n`;
  if (f.bvps != null) text += `- 每股净资产(BPS): ${f.bvps.toFixed(2)}元\n`;
  if (f.grossMargin != null) text += `- 销售毛利率: ${f.grossMargin.toFixed(1)}%\n`;
  if (f.netMargin != null) text += `- 销售净利率: ${f.netMargin.toFixed(1)}%\n`;
  if (f.roe != null) text += `- ROE: ${f.roe.toFixed(1)}%\n`;
  if (f.roic != null) text += `- ROIC: ${f.roic.toFixed(1)}%\n`;
  if (f.revenueGrowth != null) text += `- 营收同比增长率: ${f.revenueGrowth.toFixed(1)}%\n`;
  if (f.profitGrowth != null) text += `- 净利润同比增长率: ${f.profitGrowth.toFixed(1)}%\n`;
  if (f.debtAssetRatio != null) text += `- 资产负债率: ${f.debtAssetRatio.toFixed(1)}%\n`;
  if (f.currentRatio != null) text += `- 流动比率: ${f.currentRatio.toFixed(2)}\n`;
  text += `\n`;
  
  // ===== 行业特色指标分析 =====
  const industryConfig = matchIndustryConfig(f.industry);
  if (industryConfig) {
    text += `## 行业特色指标分析（${industryConfig.name}）\n`;
    
    // 先输出实际数据（如果有）
    if (f._industryMetrics && Object.keys(f._industryMetrics).length > 0) {
      text += `### 行业关键指标实际数据\n`;
      Object.entries(f._industryMetrics).forEach(([key, value]) => {
        const metric = industryConfig.metrics.find(m => m.key === key);
        if (metric) {
          text += `- **${metric.name}**: ${value}\n`;
          text += `  - 说明：${metric.desc}\n`;
          text += `  - 参考标准：${metric.threshold}\n`;
        }
      });
      text += `\n`;
    }
    
    // 输出分析提示
    text += `${industryConfig.prompt}\n\n`;
  }

  // 利润表
  text += `## 利润表\n`;
  if (f.revenue) text += `- 营业总收入: ${(f.revenue / 100000000).toFixed(2)}亿元\n`;
  if (f.operateCost) text += `- 营业总成本: ${(f.operateCost / 100000000).toFixed(2)}亿元\n`;
  if (f.operateProfit) text += `- 营业利润: ${(f.operateProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.netProfit) text += `- 归母净利润: ${(f.netProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.deductNetProfit) text += `- 扣非归母净利润: ${(f.deductNetProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.saleExpense) text += `- 销售费用: ${(f.saleExpense / 100000000).toFixed(2)}亿元\n`;
  if (f.manageExpense) text += `- 管理费用: ${(f.manageExpense / 100000000).toFixed(2)}亿元\n`;
  if (f.financeExpense) text += `- 财务费用: ${(f.financeExpense / 100000000).toFixed(2)}亿元\n`;
  text += `\n`;

  // 资产负债表
  text += `## 资产负债表\n`;
  if (f.totalAssets) text += `- 总资产: ${(f.totalAssets / 100000000).toFixed(2)}亿元\n`;
  if (f.totalLiab) text += `- 总负债: ${(f.totalLiab / 100000000).toFixed(2)}亿元\n`;
  if (f.totalEquity) text += `- 所有者权益: ${(f.totalEquity / 100000000).toFixed(2)}亿元\n`;
  if (f.cash) text += `- 货币资金: ${(f.cash / 100000000).toFixed(2)}亿元\n`;
  if (f.inventory) text += `- 存货: ${(f.inventory / 100000000).toFixed(2)}亿元\n`;
  if (f.accountsReceivable) text += `- 应收账款: ${(f.accountsReceivable / 100000000).toFixed(2)}亿元\n`;
  text += `\n`;

  // 现金流量表
  text += `## 现金流量表\n`;
  if (f.opCashflow) text += `- 经营活动现金流净额: ${(f.opCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.capEx) text += `- 资本支出: ${(f.capEx / 100000000).toFixed(2)}亿元\n`;
  if (f.freeCashflow != null) text += `- 自由现金流: ${(f.freeCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.investCashflow) text += `- 投资活动现金流净额: ${(f.investCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.financeCashflow) text += `- 筹资活动现金流净额: ${(f.financeCashflow / 100000000).toFixed(2)}亿元\n`;

  // ===== 三大现金流关系分析小结 =====
  if (f.opCashflow && f.investCashflow && f.financeCashflow) {
    const opCF = f.opCashflow;
    const invCF = f.investCashflow;
    const finCF = f.financeCashflow;
    const fmtYi2 = (v) => {
      if (v == null || isNaN(v)) return '--';
      return (v / 100000000).toFixed(2) + '亿';
    };
    text += `\n### 三大现金流关系分析小结\n`;
    text += `| 现金流类型 | 金额(亿元) | 方向 |\n`;
    text += `|-----------|-----------|------|\n`;
    text += `| 经营活动现金流净额 | ${fmtYi2(opCF)} | ${opCF > 0 ? '📈 流入' : opCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
    text += `| 投资活动现金流净额 | ${fmtYi2(invCF)} | ${invCF > 0 ? '📈 流入' : invCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
    text += `| 筹资活动现金流净额 | ${fmtYi2(finCF)} | ${finCF > 0 ? '📈 流入' : finCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;

    const opPos = opCF > 0 ? '+' : '-';
    const invPos = invCF > 0 ? '+' : '-';
    const finPos = finCF > 0 ? '+' : '-';
    const pattern = `${opPos}${invPos}${finPos}`;

    text += `\n**现金流类型判断**：${pattern}\n`;
    const interpretations = {
      '++-': '【成熟奶牛型】经营造血、投资回收、偿还融资，财务最健康，常见于成熟期白马股',
      '+--': '【扩张成长型】经营造血、投资扩张、偿还融资，积极扩张中，需关注投资回报率',
      '+-+': '【融资扩张型】经营造血但不足以覆盖投资，需外部融资补充，扩张激进，需警惕偿债压力',
      '+++' : '【转型/收缩型】经营流入+投资回收+融资流入，可能正在收缩战线或准备大额投资，需结合具体项目判断',
      '+-0': '【稳健经营型】经营造血、适度投资、融资平衡，财务稳健',
      '-++': '【创业/困境型】经营失血、靠投资回收和融资维持，需高度警惕经营恶化风险',
      '-+-': '【快速扩张烧钱型】经营失血、投资扩张、偿还融资，典型高成长高消耗，需关注资金链',
      '--+': '【输血续命型】经营失血+投资失血，完全靠融资维持，财务风险极高',
      '-+0': '【收缩调整型】经营失血、投资回收、融资平衡，正在收缩但经营尚未恢复',
      '--0': '【双杀衰退型】经营和投资都失血、融资平衡，需紧急改善经营或寻求融资',
      '---': '【全面失血型】三大现金流均为流出，财务危机信号，需紧急干预',
    };
    let interpretation = interpretations[pattern];
    if (!interpretation) {
      const fuzzyPattern = pattern.replace(/0/g, opCF >= 0 ? '+' : '-');
      interpretation = interpretations[fuzzyPattern] || '需结合行业特点和公司阶段综合判断';
    }
    text += `\n**分析结论**：${interpretation}\n`;

    if (f.netProfit && f.netProfit !== 0) {
      const opCFRatio = (opCF / f.netProfit).toFixed(2);
      text += `\n**盈利质量**：经营CF/归母净利润 = ${opCFRatio}（${parseFloat(opCFRatio) >= 1.0 ? '✅ 利润有现金支撑' : parseFloat(opCFRatio) >= 0.7 ? '⚠️ 利润含金量一般' : '❌ 利润含金量不足，需关注应收及库存'}）\n`;
    }

    const fcf = opCF + invCF;
    text += `**自由现金流(近似)**：经营CF + 投资CF = ${fmtYi2(fcf)}亿元（${fcf > 0 ? '✅ 正向自由现金流' : '❌ 自由现金流为负，投资消耗超过经营造血'}）\n`;
  }
  text += `\n`;

  // 估值相关
  text += `## 估值参数\n`;
  if (f.currentPrice) text += `- 当前股价: ¥${f.currentPrice.toFixed(2)}\n`;
  if (f.eps) text += `- EPS: ${f.eps.toFixed(2)}元\n`;
  if (f.bvps) text += `- 每股净资产: ${f.bvps.toFixed(2)}元\n`;
  if (f.pe) text += `- PE(TTM): ${f.pe.toFixed(1)}\n`;
  if (f.pb) text += `- PB: ${f.pb.toFixed(2)}\n`;
  if (f.dps) text += `- 每股股利(估): ${f.dps.toFixed(2)}元\n`;
  text += `\n`;

  // 多年趋势
  if (f._multiYear && f._multiYear.length > 1) {
    text += `## 近期财务指标趋势\n`;
    text += `| 报告期 | EPS | 毛利率 | 净利率 | ROE | 营收增速 | 净利增速 | 负债率 |\n`;
    text += `|--------|-----|--------|--------|-----|----------|----------|--------|\n`;
    f._multiYear.slice(0, 8).forEach(r => {
      text += `| ${r.REPORT_DATE_NAME || r.REPORT_DATE?.substring(0,10) || '--'} `;
      text += `| ${r.EPSJB ?? '--'} `;
      text += `| ${r.XSMLL ?? '--'}% `;
      text += `| ${r.XSJLL ?? '--'}% `;
      text += `| ${r.ROEJQ ?? '--'}% `;
      text += `| ${r.TOTALOPERATEREVETZ ?? '--'}% `;
      text += `| ${r.PARENTNETPROFITTZ ?? '--'}% `;
      text += `| ${r.ZCFZL ?? '--'}% |\n`;
    });
    text += `\n`;
  }

  // 机构持股变化分析
  if (f._holderData || (f._topHolders && f._topHolders.length > 0)) {
    text += `## 大股东/机构持股变化分析\n`;
    
    // 股东总数变化
    if (f._holderData) {
      const holder = f._holderData;
      const holderPrev = f._holderDataPrev;
      
      if (holder.HOLDER_TOTAL_NUM != null) {
        text += `### 股东户数变化\n`;
        text += `- 最新股东户数(${holder.END_DATE?.substring(0,10) || '最新'}): ${holder.HOLDER_TOTAL_NUM.toLocaleString()}户\n`;
        if (holderPrev && holderPrev.HOLDER_TOTAL_NUM != null) {
          const change = holder.HOLDER_TOTAL_NUM - holderPrev.HOLDER_TOTAL_NUM;
          const changePct = ((change / holderPrev.HOLDER_TOTAL_NUM) * 100).toFixed(2);
          const prevDate = holderPrev.END_DATE?.substring(0,10) || '上期';
          text += `- 上期股东户数(${prevDate}): ${holderPrev.HOLDER_TOTAL_NUM.toLocaleString()}户\n`;
          text += `- 变动: ${change > 0 ? '增加' : '减少'}${Math.abs(change).toLocaleString()}户 (${change > 0 ? '+' : ''}${changePct}%)\n`;
          text += `- 解读: ${change < 0 ? '股东户数减少，筹码集中度提高，有利于股价上涨' : change > 0 ? '股东户数增加，筹码分散，需警惕' : '股东户数基本持平'}\n`;
        }
        text += `\n`;
      }
      
      // 户均持股
      if (holder.AVG_FREE_SHARES != null) {
        text += `### 户均持股情况\n`;
        text += `- 户均流通股东: ${holder.AVG_FREE_SHARES?.toLocaleString() || '--'}股\n`;
        if (holder.AVG_HOLD_NUM != null) {
          text += `- 户均持股: ${holder.AVG_HOLD_NUM?.toLocaleString() || '--'}股\n`;
        }
        if (holderPrev && holderPrev.AVG_FREE_SHARES != null) {
          const avgChange = holder.AVG_FREE_SHARES - holderPrev.AVG_FREE_SHARES;
          text += `- 上期户均流通股东: ${holderPrev.AVG_FREE_SHARES?.toLocaleString() || '--'}股\n`;
          text += `- 变动: ${avgChange > 0 ? '增加' : '减少'}${Math.abs(avgChange).toLocaleString()}股\n`;
          text += `- 解读: ${avgChange > 0 ? '户均持股增加，筹码集中' : avgChange < 0 ? '户均持股减少，筹码分散' : '户均持股基本持平'}\n`;
        }
        text += `\n`;
      }
    }
    
    // 十大流通股东
    if (f._topHolders && f._topHolders.length > 0) {
      text += `### 十大流通股东列表\n`;
      text += `| 排名 | 股东名称 | 持股数(万股) | 占流通股比(%) | 本期变动(万股) | 变动日期 | 股东类型 |\n`;
      text += `|-----|---------|-------------|---------------|---------------|----------|----------|\n`;
      
      f._topHolders.slice(0, 10).forEach((holder, idx) => {
        const rank = idx + 1;
        const holderName = holder.HOLDER_NAME || '--';
        const holdShares = holder.FREE_SHARE_HOLD != null ? (holder.FREE_SHARE_HOLD / 10000).toFixed(2) : '--';
        const holdRatio = holder.FREE_HOLD_RATIO != null ? holder.FREE_HOLD_RATIO.toFixed(2) : '--';
        const holderType = holder.HOLDER_TYPE || '--';
        
        // 变动情况
        let changeInfo = '--';
        let changeNum = '--';
        if (holder.HOLD_NUM_CHANGE != null) {
          const change = holder.HOLD_NUM_CHANGE / 10000;
          changeNum = change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
          if (change > 0) changeInfo = `增持${change.toFixed(2)}万`;
          else if (change < 0) changeInfo = `减持${Math.abs(change).toFixed(2)}万`;
          else changeInfo = '未变';
        }
        
        // 变动日期
        const changeDate = holder.END_DATE ? holder.END_DATE.substring(0, 10) : (holder.TRADE_DATE ? holder.TRADE_DATE.substring(0, 10) : '--');
        
        text += `| ${rank} | ${holderName} | ${holdShares} | ${holdRatio}% | ${changeNum} | ${changeDate} | ${holderType} |\n`;
      });
      
      text += `\n`;
      text += `**数据说明**：变动日期为报告期截止日期，变动数据相对上期对比\n\n`;
      
      // 机构持股总结
      const institutionalHolders = f._topHolders.filter(h => 
        h.HOLDER_TYPE && (h.HOLDER_TYPE.includes('机构') || h.HOLDER_TYPE.includes('基金') || h.HOLDER_TYPE.includes('保险') || h.HOLDER_TYPE.includes('券商') || h.HOLDER_TYPE.includes('社保') || h.HOLDER_TYPE.includes('信托'))
      );
      
      if (institutionalHolders.length > 0) {
        text += `### 机构持股特征分析\n`;
        text += `- **十大流通股东中机构数量**: ${institutionalHolders.length}家\n`;
        
        // 计算机构总持股数和占比
        const totalInstitutionalShares = institutionalHolders.reduce((sum, h) => {
          return sum + (h.FREE_SHARE_HOLD || 0);
        }, 0);
        
        const totalInstitutionalRatio = institutionalHolders.reduce((sum, h) => {
          return sum + (h.FREE_HOLD_RATIO || 0);
        }, 0);
        
        if (totalInstitutionalShares > 0) {
          text += `- **机构总持股**: ${(totalInstitutionalShares / 10000).toFixed(2)}万股\n`;
          text += `- **机构持股占流通股比**: ${totalInstitutionalRatio.toFixed(2)}%\n`;
        }
        
        // 统计增减持情况
        let increaseCount = 0;
        let decreaseCount = 0;
        let unchangedCount = 0;
        let newEntryCount = 0; // 新进机构
        
        f._topHolders.forEach(h => {
          if (h.HOLD_NUM_CHANGE != null) {
            if (h.HOLD_NUM_CHANGE > 0) increaseCount++;
            else if (h.HOLD_NUM_CHANGE < 0) decreaseCount++;
            else unchangedCount++;
          }
          // 如果HOLD_NUM_CHANGE为null但持股比例>0，可能是新进
          if (h.HOLD_NUM_CHANGE == null && h.FREE_SHARE_HOLD > 0) {
            newEntryCount++;
          }
        });
        
        text += `- **增减持统计**: 增持${increaseCount}家 | 减持${decreaseCount}家 | 未变${unchangedCount}家 | 新进${newEntryCount}家\n`;
        text += `- **机构态度解读**: ${increaseCount > decreaseCount ? '机构整体呈增持态势，看好公司前景' : increaseCount < decreaseCount ? '机构整体呈减持态势，需谨慎对待' : '机构增减持平，观望情绪较浓'}\n`;
        text += `\n`;
      }
    }
  }


  // 管理层概况与稳定性分析
  if (f._mgmtData && f._mgmtData.length > 0) {
    text += `## 管理层概况与稳定性分析\n\n`;

    // 核心管理层列表
    text += `### 核心管理层列表\n`;
    text += `| 姓名 | 职务 | 年龄 | 学历 | 任职起始 | 持股数 | 任期(年) |\n`;
    text += `|------|------|------|------|----------|--------|---------|\n`;;

    const coreKeywords = ['董事长', '总经理', 'CEO', '总裁', '副董事长', '副总经理'];
    const isCore = (pos) => coreKeywords.some(k => pos && pos.includes(k));
    // 解析INCUMBENT_TIME获取起始日期："2025-11-28至今" → "2025-11-28"
    const getStartDate = (it) => it ? it.split('至')[0].trim() : null;

    f._mgmtData.forEach(p => {
      const name = p.PERSON_NAME || '--';
      const position = p.POSITION || '--';
      const age = p.AGE != null ? p.AGE : '--';
      const edu = p.HIGH_DEGREE || '--';
      const startDate = getStartDate(p.INCUMBENT_TIME) || '--';
      const holdNum = p.HOLD_NUM != null ? (p.HOLD_NUM >= 10000 ? (p.HOLD_NUM / 10000).toFixed(2) + '万' : p.HOLD_NUM.toLocaleString()) : '--';

      // 计算任期
      let tenure = '--';
      const startStr = getStartDate(p.INCUMBENT_TIME);
      if (startStr) {
        const start = new Date(startStr);
        const now = new Date();
        const years = ((now - start) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
        tenure = years + '年';
      }

      text += `| ${name} | ${position} | ${age} | ${edu} | ${startDate} | ${holdNum} | ${tenure} |\n`;
    });
    text += `\n`;

    // 管理层稳定性指标计算
    text += `### 管理层稳定性指标\n`;

    // 1. 核心管理者平均任期
    const coreManagers = f._mgmtData.filter(p => isCore(p.POSITION));
    if (coreManagers.length > 0) {
      const tenures = coreManagers.map(p => {
        const startStr = getStartDate(p.INCUMBENT_TIME);
        if (!startStr) return null;
        return (Date.now() - new Date(startStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      }).filter(t => t != null);

      if (tenures.length > 0) {
        const avgTenure = (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1);
        text += `- **核心管理层平均任期**: ${avgTenure}年\n`;
      }
    }

    // 2. 近3年变动人数
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const recentAppointments = f._mgmtData.filter(p => {
      const startStr = getStartDate(p.INCUMBENT_TIME);
      if (!startStr) return false;
      return new Date(startStr) >= threeYearsAgo;
    });
    text += `- **近3年新任命人数**: ${recentAppointments.length}人\n`;

    // 3. 年龄分布
    const ages = f._mgmtData.map(p => p.AGE).filter(a => a != null);
    if (ages.length > 0) {
      const minAge = Math.min(...ages);
      const maxAge = Math.max(...ages);
      const avgAge = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(0);
      text += `- **年龄分布**: ${minAge}-${maxAge}岁，平均${avgAge}岁\n`;
    }

    // 4. 实控人在管理层（新API无此字段，跳过）
    // 此字段在新API中不可用，从RESUME中可能推断

    // 5. 管理层持股
    const totalHold = f._mgmtData.reduce((sum, p) => sum + (p.HOLD_NUM || 0), 0);
    if (totalHold > 0) {
      text += `- **管理层合计持股**: ${totalHold >= 10000 ? (totalHold / 10000).toFixed(2) + '万股' : totalHold.toLocaleString() + '股'}\n`;
    }

    // 6. 学历构成
    const eduMap = {};
    f._mgmtData.forEach(p => {
      const e = p.HIGH_DEGREE || '未知';
      eduMap[e] = (eduMap[e] || 0) + 1;
    });
    const highEdu = (eduMap['博士'] || 0) + (eduMap['硕士'] || 0);
    const totalEdu = Object.values(eduMap).reduce((a, b) => a + b, 0);
    text += `- **学历构成**: ${Object.entries(eduMap).map(([k, v]) => k + v + '人').join('、')}\n`;
    if (totalEdu > 0) {
      text += `- **硕博占比**: ${(highEdu / totalEdu * 100).toFixed(0)}%\n`;
    }

    // 7. 附上核心管理者简历摘要
    if (coreManagers.length > 0) {
      text += `\n### 核心管理者简历摘要\n`;
      text += `（请特别关注每位管理者的毕业院校，包括本科、硕士、博士阶段）\n`;
      coreManagers.forEach(p => {
        const name = p.PERSON_NAME || '--';
        const position = p.POSITION || '--';
        const resume = p.RESUME || '暂无公开简历';
        text += `- **${name}**（${position}，${p.HIGH_DEGREE || '学历未知'}）：${resume}\n`;
      });
    }

    text += `\n`;

    // 稳定性风险评估提示
    text += `### 管理层稳定性风险提示\n`;
    text += `请基于以上数据，从以下维度评估管理层稳定性风险：\n`;
    text += `1. **变动频率与业务连续性**：核心管理层变动是否频繁，是否影响业务连续性\n`;
    text += `2. **关键人风险**：是否过度依赖某位核心管理者（如创始人兼董事长兼总经理）\n`;
    text += `3. **利益一致性**：管理层持股情况，利益是否与中小股东一致\n`;
    text += `4. **背景与战略匹配度**：管理层学历、毕业院校和经验是否与公司发展战略匹配\n`;
    text += `5. **综合风险等级**：请给出高/中/低的风险评估，并说明理由\n`;
    text += `\n`;
  }


  // 融资融券分析
  if (f._marginData && f._marginData.length > 0) {
    text += `## 融资融券分析\n`;
    const latest = f._marginData[f._marginData.length - 1];
    const prev = f._marginData.length > 1 ? f._marginData[f._marginData.length - 2] : null;
    text += `### 融资融券余额走势\n`;
    text += `- **最新融资余额**(${latest.date}): ${(latest.financeBalance / 10000).toFixed(2)}亿元\n`;
    if (prev) {
      const change = latest.financeBalance - prev.financeBalance;
      const changePct = prev.financeBalance > 0 ? (change / prev.financeBalance * 100).toFixed(2) : 0;
      text += `- **上期融资余额**(${prev.date}): ${(prev.financeBalance / 10000).toFixed(2)}亿元\n`;
      text += `- **变动**: ${change > 0 ? '增加' : '减少'}${(Math.abs(change) / 10000).toFixed(2)}亿元 (${change > 0 ? '+' : ''}${changePct}%)\n`;
    }
    if (latest.securitiesBalance > 0) {
      text += `- **最新融券余额**: ${(latest.securitiesBalance / 10000).toFixed(2)}亿元\n`;
    }
    text += `\n`;
    const last5 = f._marginData.slice(-5);
    if (last5.length >= 2) {
      const trend5d = last5[last5.length - 1].financeBalance - last5[0].financeBalance;
      text += `### 近期趋势分析\n`;
      text += `- **近5日融资变动**: ${trend5d > 0 ? '增加' : '减少'}${(Math.abs(trend5d) / 10000).toFixed(2)}亿元\n`;
      text += `- **趋势判断**: ${trend5d > 0 ? '融资余额上升，杠杆资金看多' : trend5d < 0 ? '融资余额下降，杠杆资金看空' : '融资余额持平'}\n`;
      text += `\n`;
    }
  }

  // 主力资金流向分析
  if (f._northData && f._northData.length > 0) {
    text += `## 主力资金流向分析\n`;
    const latest = f._northData[f._northData.length - 1];
    const todayMainYi = (latest.mainNet / 100000000).toFixed(2);
    text += `### 最新资金流向\n`;
    text += `- **今日主力净流入**(${latest.date}): ${todayMainYi}亿元 (${latest.mainNet > 0 ? '🔴 净流入' : latest.mainNet < 0 ? '🟢 净流出' : '持平'})\n`;
    text += `\n`;
    const last5 = f._northData.slice(-5);
    if (last5.length >= 2) {
      const mainNet5d = last5.reduce((sum, d) => sum + d.mainNet, 0);
      text += `### 近期资金流向\n`;
      text += `- **近5日主力净流入**: ${(mainNet5d / 100000000).toFixed(2)}亿元 (${mainNet5d > 0 ? '🔴 净流入' : mainNet5d < 0 ? '🟢 净流出' : '持平'})\n`;
      text += `\n`;
    }
    const mainNet30d = f._northData.slice(-30).reduce((sum, d) => sum + d.mainNet, 0);
    text += `### 主力态度总结\n`;
    text += `- **近30日主力净流向**: ${(mainNet30d / 100000000).toFixed(2)}亿元\n`;
    text += `- **主力立场**: ${mainNet30d > 0 ? '🔴 主力整体看好' : mainNet30d < 0 ? '🟢 主力整体看空' : '主力态度中性'}\n`;
    text += `\n`;
  }

  // 综合多空信号分析
  if ((f._marginData && f._marginData.length > 0) || (f._northData && f._northData.length > 0)) {
    text += `## 多空信号综合分析\n`;
    text += `| 指标 | 近期趋势 | 信号 | 强度 |\n`;
    text += `|------|---------|------|------|\n`;
    let bullish = 0, bearish = 0;
    if (f._marginData && f._marginData.length > 0) {
      const trend5d = f._marginData.slice(-5);
      if (trend5d.length >= 2) {
        const change = trend5d[trend5d.length - 1].financeBalance - trend5d[0].financeBalance;
        const signal = change > 0 ? '看多' : change < 0 ? '看空' : '中性';
        text += `| 融资余额 | ${change > 0 ? '上升' : '下降'} | ${signal} | ${Math.abs(change)/trend5d[0].financeBalance > 0.01 ? '⭐⭐' : '⭐'} |\n`;
        if (change > 0) bullish++; else if (change < 0) bearish++;
      }
    }
    if (f._northData && f._northData.length > 0) {
      const mainNet5d = f._northData.slice(-5).reduce((sum, d) => sum + d.mainNet, 0);
      const signal = mainNet5d > 0 ? '看多' : mainNet5d < 0 ? '看空' : '中性';
      const mainNetAbsYi = Math.abs(mainNet5d / 100000000).toFixed(2);
      text += `| 主力资金 | ${mainNet5d > 0 ? '净流入' : '净流出'} ${mainNetAbsYi}亿 | ${signal} | ${Math.abs(mainNet5d) > 500000000 ? '⭐⭐' : '⭐'} |\n`;
      if (mainNet5d > 0) bullish++; else if (mainNet5d < 0) bearish++;
    }
    text += `\n### 综合多空判断\n`;
    if (bullish > bearish) {
      text += `- **多方信号**: ${bullish}个 | **空方信号**: ${bearish}个\n`;
      text += `- **综合结论**: 🔴 **市场整体看多**，建议关注回调买入机会\n`;
    } else if (bearish > bullish) {
      text += `- **多方信号**: ${bullish}个 | **空方信号**: ${bearish}个\n`;  
      text += `- **综合结论**: 🟢 **市场整体看空**，建议谨慎观望\n`;
    } else {
      text += `- **多方信号**: ${bullish}个 | **空方信号**: ${bearish}个\n`;
      text += `- **综合结论**: ⚪ **市场分歧较大**，建议等待明确信号\n`;
    }
    text += `\n`;
  }
  return text;
}

/**
 * 加载K线图
 * 调用东方财富K线数据API，Canvas绘制
 * @param {string} mode - 'main' 主信息卡, 'collapsed' 折叠信息卡
 */
async function loadKlineChart(mode) {
  const stock = state.saStock;
  if (!stock) return;

  let container, periodSelect;
  if (mode === 'main') {
    container = $('#sa-kline-container');
    periodSelect = $('#sa-kline-period');
  } else {
    container = $('#sa-collapse-kline-container');
    periodSelect = $('#sa-collapse-kline-period');
  }
  if (!container || !periodSelect) return;

  const period = periodSelect.value;
  const code = stock.code;
  const marketCode = code.startsWith('6') || code.startsWith('9') ? '1' : '0';
  const secid = `${marketCode}.${code}`;

  // K线类型映射 (东方财富API参数)
  const kltMap = { daily: '101', weekly: '102', monthly: '103' };
  const klt = kltMap[period] || '101';

  container.innerHTML = '<div class="sa-kline-placeholder">⏳ 加载K线数据中...</div>';

  try {
    console.log(`[K线图] 请求K线数据 - secid: ${secid}, klt: ${klt}`);

    // 使用专用的K线数据接口
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_KLINE_DATA', secid, klt, fqt: 1, lmt: 120 },
        (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!resp || resp.error) {
            reject(new Error(resp?.error || '请求失败'));
            return;
          }
          resolve(resp);
        }
      );
    });

    const klineData = result.data;
    console.log('[K线图] 收到数据，类型:', typeof klineData);
    console.log('[K线图] 完整数据结构:', JSON.stringify(klineData, null, 2).substring(0, 1000));
    console.log('[K线图] result对象:', JSON.stringify(result, null, 2).substring(0, 500));

    // 检查数据结构
    if (!klineData) {
      console.error('[K线图] klineData为null或undefined');
      console.error('[K线图] result完整内容:', result);
      container.innerHTML = '<div class="sa-kline-placeholder">K线数据为空</div>';
      return;
    }
    
    if (!klineData.data) {
      console.error('[K线图] klineData.data不存在');
      console.error('[K线图] klineData的keys:', Object.keys(klineData));
      console.error('[K线图] klineData完整内容:', JSON.stringify(klineData, null, 2));
      container.innerHTML = '<div class="sa-kline-placeholder">K线数据格式异常</div>';
      return;
    }

    const klines = klineData.data.klines;
    if (!klines || klines.length === 0) {
      console.warn('[K线图] 无K线数据，完整响应:', JSON.stringify(klineData).substring(0, 500));
      container.innerHTML = '<div class="sa-kline-placeholder">暂无K线数据</div>';
      return;
    }

    console.log(`[K线图] 解析${klines.length}条K线数据，第一条:`, klines[0]);

    // 解析K线数据
    const parsedKlines = klines.map(line => {
      const parts = line.split(',');
      return {
        date: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseFloat(parts[5]),
        change: parseFloat(parts[6] || 0),
        changePct: parseFloat(parts[7] || 0),
        turnover: parseFloat(parts[8] || 0)
      };
    });

    console.log('[K线图] 解析完成，准备渲染');
    renderKlineCanvas(container, parsedKlines, stock.name);
  } catch (e) {
    console.error('[K线图] 加载失败:', e);
    container.innerHTML = `<div class="sa-kline-placeholder">K线数据加载失败<br><small>${e.message}</small></div>`;
  }
}

/**
 * Canvas绘制K线图
 * @param {HTMLElement} container - 容器元素
 * @param {Array} klines - K线数据数组
 * @param {string} stockName - 股票名称
 */
function renderKlineCanvas(container, klines, stockName) {
  const width = container.clientWidth || 400;
  const height = 300;
  const volumeHeight = 60;
  const chartHeight = height - volumeHeight - 50;

  // 创建canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 高清
  canvas.height = height * 2;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2); // 高清

  // 边距
  const padding = { top: 30, right: 50, bottom: 10, left: 10 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = chartHeight - padding.top - padding.bottom;

  // 计算价格范围
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = maxPrice - minPrice || 1;

  // 计算成交量范围
  const maxVolume = Math.max(...klines.map(k => k.volume)) || 1;

  // 绘制参数
  const barWidth = Math.max(1, (drawWidth / klines.length) * 0.7);
  const barGap = drawWidth / klines.length;

  // 背景
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, width, height);

  // 标题
  ctx.fillStyle = '#202124';
  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.fillText(`${stockName} K线图`, padding.left, 18);

  // 最新价
  const lastK = klines[klines.length - 1];
  const lastPrice = lastK.close;
  const lastChange = lastK.changePct;
  ctx.fillStyle = lastChange >= 0 ? '#e53935' : '#34a853';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.fillText(`${lastPrice.toFixed(2)}  ${lastChange >= 0 ? '+' : ''}${lastChange.toFixed(2)}%`, padding.left + 100, 18);

  // 价格刻度线
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#9aa0a6';
  const priceSteps = 4;
  for (let i = 0; i <= priceSteps; i++) {
    const y = padding.top + (drawHeight / priceSteps) * i;
    const price = maxPrice - (priceRange / priceSteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(price.toFixed(2), width - padding.right + 4, y + 3);
  }

  // 绘制K线
  const toY = (price) => padding.top + (1 - (price - minPrice) / priceRange) * drawHeight;

  klines.forEach((k, i) => {
    const x = padding.left + barGap * i + barGap / 2;
    const isUp = k.close >= k.open;
    const color = isUp ? '#e53935' : '#34a853';

    // 影线（上下影线）
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, toY(k.high));
    ctx.lineTo(x, toY(k.low));
    ctx.stroke();

    // 实体
    const bodyTop = toY(Math.max(k.open, k.close));
    const bodyBottom = toY(Math.min(k.open, k.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    if (isUp) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
      ctx.strokeRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    }

    // 成交量
    const volTop = chartHeight + (1 - k.volume / maxVolume) * volumeHeight;
    const volHeight = (k.volume / maxVolume) * volumeHeight;
    ctx.fillStyle = isUp ? 'rgba(229,57,53,0.3)' : 'rgba(52,168,83,0.3)';
    ctx.fillRect(x - barWidth / 2, volTop, barWidth, volHeight);
  });

  // 5日均线
  if (klines.length >= 5) {
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;
    klines.forEach((k, i) => {
      if (i < 4) return;
      const ma5 = klines.slice(i - 4, i + 1).reduce((s, k) => s + k.close, 0) / 5;
      const x = padding.left + barGap * i + barGap / 2;
      const y = toY(ma5);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // 20日均线
  if (klines.length >= 20) {
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;
    klines.forEach((k, i) => {
      if (i < 19) return;
      const ma20 = klines.slice(i - 19, i + 1).reduce((s, k) => s + k.close, 0) / 20;
      const x = padding.left + barGap * i + barGap / 2;
      const y = toY(ma20);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // 日期标签（显示首尾和中间）
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const labelIndices = [0, Math.floor(klines.length / 2), klines.length - 1];
  labelIndices.forEach(i => {
    const x = padding.left + barGap * i + barGap / 2;
    ctx.fillText(klines[i].date.substring(2), x, height - 2);
  });

  // 均线图例
  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#f9a825';
  ctx.fillText('MA5', padding.left + 200, 18);
  ctx.fillStyle = '#1a73e8';
  ctx.fillText('MA20', padding.left + 240, 18);
}

/**
 * 渲染管理层表格
 * @param {string} mode - 'main' 主卡 | 'collapsed' 折叠卡
 */
function renderMgmtTable(mode) {
  const wrapId = mode === 'main' ? 'sa-mgmt-table-wrap' : 'sa-collapse-mgmt-table-wrap';
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  const mgmtData = state.saFundamentals?._mgmtData;
  if (!mgmtData || mgmtData.length === 0) {
    wrap.innerHTML = '<div class="sa-mgmt-placeholder">暂无管理层数据</div>';
    return;
  }

  // 筛选核心管理者（董事长、总经理、CEO、总裁、副总经理等）
  const coreKeywords = ['董事长', '总经理', 'CEO', '总裁', '副董事长', '副总经理'];
  const isCore = (pos) => coreKeywords.some(k => pos && pos.includes(k));

  let html = '<table class="sa-mgmt-table">';
  html += '<thead><tr><th>姓名</th><th>职务</th><th>年龄</th><th>学历</th><th>任职日期</th><th>持股</th></tr></thead>';
  html += '<tbody>';

  mgmtData.forEach(p => {
    const name = p.PERSON_NAME || '--';
    const position = p.POSITION || '--';
    const age = p.AGE != null ? p.AGE : '--';
    const edu = p.HIGH_DEGREE || '--';
    // INCUMBENT_TIME格式："2025-11-28至今"，取起始日期
    const startDate = p.INCUMBENT_TIME ? p.INCUMBENT_TIME.split('至')[0] : '--';
    const holdNum = p.HOLD_NUM != null ? (p.HOLD_NUM >= 10000 ? (p.HOLD_NUM / 10000).toFixed(2) + '万' : p.HOLD_NUM.toLocaleString()) : '--';
    const coreClass = isCore(position) ? ' sa-mgmt-core' : '';
    html += `<tr class="${coreClass}">`;
    html += `<td class="sa-mgmt-name">${name}</td>`;
    html += `<td class="sa-mgmt-position">${position}</td>`;
    html += `<td>${age}</td>`;
    html += `<td>${edu}</td>`;
    html += `<td>${startDate}</td>`;
    html += `<td>${holdNum}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';

  // AI补充背景按钮
  html += '<div class="sa-mgmt-enrich-area">';
  html += '<button class="btn btn-secondary sa-mgmt-enrich-btn" data-mode="' + mode + '">✨ AI补充核心管理者背景</button>';
  html += '<div class="sa-mgmt-enrich-result"></div>';
  html += '</div>';

  wrap.innerHTML = html;

  // 绑定AI补充按钮事件
  const btn = wrap.querySelector('.sa-mgmt-enrich-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const coreManagers = mgmtData.filter(p => isCore(p.POSITION)).slice(0, 5);
      if (coreManagers.length === 0) {
        btn.textContent = '未识别到核心管理者';
        btn.disabled = true;
        return;
      }
      enrichMgmtBackground(coreManagers, mode);
    });
  }
}

/**
 * AI补充核心管理者背景信息
 * @param {Array} mgmtList - 核心管理者列表
 * @param {string} mode - 'main' | 'collapsed'
 */
async function enrichMgmtBackground(mgmtList, mode) {
  const wrapId = mode === 'main' ? 'sa-mgmt-table-wrap' : 'sa-collapse-mgmt-table-wrap';
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  const btn = wrap.querySelector('.sa-mgmt-enrich-btn');
  const resultArea = wrap.querySelector('.sa-mgmt-enrich-result');
  if (!btn || !resultArea) return;

  if (!getActiveLLMService()?.apiKey) {
    showSettings();
    showToast('请先配置 LLM API Key');
    return;
  }

  btn.disabled = true;
  btn.textContent = '正在补充背景...';

  const stockName = state.saStock?.name || '';
  const managerInfo = mgmtList.map(p => {
    const startDate = p.INCUMBENT_TIME ? p.INCUMBENT_TIME.split('至')[0] : '未知';
    const resume = p.RESUME ? `，简历：${p.RESUME}` : '';
    return `- ${p.PERSON_NAME}（${p.POSITION}，年龄${p.AGE || '未知'}，学历${p.HIGH_DEGREE || '未知'}，任职起始${startDate}${resume}）`;
  }).join('\n');

  const prompt = `请根据以下${stockName}公司核心管理者信息，补充每位管理者的背景介绍。
要求：
1. 仅补充有公开信息可查的内容，无法确认的标注"暂无公开信息"
2. 每位管理者包含：毕业院校（分别列出本科、硕士、博士院校，如未知则标注"未知"）、主要工作经历（曾任职务/公司）、行业地位和影响力
3. 严格按以下JSON数组格式输出，不要输出其他内容：
[{"name":"姓名","bachelorSchool":"本科院校","masterSchool":"硕士院校","phdSchool":"博士院校","experience":"工作经历","industryPosition":"行业地位"}]

核心管理者：
${managerInfo}`;

  try {
    const result = await callLLM('你是一位专业的财经分析师，熟悉中国上市公司管理层背景。请准确、客观地提供信息。', prompt, false, 'mgmt-enrich');

    if (result) {
      // 尝试解析JSON
      let parsed = null;
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log('管理层背景JSON解析失败:', e);
      }

      let cardsHtml = '';
      if (parsed && Array.isArray(parsed)) {
        parsed.forEach(p => {
          cardsHtml += `<div class="sa-mgmt-card">`;
          cardsHtml += `<div class="sa-mgmt-card-name">${p.name || '--'}</div>`;
          // 毕业院校
          const schools = [];
          if (p.bachelorSchool && p.bachelorSchool !== '未知') schools.push('本科：' + p.bachelorSchool);
          if (p.masterSchool && p.masterSchool !== '未知') schools.push('硕士：' + p.masterSchool);
          if (p.phdSchool && p.phdSchool !== '未知') schools.push('博士：' + p.phdSchool);
          if (schools.length > 0) {
            cardsHtml += `<div class="sa-mgmt-card-field"><strong>毕业院校：</strong>${schools.join(' | ')}</div>`;
          }
          cardsHtml += `<div class="sa-mgmt-card-field"><strong>工作经历：</strong>${p.experience || '暂无公开信息'}</div>`;
          cardsHtml += `<div class="sa-mgmt-card-field"><strong>行业地位：</strong>${p.industryPosition || '暂无公开信息'}</div>`;
          cardsHtml += `</div>`;
        });
      } else {
        // JSON解析失败，直接展示文本
        cardsHtml = `<div class="sa-mgmt-card"><div class="sa-mgmt-card-field">${result.replace(/\n/g, '<br>')}</div></div>`;
      }

      resultArea.innerHTML = cardsHtml;
      btn.textContent = '✨ 重新补充';
      btn.disabled = false;
    } else {
      resultArea.innerHTML = '<div class="sa-mgmt-card"><div class="sa-mgmt-card-field">补充失败，请重试</div></div>';
      btn.textContent = '✨ 重试';
      btn.disabled = false;
    }
  } catch (e) {
    console.error('管理层背景补充失败:', e);
    resultArea.innerHTML = '<div class="sa-mgmt-card"><div class="sa-mgmt-card-field">补充失败：' + e.message + '</div></div>';
    btn.textContent = '✨ 重试';
    btn.disabled = false;
  }
}

/**
 * 加载资金流向趋势图
 * @param {string} mode - 'main' 主信息卡, 'collapsed' 折叠信息卡
 */
function loadNorthChart(mode) {
  if (!state.saStock) return;
  const data = state.saFundamentals?._northData;
  let container;
  if (mode === 'main') {
    container = document.getElementById('sa-north-container');
  } else {
    container = document.getElementById('sa-collapse-north-container');
  }
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="sa-kline-placeholder">该股暂无资金流向数据</div>';
    return;
  }

  renderNorthCanvas(container, data, state.saStock.name);
}

/**
 * Canvas绘制主力资金流向趋势图（主力净流入柱状图 + 累计净流入折线）
 * @param {HTMLElement} container - 容器元素
 * @param {Array} data - 资金流向数据数组 [{date, mainNet, smallNet, midNet, superNet, bigNet}]
 * @param {string} stockName - 股票名称
 */
function renderNorthCanvas(container, data, stockName) {
  const width = container.clientWidth || 400;
  const height = 300;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // 布局参数
  const padding = { top: 45, right: 55, bottom: 25, left: 10 };
  const drawWidth = width - padding.left - padding.right;
  const totalDrawHeight = height - padding.top - padding.bottom;
  const lineAreaHeight = totalDrawHeight * 0.40;
  const barAreaHeight = totalDrawHeight * 0.45;
  const gapHeight = totalDrawHeight * 0.15;

  const lineAreaTop = padding.top;
  const barAreaTop = padding.top + lineAreaHeight + gapHeight;

  // 背景
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, width, height);

  // ========== 标题 & 统计 ==========
  ctx.fillStyle = '#202124';
  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.fillText(`${stockName} 主力资金流向`, padding.left, 16);

  // 统计数据
  const latest = data[data.length - 1];
  const last5 = data.slice(-5);
  const mainNet5d = last5.reduce((sum, d) => sum + d.mainNet, 0);
  const mainNet5dYi = (mainNet5d / 100000000).toFixed(2);
  const todayMainYi = (latest.mainNet / 100000000).toFixed(2);

  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = latest.mainNet >= 0 ? '#e53935' : '#34a853';
  ctx.fillText(`今日: ${latest.mainNet >= 0 ? '+' : ''}${todayMainYi}亿`, padding.left, 30);

  ctx.fillStyle = mainNet5d >= 0 ? '#e53935' : '#34a853';
  ctx.fillText(`近5日: ${mainNet5d >= 0 ? '+' : ''}${mainNet5dYi}亿`, padding.left + 95, 30);

  const mainNetTotal = data.reduce((sum, d) => sum + d.mainNet, 0);
  const mainNetTotalYi = (mainNetTotal / 100000000).toFixed(2);
  ctx.fillStyle = mainNetTotal >= 0 ? '#e53935' : '#34a853';
  ctx.fillText(`${data.length}日累计: ${mainNetTotal >= 0 ? '+' : ''}${mainNetTotalYi}亿`, padding.left + 195, 30);

  // ========== 上半区：累计主力净流入折线 ==========
  const cumValues = [];
  let cumSum = 0;
  for (const d of data) {
    cumSum += d.mainNet;
    cumValues.push(cumSum / 100000000); // 转亿元
  }
  const maxCum = Math.max(...cumValues);
  const minCum = Math.min(...cumValues);
  const cumRange = maxCum - minCum || 1;

  // 区域标签
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.fillText('累计净流入(亿)', padding.left, lineAreaTop - 2);

  // 网格线
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  const cumSteps = 3;
  for (let i = 0; i <= cumSteps; i++) {
    const y = lineAreaTop + (lineAreaHeight / cumSteps) * i;
    const val = maxCum - (cumRange / cumSteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '9px monospace';
    ctx.fillText(val.toFixed(1), width - padding.right + 4, y + 3);
  }

  // 绘制折线
  ctx.strokeStyle = '#1a73e8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + (drawWidth / (data.length - 1 || 1)) * i;
    const y = lineAreaTop + lineAreaHeight - ((cumValues[i] - minCum) / cumRange) * lineAreaHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 折线填充
  const lastX = padding.left + drawWidth;
  ctx.lineTo(lastX, lineAreaTop + lineAreaHeight);
  ctx.lineTo(padding.left, lineAreaTop + lineAreaHeight);
  ctx.closePath();
  ctx.fillStyle = 'rgba(26, 115, 232, 0.08)';
  ctx.fill();

  // ========== 下半区：每日主力净流入柱状图 ==========
  const mainNets = data.map(d => d.mainNet / 100000000); // 转亿元
  const maxNet = Math.max(...mainNets, 0);
  const minNet = Math.min(...mainNets, 0);
  const netRange = maxNet - minNet || 1;

  // 区域标签
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.fillText('每日主力净流入(亿)', padding.left, barAreaTop - 2);

  // 零线位置
  const zeroY = barAreaTop + (maxNet / netRange) * barAreaHeight;

  // 上刻度
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, barAreaTop);
  ctx.lineTo(width - padding.right, barAreaTop);
  ctx.stroke();
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px monospace';
  if (maxNet > 0) ctx.fillText(maxNet.toFixed(1), width - padding.right + 4, barAreaTop + 3);

  // 零线
  ctx.strokeStyle = '#dadce0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(width - padding.right, zeroY);
  ctx.stroke();
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px monospace';
  ctx.fillText('0', width - padding.right + 4, zeroY + 3);

  // 下刻度
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, barAreaTop + barAreaHeight);
  ctx.lineTo(width - padding.right, barAreaTop + barAreaHeight);
  ctx.stroke();
  ctx.fillStyle = '#9aa0a6';
  if (minNet < 0) ctx.fillText(minNet.toFixed(1), width - padding.right + 4, barAreaTop + barAreaHeight + 3);

  // 柱状图
  const barGap = drawWidth / data.length;
  const barWidth = Math.max(2, barGap * 0.7);
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + barGap * i + (barGap - barWidth) / 2;
    const val = mainNets[i];
    const barH = Math.abs(val / netRange) * barAreaHeight;

    if (val >= 0) {
      ctx.fillStyle = 'rgba(229, 57, 53, 0.75)';
      ctx.fillRect(x, zeroY - barH, barWidth, Math.max(barH, 0.5));
    } else {
      ctx.fillStyle = 'rgba(52, 168, 83, 0.75)';
      ctx.fillRect(x, zeroY, barWidth, Math.max(barH, 0.5));
    }
  }

  // ========== X轴日期标签 ==========
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px -apple-system, sans-serif';
  const dateY = height - 5;
  const dateIndices = [0, Math.floor(data.length / 3), Math.floor(data.length * 2 / 3), data.length - 1];
  dateIndices.forEach(idx => {
    if (idx >= data.length) return;
    const x = padding.left + (drawWidth / (data.length - 1 || 1)) * idx;
    const dateStr = data[idx].date.substring(2);
    ctx.fillText(dateStr, x - 15, dateY);
  });

  // ========== 图例 ==========
  const legendY = 16;
  const legendX = width - padding.right - 110;
  ctx.font = '9px -apple-system, sans-serif';

  ctx.strokeStyle = '#1a73e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY - 3);
  ctx.lineTo(legendX + 12, legendY - 3);
  ctx.stroke();
  ctx.fillStyle = '#5f6368';
  ctx.fillText('累计净流入', legendX + 15, legendY);

  ctx.fillStyle = 'rgba(229, 57, 53, 0.75)';
  ctx.fillRect(legendX, legendY + 6, 8, 8);
  ctx.fillStyle = '#5f6368';
  ctx.fillText('流入', legendX + 12, legendY + 13);

  ctx.fillStyle = 'rgba(52, 168, 83, 0.75)';
  ctx.fillRect(legendX + 40, legendY + 6, 8, 8);
  ctx.fillStyle = '#5f6368';
  ctx.fillText('流出', legendX + 52, legendY + 13);
}

/**
 * 同步折叠面板的指标数据
 */
function syncCollapsedMetrics() {
  const stock = state.saStock;
  if (!stock) return;

  // 同步基本信息
  const nameEl = $('#sa-collapse-name');
  const codeEl = $('#sa-collapse-code');
  const priceEl = $('#sa-collapse-price');
  const changeEl = $('#sa-collapse-change');
  if (nameEl) nameEl.textContent = stock.name || '--';
  if (codeEl) codeEl.textContent = stock.code || '--';
  if (priceEl) priceEl.textContent = stock.price ? `¥${stock.price.toFixed(2)}` : '--';
  if (changeEl) {
    if (stock.changePct != null) {
      const pct = stock.changePct;
      changeEl.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
      changeEl.style.color = pct > 0 ? 'var(--accent)' : pct < 0 ? 'var(--success)' : 'inherit';
    } else {
      changeEl.textContent = '--';
    }
  }

  // 同步指标数据
  const metricIds = ['pe', 'pb', 'mv', 'roe', 'gm', 'nm', 'revg', 'npg', 'dar', 'roic', 'ocf', 'fcf'];
  metricIds.forEach(id => {
    const mainEl = $(`#sa-metric-${id}`);
    const collapseEl = $(`#sa-collapse-metric-${id}`);
    if (mainEl && collapseEl) {
      collapseEl.textContent = mainEl.textContent;
      collapseEl.style.color = mainEl.style.color || 'inherit';
    }
  });
}

/**
 * 渲染股票分析报告（完整）
 */
function renderSAReport(markdown) {
  const container = $('#sa-content');
  container.innerHTML = renderMarkdown(markdown);
  container.classList.remove('streaming-cursor');
  addSectionIdsAndPlayButtons(container);
}

/**
 * 渲染股票分析报告（流式）
 */
function renderSAReportStreaming(markdown) {
  const container = $('#sa-content');
  if ($('#sa-result').style.display === 'none') {
    $('#sa-result').style.display = '';
    $('#sa-loading').style.display = 'none';
  }
  container.innerHTML = renderMarkdown(markdown);
  container.classList.add('streaming-cursor');
  clearTimeout(window._saStreamTimeout);
  window._saStreamTimeout = setTimeout(() => {
    container.classList.remove('streaming-cursor');
    addSectionIdsAndPlayButtons(container);
    buildTOC();
    buildTTSSectionsFrom(container);
  }, 3000);
}

/**
 * 渲染选股器报告（流式）
 */
function renderScreenerReportStreaming(markdown) {
  const container = $('#screener-content');
  if ($('#screener-result').style.display === 'none') {
    $('#screener-result').style.display = '';
    $('#screener-loading').style.display = 'none';
  }
  container.innerHTML = renderMarkdown(markdown);
  container.classList.add('streaming-cursor');
  clearTimeout(window._screenerStreamTimeout);
  window._screenerStreamTimeout = setTimeout(() => {
    container.classList.remove('streaming-cursor');
    addSectionIdsAndPlayButtons(container);
    buildTTSSectionsFrom(container);
  }, 3000);
}

/**
 * 搜索股票（用于设置面板中的关注列表添加）
 */
async function searchSettingsWatchlistStock(keyword) {
  const suggestDiv = $('#settings-watchlist-suggest');
  if (!suggestDiv) return;

  try {
    // 使用东方财富股票搜索接口
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await hotspotFetch(url);
    if (resp.error || !resp.data) {
      suggestDiv.style.display = 'none';
      return;
    }
    const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    const items = data?.QuotationCodeTable?.Data || [];
    if (items.length === 0) {
      suggestDiv.style.display = 'none';
      return;
    }

    suggestDiv.innerHTML = items.map(item => {
      const code = item.Code || '';
      const name = item.Name || '';
      const market = item.MktNum === '1' ? 'SH' : 'SZ';
      const tsCode = `${code}.${market}`;
      return `<div class="stock-suggest-item" data-code="${code}" data-name="${name}" data-ts="${tsCode}">
        <span class="stock-suggest-code">${code}</span>
        <span class="stock-suggest-name">${name}</span>
      </div>`;
    }).join('');
    suggestDiv.style.display = '';

    // 点击选择
    suggestDiv.querySelectorAll('.stock-suggest-item').forEach(el => {
      el.addEventListener('click', () => {
        const code = el.dataset.code;
        const name = el.dataset.name;
        const tsCode = el.dataset.ts;
        // 检查是否已关注
        if (state.watchlist.some(w => w.code === code || w.tsCode === tsCode)) {
          showToast(`${name} 已在关注列表中`);
          suggestDiv.style.display = 'none';
          return;
        }
        state.watchlist.push({ code, name, tsCode, market: tsCode.split('.')[1] });
        saveWatchlist();
        renderSettingsWatchlistTags();
        $('#settings-watchlist-input').value = '';
        suggestDiv.style.display = 'none';
        showToast(`已添加关注：${name}`);
      });
    });
  } catch (e) {
    console.error('搜索股票失败:', e);
    suggestDiv.style.display = 'none';
  }
}

/**
 * 直接添加关注公司（设置面板中）
 */
function addSettingsWatchlistCompany() {
  const input = $('#settings-watchlist-input');
  const val = input.value.trim();
  if (!val) return;

  // 尝试直接解析为股票代码
  // 格式: 6位数字 或 数字.SH/SZ
  const codeMatch = val.match(/^(\d{6})(?:\.(SH|SZ))?$/);
  if (codeMatch) {
    const code = codeMatch[1];
    const market = codeMatch[2] || (code.startsWith('6') ? 'SH' : code.startsWith('0') || code.startsWith('3') ? 'SZ' : 'SZ');
    const tsCode = `${code}.${market}`;
    if (state.watchlist.some(w => w.code === code || w.tsCode === tsCode)) {
      showToast('该公司已在关注列表中');
      return;
    }
    // 先添加临时名称，后台搜索补全
    state.watchlist.push({ code, name: val, tsCode, market });
    saveWatchlist();
    renderSettingsWatchlistTags();
    input.value = '';
    showToast(`已添加关注：${val}`);
    // 异步搜索补全公司名称
    fetchCompanyNameAsync(code, tsCode, market);
    return;
  }

  // 否则触发搜索
  searchSettingsWatchlistStock(val);
}

/**
 * 渲染设置面板中的关注列表标签
 */
function renderSettingsWatchlistTags() {
  const container = $('#settings-watchlist-tags');
  if (!container) return;

  if (state.watchlist.length === 0) {
    container.innerHTML = '<div class="settings-watchlist-empty">暂无关注公司，请在上方搜索添加</div>';
    return;
  }

  container.innerHTML = state.watchlist.map(w => `
    <div class="settings-watchlist-tag">
      <span class="settings-watchlist-tag-name">${w.name}</span>
      <span class="settings-watchlist-tag-code">${w.tsCode || w.code}</span>
      <button class="settings-watchlist-tag-remove" data-ts="${w.tsCode}" title="移除">✕</button>
    </div>
  `).join('');

  // 绑定删除
  container.querySelectorAll('.settings-watchlist-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeWatchlistCompany(btn.dataset.ts);
      renderSettingsWatchlistTags();
    });
  });
}

/**
 * 显示设置面板时刷新关注公司列表
 */
function refreshSettingsWatchlist() {
  renderSettingsWatchlistTags();
}

/**
 * 渲染模型服务列表
 */
function renderLLMServicesList() {
  const container = $('#llm-services-list');
  const activeSelect = $('#llm-active-service');
  if (!container || !activeSelect) return;
  
  // 渲染服务列表
  if (state.settings.services.length === 0) {
    container.innerHTML = '<div class="hs-watchlist-empty">暂无模型服务，请添加</div>';
  } else {
    container.innerHTML = state.settings.services.map(service => `
      <div class="llm-service-item ${service.id === state.settings.activeServiceId ? 'active' : ''} ${!service.enabled ? 'disabled' : ''}" 
           data-service-id="${service.id}">
        <div class="llm-service-info">
          <div class="llm-service-name">${service.name}</div>
          <div class="llm-service-detail">${service.model} · ${service.baseUrl}</div>
        </div>
        <div class="llm-service-actions">
          <button class="llm-service-btn edit" data-service-id="${service.id}" title="编辑">✏️</button>
          <button class="llm-service-btn delete" data-service-id="${service.id}" title="删除">🗑️</button>
        </div>
      </div>
    `).join('');
    
    // 绑定点击事件
    container.querySelectorAll('.llm-service-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.llm-service-btn')) return;
        switchLLMService(item.dataset.serviceId);
      });
    });
    
    container.querySelectorAll('.llm-service-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editLLMService(btn.dataset.serviceId);
      });
    });
    
    container.querySelectorAll('.llm-service-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLLMService(btn.dataset.serviceId);
      });
    });
  }
  
  // 渲染激活服务下拉框
  activeSelect.innerHTML = state.settings.services
    .filter(s => s.enabled)
    .map(service => `<option value="${service.id}">${service.name} (${service.model})</option>`)
    .join('');
  activeSelect.value = state.settings.activeServiceId;
}

/**
 * 切换当前使用的模型服务
 */
function switchLLMService(serviceId) {
  const service = state.settings.services.find(s => s.id === serviceId);
  if (!service) {
    showToast('服务不存在');
    return;
  }
  
  state.settings.activeServiceId = serviceId;
  
  // 同步更新顶层字段（向后兼容）
  state.settings.provider = service.provider;
  state.settings.baseUrl = service.baseUrl;
  state.settings.apiKey = service.apiKey;
  state.settings.model = service.model;
  
  StorageManager.saveSettings(state.settings);
  loadActiveService();
  renderLLMServicesList();
  showToast(`已切换到: ${service.name}`);
}

/**
 * 编辑模型服务
 */
function editLLMService(serviceId) {
  const service = state.settings.services.find(s => s.id === serviceId);
  if (!service) return;
  
  $('#llm-service-name').value = service.name;
  $('#llm-provider').value = service.provider;
  $('#llm-base-url').value = service.baseUrl;
  $('#llm-api-key').value = service.apiKey;
  $('#llm-model').value = service.model;
  $('#llm-service-enabled').checked = service.enabled;
  
  $('#llm-service-editor').style.display = '';
  $('#llm-service-editor').dataset.editingId = serviceId;
  
  // 触发provider change事件以填充默认值
  $('#llm-provider').dispatchEvent(new Event('change'));
}

/**
 * 删除模型服务
 */
function deleteLLMService(serviceId) {
  if (state.settings.services.length <= 1) {
    showToast('至少保留一个模型服务');
    return;
  }
  
  if (serviceId === state.settings.activeServiceId) {
    showToast('无法删除当前使用的服务');
    return;
  }
  
  if (!confirm('确定要删除此模型服务吗？')) return;
  
  state.settings.services = state.settings.services.filter(s => s.id !== serviceId);
  localStorage.setItem('er_settings', JSON.stringify(state.settings));
  renderLLMServicesList();
  showToast('已删除模型服务');
}

/**
 * 添加新模型服务
 */
function addNewLLMService() {
  $('#llm-service-name').value = '';
  $('#llm-provider').value = 'openai';
  $('#llm-base-url').value = 'https://api.openai.com/v1';
  $('#llm-api-key').value = '';
  $('#llm-model').value = 'gpt-4o';
  $('#llm-service-enabled').checked = true;
  
  $('#llm-service-editor').style.display = '';
  $('#llm-service-editor').dataset.editingId = '';
  
  // 触发provider change事件以填充默认值
  $('#llm-provider').dispatchEvent(new Event('change'));
}

/**
 * 保存模型服务
 */
function saveLLMService() {
  const name = $('#llm-service-name').value.trim();
  if (!name) {
    showToast('请输入服务名称');
    return;
  }
  
  const serviceData = {
    name: name,
    provider: $('#llm-provider').value,
    baseUrl: $('#llm-base-url').value,
    apiKey: $('#llm-api-key').value,
    model: $('#llm-model').value,
    enabled: $('#llm-service-enabled').checked
  };
  
  const editingId = $('#llm-service-editor').dataset.editingId;
  
  if (editingId) {
    // 更新现有服务
    const serviceIndex = state.settings.services.findIndex(s => s.id === editingId);
    if (serviceIndex >= 0) {
      state.settings.services[serviceIndex] = {
        ...state.settings.services[serviceIndex],
        ...serviceData
      };
      
      // 如果编辑的是当前激活的服务，同步更新顶层字段
      if (editingId === state.settings.activeServiceId) {
        state.settings.provider = serviceData.provider;
        state.settings.baseUrl = serviceData.baseUrl;
        state.settings.apiKey = serviceData.apiKey;
        state.settings.model = serviceData.model;
      }
    }
  } else {
    // 添加新服务
    const newService = {
      id: 'service_' + Date.now(),
      ...serviceData
    };
    state.settings.services.push(newService);
  }
  
  StorageManager.saveSettings(state.settings);
  $('#llm-service-editor').style.display = 'none';
  renderLLMServicesList();
  showToast('已保存模型服务（已备份）');
}

/**
 * 取消编辑模型服务
 */
function cancelEditLLMService() {
  $('#llm-service-editor').style.display = 'none';
}

