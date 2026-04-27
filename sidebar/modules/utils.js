// ======================== 公共工具模块 (utils.js) ========================
// $, $$ 在 sidepanel.js 中定义，此处定义业务无关的工具函数

async function hotspotFetch(url, options = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'HOTSPOT_FETCH', url, options },
      (resp) => {
        if (chrome.runtime.lastError || !resp) {
          resolve({ error: chrome.runtime.lastError?.message || '无响应' });
        } else {
          resolve(resp);
        }
      }
    );
  });
}

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

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatYi(v) {
  if (v == null) return '--';
  if (Math.abs(v) >= 1) return `${v.toFixed(2)}亿`;
  if (Math.abs(v) >= 0.01) return `${(v * 10000).toFixed(0)}万`;
  return `${v.toFixed(4)}亿`;
}
