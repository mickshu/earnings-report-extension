// ======================== 全局State扩展 (state.js) ========================
// state 对象在 sidepanel.js 中定义

/**
 * 重置股票分析状态
 */
function resetSAState() {
  state.saStock = null;
  state.saFundamentals = null;
  state.saMarkdown = '';
  state.isSARunning = false;
}
