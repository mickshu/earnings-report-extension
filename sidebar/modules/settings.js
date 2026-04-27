// ======================== 设置与数据管理模块 (settings.js) ========================
// 抽取自 sidepanel.js，管理设置面板、模型服务、数据导入导出

// ======================== 数据管理功能 ========================

/**
 * 导出配置数据
 */
function exportSettings() {
  try {
    const jsonData = StorageManager.exportSettings();
    if (!jsonData) {
      showToast('没有可导出的配置');
      return;
    }
    
    // 解析配置数据
    const configData = JSON.parse(jsonData);
    
    // 添加情感缓存（如果存在）
    try {
      const sentimentCache = localStorage.getItem('er_sentiment_cache');
      if (sentimentCache) {
        configData._sentimentCache = JSON.parse(sentimentCache);
      }
    } catch (e) {
      console.warn('导出情感缓存失败:', e);
    }
    
    // 创建下载文件
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investment-assistant-config-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 显示Token节省统计
    const stats = getSentimentCacheStats();
    let tokenMsg = '';
    if (stats.valid > 0) {
      const estimatedTokens = stats.valid * 150; // 每条约150 tokens
      const estimatedCost = (estimatedTokens / 1000 * 0.001).toFixed(4); // 假设$0.001/1K tokens
      tokenMsg = `\n\n💰 情感缓存：${stats.valid}条有效缓存，预计节省${estimatedTokens} tokens（约$${estimatedCost}）`;
    }
    
    showToast(`✅ 配置已导出${tokenMsg}`);
  } catch (e) {
    console.error('导出配置失败:', e);
    showToast('导出配置失败');
  }
}

/**
 * 导入配置数据
 */
function importSettings(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = e.target.result;
      const parsed = JSON.parse(jsonData);
      
      // 提取情感缓存（如果存在）
      let sentimentCache = null;
      if (parsed._sentimentCache) {
        sentimentCache = parsed._sentimentCache;
        delete parsed._sentimentCache; // 从配置中移除
      }
      
      // 导入配置
      const success = StorageManager.importSettings(JSON.stringify(parsed));
      if (success) {
        // 恢复情感缓存
        if (sentimentCache && Object.keys(sentimentCache).length > 0) {
          localStorage.setItem('er_sentiment_cache', JSON.stringify(sentimentCache));
        }
        
        showToast('✅ 配置已导入，页面将刷新');
        setTimeout(() => location.reload(), 1000);
      } else {
        showToast('导入失败：数据格式无效');
      }
    } catch (err) {
      console.error('导入配置失败:', err);
      showToast('导入失败：文件格式错误');
    }
  };
  reader.readAsText(file);
}

/**
 * 清除所有设置
 */
function clearAllSettings() {
  if (!confirm('确定要清除所有配置数据吗？此操作不可恢复！')) {
    return;
  }
  
  if (!confirm('再次确认：清除后需要重新配置所有模型服务和关注公司')) {
    return;
  }
  
  StorageManager.clearSettings();
  
  // 同时清除情感缓存
  localStorage.removeItem('er_sentiment_cache');
  
  showToast('✅ 所有数据已清除，页面将刷新');
  setTimeout(() => location.reload(), 1000);
}

/**
 * 获取情感缓存统计信息
 */
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

/**
 * 显示存储信息
 */
function showStorageInfo() {
  const container = $('#storage-info');
  if (!container) return;
  
  const settings = localStorage.getItem('er_settings');
  const watchlist = localStorage.getItem('er_watchlist');
  const settingsSize = settings ? (new Blob([settings]).size / 1024).toFixed(2) : '0';
  const watchlistSize = watchlist ? (new Blob([watchlist]).size / 1024).toFixed(2) : '0';
  
  let settingsInfo = '未配置';
  let version = '未知';
  let lastSaved = '未知';
  
  if (settings) {
    try {
      const data = JSON.parse(settings);
      settingsInfo = `${data.services?.length || 0}个模型服务`;
      version = data._version || '未知';
      lastSaved = data._lastSaved ? new Date(data._lastSaved).toLocaleString('zh-CN') : '未知';
    } catch (e) {}
  }
  
  let watchlistCount = 0;
  if (watchlist) {
    try {
      const data = JSON.parse(watchlist);
      watchlistCount = (data.items || data).length || 0;
    } catch (e) {}
  }
  
  container.innerHTML = `
    <div class="storage-info-item">
      <span class="storage-info-label">数据版本</span>
      <span class="storage-info-value">${version}</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">模型服务</span>
      <span class="storage-info-value">${settingsInfo}</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">关注公司</span>
      <span class="storage-info-value">${watchlistCount}家</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">配置大小</span>
      <span class="storage-info-value">${settingsSize} KB</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">关注列表大小</span>
      <span class="storage-info-value">${watchlistSize} KB</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">最后保存</span>
      <span class="storage-info-value">${lastSaved}</span>
    </div>
    <div class="storage-info-item">
      <span class="storage-info-label">备份状态</span>
      <span class="storage-info-value" style="color:var(--success)">✓ 已启用chrome.storage备份</span>
    </div>
  `;
}
