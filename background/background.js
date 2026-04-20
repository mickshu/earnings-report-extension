/**
 * 投资助手 - Background Service Worker
 * 
 * 核心职责：
 * 1. 管理侧边栏打开
 * 2. PDF 文件检测（tab URL 变化监听）
 * 3. PDF 二进制数据下载（background 有 host_permissions，不受 CORS 限制）
 * 4. 消息路由
 */

// 打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// 监听 tab 更新，检测 PDF
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url.toLowerCase();
    // 检测 PDF URL（直接打开、带查询参数、带锚点）
    if (url.endsWith('.pdf') || /\.pdf[?#]/i.test(tab.url) || url.includes('chrome://pdf-viewer')) {
      // 通知侧边栏
      broadcastToSidePanel({
        type: 'PDF_DETECTED',
        data: { url: tab.url, title: tab.title || '财报PDF', tabId }
      });
    }
  }
});

// 消息路由
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // 侧边栏请求：下载 PDF 二进制数据
  if (message.type === 'FETCH_PDF_DATA') {
    fetchPdfData(message.url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ error: err.message }));
    return true; // 保持消息通道
  }

  // Content script 通知：发现 PDF
  if (message.type === 'PDF_DETECTED') {
    broadcastToSidePanel({
      type: 'PDF_DETECTED',
      data: { ...message.data, tabId: sender.tab?.id }
    });
    sendResponse({ status: 'ok' });
  }

  // 侧边栏请求：获取当前 tab 信息
  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse(tabs[0] || null);
    });
    return true;
  }

  // 侧边栏请求：代理 fetch（绕过 CORS）
  if (message.type === 'HOTSPOT_FETCH') {
    const { url, options = {} } = message;
    const fetchOpts = {
      method: options.method || 'GET',
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, application/xml, application/rss+xml, text/xml, text/html, */*',
      }, options.headers || {}),
    };
    // 支持 POST body
    if (options.body) {
      fetchOpts.body = options.body;
    }
    fetch(url, fetchOpts)
      .then(async (resp) => {
        if (!resp.ok) {
          sendResponse({ error: `HTTP ${resp.status}`, status: resp.status });
          return;
        }
        const text = await resp.text();
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();

        // 判断是否为 RSS/XML 格式
        const isRSS = contentType.includes('xml') || contentType.includes('rss') ||
                      text.trim().startsWith('<?xml') || text.trim().startsWith('<rss') ||
                      text.trim().startsWith('<feed') || text.includes('<channel>');

        if (isRSS) {
          // 解析 RSS/Atom XML → 统一 JSON 结构
          try {
            const items = parseRSSXML(text, url);
            sendResponse({ data: { items }, format: 'rss', sourceUrl: url, status: resp.status });
          } catch (e) {
            // XML 解析失败，返回原始文本
            sendResponse({ data: text, format: 'xml-raw', sourceUrl: url, status: resp.status });
          }
        } else {
          // JSON 格式
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = text;
          }
          sendResponse({ data, format: 'json', sourceUrl: url, status: resp.status });
        }
      })
      .catch(err => {
        sendResponse({ error: err.message });
      });
    return true;
  }
});

/**
 * 在 background 中下载 PDF 文件
 * - background service worker 有 host_permissions: <all_urls>
 * - 不受 CORS 限制，可以直接 fetch 任意 URL
 * - 返回 ArrayBuffer 给 sidepanel 用 PDF.js 解析
 */
async function fetchPdfData(url) {
  try {
    // 处理 chrome://pdf-viewer/ 类型的 URL
    // 这类 URL 格式通常是: chrome://pdf-viewer/?src=https://example.com/file.pdf
    let actualUrl = url;
    if (url.includes('chrome://pdf-viewer')) {
      const srcParam = new URL(url).searchParams.get('src');
      if (srcParam) {
        actualUrl = srcParam;
      } else {
        return { error: '无法从 Chrome PDF 查看器获取原始 PDF 地址' };
      }
    }

    const response = await fetch(actualUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/pdf' }
    });

    if (!response.ok) {
      return { error: `下载 PDF 失败: HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      // 可能不是 PDF，但仍然尝试解析
      console.warn('[投资助手] Content-Type 不是 PDF:', contentType);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // 将 ArrayBuffer 转为普通数组以便通过消息传递
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 如果 PDF 太大（>20MB），分块传输
    const MAX_CHUNK = 10 * 1024 * 1024; // 10MB per chunk
    if (uint8Array.length > MAX_CHUNK) {
      const chunks = [];
      for (let i = 0; i < uint8Array.length; i += MAX_CHUNK) {
        chunks.push(Array.from(uint8Array.slice(i, i + MAX_CHUNK)));
      }
      return { chunks, totalLength: uint8Array.length, source: 'background-fetch' };
    }

    return { 
      data: Array.from(uint8Array), 
      source: 'background-fetch' 
    };
  } catch (err) {
    console.error('[投资助手] PDF下载失败:', err);
    return { error: `PDF下载失败: ${err.message}` };
  }
}

/**
 * 向侧边栏广播消息
 */
function broadcastToSidePanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // 侧边栏可能未打开，忽略
  });
}

/**
 * 解析 RSS/Atom XML 为统一 JSON 数组
 * 支持 RSS 2.0 和 Atom 格式
 */
function parseRSSXML(xmlText, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  // 检查解析错误
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML解析错误: ' + parseError.textContent.substring(0, 200));
  }

  const items = [];

  // 尝试 RSS 2.0 格式
  const rssItems = doc.querySelectorAll('item');
  if (rssItems.length > 0) {
    rssItems.forEach(item => {
      const title = getTextContent(item, 'title');
      const link = getLink(item);
      const description = getTextContent(item, 'description');
      const pubDate = getTextContent(item, 'pubDate') || getTextContent(item, 'dc\\:date') || getTextContent(item, 'date');
      const author = getTextContent(item, 'author') || getTextContent(item, 'dc\\:creator') || '';
      const category = getCategory(item);

      items.push({
        title: decodeHTMLEntities(title),
        url: link,
        summary: decodeHTMLEntities(stripHTML(description)).substring(0, 500),
        time: pubDate,
        source: author || extractSourceFromUrl(sourceUrl),
        category: category,
      });
    });
    return items;
  }

  // 尝试 Atom 格式
  const atomEntries = doc.querySelectorAll('entry');
  if (atomEntries.length > 0) {
    atomEntries.forEach(entry => {
      const title = getTextContent(entry, 'title');
      const link = entry.querySelector('link[href]')?.getAttribute('href') ||
                   entry.querySelector('link')?.getAttribute('href') || '';
      const content = getTextContent(entry, 'summary') || getTextContent(entry, 'content');
      const updated = getTextContent(entry, 'updated') || getTextContent(entry, 'published');
      const authorName = entry.querySelector('author > name')?.textContent || '';

      items.push({
        title: decodeHTMLEntities(title),
        url: link,
        summary: decodeHTMLEntities(stripHTML(content)).substring(0, 500),
        time: updated,
        source: authorName || extractSourceFromUrl(sourceUrl),
        category: '',
      });
    });
    return items;
  }

  return items;
}

function getTextContent(parent, tagName) {
  const el = parent.querySelector(tagName);
  return el ? el.textContent.trim() : '';
}

function getLink(item) {
  // RSS: <link> 可能在文本内容或 href 属性中
  const linkEl = item.querySelector('link');
  if (!linkEl) return '';
  return linkEl.textContent.trim() || linkEl.getAttribute('href') || '';
}

function getCategory(item) {
  const cats = item.querySelectorAll('category');
  return Array.from(cats).map(c => c.textContent.trim()).filter(Boolean).join(',');
}

function stripHTML(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHTMLEntities(text) {
  if (!text) return '';
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };
  return text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, m => entities[m] || m);
}

function extractSourceFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const sourceMap = {
      'rss.cls.cn': '财联社',
      'www.cls.cn': '财联社',
      'rss.eastmoney.com': '东方财富',
      'www.cninfo.com.cn': '巨潮资讯',
      'rss.wallstreetcn.com': '华尔街见闻',
      'finance.ifeng.com': '凤凰财经',
      'xueqiu.com': '雪球',
      'rss.jin10.com': '金十数据',
      'www.csrc.gov.cn': '证监会',
      'www.sse.com.cn': '上交所',
      'www.szse.cn': '深交所',
      'www.caixin.com': '财新',
      'm.21jingji.com': '21世纪经济',
      'cn.reuters.com': '路透社',
      'www.bloomberg.com.cn': '彭博',
      'rss.sina.com.cn': '新浪财经',
    };
    return sourceMap[host] || host;
  } catch (e) {
    return url;
  }
}
