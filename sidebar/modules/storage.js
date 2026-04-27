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
