// ======================== 热点资讯模块 (hotspot.js) ========================
// DOMAIN_KEYWORDS, DEFAULT_RSS_SOURCES 在 sidepanel.js 中定义

/**
 * 抓取财联社电报
 */
async function fetchCLSTelegraph() {
  try {
    const url = 'https://www.cls.cn/nodeapi/updateTelegraphList?app=CailianpressWeb&os=web&sv=8.4.2';
    const resp = await hotspotFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.cls.cn/telegraph',
      }
    });
    if (resp.error) return [];
    const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    const items = data?.data?.roll_data || [];
    return items.map(item => ({
      id: `cls_${item.id}`,
      source: '财联社',
      sourceType: 'cls',
      title: item.title || item.brief || '',
      summary: (item.content || item.brief || '').substring(0, 200),
      time: item.ctime ? new Date(item.ctime * 1000) : null,
      timeStr: item.ctime ? formatHSTime(new Date(item.ctime * 1000)) : '--',
      url: `https://www.cls.cn/telegraph?id=${item.id}`,
      stocks: (item.stock_list || []).map(s => s.name || s.code || '').filter(Boolean),
      tags: (item.tags || []).map(t => t.name || t).filter(Boolean),
      domains: [],  // 稍后分类
    }));
  } catch (e) {
    console.error('财联社抓取失败:', e);
    return [];
  }
}

/**
 * 抓取东方财富7×24资讯
 */
async function fetchEastmoneyNews() {
  try {
    const trace = Date.now();
    const url = `https://np-listapi.eastmoney.com/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=350&order=1&needInteractData=0&page_index=1&page_size=50&req_trace=${trace}`;
    const resp = await hotspotFetch(url);
    if (resp.error) return [];
    const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    const items = data?.data?.list || [];
    return items.map(item => ({
      id: `em_${item.code}`,
      source: item.mediaName || '东方财富',
      sourceType: 'eastmoney',
      title: item.title || '',
      summary: (item.summary || '').substring(0, 200),
      time: item.showTime ? new Date(item.showTime) : null,
      timeStr: item.showTime ? formatHSTime(new Date(item.showTime)) : '--',
      url: item.url || item.uniqueUrl || '',
      stocks: [],
      tags: [],
      domains: [],
    }));
  } catch (e) {
    console.error('东方财富抓取失败:', e);
    return [];
  }
}

/**
 * 抓取自定义数据源（RSS/JSON API）
 */
async function fetchCustomSource(sourceUrl, sourceName) {
  try {
    const resp = await hotspotFetch(sourceUrl);
    if (resp.error) return [];
    const name = sourceName || '自定义';
    const sourceType = 'custom';

    // RSS 格式（background 已解析为 {items: [...]}）
    if (resp.format === 'rss' && resp.data?.items) {
      return resp.data.items.map((item, idx) => ({
        id: `rss_${sourceUrl}_${idx}`,
        source: item.source || name,
        sourceType,
        title: item.title || '',
        summary: (item.summary || '').substring(0, 200),
        time: parseRSSDate(item.time),
        timeStr: '--',
        url: item.url || '',
        stocks: [],
        tags: (item.category || '').split(',').filter(Boolean),
        domains: [],
      }));
    }

    // JSON 格式
    const data = typeof resp.data === 'string' ? (() => { try { return JSON.parse(resp.data); } catch(e) { return null; } })() : resp.data;
    if (!data) return [];
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data?.data?.list) {
      items = data.data.list;
    } else if (data?.data?.items) {
      items = data.data.items;
    } else if (data?.data?.roll_data) {
      items = data.data.roll_data;
    } else if (data?.items) {
      items = data.items;
    }
    return items.map((item, idx) => ({
      id: `custom_${sourceUrl}_${idx}`,
      source: item.source || item.mediaName || name,
      sourceType,
      title: item.title || item.brief || '',
      summary: (item.summary || item.content || item.brief || '').substring(0, 200),
      time: item.time || item.ctime || item.showTime || item.pubDate ? new Date(item.time || item.ctime * 1000 || item.showTime || item.pubDate) : null,
      timeStr: '--',
      url: item.url || item.link || '',
      stocks: (item.stock_list || item.stocks || []).map(s => typeof s === 'string' ? s : s.name || s.code || '').filter(Boolean),
      tags: (item.tags || []).map(t => typeof t === 'string' ? t : t.name || t).filter(Boolean),
      domains: [],
    }));
  } catch (e) {
    console.error('数据源抓取失败:', sourceUrl, e);
    return [];
  }
}

/**
 * 解析 RSS 日期字符串
 */
function parseRSSDate(dateStr) {
  if (!dateStr) return null;
  // 常见 RSS 日期格式
  const formats = [
    /^\w{3}, \d{1,2} \w{3} \d{4}/,  // RFC 2822: Mon, 19 Apr 2026 14:30:00 +0800
    /^\d{4}-\d{2}-\d{2}T/,            // ISO 8601: 2026-04-19T14:30:00+08:00
    /^\d{4}-\d{2}-\d{2} /,            // 简单格式: 2026-04-19 14:30:00
  ];
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

/**
 * 格式化时间
 */
function formatHSTime(date) {
  if (!date || isNaN(date.getTime())) return '--';
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 对热点数据进行领域分类
 */
function classifyHotspot(item) {
  const text = `${item.title} ${item.summary} ${item.tags.join(' ')} ${item.stocks.join(' ')}`.toLowerCase();
  const domains = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        domains.push(domain);
        break;
      }
    }
  }
  // 检查额外关键词
  const extraKws = state.hotspotConfig.extraKeywords || [];
  if (extraKws.length > 0) {
    for (const kw of extraKws) {
      if (text.includes(kw.toLowerCase())) {
        if (!domains.includes('custom-kw')) domains.push('custom-kw');
        break;
      }
    }
  }
  return domains;
}

/**
 * 合并去重热点数据
 */
function mergeHotspotItems(existing, incoming) {
  const existingIds = new Set(existing.map(i => i.id));
  const newItems = incoming.filter(i => !existingIds.has(i.id));
  // 对新数据做领域分类
  newItems.forEach(item => {
    item.domains = classifyHotspot(item);
    if (item.time && !isNaN(item.time.getTime())) {
      item.timeStr = formatHSTime(item.time);
    }
  });
  return [...newItems, ...existing].slice(0, 500); // 最多保留500条
}

/**
 * 执行全量抓取
 */
async function fetchAllHotspots() {
  const loading = $('#hs-loading');
  const loadingText = $('#hs-loading-text');
  if (loading) {
    loading.style.display = '';
    loadingText.textContent = '正在获取热点信息...';
  }

  let allItems = [];
  const config = state.hotspotConfig;

  // 并行抓取各数据源
  const tasks = [];

  // 内置 API 数据源
  if (config.clsEnabled) {
    tasks.push(fetchCLSTelegraph());
  }
  if (config.eastmoneyEnabled) {
    tasks.push(fetchEastmoneyNews());
  }

  // 默认 RSS 数据源
  const enabledRSS = DEFAULT_RSS_SOURCES.filter(s => s.enabled);
  for (const src of enabledRSS) {
    tasks.push(fetchCustomSource(src.url, src.name));
  }

  // 用户自定义数据源
  for (const src of (config.customSources || [])) {
    if (src.trim()) tasks.push(fetchCustomSource(src.trim()));
  }

  try {
    const results = await Promise.allSettled(tasks);
    results.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allItems = allItems.concat(r.value);
      }
    });
  } catch (e) {
    console.error('热点抓取异常:', e);
  }

  // 合并去重
  state.hotspotItems = mergeHotspotItems(state.hotspotItems, allItems);

  // 过滤：只保留24小时内的资讯
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  state.hotspotItems = state.hotspotItems.filter(item => {
    if (!item.time) return true; // 无时间的保留
    return (now - item.time.getTime()) < oneDayMs;
  });

  // 重合检测：计算每条新闻的重合度（被多少个不同数据源报道）
  computeHotspotOverlap(state.hotspotItems);

  // 排序：重合度高的排前面，相同重合度按时间排
  state.hotspotItems.sort((a, b) => {
    const overlapDiff = (b.overlap || 0) - (a.overlap || 0);
    if (overlapDiff !== 0) return overlapDiff;
    const ta = a.time?.getTime() || 0;
    const tb = b.time?.getTime() || 0;
    return tb - ta;
  });

  if (loading) loading.style.display = 'none';

  // 更新UI
  renderHotspotList();
  updateHSUpdateTime();
}

/**
 * 计算热点重合度并合并重复新闻
 * 原理：如果多条新闻标题/内容高度相似，说明多个数据源都在报道同一事件
 * 重合度越高，说明该事件越受关注
 * 合并逻辑：相似新闻只保留1条，来源信息合并展示
 */
function computeHotspotOverlap(items) {
  // 提取标题关键词（去停用词后）
  const stopWords = new Set(['的', '了', '在', '是', '和', '与', '对', '将', '被', '有', '也', '不', '这', '该', '为', '及', '等', '中', '上', '下', '后', '前', '从', '到', '以', '或', '可', '其', '已', '一', '个']);

  function extractKeywords(title) {
    if (!title) return [];
    // 简单分词：按标点和空格分割，过滤停用词和短词
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
    for (const w of set1) {
      if (set2.has(w)) common++;
    }
    // Jaccard 相似度
    return common / (set1.size + set2.size - common);
  }

  // 先初始化关键词和来源列表
  items.forEach(item => {
    item._keywords = extractKeywords(item.title);
    // 确保 sources 数组存在，初始包含自身来源信息
    if (!item.sources) {
      item.sources = [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    }
    item._merged = false; // 标记是否已被合并
  });

  // 并查集：记录哪些索引属于同一组
  const parent = items.map((_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // 两两比较全量覆盖（关键词数量预过滤优化，O(kn²) → 实际接近 O(n log n)）
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      // 预过滤：关键词数量差距超过 60% 的直接跳过
      const ki = items[i]._keywords.length;
      const kj = items[j]._keywords.length;
      if (ki === 0 || kj === 0) continue;
      const lenRatio = Math.min(ki, kj) / Math.max(ki, kj);
      if (lenRatio < 0.4) continue;
      
      const sim = similarity(items[i]._keywords, items[j]._keywords);
      if (sim >= 0.35) {
        // 相似度 ≥ 0.35 → 合并到同一组（降低阈值提高召回）
        union(i, j);
      }
    }
  }

  // 按组聚合：每组只保留一条（选最早的），合并来源信息
  const groups = new Map(); // root index -> [item indices]
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }

  const mergedItems = [];
  for (const [root, indices] of groups) {
    // 按时间排序，选最早的一条作为主条目
    const groupItems = indices.map(i => items[i]);
    groupItems.sort((a, b) => {
      const ta = a.time?.getTime() || 0;
      const tb = b.time?.getTime() || 0;
      return ta - tb; // 时间早的排前面
    });

    const primary = groupItems[0];
    // 合并所有来源信息
    const allSources = [];
    const seenSourceNames = new Set();
    for (const item of groupItems) {
      const srcName = item.source;
      if (!seenSourceNames.has(srcName)) {
        seenSourceNames.add(srcName);
        allSources.push({ source: srcName, sourceType: item.sourceType, url: item.url });
      }
      // 也合并 sources 子数组（如果之前已经合并过）
      if (item.sources) {
        for (const s of item.sources) {
          if (!seenSourceNames.has(s.source)) {
            seenSourceNames.add(s.source);
            allSources.push(s);
          }
        }
      }
    }

    primary.sources = allSources;
    primary.overlap = allSources.length; // 来源数量即重合度
    // 如果有多条新闻，用最完整的 summary
    for (const item of groupItems) {
      if (item.summary && item.summary.length > (primary.summary || '').length) {
        primary.summary = item.summary;
      }
    }
    // 合并领域标签
    const allDomains = new Set(primary.domains || []);
    for (const item of groupItems) {
      for (const d of (item.domains || [])) allDomains.add(d);
    }
    primary.domains = [...allDomains];

    mergedItems.push(primary);
  }

  // 替换原数组内容
  items.length = 0;
  mergedItems.forEach(item => items.push(item));

  // 清理临时字段
  items.forEach(item => { delete item._keywords; delete item._merged; });
}

/**
 * 渲染热点列表
 */
function renderHotspotList() {
  const container = $('#hs-list');
  if (!container) return;

  let items = state.hotspotItems;

  // 领域过滤
  if (state.hotspotFilter !== 'all') {
    items = items.filter(item => item.domains.includes(state.hotspotFilter));
  }

  // 搜索过滤
  if (state.hotspotSearch) {
    const kw = state.hotspotSearch.toLowerCase();
    items = items.filter(item =>
      item.title.toLowerCase().includes(kw) ||
      item.summary.toLowerCase().includes(kw) ||
      item.stocks.some(s => s.toLowerCase().includes(kw))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="hs-empty">
        <p>${state.hotspotItems.length === 0 ? '🔥 点击 🔄 加载热点信息' : '📭 当前过滤条件下无匹配热点'}</p>
        <p class="hs-empty-hint">聚焦 半导体 · 新能源 · AI科技 · 机器人 · 核电 · 伊朗战况</p>
      </div>`;
    return;
  }

  // 最多显示100条
  const displayItems = items.slice(0, 100);

  let html = '';
  displayItems.forEach((item, idx) => {
    // 领域标签
    const domainLabels = {
      semiconductor: '半导体',
      'new-energy': '新能源',
      'ai-tech': 'AI科技',
      robot: '机器人',
      nuclear: '核电',
      iran: '伊朗战况',
      'custom-kw': '关键词',
    };

    const tagsHtml = item.domains
      .filter(d => d !== 'custom-kw' || state.hotspotConfig.extraKeywords.length > 0)
      .map(d => `<span class="hs-item-tag ${d}">${domainLabels[d] || d}</span>`)
      .join('');

    const stocksHtml = item.stocks.slice(0, 5)
      .map(s => `<span class="hs-item-stock">${s}</span>`)
      .join('');

    // 重合度高 → 加红加粗 + 热度标记
    const overlap = item.overlap || 1;
    const isHot = overlap >= 3;  // 3个及以上数据源报道
    const isWarm = overlap >= 2 && !isHot; // 2个数据源报道
    const hotClass = isHot ? 'hs-item-hot' : isWarm ? 'hs-item-warm' : '';
    const hotBadge = isHot ? `<span class="hs-hot-badge">🔥${overlap}源</span>` : isWarm ? `<span class="hs-warm-badge">📌${overlap}源</span>` : '';

    // 多来源展示（超过3个来源时折叠显示）
    const sources = item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    let sourcesHtml;
    if (sources.length <= 3) {
      sourcesHtml = sources.map(s =>
        `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
      ).join(' ');
    } else {
      // 3个以上来源：显示前2个 + 计数
      const firstTwo = sources.slice(0, 2).map(s =>
        `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
      ).join(' ');
      sourcesHtml = `${firstTwo} <span class="hs-item-source-badge overlap-count">+${sources.length - 2}源</span>`;
    }

    // 使用 data-idx 索引方式，避免内联 onclick 和 URL 转义问题
    html += `
      <div class="hs-item ${hotClass}" data-idx="${idx}">
        <div class="hs-item-header">
          <div class="hs-item-source">
            ${sourcesHtml}
            <span class="hs-item-time">${item.timeStr}</span>
          </div>
          ${hotBadge}
        </div>
        <div class="hs-item-title">${escapeHtml(item.title)}</div>
        ${item.summary && item.summary !== item.title ? `<div class="hs-item-summary">${escapeHtml(item.summary)}</div>` : ''}
        ${tagsHtml || stocksHtml ? `
          <div class="hs-item-tags">${tagsHtml}</div>
          ${stocksHtml ? `<div class="hs-item-stocks">${stocksHtml}</div>` : ''}
        ` : ''}
      </div>`;
  });

  container.innerHTML = html;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 更新刷新时间显示
 */
function updateHSUpdateTime() {
  const info = $('#hs-update-info');
  if (!info) return;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const matchCount = state.hotspotItems.length;
  const filteredCount = state.hotspotFilter !== 'all'
    ? state.hotspotItems.filter(i => i.domains.includes(state.hotspotFilter)).length
    : matchCount;
  const hotCount = state.hotspotItems.filter(i => (i.overlap || 0) >= 3).length;
  const enabledSources = (state.hotspotConfig.clsEnabled ? 1 : 0) +
    (state.hotspotConfig.eastmoneyEnabled ? 1 : 0) +
    DEFAULT_RSS_SOURCES.filter(s => s.enabled).length;
  info.innerHTML = `<span class="hs-auto-refresh"><span class="hs-auto-refresh-dot"></span> 自动</span> ${timeStr}更新 · ${enabledSources}源 · ${hotCount}热点/${filteredCount}条`;
}

/**
 * 启动自动刷新
 */
function startHotspotAutoRefresh() {
  stopHotspotAutoRefresh();
  const intervalMs = (state.hotspotConfig.interval || 5) * 60 * 1000;
  state.hotspotTimer = setInterval(() => {
    fetchAllHotspots();
  }, intervalMs);
  updateHSUpdateTime();
}

/**
 * 停止自动刷新
 */
function stopHotspotAutoRefresh() {
  if (state.hotspotTimer) {
    clearInterval(state.hotspotTimer);
    state.hotspotTimer = null;
  }
}

/**
 * 保存热点配置
 */
function saveHotspotConfig() {
  // 收集 RSS 源启用状态
  const rssEnabled = {};
  $$('#hs-rss-sources .hs-rss-source-item input[type="checkbox"]').forEach(cb => {
    rssEnabled[cb.dataset.url] = cb.checked;
  });

  const config = {
    interval: parseInt($('#hs-refresh-interval').value) || 5,
    clsEnabled: $('#hs-src-cls').checked,
    eastmoneyEnabled: $('#hs-src-eastmoney').checked,
    customSources: $('#hs-sources').value.split('\n').map(s => s.trim()).filter(Boolean),
    extraKeywords: $('#hs-extra-keywords').value.split('\n').map(s => s.trim()).filter(Boolean),
    rssEnabled: rssEnabled,
  };
  state.hotspotConfig = config;

  // 同步 RSS 启用状态到 DEFAULT_RSS_SOURCES
  DEFAULT_RSS_SOURCES.forEach(src => {
    if (rssEnabled[src.url] !== undefined) {
      src.enabled = rssEnabled[src.url];
    }
  });

  chrome.storage.local.set({ hotspotConfig: config });
  startHotspotAutoRefresh();
  showToast('✅ 热点配置已保存');
}

/**
 * 渲染 RSS 数据源列表
 */
function renderRSSSourceList() {
  const container = $('#hs-rss-sources');
  if (!container) return;

  const savedRSS = state.hotspotConfig.rssEnabled || {};

  container.innerHTML = DEFAULT_RSS_SOURCES.map((src, idx) => {
    const checked = savedRSS[src.url] !== undefined ? savedRSS[src.url] : src.enabled;
    return `
      <div class="hs-rss-source-item">
        <input type="checkbox" data-url="${src.url}" ${checked ? 'checked' : ''} id="hs-rss-${idx}">
        <label for="hs-rss-${idx}" class="hs-rss-source-name">${src.name}</label>
        <span class="hs-rss-source-url" title="${src.url}">${src.url.replace(/^https?:\/\//, '').substring(0, 30)}</span>
      </div>`;
  }).join('');
}

/**
 * 加载热点配置
 */
function loadHotspotConfig() {
  chrome.storage.local.get('hotspotConfig', (result) => {
    if (result.hotspotConfig) {
      Object.assign(state.hotspotConfig, result.hotspotConfig);
      // 恢复 RSS 启用状态到 DEFAULT_RSS_SOURCES
      const savedRSS = state.hotspotConfig.rssEnabled || {};
      DEFAULT_RSS_SOURCES.forEach(src => {
        if (savedRSS[src.url] !== undefined) {
          src.enabled = savedRSS[src.url];
        }
      });
      // 同步到UI
      const ri = $('#hs-refresh-interval');
      const sc = $('#hs-src-cls');
      const se = $('#hs-src-eastmoney');
      const ss = $('#hs-sources');
      const ek = $('#hs-extra-keywords');
      if (ri) ri.value = state.hotspotConfig.interval || 5;
      if (sc) sc.checked = state.hotspotConfig.clsEnabled !== false;
      if (se) se.checked = state.hotspotConfig.eastmoneyEnabled !== false;
      if (ss) ss.value = (state.hotspotConfig.customSources || []).join('\n');
      if (ek) ek.value = (state.hotspotConfig.extraKeywords || []).join('\n');
    }
  });
}

/**
 * 绑定热点模块事件
 */
function bindHotspotEvents() {
  // 刷新按钮
  $('#btn-hs-refresh')?.addEventListener('click', () => fetchAllHotspots());

  // 热点列表点击事件委托（避免内联 onclick 和 URL 转义问题）
  $('#hs-list')?.addEventListener('click', (e) => {
    const hsItem = e.target.closest('.hs-item[data-idx]');
    if (!hsItem) return;
    const idx = parseInt(hsItem.dataset.idx, 10);
    // 从当前过滤后的列表中获取实际展示的 items
    let items = state.hotspotItems;
    if (state.hotspotFilter !== 'all') {
      items = items.filter(item => item.domains.includes(state.hotspotFilter));
    }
    if (state.hotspotSearch) {
      const kw = state.hotspotSearch.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(kw) ||
        item.summary.toLowerCase().includes(kw) ||
        item.stocks.some(s => s.toLowerCase().includes(kw))
      );
    }
    const displayItems = items.slice(0, 100);
    const item = displayItems[idx];
    if (!item) return;
    // 优先使用第一个来源的 URL，否则用 item 自身的 url
    const url = (item.sources && item.sources[0]?.url) || item.url;
    if (url) {
      chrome.tabs.create({ url, active: true });
    }
  });

  // 领域过滤
  $$('.hs-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.hs-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.hotspotFilter = chip.dataset.domain;
      renderHotspotList();
    });
  });

  // 配置弹窗
  $('#btn-hs-config')?.addEventListener('click', () => {
    loadHotspotConfig(); // 刷新配置到UI
    renderRSSSourceList(); // 渲染RSS源列表
    $('#hs-config-modal').style.display = '';
  });
  $('#btn-hs-config-close')?.addEventListener('click', () => {
    $('#hs-config-modal').style.display = 'none';
  });
  $('#btn-hs-config-cancel')?.addEventListener('click', () => {
    $('#hs-config-modal').style.display = 'none';
  });
  $('#btn-hs-config-save')?.addEventListener('click', () => {
    saveHotspotConfig();
    $('#hs-config-modal').style.display = 'none';
  });

  // 搜索弹窗
  $('#btn-hs-filter')?.addEventListener('click', () => {
    $('#hs-filter-modal').style.display = '';
    setTimeout(() => $('#hs-search-input')?.focus(), 100);
  });
  $('#btn-hs-filter-close')?.addEventListener('click', () => {
    $('#hs-filter-modal').style.display = 'none';
  });
  $('#hs-search-input')?.addEventListener('input', (e) => {
    state.hotspotSearch = e.target.value.trim();
    // 在弹窗内搜索预览
    const resultsDiv = $('#hs-search-results');
    if (!state.hotspotSearch) {
      resultsDiv.innerHTML = '<div class="hs-search-empty">输入关键词搜索</div>';
      return;
    }
    const kw = state.hotspotSearch.toLowerCase();
    const matched = state.hotspotItems.filter(item =>
      item.title.toLowerCase().includes(kw) ||
      item.summary.toLowerCase().includes(kw) ||
      item.stocks.some(s => s.toLowerCase().includes(kw))
    ).slice(0, 20);

    if (matched.length === 0) {
      resultsDiv.innerHTML = '<div class="hs-search-empty">未找到匹配结果</div>';
      return;
    }

    resultsDiv.innerHTML = matched.map((item, idx) => {
      const sources = item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }];
      const sourcesHtml = sources.map(s =>
        `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
      ).join(' ');
      return `
      <div class="hs-item" data-search-idx="${idx}">
        <div class="hs-item-header">
          <div class="hs-item-source">
            ${sourcesHtml}
            <span class="hs-item-time">${item.timeStr}</span>
          </div>
        </div>
        <div class="hs-item-title">${escapeHtml(item.title)}</div>
      </div>
    `;
    }).join('');
  });

  // 搜索结果点击事件委托
  $('#hs-search-results')?.addEventListener('click', (e) => {
    const hsItem = e.target.closest('.hs-item[data-search-idx]');
    if (!hsItem) return;
    const idx = parseInt(hsItem.dataset.searchIdx, 10);
    const kw = (state.hotspotSearch || '').toLowerCase();
    const matched = state.hotspotItems.filter(item =>
      item.title.toLowerCase().includes(kw) ||
      item.summary.toLowerCase().includes(kw) ||
      item.stocks.some(s => s.toLowerCase().includes(kw))
    ).slice(0, 20);
    const item = matched[idx];
    if (!item) return;
    const url = (item.sources && item.sources[0]?.url) || item.url;
    if (url) {
      chrome.tabs.create({ url, active: true });
    }
  });

  // 点击弹窗背景关闭
  $('#hs-config-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  $('#hs-filter-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  $('#hs-watchlist-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // 子标签切换
  $$('.hs-sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.hs-sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.hotspotSubTab = tab.dataset.subtab;
      $$('.hs-sub-panel').forEach(p => p.classList.remove('active'));
      $(`#hs-${state.hotspotSubTab}-panel`).classList.add('active');
    });
  });

  // 关注公司管理 - 跳转到设置面板
  $('#btn-hs-watchlist')?.addEventListener('click', () => {
    showSettings();
  });

  // 添加关注公司
  $('#btn-hs-watchlist-add')?.addEventListener('click', () => addWatchlistCompany());
  $('#hs-watchlist-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addWatchlistCompany();
  });

  // 关注公司搜索提示
  let watchlistSuggestTimer = null;
  $('#hs-watchlist-input')?.addEventListener('input', (e) => {
    clearTimeout(watchlistSuggestTimer);
    const val = e.target.value.trim();
    if (!val) {
      $('#hs-watchlist-suggest').style.display = 'none';
      return;
    }
    watchlistSuggestTimer = setTimeout(() => searchWatchlistStock(val), 300);
  });

  // 公司资讯刷新
  $('#btn-hs-company-refresh')?.addEventListener('click', () => fetchCompanyData());

  // 公司过滤标签
  $('#hs-company-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.hs-chip');
    if (!chip) return;
    $('#hs-company-chips').querySelectorAll('.hs-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.companyFilter = chip.dataset.company;
    renderCompanyList();
  });

  // 资讯/公告切换
  $$('.hs-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.hs-type-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.companyTypeFilter = tab.dataset.type;
      // 切换到公告时隐藏情感筛选
      if (tab.dataset.type === 'announcement') {
        const sentimentTabs = $$('.hs-sentiment-tab');
        if (sentimentTabs.length > 0) {
          sentimentTabs.forEach(t => t.style.display = 'none');
        }
      } else {
        const sentimentTabs = $$('.hs-sentiment-tab');
        if (sentimentTabs.length > 0) {
          sentimentTabs.forEach(t => t.style.display = '');
        }
      }
      renderCompanyList();
    });
  });
  
  // 情感筛选标签
  $('#hs-sentiment-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.hs-sentiment-tab');
    if (!chip) return;
    $$('.hs-sentiment-tab').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.companySentimentFilter = chip.dataset.sentiment;
    renderCompanyList();
  });

  // 公司列表点击事件委托
  $('#hs-company-list')?.addEventListener('click', (e) => {
    const hsItem = e.target.closest('.hs-item[data-company-idx]');
    if (!hsItem) return;
    const idx = parseInt(hsItem.dataset.companyIdx, 10);
    const isNews = state.companyTypeFilter === 'news';
    let items = isNews ? state.companyItems : state.companyAnnouncements;
    // 与 renderCompanyList 保持一致的过滤逻辑（兼容聚合后的 companies 数组）
    if (state.companyFilter !== 'all') {
      items = items.filter(item => {
        if (item.companyCode === state.companyFilter || item.companyName === state.companyFilter) return true;
        // 聚合后的条目可能包含多公司关联
        if (item.companies) {
          return item.companies.some(c => c.code === state.companyFilter || c.name === state.companyFilter);
        }
        return false;
      });
    }
    if (isNews && state.companySentimentFilter !== 'all') {
      items = items.filter(item => {
        const sentiment = state.companySentimentCache[item.id] || 'neutral';
        return sentiment === state.companySentimentFilter;
      });
    }
    const item = items[idx];
    if (!item) return;
    const url = (item.sources && item.sources[0]?.url) || item.url;
    if (url) {
      chrome.tabs.create({ url, active: true });
    }
  });
}
