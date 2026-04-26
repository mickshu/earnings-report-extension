# 股票分析模块 — 管理层背景信息与稳定性风险评估

## Context

当前股票分析模块缺少管理层维度的数据支撑。分析框架中虽提及"管理层质量"（历史表现、激励机制、资本配置、企业文化），但实际数据获取和展示中仅有股东持股数据，没有高管/管理层背景信息。本次优化需要：
1. 在股票信息卡中新增管理层背景表格（姓名、年龄、学历、职务、行业地位）
2. 在分析报告中新增管理层稳定性综合风险评估

数据来源采用混合方式：东方财富API获取基础高管数据 + AI补充工作经历与行业地位。

---

## 一、新增子Tab：👥 管理层

### 1.1 HTML 修改 — `sidebar/sidepanel.html`

**位置**：股票信息卡的子Tab导航区域（约 L509-548）

在现有 `<nav class="sa-info-tabs">` 中新增第3个Tab按钮，并新增对应的面板：

```
<nav class="sa-info-tabs">
  <button class="sa-info-tab active" data-infotab="metrics">📊 关键指标</button>
  <button class="sa-info-tab" data-infotab="kline">📈 K线图</button>
  <button class="sa-info-tab" data-infotab="mgmt">👥 管理层</button>  ← 新增
</nav>

<!-- 管理层子面板 -->
<div id="sa-info-mgmt-panel" class="sa-info-sub-panel">
  <div class="sa-mgmt-loading" style="display:none">加载中...</div>
  <div id="sa-mgmt-table-wrap" class="sa-mgmt-table-wrap">
    <div class="sa-mgmt-placeholder">👥 选择股票后加载管理层信息</div>
  </div>
</div>
```

**折叠信息卡**（约 L564-600）中同样补充管理层Tab和面板，ID前缀使用 `sa-collapse-mgmt`。

### 1.2 数据获取 — `sidebar/sidepanel.js`

在 `fetchSAFundamentals()` 函数（约 L6053）中新增第10个数据获取步骤：

```javascript
// 10. 获取管理层/高管数据
try {
  const mgmtUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=START_DATE&sortTypes=-1&pageSize=15&pageNumber=1&reportName=RPT_F10_OPERATE_MANAGE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
  const mgmtResp = await fetch(mgmtUrl);
  const mgmtResult = await mgmtResp.json();
  if (mgmtResult?.result?.data?.length) {
    state.saFundamentals._mgmtData = mgmtResult.result.data;
  }
} catch (e) { console.log('管理层接口失败:', e); }
```

**API返回关键字段**：
- `NAME` — 姓名
- `POSITION` — 职务（董事长/总经理/董秘等）
- `GENDER` — 性别
- `AGE` — 年龄
- `EDUCATION` — 学历（博士/硕士/本科/大专等）
- `START_DATE` — 任职开始日期
- `HOLD_NUM` — 持股数
- `RESUME` — 简历（部分公司有，可能为空）
- `IS_ACTUAL_CONTROLLER` — 是否实控人

### 1.3 管理层表格渲染

新增 `renderMgmtTable(mode)` 函数（`mode` = `'main'` | `'collapsed'`）：

- 从 `state.saFundamentals._mgmtData` 取数据
- 渲染为紧凑表格，列：姓名 | 职务 | 年龄 | 学历 | 任职日期 | 持股数
- 表格下方增加"AI补充背景"按钮，点击后调用LLM补充核心管理者的工作经历和行业地位
- AI补充结果以卡片形式展示在表格下方

**核心管理者判断逻辑**：
- 职务包含"董事长"、"总经理"、"CEO"、"总裁"的为核心管理者
- 最多取5位核心管理者让AI补充

### 1.4 AI补充管理层背景

新增 `enrichMgmtBackground(mgmtList)` 异步函数：

```
输入：核心管理者列表（姓名、职务、年龄、学历、公司名称）
调用 callLLM()，prompt要求：
  - 根据提供的姓名、职务、公司信息，补充每位核心管理者的：
    1. 主要工作经历（曾任职务/公司）
    2. 行业地位和影响力
    3. 管理风格特点（如有公开信息）
  - 输出JSON格式 [{name, experience, industryPosition, managementStyle}]
  - 如果无法确定某项信息，标注"暂无公开信息"
输出：解析后渲染为卡片
```

### 1.5 子Tab切换逻辑更新

更新现有子Tab事件监听（约 L1696-1710），新增对 `mgmt` Tab的处理：
- 切到管理层Tab时，如果 `_mgmtData` 已有数据则直接渲染，否则触发加载
- 折叠面板中的管理层Tab同理

---

## 二、管理层稳定性风险评估 — 分析报告增强

### 2.1 `buildStockAnalysisText()` 新增管理层分析章节

**位置**：在"大股东/机构持股变化分析"章节之后（约 L6663）插入新章节：

```
## 管理层概况与稳定性分析

### 核心管理层列表
| 姓名 | 职务 | 年龄 | 学历 | 任职起始 | 持股数 | 任期(年) |
|------|------|------|------|----------|--------|---------|

### 管理层稳定性指标
- 核心管理层平均任期: X年
- 近3年核心管理层变动人数: X人
- 管理层年龄分布: X-Y岁
- 实控人在管理层: 是/否
- 管理层持股比例: X%

### 管理层稳定性风险评估提示
（提供给AI分析的结构化提示，包含上述数据的解读方向）
```

### 2.2 稳定性指标计算逻辑

在 `buildStockAnalysisText()` 中，基于 `_mgmtData` 计算以下指标：

1. **平均任期**：从 `START_DATE` 计算至今的年数，取核心管理者均值
2. **变动频率**：近3年 `START_DATE` 的新任命人数
3. **年龄分布**：最大/最小/平均年龄
4. **实控人参与度**：`IS_ACTUAL_CONTROLLER` 字段
5. **管理层持股集中度**：持股数加总/总股本
6. **学历构成**：硕博占比

### 2.3 LLM分析Prompt增强

在 `runStockAnalysis()` 中的 userPrompt（约 L6344）中补充管理层维度：

现有prompt结尾增加：
```
请特别关注管理层稳定性风险，结合以下方面给出综合评估：
1. 管理层变动频率与业务连续性风险
2. 核心人物依赖度（关键人风险）
3. 管理层利益与股东利益一致性
4. 管理层背景与公司战略匹配度
5. 综合风险等级：高/中/低
```

---

## 三、CSS 样式 — `sidebar/sidepanel.css`

新增以下样式类：

```css
/* 管理层表格 */
.sa-mgmt-table-wrap { ... }
.sa-mgmt-table { width:100%; border-collapse:collapse; font-size:12px; }
.sa-mgmt-table th { background:var(--surface); ... }
.sa-mgmt-table td { border-bottom:1px solid var(--border); padding:6px 8px; }

/* AI补充背景卡片 */
.sa-mgmt-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:10px; margin-top:8px; }
.sa-mgmt-card-name { font-weight:600; font-size:13px; }
.sa-mgmt-card-field { font-size:12px; color:var(--text-secondary); margin-top:4px; }

/* AI补充按钮 */
.sa-mgmt-enrich-btn { ... } /* 复用现有 btn btn-secondary 样式 */
```

---

## 四、修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `sidebar/sidepanel.html` | 新增管理层子Tab按钮 + 管理层面板（主卡+折叠卡） |
| `sidebar/sidepanel.js` | ① `fetchSAFundamentals` 新增高管API获取 ② 新增 `renderMgmtTable()` ③ 新增 `enrichMgmtBackground()` ④ `buildStockAnalysisText` 新增管理层章节 ⑤ 子Tab切换逻辑更新 |
| `sidebar/sidepanel.css` | 新增管理层表格和卡片样式 |

---

## 五、实施步骤

1. **sidepanel.html** — 在主卡和折叠卡的子Tab区新增"👥 管理层"Tab和面板
2. **sidepanel.js** — `fetchSAFundamentals()` 中新增第10步获取高管数据
3. **sidepanel.js** — 新增 `renderMgmtTable(mode)` 渲染管理层表格
4. **sidepanel.js** — 新增 `enrichMgmtBackground(mgmtList)` AI补充函数
5. **sidepanel.js** — 更新子Tab切换事件监听，支持 mgmt Tab
6. **sidepanel.js** — `buildStockAnalysisText()` 新增管理层稳定性分析章节
7. **sidepanel.js** — `runStockAnalysis()` 中增强LLM prompt
8. **sidepanel.css** — 新增管理层相关样式

---

## 六、验证方式

1. 在扩展中输入股票代码（如 600519 贵州茅台），选中后检查：
   - 信息卡子Tab区出现"👥 管理层"Tab
   - 切换到管理层Tab后显示高管表格（姓名、职务、年龄、学历等）
   - 点击"AI补充背景"按钮后，核心管理者卡片展示工作经历和行业地位
2. 点击"🚀 开始投资分析"后：
   - 分析报告中包含"管理层概况与稳定性分析"章节
   - 报告中有管理层稳定性综合风险评估（高/中/低）
3. 切换到其他股票，管理层数据正确更新
4. API失败时不阻塞整体功能，管理层区域显示降级提示
