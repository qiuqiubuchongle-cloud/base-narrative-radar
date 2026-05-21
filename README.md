# Base Narrative Radar / Base 叙事雷达

> 🧭 一个给 Base 产品型 token 做第一轮真伪筛查的 Codex Skill。  
> 输入 CA / 官网 / X / GitHub / 项目文案，输出一份纯文字证据报告。

![Base 叙事雷达工作流](./assets/base-radar-flow.svg)

## 一句话安装

```bash
git clone https://github.com/qiuqiubuchongle-cloud/base-narrative-radar.git && cd base-narrative-radar && npm test
```

完整能力需要先安装并登录 OKX OnchainOS CLI：

```bash
npx skills add okx/onchainos-skills --yes --global
onchainos wallet status
```

如果 `onchainos wallet status` 能正常返回，说明链上数据能力可用。没有 OnchainOS 时，`base:discover` 仍可用 DEX Screener / GitHub 做部分发现，但 `base:dd:auto` 的 OKX 风险、creator、protocol、holder 等链上证据会缺失。

## Agent 快速使用

最推荐的入口是一条命令：

```bash
npm run base:dd:auto -- 0xTokenAddress
```

它会自动完成：

```text
CA → 发现官网/X/GitHub/Docs → 读取链上数据 → 检查官网真实性 → 检查 GitHub → 输出纯文字尽调报告
```

如果你已经知道官网、X 或 GitHub，可以手动补充：

```bash
npm run base:dd:quick -- 0xTokenAddress \
  --website https://example.xyz \
  --twitter https://x.com/project \
  --github https://github.com/project/repo
```

准备写长内容或深挖同叙事时再用：

```bash
npm run base:dd:deep -- 0xTokenAddress --notes "把项目文案、推文、dev 说法贴这里"
```

## 依赖说明

| 依赖 | 是否必须 | 用途 |
|---|---:|---|
| Node.js 18+ | 必须 | 运行脚本 |
| OKX OnchainOS CLI | 完整报告必须 | token report、风险扫描、creator/protocol、链上价格与流动性 |
| DEX Screener 公共接口 | 自动使用 | 挖官网、X、GitHub、Docs、市值、流动性 |
| GitHub 公共接口 | 自动使用 | 搜索同名 repo、检查显式 GitHub 线索 |
| Basescan / Etherscan API Key | 可选 | 独立验证合约创建者 |
| Tavily / Brave / SerpAPI | 可选 | Deep 模式搜索新闻、生态资料、同叙事案例 |

可选环境变量：

```bash
cp .env.example .env
```

## 它是干啥的？

Base 叙事雷达是一个面向 Base 链产品型 token 的快速尽调工具。

你可以喂给它：

- 🔗 Base token CA
- 🌐 项目官网
- 🐦 X / Twitter 链接
- 🧑‍💻 GitHub repo / organization / user
- 📝 一段项目介绍、推文、dev 文案

它会把 OKX OnchainOS 链上数据、官网痕迹、GitHub 证据、X 认领线索和同叙事资料拼起来，给你一个更容易读懂的判断。

说人话就是：

> 这个 Agent 是干啥的？Github 真不真？有产品吗？Dev 认不认领？这个叙事到底有没有价值？

先让它帮你做第一轮筛查。

## 为什么要做？

Base 上的新机会越来越像“产品判断题”。

以前很多 meme 看社区、看图、看传播就够了。但 Base 很多项目会披着产品外衣出现：AI Agent、开发者工具、Farcaster 资产、自动化工作流、creator economy、链上应用 demo。

麻烦的是，现在 AI 零门槛搓产品：

- 🤖 几分钟能生成一个官网
- 🧱 一小时能堆出一个 GitHub repo
- 🎭 文案能写得像真创业项目
- 🧪 demo 可能只是 teaser
- 📣 X 上一句 “full MVP is live” 就够大家开始脑补

聪明玩家几分钟能看个大概，但大部分人光是检索信息就要花很久。等研究明白了，要么已经起飞，要么已经归零。

Base 叙事雷达不负责预测涨跌，它只做一件事：

> ⚡ 把“我看不懂它有没有价值”变成一份结构化证据表。

## 核心能力

### 1. CA 身份识别

读取 OKX OnchainOS 数据，识别：

- token 名称 / symbol
- 市值、流动性、持有人
- 风险等级、tokenTags
- creator / protocol 线索

注意：`riskLevel: LOW` 只代表未发现常见自动化风险，不代表项目安全。

### 2. 发射平台判断

识别项目更像来自：

- Clanker
- Virtuals
- Zora
- Flaunch
- Base App
- Unknown

不同出生地对应不同玩法。Clanker 更看 dev 认领和社交流动；Virtuals 更看 Agent 是否有 API、demo、收入和生态使用；Flaunch 更看机制是否真的能带来需求。

### 3. 官网真实性

不是官网越漂亮越真。

它会检查：

- 官网是否可访问
- 正文是否足够
- 有没有 API / form / auth / dashboard / connect wallet 等应用痕迹
- 是否只是模板壳、coming soon、AI 包装文案
- 是否只是发射台通用页面，而不是项目自有官网

### 4. GitHub 证据

它会区分：

- ✅ 官网或 X 明确链接到 GitHub
- ✅ GitHub 近期有更新
- ⚠️ 只是同名搜索结果
- ⚠️ repo 过期、归档或明显不相关

显式关联比 stars 更重要。同名 GitHub 只能算弱证据。

### 5. 叙事价值评分

每个项目都会输出：

```text
叙事价值评分：xx/100
```

当前支持的 Base 叙事类型：

- AI Agent
- Developer Tool
- Automation Workflow
- Farcaster / Social Asset
- Content / Creator Economy
- Trading / Finance Tool
- Infra / API / Data

高分项目通常具备三个特点：

1. 一句话能讲懂；
2. 属于 Base 用户熟悉的玩法；
3. 有官网、GitHub、发射平台或外部资料支撑。

### 6. 产品式 Rug 风险

Base 上很多风险不是传统土狗式 rug，而是“产品式包装”。

常见风险：

- `story_shell`：概念很强，但产品证据很薄
- `dev_silent`：dev 不认领、不互动、不更新
- `fake_product`：有官网/白皮书，但没有可用产品
- `repo_mismatch`：GitHub 和 token 叙事不一致
- `launchpad_noise`：发射台批量噪音
- `liquidity_exit_risk`：流动性不足，退出困难

## Quick / Deep 两种模式

### Auto：只给 CA，自动发现再尽调

日常最推荐用 Auto。

```bash
npm run base:dd:auto -- 0xTokenAddress
```

Auto 会先从 4 类数据源挖信息，再把发现结果喂给尽调：

| 数据源 | 能挖到什么 |
|---|---|
| DEX Screener | 官网、X/Twitter、GitHub、Telegram、Discord、市值、流动性、价格 |
| OKX OnchainOS | token 名称、symbol、风险、creator、protocol、链上基础信息 |
| Basescan / Etherscan V2 | 合约创建者、创建交易；需要 API key |
| GitHub Search | 同名仓库候选、组织下 repo 候选 |

### Quick：先给能不能看的结论

日常丢 CA 建议先跑 Quick。

```bash
npm run base:dd:quick -- 0xTokenAddress
```

Quick 会快速给出：

- 项目身份
- 发射平台
- 叙事类型
- 叙事价值评分
- 官网真实性
- GitHub 证据
- 初步 watch / avoid 判断

### Deep：准备发内容时再深挖

Deep 会额外检索：

- 外部新闻
- 生态资料
- KOL / 社媒 / 镜像页面
- 同叙事案例

```bash
npm run base:dd:deep -- 0xTokenAddress \
  --website https://example.xyz \
  --twitter https://x.com/project \
  --github https://github.com/project/repo \
  --notes "项目介绍、dev 说法、推文内容都可以贴进来"
```

Deep 模式建议配置搜索 API：

- `TAVILY_API_KEY`
- `BRAVE_API_KEY` / `BRAVE_SEARCH_API_KEY`
- `SERPAPI_KEY`

没有搜索 API 也能跑，但会慢一些，结果也可能更稀疏。

## 输出长什么样？

![检测报告示意](./assets/base-report-card.svg)

示例：

```text
Base 叙事雷达检测报告

项目：GitMarket (GITMARKET)
合约：0xd510829f654e102a57c4f6d9bb6879b7cc2ccb07
模式：quick
初判：watch
综合评分：66/100
叙事类型：Developer Tool
叙事价值评分：85/100
发射平台：Clanker
产品式 Rug 风险：low

一句话判断
有一定产品叙事和链上基础，但仍需要 dev/X/GitHub 或真实使用继续确认。

核心评分
链上基础：70/100
官网真实性：55/100
GitHub 证据：45/100
叙事价值：85/100
```

报告会保存为：

```text
data/reports/<ca>.json
data/reports/<ca>.txt
```

默认是纯文字报告，方便直接复制给自己、丢进群里，或者继续让 AI 改写。

## 结论等级

| 等级 | 含义 |
|---|---|
| `strong_watch` | 链上基础、产品证据、叙事证据都相对完整，值得重点观察 |
| `watch` | 有一定产品叙事和链上基础，但仍需要继续确认 |
| `weak_watch` | 有叙事或热度线索，但真实性证据不足 |
| `avoid` | 关键证据不足或风险过高，更像噪音或包装项目 |

`watch` 只是“值得继续观察”，不是“可以买”。

## 项目结构

```text
base-narrative-radar/
├── SKILL.md
├── README.md
├── docs/
│   └── product-introduction.zh.md
├── assets/
│   ├── base-radar-flow.svg
│   └── base-report-card.svg
├── references/
│   └── base-narrative-rubric.md
├── scripts/
│   ├── base_project_discover.mjs
│   └── base_token_due_diligence.mjs
├── config/
│   └── base_token_due_diligence.config.json
├── agents/
│   └── openai.yaml
├── package.json
└── .env.example
```

## 适合谁用？

- 🧑‍🌾 Base 链上农民：看到 CA，先判断是不是值得继续看
- 🧪 Agent 产品体验党：想判断一个 Agent 项目是不是只有壳
- 🧑‍💻 GitHub 侦察员：想知道 repo 是真项目还是同名撞车
- ✍️ 内容作者：准备写 Base 项目时，快速整理证据链
- 🧠 产品经理脑玩家：喜欢从 dev、产品、叙事角度理解链上项目

## 免责声明

这个东西是球球自己写着玩儿的 1.0 版本。

它不是投资建议，不是买卖信号，也不是安全审计。它只是提供一个判断 Base 产品型 token 的思路：把 CA、官网、GitHub、X、项目文案这些线索拆开看，尽量少被漂亮官网和 AI 文案糊弄。

结论里的 `strong_watch / watch / weak_watch / avoid` 只是研究优先级，不是交易指令。

欢迎自己魔改：你可以换评分规则、换叙事分类、接自己的搜索 API、接自己的地址库、加截图、加 X 数据源，甚至把它改成完全不同链上的项目侦察器。

反正 DYOR，钱包是自己的，亏了别找球球。

## License

MIT
