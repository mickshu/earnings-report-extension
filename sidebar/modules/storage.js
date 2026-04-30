// ======================== 缓存管理扩展 (storage.js) ========================
// StorageManager, WatchlistStorage 在 sidepanel.js 中定义

function getSentimentCacheStats() {
  try {
    const cache = JSON.parse(localStorage.getItem('er_sentiment_cache') || '{}');
    const keys = Object.keys(cache);
    const now = Date.now();
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    
    let validCount = 0;
    let expiredCount = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    keys.forEach(key => {
      const item = cache[key];
      const age = now - (item.timestamp || 0);
      
      if (age < CACHE_TTL) {
        validCount++;
        if (item.sentiment === 'positive') positiveCount++;
        else if (item.sentiment === 'negative') negativeCount++;
        else neutralCount++;
      } else {
        expiredCount++;
      }
    });
    
    return {
      total: keys.length,
      valid: validCount,
      expired: expiredCount,
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      size: new Blob([JSON.stringify(cache)]).size
    };
  } catch (e) {
    return { total: 0, valid: 0, expired: 0, positive: 0, negative: 0, neutral: 0, size: 0 };
  }
}

/**
 * 清理过期的情感缓存
 */
function cleanExpiredSentimentCache() {
  try {
    const cache = JSON.parse(localStorage.getItem('er_sentiment_cache') || '{}');
    const now = Date.now();
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    
    let cleanedCount = 0;
    Object.keys(cache).forEach(key => {
      const age = now - (cache[key].timestamp || 0);
      if (age >= CACHE_TTL) {
        delete cache[key];
        cleanedCount++;
      }
    });
    
    localStorage.setItem('er_sentiment_cache', JSON.stringify(cache));
    return cleanedCount;
  } catch (e) {
    console.error('清理情感缓存失败:', e);
    return 0;
  }
}

/**
 * 清空所有情感缓存
 */
function clearSentimentCache() {
  localStorage.removeItem('er_sentiment_cache');
  state.companySentimentCache = {};
  showToast('✅ 情感缓存已清空');
}

// ======================== 报告存储管理 (ReportStorage) ========================

const ReportStorage = {
  STORAGE_KEY: 'er_saved_reports',

  /** 保存报告（去重：同 type+code+date+style 覆盖旧记录） */
  async save(record) {
    try {
      const data = await new Promise(resolve => {
        chrome.storage.local.get(ReportStorage.STORAGE_KEY, result => {
          resolve(result[ReportStorage.STORAGE_KEY] || { version: '1.0', reports: [] });
        });
      });
      // 去重：相同 type+code+date+style 视为同一份报告，覆盖
      const idx = data.reports.findIndex(r =>
        r.type === record.type && r.code === record.code &&
        r.date === record.date && r.style === record.style
      );
      if (idx >= 0) {
        data.reports[idx] = record;
      } else {
        data.reports.push(record);
      }
      data.lastUpdated = new Date().toISOString();
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [ReportStorage.STORAGE_KEY]: data }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
      return true;
    } catch (e) {
      console.error('ReportStorage.save 失败:', e);
      return false;
    }
  },

  /** 加载所有报告 */
  async loadAll() {
    try {
      const data = await new Promise(resolve => {
        chrome.storage.local.get(ReportStorage.STORAGE_KEY, result => {
          resolve(result[ReportStorage.STORAGE_KEY]);
        });
      });
      return (data && Array.isArray(data.reports)) ? data.reports : [];
    } catch (e) {
      console.error('ReportStorage.loadAll 失败:', e);
      return [];
    }
  },

  /** 按ID获取单条报告 */
  async getById(id) {
    const reports = await ReportStorage.loadAll();
    return reports.find(r => r.id === id) || null;
  },

  /** 按ID删除报告 */
  async delete(id) {
    try {
      const data = await new Promise(resolve => {
        chrome.storage.local.get(ReportStorage.STORAGE_KEY, result => {
          resolve(result[ReportStorage.STORAGE_KEY] || { version: '1.0', reports: [] });
        });
      });
      data.reports = data.reports.filter(r => r.id !== id);
      data.lastUpdated = new Date().toISOString();
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [ReportStorage.STORAGE_KEY]: data }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
      return true;
    } catch (e) {
      console.error('ReportStorage.delete 失败:', e);
      return false;
    }
  },

  /** 获取统计信息 */
  async getStats() {
    const reports = await ReportStorage.loadAll();
    return {
      financial: reports.filter(r => r.type === 'financial').length,
      stock: reports.filter(r => r.type === 'stock').length,
      total: reports.length
    };
  }
};
