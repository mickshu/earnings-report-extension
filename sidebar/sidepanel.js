/**
 * 投资助手 - 侧边栏主逻辑
 * 
 * 模块：
 * 1. 选股器（价值投资大师策略）
 * 2. 财报解读（PDF提取 + LLM分析）
 * 3. 股票分析（投资公司分析框架）
 * 4. AI对话
 * 5. 纲要导航 + TTS播报 + 导出
 */

// ======================== 价值投资策略模板 ========================

const STRATEGIES = {
  graham: {
    name: '格雷厄姆 - 深度价值策略',
    icon: '🏛',
    shortDesc: '安全边际 · 低估价值',
    criteria: [
      { icon: '📉', text: '<strong>市盈率(PE)</strong>：PE < 15，优先选择 PE < 10' },
      { icon: '💰', text: '<strong>市净率(PB)</strong>：PB < 1.5，越低越好' },
      { icon: '💳', text: '<strong>股息率</strong>：≥ 3%，持续分红' },
      { icon: '🏦', text: '<strong>流动比率</strong>：≥ 2.0，偿债能力充足' },
      { icon: '📊', text: '<strong>负债权益比</strong>：≤ 0.5，财务保守' },
      { icon: '📈', text: '<strong>盈利稳定性</strong>：近10年无亏损' },
      { icon: '🎯', text: '<strong>安全边际</strong>：内在价值-市场价格 ≥ 33%' },
    ],
    prompt: `你是一位格雷厄姆风格的深度价值投资者，严格遵循"安全边际"原则。

请对用户提供的候选股票进行逐一筛选，按照以下格雷厄姆核心标准评估：

## 筛选标准（必须逐项评估）
1. **市盈率(PE)**：PE < 15 为合格，PE < 10 为优秀
2. **市净率(PB)**：PB < 1.5 为合格，越低越好
3. **股息率**：≥ 3% 为合格，持续分红记录
4. **流动比率**：≥ 2.0，偿债能力充足
5. **负债权益比**：≤ 0.5，财务保守
6. **盈利稳定性**：近10年无亏损记录
7. **安全边际**：估算内在价值，要求价格比内在价值低至少33%

## 输出格式（Markdown）

### 📊 筛选总览表
| 股票 | PE | PB | 股息率 | 流动比率 | 负债权益比 | 盈利稳定性 | 综合评级 |
用 ✅/⚠️/❌ 标注每项，综合评级：推荐/观望/回避

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **格雷厄姆评分**：X/100
- **各维度评分**：PE(X/15) + PB(X/15) + 股息(X/15) + 流动性(X/10) + 负债(X/10) + 稳定性(X/15) + 安全边际(X/20)
- **内在价值估算**：使用格雷厄姆公式 V = EPS × (8.5 + 2g) × 4.4/Y
- **安全边际**：当前价格 vs 内在价值
- **结论**：推荐买入 / 观望 / 回避 + 理由

### 🏆 最终推荐
按格雷厄姆评分排序，推荐前3只及理由。`
  },

  buffett: {
    name: '巴菲特 - 护城河策略',
    icon: '🏰',
    shortDesc: '护城河 · 优质企业',
    criteria: [
      { icon: '🏰', text: '<strong>护城河</strong>：品牌/网络效应/转换成本/成本优势/牌照' },
      { icon: '📈', text: '<strong>ROE</strong>：连续5年 ≥ 15%，越高越好' },
      { icon: '💎', text: '<strong>所有者盈余</strong>：净利润+折旧摊销-资本支出持续增长' },
      { icon: '🏦', text: '<strong>留存收益效率</strong>：每1元留存收益创造 ≥ 1元市值' },
      { icon: '👤', text: '<strong>管理层</strong>：资本配置能力强，诚实，股东利益优先' },
      { icon: '📊', text: '<strong>定价权</strong>：能转嫁成本上涨，不依赖低价竞争' },
      { icon: '🎯', text: '<strong>合理价格</strong>：以合理价格买入伟大企业 > 低价买入平庸企业' },
    ],
    prompt: `你是一位巴菲特风格的价值投资者，核心关注"护城河"和"优质企业"。

请对用户提供的候选股票进行逐一筛选，按照以下巴菲特核心标准评估：

## 筛选标准（必须逐项评估）
1. **护城河识别**：品牌/网络效应/转换成本/成本优势/许可牌照，5种逐一检验
2. **ROE**：连续5年 ≥ 15%为合格，≥ 20%为优秀
3. **所有者盈余**：净利润+折旧摊销-资本支出，是否持续增长
4. **留存收益效率**：每1元留存收益是否创造 ≥ 1元市值增量
5. **管理层质量**：资本配置记录、诚信度、股东利益导向
6. **定价权**：能否转嫁成本、提价不影响销量
7. **估值合理性**：即便好公司也不能太贵，DCF/PE/PEG综合判断

## 输出格式（Markdown）

### 📊 筛选总览表
| 股票 | 护城河类型 | ROE | 所有者盈余趋势 | 留存收益效率 | 定价权 | 综合评级 |
用 ✅/⚠️/❌ 标注，综合评级：强烈推荐/推荐/观望/回避

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **巴菲特评分**：X/100
- **护城河分析**：5种护城河逐一检验，标注宽/窄/无
- **ROE分析**：近5年趋势 + 杜邦分解
- **所有者盈余**：计算 + 增长趋势
- **管理层评价**：资本配置 + 诚信 + 股东回报
- **15秒电梯测试**：用一句话说清这家公司怎么赚钱
- **结论**：强烈推荐 / 推荐 / 观望 / 回避 + 理由

### 🏆 最终推荐
按巴菲特评分排序，推荐前3只及理由。`
  },

  lynch: {
    name: '彼得·林奇 - PEG策略',
    icon: '🔍',
    shortDesc: 'PEG · 成长价值',
    criteria: [
      { icon: '📐', text: '<strong>PEG</strong>：PE/盈利增长率 < 1.0，越低越被低估' },
      { icon: '🏷', text: '<strong>公司分类</strong>：缓慢增长/稳定/快速增长/周期/困境反转/资产机会' },
      { icon: '📈', text: '<strong>盈利增长率</strong>：15%-30%为理想区间' },
      { icon: '🏦', text: '<strong>负债水平</strong>：负债权益比 < 50%（银行除外）' },
      { icon: '📊', text: '<strong>机构持股</strong>：低机构持股 = 潜在买盘' },
      { icon: '🔄', text: '<strong>回购</strong>：公司正在回购股票' },
      { icon: '💡', text: '<strong> insiders 买入</strong>：内部人正在买入' },
    ],
    prompt: `你是一位彼得·林奇风格的成长价值投资者，核心工具是PEG估值和公司分类。

请对用户提供的候选股票进行逐一筛选，按照以下林奇核心标准评估：

## 筛选标准（必须逐项评估）
1. **PEG**：PE/预期盈利增长率 < 1.0 为低估，< 0.5 为严重低估
2. **公司分类**：判断属于6类中哪一类，对应不同投资策略
3. **盈利增长率**：15%-30%为理想，过高不可持续，过低不够成长
4. **负债水平**：负债权益比 < 50%（金融股除外）
5. **机构持股比例**：低机构持股意味着潜在买盘力量
6. **回购情况**：是否在回购股票
7. **内部人交易**：内部人是否在买入

## 输出格式（Markdown）

### 📊 筛选总览表
| 股票 | PEG | 公司类型 | 盈利增长率 | 负债比 | 机构持股 | 综合评级 |
用 ✅/⚠️/❌ 标注，综合评级：买入/观望/回避

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **林奇评分**：X/100
- **公司分类**：6类中的哪一类 + 理由 + 对应投资策略
- **PEG分析**：计算过程 + 合理性判断
- **盈利质量**：增长来源 + 可持续性
- **2分钟测试**：用日常语言解释这家公司为什么能增长
- **结论**：买入 / 观望 / 回避 + 理由

### 🏆 最终推荐
按林奇评分排序，推荐前3只及理由。`
  },

  fisher: {
    name: '费雪 - 长期成长策略',
    icon: '🌱',
    shortDesc: '15要点 · 长期持有',
    criteria: [
      { icon: '🔬', text: '<strong>研发投入</strong>：研发/营收占比高，持续创新' },
      { icon: '👥', text: '<strong>销售团队</strong>：强于行业平均的销售组织' },
      { icon: '📈', text: '<strong>利润率</strong>：高于行业平均且有改善趋势' },
      { icon: '🏢', text: '<strong>管理层深度</strong>：不依赖单人，有人才梯队' },
      { icon: '📊', text: '<strong>新产品管线</strong>：有足够的新产品储备推动未来增长' },
      { icon: '🏭', text: '<strong>成本意识</strong>：在景气时仍注重成本控制' },
      { icon: '🤝', text: '<strong>劳资关系</strong>：员工满意度高，流动率低' },
    ],
    prompt: `你是一位费雪风格的长期成长投资者，核心工具是"15要点"筛选法。

请对用户提供的候选股票进行逐一筛选，重点评估费雪15要点中的核心要点：

## 核心评估要点
1. **产品市场空间**：是否足够大支撑多年增长
2. **研发投入**：是否有决心持续研发新产品
3. **销售组织**：是否强于竞争对手
4. **利润率**：是否高于行业且有改善趋势
5. **管理层深度**：是否有好的管理梯队
6. **成本控制**：是否在景气时仍注重效率
7. **劳资关系**：员工是否满意
8. **管理层诚信**：是否对坏消息坦诚
9. **财务保守**：是否有足够现金应对困难
10. **长期导向**：管理层是否着眼长期而非短期

## 输出格式（Markdown）

### 📊 筛选总览表
| 股票 | 市场空间 | 研发 | 利润率 | 管理层 | 长期导向 | 综合评级 |
用 ✅/⚠️/❌ 标注，综合评级：强烈买入/买入/观望/回避

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **费雪评分**：X/100（15要点综合）
- **关键要点评分**：逐一评估核心要点
- **3年展望**：这家公司3年后会比现在更好吗？
- **5年展望**：增长驱动因素是否可持续？
- **结论**：强烈买入 / 买入 / 观望 / 回避 + 理由

### 🏆 最终推荐
按费雪评分排序，推荐前3只长期持有标的。`
  },

  munger: {
    name: '芒格 - 理性投资策略',
    icon: '⚖️',
    shortDesc: '逆向思维 · ROIC',
    criteria: [
      { icon: '🧠', text: '<strong>理性</strong>：避免心理偏误，独立思考' },
      { icon: '🔄', text: '<strong>逆向思维</strong>：先排除糟糕的，再看剩下的' },
      { icon: '📊', text: '<strong>ROIC</strong>：投入资本回报率 > WACC + 充裕安全垫' },
      { icon: '🏰', text: '<strong>竞争壁垒</strong>：不是护城河有多宽，而是能否持续变宽' },
      { icon: '🎯', text: '<strong>决策质量</strong>：少数重大决策，等待最佳击球位' },
      { icon: '⚡', text: '<strong>压力测试</strong>：最坏情况下的生存能力' },
      { icon: '🌐', text: '<strong>跨学科思维</strong>：用多学科模型审视投资' },
    ],
    prompt: `你是一位芒格风格的理性投资者，核心是"逆向思维"和"决策质量"。

请对用户提供的候选股票进行逐一筛选，按照芒格的核心思维方式评估：

## 筛选标准（必须逐项评估）
1. **逆向排除**：先排除有致命缺陷的（做假账风险、治理缺陷、行业衰退）
2. **ROIC vs WACC**：投入资本回报率是否显著超过资本成本
3. **竞争壁垒趋势**：护城河是在变宽还是变窄
4. **压力测试**：经济衰退、行业危机下的生存能力
5. **管理层理性**：资本配置是否理性，是否有过度扩张倾向
6. **心理偏误检查**：是否存在市场过度乐观/悲观的偏误
7. **决策质量**：是否处于"最佳击球位"

## 输出格式（Markdown）

### 📊 逆向排除结果
先列出被排除的股票及致命缺陷

### 📊 剩余候选评估表
| 股票 | ROIC vs WACC | 壁垒趋势 | 压力测试 | 管理层理性 | 综合评级 |
用 ✅/⚠️/❌ 标注

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **芒格评分**：X/100
- **逆向检查**：5大致命缺陷逐一排查
- **ROIC分析**：对比WACC，安全垫充足度
- **护城河趋势**：变宽/稳定/变窄 + 依据
- **压力测试**：3个极端情景下的表现预判
- **心理偏误**：当前市场是否存在对该股的偏误
- **结论**：击球 / 等待 / 放弃 + 理由

### 🏆 最终推荐
按芒格评分排序，推荐前3只。`
  },

  composite: {
    name: '综合大师策略',
    icon: '🌟',
    shortDesc: '多策略融合 · 严选',
    criteria: [
      { icon: '🏛', text: '<strong>格雷厄姆底线</strong>：满足基本安全边际要求' },
      { icon: '🏰', text: '<strong>巴菲特护城河</strong>：至少有一道窄护城河' },
      { icon: '📐', text: '<strong>林奇PEG</strong>：PEG < 1.5 为合格' },
      { icon: '🌱', text: '<strong>费雪成长</strong>：有持续成长动力' },
      { icon: '⚖️', text: '<strong>芒格理性</strong>：通过逆向排除检查' },
      { icon: '🎯', text: '<strong>综合评分</strong>：5位大师评分加权平均' },
    ],
    prompt: `你是一位融合5位价值投资大师思想的投资分析师。

请对用户提供的候选股票进行综合筛选，融合以下5位大师的策略：

## 综合评估维度
1. **格雷厄姆维度（20%）**：安全边际、PE/PB合理性、财务保守性
2. **巴菲特维度（25%）**：护城河宽度、ROE、所有者盈余、管理层质量
3. **林奇维度（20%）**：PEG、公司分类、盈利增长质量
4. **费雪维度（20%）**：长期成长动力、研发投入、行业地位
5. **芒格维度（15%）**：逆向排除、ROIC vs WACC、压力测试

## 输出格式（Markdown）

### 📊 综合评分总览
| 股票 | 格雷厄姆 | 巴菲特 | 林奇 | 费雪 | 芒格 | 综合 | 评级 |
每项0-100分，综合加权得分，评级：⭐⭐⭐⭐⭐/⭐⭐⭐⭐/⭐⭐⭐/⭐⭐/⭐

### 逐股详细分析
对每只股票：
#### [股票名称/代码]
- **综合评分**：X/100
- **各大师评分明细**：
  - 格雷厄姆：X/100 - 一句话点评
  - 巴菲特：X/100 - 一句话点评
  - 林奇：X/100 - 一句话点评
  - 费雪：X/100 - 一句话点评
  - 芒格：X/100 - 一句话点评
- **最大亮点**：该股最打动哪位大师
- **最大风险**：哪位大师最可能否决
- **结论**：强烈推荐 / 推荐 / 观望 / 回避 + 核心理由

### 🏆 最终推荐
按综合评分排序，推荐前3只及核心理由。`
  }
};

// ======================== 财报解读常量 ========================

const ANALYSIS_SYSTEM_PROMPT = `你是一位资深的行业财报解读专家，融合巴菲特「护城河」、林奇「PEG与公司分类」、费雪「成长因子」、芒格「逆向思维」等投资大师的核心分析框架。

你的任务是根据用户提供的财报文本，生成一份结构化的深度解读报告。

## 报告结构（必须按此顺序输出）

### 📊 一、核心业绩概览
用3-5句话概括本期财报的「定调」结论。

**关键指标逐项评价表**：对以下每个指标，列出当期值 + 变化方向 + 判断等级（优秀/良好/一般/较差）+ 一句话解读：
| 指标 | 当期值 | 同比变化 | 判断等级 | 解读 |
|------|--------|---------|---------|------|
需覆盖：营业收入、归母净利润、扣非净利润、毛利率、净利率、ROE、经营现金流净额、投资现金流净额、筹资现金流净额、资产负债率、流动比率。
**重要**：严格参照「关键指标判断标准」表中的阈值进行判断，不要凭感觉。对于缺失数据，用历史趋势或同行业数据推断，并标注"推断值"。

**三大现金流关系分析**：必须根据「三大现金流关系分析小结」中的类型判断和结论，在核心业绩概览中做现金流类型定性（如"成熟奶牛型""扩张成长型"等），并评价：
- 经营CF/归母净利润比率 → 盈利质量（≥1.0为优秀，0.7-1.0为一般，<0.7为较差）
- 投资CF/经营CF比率 → 投资扩张力度
- 筹资CF/经营CF比率 → 融资依赖度
- 三者组合模式 → 现金流类型结论

### ✅ 二、业务亮点
提炼3-5个最突出的正面信号，每个需有数据支撑。对于亮点指标，与上期和去年同期对比说明改善幅度。

### 🚀 三、增长驱动力
区分量/价/结构/效率四个维度分析增长来源。结合近多期趋势数据判断增长是加速还是减速。

### ⚠️ 四、不及预期原因
如有关键指标低于预期，深挖根因并判断持续性。对于异常波动（如大幅下降的毛利率、突增的应收账款等），与历史数据对比分析。

### 🔴 五、投资风险
短期风险 + 中长期风险 + 红旗信号。重点关注：
- 经营现金流与净利润的匹配度（盈利质量）
- 应收账款增速是否远超营收增速
- 商誉占比是否过高
- 存货周转是否恶化
- 扣非净利润与归母净利润的差异

### 💬 六、管理层观点
从MD&A/业绩说明会纪要中提炼管理层关键表态，做诚信检验。如数据中没有管理层观点，则基于财报数据推断管理层策略方向。

### 🏛 七、投资大师视角
**必须按照每位大师的策略框架逐项分析，给出量化评分和明确结论：**

#### 🏰 巴菲特视角
按照巴菲特7项核心标准逐项评估：
1. **护城河识别**：逐一检验品牌/网络效应/转换成本/成本优势/许可牌照 → 护城河评级（宽/窄/无）+ 依据
2. **ROE分析**：近N期ROE趋势 + 杜邦分解 → ROE评级（优秀≥20%/良好15-20%/一般8-15%/较差<8%）
3. **所有者盈余**：计算 = 净利润 + 折旧摊销 - 资本支出 → 增长趋势判断
4. **留存收益效率**：每1元留存收益创造 ≥ 1元市值？→ 效率评级
5. **管理层质量**：资本配置记录 + 诚信度 → 评价
6. **定价权**：能否转嫁成本上涨？→ 依据
7. **估值合理性**：当前PE/PB水平 → 是否合理价格
**巴菲特综合评分**：X/100 + 结论（强烈推荐/推荐/观望/回避）

#### 🔍 林奇视角
按照林奇6项核心标准逐项评估：
1. **公司分类**：缓慢增长型/稳定增长型/快速增长型/周期型/困境反转型/资产机会型 → 分类 + 依据
2. **PEG估值**：PE(TTM) / 净利润增速 → PEG值 + 判断（<1低估 / 1-1.5合理 / >1.5高估）
3. **盈利增长率**：当前增速是否在15%-30%理想区间？→ 评价
4. **负债水平**：负债权益比 → 安全/注意/危险
5. **现金流**：经营CF是否充裕？→ 评价
6. **增长持续性**：结合行业和趋势数据判断增长能否持续
**林奇综合评分**：X/100 + 结论（强烈买入/买入/观望/回避）

#### 🌱 费雪视角
按照费雪核心要点逐项评估：
1. **产品市场空间**：是否足够大支撑多年增长 → 判断
2. **研发投入**：研发费用/营收占比 + 是否有新产品管线 → 评价
3. **销售组织**：销售费用效率（营收/销售费用趋势）→ 评价
4. **利润率趋势**：毛利率/净利率是否持续改善 → 趋势判断
5. **管理层深度**：是否依赖单人 → 评价
6. **成本控制**：费用率是否改善 → 评价
7. **长期导向**：资本配置是否着眼长期 → 评价
**费雪综合评分**：X/100 + 3年展望（更好/持平/恶化）

#### ⚖️ 芒格视角
按照芒格核心思维方式逐项评估：
1. **逆向排除**：是否存在致命缺陷（做假账风险/治理缺陷/行业衰退）→ 通过/警告
2. **ROIC vs WACC**：ROIC是否显著超过资本成本 → 安全垫充足/勉强/不足
3. **竞争壁垒趋势**：护城河是在变宽还是变窄 → 判断 + 依据
4. **压力测试**：经济衰退下生存能力 → 强/中/弱
5. **管理层理性**：资本配置是否理性 → 评价
6. **心理偏误检查**：市场是否对该股存在偏误 → 判断
7. **决策质量**：当前是否处于最佳击球位 → 是/否/接近
**芒格综合评分**：X/100 + 结论（击球/等待/放弃）

**大师评分汇总表**：
| 大师 | 评分 | 结论 | 核心依据 |
|------|------|------|---------|

### 📊 八、同行业趋势对比
构建3-5家同行关键指标横向对比表。如无同行数据，标注"需手动补充同行数据"。

### 🏭 九、行业深度分析
周期定位评分 + 竞争格局五力分析。

### 📝 十、综合评述
本期定调 + 护城河评级 + 行业周期位置 + 前瞻信号 + 四位大师综合建议。

## 输出格式
- Markdown格式，表格使用Markdown表格
- 百分比变化用「+X.X% / -X.X%」格式
- 如数据不足，明确标注"数据不足"而非编造
- 关键指标必须参照「关键指标判断标准」表判断，不可随意定性`;

const CHAT_SYSTEM_PROMPT = `你是一位资深投资分析专家，正在与用户就财报解读或选股分析进行深入对话。

回答原则：
1. 紧扣数据和事实，不泛泛而谈
2. 量化分析优先，给出具体数字
3. 融入价值投资大师思维框架
4. 对比分析要给出同行业参考
5. 风险与机会并重
6. 回答简洁有力`;

const DEFAULT_PROVIDERS = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  custom: { baseUrl: '', model: '' }
};

// ======================== 股票分析常量 ========================

const STOCK_ANALYSIS_SYSTEM_PROMPT = `你是一位专业的投资分析师，严格按照"投资公司分析框架"对股票进行全方位深度分析。

## 分析框架（必须按以下6大维度逐项分析）

### 1. 行业与商业模式 (Business Model & Industry)
- **行业天花板**：市场空间有多大？是处于成长期、成熟期还是衰退期？
- **竞争格局**：行业是高度分散还是寡头垄断？主要竞争对手是谁？
- **护城河 (Economic Moat)**：
  - 无形资产（品牌、专利、特许经营权）
  - 转换成本（用户离开的代价有多大？）
  - 网络效应（用户越多越好用吗？）
  - 成本优势（规模效应、独特资源、流程优化）
- **商业模式**：赚钱逻辑（靠什么赚钱）、议价能力（对上下游话语权）

### 2. 财务稳健性 (Financial Health)
- **盈利能力**：ROE(净资产收益率)、毛利率与净利率
- **营运效率**：资产周转率、应收账款周转天数、库存周转率
- **现金流**：经营性现金流是否为正？是否能覆盖净利润？
- **三大现金流关系分析**：
  - 经营CF/投资CF/筹资CF三者组合模式 → 现金流类型判断（成熟奶牛型/扩张成长型/融资扩张型/创业困境型等）
  - 经营CF/归母净利润比率 → 盈利质量（≥1.0优秀，0.7-1.0一般，<0.7较差）
  - 投资CF/经营CF比率 → 投资扩张力度
  - 筹资CF/经营CF比率 → 融资依赖度
- **资产负债**：资产负债率、速动比率（债务危机风险？）

### 3. 管理层质量 (Management & Governance)
- **历史表现**：管理层承诺兑现情况
- **激励机制**：管理层持股与利益一致性
- **资本配置**：分红/回购/再投资的质量
- **企业文化**：价值观与人才吸引力

### 4. 估值分析 (Valuation)
- **绝对估值 (DCF)**：自由现金流折现模型，计算内在价值
- **相对估值**：PE/PS/PB 与行业和历史对比
- **安全边际**：当前股价是否比内在价值至少便宜20%-30%？

### 5. 核心风险 (Key Risks)
- **政策风险**：监管环境变化
- **技术替代**：颠覆性技术威胁
- **宏观风险**：汇率、利率、通胀影响
- **关键人风险**：灵魂人物离开后影响

### 6. 预期与触发点 (Catalysts)
- **市场预期**：当前股价反映了多少好消息？
- **触发因素**：未来6-12个月驱动股价上涨的事件

## 输出格式（Markdown）

### 📊 一、公司概览与定调
3-5句话概括公司核心定位和投资定调。

### 🏭 二、行业与商业模式分析
按框架4个维度逐一分析，给出护城河评级（强/中/弱/无）。

### 💰 三、财务稳健性评估
关键指标表格 + 评价。判断：优秀/良好/一般/危险。

### 👔 四、管理层质量评价
4个维度逐一评分（优/良/中/差）+ 综合评价。

### 📐 五、估值分析
- DCF估值区间
- PE/PB/PS 与同业对比
- 安全边际计算
- 估值结论：严重低估 / 低估 / 合理 / 高估 / 严重高估

### ⚠️ 六、核心风险提示
按4个维度列举，标注风险等级（高/中/低）。

### 🚀 七、预期与催化剂
市场预期分析 + 未来6-12个月催化剂列表。

### 🎯 八、投资策略建议
结合当前股价，给出明确的投资策略：
- **建议操作**：强烈买入 / 买入 / 持有 / 观望 / 回避
- **目标价位**：给出合理价格区间
- **仓位建议**：建议配置比例
- **持有期限**：短线/中线/长线
- **止损参考**：建议止损位
- **关键跟踪指标**：需要持续关注的3-5个核心指标

## 输出规范
- Markdown格式，数据用表格呈现
- 百分比变化用「+X.X% / -X.X%」格式
- 如数据不足，明确标注"数据不足"而非编造
- 投资策略建议必须基于估值和安全边际分析，有理有据`;

// ======================== 状态管理 ========================

const state = {
  pdfText: '',
  pdfUrl: '',
  reportMarkdown: '',
  screenerMarkdown: '',
  chatHistory: [],
  isAnalyzing: false,
  isScreenerRunning: false,
  isChatting: false,
  activeTab: 'hotspot',
  activeStrategy: 'graham',
  strategyDetailOpen: false,
  selectedStocks: [],   // [{code, name, market}]
  settings: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    activeServiceId: 'default',  // 当前激活的服务ID
    services: [                   // 多模型服务列表
      {
        id: 'default',
        name: 'DeepSeek',
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        model: 'deepseek-chat',
        enabled: true
      }
    ]
  },
  tts: {
    playing: false,
    paused: false,
    sections: [],
    currentSection: -1,
    utterance: null,
    rate: 1.0
  },
  searchTimer: null,
  suggestIndex: -1,
  // 估值计算器
  valStock: null,      // 当前选中的股票信息
  valMethod: 'dcf',    // 当前估值方法
  valParams: {},       // 当前方法参数
  valSearchTimer: null,
  valSuggestIndex: -1,
  // 财报解读搜索
  analysisSearchTimer: null,
  analysisSuggestIndex: -1,
  analysisStock: null,      // {code, name, secid} 当前选中的财报搜索股票
  analysisReports: [],      // 财报列表
  analysisSelectedReport: null,  // 当前选中的财报
  // 股票分析
  saSearchTimer: null,
  saSuggestIndex: -1,
  saStock: null,           // {code, name, secid, price, changePct} 当前选中的股票
  saFundamentals: null,    // 基本面数据
  saMarkdown: '',          // 分析报告
  isSARunning: false,      // 是否正在分析
  // 热点信息模块
  hotspotItems: [],         // 所有抓取的热点数据
  hotspotFilter: 'all',     // 当前领域过滤
  hotspotSearch: '',        // 搜索关键词
  hotspotTimer: null,       // 自动刷新定时器
  hotspotConfig: {
    interval: 5,            // 刷新间隔(分钟)
    clsEnabled: true,       // 财联社
    eastmoneyEnabled: true, // 东方财富
    customSources: [],      // 自定义URL列表
    extraKeywords: [],      // 额外关键词
  },
  // 公司资讯模块
  hotspotSubTab: 'industry',  // industry | company
  watchlist: [],              // [{code, name, market}] 关注公司列表
  companyItems: [],           // 公司资讯数据
  companyAnnouncements: [],   // 公司公告数据
  companyFilter: 'all',      // 当前关注公司过滤
  companyTypeFilter: 'news',  // news | announcement
  companyTimer: null,         // 公司资讯自动刷新定时器
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ======================== 初始化 ========================

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
  loadPdfJs();
  showStrategyDetail('graham');
  checkForPDF();
  initValuation();
  // 热点信息模块初始化
  bindHotspotEvents();
  loadHotspotConfig();
  fetchAllHotspots();    // 首次加载
  startHotspotAutoRefresh(); // 启动自动刷新
  // 公司资讯模块初始化（独立于行业热点，使用搜索API获取）
  loadWatchlist();
  fetchCompanyData();    // 首次加载
  startCompanyAutoRefresh(); // 启动自动刷新
});

function loadSettings() {
  const saved = localStorage.getItem('er_settings');
  if (saved) {
    try {
      const savedSettings = JSON.parse(saved);
      // 兼容旧格式：如果没有services数组，则从旧字段创建
      if (!savedSettings.services || savedSettings.services.length === 0) {
        savedSettings.services = [{
          id: 'default',
          name: savedSettings.provider === 'openai' ? 'OpenAI' : 
                savedSettings.provider === 'deepseek' ? 'DeepSeek' :
                savedSettings.provider === 'zhipu' ? '智谱' :
                savedSettings.provider === 'qwen' ? '通义千问' : '自定义API',
          provider: savedSettings.provider || 'deepseek',
          baseUrl: savedSettings.baseUrl || '',
          apiKey: savedSettings.apiKey || '',
          model: savedSettings.model || '',
          enabled: true
        }];
        savedSettings.activeServiceId = 'default';
      }
      Object.assign(state.settings, savedSettings);
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }
  
  // 加载当前激活的服务
  loadActiveService();
  renderLLMServicesList();
}

function loadActiveService() {
  const activeService = state.settings.services.find(s => s.id === state.settings.activeServiceId);
  if (activeService) {
    $('#llm-provider').value = activeService.provider;
    $('#llm-base-url').value = activeService.baseUrl;
    $('#llm-api-key').value = activeService.apiKey;
    $('#llm-model').value = activeService.model;
    $('#llm-active-service').value = activeService.id;
  }
}

function saveSettings() {
  // 保存当前编辑的服务到services数组
  const currentServiceId = $('#llm-active-service').value;
  const serviceIndex = state.settings.services.findIndex(s => s.id === currentServiceId);
  
  if (serviceIndex >= 0) {
    state.settings.services[serviceIndex] = {
      ...state.settings.services[serviceIndex],
      provider: $('#llm-provider').value,
      baseUrl: $('#llm-base-url').value,
      apiKey: $('#llm-api-key').value,
      model: $('#llm-model').value
    };
  }
  
  state.settings.activeServiceId = currentServiceId;
  
  localStorage.setItem('er_settings', JSON.stringify(state.settings));
  const s = $('#settings-status');
  if (!state.settings.services[serviceIndex]?.apiKey) {
    s.textContent = '⚠️ 请填写 API Key';
    s.className = 'settings-status error';
  } else {
    s.textContent = '✅ 设置已保存';
    s.className = 'settings-status success';
  }
  setTimeout(() => { s.textContent = ''; }, 3000);
  
  renderLLMServicesList();
}

// ======================== 事件绑定 ========================

function bindEvents() {
  // 标签切换
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 设置
  $('#btn-settings').addEventListener('click', () => showSettings());
  $('#btn-settings-back').addEventListener('click', () => hideSettings());
  
  // 设置子Tab切换
  $$('.settings-sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.settings-sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.settings-sub-panel').forEach(p => p.classList.remove('active'));
      $(`#settings-${tab.dataset.subtab}-panel`).classList.add('active');
    });
  });
  
  // 模型服务管理事件
  $('#btn-add-llm-service').addEventListener('click', () => addNewLLMService());
  $('#btn-save-llm-service').addEventListener('click', () => saveLLMService());
  $('#btn-cancel-llm-service').addEventListener('click', () => cancelEditLLMService());
  $('#llm-active-service').addEventListener('change', (e) => {
    switchLLMService(e.target.value);
  });
  
  // 旧的保存按钮（保留兼容性）
  $('#btn-save-settings')?.addEventListener('click', saveSettings);
  
  $('#llm-provider').addEventListener('change', (e) => {
    const config = DEFAULT_PROVIDERS[e.target.value];
    if (config) {
      $('#llm-base-url').value = config.baseUrl;
      $('#llm-model').value = config.model;
    }
  });

  // 设置面板中的关注公司管理
  $('#btn-settings-watchlist-add')?.addEventListener('click', () => addSettingsWatchlistCompany());
  $('#settings-watchlist-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSettingsWatchlistCompany();
  });

  // 设置面板中关注公司搜索提示
  let settingsWatchlistSuggestTimer = null;
  $('#settings-watchlist-input')?.addEventListener('input', (e) => {
    clearTimeout(settingsWatchlistSuggestTimer);
    const val = e.target.value.trim();
    if (!val) {
      $('#settings-watchlist-suggest').style.display = 'none';
      return;
    }
    settingsWatchlistSuggestTimer = setTimeout(() => searchSettingsWatchlistStock(val), 300);
  });

  // 手动粘贴
  $('#btn-paste').addEventListener('click', () => showPasteArea());
  $('#btn-paste-cancel').addEventListener('click', () => hidePasteArea());
  $('#btn-paste-submit').addEventListener('click', () => submitPastedText());

  // 打开PDF按钮
  $('#btn-open-pdf').addEventListener('click', () => {
    showToast('请在浏览器中打开财报PDF，系统将自动检测');
  });

  // ===== 财报解读搜索事件 =====
  const analysisSearchInput = $('#analysis-search-input');
  analysisSearchInput.addEventListener('input', () => {
    clearTimeout(state.analysisSearchTimer);
    const keyword = analysisSearchInput.value.trim();
    if (keyword.length >= 1) {
      state.analysisSearchTimer = setTimeout(() => analysisSearchStock(keyword), 350);
    } else {
      hideAnalysisSuggest();
    }
  });

  analysisSearchInput.addEventListener('keydown', (e) => {
    const suggest = $('#analysis-suggest');
    if (suggest.style.display !== 'none') {
      const items = suggest.querySelectorAll('.stock-suggest-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.analysisSuggestIndex = Math.min(state.analysisSuggestIndex + 1, items.length - 1);
        updateAnalysisSuggestActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.analysisSuggestIndex = Math.max(state.analysisSuggestIndex - 1, -1);
        updateAnalysisSuggestActive(items);
      } else if (e.key === 'Enter' && state.analysisSuggestIndex >= 0) {
        e.preventDefault();
        if (items[state.analysisSuggestIndex]) items[state.analysisSuggestIndex].click();
      } else if (e.key === 'Escape') {
        hideAnalysisSuggest();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.analysis-search-wrap')) {
      hideAnalysisSuggest();
    }
  });

  // 财报报告操作
  $('#btn-regenerate').addEventListener('click', () => {
    stopTTS();
    // 如果有已选中的财报，重新解读
    if (state.analysisSelectedReport && state.analysisStock) {
      const idx = state.analysisReports.findIndex(r => r.reportDate === state.analysisSelectedReport.reportDate);
      if (idx >= 0) { selectAnalysisReport(idx); return; }
    }
    // 否则回到搜索页
    $('#analysis-result').style.display = 'none';
    $('.analysis-container').style.display = '';
  });
  $('#btn-copy').addEventListener('click', () => copyReport());
  $('#btn-export-md').addEventListener('click', () => exportMarkdown());
  $('#btn-chat-followup').addEventListener('click', () => switchTab('chat'));

  // 纲要导航
  $('#btn-toc').addEventListener('click', toggleTOC);
  $('#btn-toc-close').addEventListener('click', () => { $('#toc-panel').style.display = 'none'; });

  // TTS 控制
  $('#btn-tts-play').addEventListener('click', toggleTTSPlayPause);
  $('#btn-tts-stop').addEventListener('click', stopTTS);
  $('#btn-tts-prev').addEventListener('click', ttsPrevSection);
  $('#btn-tts-next').addEventListener('click', ttsNextSection);
  $('#tts-rate').addEventListener('change', (e) => {
    state.tts.rate = parseFloat(e.target.value);
    if (state.tts.playing && !state.tts.paused) {
      ttsPlaySection(state.tts.currentSection);
    }
  });

  // ===== 选股器事件 =====
  // 策略 chip 切换
  $$('.strategy-chip[data-strategy]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.strategy-chip[data-strategy]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeStrategy = chip.dataset.strategy;
      if (state.strategyDetailOpen) {
        showStrategyDetail(chip.dataset.strategy);
      }
    });
  });

  // 策略详情展开/折叠
  $('#btn-strategy-toggle').addEventListener('click', () => {
    state.strategyDetailOpen = !state.strategyDetailOpen;
    const detail = $('#strategy-detail');
    const toggleBtn = $('#btn-strategy-toggle');
    if (state.strategyDetailOpen) {
      showStrategyDetail(state.activeStrategy);
      detail.style.display = '';
      toggleBtn.classList.add('open');
    } else {
      detail.style.display = 'none';
      toggleBtn.classList.remove('open');
    }
  });

  // 股票输入搜索
  const screenerInput = $('#screener-input');
  screenerInput.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    const text = screenerInput.value;
    // 取最后一段正在输入的文字
    const lastSegment = text.split(/[,，\n]/).pop().trim();
    if (lastSegment.length >= 1 && !/^\d{6}$/.test(lastSegment) && !lastSegment.startsWith('行业') && !lastSegment.startsWith('条件')) {
      state.searchTimer = setTimeout(() => searchStockSuggest(lastSegment), 350);
    } else if (lastSegment.length >= 1) {
      state.searchTimer = setTimeout(() => searchStockSuggest(lastSegment), 350);
    } else {
      hideStockSuggest();
    }
  });

  screenerInput.addEventListener('keydown', (e) => {
    const suggest = $('#stock-suggest');
    if (suggest.style.display !== 'none') {
      const items = suggest.querySelectorAll('.stock-suggest-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.suggestIndex = Math.min(state.suggestIndex + 1, items.length - 1);
        updateSuggestActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.suggestIndex = Math.max(state.suggestIndex - 1, -1);
        updateSuggestActive(items);
      } else if (e.key === 'Enter' && state.suggestIndex >= 0 && !e.shiftKey) {
        e.preventDefault();
        if (items[state.suggestIndex]) items[state.suggestIndex].click();
      } else if (e.key === 'Escape') {
        hideStockSuggest();
      }
    }
  });

  // 点击外部关闭搜索下拉
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.screener-input-wrap')) {
      hideStockSuggest();
    }
  });

  $('#btn-screener-run').addEventListener('click', runScreener);
  $('#btn-screener-clear').addEventListener('click', () => {
    $('#screener-input').value = '';
    state.selectedStocks = [];
    renderStockTags();
    $('#screener-result').style.display = 'none';
    state.screenerMarkdown = '';
  });
  $('#btn-screener-export').addEventListener('click', () => exportMarkdown('screener'));
  $('#btn-screener-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(state.screenerMarkdown)
      .then(() => showToast('📋 选股报告已复制'))
      .catch(() => showToast('复制失败'));
  });
  $('#btn-screener-chat').addEventListener('click', () => switchTab('chat'));

  // ===== 估值计算器事件 =====
  const valSearchInput = $('#val-search-input');
  valSearchInput.addEventListener('input', () => {
    clearTimeout(state.valSearchTimer);
    const keyword = valSearchInput.value.trim();
    if (keyword.length >= 1) {
      state.valSearchTimer = setTimeout(() => valSearchStock(keyword), 350);
    } else {
      hideValSuggest();
    }
  });

  valSearchInput.addEventListener('keydown', (e) => {
    const suggest = $('#val-suggest');
    if (suggest.style.display !== 'none') {
      const items = suggest.querySelectorAll('.stock-suggest-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.valSuggestIndex = Math.min(state.valSuggestIndex + 1, items.length - 1);
        updateValSuggestActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.valSuggestIndex = Math.max(state.valSuggestIndex - 1, -1);
        updateValSuggestActive(items);
      } else if (e.key === 'Enter' && state.valSuggestIndex >= 0) {
        e.preventDefault();
        if (items[state.valSuggestIndex]) items[state.valSuggestIndex].click();
      } else if (e.key === 'Escape') {
        hideValSuggest();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.val-search-wrap')) {
      hideValSuggest();
    }
  });

  // 估值方法切换
  $$('.val-method-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.val-method-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.valMethod = chip.dataset.method;
      renderValParams();
    });
  });

  $('#btn-val-calc').addEventListener('click', calculateValuation);
  $('#btn-val-reset').addEventListener('click', () => {
    state.valParams = {};
    renderValParams();
    $('#val-result').style.display = 'none';
  });

  // ===== 股票分析事件 =====
  const saSearchInput = $('#sa-search-input');
  saSearchInput.addEventListener('input', () => {
    clearTimeout(state.saSearchTimer);
    const keyword = saSearchInput.value.trim();
    if (keyword.length >= 1) {
      state.saSearchTimer = setTimeout(() => saSearchStock(keyword), 350);
    } else {
      hideSASuggest();
    }
  });

  saSearchInput.addEventListener('keydown', (e) => {
    const suggest = $('#sa-suggest');
    if (suggest.style.display !== 'none') {
      const items = suggest.querySelectorAll('.stock-suggest-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.saSuggestIndex = Math.min(state.saSuggestIndex + 1, items.length - 1);
        updateSASuggestActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.saSuggestIndex = Math.max(state.saSuggestIndex - 1, -1);
        updateSASuggestActive(items);
      } else if (e.key === 'Enter' && state.saSuggestIndex >= 0) {
        e.preventDefault();
        if (items[state.saSuggestIndex]) items[state.saSuggestIndex].click();
      } else if (e.key === 'Escape') {
        hideSASuggest();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sa-search-wrap')) {
      hideSASuggest();
    }
  });

  $('#btn-sa-start').addEventListener('click', runStockAnalysis);
  $('#btn-sa-regenerate').addEventListener('click', () => {
    if (state.saStock && state.saFundamentals) {
      runStockAnalysis();
    } else {
      $('#sa-result').style.display = 'none';
      $('.sa-container').style.display = '';
    }
  });
  $('#btn-sa-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(state.saMarkdown)
      .then(() => showToast('📋 分析报告已复制'))
      .catch(() => showToast('复制失败'));
  });
  $('#btn-sa-export-md').addEventListener('click', () => exportMarkdown('stock-analysis'));
  $('#btn-sa-chat').addEventListener('click', () => switchTab('chat'));

  // 对话
  $('#btn-send').addEventListener('click', () => sendChatMessage());
  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  $$('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#chat-input').value = btn.dataset.q;
      sendChatMessage();
    });
  });

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PDF_DETECTED') {
      onPDFDetected(message.data);
    }
  });

  // 滚动追踪
  const reportContent = $('#report-content');
  if (reportContent) {
    reportContent.addEventListener('scroll', updateTOCActiveOnScroll);
  }
}

// ======================== 标签与面板 ========================

function switchTab(tabName) {
  state.activeTab = tabName;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  $$('.panel').forEach(p => p.classList.remove('active'));
  $(`#panel-${tabName}`).classList.add('active');

  // 纲要按钮只在财报解读/股票分析标签下显示
  const tocBtn = $('#btn-toc');
  if (tocBtn) {
    tocBtn.style.display = (tabName === 'analysis' || tabName === 'stock-analysis') ? '' : 'none';
  }
  // 纲要面板只在财报解读/股票分析标签下显示
  if (tabName !== 'analysis' && tabName !== 'stock-analysis') {
    $('#toc-panel').style.display = 'none';
  }
}

function showSettings() {
  $('#panel-settings').style.display = '';
  $$('.panel').forEach(p => p.classList.remove('active'));
  $('#panel-settings').classList.add('active');
  $('.tab-bar').style.display = 'none';
  // 刷新设置面板中的数据
  refreshSettingsWatchlist();
  renderLLMServicesList();
  // 默认显示大模型配置tab
  $$('.settings-sub-tab').forEach(t => t.classList.remove('active'));
  $$('.settings-sub-panel').forEach(p => p.classList.remove('active'));
  $('.settings-sub-tab[data-subtab="llm"]').classList.add('active');
  $('#settings-llm-panel').classList.add('active');
}

function hideSettings() {
  $('#panel-settings').style.display = 'none';
  switchTab(state.activeTab);
  $('.tab-bar').style.display = '';
  // 如果当前在热点模块的公司资讯子面板，刷新数据
  if (state.activeTab === 'hotspot' && state.hotspotSubTab === 'company') {
    fetchCompanyData();
  }
}

/**
 * 获取当前激活的模型服务配置
 */
function getActiveLLMService() {
  const service = state.settings.services.find(s => s.id === state.settings.activeServiceId);
  return service || state.settings.services[0];
}

// ======================== 热点信息模块 ========================

/**
 * 领域关键词映射
 */
const DOMAIN_KEYWORDS = {
  semiconductor: ['半导体', '芯片', '集成电路', 'IC设计', '晶圆', '光刻', '刻蚀', '薄膜', '封装', '测试', 'EDA', 'GPU', 'CPU', 'FPGA', 'ASIC', '存储芯片', 'NAND', 'DRAM', 'HBM', 'SiC', 'GaN', '功率半导体', 'IGBT', '模拟芯片', '射频芯片', 'SOC', 'MCU', '微控制器', '传感器', 'MEMS', '中微公司', '北方华创', '沪硅产业', '拓荆科技', '华海清科', '芯源微', '盛美上海', '雅克科技', '南大光电', '安集科技', '韦尔股份', '兆易创新', '紫光国微', '闻泰科技', '士兰微', '捷捷微电', '扬杰科技', '立昂微', '斯达半导', '时代电气', '东微半导', '宏微科技', '新洁能', '天岳先进', '三安光电', '长电科技', '通富微电', '华天科技', '晶方科技', '甬矽电子', '汇成股份', '伟测科技', '利扬芯片', 'EUV', 'DUV', '先进制程', '成熟制程', '国产替代', '自主可控', '卡脖子', '设备国产化'],
  'new-energy': ['新能源', '光伏', '风电', '储能', '锂电', '锂电池', '动力电池', '充电桩', '逆变器', '硅料', '硅片', '电池片', '组件', 'HJT', 'TOPCon', '钙钛矿', '固态电池', '钠电池', '氢能', '燃料电池', '宁德时代', '比亚迪', '隆基绿能', '通威股份', '阳光电源', '天齐锂业', '赣锋锂业', '亿纬锂能', '国轩高科', '欣旺达', '派能科技', '鹏辉能源', '德业股份', '禾迈股份', '锦浪科技', '固德威', '昱能科技', '爱旭股份', '钧达股份', '帝科股份', '迈为股份', '捷佳伟创', '奥特维', '金博股份', '美畅股份', '高测股份', '碳纤维', '稀土永磁', '特高压', '智能电网'],
  'ai-tech': ['AI', '人工智能', '大模型', 'LLM', 'GPT', 'ChatGPT', 'Claude', 'Gemini', '深度学习', '机器学习', '算力', '智算', 'GPU服务器', '数据中心', '液冷', '光模块', '光通信', 'CPO', '硅光', '高速互联', 'PCB', '服务器', '交换机', '英伟达', 'NVIDIA', 'AMD', '寒武纪', '海光信息', '中科曙光', '浪潮信息', '工业富联', '紫光股份', '中兴通讯', '中际旭创', '新易盛', '天孚通信', '光迅科技', '华工科技', '博创科技', '太辰光', '联特科技', '剑桥科技', '铭普光磁', '沃尔核材', '神宇股份', '润泽科技', '奥飞数据', '数据港', '光环新网', '宝信软件', '科大讯飞', '商汤', '百度', '字节跳动', '腾讯云', '阿里云', '华为', '鸿蒙', 'AIGC', '数字人', '多模态', 'Agent', '自动驾驶', '智能驾驶', 'L4', '萝卜快跑', 'Waymo', '特斯拉FSD'],
  robot: ['机器人', '人形机器人', '工业机器人', '协作机器人', '服务机器人', '机器人', '减速器', '伺服电机', '控制器', '传感器', '力矩', '灵巧手', '柔性制造', '自动化', '机器视觉', '机器臂', 'AGV', '特斯拉机器人', 'Optimus', 'Figure', 'Unitree', '宇树', '智元机器人', '小鹏机器人', '优必选', '汇川技术', '绿的谐波', '双环传动', '鸣志电器', '禾川科技', '步科股份', '埃斯顿', '拓斯达', '机器人', '新时达', '凯尔达', '奥普特', '凌云光', '奥比中光', '3D视觉', '力传感器', '六维力', '触觉传感器', '执行器', '丝杠', '导轨', '轴承'],
  nuclear: ['核电', '核能', '核电站', '核反应堆', '核裂变', '核聚变', 'ITER', '小型堆', 'SMR', '华龙一号', '国和一号', '高温气冷堆', '快堆', '钍基熔盐堆', '核废料', '铀', '核燃料', '核安全', '辐射', '中国核电', '中国广核', '华能国际', '上海电气', '东方电气', '哈尔滨电气', '久立特材', '应流股份', '江苏神通', '中核科技', '沃尔核材', '纳微科技', '方大炭素', '兰石重装', '科新机电', '海默科技', '盾安环境', '核级阀门', '核级泵', '核级电缆'],
  iran: ['伊朗', '战况', '战争', '军事', '冲突', '空袭', '导弹', '核设施', '霍尔木兹', '红海', '胡塞', '以色列', '加沙', '黎巴嫩', '真主党', '哈马斯', '中东', '原油', '油价', '地缘政治', '制裁', '军事行动', '美军', '航母', '战斗群', '巡航导弹', '无人机', '军事基地', '停火', '谈判', '外交', '联合国', '安理会', '石油禁运', '供应中断', '避险', '黄金', '美元', '军工'],
};

/**
 * 默认 RSS 数据源列表
 */
const DEFAULT_RSS_SOURCES = [
  { url: 'https://rss.cls.cn/rss/headline.xml', name: '财联社头条', enabled: true },
  { url: 'https://rss.cls.cn/rss/stock.xml', name: '财联社股票', enabled: true },
  { url: 'https://rss.cls.cn/rss/bond.xml', name: '财联社债券', enabled: false },
  { url: 'http://www.cninfo.com.cn/cninfo-new/rss/disclosure', name: '巨潮资讯-公告', enabled: true },
  { url: 'http://www.cninfo.com.cn/cninfo-new/rss/szse', name: '巨潮资讯-深市', enabled: true },
  { url: 'http://www.cninfo.com.cn/cninfo-new/rss/sse', name: '巨潮资讯-沪市', enabled: true },
  { url: 'http://rss.eastmoney.com/news/rdt.rss', name: '东方财富-要闻', enabled: true },
  { url: 'http://rss.eastmoney.com/news/gcjq.rss', name: '东方财富-观察', enabled: true },
  { url: 'http://rss.eastmoney.com/news/research.rss', name: '东方财富-研报', enabled: false },
  { url: 'https://rss.wallstreetcn.com/', name: '华尔街见闻', enabled: true },
  { url: 'https://rss.wallstreetcn.com/rss/china', name: '华尔街见闻-中国', enabled: true },
  { url: 'https://finance.ifeng.com/rss/gupiao.rss', name: '凤凰-股票', enabled: false },
  { url: 'https://finance.ifeng.com/rss/finance.rss', name: '凤凰-财经', enabled: false },
  { url: 'https://xueqiu.com/rss/topics/hot.xml', name: '雪球-热门', enabled: true },
  { url: 'https://xueqiu.com/rss/market.xml', name: '雪球-市场', enabled: true },
  { url: 'https://rss.jin10.com/', name: '金十数据', enabled: true },
  { url: 'http://www.csrc.gov.cn/publish/news/rss/jgj.xml', name: '证监会-监管', enabled: false },
  { url: 'http://www.sse.com.cn/disclosure/rss/', name: '上交所', enabled: false },
  { url: 'http://www.szse.cn/api/report/rss', name: '深交所', enabled: false },
  { url: 'https://www.caixin.com/rss/finance.xml', name: '财新', enabled: false },
  { url: 'https://m.21jingji.com/rss/stock', name: '21世纪经济', enabled: false },
  { url: 'https://cn.reuters.com/rssFeed/businessNews', name: '路透社', enabled: true },
  { url: 'https://www.bloomberg.com.cn/feeds/rss', name: '彭博', enabled: false },
  { url: 'https://rss.sina.com.cn/finance/usstock.xml', name: '新浪-美股', enabled: false },
];

/**
 * 从背景脚本 fetch 数据（绕过 CORS）
 */
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

  // 两两比较（限制范围：只比较前200条，避免O(n²)太慢）
  const limit = Math.min(items.length, 200);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const sim = similarity(items[i]._keywords, items[j]._keywords);
      if (sim >= 0.4) {
        // 高相似度 → 视为同一事件，合并到同一组
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

    // 多来源展示
    const sources = item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    const sourcesHtml = sources.map(s =>
      `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
    ).join(' ');

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
      renderCompanyList();
    });
  });

  // 公司列表点击事件委托
  $('#hs-company-list')?.addEventListener('click', (e) => {
    const hsItem = e.target.closest('.hs-item[data-company-idx]');
    if (!hsItem) return;
    const idx = parseInt(hsItem.dataset.companyIdx, 10);
    const items = state.companyTypeFilter === 'news' ? state.companyItems : state.companyAnnouncements;
    const item = items[idx];
    if (!item) return;
    const url = (item.sources && item.sources[0]?.url) || item.url;
    if (url) {
      chrome.tabs.create({ url, active: true });
    }
  });
}

// ======================== 公司资讯模块 ========================

/**
 * 加载关注列表
 */
function loadWatchlist() {
  const saved = localStorage.getItem('er_watchlist');
  if (saved) {
    try { state.watchlist = JSON.parse(saved); } catch (e) { state.watchlist = []; }
  }
  renderCompanyChips();
}

/**
 * 保存关注列表
 */
function saveWatchlist() {
  localStorage.setItem('er_watchlist', JSON.stringify(state.watchlist));
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

/**
 * 移除关注公司
 */
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
  state.companyItems = allNews.filter(item => {
    if (!item.time || isNaN(item.time.getTime())) return true;
    return (now - item.time.getTime()) < oneDayMs;
  }).sort((a, b) => {
    const ta = a.time && !isNaN(a.time.getTime()) ? a.time.getTime() : 0;
    const tb = b.time && !isNaN(b.time.getTime()) ? b.time.getTime() : 0;
    return tb - ta;
  });

  state.companyAnnouncements = allAnnouncements.filter(item => {
    if (!item.time || isNaN(item.time.getTime())) return true;
    return (now - item.time.getTime()) < sevenDayMs;
  }).sort((a, b) => {
    const ta = a.time && !isNaN(a.time.getTime()) ? a.time.getTime() : 0;
    const tb = b.time && !isNaN(b.time.getTime()) ? b.time.getTime() : 0;
    return tb - ta;
  });

  if (loading) loading.style.display = 'none';

  renderCompanyList();
  updateCompanyUpdateTime();
}

/**
 * 获取个股新闻
 * 主策略：东方财富搜索API（search-api-web），按公司名称精准搜索个股新闻
 * 副策略：从已抓取的行业热点数据中按关键词补充
 */
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
 * 渲染公司资讯/公告列表
 */
function renderCompanyList() {
  const container = $('#hs-company-list');
  if (!container) return;

  const isNews = state.companyTypeFilter === 'news';
  let items = isNews ? state.companyItems : state.companyAnnouncements;

  // 公司过滤
  if (state.companyFilter !== 'all') {
    items = items.filter(item => item.companyCode === state.companyFilter || item.companyName === state.companyFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="hs-empty">
        <p>${state.watchlist.length === 0 ? '⭐ 点击 ⭐ 添加关注公司' : '📭 暂无匹配的公司资讯'}</p>
        <p class="hs-empty-hint">获取关注公司的热点资讯与公告信息</p>
      </div>`;
    return;
  }

  const displayItems = items.slice(0, 100);

  let html = '';
  displayItems.forEach((item, idx) => {
    // 公司名称标签
    const companyBadge = `<span class="hs-item-source-badge company">${item.companyName}</span>`;

    // 来源标签
    const sources = item.sources || [{ source: item.source, sourceType: item.sourceType, url: item.url }];
    const sourcesHtml = sources.map(s =>
      `<span class="hs-item-source-badge ${s.sourceType || 'custom'}">${s.source}</span>`
    ).join(' ');

    // 公告类型标签
    const tagsHtml = (item.tags || []).map(t =>
      `<span class="hs-item-tag announcement">${t}</span>`
    ).join('');

    html += `
      <div class="hs-item" data-company-idx="${idx}">
        <div class="hs-item-header">
          <div class="hs-item-source">
            ${companyBadge}
            ${sourcesHtml}
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

/**
 * 显示策略详情
 */
function showStrategyDetail(strategyKey) {
  const strategy = STRATEGIES[strategyKey];
  if (!strategy) return;

  $('#strategy-detail-title').textContent = strategy.name;
  const body = $('#strategy-detail-body');
  body.innerHTML = strategy.criteria.map(c =>
    `<div class="criteria-item">
      <span class="criteria-icon">${c.icon}</span>
      <span class="criteria-text">${c.text}</span>
    </div>`
  ).join('');
}

/**
 * 运行选股分析
 */
async function runScreener() {
  const input = $('#screener-input').value.trim();
  if (!input) {
    showToast('请输入候选股票代码或名称');
    return;
  }

  if (!getActiveLLMService()?.apiKey) {
    showSettings();
    showToast('请先配置 LLM API Key');
    return;
  }

  if (state.isScreenerRunning) return;
  state.isScreenerRunning = true;

  const strategy = STRATEGIES[state.activeStrategy];
  $('#screener-result').style.display = 'none';
  $('#screener-loading').style.display = '';
  $('#screener-loading-text').textContent = `正在基于${strategy.name}分析候选股票...`;

  try {
    const userPrompt = `请对以下候选股票进行筛选分析：

${input}

要求：
1. 如果输入的是股票代码，请基于你对该公司的了解进行分析
2. 如果输入的是行业/板块描述，请推荐符合条件的相关股票
3. 如果输入的是条件描述，请推荐符合条件的股票
4. 严格按照策略模板输出`;

    const result = await callLLM(strategy.prompt, userPrompt, true);

    if (result) {
      state.screenerMarkdown = result;
      const container = $('#screener-content');
      container.innerHTML = renderMarkdown(result);
      addSectionIdsAndPlayButtons(container);
      buildTTSSectionsFrom(container);

      $('#screener-loading').style.display = 'none';
      $('#screener-result').style.display = '';
      showToast('✅ 选股分析完成');
    } else {
      throw new Error('分析结果为空');
    }
  } catch (e) {
    $('#screener-loading').style.display = 'none';
    console.error('选股分析错误:', e);
    if (e.message.includes('API key') || e.message.includes('401')) {
      showSettings();
      showToast('API Key 无效');
    } else {
      showToast('分析失败：' + e.message);
    }
  } finally {
    state.isScreenerRunning = false;
  }
}

// ======================== PDF.js 加载 ========================

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '../lib/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';
        resolve();
      } else {
        reject(new Error('PDF.js 加载后全局对象不可用'));
      }
    };
    script.onerror = () => reject(new Error('PDF.js 脚本加载失败'));
    document.head.appendChild(script);
  });
}

// ======================== PDF 检测与提取 ========================

async function checkForPDF() {
  try {
    const tab = await getCurrentTab();
    if (tab && tab.url && isPDFUrl(tab.url)) {
      onPDFDetected({ url: tab.url, title: tab.title });
    }
  } catch (e) {
    console.log('检查PDF失败:', e);
  }
}

function isPDFUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.pdf') || /\.pdf[?#]/i.test(url) || lower.startsWith('chrome://pdf-viewer');
}

async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (e) {
    return null;
  }
}

function onPDFDetected(data) {
  state.pdfUrl = data.url;
  // 切换到财报解读标签
  switchTab('analysis');
  showToast('📄 检测到PDF文件，开始提取内容...');
  startAnalysis();
}

async function extractPDFText() {
  updateLoading('正在提取 PDF 文本内容...');

  const tab = await getCurrentTab();
  if (!tab || !tab.url) return { error: '无法获取当前标签页信息' };

  let pdfUrl = tab.url;
  if (pdfUrl.startsWith('chrome://pdf-viewer')) {
    try {
      const src = new URL(pdfUrl).searchParams.get('src');
      if (src) pdfUrl = src;
      else return { error: '无法从 Chrome PDF 查看器获取原始 PDF 地址' };
    } catch (e) {
      return { error: 'PDF URL 解析失败' };
    }
  }

  updateLoading('正在下载 PDF 文件...');

  let pdfResult;
  try {
    pdfResult = await chrome.runtime.sendMessage({ type: 'FETCH_PDF_DATA', url: pdfUrl });
  } catch (e) {
    return { error: `请求下载PDF失败: ${e.message}` };
  }

  if (!pdfResult) return { error: '下载PDF返回为空' };
  if (pdfResult.error) return { error: pdfResult.error };

  updateLoading('正在解析 PDF 内容...');

  let arrayBuffer;
  try {
    if (pdfResult.chunks) {
      const total = new Uint8Array(pdfResult.totalLength);
      let offset = 0;
      for (const chunk of pdfResult.chunks) {
        total.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }
      arrayBuffer = total.buffer;
    } else if (pdfResult.data) {
      arrayBuffer = new Uint8Array(pdfResult.data).buffer;
    } else {
      return { error: 'PDF数据格式异常' };
    }
  } catch (e) {
    return { error: `PDF数据转换失败: ${e.message}` };
  }

  try { await loadPdfJs(); } catch (e) { return { error: `PDF.js 加载失败: ${e.message}` }; }

  try {
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= totalPages; i++) {
      updateLoading(`正在提取第 ${i}/${totalPages} 页...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      let lastY = null, pageText = '';
      for (const item of textContent.items) {
        if (item.str === undefined) continue;
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) pageText += '\n';
        else if (lastY !== null) pageText += ' ';
        pageText += item.str;
        lastY = y;
      }
      fullText += `--- 第${i}页 ---\n${pageText}\n\n`;
    }
    return { text: fullText, pageCount: totalPages };
  } catch (e) {
    return { error: `PDF解析失败: ${e.message}` };
  }
}

// ======================== 粘贴区域 ========================

function showPasteArea() {
  $('.analysis-container').style.display = 'none';
  $('#paste-area').style.display = '';
}

function hidePasteArea() {
  $('#paste-area').style.display = 'none';
  $('.analysis-container').style.display = '';
}

async function submitPastedText() {
  const text = $('#paste-input').value.trim();
  if (!text) { showToast('请粘贴财报文本内容'); return; }
  if (text.length < 100) { showToast('文本内容太少'); return; }
  state.pdfText = text;
  $('#paste-area').style.display = 'none';
  await generateReport(text);
}

// ======================== 财报解读 - 股票搜索与财报列表 ========================

/**
 * 搜索股票（财报解读入口）
 */
async function analysisSearchStock(keyword) {
  if (!keyword) { hideAnalysisSuggest(); return; }
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.QuotationCodeTable?.Data?.length) { hideAnalysisSuggest(); return; }

    const items = data.QuotationCodeTable.Data.filter(item =>
      item.MktNum === '0' || item.MktNum === '1' ||
      ['沪A','深A','科创板','创业板'].includes(item.SecurityTypeName)
    ).slice(0, 8);

    if (!items.length) { hideAnalysisSuggest(); return; }
    renderAnalysisSuggest(items);
  } catch (e) { hideAnalysisSuggest(); }
}

function renderAnalysisSuggest(items) {
  const container = $('#analysis-suggest');
  container.innerHTML = '';
  state.analysisSuggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    const code = item.Code || '';
    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
    `;
    div.addEventListener('click', () => {
      const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;
      const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
      selectAnalysisStock(fullCode, item.Name || '', secid);
      hideAnalysisSuggest();
    });
    container.appendChild(div);
  });
  container.style.display = '';
}

function updateAnalysisSuggestActive(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === state.analysisSuggestIndex));
  if (state.analysisSuggestIndex >= 0 && items[state.analysisSuggestIndex]) {
    items[state.analysisSuggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideAnalysisSuggest() {
  const c = $('#analysis-suggest');
  if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  state.analysisSuggestIndex = -1;
}

/**
 * 选择股票 → 获取财报列表
 */
async function selectAnalysisStock(code, name, secid) {
  $('#analysis-search-input').value = `${name}(${code})`;
  state.analysisStock = { code, name, secid };
  state.analysisReports = [];
  state.analysisSelectedReport = null;

  // 显示列表区域，loading态
  const listEl = $('#analysis-report-list');
  listEl.style.display = '';
  $('#analysis-stock-title').textContent = `${name} 财报列表`;
  $('#analysis-stock-code').textContent = code;
  $('#analysis-report-items').innerHTML = '<div class="stock-suggest-hint">🔍 正在获取财报列表...</div>';

  try {
    const code6 = code.replace(/\.(SH|SZ)/, '');
    // 使用东方财富财务主要指标接口获取财报日期列表
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=8&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=REPORT_DATE,REPORT_DATE_NAME,SECURITY_CODE&filter=(SECURITY_CODE%3D%22${code6}%22)`;
    const resp = await fetch(url);
    const result = await resp.json();

    if (!result?.result?.data?.length) {
      $('#analysis-report-items').innerHTML = '<div class="stock-suggest-hint">未找到财报数据</div>';
      return;
    }

    state.analysisReports = result.result.data.map(item => ({
      reportDate: item.REPORT_DATE,
      reportDateName: item.REPORT_DATE_NAME || item.REPORT_DATE?.substring(0, 10),
      code: code6,
      tsCode: code,
      secid: secid,
    }));

    renderAnalysisReportList();
  } catch (e) {
    console.error('获取财报列表失败:', e);
    $('#analysis-report-items').innerHTML = '<div class="stock-suggest-hint">获取财报列表失败</div>';
  }
}

/**
 * 渲染财报列表
 */
function renderAnalysisReportList() {
  const container = $('#analysis-report-items');
  container.innerHTML = '';

  state.analysisReports.forEach((report, idx) => {
    const div = document.createElement('div');
    div.className = 'analysis-report-item';

    // 判断报告类型
    const dateStr = report.reportDateName || '';
    let reportType = '季报';
    let typeClass = 'quarter';
    if (dateStr.includes('12-31') || dateStr.includes('年度')) {
      reportType = '年报';
      typeClass = 'annual';
    } else if (dateStr.includes('06-30') || dateStr.includes('中期') || dateStr.includes('半年')) {
      reportType = '中报';
      typeClass = 'semi';
    } else if (dateStr.includes('09-30') || dateStr.includes('第三')) {
      reportType = '三季报';
      typeClass = 'quarter';
    } else if (dateStr.includes('03-31') || dateStr.includes('第一')) {
      reportType = '一季报';
      typeClass = 'quarter';
    }

    div.innerHTML = `
      <div class="analysis-report-item-left">
        <span class="analysis-report-item-title">${report.reportDateName || dateStr}</span>
        <span class="analysis-report-item-date">${report.tsCode}</span>
      </div>
      <span class="analysis-report-item-type ${typeClass}">${reportType}</span>
      <button class="btn-analysis-start" data-idx="${idx}">解读</button>
    `;

    div.querySelector('.btn-analysis-start').addEventListener('click', (e) => {
      e.stopPropagation();
      selectAnalysisReport(idx);
    });

    container.appendChild(div);
  });
}

/**
 * 选择某个财报 → 拉取三大报表数据 → 交给 LLM 解读
 */
async function selectAnalysisReport(idx) {
  const report = state.analysisReports[idx];
  if (!report) return;

  state.analysisSelectedReport = report;

  if (state.isAnalyzing) return;
  state.isAnalyzing = true;

  // 隐藏搜索区和列表，显示loading
  $('.analysis-container').style.display = 'none';
  $('#analysis-result').style.display = 'none';
  showLoading('正在获取财报数据...');

  if (!getActiveLLMService()?.apiKey) {
    hideLoading();
    showSettings();
    showToast('请先配置 LLM API Key');
    state.isAnalyzing = false;
    return;
  }

  try {
    const code6 = report.code;
    const tsCode = report.tsCode;
    const secid = report.secid;
    const reportDate = report.reportDate?.substring(0, 10) || '';

    // ===== 1. 获取当前报告期利润表 =====
    let incomeData = null;
    try {
      updateLoading('正在获取利润表...');
      const incomeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)(REPORT_DATE%3D%27${reportDate}%27)`;
      const incomeResp = await fetch(incomeUrl);
      const incomeResult = await incomeResp.json();
      if (incomeResult?.result?.data?.length) incomeData = incomeResult.result.data[0];
    } catch (e) { console.log('利润表获取失败:', e); }

    // ===== 2. 获取当前报告期资产负债表 =====
    let balanceData = null;
    try {
      updateLoading('正在获取资产负债表...');
      const bsUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_BALANCE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)(REPORT_DATE%3D%27${reportDate}%27)`;
      const bsResp = await fetch(bsUrl);
      const bsResult = await bsResp.json();
      if (bsResult?.result?.data?.length) balanceData = bsResult.result.data[0];
    } catch (e) { console.log('资产负债表获取失败:', e); }

    // ===== 3. 获取当前报告期现金流量表 =====
    let cashflowData = null;
    try {
      updateLoading('正在获取现金流量表...');
      const cfUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)(REPORT_DATE%3D%27${reportDate}%27)`;
      const cfResp = await fetch(cfUrl);
      const cfResult = await cfResp.json();
      if (cfResult?.result?.data?.length) cashflowData = cfResult.result.data[0];
    } catch (e) { console.log('现金流量表获取失败:', e); }

    // ===== 4. 获取当前报告期财务主要指标 =====
    let finMainData = null;
    try {
      updateLoading('正在获取主要财务指标...');
      const finMainUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)(REPORT_DATE%3D%27${reportDate}%27)`;
      const finMainResp = await fetch(finMainUrl);
      const finMainResult = await finMainResp.json();
      if (finMainResult?.result?.data?.length) finMainData = finMainResult.result.data[0];
    } catch (e) { console.log('主要指标获取失败:', e); }

    // ===== 5. 获取多期历史数据（近8期），用于同比环比和趋势分析 =====
    let multiYearData = [];
    try {
      updateLoading('正在获取历史财务趋势...');
      const myUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=8&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const myResp = await fetch(myUrl);
      const myResult = await myResp.json();
      if (myResult?.result?.data?.length) multiYearData = myResult.result.data;
    } catch (e) { console.log('历史趋势数据获取失败:', e); }

    // ===== 6. 获取多期利润表（近4期，计算同比环比） =====
    let multiIncomeData = [];
    try {
      updateLoading('正在获取利润表趋势...');
      const miUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=4&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const miResp = await fetch(miUrl);
      const miResult = await miResp.json();
      if (miResult?.result?.data?.length) multiIncomeData = miResult.result.data;
    } catch (e) { console.log('多期利润表获取失败:', e); }

    // ===== 7. 获取多期现金流量表（近4期） =====
    let multiCashflowData = [];
    try {
      updateLoading('正在获取现金流趋势...');
      const mcUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=4&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const mcResp = await fetch(mcUrl);
      const mcResult = await mcResp.json();
      if (mcResult?.result?.data?.length) multiCashflowData = mcResult.result.data;
    } catch (e) { console.log('多期现金流获取失败:', e); }

    // ===== 8. 获取实时行情（PE/PB/市值/股价等） =====
    let quoteData = {};
    try {
      updateLoading('正在获取实时行情...');
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secid}&fields=f2,f3,f9,f12,f14,f20,f23,f115&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteResult = await quoteResp.json();
      if (quoteResult?.data?.diff?.[0]) quoteData = quoteResult.data.diff[0];
    } catch (e) { console.log('行情接口失败:', e); }

    // ===== 9. 构建财报文本 =====
    updateLoading('正在构建财报摘要...');
    const reportText = buildFinancialReportText(
      state.analysisStock.name, report.reportDateName,
      finMainData, incomeData, balanceData, cashflowData,
      multiYearData, multiIncomeData, multiCashflowData, quoteData
    );

    if (!reportText || reportText.trim().length < 50) {
      hideLoading();
      showToast('获取的财报数据不足，无法解读');
      state.isAnalyzing = false;
      $('.analysis-container').style.display = '';
      return;
    }

    // 10. 交给 LLM 生成解读报告
    state.pdfText = reportText;
    await generateReport(reportText);

  } catch (e) {
    hideLoading();
    console.error('财报解读错误:', e);
    showToast('财报解读失败：' + e.message);
    $('.analysis-container').style.display = '';
  } finally {
    state.isAnalyzing = false;
  }
}

/**
 * 从接口数据构建结构化的财报文本，供 LLM 分析
 * 新增：多期历史数据、同比环比、实时行情、关键指标判断标准
 */
function buildFinancialReportText(stockName, reportDateName, finMain, income, balance, cashflow, multiYear, multiIncome, multiCashflow, quoteData) {
  let text = `# ${stockName} ${reportDateName || ''} 财务报告\n\n`;

  // ===== 实时行情数据 =====
  if (quoteData && (quoteData.f2 || quoteData.f9)) {
    text += `## 实时行情数据\n`;
    if (quoteData.f2 != null) text += `- 当前股价: ${quoteData.f2} 元\n`;
    if (quoteData.f3 != null) text += `- 今日涨跌幅: ${quoteData.f3 > 0 ? '+' : ''}${quoteData.f3}%\n`;
    if (quoteData.f9 != null) text += `- PE(TTM): ${quoteData.f9}\n`;
    if (quoteData.f23 != null) text += `- PB: ${quoteData.f23}\n`;
    if (quoteData.f20 != null) {
      const mv = quoteData.f20;
      text += `- 总市值: ${mv >= 100000000 ? (mv / 100000000).toFixed(2) + '亿元' : (mv / 10000).toFixed(0) + '万元'}\n`;
    }
    if (quoteData.f115 != null) text += `- ROE: ${quoteData.f115}%\n`;
    text += `\n`;
  }

  // ===== 主要财务指标（当期） =====
  if (finMain) {
    text += `## 主要财务指标\n`;
    text += `- 报告期: ${finMain.REPORT_DATE_NAME || finMain.REPORT_DATE || '--'}\n`;
    text += `- 行业: ${finMain.INDUSTRY_NAME || '--'}\n`;
    text += `- 期末每股收益(基本): ${finMain.EPSJB ?? '--'} 元\n`;
    text += `- 期末每股收益(扣非): ${finMain.EPSKCJB ?? '--'} 元\n`;
    text += `- 每股净资产: ${finMain.BPS ?? '--'} 元\n`;
    text += `- 每股经营现金流: ${finMain.MGJYXJJE ?? '--'} 元\n`;
    text += `- 每股未分配利润: ${finMain.MGWFPLR ?? '--'} 元\n`;
    text += `- 营业收入: ${finMain.TOTALOPERATEREVE ?? '--'} 元\n`;
    text += `- 归母净利润: ${finMain.PARENTNETPROFIT ?? '--'} 元\n`;
    text += `- 扣非归母净利润: ${finMain.DEDUCT_PARENT_NETPROFIT ?? '--'} 元\n`;
    text += `- 销售毛利率: ${finMain.XSMLL ?? '--'}%\n`;
    text += `- 销售净利率: ${finMain.XSJLL ?? '--'}%\n`;
    text += `- 营收同比增长率: ${finMain.TOTALOPERATEREVETZ ?? '--'}%\n`;
    text += `- 净利润同比增长率: ${finMain.PARENTNETPROFITTZ ?? '--'}%\n`;
    text += `- 扣非净利润同比增长率: ${finMain.DEDUCT_PARENT_NETPROFITTZ ?? '--'}%\n`;
    text += `- 资产负债率: ${finMain.ZCFZL ?? '--'}%\n`;
    text += `- 流动比率: ${finMain.LD ?? '--'}\n`;
    text += `- 速动比率: ${finMain.SD ?? '--'}\n`;
    text += `- ROE(加权): ${finMain.ROEJQ ?? '--'}%\n`;
    text += `- ROE(扣非/加权): ${finMain.ROEKCJQ ?? '--'}%\n`;
    text += `- ROIC: ${finMain.ROIC ?? '--'}%\n`;
    text += `- 每股资本公积: ${finMain.MGZBGJ ?? '--'} 元\n`;
    text += `- 每股盈余公积: ${finMain.MGYYGJ ?? '--'} 元\n`;
    text += `\n`;
  }

  // ===== 利润表 =====
  if (income) {
    text += `## 利润表\n`;
    text += `- 营业总收入: ${income.TOTAL_OPERATE_INCOME ?? '--'} 元\n`;
    text += `- 营业总成本: ${income.TOTAL_OPERATE_COST ?? '--'} 元\n`;
    text += `- 营业成本: ${income.OPERATE_COST ?? '--'} 元\n`;
    text += `- 营业利润: ${income.OPERATE_PROFIT ?? '--'} 元\n`;
    text += `- 利润总额: ${income.TOTAL_PROFIT ?? '--'} 元\n`;
    text += `- 净利润: ${income.NETPROFIT ?? '--'} 元\n`;
    text += `- 归母净利润: ${income.PARENT_NETPROFIT ?? '--'} 元\n`;
    text += `- 扣非归母净利润: ${income.DEDUCT_PARENT_NETPROFIT ?? '--'} 元\n`;
    text += `- 其他收益: ${income.OTHER_INCOME ?? '--'} 元\n`;
    text += `- 投资收益: ${income.INVEST_INCOME ?? '--'} 元\n`;
    text += `- 公允价值变动收益: ${income.FAIR_VALUE_CHANGE_INCOME ?? '--'} 元\n`;
    text += `- 信用减值损失: ${income.CREDIT_IMPAIRMENT ?? '--'} 元\n`;
    text += `- 资产减值损失: ${income.ASSET_IMPAIRMENT ?? '--'} 元\n`;
    text += `- 销售费用: ${income.SALE_EXPENSE ?? '--'} 元\n`;
    text += `- 管理费用: ${income.MANAGE_EXPENSE ?? '--'} 元\n`;
    text += `- 财务费用: ${income.FINANCE_EXPENSE ?? '--'} 元\n`;
    text += `- 研发费用: ${income.RESEARCH_EXPENSE ?? '--'} 元\n`;
    text += `- 营业总收入同比增长: ${income.TOI_RATIO ?? '--'}%\n`;
    text += `- 归母净利润同比增长: ${income.PARENT_NETPROFIT_RATIO ?? '--'}%\n`;
    text += `- 扣非归母净利润同比增长: ${income.DEDUCT_PARENT_NETPROFIT_RATIO ?? '--'}%\n`;
    text += `\n`;
  }

  // ===== 资产负债表 =====
  if (balance) {
    text += `## 资产负债表\n`;
    text += `- 总资产: ${balance.TOTAL_ASSETS ?? '--'} 元\n`;
    text += `- 总负债: ${balance.TOTAL_LIABILITIES ?? '--'} 元\n`;
    text += `- 所有者权益合计: ${balance.TOTAL_EQUITY ?? '--'} 元\n`;
    text += `- 归母所有者权益: ${balance.PARENT_EQUITY ?? '--'} 元\n`;
    text += `- 货币资金: ${balance.MONETARYFUNDS ?? '--'} 元\n`;
    text += `- 交易性金融资产: ${balance.TRADING_FIN_ASSET ?? '--'} 元\n`;
    text += `- 应收票据: ${balance.NOTES_RECE ?? '--'} 元\n`;
    text += `- 应收账款: ${balance.ACCOUNTS_RECE ?? '--'} 元\n`;
    text += `- 预付款项: ${balance.PREPAYMENT ?? '--'} 元\n`;
    text += `- 存货: ${balance.INVENTORY ?? '--'} 元\n`;
    text += `- 其他应收款: ${balance.OTHER_RECE ?? '--'} 元\n`;
    text += `- 应付账款: ${balance.ACCOUNTS_PAYABLE ?? '--'} 元\n`;
    text += `- 预收款项: ${balance.ADVANCE_RECEIVABLES ?? '--'} 元\n`;
    text += `- 合同负债: ${balance.CONTRACT_LIAB ?? '--'} 元\n`;
    text += `- 固定资产: ${balance.FIXED_ASSET ?? '--'} 元\n`;
    text += `- 在建工程: ${balance.CONSTRUCT_PRODUCT ?? '--'} 元\n`;
    text += `- 无形资产: ${balance.INTANGIBLE_ASSET ?? '--'} 元\n`;
    text += `- 商誉: ${balance.GOODWILL ?? '--'} 元\n`;
    text += `- 长期待摊费用: ${balance.LONG_PREPAID_EXPENSE ?? '--'} 元\n`;
    text += `- 递延所得税资产: ${balance.DEFER_TAX_ASSETS ?? '--'} 元\n`;
    text += `- 短期借款: ${balance.SHORT_LOAN ?? '--'} 元\n`;
    text += `- 长期借款: ${balance.LONG_LOAN ?? '--'} 元\n`;
    text += `- 应付债券: ${balance.BONDS_PAYABLE ?? '--'} 元\n`;
    text += `- 租赁负债: ${balance.LEASE_LIAB ?? '--'} 元\n`;
    text += `- 资产负债率: ${balance.DEBT_ASSET_RATIO ?? '--'}%\n`;
    text += `\n`;
  }

  // ===== 现金流量表 =====
  if (cashflow) {
    text += `## 现金流量表\n`;
    text += `- 经营活动现金流净额: ${cashflow.NETCASH_OPERATE ?? '--'} 元\n`;
    text += `- 投资活动现金流净额: ${cashflow.NETCASH_INVEST ?? '--'} 元\n`;
    text += `- 筹资活动现金流净额: ${cashflow.NETCASH_FINANCE ?? '--'} 元\n`;
    text += `- 购建固定资产等(资本支出): ${cashflow.CONSTRUCT_LONG_ASSET ?? '--'} 元\n`;
    text += `- 取得投资收益收到的现金: ${cashflow.INVEST_INCOME_CASH ?? '--'} 元\n`;
    text += `- 取得借款收到的现金: ${cashflow.BORROW_CASH ?? '--'} 元\n`;
    text += `- 偿还债务支付的现金: ${cashflow.REPAY_CASH ?? '--'} 元\n`;
    text += `- 分配股利支付的现金: ${cashflow.DIVIDEND_CASH ?? '--'} 元\n`;

    // ===== 三大现金流关系分析小结 =====
    const opCF = parseFloat(cashflow.NETCASH_OPERATE);
    const invCF = parseFloat(cashflow.NETCASH_INVEST);
    const finCF = parseFloat(cashflow.NETCASH_FINANCE);
    if (!isNaN(opCF) && !isNaN(invCF) && !isNaN(finCF)) {
      text += `\n### 三大现金流关系分析小结\n`;
      const fmtYi2 = (v) => {
        const n = parseFloat(v);
        if (isNaN(n)) return '--';
        return (n / 100000000).toFixed(2) + '亿';
      };
      text += `| 现金流类型 | 金额(亿元) | 方向 |\n`;
      text += `|-----------|-----------|------|\n`;
      text += `| 经营活动现金流净额 | ${fmtYi2(cashflow.NETCASH_OPERATE)} | ${opCF > 0 ? '📈 流入' : opCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
      text += `| 投资活动现金流净额 | ${fmtYi2(cashflow.NETCASH_INVEST)} | ${invCF > 0 ? '📈 流入' : invCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
      text += `| 筹资活动现金流净额 | ${fmtYi2(cashflow.NETCASH_FINANCE)} | ${finCF > 0 ? '📈 流入' : finCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;

      // 判断现金流类型组合
      const opPos = opCF > 0 ? '+' : '-';
      const invPos = invCF > 0 ? '+' : '-';
      const finPos = finCF > 0 ? '+' : '-';
      const pattern = `${opPos}${invPos}${finPos}`;

      text += `\n**现金流类型判断**：${pattern}\n`;
      const interpretations = {
        '++-': '【成熟奶牛型】经营造血、投资回收、偿还融资，财务最健康，常见于成熟期白马股',
        '+--': '【扩张成长型】经营造血、投资扩张、偿还融资，积极扩张中，需关注投资回报率',
        '+-+': '【融资扩张型】经营造血但不足以覆盖投资，需外部融资补充，扩张激进，需警惕偿债压力',
        '+++' : '【转型/收缩型】经营流入+投资回收+融资流入，可能正在收缩战线或准备大额投资，需结合具体项目判断',
        '+-0': '【稳健经营型】经营造血、适度投资、融资平衡，财务稳健',
        '-++': '【创业/困境型】经营失血、靠投资回收和融资维持，需高度警惕经营恶化风险',
        '-+-': '【快速扩张烧钱型】经营失血、投资扩张、偿还融资，典型高成长高消耗，需关注资金链',
        '--+': '【输血续命型】经营失血+投资失血，完全靠融资维持，财务风险极高',
        '-+0': '【收缩调整型】经营失血、投资回收、融资平衡，正在收缩但经营尚未恢复',
        '--0': '【双杀衰退型】经营和投资都失血、融资平衡，需紧急改善经营或寻求融资',
        '---': '【全面失血型】三大现金流均为流出，财务危机信号，需紧急干预',
      };
      // 匹配模式（精确匹配或模糊匹配）
      let interpretation = interpretations[pattern];
      if (!interpretation) {
        // 模糊匹配：0 视为正或负
        const fuzzyPattern = pattern.replace(/0/g, opCF >= 0 ? '+' : '-');
        interpretation = interpretations[fuzzyPattern] || '需结合行业特点和公司阶段综合判断';
      }
      text += `\n**分析结论**：${interpretation}\n`;

      // 经营CF/净利润比率（盈利质量）
      const netProfit = parseFloat(income?.PARENT_NETPROFIT);
      if (!isNaN(netProfit) && netProfit !== 0) {
        const opCFRatio = (opCF / netProfit).toFixed(2);
        text += `\n**盈利质量**：经营CF/归母净利润 = ${opCFRatio}（${parseFloat(opCFRatio) >= 1.0 ? '✅ 利润有现金支撑' : parseFloat(opCFRatio) >= 0.7 ? '⚠️ 利润含金量一般' : '❌ 利润含金量不足，需关注应收及库存'}）\n`;
      }

      // 自由现金流估算
      const capEx = parseFloat(cashflow.CONSTRUCT_LONG_ASSET);
      if (!isNaN(capEx)) {
        const fcf = opCF + invCF; // 近似自由现金流
        text += `**自由现金流(近似)**：经营CF + 投资CF = ${fmtYi2(opCF + invCF)}亿元（${fcf > 0 ? '✅ 正向自由现金流' : '❌ 自由现金流为负，投资消耗超过经营造血'}）\n`;
      }
    }
    text += `\n`;
  }

  // ===== 近8期主要指标趋势（补充缺失、计算同比环比） =====
  if (multiYear && multiYear.length > 1) {
    text += `## 近期财务指标趋势\n`;
    text += `| 报告期 | EPS | 每股净资产 | 毛利率 | 净利率 | ROE(加权) | ROIC | 营收增速 | 净利增速 | 扣非净利增速 | 负债率 | 流动比率 |\n`;
    text += `|--------|-----|-----------|--------|--------|-----------|------|----------|----------|-------------|--------|----------|\n`;
    multiYear.slice(0, 8).forEach(r => {
      text += `| ${r.REPORT_DATE_NAME || r.REPORT_DATE?.substring(0,10) || '--'} `;
      text += `| ${r.EPSJB ?? '--'} `;
      text += `| ${r.BPS ?? '--'} `;
      text += `| ${r.XSMLL ?? '--'}% `;
      text += `| ${r.XSJLL ?? '--'}% `;
      text += `| ${r.ROEJQ ?? '--'}% `;
      text += `| ${r.ROIC ?? '--'}% `;
      text += `| ${r.TOTALOPERATEREVETZ ?? '--'}% `;
      text += `| ${r.PARENTNETPROFITTZ ?? '--'}% `;
      text += `| ${r.DEDUCT_PARENT_NETPROFITTZ ?? '--'}% `;
      text += `| ${r.ZCFZL ?? '--'}% `;
      text += `| ${r.LD ?? '--'} |\n`;
    });
    text += `\n`;
  }

  // ===== 近4期利润表趋势 =====
  if (multiIncome && multiIncome.length > 1) {
    text += `## 近期利润表趋势\n`;
    text += `| 报告期 | 营业总收入 | 营业总成本 | 营业利润 | 归母净利润 | 扣非归母净利润 | 销售费用 | 管理费用 | 研发费用 | 营收增速 | 净利增速 |\n`;
    text += `|--------|-----------|-----------|---------|-----------|---------------|---------|---------|---------|---------|--------|\n`;
    multiIncome.slice(0, 4).forEach(r => {
      const fmtYi = (v) => {
        if (v == null || v === '') return '--';
        const n = parseFloat(v);
        if (isNaN(n)) return '--';
        return (n / 100000000).toFixed(2) + '亿';
      };
      text += `| ${r.REPORT_DATE_NAME || r.REPORT_DATE?.substring(0,10) || '--'} `;
      text += `| ${fmtYi(r.TOTAL_OPERATE_INCOME)} `;
      text += `| ${fmtYi(r.TOTAL_OPERATE_COST)} `;
      text += `| ${fmtYi(r.OPERATE_PROFIT)} `;
      text += `| ${fmtYi(r.PARENT_NETPROFIT)} `;
      text += `| ${fmtYi(r.DEDUCT_PARENT_NETPROFIT)} `;
      text += `| ${fmtYi(r.SALE_EXPENSE)} `;
      text += `| ${fmtYi(r.MANAGE_EXPENSE)} `;
      text += `| ${fmtYi(r.RESEARCH_EXPENSE)} `;
      text += `| ${r.TOI_RATIO ?? '--'}% `;
      text += `| ${r.PARENT_NETPROFIT_RATIO ?? '--'}% |\n`;
    });
    text += `\n`;
  }

  // ===== 近4期现金流趋势 =====
  if (multiCashflow && multiCashflow.length > 1) {
    text += `## 近期现金流量趋势\n`;
    text += `| 报告期 | 经营CF净额 | 投资CF净额 | 筹资CF净额 | 资本支出 | 分配股利 |\n`;
    text += `|--------|-----------|-----------|-----------|---------|---------|\n`;
    multiCashflow.slice(0, 4).forEach(r => {
      const fmtYi = (v) => {
        if (v == null || v === '') return '--';
        const n = parseFloat(v);
        if (isNaN(n)) return '--';
        return (n / 100000000).toFixed(2) + '亿';
      };
      text += `| ${r.REPORT_DATE_NAME || r.REPORT_DATE?.substring(0,10) || '--'} `;
      text += `| ${fmtYi(r.NETCASH_OPERATE)} `;
      text += `| ${fmtYi(r.NETCASH_INVEST)} `;
      text += `| ${fmtYi(r.NETCASH_FINANCE)} `;
      text += `| ${fmtYi(r.CONSTRUCT_LONG_ASSET)} `;
      text += `| ${fmtYi(r.DIVIDEND_CASH)} |\n`;
    });
    text += `\n`;
  }

  // ===== 关键指标判断标准（供 LLM 参照） =====
  text += `## 关键指标判断标准\n`;
  text += `以下是各关键指标的通用判断标准，请参照这些标准对上述数据逐项评价：\n\n`;
  text += `| 指标 | 优秀 | 良好 | 一般 | 较差 | 说明 |\n`;
  text += `|------|------|------|------|------|------|\n`;
  text += `| ROE(加权) | ≥20% | 15%-20% | 8%-15% | <8% | 衡量股东资本使用效率 |\n`;
  text += `| 销售毛利率 | ≥40% | 25%-40% | 15%-25% | <15% | 反映产品竞争力与定价权 |\n`;
  text += `| 销售净利率 | ≥20% | 10%-20% | 5%-10% | <5% | 反映整体盈利能力 |\n`;
  text += `| 营收增速 | ≥30% | 15%-30% | 5%-15% | <5% | 衡量成长性 |\n`;
  text += `| 净利润增速 | ≥30% | 15%-30% | 5%-15% | <5% | 衡量利润成长性 |\n`;
  text += `| 资产负债率 | <30% | 30%-50% | 50%-70% | >70% | 衡量财务风险 |\n`;
  text += `| 流动比率 | ≥2.0 | 1.5-2.0 | 1.0-1.5 | <1.0 | 衡量短期偿债能力 |\n`;
  text += `| 速动比率 | ≥1.5 | 1.0-1.5 | 0.5-1.0 | <0.5 | 扣除存货后偿债能力 |\n`;
  text += `| ROIC | ≥15% | 10%-15% | 6%-10% | <6% | 衡量投入资本回报效率 |\n`;
  text += `| 经营CF/净利润 | ≥1.2 | 0.8-1.2 | 0.5-0.8 | <0.5 | 盈利质量，>1表示利润有现金支撑 |\n`;
  text += `| PE(TTM) | <15 | 15-25 | 25-40 | >40 | 估值水平（需结合增速判断） |\n`;
  text += `| PB | <1.5 | 1.5-3.0 | 3.0-5.0 | >5.0 | 资产估值水平 |\n`;
  text += `| 投资CF净额/经营CF净额 | -30%~-80% | -80%~-150% | -150%~-300% | <-300%或>0% | 投资扩张力度（负值=扩张，正值=收缩） |\n`;
  text += `| 筹资CF净额/经营CF净额 | -30%~0% | -60%~-30% 或 0%~30% | -100%~-60% 或 30%~60% | <-100%或>60% | 融资依赖度（正=借债，负=还债/分红） |\n`;
  text += `\n`;

  return text;
}

// ======================== 财报分析流程 ========================

async function startAnalysis() {
  if (state.isAnalyzing) return;
  showLoading('正在准备分析...');
  $('.analysis-container').style.display = 'none';
  $('#analysis-result').style.display = 'none';

  if (state.pdfText) { await generateReport(state.pdfText); return; }

  const result = await extractPDFText();
  if (result.error) {
    hideLoading();
    showToast('❌ ' + result.error);
    showPasteArea();
    return;
  }
  if (!result.text || result.text.trim().length < 50) {
    hideLoading();
    showToast('提取文本过少，PDF可能是扫描版');
    showPasteArea();
    return;
  }

  state.pdfText = result.text;
  showToast(`✅ 成功提取 ${result.pageCount} 页内容`);
  await generateReport(result.text);
}

async function generateReport(text) {
  state.isAnalyzing = true;
  showLoading('正在分析财报内容，生成解读报告...');

  if (!getActiveLLMService()?.apiKey) {
    hideLoading(); showSettings(); showToast('请先配置 LLM API Key');
    state.isAnalyzing = false; return;
  }

  try {
    const truncatedText = truncateText(text, 30000);
    const userPrompt = `请对以下财报文本进行深度解读分析：\n---\n${truncatedText}\n---\n请严格按照报告模板结构输出。`;
    const result = await callLLM(ANALYSIS_SYSTEM_PROMPT, userPrompt, true);

    if (result) {
      state.reportMarkdown = result;
      renderReport(result);
      hideLoading();
      $('#analysis-result').style.display = '';
      buildTOC();
      buildTTSSectionsFrom($('#report-content'));
    } else {
      throw new Error('LLM调用返回为空');
    }
  } catch (e) {
    hideLoading();
    console.error('报告生成错误:', e);
    if (e.message.includes('API key') || e.message.includes('401')) {
      showSettings(); showToast('API Key 无效');
    } else {
      showToast('分析失败：' + e.message);
      if (!state.reportMarkdown) {
        $('.analysis-container').style.display = '';
        $('#analysis-result').style.display = 'none';
      }
    }
  } finally {
    state.isAnalyzing = false;
  }
}

// ======================== LLM API 调用 ========================

async function callLLM(systemPrompt, userMessage, stream = false, streamTarget = 'analysis') {
  const service = getActiveLLMService();
  const { baseUrl, apiKey, model } = service;
  if (!apiKey) throw new Error('未配置 API Key');

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model, messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    stream, temperature: 0.3, max_tokens: 8000
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API请求失败 (${response.status})`);
  }

  if (stream) {
    const onChunk = streamTarget === 'stock-analysis'
      ? (text) => { state.saMarkdown = text; renderSAReportStreaming(text); }
      : (text) => { state.reportMarkdown = text; renderReportStreaming(text); };
    return await handleStreamResponse(response, onChunk);
  } else {
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

async function callLLMChat(messages) {
  const service = getActiveLLMService();
  const { baseUrl, apiKey, model } = service;
  if (!apiKey) throw new Error('未配置 API Key');

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const contextMarkdown = state.screenerMarkdown || state.saMarkdown || state.reportMarkdown;
  const systemMsg = {
    role: 'system',
    content: CHAT_SYSTEM_PROMPT + (contextMarkdown ?
      `\n\n以下是已生成的分析报告摘要，供你参考：\n${contextMarkdown.substring(0, 5000)}` : '')
  };

  const body = {
    model, messages: [systemMsg, ...messages],
    stream: true, temperature: 0.4, max_tokens: 4000
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API请求失败 (${response.status})`);
  }
  return response;
}

async function handleStreamResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '', buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) { fullText += delta; if (onChunk) onChunk(fullText); }
      } catch (e) {}
    }
  }
  return fullText;
}

// ======================== 报告渲染 ========================

function renderReport(markdown) {
  const container = $('#report-content');
  container.innerHTML = renderMarkdown(markdown);
  container.classList.remove('streaming-cursor');
  addSectionIdsAndPlayButtons(container);
}

function renderReportStreaming(markdown) {
  const container = $('#report-content');
  if ($('#analysis-result').style.display === 'none') {
    $('#analysis-result').style.display = '';
    hideLoading();
  }
  container.innerHTML = renderMarkdown(markdown);
  container.classList.add('streaming-cursor');
  clearTimeout(window._streamTimeout);
  window._streamTimeout = setTimeout(() => {
    container.classList.remove('streaming-cursor');
    addSectionIdsAndPlayButtons(container);
    buildTOC();
    buildTTSSectionsFrom(container);
  }, 3000);
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = renderTables(html);
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/^(?!<[hupblo]|<li|<hr|<pre|<code|<table|<thead|<tbody|<tr|<td|<th|<strong|<em|<blockquote)(.+)$/gm, '<p>$1</p>');
  return html;
}

function renderTables(html) {
  const tableRegex = /(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/g;
  return html.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
    const headers = headerRow.split('|').filter(c => c.trim()).map(c => c.trim());
    const rows = bodyRows.trim().split('\n').map(row =>
      row.split('|').filter(c => c.trim()).map(c => c.trim())
    );
    let table = '<table><thead><tr>';
    headers.forEach(h => { table += `<th>${h}</th>`; });
    table += '</tr></thead><tbody>';
    rows.forEach(row => {
      table += '<tr>';
      row.forEach(cell => { table += `<td>${cell}</td>`; });
      table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
  });
}

function addSectionIdsAndPlayButtons(container) {
  if (!container) return;
  const headings = container.querySelectorAll('h1, h2, h3');
  headings.forEach((h, index) => {
    const id = `section-${container.id}-${index}`;
    h.id = id;
    if (!h.querySelector('.section-play-btn')) {
      const playBtn = document.createElement('button');
      playBtn.className = 'section-play-btn';
      playBtn.textContent = '▶';
      playBtn.title = '播报此章节';
      playBtn.dataset.sectionIndex = index;
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ttsPlaySection(index);
      });
      h.appendChild(playBtn);
    }
  });
}

// ======================== 纲要导航 ========================

function toggleTOC() {
  const panel = $('#toc-panel');
  if (panel.style.display === 'none') {
    if (!state.reportMarkdown) { showToast('请先生成解读报告'); return; }
    buildTOC();
    panel.style.display = '';
  } else {
    panel.style.display = 'none';
  }
}

function buildTOC() {
  const container = $('#report-content');
  const tocList = $('#toc-list');
  if (!container || !tocList) return;

  const headings = container.querySelectorAll('h1, h2, h3');
  tocList.innerHTML = '';
  if (headings.length === 0) return;

  headings.forEach((h, index) => {
    const level = h.tagName.toLowerCase();
    const title = h.textContent.replace('▶', '').trim();
    const li = document.createElement('li');
    li.className = `toc-item level-${level}`;
    li.dataset.sectionId = h.id;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'toc-item-title';
    titleSpan.textContent = title;
    li.appendChild(titleSpan);

    const playBtn = document.createElement('button');
    playBtn.className = 'toc-item-play';
    playBtn.textContent = '🔊';
    playBtn.title = `播报：${title}`;
    playBtn.addEventListener('click', (e) => { e.stopPropagation(); ttsPlaySection(index); });
    li.appendChild(playBtn);

    li.addEventListener('click', () => {
      const target = container.querySelector(`#${h.id}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.style.transition = 'background 0.3s';
        target.style.background = '#e8f0fe';
        setTimeout(() => { target.style.background = ''; }, 1500);
      }
      updateTOCActive(index);
    });

    tocList.appendChild(li);
  });
}

function updateTOCActive(index) {
  $$('.toc-item').forEach((item, i) => item.classList.toggle('active', i === index));
}

function updateTOCActiveOnScroll() {
  const container = $('#report-content');
  const headings = container.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) return;
  const scrollTop = container.scrollTop;
  let activeIndex = 0;
  headings.forEach((h, index) => { if (h.offsetTop <= scrollTop + 60) activeIndex = index; });
  updateTOCActive(activeIndex);
}

// ======================== TTS 播报 ========================

function buildTTSSectionsFrom(container) {
  if (!container) return;
  const sections = [];
  const headings = container.querySelectorAll('h1, h2, h3');

  headings.forEach((h, index) => {
    let text = h.textContent.replace('▶', '').trim();
    let sibling = h.nextElementSibling;
    while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
      text += ' ' + sibling.textContent.trim();
      sibling = sibling.nextElementSibling;
    }
    sections.push({
      id: h.id || `section-${index}`,
      title: h.textContent.replace('▶', '').trim(),
      text: text.replace(/\s+/g, ' ').trim(),
      element: h
    });
  });
  state.tts.sections = sections;
}

function buildTTSSections() {
  buildTTSSectionsFrom($('#report-content'));
}

function ttsPlaySection(sectionIndex) {
  if (sectionIndex < 0 || sectionIndex >= state.tts.sections.length) return;
  if (state.tts.utterance) speechSynthesis.cancel();

  $$('.tts-highlight').forEach(el => el.classList.remove('tts-highlight'));

  state.tts.currentSection = sectionIndex;
  state.tts.playing = true;
  state.tts.paused = false;

  const section = state.tts.sections[sectionIndex];
  if (!section) return;

  section.element.classList.add('tts-highlight');
  section.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateTOCActive(sectionIndex);

  const utterance = new SpeechSynthesisUtterance(section.text);
  utterance.lang = 'zh-CN';
  utterance.rate = state.tts.rate;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    section.element.classList.remove('tts-highlight');
    if (state.tts.playing && sectionIndex + 1 < state.tts.sections.length) {
      ttsPlaySection(sectionIndex + 1);
    } else {
      stopTTS();
      showToast('播报完毕');
    }
  };

  utterance.onerror = (e) => {
    section.element.classList.remove('tts-highlight');
    if (e.error !== 'canceled') showToast('播报出错：' + e.error);
    updateTTSBar();
  };

  state.tts.utterance = utterance;
  speechSynthesis.speak(utterance);
  showTTSBar();
  updateTTSBar();
}

function toggleTTSPlayPause() {
  if (!state.tts.playing) return;
  if (state.tts.paused) { speechSynthesis.resume(); state.tts.paused = false; }
  else { speechSynthesis.pause(); state.tts.paused = true; }
  updateTTSBar();
}

function stopTTS() {
  speechSynthesis.cancel();
  state.tts.playing = false;
  state.tts.paused = false;
  state.tts.currentSection = -1;
  state.tts.utterance = null;
  $$('.tts-highlight').forEach(el => el.classList.remove('tts-highlight'));
  hideTTSBar();
}

function ttsPrevSection() { ttsPlaySection(Math.max(0, state.tts.currentSection - 1)); }
function ttsNextSection() { ttsPlaySection(Math.min(state.tts.sections.length - 1, state.tts.currentSection + 1)); }

function showTTSBar() { $('#tts-bar').style.display = ''; }
function hideTTSBar() { $('#tts-bar').style.display = 'none'; }

function updateTTSBar() {
  const { playing, paused, currentSection, sections } = state.tts;
  if (!playing || currentSection < 0) { hideTTSBar(); return; }
  const section = sections[currentSection];
  if (!section) return;
  $('#tts-status').textContent = paused ? `⏸ 已暂停 - ${section.title}` : `🔊 ${section.title}`;
  $('#btn-tts-play').textContent = paused ? '▶' : '⏸';
  $('#tts-progress').style.width = `${((currentSection + 1) / sections.length) * 100}%`;
}

// ======================== 导出 Markdown ========================

function exportMarkdown(type = 'report') {
  let markdown;
  if (type === 'screener') markdown = state.screenerMarkdown;
  else if (type === 'stock-analysis') markdown = state.saMarkdown;
  else markdown = state.reportMarkdown;
  if (!markdown) { showToast('暂无内容可导出'); return; }

  let filename = type === 'screener' ? '选股分析报告' : type === 'stock-analysis' ? '股票分析报告' : '财报解读报告';
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const h2Match = markdown.match(/^##\s+(.+)$/m);
  if (h1Match) filename = h1Match[1].replace(/[\\/:*?"<>|]/g, '');
  else if (h2Match) filename = h2Match[1].replace(/[\\/:*?"<>|]/g, '');

  const date = new Date().toISOString().slice(0, 10);
  filename = `${filename}_${date}.md`;

  // 使用 chrome.downloads API 导出到指定目录
  const exportDir = '/Users/mickshu/chrome-extend/stock-asistance';
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: `${exportDir}/${filename}`,
    conflictAction: 'overwrite',
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('导出失败:', chrome.runtime.lastError);
      // 降级：使用传统方式下载
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      showToast('💾 已导出到下载目录（指定路径失败）');
    } else {
      showToast(`💾 已导出到 ${exportDir}/${filename}`);
    }
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  });
}

// ======================== 对话功能 ========================

async function sendChatMessage() {
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message || state.isChatting) return;

  if (!state.settings.apiKey) { showSettings(); showToast('请先配置 API Key'); return; }

  input.value = '';
  state.isChatting = true;
  $('#btn-send').disabled = true;

  addChatBubble('user', message);
  state.chatHistory.push({ role: 'user', content: message });

  const aiMsgEl = addChatBubble('ai', '');
  const bubbleEl = aiMsgEl.querySelector('.chat-msg-bubble');
  bubbleEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  try {
    const response = await callLLMChat(state.chatHistory);
    let fullText = '';
    await handleStreamResponse(response, (text) => {
      fullText = text;
      bubbleEl.innerHTML = renderMarkdown(text);
      bubbleEl.classList.add('streaming-cursor');
      $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
    });
    bubbleEl.classList.remove('streaming-cursor');
    bubbleEl.innerHTML = renderMarkdown(fullText);
    state.chatHistory.push({ role: 'assistant', content: fullText });
  } catch (e) {
    bubbleEl.classList.remove('streaming-cursor');
    bubbleEl.innerHTML = `<p style="color:var(--error)">❌ 请求失败：${e.message}</p>`;
    state.chatHistory.pop();
  } finally {
    state.isChatting = false;
    $('#btn-send').disabled = false;
  }
}

function addChatBubble(role, content) {
  const messagesEl = $('#chat-messages');
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'chat-msg-avatar';
  avatar.textContent = role === 'ai' ? '📈' : '👤';
  const bubble = document.createElement('div');
  bubble.className = 'chat-msg-bubble';
  bubble.innerHTML = content ? renderMarkdown(content) : '';

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  messagesEl.appendChild(msgDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msgDiv;
}

// ======================== 工具函数 ========================

function truncateText(text, maxChars) {
  if (text.length <= maxChars) return text;
  const keywords = ['资产负债表', '利润表', '现金流量表', '管理层讨论', '经营情况',
    '营业收入', '净利润', '毛利率', '净资产', '现金流', '主要财务数据',
    '合并资产负债', '合并利润', '合并现金流量'];
  const lines = text.split('\n');
  let importantLines = [], otherLines = [];
  lines.forEach(line => {
    if (keywords.some(kw => line.includes(kw))) importantLines.push(line);
    else otherLines.push(line);
  });
  let result = importantLines.join('\n');
  let remaining = maxChars - result.length;
  if (remaining > 0) {
    for (const line of otherLines) {
      if (remaining <= 0) break;
      result += '\n' + line;
      remaining -= line.length + 1;
    }
  }
  if (result.length > maxChars) {
    result = result.substring(0, maxChars) + '\n\n[...内容已截断...]';
  }
  return result;
}

function showLoading(text) { $('#loading').style.display = ''; $('#loading-text').textContent = text; }
function updateLoading(text) { if ($('#loading').style.display !== 'none') $('#loading-text').textContent = text; }
function hideLoading() { $('#loading').style.display = 'none'; }

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(state.reportMarkdown);
    showToast('📋 报告已复制');
  } catch (e) { showToast('复制失败'); }
}

// ======================== 股票搜索提示 ========================

/**
 * 调用东方财富搜索 API，实时匹配股票
 */
async function searchStockSuggest(keyword) {
  if (!keyword || keyword.length < 1) { hideStockSuggest(); return; }

  // 纯行业/条件描述，不搜索
  if (/^(行业|板块|概念|条件|市值|ROE|PE|PB)/.test(keyword) && keyword.length < 4) {
    hideStockSuggest();
    return;
  }

  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.QuotationCodeTable || !data.QuotationCodeTable.Data || data.QuotationCodeTable.Data.length === 0) {
      hideStockSuggest();
      return;
    }

    const items = data.QuotationCodeTable.Data.filter(item => {
      // 只保留A股
      return item.MktNum === '0' || item.MktNum === '1' || 
             item.SecurityTypeName === '沪A' || item.SecurityTypeName === '深A' ||
             item.SecurityTypeName === '科创板' || item.SecurityTypeName === '创业板';
    }).slice(0, 8);

    if (items.length === 0) { hideStockSuggest(); return; }

    renderStockSuggest(items);
  } catch (e) {
    console.log('股票搜索失败:', e);
    hideStockSuggest();
  }
}

/**
 * 渲染搜索下拉列表
 */
function renderStockSuggest(items) {
  const container = $('#stock-suggest');
  container.innerHTML = '';
  state.suggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    div.dataset.index = idx;

    // 代码（6位 + 交易所后缀）
    const code = item.Code || '';
    const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;

    // 涨跌颜色（中国惯例：涨红跌绿）
    let changeClass = '';
    let changeText = '';
    if (item.ChangePct !== undefined && item.ChangePct !== null) {
      const pct = parseFloat(item.ChangePct);
      if (pct > 0) { changeClass = 'up'; changeText = `+${pct.toFixed(2)}%`; }
      else if (pct < 0) { changeClass = 'down'; changeText = `${pct.toFixed(2)}%`; }
      else { changeText = '0.00%'; }
    }

    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
      ${item.NewPrice ? `<span class="stock-suggest-price">¥${parseFloat(item.NewPrice).toFixed(2)}</span>` : ''}
      ${changeText ? `<span class="stock-suggest-change ${changeClass}">${changeText}</span>` : ''}
    `;

    div.addEventListener('click', () => {
      addStockToInput(fullCode, item.Name || '');
      hideStockSuggest();
    });

    container.appendChild(div);
  });

  container.style.display = '';
}

function updateSuggestActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === state.suggestIndex);
  });
  if (state.suggestIndex >= 0 && items[state.suggestIndex]) {
    items[state.suggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideStockSuggest() {
  const container = $('#stock-suggest');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  state.suggestIndex = -1;
}

/**
 * 将选中的股票添加到输入框和标签
 */
function addStockToInput(code, name) {
  // 添加到标签列表（去重）
  const exists = state.selectedStocks.find(s => s.code === code);
  if (!exists) {
    state.selectedStocks.push({ code, name });
    renderStockTags();
  }

  // 更新 textarea：替换最后一段正在输入的文字
  const textarea = $('#screener-input');
  const text = textarea.value;
  const segments = text.split(/([,，\n])/);
  // 去掉最后一段（正在输入的），保留分隔符
  let result = '';
  for (let i = 0; i < segments.length - 1; i++) {
    result += segments[i];
  }
  // 如果result末尾没有分隔符，加逗号
  if (result && !/[,，\n]$/.test(result)) {
    result += ', ';
  }
  result += `${name}(${code}), `;
  textarea.value = result;
  textarea.focus();

  // 光标放到末尾
  textarea.scrollTop = textarea.scrollHeight;
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

/**
 * 渲染已选股票标签
 */
function renderStockTags() {
  const container = $('#stock-tags');
  if (!container) return;

  container.innerHTML = '';
  state.selectedStocks.forEach((stock, idx) => {
    const tag = document.createElement('span');
    tag.className = 'stock-tag';
    tag.innerHTML = `${stock.name} <button class="stock-tag-remove" data-idx="${idx}">✕</button>`;

    tag.querySelector('.stock-tag-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedStocks.splice(idx, 1);
      renderStockTags();
      // 同步更新 textarea
      syncStockTagsToInput();
    });

    container.appendChild(tag);
  });
}

/**
 * 将标签中的股票同步回 textarea
 */
function syncStockTagsToInput() {
  const textarea = $('#screener-input');
  // 保留非股票的输入内容（行业描述等）
  const lines = textarea.value.split('\n');
  let freeText = '';
  lines.forEach(line => {
    // 如果行不是纯股票代码/名称，保留
    const trimmed = line.trim();
    if (trimmed && !/^[\dA-Z.(),，、\s\u4e00-\u9fa5]+$/.test(trimmed)) {
      freeText += (freeText ? '\n' : '') + trimmed;
    }
  });

  let stockText = state.selectedStocks.map(s => `${s.name}(${s.code})`).join(', ');
  textarea.value = stockText + (freeText ? '\n' + freeText : '');
}

// ======================== 估值计算器 ========================

/**
 * 估值方法参数定义
 * source: 'auto' = 从财报自动填充, 'suggest' = 建议值, 'required' = 必须手动填
 */
const VAL_METHODS = {
  dcf: {
    name: '💵 现金流折现法 (DCF)',
    desc: '预测未来自由现金流并折现至现值',
    params: [
      { key: 'fcf0',       label: '当前自由现金流(亿)',  source: 'auto',   hint: '自动' },
      { key: 'growth1',    label: '第1阶段增长率(%)',    source: 'suggest', hint: '建议8-15' },
      { key: 'years1',     label: '第1阶段年数',         source: 'suggest', hint: '建议5-10', defaultVal: 5 },
      { key: 'growth2',    label: '第2阶段增长率(%)',    source: 'suggest', hint: '建议3-5', defaultVal: 3 },
      { key: 'years2',     label: '第2阶段年数',         source: 'suggest', hint: '建议5-10', defaultVal: 5 },
      { key: 'terminalG',  label: '永续增长率(%)',       source: 'suggest', hint: '建议2-3', defaultVal: 2.5 },
      { key: 'wacc',       label: '折现率WACC(%)',       source: 'auto',   hint: '自动' },
      { key: 'shares',     label: '总股本(亿股)',         source: 'auto',   hint: '自动' },
      { key: 'netDebt',    label: '净债务(亿)',           source: 'auto',   hint: '自动' },
    ]
  },
  graham: {
    name: '🏛 格雷厄姆内在价值',
    desc: 'V = EPS × (8.5 + 2g) × 4.4/Y',
    params: [
      { key: 'eps',        label: '每股收益EPS(元)',      source: 'auto',   hint: '自动' },
      { key: 'growth',     label: '预期增长率(%)',        source: 'suggest', hint: '建议5-15' },
      { key: 'aaaYield',   label: 'AAA公司债收益率(%)',  source: 'suggest', hint: '建议4-5', defaultVal: 4.4 },
    ]
  },
  ddm: {
    name: '💳 股利折现模型 (DDM)',
    desc: '适用于稳定分红的成熟企业',
    params: [
      { key: 'dps',        label: '每股股利DPS(元)',      source: 'auto',   hint: '自动' },
      { key: 'growth',     label: '股利增长率(%)',        source: 'suggest', hint: '建议3-8' },
      { key: 'requiredR',  label: '要求回报率(%)',        source: 'auto',   hint: 'WACC+2%' },
    ]
  },
  pe: {
    name: '📐 相对估值法 (PE/PB)',
    desc: '基于行业均值乘数推算合理价格',
    params: [
      { key: 'eps',        label: '每股收益EPS(元)',      source: 'auto',   hint: '自动' },
      { key: 'bvps',       label: '每股净资产BVPS(元)',   source: 'auto',   hint: '自动' },
      { key: 'peAvg',      label: '行业平均PE',           source: 'auto',   hint: '当前PE参考' },
      { key: 'pbAvg',      label: '行业平均PB',           source: 'auto',   hint: '当前PB参考' },
    ]
  },
  eva: {
    name: '📊 EVA经济附加值',
    desc: '价值 = 投入资本 + ∑(ROIC-WACC)×IC/(1+WACC)^t',
    params: [
      { key: 'ic',         label: '投入资本(亿)',         source: 'auto',   hint: '自动' },
      { key: 'roic',       label: 'ROIC(%)',              source: 'auto',   hint: '自动' },
      { key: 'wacc',       label: 'WACC(%)',              source: 'auto',   hint: '自动' },
      { key: 'years',      label: '预测年数',             source: 'suggest', hint: '建议10', defaultVal: 10 },
      { key: 'shares',     label: '总股本(亿股)',         source: 'auto',   hint: '自动' },
    ]
  }
};

function initValuation() {
  renderValParams();
}

// ----- 估值搜索 -----

async function valSearchStock(keyword) {
  if (!keyword) { hideValSuggest(); return; }
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.QuotationCodeTable?.Data?.length) { hideValSuggest(); return; }

    const items = data.QuotationCodeTable.Data.filter(item =>
      item.MktNum === '0' || item.MktNum === '1' ||
      ['沪A','深A','科创板','创业板'].includes(item.SecurityTypeName)
    ).slice(0, 8);

    if (!items.length) { hideValSuggest(); return; }

    // 搜索接口不含行情，需批量查行情
    const secids = items.map(it => {
      const code = it.Code || '';
      return code.startsWith('6') ? `1.${code}` : `0.${code}`;
    }).join(',');
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secids}&fields=f2,f3,f12,f14&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteData = await quoteResp.json();
      const quoteMap = {};
      if (quoteData?.data?.diff) {
        quoteData.data.diff.forEach(q => { quoteMap[q.f12] = { price: q.f2, changePct: q.f3 }; });
      }
      items.forEach(it => {
        const q = quoteMap[it.Code];
        if (q) { it._price = q.price; it._changePct = q.changePct; }
      });
    } catch (e) { /* 行情获取失败，忽略 */ }

    renderValSuggest(items);
  } catch (e) { hideValSuggest(); }
}

function renderValSuggest(items) {
  const container = $('#val-suggest');
  container.innerHTML = '';
  state.valSuggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    const code = item.Code || '';
    const price = item._price;
    const changePct = item._changePct;
    let changeClass = '', changeText = '';
    if (changePct != null) {
      const pct = parseFloat(changePct);
      if (pct > 0) { changeClass = 'up'; changeText = `+${pct.toFixed(2)}%`; }
      else if (pct < 0) { changeClass = 'down'; changeText = `${pct.toFixed(2)}%`; }
      else changeText = '0.00%';
    }
    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
      ${price ? `<span class="stock-suggest-price">¥${parseFloat(price).toFixed(2)}</span>` : ''}
      ${changeText ? `<span class="stock-suggest-change ${changeClass}">${changeText}</span>` : ''}
    `;
    div.addEventListener('click', () => {
      const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;
      selectValStock(fullCode, item.Name || '', parseFloat(price) || 0, parseFloat(changePct) || 0);
      hideValSuggest();
    });
    container.appendChild(div);
  });
  container.style.display = '';
}

function updateValSuggestActive(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === state.valSuggestIndex));
  if (state.valSuggestIndex >= 0 && items[state.valSuggestIndex]) {
    items[state.valSuggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideValSuggest() {
  const c = $('#val-suggest');
  if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  state.valSuggestIndex = -1;
}

// ----- 选择股票 → 拉取数据 → 填充 -----

async function selectValStock(code, name, price, changePct) {
  $('#val-search-input').value = `${name}(${code})`;

  // 显示股票卡片（loading态）
  const card = $('#val-stock-card');
  card.style.display = '';
  $('#val-stock-name').textContent = name;
  $('#val-stock-code').textContent = code;
  $('#val-stock-industry').textContent = '';
  $('#val-stock-price').textContent = price ? `¥${price.toFixed(2)}` : '--';
  const changeEl = $('#val-stock-change');
  if (changePct > 0) { changeEl.textContent = `+${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change up'; }
  else if (changePct < 0) { changeEl.textContent = `${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change down'; }
  else { changeEl.textContent = '0.00%'; changeEl.className = 'val-stock-change'; }

  // 所有指标显示加载中
  const metricIds = ['pe','pb','mv','roe','eps','bps','gm','nm','revg','npg','dar','roic','ocf','fcf','dps','shares'];
  metricIds.forEach(id => { $(`#val-metric-${id}`).textContent = '加载中...'; });

  state.valStock = { code, name, price, changePct, fundamentals: null };
  $('#val-result').style.display = 'none';

  // 拉取财报数据
  await fetchValFundamentals(code);
}

/**
 * 从东方财富拉取基本面数据
 * 使用 datacenter-web API（可靠的 REST 接口）
 */
async function fetchValFundamentals(tsCode) {
  try {
    const code6 = tsCode.replace(/\.(SH|SZ)/, '');
    const secid = tsCode.endsWith('.SZ') ? `0.${code6}` : `1.${code6}`;

    // 1. 实时行情（PE、PB、市值、ROE 等）—— 使用 ulist 接口
    let quoteData = {};
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secid}&fields=f2,f3,f9,f12,f14,f20,f21,f23,f115&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteResult = await quoteResp.json();
      if (quoteResult?.data?.diff?.[0]) quoteData = quoteResult.data.diff[0];
    } catch (e) { console.log('行情接口失败:', e); }

    // 更新卡片上的行情指标
    const pe = quoteData.f9;
    const pb = quoteData.f23;
    const mv = quoteData.f20;
    const roe = quoteData.f115;
    if (pe != null) $('#val-metric-pe').textContent = pe.toFixed(1);
    else $('#val-metric-pe').textContent = '--';
    if (pb != null) $('#val-metric-pb').textContent = pb.toFixed(2);
    else $('#val-metric-pb').textContent = '--';
    if (mv != null) $('#val-metric-mv').textContent = mv >= 100000000 ? `${(mv / 100000000).toFixed(0)}亿` : `${(mv / 10000).toFixed(0)}万`;
    else $('#val-metric-mv').textContent = '--';
    if (roe != null) $('#val-metric-roe').textContent = `${roe.toFixed(1)}%`;
    else $('#val-metric-roe').textContent = '--';

    // 2. 财务主要指标（EPS、BPS、毛利率、净利率、ROE、营收增速 等）
    let finMainData = null;
    try {
      const finMainUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const finMainResp = await fetch(finMainUrl);
      const finMainResult = await finMainResp.json();
      if (finMainResult?.result?.data?.length) {
        finMainData = finMainResult.result.data[0]; // 最新年报
      }
    } catch (e) { console.log('财务主要指标接口失败:', e); }

    // 3. 利润表
    let incomeData = null;
    try {
      const incomeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const incomeResp = await fetch(incomeUrl);
      const incomeResult = await incomeResp.json();
      if (incomeResult?.result?.data?.length) incomeData = incomeResult.result.data[0];
    } catch (e) { console.log('利润表接口失败:', e); }

    // 4. 资产负债表
    let balanceData = null;
    try {
      const bsUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_BALANCE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const bsResp = await fetch(bsUrl);
      const bsResult = await bsResp.json();
      if (bsResult?.result?.data?.length) balanceData = bsResult.result.data[0];
    } catch (e) { console.log('资产负债表接口失败:', e); }

    // 5. 现金流量表
    let cashflowData = null;
    try {
      const cfUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const cfResp = await fetch(cfUrl);
      const cfResult = await cfResp.json();
      if (cfResult?.result?.data?.length) cashflowData = cfResult.result.data[0];
    } catch (e) { console.log('现金流量表接口失败:', e); }

    // 整合基本面数据
    const fund = extractFundamentals(quoteData, finMainData, incomeData, balanceData, cashflowData, tsCode);
    state.valStock.fundamentals = fund;

    // 更新卡片上的丰富指标
    updateValMetrics(fund);

    // 刷新参数表单
    renderValParams();

  } catch (e) {
    console.error('拉取基本面数据失败:', e);
    showToast('获取财务数据失败，请手动填入参数');
    state.valStock.fundamentals = {};
    renderValParams();
  }
}

/**
 * 更新估值卡片上的指标显示
 */
function updateValMetrics(fund) {
  // 盈利能力
  if (fund.eps != null) $('#val-metric-eps').textContent = fund.eps.toFixed(2);
  else $('#val-metric-eps').textContent = '--';
  if (fund.bvps != null) $('#val-metric-bps').textContent = fund.bvps.toFixed(2);
  else $('#val-metric-bps').textContent = '--';
  if (fund.grossMargin != null) $('#val-metric-gm').textContent = `${fund.grossMargin.toFixed(1)}%`;
  else $('#val-metric-gm').textContent = '--';
  if (fund.netMargin != null) $('#val-metric-nm').textContent = `${fund.netMargin.toFixed(1)}%`;
  else $('#val-metric-nm').textContent = '--';

  // 成长/财务健康
  if (fund.revenueGrowth != null) {
    const pct = fund.revenueGrowth;
    const el = $('#val-metric-revg');
    el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
  } else { $('#val-metric-revg').textContent = '--'; }
  if (fund.profitGrowth != null) {
    const pct = fund.profitGrowth;
    const el = $('#val-metric-npg');
    el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
  } else { $('#val-metric-npg').textContent = '--'; }
  if (fund.debtAssetRatio != null) $('#val-metric-dar').textContent = `${fund.debtAssetRatio.toFixed(1)}%`;
  else $('#val-metric-dar').textContent = '--';
  if (fund.roic != null) $('#val-metric-roic').textContent = `${fund.roic.toFixed(1)}%`;
  else $('#val-metric-roic').textContent = '--';

  // 现金流
  if (fund.opCashflowYi != null) $('#val-metric-ocf').textContent = fund.opCashflowYi.toFixed(1);
  else $('#val-metric-ocf').textContent = '--';
  if (fund.fcfYi != null) $('#val-metric-fcf').textContent = fund.fcfYi.toFixed(1);
  else $('#val-metric-fcf').textContent = '--';
  if (fund.dps != null) $('#val-metric-dps').textContent = fund.dps.toFixed(2);
  else $('#val-metric-dps').textContent = '--';
  if (fund.totalSharesYi != null) $('#val-metric-shares').textContent = fund.totalSharesYi.toFixed(2);
  else $('#val-metric-shares').textContent = '--';

  // 行业
  if (fund.industry) $('#val-stock-industry').textContent = fund.industry;
}

/**
 * 从多个接口提取整合基本面数据
 * quoteData: ulist 行情接口
 * finMain: RPT_F10_FINANCE_MAINFINADATA 财务主要指标
 * income: RPT_DMSK_FN_INCOME 利润表
 * balance: RPT_DMSK_FN_BALANCE 资产负债表
 * cashflow: RPT_DMSK_FN_CASHFLOW 现金流量表
 */
function extractFundamentals(quoteData, finMain, income, balance, cashflow, tsCode) {
  const f = {};

  // 从行情接口
  f.pe = safeNum(quoteData.f9);
  f.pb = safeNum(quoteData.f23);
  f.marketCap = safeNum(quoteData.f20);   // 总市值（元）
  f.roe = safeNum(quoteData.f115);

  // ===== 从财务主要指标（RPT_F10_FINANCE_MAINFINADATA）=====
  if (finMain) {
    f.industry = finMain.INDUSTRY_NAME || null;
    f.reportDate = finMain.REPORT_DATE_NAME || finMain.REPORT_DATE || null;
    f.eps = safeNum(finMain.EPSJB);             // 基本每股收益
    f.epsDiluted = safeNum(finMain.EPSKCJB);    // 扣非每股收益
    f.bvps = safeNum(finMain.BPS);              // 每股净资产
    f.dps = safeNum(finMain.MGWFPLR);           // 每股未分配利润 ≈ 每股股利近似
    f.cashPerShare = safeNum(finMain.MGJYXJJE); // 每股经营现金流
    f.revenue = safeNum(finMain.TOTALOPERATEREVE);  // 营业收入
    f.netProfit = safeNum(finMain.PARENTNETPROFIT); // 归母净利润
    f.grossMargin = safeNum(finMain.XSMLL);     // 销售毛利率 %
    f.netMargin = safeNum(finMain.XSJLL);       // 销售净利率 %
    f.revenueGrowth = safeNum(finMain.TOTALOPERATEREVETZ); // 营收同比增长率 %
    f.profitGrowth = safeNum(finMain.PARENTNETPROFITTZ);   // 净利润同比增长率 %
    f.debtAssetRatio = safeNum(finMain.ZCFZL);  // 资产负债率 %
    f.currentRatio = safeNum(finMain.LD);       // 流动比率
    f.totalShares = safeNum(finMain.TOTAL_SHARE);   // 总股本（股）
    f.roic = safeNum(finMain.ROIC);             // ROIC %
    // FCFF
    f.fcffForward = safeNum(finMain.FCFF_FORWARD); // 自由现金流(正推)
    f.fcffBack = safeNum(finMain.FCFF_BACK);       // 自由现金流(反推)
  }

  // ===== 从利润表（RPT_DMSK_FN_INCOME）=====
  if (income) {
    if (!f.revenue) f.revenue = safeNum(income.TOTAL_OPERATE_INCOME);
    if (!f.netProfit) f.netProfit = safeNum(income.PARENT_NETPROFIT);
    f.operateCost = safeNum(income.TOTAL_OPERATE_COST);
    f.operateProfit = safeNum(income.OPERATE_PROFIT);
    f.saleExpense = safeNum(income.SALE_EXPENSE);
    f.manageExpense = safeNum(income.MANAGE_EXPENSE);
    f.financeExpense = safeNum(income.FINANCE_EXPENSE);
    f.deductNetProfit = safeNum(income.DEDUCT_PARENT_NETPROFIT);
    if (!f.revenueGrowth) f.revenueGrowth = safeNum(income.TOI_RATIO);
    if (!f.profitGrowth) f.profitGrowth = safeNum(income.PARENT_NETPROFIT_RATIO);
  }

  // ===== 从资产负债表（RPT_DMSK_FN_BALANCE）=====
  if (balance) {
    f.totalAssets = safeNum(balance.TOTAL_ASSETS);
    f.totalLiab = safeNum(balance.TOTAL_LIABILITIES);
    f.totalEquity = safeNum(balance.TOTAL_EQUITY);
    f.cash = safeNum(balance.MONETARYFUNDS);
    f.inventory = safeNum(balance.INVENTORY);
    f.accountsReceivable = safeNum(balance.ACCOUNTS_RECE);
    f.accountsPayable = safeNum(balance.ACCOUNTS_PAYABLE);
    if (!f.totalShares) f.totalShares = safeNum(balance.TOTAL_SHARE);
    if (!f.debtAssetRatio) f.debtAssetRatio = safeNum(balance.DEBT_ASSET_RATIO);
  }

  // ===== 从现金流量表（RPT_DMSK_FN_CASHFLOW）=====
  if (cashflow) {
    f.opCashflow = safeNum(cashflow.NETCASH_OPERATE);    // 经营活动现金流净额
    f.capEx = safeNum(cashflow.CONSTRUCT_LONG_ASSET);     // 购建固定资产等（资本支出，正值）
    f.investCashflow = safeNum(cashflow.NETCASH_INVEST);  // 投资活动现金流
    f.financeCashflow = safeNum(cashflow.NETCASH_FINANCE); // 筹资活动现金流
  }

  // ===== 计算派生指标 =====
  // 总股本（亿股）
  if (f.totalShares) {
    f.totalSharesYi = f.totalShares / 100000000;
  }
  // EPS 补算
  if (!f.eps && f.netProfit && f.totalShares) {
    f.eps = f.netProfit / f.totalShares;
  }
  // BVPS 补算
  if (!f.bvps && f.totalEquity && f.totalShares) {
    f.bvps = f.totalEquity / f.totalShares;
  }
  // 当前价格（从市值推算）
  if (f.marketCap && f.totalShares) {
    f.currentPrice = f.marketCap / f.totalShares;
  } else if (state.valStock?.price) {
    f.currentPrice = state.valStock.price;
  }
  // 净债务 = 总负债 - 现金
  if (f.totalLiab) {
    f.netDebt = f.cash ? f.totalLiab - f.cash : f.totalLiab;
    f.netDebtYi = f.netDebt / 100000000;
  }
  // 投入资本 ≈ 总资产
  if (f.totalAssets) {
    f.ic = f.totalAssets;
    f.icYi = f.ic / 100000000;
  }
  // 经营现金流（亿）
  if (f.opCashflow) {
    f.opCashflowYi = f.opCashflow / 100000000;
  }
  // 自由现金流 = 经营CF - 资本支出
  if (f.opCashflow != null && f.capEx != null) {
    f.freeCashflow = f.opCashflow - f.capEx;
    f.fcfYi = f.freeCashflow / 100000000;
  } else if (f.fcffForward != null) {
    // 备用：从主指标接口获取的 FCFF
    f.freeCashflow = f.fcffForward;
    f.fcfYi = f.freeCashflow / 100000000;
  } else if (f.fcffBack != null) {
    f.freeCashflow = f.fcffBack;
    f.fcfYi = f.freeCashflow / 100000000;
  }
  // FCF per share
  if (f.freeCashflow && f.totalShares) {
    f.fcfPerShare = f.freeCashflow / f.totalShares;
  }
  // ROIC 补算
  if (!f.roic && f.netProfit && f.ic) {
    f.roic = (f.netProfit / f.ic) * 100;
  }
  // WACC 估算
  f.wacc = estimateWACC(f);
  // PE 隐含增长率（格雷厄姆公式反推）
  if (f.pe) {
    f.impliedGrowth = Math.max(0, (f.pe - 8.5) / 2);
  }

  return f;
}

function safeNum(v) {
  if (v == null || v === '-' || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/**
 * 简单WACC估算
 */
function estimateWACC(f) {
  // Cost of Equity: CAPM简化，取10%
  const ke = 10;
  // Cost of Debt: 取5%
  const kd = 5;
  // 权重
  const equityRatio = f.totalEquity && f.totalAssets ? f.totalEquity / f.totalAssets : 0.7;
  const debtRatio = 1 - equityRatio;
  // 税率
  const taxRate = 0.25;
  // WACC
  return ke * equityRatio + kd * (1 - taxRate) * debtRatio;
}

// ----- 渲染参数表单 -----

function renderValParams() {
  const method = VAL_METHODS[state.valMethod];
  if (!method) return;

  const container = $('#val-params');
  const fund = state.valStock?.fundamentals || {};

  let html = `<div class="val-params-title">📋 ${method.name} 参数</div>`;
  if (fund.reportDate) {
    html += `<div style="font-size:10px;color:var(--text-hint);margin-bottom:6px">数据来源：${fund.reportDate}（东方财富）</div>`;
  }

  method.params.forEach(p => {
    let value = '';
    let hintClass = '';
    let hintText = p.hint || '';

    // 尝试自动填充
    const autoVal = getAutoParamValue(p.key, fund);
    if (autoVal != null) {
      value = typeof autoVal === 'number' ? (Number.isInteger(autoVal) ? autoVal : autoVal.toFixed(2)) : autoVal;
      hintClass = 'auto';
      hintText = '✓ 自动填充';
    } else if (state.valParams[p.key] != null) {
      value = state.valParams[p.key];
    } else if (p.defaultVal != null) {
      value = p.defaultVal;
      hintClass = 'suggest';
      hintText = '建议值';
    }

    html += `
      <div class="val-param-row">
        <span class="val-param-label">${p.label}</span>
        <input type="number" step="any" class="val-param-input" data-key="${p.key}" value="${value}" placeholder="${p.source === 'required' ? '必填' : '选填'}">
        <span class="val-param-hint ${hintClass}">${hintText}</span>
      </div>
    `;
  });

  // 方法说明
  html += `<div style="margin-top:8px;font-size:11px;color:var(--text-hint);line-height:1.5">${method.desc}</div>`;

  container.innerHTML = html;

  // 绑定参数输入事件
  container.querySelectorAll('.val-param-input').forEach(input => {
    input.addEventListener('input', () => {
      state.valParams[input.dataset.key] = input.value;
    });
  });
}

function getAutoParamValue(key, fund) {
  if (!fund) return null;
  const map = {
    fcf0:       fund.fcfYi,
    wacc:       fund.wacc,
    shares:     fund.totalSharesYi,
    netDebt:    fund.netDebtYi,
    eps:        fund.eps,
    bvps:       fund.bvps,
    dps:        fund.dps,
    ic:         fund.icYi,
    roic:       fund.roic,
    growth:     fund.impliedGrowth,
    requiredR:  fund.wacc ? fund.wacc + 2 : null,  // 要求回报率 ≈ WACC + 2%
    peAvg:      fund.pe,                              // 默认用当前PE作为行业PE参考
    pbAvg:      fund.pb,                              // 默认用当前PB作为行业PB参考
  };
  return map[key] ?? null;
}

// ----- 估值计算 -----

function calculateValuation() {
  const method = state.valMethod;
  const fund = state.valStock?.fundamentals || {};

  // 收集参数
  const params = {};
  $$('.val-param-input').forEach(input => {
    const key = input.dataset.key;
    const val = parseFloat(input.value);
    if (isNaN(val)) {
      showToast(`请填写参数：${input.closest('.val-param-row').querySelector('.val-param-label').textContent}`);
      return;
    }
    params[key] = val;
  });

  // 检查必填参数
  const methodDef = VAL_METHODS[method];
  const missingParam = methodDef.params.find(p => {
    const val = params[p.key];
    return val == null || isNaN(val);
  });
  if (missingParam) {
    showToast(`请填写：${missingParam.label}`);
    return;
  }

  let result;
  switch (method) {
    case 'dcf':      result = calcDCF(params); break;
    case 'graham':   result = calcGraham(params); break;
    case 'ddm':      result = calcDDM(params); break;
    case 'pe':       result = calcPE(params); break;
    case 'eva':      result = calcEVA(params); break;
    default: result = null;
  }

  if (result) {
    result.currentPrice = state.valStock?.price || fund.currentPrice;
    result.methodName = methodDef.name;
    renderValResult(result, method, params);
  }
}

/**
 * DCF 两阶段自由现金流折现
 */
function calcDCF(p) {
  const { fcf0, growth1, years1, growth2, years2, terminalG, wacc, shares, netDebt } = p;
  const r = wacc / 100;
  const g1 = growth1 / 100;
  const g2 = growth2 / 100;
  const gt = terminalG / 100;

  // 第1阶段
  let pv1 = 0;
  let fcf = fcf0;
  for (let i = 1; i <= years1; i++) {
    fcf = fcf * (1 + g1);
    pv1 += fcf / Math.pow(1 + r, i);
  }

  // 第2阶段
  let pv2 = 0;
  let fcf2 = fcf;
  for (let i = 1; i <= years2; i++) {
    fcf2 = fcf2 * (1 + g2);
    pv2 += fcf2 / Math.pow(1 + r, years1 + i);
  }

  // 终值
  const terminalFCF = fcf2 * (1 + gt);
  const terminalValue = terminalFCF / (r - gt);
  const pvTerminal = terminalValue / Math.pow(1 + r, years1 + years2);

  const totalPV = pv1 + pv2 + pvTerminal;
  const equityValue = totalPV - netDebt;
  const intrinsicPerShare = equityValue / shares;

  return {
    intrinsicPerShare,
    totalPV: totalPV,
    pv1,
    pv2,
    pvTerminal,
    terminalValue,
    equityValue,
    assumptions: [
      { label: '第1阶段FCF现值', value: formatYi(pv1) },
      { label: '第2阶段FCF现值', value: formatYi(pv2) },
      { label: '终值现值', value: formatYi(pvTerminal) },
      { label: '企业总价值', value: formatYi(totalPV) },
      { label: '净债务', value: formatYi(netDebt) },
      { label: '股权价值', value: formatYi(equityValue) },
    ]
  };
}

/**
 * 格雷厄姆内在价值 V = EPS × (8.5 + 2g) × 4.4/Y
 */
function calcGraham(p) {
  const { eps, growth, aaaYield } = p;
  const g = growth / 100;
  const Y = aaaYield / 100;

  const intrinsicPerShare = eps * (8.5 + 2 * growth) * (4.4 / (Y * 100));
  // 修正: 格雷厄姆公式 V = EPS × (8.5 + 2g) × 4.4/Y
  // 其中Y为AAA债券收益率，g为预期增长率(%)
  const v = eps * (8.5 + 2 * growth) * (4.4 / aaaYield);

  return {
    intrinsicPerShare: v,
    assumptions: [
      { label: 'EPS', value: `${eps.toFixed(2)} 元` },
      { label: '增长率g', value: `${growth}%` },
      { label: 'AAA收益率Y', value: `${aaaYield}%` },
      { label: '因子(8.5+2g)', value: (8.5 + 2 * growth).toFixed(1) },
      { label: '调整系数4.4/Y', value: (4.4 / aaaYield).toFixed(3) },
    ]
  };
}

/**
 * DDM 股利折现模型（两阶段）
 */
function calcDDM(p) {
  const { dps, growth, requiredR } = p;
  const g = growth / 100;
  const r = requiredR / 100;

  // 简化：Gordon增长模型 V = D1 / (r - g)
  const d1 = dps * (1 + g);
  const intrinsicPerShare = d1 / (r - g);

  return {
    intrinsicPerShare,
    assumptions: [
      { label: '当前股利DPS', value: `${dps.toFixed(2)} 元` },
      { label: '下期股利D1', value: `${d1.toFixed(2)} 元` },
      { label: '股利增长率', value: `${growth}%` },
      { label: '要求回报率', value: `${requiredR}%` },
    ]
  };
}

/**
 * 相对估值 PE/PB
 */
function calcPE(p) {
  const { eps, bvps, peAvg, pbAvg } = p;

  const valByPE = eps * peAvg;
  const valByPB = bvps * pbAvg;
  const intrinsicPerShare = (valByPE + valByPB) / 2;  // 简单平均

  return {
    intrinsicPerShare,
    valByPE,
    valByPB,
    assumptions: [
      { label: 'PE估值', value: `¥${valByPE.toFixed(2)}` },
      { label: 'PB估值', value: `¥${valByPB.toFixed(2)}` },
      { label: '行业PE', value: peAvg.toFixed(1) },
      { label: '行业PB', value: pbAvg.toFixed(2) },
      { label: 'EPS', value: `${eps.toFixed(2)} 元` },
      { label: 'BVPS', value: `${bvps.toFixed(2)} 元` },
    ]
  };
}

/**
 * EVA 经济附加值
 */
function calcEVA(p) {
  const { ic, roic, wacc, years, shares } = p;
  const r = wacc / 100;

  let totalEVA = 0;
  let evaList = [];
  for (let t = 1; t <= years; t++) {
    const eva = (roic / 100 - r) * ic / Math.pow(1 + r, t);
    totalEVA += eva;
    if (t <= 5) evaList.push({ year: t, eva });
  }

  const firmValue = ic + totalEVA;
  const intrinsicPerShare = firmValue / shares;

  return {
    intrinsicPerShare,
    totalEVA,
    firmValue,
    evaList,
    assumptions: [
      { label: '投入资本', value: formatYi(ic) },
      { label: 'ROIC', value: `${roic}%` },
      { label: 'WACC', value: `${wacc}%` },
      { label: 'ROIC - WACC', value: `${(roic - wacc).toFixed(2)}%` },
      { label: 'EVA总现值', value: formatYi(totalEVA) },
      { label: '企业价值', value: formatYi(firmValue) },
    ]
  };
}

// ----- 渲染估值结果 -----

function renderValResult(result, method, params) {
  const container = $('#val-result');
  const { intrinsicPerShare, currentPrice } = result;

  // 安全边际
  const safetyMargin = currentPrice > 0
    ? ((intrinsicPerShare - currentPrice) / intrinsicPerShare * 100)
    : 0;

  const isUndervalued = safetyMargin > 10;
  const isOvervalued = safetyMargin < -10;
  const statusClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');
  const statusText = isUndervalued ? '🟢 低估' : (isOvervalued ? '🔴 高估' : '🟡 合理');
  const safetyClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');
  const safetyText = safetyMargin > 0 ? `安全边际 +${safetyMargin.toFixed(1)}%` : `溢价 ${Math.abs(safetyMargin).toFixed(1)}%`;

  let html = `
    <div class="val-result-header">
      <h3>${result.methodName} 估值结果</h3>
    </div>
    <div class="val-result-body">
      <div class="val-core-result">
        <div class="val-intrinsic-label">每股内在价值</div>
        <div class="val-intrinsic-value ${statusClass}">¥${intrinsicPerShare.toFixed(2)}</div>
        <div class="val-safety-margin ${safetyClass}">${statusText} · ${safetyText}</div>
      </div>

      <div class="val-compare-row">
        <span class="val-compare-label">内在价值</span>
        <span class="val-compare-value">¥${intrinsicPerShare.toFixed(2)}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">当前市价</span>
        <span class="val-compare-value">¥${currentPrice?.toFixed(2) || '--'}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">差值</span>
        <span class="val-compare-value" style="color:${isUndervalued ? '#e53935' : (isOvervalued ? '#34a853' : 'inherit')}">${currentPrice ? `¥${(intrinsicPerShare - currentPrice).toFixed(2)}` : '--'}</span>
      </div>
      <div class="val-compare-row">
        <span class="val-compare-label">安全边际</span>
        <span class="val-compare-value" style="color:${isUndervalued ? '#e53935' : (isOvervalued ? '#34a853' : 'inherit')}">${safetyMargin.toFixed(1)}%</span>
      </div>`;

  // 可视化柱状条
  if (currentPrice > 0) {
    const maxVal = Math.max(intrinsicPerShare, currentPrice) * 1.2;
    const barIntrinsic = Math.min((intrinsicPerShare / maxVal) * 100, 100);
    const barCurrent = Math.min((currentPrice / maxVal) * 100, 100);

    html += `
      <div class="val-bar-wrap">
        <div class="val-bar-label">
          <span>0</span>
          <span>¥${maxVal.toFixed(0)}</span>
        </div>
        <div class="val-bar-track">
          <div class="val-bar-intrinsic" style="width:${barIntrinsic}%">内在价值 ¥${intrinsicPerShare.toFixed(2)}</div>
          <div class="val-bar-marker" style="left:${barCurrent}%" data-label="市价 ¥${currentPrice.toFixed(2)}"></div>
        </div>
      </div>`;
  }

  // 假设明细
  if (result.assumptions) {
    html += `
      <div class="val-assumptions">
        <h4>📊 计算明细</h4>`;
    result.assumptions.forEach(a => {
      html += `<div class="val-assumption-item"><span>${a.label}</span><span>${a.value}</span></div>`;
    });
    html += `</div>`;
  }

  // EVA特有：年度EVA列表
  if (result.evaList) {
    html += `
      <div class="val-assumptions">
        <h4>📈 年度EVA</h4>`;
    result.evaList.forEach(e => {
      html += `<div class="val-assumption-item"><span>第${e.year}年</span><span>${formatYi(e.eva)}</span></div>`;
    });
    html += `</div>`;
  }

  html += `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text-hint);line-height:1.6">
        ⚠️ 估值结果仅供参考，不构成投资建议。不同假设条件下结果差异较大，建议结合多种方法综合判断。
      </div>
    </div>`;

  container.innerHTML = html;
  container.style.display = '';
}

function formatYi(v) {
  if (v == null) return '--';
  if (Math.abs(v) >= 1) return `${v.toFixed(2)}亿`;
  if (Math.abs(v) >= 0.01) return `${(v * 10000).toFixed(0)}万`;
  return `${v.toFixed(4)}亿`;
}

// ======================== 股票分析模块 ========================

/**
 * 股票搜索（股票分析入口）
 */
async function saSearchStock(keyword) {
  if (!keyword) { hideSASuggest(); return; }
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.QuotationCodeTable?.Data?.length) { hideSASuggest(); return; }

    const items = data.QuotationCodeTable.Data.filter(item =>
      item.MktNum === '0' || item.MktNum === '1' ||
      ['沪A','深A','科创板','创业板'].includes(item.SecurityTypeName)
    ).slice(0, 8);

    if (!items.length) { hideSASuggest(); return; }
    renderSASuggest(items);
  } catch (e) { hideSASuggest(); }
}

function renderSASuggest(items) {
  const container = $('#sa-suggest');
  container.innerHTML = '';
  state.saSuggestIndex = -1;

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-suggest-item';
    const code = item.Code || '';
    // 带行情数据的下拉
    const price = item.MktNum != null ? '' : '';
    div.innerHTML = `
      <span class="stock-suggest-code">${code}</span>
      <span class="stock-suggest-name">${item.Name || ''}</span>
      <span class="stock-suggest-market">${item.SecurityTypeName || ''}</span>
    `;
    div.addEventListener('click', () => {
      const fullCode = code.startsWith('6') ? `${code}.SH` : `${code}.SZ`;
      const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
      selectSAStock(fullCode, item.Name || '', secid);
      hideSASuggest();
    });
    container.appendChild(div);
  });
  container.style.display = '';
}

function updateSASuggestActive(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === state.saSuggestIndex));
  if (state.saSuggestIndex >= 0 && items[state.saSuggestIndex]) {
    items[state.saSuggestIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideSASuggest() {
  const c = $('#sa-suggest');
  if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  state.saSuggestIndex = -1;
}

/**
 * 选择股票 → 获取行情 + 基本面 → 显示卡片
 */
async function selectSAStock(code, name, secid) {
  $('#sa-search-input').value = `${name}(${code})`;

  // 显示卡片（loading态）
  const card = $('#sa-stock-card');
  card.style.display = '';
  $('#sa-stock-name').textContent = name;
  $('#sa-stock-code').textContent = code;
  $('#sa-stock-industry').textContent = '';
  $('#sa-stock-price').textContent = '--';
  $('#sa-stock-change').textContent = '--';
  $('#sa-stock-change').className = 'val-stock-change';

  const metricIds = ['pe','pb','mv','roe','gm','nm','revg','npg','dar','roic','ocf','fcf'];
  metricIds.forEach(id => { $(`#sa-metric-${id}`).textContent = '加载中...'; });

  state.saStock = { code, name, secid };
  state.saFundamentals = null;
  state.saMarkdown = '';
  $('#sa-result').style.display = 'none';

  // 拉取数据
  await fetchSAFundamentals(code, secid);
}

/**
 * 从东方财富拉取行情 + 财务数据
 */
async function fetchSAFundamentals(tsCode, secid) {
  try {
    const code6 = tsCode.replace(/\.(SH|SZ)/, '');
    if (!secid) secid = tsCode.endsWith('.SZ') ? `0.${code6}` : `1.${code6}`;

    // 1. 实时行情
    let quoteData = {};
    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secid}&fields=f2,f3,f9,f12,f14,f20,f21,f23,f115&ut=fa5fd1943c7b386f172d6893dbfba10b`;
      const quoteResp = await fetch(quoteUrl);
      const quoteResult = await quoteResp.json();
      if (quoteResult?.data?.diff?.[0]) quoteData = quoteResult.data.diff[0];
    } catch (e) { console.log('行情接口失败:', e); }

    // 更新行情
    const price = quoteData.f2 != null ? quoteData.f2 : null;
    const changePct = quoteData.f3 != null ? quoteData.f3 : null;
    if (price != null) $('#sa-stock-price').textContent = `¥${price.toFixed(2)}`;
    else $('#sa-stock-price').textContent = '--';
    const changeEl = $('#sa-stock-change');
    if (changePct != null) {
      if (changePct > 0) { changeEl.textContent = `+${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change up'; }
      else if (changePct < 0) { changeEl.textContent = `${changePct.toFixed(2)}%`; changeEl.className = 'val-stock-change down'; }
      else { changeEl.textContent = '0.00%'; changeEl.className = 'val-stock-change'; }
    } else { changeEl.textContent = '--'; changeEl.className = 'val-stock-change'; }

    state.saStock.price = price;
    state.saStock.changePct = changePct;

    const pe = quoteData.f9;
    const pb = quoteData.f23;
    const mv = quoteData.f20;
    const roe = quoteData.f115;
    if (pe != null) $('#sa-metric-pe').textContent = pe.toFixed(1);
    else $('#sa-metric-pe').textContent = '--';
    if (pb != null) $('#sa-metric-pb').textContent = pb.toFixed(2);
    else $('#sa-metric-pb').textContent = '--';
    if (mv != null) $('#sa-metric-mv').textContent = mv >= 100000000 ? `${(mv / 100000000).toFixed(0)}亿` : `${(mv / 10000).toFixed(0)}万`;
    else $('#sa-metric-mv').textContent = '--';
    if (roe != null) $('#sa-metric-roe').textContent = `${roe.toFixed(1)}%`;
    else $('#sa-metric-roe').textContent = '--';

    // 2. 财务主要指标（最近2期用于对比）
    let finMainData = null;
    let finMainDataPrev = null;
    try {
      const finMainUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const finMainResp = await fetch(finMainUrl);
      const finMainResult = await finMainResp.json();
      if (finMainResult?.result?.data?.length) {
        finMainData = finMainResult.result.data[0];
        if (finMainResult.result.data.length > 1) finMainDataPrev = finMainResult.result.data[1];
      }
    } catch (e) { console.log('财务主要指标接口失败:', e); }

    // 更新指标卡
    if (finMainData) {
      if (finMainData.XSMLL != null) $('#sa-metric-gm').textContent = `${parseFloat(finMainData.XSMLL).toFixed(1)}%`;
      else $('#sa-metric-gm').textContent = '--';
      if (finMainData.XSJLL != null) $('#sa-metric-nm').textContent = `${parseFloat(finMainData.XSJLL).toFixed(1)}%`;
      else $('#sa-metric-nm').textContent = '--';
      if (finMainData.TOTALOPERATEREVETZ != null) {
        const pct = parseFloat(finMainData.TOTALOPERATEREVETZ);
        const el = $('#sa-metric-revg');
        el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
        el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
      } else { $('#sa-metric-revg').textContent = '--'; }
      if (finMainData.PARENTNETPROFITTZ != null) {
        const pct = parseFloat(finMainData.PARENTNETPROFITTZ);
        const el = $('#sa-metric-npg');
        el.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
        el.style.color = pct > 0 ? '#e53935' : (pct < 0 ? '#34a853' : 'inherit');
      } else { $('#sa-metric-npg').textContent = '--'; }
      if (finMainData.ZCFZL != null) $('#sa-metric-dar').textContent = `${parseFloat(finMainData.ZCFZL).toFixed(1)}%`;
      else $('#sa-metric-dar').textContent = '--';
      if (finMainData.ROIC != null) $('#sa-metric-roic').textContent = `${parseFloat(finMainData.ROIC).toFixed(1)}%`;
      else $('#sa-metric-roic').textContent = '--';
      if (finMainData.INDUSTRY_NAME) $('#sa-stock-industry').textContent = finMainData.INDUSTRY_NAME;
    }

    // 3. 利润表
    let incomeData = null;
    let incomeDataPrev = null;
    try {
      const incomeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=2&pageNumber=1&reportName=RPT_DMSK_FN_INCOME&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const incomeResp = await fetch(incomeUrl);
      const incomeResult = await incomeResp.json();
      if (incomeResult?.result?.data?.length) {
        incomeData = incomeResult.result.data[0];
        if (incomeResult.result.data.length > 1) incomeDataPrev = incomeResult.result.data[1];
      }
    } catch (e) { console.log('利润表接口失败:', e); }

    // 4. 资产负债表
    let balanceData = null;
    try {
      const bsUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_BALANCE&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const bsResp = await fetch(bsUrl);
      const bsResult = await bsResp.json();
      if (bsResult?.result?.data?.length) balanceData = bsResult.result.data[0];
    } catch (e) { console.log('资产负债表接口失败:', e); }

    // 5. 现金流量表
    let cashflowData = null;
    try {
      const cfUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_DMSK_FN_CASHFLOW&columns=ALL&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const cfResp = await fetch(cfUrl);
      const cfResult = await cfResp.json();
      if (cfResult?.result?.data?.length) cashflowData = cfResult.result.data[0];
    } catch (e) { console.log('现金流量表接口失败:', e); }

    // 6. 获取近5年主要财务指标（用于趋势分析）
    let finMainMultiYear = [];
    try {
      const myUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=20&pageNumber=1&reportName=RPT_F10_FINANCE_MAINFINADATA&columns=REPORT_DATE,REPORT_DATE_NAME,EPSJB,BPS,XSMLL,XSJLL,PARENTNETPROFITTZ,TOTALOPERATEREVETZ,ZCFZL,ROEJQ,ROIC&filter=(SECURITY_CODE%3D%22${code6}%22)`;
      const myResp = await fetch(myUrl);
      const myResult = await myResp.json();
      if (myResult?.result?.data?.length) finMainMultiYear = myResult.result.data;
    } catch (e) { console.log('多年指标接口失败:', e); }

    // 更新现金流指标
    const fund = extractFundamentals(quoteData, finMainData, incomeData, balanceData, cashflowData, tsCode);
    state.saFundamentals = fund;
    if (fund.opCashflowYi != null) $('#sa-metric-ocf').textContent = fund.opCashflowYi.toFixed(1);
    else $('#sa-metric-ocf').textContent = '--';
    if (fund.fcfYi != null) $('#sa-metric-fcf').textContent = fund.fcfYi.toFixed(1);
    else $('#sa-metric-fcf').textContent = '--';

    // 存储多年数据供分析使用
    state.saFundamentals._multiYear = finMainMultiYear;
    state.saFundamentals._incomePrev = incomeDataPrev;
    state.saFundamentals._finMainPrev = finMainDataPrev;

  } catch (e) {
    console.error('拉取股票数据失败:', e);
    showToast('获取股票数据失败');
  }
}

/**
 * 运行股票分析
 */
async function runStockAnalysis() {
  if (state.isSARunning) return;
  if (!state.saStock || !state.saFundamentals) {
    showToast('请先搜索并选择一只股票');
    return;
  }
  if (!getActiveLLMService()?.apiKey) {
    showSettings();
    showToast('请先配置 LLM API Key');
    return;
  }

  state.isSARunning = true;

  // 隐藏搜索区，显示loading
  $('.sa-container').style.display = 'none';
  $('#sa-result').style.display = 'none';
  $('#sa-loading').style.display = '';
  $('#sa-loading-text').textContent = '正在构建分析数据...';

  try {
    // 构建分析数据文本
    const analysisText = buildStockAnalysisText();
    if (!analysisText || analysisText.trim().length < 50) {
      throw new Error('数据不足，无法进行分析');
    }

    // 调用 LLM
    $('#sa-loading-text').textContent = '正在进行投资分析...';
    const userPrompt = `请对以下股票数据进行全方位投资分析：\n---\n${analysisText}\n---\n请严格按照投资公司分析框架的6大维度输出报告，尤其关注估值分析和投资策略建议。`;
    const result = await callLLM(STOCK_ANALYSIS_SYSTEM_PROMPT, userPrompt, true, 'stock-analysis');

    if (result) {
      state.saMarkdown = result;
      renderSAReport(result);
      $('#sa-loading').style.display = 'none';
      $('#sa-result').style.display = '';
      buildTOC();
      buildTTSSectionsFrom($('#sa-content'));
    } else {
      throw new Error('LLM调用返回为空');
    }
  } catch (e) {
    $('#sa-loading').style.display = 'none';
    console.error('股票分析错误:', e);
    if (e.message.includes('API key') || e.message.includes('401')) {
      showSettings();
      showToast('API Key 无效');
    } else {
      showToast('分析失败：' + e.message);
    }
    $('.sa-container').style.display = '';
  } finally {
    state.isSARunning = false;
  }
}

/**
 * 构建股票分析数据文本
 */
function buildStockAnalysisText() {
  const stock = state.saStock;
  const f = state.saFundamentals;
  if (!stock || !f) return '';

  let text = `# ${stock.name}(${stock.code}) 投资分析数据\n\n`;

  // 当前行情
  text += `## 当前行情\n`;
  text += `- 股票名称: ${stock.name}\n`;
  text += `- 股票代码: ${stock.code}\n`;
  if (f.industry) text += `- 所属行业: ${f.industry}\n`;
  if (f.currentPrice) text += `- 当前股价: ¥${f.currentPrice.toFixed(2)}\n`;
  else if (stock.price) text += `- 当前股价: ¥${stock.price.toFixed(2)}\n`;
  if (stock.changePct != null) text += `- 今日涨跌幅: ${stock.changePct > 0 ? '+' : ''}${stock.changePct.toFixed(2)}%\n`;
  if (f.marketCap) text += `- 总市值: ${(f.marketCap / 100000000).toFixed(2)}亿元\n`;
  if (f.pe != null) text += `- PE(TTM): ${f.pe.toFixed(1)}\n`;
  if (f.pb != null) text += `- PB: ${f.pb.toFixed(2)}\n`;
  text += `\n`;

  // 财务主要指标
  text += `## 财务主要指标（最新报告期）\n`;
  if (f.reportDate) text += `- 报告期: ${f.reportDate}\n`;
  if (f.eps != null) text += `- 基本每股收益(EPS): ${f.eps.toFixed(2)}元\n`;
  if (f.bvps != null) text += `- 每股净资产(BPS): ${f.bvps.toFixed(2)}元\n`;
  if (f.grossMargin != null) text += `- 销售毛利率: ${f.grossMargin.toFixed(1)}%\n`;
  if (f.netMargin != null) text += `- 销售净利率: ${f.netMargin.toFixed(1)}%\n`;
  if (f.roe != null) text += `- ROE: ${f.roe.toFixed(1)}%\n`;
  if (f.roic != null) text += `- ROIC: ${f.roic.toFixed(1)}%\n`;
  if (f.revenueGrowth != null) text += `- 营收同比增长率: ${f.revenueGrowth.toFixed(1)}%\n`;
  if (f.profitGrowth != null) text += `- 净利润同比增长率: ${f.profitGrowth.toFixed(1)}%\n`;
  if (f.debtAssetRatio != null) text += `- 资产负债率: ${f.debtAssetRatio.toFixed(1)}%\n`;
  if (f.currentRatio != null) text += `- 流动比率: ${f.currentRatio.toFixed(2)}\n`;
  text += `\n`;

  // 利润表
  text += `## 利润表\n`;
  if (f.revenue) text += `- 营业总收入: ${(f.revenue / 100000000).toFixed(2)}亿元\n`;
  if (f.operateCost) text += `- 营业总成本: ${(f.operateCost / 100000000).toFixed(2)}亿元\n`;
  if (f.operateProfit) text += `- 营业利润: ${(f.operateProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.netProfit) text += `- 归母净利润: ${(f.netProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.deductNetProfit) text += `- 扣非归母净利润: ${(f.deductNetProfit / 100000000).toFixed(2)}亿元\n`;
  if (f.saleExpense) text += `- 销售费用: ${(f.saleExpense / 100000000).toFixed(2)}亿元\n`;
  if (f.manageExpense) text += `- 管理费用: ${(f.manageExpense / 100000000).toFixed(2)}亿元\n`;
  if (f.financeExpense) text += `- 财务费用: ${(f.financeExpense / 100000000).toFixed(2)}亿元\n`;
  text += `\n`;

  // 资产负债表
  text += `## 资产负债表\n`;
  if (f.totalAssets) text += `- 总资产: ${(f.totalAssets / 100000000).toFixed(2)}亿元\n`;
  if (f.totalLiab) text += `- 总负债: ${(f.totalLiab / 100000000).toFixed(2)}亿元\n`;
  if (f.totalEquity) text += `- 所有者权益: ${(f.totalEquity / 100000000).toFixed(2)}亿元\n`;
  if (f.cash) text += `- 货币资金: ${(f.cash / 100000000).toFixed(2)}亿元\n`;
  if (f.inventory) text += `- 存货: ${(f.inventory / 100000000).toFixed(2)}亿元\n`;
  if (f.accountsReceivable) text += `- 应收账款: ${(f.accountsReceivable / 100000000).toFixed(2)}亿元\n`;
  text += `\n`;

  // 现金流量表
  text += `## 现金流量表\n`;
  if (f.opCashflow) text += `- 经营活动现金流净额: ${(f.opCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.capEx) text += `- 资本支出: ${(f.capEx / 100000000).toFixed(2)}亿元\n`;
  if (f.freeCashflow != null) text += `- 自由现金流: ${(f.freeCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.investCashflow) text += `- 投资活动现金流净额: ${(f.investCashflow / 100000000).toFixed(2)}亿元\n`;
  if (f.financeCashflow) text += `- 筹资活动现金流净额: ${(f.financeCashflow / 100000000).toFixed(2)}亿元\n`;

  // ===== 三大现金流关系分析小结 =====
  if (f.opCashflow && f.investCashflow && f.financeCashflow) {
    const opCF = f.opCashflow;
    const invCF = f.investCashflow;
    const finCF = f.financeCashflow;
    const fmtYi2 = (v) => {
      if (v == null || isNaN(v)) return '--';
      return (v / 100000000).toFixed(2) + '亿';
    };
    text += `\n### 三大现金流关系分析小结\n`;
    text += `| 现金流类型 | 金额(亿元) | 方向 |\n`;
    text += `|-----------|-----------|------|\n`;
    text += `| 经营活动现金流净额 | ${fmtYi2(opCF)} | ${opCF > 0 ? '📈 流入' : opCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
    text += `| 投资活动现金流净额 | ${fmtYi2(invCF)} | ${invCF > 0 ? '📈 流入' : invCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;
    text += `| 筹资活动现金流净额 | ${fmtYi2(finCF)} | ${finCF > 0 ? '📈 流入' : finCF < 0 ? '📉 流出' : '➡️ 持平'} |\n`;

    const opPos = opCF > 0 ? '+' : '-';
    const invPos = invCF > 0 ? '+' : '-';
    const finPos = finCF > 0 ? '+' : '-';
    const pattern = `${opPos}${invPos}${finPos}`;

    text += `\n**现金流类型判断**：${pattern}\n`;
    const interpretations = {
      '++-': '【成熟奶牛型】经营造血、投资回收、偿还融资，财务最健康，常见于成熟期白马股',
      '+--': '【扩张成长型】经营造血、投资扩张、偿还融资，积极扩张中，需关注投资回报率',
      '+-+': '【融资扩张型】经营造血但不足以覆盖投资，需外部融资补充，扩张激进，需警惕偿债压力',
      '+++' : '【转型/收缩型】经营流入+投资回收+融资流入，可能正在收缩战线或准备大额投资，需结合具体项目判断',
      '+-0': '【稳健经营型】经营造血、适度投资、融资平衡，财务稳健',
      '-++': '【创业/困境型】经营失血、靠投资回收和融资维持，需高度警惕经营恶化风险',
      '-+-': '【快速扩张烧钱型】经营失血、投资扩张、偿还融资，典型高成长高消耗，需关注资金链',
      '--+': '【输血续命型】经营失血+投资失血，完全靠融资维持，财务风险极高',
      '-+0': '【收缩调整型】经营失血、投资回收、融资平衡，正在收缩但经营尚未恢复',
      '--0': '【双杀衰退型】经营和投资都失血、融资平衡，需紧急改善经营或寻求融资',
      '---': '【全面失血型】三大现金流均为流出，财务危机信号，需紧急干预',
    };
    let interpretation = interpretations[pattern];
    if (!interpretation) {
      const fuzzyPattern = pattern.replace(/0/g, opCF >= 0 ? '+' : '-');
      interpretation = interpretations[fuzzyPattern] || '需结合行业特点和公司阶段综合判断';
    }
    text += `\n**分析结论**：${interpretation}\n`;

    if (f.netProfit && f.netProfit !== 0) {
      const opCFRatio = (opCF / f.netProfit).toFixed(2);
      text += `\n**盈利质量**：经营CF/归母净利润 = ${opCFRatio}（${parseFloat(opCFRatio) >= 1.0 ? '✅ 利润有现金支撑' : parseFloat(opCFRatio) >= 0.7 ? '⚠️ 利润含金量一般' : '❌ 利润含金量不足，需关注应收及库存'}）\n`;
    }

    const fcf = opCF + invCF;
    text += `**自由现金流(近似)**：经营CF + 投资CF = ${fmtYi2(fcf)}亿元（${fcf > 0 ? '✅ 正向自由现金流' : '❌ 自由现金流为负，投资消耗超过经营造血'}）\n`;
  }
  text += `\n`;

  // 估值相关
  text += `## 估值参数\n`;
  if (f.currentPrice) text += `- 当前股价: ¥${f.currentPrice.toFixed(2)}\n`;
  if (f.eps) text += `- EPS: ${f.eps.toFixed(2)}元\n`;
  if (f.bvps) text += `- 每股净资产: ${f.bvps.toFixed(2)}元\n`;
  if (f.pe) text += `- PE(TTM): ${f.pe.toFixed(1)}\n`;
  if (f.pb) text += `- PB: ${f.pb.toFixed(2)}\n`;
  if (f.dps) text += `- 每股股利(估): ${f.dps.toFixed(2)}元\n`;
  text += `\n`;

  // 多年趋势
  if (f._multiYear && f._multiYear.length > 1) {
    text += `## 近期财务指标趋势\n`;
    text += `| 报告期 | EPS | 毛利率 | 净利率 | ROE | 营收增速 | 净利增速 | 负债率 |\n`;
    text += `|--------|-----|--------|--------|-----|----------|----------|--------|\n`;
    f._multiYear.slice(0, 8).forEach(r => {
      text += `| ${r.REPORT_DATE_NAME || r.REPORT_DATE?.substring(0,10) || '--'} `;
      text += `| ${r.EPSJB ?? '--'} `;
      text += `| ${r.XSMLL ?? '--'}% `;
      text += `| ${r.XSJLL ?? '--'}% `;
      text += `| ${r.ROEJQ ?? '--'}% `;
      text += `| ${r.TOTALOPERATEREVETZ ?? '--'}% `;
      text += `| ${r.PARENTNETPROFITTZ ?? '--'}% `;
      text += `| ${r.ZCFZL ?? '--'}% |\n`;
    });
    text += `\n`;
  }

  return text;
}

/**
 * 渲染股票分析报告（完整）
 */
function renderSAReport(markdown) {
  const container = $('#sa-content');
  container.innerHTML = renderMarkdown(markdown);
  container.classList.remove('streaming-cursor');
  addSectionIdsAndPlayButtons(container);
}

/**
 * 渲染股票分析报告（流式）
 */
function renderSAReportStreaming(markdown) {
  const container = $('#sa-content');
  if ($('#sa-result').style.display === 'none') {
    $('#sa-result').style.display = '';
    $('#sa-loading').style.display = 'none';
  }
  container.innerHTML = renderMarkdown(markdown);
  container.classList.add('streaming-cursor');
  clearTimeout(window._saStreamTimeout);
  window._saStreamTimeout = setTimeout(() => {
    container.classList.remove('streaming-cursor');
    addSectionIdsAndPlayButtons(container);
    buildTOC();
    buildTTSSectionsFrom(container);
  }, 3000);
}

/**
 * 搜索股票（用于设置面板中的关注列表添加）
 */
async function searchSettingsWatchlistStock(keyword) {
  const suggestDiv = $('#settings-watchlist-suggest');
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
        renderSettingsWatchlistTags();
        $('#settings-watchlist-input').value = '';
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
 * 直接添加关注公司（设置面板中）
 */
function addSettingsWatchlistCompany() {
  const input = $('#settings-watchlist-input');
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
    renderSettingsWatchlistTags();
    input.value = '';
    showToast(`已添加关注：${val}`);
    // 异步搜索补全公司名称
    fetchCompanyNameAsync(code, tsCode, market);
    return;
  }

  // 否则触发搜索
  searchSettingsWatchlistStock(val);
}

/**
 * 渲染设置面板中的关注列表标签
 */
function renderSettingsWatchlistTags() {
  const container = $('#settings-watchlist-tags');
  if (!container) return;

  if (state.watchlist.length === 0) {
    container.innerHTML = '<div class="settings-watchlist-empty">暂无关注公司，请在上方搜索添加</div>';
    return;
  }

  container.innerHTML = state.watchlist.map(w => `
    <div class="settings-watchlist-tag">
      <span class="settings-watchlist-tag-name">${w.name}</span>
      <span class="settings-watchlist-tag-code">${w.tsCode || w.code}</span>
      <button class="settings-watchlist-tag-remove" data-ts="${w.tsCode}" title="移除">✕</button>
    </div>
  `).join('');

  // 绑定删除
  container.querySelectorAll('.settings-watchlist-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeWatchlistCompany(btn.dataset.ts);
      renderSettingsWatchlistTags();
    });
  });
}

/**
 * 显示设置面板时刷新关注公司列表
 */
function refreshSettingsWatchlist() {
  renderSettingsWatchlistTags();
}

/**
 * 渲染模型服务列表
 */
function renderLLMServicesList() {
  const container = $('#llm-services-list');
  const activeSelect = $('#llm-active-service');
  if (!container || !activeSelect) return;
  
  // 渲染服务列表
  if (state.settings.services.length === 0) {
    container.innerHTML = '<div class="hs-watchlist-empty">暂无模型服务，请添加</div>';
  } else {
    container.innerHTML = state.settings.services.map(service => `
      <div class="llm-service-item ${service.id === state.settings.activeServiceId ? 'active' : ''} ${!service.enabled ? 'disabled' : ''}" 
           data-service-id="${service.id}">
        <div class="llm-service-info">
          <div class="llm-service-name">${service.name}</div>
          <div class="llm-service-detail">${service.model} · ${service.baseUrl}</div>
        </div>
        <div class="llm-service-actions">
          <button class="llm-service-btn edit" data-service-id="${service.id}" title="编辑">✏️</button>
          <button class="llm-service-btn delete" data-service-id="${service.id}" title="删除">🗑️</button>
        </div>
      </div>
    `).join('');
    
    // 绑定点击事件
    container.querySelectorAll('.llm-service-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.llm-service-btn')) return;
        switchLLMService(item.dataset.serviceId);
      });
    });
    
    container.querySelectorAll('.llm-service-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editLLMService(btn.dataset.serviceId);
      });
    });
    
    container.querySelectorAll('.llm-service-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLLMService(btn.dataset.serviceId);
      });
    });
  }
  
  // 渲染激活服务下拉框
  activeSelect.innerHTML = state.settings.services
    .filter(s => s.enabled)
    .map(service => `<option value="${service.id}">${service.name} (${service.model})</option>`)
    .join('');
  activeSelect.value = state.settings.activeServiceId;
}

/**
 * 切换当前使用的模型服务
 */
function switchLLMService(serviceId) {
  state.settings.activeServiceId = serviceId;
  localStorage.setItem('er_settings', JSON.stringify(state.settings));
  loadActiveService();
  renderLLMServicesList();
  showToast(`已切换到: ${state.settings.services.find(s => s.id === serviceId)?.name}`);
}

/**
 * 编辑模型服务
 */
function editLLMService(serviceId) {
  const service = state.settings.services.find(s => s.id === serviceId);
  if (!service) return;
  
  $('#llm-service-name').value = service.name;
  $('#llm-provider').value = service.provider;
  $('#llm-base-url').value = service.baseUrl;
  $('#llm-api-key').value = service.apiKey;
  $('#llm-model').value = service.model;
  $('#llm-service-enabled').checked = service.enabled;
  
  $('#llm-service-editor').style.display = '';
  $('#llm-service-editor').dataset.editingId = serviceId;
  
  // 触发provider change事件以填充默认值
  $('#llm-provider').dispatchEvent(new Event('change'));
}

/**
 * 删除模型服务
 */
function deleteLLMService(serviceId) {
  if (state.settings.services.length <= 1) {
    showToast('至少保留一个模型服务');
    return;
  }
  
  if (serviceId === state.settings.activeServiceId) {
    showToast('无法删除当前使用的服务');
    return;
  }
  
  if (!confirm('确定要删除此模型服务吗？')) return;
  
  state.settings.services = state.settings.services.filter(s => s.id !== serviceId);
  localStorage.setItem('er_settings', JSON.stringify(state.settings));
  renderLLMServicesList();
  showToast('已删除模型服务');
}

/**
 * 添加新模型服务
 */
function addNewLLMService() {
  $('#llm-service-name').value = '';
  $('#llm-provider').value = 'openai';
  $('#llm-base-url').value = 'https://api.openai.com/v1';
  $('#llm-api-key').value = '';
  $('#llm-model').value = 'gpt-4o';
  $('#llm-service-enabled').checked = true;
  
  $('#llm-service-editor').style.display = '';
  $('#llm-service-editor').dataset.editingId = '';
  
  // 触发provider change事件以填充默认值
  $('#llm-provider').dispatchEvent(new Event('change'));
}

/**
 * 保存模型服务
 */
function saveLLMService() {
  const name = $('#llm-service-name').value.trim();
  if (!name) {
    showToast('请输入服务名称');
    return;
  }
  
  const serviceData = {
    name: name,
    provider: $('#llm-provider').value,
    baseUrl: $('#llm-base-url').value,
    apiKey: $('#llm-api-key').value,
    model: $('#llm-model').value,
    enabled: $('#llm-service-enabled').checked
  };
  
  const editingId = $('#llm-service-editor').dataset.editingId;
  
  if (editingId) {
    // 更新现有服务
    const serviceIndex = state.settings.services.findIndex(s => s.id === editingId);
    if (serviceIndex >= 0) {
      state.settings.services[serviceIndex] = {
        ...state.settings.services[serviceIndex],
        ...serviceData
      };
    }
  } else {
    // 添加新服务
    const newService = {
      id: 'service_' + Date.now(),
      ...serviceData
    };
    state.settings.services.push(newService);
  }
  
  localStorage.setItem('er_settings', JSON.stringify(state.settings));
  $('#llm-service-editor').style.display = 'none';
  renderLLMServicesList();
  showToast('已保存模型服务');
}

/**
 * 取消编辑模型服务
 */
function cancelEditLLMService() {
  $('#llm-service-editor').style.display = 'none';
}
