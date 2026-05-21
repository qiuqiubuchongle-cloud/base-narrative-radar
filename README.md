# Base 叙事雷达

> 输入 Base 链 CA、官网、X/Twitter、GitHub，甚至一段项目文案，快速判断这个项目到底在讲什么故事、有没有产品证据、叙事是否值得继续观察。

Base 上的机会越来越像“产品判断题”。

一个 Agent 是干什么的？为什么找不到信息？GitHub 是真的吗？官网是不是只有壳？Dev 到底认不认领？项目是不是抄来的？这个叙事有没有价值？

这就是 **Base 叙事雷达** 要解决的问题。

它不是喊单工具，也不是自动交易机器人，而是一个面向 Base 产品型 token 的快速尽调 Skill。它帮你把分散在 OKX OnchainOS、官网、GitHub、X 文案和外部新闻里的线索拼起来，给出一个可解释的初判。

## 一句话定位

**Base 叙事雷达 = Base 产品型 token 的快速叙事尽调工具。**

它重点判断：

- 这个 CA 对应的项目是谁？
- 它是 Clanker、Virtuals、Zora、Flaunch，还是未知来源？
- 官网像不像真实产品？
- GitHub 是显式关联，还是同名撞车？
- X/Twitter 是否有认领线索？
- 这个叙事在 Base 生态里有没有理解门槛和传播价值？
- 当前更像 `strong_watch`、`watch`、`weak_watch`，还是 `avoid`？

## 为什么需要它

Base 不是典型土狗链。

很多项目不是靠“meme 图 + 社区喊单”起飞，而是靠 Agent、开发者工具、Farcaster、自动化工作流、内容平台、creator economy、链上产品 demo 这些叙事被市场重新理解。

问题是，现在 AI 搓产品的门槛太低了：

- 几分钟能做一个 landing page
- 一小时能生成一个 GitHub repo
- 文案可以写得像真创业项目
- demo 可以只是 teaser
- X 上一句“full MVP is live”就能让人开始脑补

聪明选手几分钟能辨别真假，但普通用户光检索信息就要花很久。等研究明白了，要么已经起飞，要么已经归零。

Base 叙事雷达的目标不是替你预测涨跌，而是降低第一轮检索成本：先判断它有没有继续看的必要。

## 核心输入

你可以只给一个 CA：

```bash
npm run base:dd:quick -- 0xTokenAddress
```

也可以补充官网、X、GitHub 或项目文案：

```bash
npm run base:dd:quick -- 0xTokenAddress \
  --twitter https://x.com/project \
  --notes "website: https://example.xyz github: https://github.com/example/project"
```

深度研究模式：

```bash
npm run base:dd:deep -- 0xTokenAddress \
  --website https://example.xyz \
  --twitter https://x.com/project \
  --github https://github.com/example/project \
  --notes "项目文案、dev 说法、产品介绍都可以贴进来"
```

## Quick / Deep 两档

### Quick：先给你能不能看的结论

Quick 模式默认启用，适合日常丢 CA。

它会读取：

- OKX OnchainOS token report
- OKX liquidity / risk / holders / market cap
- 官网 HTML
- GitHub repo 或组织主页
- 用户输入的 X 链接和项目文案

输出重点：

- 项目身份
- 发射平台
- 叙事类型
- 叙事价值评分
- 官网真实性
- GitHub 证据
- 产品式 rug 风险
- watch / avoid 初判

### Deep：准备发内容或重点研究时再跑

Deep 模式会追加：

- 外部搜索
- 同叙事新闻
- 生态资料
- KOL / 社媒 / 镜像页面
- 同类案例

建议配置搜索 API：

- `TAVILY_API_KEY`
- `BRAVE_API_KEY`
- `SERPAPI_KEY`

没有搜索 API 也能兜底，但速度和稳定性会差一些。

## 输出示例

```text
Base 叙事雷达检测报告

项目：GitMarket (GITMARKET)
合约：0xd510829f654e102a57c4f6d9bb6879b7cc2ccb07
初判：watch
综合评分：66/100
叙事类型：Developer Tool
叙事价值评分：85/100
发射平台：Clanker
产品式 Rug 风险：low

一句话判断
有一定产品叙事和链上基础，但仍需要 dev/X/GitHub 或真实使用继续确认。

叙事价值
叙事价值高。这个项目的故事比较容易被 Base 用户理解，并且有发射平台、官网或 GitHub 证据支撑。
```

## 判断框架

### 1. CA 身份识别

通过 OKX OnchainOS 读取 token 基础信息：

- 名称 / Symbol
- 市值
- 流动性
- 持有人
- 风险等级
- tokenTags
- creatorAddress
- protocolId

注意：`riskLevel LOW` 只代表未发现常见自动化风险，不代表项目安全。

### 2. 发射平台识别

当前支持识别：

- Clanker
- Virtuals
- Zora
- Flaunch
- Base App
- Unknown

不同平台有不同判断逻辑。

Clanker 看谁发、谁转、dev 是否认领、传播能不能活过当天。

Virtuals 看 Agent 是否能接 API、是否有 demo、收入、团队维护和生态使用。

Flaunch 看机制是否真的能制造买盘，而不只是 Uniswap v4 hooks 这些好听词。

### 3. 官网真实性

检测：

- 官网是否可访问
- title / description / 正文长度
- 是否有 form、API、auth、dashboard、connect wallet 等应用线索
- 是否只是模板壳、coming soon、AI 包装文案
- 是否只是发射台通用官网，而非项目自有官网

官网不是越漂亮越真。Base 上很多“产品式 rug”的官网都很像真东西，所以这里只做证据评分，不做绝对结论。

### 4. GitHub 证据

支持：

- 具体 repo 链接
- GitHub 组织 / 用户主页
- 从项目文案里自动抽 GitHub URL
- 无显式链接时用项目名和 symbol 搜索

评分看：

- 是否显式关联
- 是否近期更新
- repo 名称和叙事是否匹配
- stars / forks
- 是否 archived

同名搜索结果只是弱证据。真正强的是官网或 X 明确链接到 GitHub。

### 5. 叙事价值评分

叙事价值单独按 100 分输出。

当前支持的叙事类型：

- AI Agent
- Developer Tool
- Automation Workflow
- Farcaster / Social Asset
- Content / Creator Economy
- Trading / Finance Tool
- Infra / API / Data

高分项目通常具备：

- 一句话能讲懂
- 属于 Base 用户熟悉的玩法
- 有官网或 GitHub 支撑
- 有发射平台语境
- 能被同类新闻或生态资料解释

低分项目通常是：

- 只有热门词堆叠
- 只有官网，没有产品路径
- GitHub 和项目叙事不一致
- 没有 dev 认领
- 只能靠价格上涨解释价值

### 6. 产品式 Rug 风险

Base 的 rug 很多不是土狗式 rug，而是产品式包装。

风险类型：

- `story_shell`：概念很强，但产品证据很薄
- `dev_silent`：dev 不认领、不互动、不更新
- `fake_product`：有官网和白皮书，但没有可用产品
- `repo_mismatch`：GitHub 和 token 叙事不一致
- `launchpad_noise`：发射台批量噪音项目
- `liquidity_exit_risk`：流动性不足，退出困难

## 结论等级

- `strong_watch`：链上基础、产品证据、叙事证据都比较完整
- `watch`：值得加入 watchlist，但需要继续确认
- `weak_watch`：有叙事或链上热度，但真实性证据不足
- `avoid`：关键证据不足或风险过高

## 安装与运行

需要本地已安装并配置 OKX OnchainOS CLI。

```bash
npm run test
npm run base:dd:quick -- 0xTokenAddress
```

Deep 模式建议配置 `.env` 中的搜索 API。

## 产品边界

Base 叙事雷达不会告诉你“买不买”。

它只做三件事：

1. 降低第一轮信息检索成本
2. 用统一框架解释项目叙事和证据
3. 帮你决定是否值得继续观察

说白了，它可能不是 alpha 机器，更像一个链上产品经理的随身质检员。

初版先到这里。如果 Base 继续火热，这个 Skill 会继续迭代 X 真实性、dev 历史项目、同类案例库、官网截图、GitHub 代码深度分析和 watchlist 二次复查。

