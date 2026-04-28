// ======================== 公司资讯模块 (company.js) ========================
// 抽取自 sidepanel.js，管理关注公司资讯、公告、情感分析

function loadWatchlist() {
  const result = WatchlistStorage.load();
  
  // 处理Promise情况
  if (result && typeof result.then === 'function') {
    result.then((watchlist) => {
      state.watchlist = watchlist;
      renderCompanyChips();
    });
    return;
  }
  
  state.watchlist = result;
  renderCompanyChips();
}

/**
 * 保存关注列表
 */
function saveWatchlist() {
  WatchlistStorage.save(state.watchlist);
  renderCompanyChips();
}

/**
 * 搜索股票（用于关注列表添加）

 */
async function searchWatchlistStock(keyword) {
  const suggestDiv = $('#hs-watchlist-suggest');
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
        renderWatchlistTags();
        $('#hs-watchlist-input').value = '';
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
 * 直接添加关注公司（输入股票代码或名称）
 */
function addWatchlistCompany() {
  const input = $('#hs-watchlist-input');
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
    renderWatchlistTags();
    input.value = '';
    showToast(`已添加关注：${val}`);
    // 异步搜索补全公司名称
    fetchCompanyNameAsync(code, tsCode, market);
    return;
  }

  // 否则触发搜索
  searchWatchlistStock(val);
}

/**
 * 异步获取公司名称并更新关注列表
 */
async function fetchCompanyNameAsync(code, tsCode, market) {
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(code)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=3`;
    const resp = await hotspotFetch(url);
    if (resp.error || !resp.data) return;
    const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    const items = data?.QuotationCodeTable?.Data || [];
    const match = items.find(i => i.Code === code);
    if (match && match.Name) {
      const entry = state.watchlist.find(w => w.code === code || w.tsCode === tsCode);
      if (entry && entry.name === code) {
        entry.name = match.Name;
        saveWatchlist();
        renderWatchlistTags();
        renderCompanyChips();
      }
    }
  } catch (e) {
    // 静默失败，名称下次更新
  }
}

function removeWatchlistCompany(tsCode) {
  state.watchlist = state.watchlist.filter(w => w.tsCode !== tsCode);
  saveWatchlist();
  renderWatchlistTags();
}

/**
 * 渲染关注列表标签（弹窗内）
 */

function renderWatchlistTags() {
  const container = $('#hs-watchlist-tags');
  if (!container) return;

  if (state.watchlist.length === 0) {
    container.innerHTML = '<div class="hs-watchlist-empty">暂无关注公司，请在上方搜索添加</div>';
    return;
  }

  container.innerHTML = state.watchlist.map(w => `
    <div class="hs-watchlist-tag">
      <span class="hs-watchlist-tag-name">${w.name}</span>
      <span class="hs-watchlist-tag-code">${w.tsCode || w.code}</span>
      <button class="hs-watchlist-tag-remove" data-ts="${w.tsCode}" title="移除">✕</button>
    </div>
  `).join('');

  // 绑定删除
  container.querySelectorAll('.hs-watchlist-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeWatchlistCompany(btn.dataset.ts);
    });
  });
}

/**
 * 渲染关注公司过滤标签
 */

function renderCompanyChips() {
  const container = $('#hs-company-chips');
  if (!container) return;

  let html = '<button class="hs-chip active" data-company="all">全部</button>';
  state.watchlist.forEach(w => {
    html += `<button class="hs-chip" data-company="${w.tsCode || w.code}">${w.name}</button>`;
  });
  container.innerHTML = html;
}

/**
 * 获取关注公司的资讯和公告
 */

async function fetchCompanyData() {
  if (state.watchlist.length === 0) return;

  const loading = $('#hs-company-loading');
  const loadingText = $('#hs-company-loading-text');
  if (loading) {
    loading.style.display = '';
    loadingText.textContent = '正在获取公司资讯...';
  }

  let allNews = [];
  let allAnnouncements = [];

  const tasks = state.watchlist.map(w => {
    return Promise.allSettled([
      fetchCompanyNews(w),
      fetchCompanyAnnouncements(w),
    ]);
  });

  try {
    const results = await Promise.allSettled(tasks);
    results.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        r.value.forEach(v => {
          if (v.status === 'fulfilled') {
            const data = v.value;
            if (data.type === 'news') allNews = allNews.concat(data.items);
            else if (data.type === 'announcement') allAnnouncements = allAnnouncements.concat(data.items);
          }
        });
      }
    });
  } catch (e) {
    console.error('公司资讯抓取异常:', e);
  }

  // 资讯：24小时过滤；公告：7天过滤（公告时效性较长）
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
  let companyItems = allNews.filter(item => {
    if (!item.time || isNaN(item.time.getTime())) return true;
    return (now - item.time.getTime()) < oneDayMs;
  }).sort((a, b) => {
    const ta = a.time && !isNaN(a.time.getTime()) ? a.time.getTime() : 0;
    const tb = b.time && !isNaN(b.time.getTime()) ? b.time.getTime() : 0;
    return tb - ta;
  });

  // 相似资讯聚合：合并重复报道，汇总来源和关联公司
  companyItems = computeCompanyOverlap(companyItems);
  
  // 按重合度排序（多源报道优先），相同重合度按时间排
  companyItems.sort((a, b) => {
    const overlapDiff = (b.overlap || 0) - (a.overlap || 0);
    if (overlapDiff !== 0) return overlapDiff;
    const ta = a.time?.getTime() || 0;
    const tb = b.time?.getTime() || 0;
    return tb - ta;
  });

  state.companyItems = companyItems;

  let companyAnnouncements = allAnnouncements.filter(item => {
    if (!item.time || isNaN(item.time.getTime())) return true;
    return (now - item.time.getTime()) < sevenDayMs;
  }).sort((a, b) => {
    const ta = a.time && !isNaN(a.time.getTime()) ? a.time.getTime() : 0;
    const tb = b.time && !isNaN(b.time.getTime()) ? b.time.getTime() : 0;
    return tb - ta;
  });

  // 相同公告聚合（与资讯逻辑保持一致）
  companyAnnouncements = computeCompanyOverlap(companyAnnouncements);

  // 按重合度排序（多源报道优先），相同重合度按时间排
  companyAnnouncements.sort((a, b) => {
    const overlapDiff = (b.overlap || 0) - (a.overlap || 0);
    if (overlapDiff !== 0) return overlapDiff;
    const ta = a.time?.getTime() || 0;
    const tb = b.time?.getTime() || 0;
    return tb - ta;
  });

  state.companyAnnouncements = companyAnnouncements;

  if (loading) loading.style.display = 'none';

  renderCompanyList();
  updateCompanyUpdateTime();
  
  // 后台异步进行情感分析（不阻塞渲染）
  const allItemsForSentiment = [...state.companyItems, ...state.companyAnnouncements];
  if (state.settings.apiKey && allItemsForSentiment.length > 0) {
    console.log(`[情感分析] 开始分析${allItemsForSentiment.length}条资讯/公告...`);
    batchAnalyzeSentiment(allItemsForSentiment.slice(0, 50)).then(() => {
      console.log('[情感分析] 分析完成，重新渲染列表');
      renderCompanyList(); // 分析完成后重新渲染显示标签
    });
  }
}

/**
 * 获取个股新闻
 * 主策略：东方财富搜索API（search-api-web），按公司名称精准搜索个股新闻
 * 副策略：从已抓取的行业热点数据中按关键词补充
 */


/**
 * 计算公司资讯重合度并合并重复新闻
 * 原理：不同关注公司可能报道同一事件，标题相似即合并
 * 合并后保留最早的一条，来源和公司信息合并展示
 */
function computeCompanyOverlap(items) {
  if (!items || items.length < 2) return items;
  
  // 停用词
  const stopWords = new Set(['的', '了', '在', '是', '和', '与', '对', '将', '被', '有', '也', '不', '这', '该', '为', '及', '等', '中', '上', '下', '后', '前', '从', '到', '以', '或', '可', '其', '已', '一', '个']);
  
  function extractKeywords(title) {
    if (!title) return [];
    return title
      .replace(/[【】《》、，。！？：；""''（）\[\]{}]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
  }
  
  function similarity(kw1, kw2) {
    if (!kw1.length || !kw2.length) return 0;
    const set1 = new Set(kw1);
    const set2 = new Set(kw2);
    let common = 0;
    for (const w of set1) { if (set2.has(w)) common++; }
    return common / (set1.size + set2.size - common);
  }
  
  // 初始化关键词和来源列表
  items.forEach(item => {
    item._keywords = extractKeywords(item.title);
    if (!item.sources) {
      item.sources = [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    }
    item._companies = [{ code: item.companyCode, name: item.companyName }];
  });
  
  // 并查集
  const parent = items.map((_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  
  // 全量两两比较（关键词数量预过滤优化）
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const ki = items[i]._keywords.length;
      const kj = items[j]._keywords.length;
      if (ki === 0 || kj === 0) continue;
      const lenRatio = Math.min(ki, kj) / Math.max(ki, kj);
      if (lenRatio < 0.4) continue;
      
      const sim = similarity(items[i]._keywords, items[j]._keywords);
      if (sim >= 0.35) {
        union(i, j);
      }
    }
  }
  
  // 按组聚合
  const groups = new Map();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  
  const mergedItems = [];
  for (const [root, indices] of groups) {
    const groupItems = indices.map(i => items[i]);
    groupItems.sort((a, b) => {
      const ta = a.time?.getTime() || 0;
      const tb = b.time?.getTime() || 0;
      return ta - tb;
    });
    
    const primary = groupItems[0];
    
    // 合并来源
    const allSources = [];
    const seenSourceNames = new Set();
    for (const item of groupItems) {
      const srcName = item.source;
      if (!seenSourceNames.has(srcName)) {
        seenSourceNames.add(srcName);
        allSources.push({ source: srcName, sourceType: item.sourceType, url: item.url });
      }
      if (item.sources) {
        for (const s of item.sources) {
          if (!seenSourceNames.has(s.source)) {
            seenSourceNames.add(s.source);
            allSources.push(s);
          }
        }
      }
    }
    
    // 合并关联公司
    const allCompanies = [];
    const seenCompanyNames = new Set();
    for (const item of groupItems) {
      const name = item.companyName;
      if (!seenCompanyNames.has(name)) {
        seenCompanyNames.add(name);
        allCompanies.push({ code: item.companyCode, name: item.companyName });
      }
      if (item._companies) {
        for (const c of item._companies) {
          if (!seenCompanyNames.has(c.name)) {
            seenCompanyNames.add(c.name);
            allCompanies.push(c);
          }
        }
      }
    }
    
    primary.sources = allSources;
    primary.companies = allCompanies;
    primary.overlap = allSources.length;
    primary.companyCount = allCompanies.length;
    
    // 用最完整的 summary
    for (const item of groupItems) {
      if (item.summary && item.summary.length > (primary.summary || '').length) {
        primary.summary = item.summary;
      }
    }
    
    mergedItems.push(primary);
  }
  
  // 清理临时字段
  mergedItems.forEach(item => { delete item._keywords; delete item._companies; });
  
  return mergedItems;
}

async function fetchCompanyNews(watchItem) {
  try {
    const items = [];
    const seenIds = new Set();

    // 策略1（主）：东方财富搜索API - 按公司名称搜索个股新闻
    const searchItems = await fetchCompanyNewsFromSearchAPI(watchItem);
    for (const item of searchItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }

    // 策略2（副）：从已有热点数据中过滤补充
    const keywords = [watchItem.name];
    const pureCode = (watchItem.tsCode || watchItem.code || '').split('.')[0];
    if (pureCode && pureCode.length >= 4) keywords.push(pureCode);

    for (const item of state.hotspotItems) {
      const titleLower = (item.title || '').toLowerCase();
      const summaryLower = (item.summary || '').toLowerCase();
      const stocksLower = (item.stocks || []).map(s => s.toLowerCase());

      let matched = false;
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        if (titleLower.includes(kwLower) || summaryLower.includes(kwLower) || stocksLower.some(s => s.includes(kwLower))) {
          matched = true;
          break;
        }
      }

      if (matched && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push({
          ...item,
          id: `cn_${item.id}`,
          companyCode: watchItem.tsCode || watchItem.code,
          companyName: watchItem.name,
          sources: item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }],
        });
      }
    }

    return { type: 'news', items };
  } catch (e) {
    console.error(`获取 ${watchItem.name} 新闻失败:`, e);
    return { type: 'news', items: [] };
  }
}

/**
 * 东方财富搜索API - 按公司名称搜索个股新闻
 * 接口：https://search-api-web.eastmoney.com/search/jsonp
 * 参考AKShare stock_news_em实现
 */

async function fetchCompanyNewsFromSearchAPI(watchItem) {
  try {
    const keyword = watchItem.name || watchItem.code;
    const searchParam = JSON.stringify({
      uid: '',
      keyword: keyword,
      type: ['cmsArticleWebOld'],
      client: 'web',
      clientType: 'web',
      clientVersion: 'curr',
      param: {
        cmsArticleWebOld: {
          searchScope: 'default',
          sort: 'default',
          pageIndex: 1,
          pageSize: 20,
          preTag: '',
          postTag: ''
        }
      }
    });

    const url = `https://search-api-web.eastmoney.com/search/jsonp?cb=jQuery_callback&param=${encodeURIComponent(searchParam)}`;
    const resp = await hotspotFetch(url, {
      headers: {
        'Referer': 'https://so.eastmoney.com/',
      }
    });
    if (resp.error) return [];

    // 处理JSONP格式：jQuery_callback({...})
    let text = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    // 去掉JSONP包装
    const jsonpMatch = text.match(/^[^(]+\((.*)\);?$/s);
    if (jsonpMatch) {
      text = jsonpMatch[1];
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('搜索API JSON解析失败:', e, text.substring(0, 200));
      return [];
    }

    if (data.code !== 0) return [];

    const newsItems = data?.result?.cmsArticleWebOld || [];
    return newsItems.map((item, idx) => {
      // 解析时间：'2026-04-17 23:26:00' → ISO格式
      let itemTime = null;
      if (item.date) {
        const normalized = item.date.replace(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}).*/, '$1T$2');
        itemTime = new Date(normalized);
        if (isNaN(itemTime.getTime())) itemTime = null;
      }
      return {
        id: `cn_search_${watchItem.tsCode || watchItem.code}_${idx}`,
        companyCode: watchItem.tsCode || watchItem.code,
        companyName: watchItem.name,
        source: item.mediaName || '东方财富',
        sourceType: 'eastmoney',
        title: item.title || '',
        summary: (item.content || '').substring(0, 200),
        time: itemTime,
        timeStr: itemTime && !isNaN(itemTime.getTime()) ? formatHSTime(itemTime) : '--',
        url: item.url || '',
        stocks: [watchItem.name],
        tags: [],
        domains: [],
      };
    });
  } catch (e) {
    console.error(`获取 ${watchItem.name} 搜索新闻失败:`, e);
    return [];
  }
}

/**
 * 获取个股公告（东方财富公告接口）
 * 使用 stock_list 参数按股票代码筛选
 */

async function fetchCompanyAnnouncements(watchItem) {
  try {
    const code = watchItem.code;
    // 构建 secid（市场代码.股票代码），东方财富API更倾向于这种格式
    const market = watchItem.market || (watchItem.tsCode || '').split('.')[1] || '';
    const secid = market === 'SH' ? `1.${code}` : market === 'SZ' ? `0.${code}` : code;
    const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?page_size=20&page_index=1&ann_type=A&client_source=web&f_node=0&s_node=0&stock_list=${code}&secid=${secid}`;
    const resp = await hotspotFetch(url);
    if (resp.error) return { type: 'announcement', items: [] };

    const data = typeof resp.data === 'string' ? (() => { try { return JSON.parse(resp.data); } catch(e) { return null; } })() : resp.data;
    if (!data) return { type: 'announcement', items: [] };

    const announcements = data?.data?.list || [];

    const items = announcements.map((a, idx) => {
      // 解析日期：兼容多种格式，避免 Safari 下 Invalid Date
      let annTime = null;
      const rawDate = a.notice_date || a.display_time || '';
      if (rawDate) {
        // 处理 '2026-04-18 00:00:00' 或 '2026-04-17 15:33:16:244' 格式
        // 将空格替换为T，去掉末尾的:244等无效毫秒
        const normalized = rawDate.replace(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}).*/, '$1T$2');
        annTime = new Date(normalized);
        if (isNaN(annTime.getTime())) annTime = null;
      }
      const artCode = a.art_code || '';
      const noticeUrl = artCode ? `https://data.eastmoney.com/notices/detail/${code}/${artCode}.html` : '';
      // 获取公告类型
      const cols = a.columns || [];
      const colName = cols.length > 0 ? cols[0].column_name : '公告';
      return {
        id: `ca_${watchItem.tsCode || watchItem.code}_${idx}`,
        companyCode: watchItem.tsCode || watchItem.code,
        companyName: watchItem.name,
        source: '东方财富',
        sourceType: 'eastmoney',
        // 公告标题格式通常是 "公司名:公告标题"，去掉公司名前缀
        title: (a.title_ch || a.title || '').replace(/^[^:]+[:：]\s*/, ''),
        summary: '',
        time: annTime,
        timeStr: annTime && !isNaN(annTime.getTime()) ? formatHSTime(annTime) : '--',
        url: noticeUrl || '',
        stocks: [watchItem.name],
        tags: [colName].filter(Boolean),
        domains: [],
      };
    });

    return { type: 'announcement', items };
  } catch (e) {
    console.error(`获取 ${watchItem.name} 公告失败:`, e);
    return { type: 'announcement', items: [] };
  }
}

/**
 * 规则引擎：基于关键词快速判断情感（确定性高、零成本）
 * 返回 'positive' | 'negative' | null（未命中，需 LLM 兜底）
 */
function ruleBasedSentiment(item) {
  const text = `${item.title || ''} ${item.summary || ''}`;

  const negativePatterns = [
    /净利润.*(?:下降|下滑|减少|跌|亏损|转亏|预亏|预减|不及预期|暴雷|亏损扩大|由盈转亏)/i,
    /营收.*(?:下降|下滑|减少)/i,
    /(?:停产|裁员|关闭|退市风险|被ST|债务违约|逾期|破产|重整|毛利率.*下降|库存积压|订单取消|客户流失)/i,
    /(?:减持|抛售|清仓|大股东.*减持|高管.*减持|解禁)/i,
    /(?:立案调查|处罚|违规|诉讼|仲裁|监管函|警示函|被调查)/i,
    /(?:降价|价格战)/i,
  ];

  const positivePatterns = [
    /净利润.*(?:增长|上升|增加|涨|盈利|扭亏|预增|超预期|大增|翻倍)/i,
    /营收.*(?:增长|上升|增加)/i,
    /(?:中标|签约|订单|合作|扩产|投产|突破|涨价|产能释放|毛利率.*提升)/i,
    /(?:增持|回购|举牌|员工持股|股权激励)/i,
    /(?:分红|派息|高送转|股息)/i,
    /(?:产品涨价|供不应求)/i,
  ];

  let isNegative = negativePatterns.some(p => p.test(text));
  let isPositive = positivePatterns.some(p => p.test(text));

  if (isNegative && isPositive) return null;
  if (isNegative) return 'negative';
  if (isPositive) return 'positive';
  return null;
}

/**
 * AI情感分析：判断资讯对股票的影响（利好/利空/中性）
 * 策略：规则引擎优先 → LLM 兜底 → 矛盾校正
 */

async function analyzeNewsSentiment(item) {
  const cacheKey = item.id;
  const SENTIMENT_VERSION = 'v2';

  // 1. 检查内存缓存
  if (state.companySentimentCache[cacheKey]) {
    return state.companySentimentCache[cacheKey];
  }

  // 2. 检查持久化缓存（localStorage）
  try {
    const persistentCache = JSON.parse(localStorage.getItem('er_sentiment_cache') || '{}');
    if (persistentCache[cacheKey]) {
      const cached = persistentCache[cacheKey];
      const cacheAge = Date.now() - cached.timestamp;
      const CACHE_TTL = 24 * 60 * 60 * 1000;

      if (cached.version === SENTIMENT_VERSION && cacheAge < CACHE_TTL) {
        state.companySentimentCache[cacheKey] = cached.sentiment;
        return cached.sentiment;
      } else {
        delete persistentCache[cacheKey];
        localStorage.setItem('er_sentiment_cache', JSON.stringify(persistentCache));
      }
    }
  } catch (e) {
    console.warn('读取情感缓存失败:', e);
  }

  // 3. 规则引擎快速判断（确定性高、零成本）
  const ruleSentiment = ruleBasedSentiment(item);
  if (ruleSentiment) {
    state.companySentimentCache[cacheKey] = ruleSentiment;
    try {
      const persistentCache = JSON.parse(localStorage.getItem('er_sentiment_cache') || '{}');
      persistentCache[cacheKey] = {
        sentiment: ruleSentiment,
        timestamp: Date.now(),
        version: SENTIMENT_VERSION,
        title: item.title.substring(0, 50)
      };
      const keys = Object.keys(persistentCache).sort((a, b) => {
        return (persistentCache[b].timestamp || 0) - (persistentCache[a].timestamp || 0);
      });
      if (keys.length > 100) {
        keys.slice(100).forEach(key => delete persistentCache[key]);
      }
      localStorage.setItem('er_sentiment_cache', JSON.stringify(persistentCache));
    } catch (e) {
      console.warn('保存情感缓存失败:', e);
    }
    return ruleSentiment;
  }

  // 4. 如果没有配置API Key，返回中性
  if (!state.settings.apiKey) {
    state.companySentimentCache[cacheKey] = 'neutral';
    return 'neutral';
  }

  try {
    const prompt = `判断以下资讯对${item.companyName}股票的影响（利好/利空/中性），只回答一个词。
判断标准：业绩下降、亏损、减持、处罚、诉讼为利空；业绩增长、回购、增持、中标、分红为利好；无法明确判断则为中性。

示例1：
标题：宁德时代一季度净利润同比增长35%，超预期
答案：利好

示例2：
标题：某公司高管计划减持不超过2%股份
答案：利空

示例3：
标题：某公司与供应商签订日常采购合同
答案：中性

实际资讯：
标题：${item.title}
摘要：${item.summary || item.title}
答案：`;

    const response = await fetch(`${state.settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.settings.apiKey}`
      },
      body: JSON.stringify({
        model: state.settings.model,
        messages: [
          { role: 'system', content: '你是资深投资分析师，判断资讯对股票的影响。只回答：利好/利空/中性' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.warn('情感分析API调用失败:', response.status);
      state.companySentimentCache[cacheKey] = 'neutral';
      return 'neutral';
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || '中性';

    let sentiment = 'neutral';
    if (result.includes('利好') || result.includes('positive')) {
      sentiment = 'positive';
    } else if (result.includes('利空') || result.includes('negative')) {
      sentiment = 'negative';
    }

    // 5. 矛盾校正：若规则明确判定，以规则为准（兜底安全）
    const ruleCheck = ruleBasedSentiment(item);
    if (ruleCheck && ruleCheck !== sentiment) {
      console.warn(`[情感校正] LLM误判 "${item.title.substring(0, 40)}..."，LLM=${sentiment} → 规则=${ruleCheck}`);
      sentiment = ruleCheck;
    }

    // 6. 写入内存缓存
    state.companySentimentCache[cacheKey] = sentiment;

    // 7. 写入持久化缓存
    try {
      const persistentCache = JSON.parse(localStorage.getItem('er_sentiment_cache') || '{}');
      persistentCache[cacheKey] = {
        sentiment: sentiment,
        timestamp: Date.now(),
        version: SENTIMENT_VERSION,
        title: item.title.substring(0, 50)
      };

      const keys = Object.keys(persistentCache).sort((a, b) => {
        return (persistentCache[b].timestamp || 0) - (persistentCache[a].timestamp || 0);
      });

      if (keys.length > 100) {
        keys.slice(100).forEach(key => delete persistentCache[key]);
      }

      localStorage.setItem('er_sentiment_cache', JSON.stringify(persistentCache));
    } catch (e) {
      console.warn('保存情感缓存失败:', e);
    }

    return sentiment;
  } catch (e) {
    console.error('情感分析失败:', e);
    state.companySentimentCache[cacheKey] = 'neutral';
    return 'neutral';
  }
}

/**
 * 批量分析资讯情感（带并发控制）
 */

async function batchAnalyzeSentiment(items) {
  const concurrency = 3; // 最多同时3个请求
  let index = 0;
  
  async function processNext() {
    if (index >= items.length) return;
    const item = items[index++];
    await analyzeNewsSentiment(item);
    await processNext();
  }
  
  const workers = Array(Math.min(concurrency, items.length)).fill(null).map(() => processNext());
  await Promise.all(workers);
}

/**
 * 渲染公司资讯/公告列表
 */

function renderCompanyList() {
  const container = $('#hs-company-list');
  if (!container) return;

  const isNews = state.companyTypeFilter === 'news';
  let items = isNews ? state.companyItems : state.companyAnnouncements;

  // 公司过滤（兼容聚合后的 companies 数组）
  if (state.companyFilter !== 'all') {
    items = items.filter(item => {
      if (item.companyCode === state.companyFilter || item.companyName === state.companyFilter) return true;
      if (item.companies) {
        return item.companies.some(c => c.code === state.companyFilter || c.name === state.companyFilter);
      }
      return false;
    });
  }
  
  // 情感过滤（资讯和公告均支持）
  if (state.companySentimentFilter !== 'all') {
    items = items.filter(item => {
      const sentiment = state.companySentimentCache[item.id] || 'neutral';
      return sentiment === state.companySentimentFilter;
    });
  }

  if (items.length === 0) {
    const emptyMsg = state.companySentimentFilter !== 'all' 
      ? `📭 暂无${state.companySentimentFilter === 'positive' ? '利好' : state.companySentimentFilter === 'negative' ? '利空' : '中性'}资讯`
      : state.watchlist.length === 0 
        ? '⭐ 点击 ⭐ 添加关注公司' 
        : '📭 暂无匹配的公司资讯';
    container.innerHTML = `
      <div class="hs-empty">
        <p>${emptyMsg}</p>
        <p class="hs-empty-hint">${isNews ? '获取关注公司的热点资讯与公告信息' : '查看关注公司的公告信息'}</p>
      </div>`;
    return;
  }

  const displayItems = items.slice(0, 100);

  let html = '';
  displayItems.forEach((item, idx) => {
    // 重合度徽章
    const overlap = item.overlap || 1;
    const companyCount = item.companyCount || 1;
    const isHot = overlap >= 3;
    const isWarm = overlap >= 2 && !isHot;
    const overlapBadge = isHot ? `<span class="hs-hot-badge">🔥${overlap}源</span>` : isWarm ? `<span class="hs-warm-badge">📌${overlap}源</span>` : '';
    // 多公司关联徽章
    const multiCompanyBadge = companyCount > 1 ? `<span class="hs-item-source-badge overlap-count">${companyCount}家公司</span>` : '';

    // 公司名称标签（如果多公司关联，显示所有公司）
    const companies = item.companies || [{ name: item.companyName, code: item.companyCode }];
    const companyBadge = companies.map(c =>
      `<span class="hs-item-source-badge company">${c.name}</span>`
    ).join(' ');

    // 来源标签（超过3个来源时折叠显示）
    const sources = item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    let sourcesHtml;
    if (sources.length <= 3) {
      sourcesHtml = sources.map(s =>
        `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
      ).join(' ');
    } else {
      const firstTwo = sources.slice(0, 2).map(s =>
        `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
      ).join(' ');
      sourcesHtml = `${firstTwo} <span class="hs-item-source-badge overlap-count">+${sources.length - 2}源</span>`;
    }
    
    // 情感标签（资讯和公告均显示）
    let sentimentBadge = '';
    const sentiment = state.companySentimentCache[item.id];
    if (sentiment === 'positive') {
      sentimentBadge = '<span class="hs-sentiment-badge positive">🔴 利好</span>';
    } else if (sentiment === 'negative') {
      sentimentBadge = '<span class="hs-sentiment-badge negative">🟢 利空</span>';
    } else if (sentiment === 'neutral') {
      sentimentBadge = '<span class="hs-sentiment-badge neutral">⚪ 中性</span>';
    } else {
      sentimentBadge = '<span class="hs-sentiment-badge analyzing">⏳ 分析中...</span>';
    }

    // 公告类型标签
    const tagsHtml = (item.tags || []).map(t =>
      `<span class="hs-item-tag announcement">${t}</span>`
    ).join('');

    const overlapClass = overlap >= 3 ? 'hs-item-hot' : overlap >= 2 ? 'hs-item-warm' : '';
    html += `
      <div class="hs-item ${overlapClass}" data-company-idx="${idx}">
        <div class="hs-item-header">
          ${overlapBadge} ${multiCompanyBadge}
          <div class="hs-item-source">
            ${companyBadge}
            ${sourcesHtml}
            ${sentimentBadge}
            <span class="hs-item-time">${item.timeStr}</span>
          </div>
        </div>
        <div class="hs-item-title">${escapeHtml(item.title)}</div>
        ${item.summary && item.summary !== item.title ? `<div class="hs-item-summary">${escapeHtml(item.summary)}</div>` : ''}
        ${tagsHtml ? `<div class="hs-item-tags">${tagsHtml}</div>` : ''}
      </div>`;
  });

  container.innerHTML = html;
}

/**
 * 更新公司资讯刷新时间
 */

function updateCompanyUpdateTime() {
  const info = $('#hs-company-update-info');
  if (!info) return;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  info.textContent = `${timeStr}更新 · ${state.watchlist.length}家关注 · ${state.companyItems.length}资讯/${state.companyAnnouncements.length}公告`;
}

/**
 * 启动公司资讯自动刷新
 */

function startCompanyAutoRefresh() {
  stopCompanyAutoRefresh();
  const intervalMs = (state.hotspotConfig.interval || 5) * 60 * 1000;
  state.companyTimer = setInterval(() => {
    fetchCompanyData();
  }, intervalMs);
}

/**
 * 停止公司资讯自动刷新
 */

function stopCompanyAutoRefresh() {
  if (state.companyTimer) {
    clearInterval(state.companyTimer);
    state.companyTimer = null;
  }
}

// ======================== 选股器逻辑 ========================

