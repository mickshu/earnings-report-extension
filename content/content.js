/**
 * 财报解读助手 - Content Script（轻量版）
 * 
 * 唯一职责：在普通网页中检测 embed/iframe PDF，通知 background
 * 
 * 注意：Chrome 内置 PDF 查看器（chrome://pdf-viewer/）无法注入 content script，
 * 所以 PDF 的实际下载和解析在 background + sidepanel 中完成。
 * 此脚本仅作为补充信号源。
 */

// 检测嵌入在普通网页中的 PDF
function detectEmbeddedPDF() {
  const embed = document.querySelector('embed[type="application/pdf"]');
  const obj = document.querySelector('object[type="application/pdf"]');
  const iframe = document.querySelector('iframe[src*=".pdf"]');

  let pdfUrl = null;
  if (embed && embed.src) pdfUrl = embed.src;
  else if (obj && obj.data) pdfUrl = obj.data;
  else if (iframe && iframe.src) pdfUrl = iframe.src;

  if (pdfUrl) {
    chrome.runtime.sendMessage({
      type: 'PDF_DETECTED',
      data: { url: pdfUrl, title: document.title || '嵌入PDF' }
    }).catch(() => {});
  }
}

// 页面加载后检测
if (document.readyState === 'complete') {
  detectEmbeddedPDF();
} else {
  window.addEventListener('load', detectEmbeddedPDF);
}
