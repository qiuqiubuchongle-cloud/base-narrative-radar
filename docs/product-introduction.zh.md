# 🧭 Base 项目证据雷达：先看官网和 GitHub，再谈叙事

🌐 语言：[中文](./product-introduction.zh.md) | [English](./product-introduction.en.md)

🏠 首页：[中文 README](../README.md) | [English README](../README.en.md)

![Base 项目证据雷达工作流](../assets/base-radar-flow.svg)

## 1. 一句话介绍

Base 项目证据雷达是一个快速判断 Base 链产品型 token 的尽调 Skill。

你可以喂给它 CA、官网、GitHub、X/Twitter，甚至只是一段项目文案，它会自动整理链上基础、官网产品证据、GitHub 证据、X 认领线索、案例对照和产品式 rug 风险，最后给出 `strong_watch / watch / weak_watch / avoid` 的客观初判。

说人话就是：它不帮你冲，也不替叙事喊单。它先帮你判断这个项目像不像真产品，值不值得继续查。

## 2. 安装和依赖

一句话安装：

```bash
git clone https://github.com/qiuqiubuchongle-cloud/base-narrative-radar.git && cd base-narrative-radar && npm test
```

完整能力需要 OKX OnchainOS CLI。建议先安装并确认登录状态：

```bash
npx skills add okx/onchainos-skills --yes --global
onchainos wallet status
```

必须依赖：

- Node.js 18+：运行脚本；
- OKX OnchainOS CLI：读取 token report、风险扫描、creator、protocol、链上价格与流动性。

自动使用的数据源：

- DEX Screener：发现官网、X、GitHub、Docs、市值、流动性；
- GitHub Search：搜索同名 repo 和组织下仓库。

可选增强：

- `BASESCAN_API_KEY` 或 `ETHERSCAN_API_KEY`：独立验证合约创建者；
- `TAVILY_API_KEY` / `BRAVE_API_KEY` / `SERPAPI_KEY`：Deep 模式检索新闻、生态资料、同叙事案例。
- `TWITTER_BEARER_TOKEN` 或 `X_BEARER_TOKEN`：检索 X/Twitter 官方认领、KOL 讨论和同名噪音。
- `XAI_API_KEY`：调用 Grok/xAI 的 Web Search + X Search，做机制、团队、实体互动和市值预期深研。

如果没有 OnchainOS，`npm run base:discover -- 0xCA` 仍然可以做一部分资料发现；但完整尽调报告会缺少 OKX 链上证据。

## 3. 它解决什么痛点

Base 现在不是纯 meme 玩法，越来越多机会披着“产品”的外衣出现。

一个 Agent 是干什么的？GitHub 是真仓库还是同名撞车？官网有没有产品，还是只有 landing page？Dev 有没有公开认领 token？项目是不是只是复制一个热门叙事？这个叙事到底有没有 Base 用户能理解的传播价值？

这些问题对聪明玩家来说，几分钟能判断个大概。但对大多数人来说，第一轮检索就很耗时间。

更麻烦的是，现在 AI 零门槛搓产品：

- 🤖 网站可以快速生成；
- 🧱 GitHub repo 可以快速堆出来；
- 🎭 项目文案可以写得非常像真实创业项目；
- 🧪 demo 可以只是一个 teaser；
- 📣 X 上一句“full MVP live”就足够让市场脑补。

所以 Base 项目证据雷达要做的不是预测涨跌，也不是给叙事打高分，而是把“真假难辨”先拆成证据模块：官网到底有没有产品，GitHub 到底是不是官方，repo 到底有没有真实代码结构，X 上有没有明确认领和持续更新。

## 4. 它能分析哪些输入

支持输入：

- Base token CA；
- 项目官网；
- X/Twitter 链接；
- GitHub repo / organization / user 链接；
- 项目简介、推文、白皮书片段、dev 文案；
- Clanker / Virtuals / Zora / Flaunch / Base App 相关项目线索。

最轻量的用法只需要一个 CA。信息越多，判断越稳。

## 5. 它输出什么

![检测报告示意](../assets/base-report-card.svg)

报告会分成几个模块：

### CA 身份识别

识别 token 名称、symbol、市值、流动性、持有人、风险等级、creator / protocol 线索。

### 发射平台判断

判断项目更像来自 Clanker、Virtuals、Zora、Flaunch、Base App，还是未知来源。

不同平台有不同判断方式。Clanker 更看 dev 认领和社交流动，Virtuals 更看 Agent 是否有 API、demo、收入和生态使用，Zora 更看内容/creator 逻辑，Flaunch 更看机制能否产生真实需求。

### 官网产品证据

不是官网越漂亮越真。

它会检查官网是否可访问、正文是否足够、有没有 API/form/auth/dashboard/connect wallet/app route 等应用线索，demo 是真实状态还是 simulated / teaser，是否只是模板壳、coming soon 或发射台通用页面。

### GitHub 产品证据

它会区分：

- 官网或 X 明确链接到 GitHub；
- GitHub 近期有更新；
- repo 是否包含 app / contracts / sdk / cli / docs / API / server / playground 等产品组件；
- 同一个 GitHub owner 下是否形成完整产品地图；
- repo 名称和项目叙事匹配；
- 只是同名搜索结果；
- repo 过期、归档或明显不相关。

同名 GitHub 只能算弱证据，显式关联才是强证据。

### Base Agent 案例库

这次新增了一个证据优先的案例库：

```text
references/base-agent-evidence-cases.json
```

它会把项目粗分为：

- `real_build`：官网和 GitHub 都能支撑真实产品；
- `front_end_shell`：网站漂亮，但 demo/static/前端壳明显；
- `repo_mismatch`：GitHub 同名撞车、404、私有或不匹配；
- `short_lived_launch`：发射台/社交资产，有热度但产品证据弱；
- `promising_but_unproven`：有一些证据，但产品闭环还没证明。

以后报告会更像这样判断：这个项目更接近 Gitbank 这种 build 证据，还是 Tessera 这种前端壳/证据断层。

### X / Twitter 证据

Base 项目判断里，X 很多时候比官网更关键。

配置 X API 后，它会搜索 CA、项目名、symbol、官网域名、官方 handle，并判断：

- 官方账号是否直接认领；
- dev 有没有持续发声；
- 高粉账号有没有讨论；
- 传播是自然扩散，还是低质量同名噪音；
- 推文互动是否足够支撑叙事热度。

没有 X API 时不会报错，只会在报告里标记 `missing_api`，继续使用已发现的 X 链接。

### 叙事参考

它会把项目归类到几个 Base 常见叙事里，但叙事只作为参考，不再压过产品证据：

- AI Agent；
- Developer Tool；
- Automation Workflow；
- Farcaster / Social Asset；
- Content / Creator Economy；
- Trading / Finance Tool；
- Infra / API / Data。

一个叙事是否值得继续看，取决于三件事：一句话能不能讲懂，是不是 Base 用户熟悉的玩法，以及官网、GitHub、X、发射平台证据能不能支撑这个故事。

如果官网像模板壳、GitHub 不认领、X 没有持续发声，就算叙事很性感，也只能算弱观察。

### 产品式 rug 风险

Base 上很多风险不是传统土狗式 rug，而是产品式包装。

常见类型：

- `story_shell`：概念很强但产品证据很薄；
- `dev_silent`：dev 不认领、不互动、不更新；
- `fake_product`：有官网/白皮书，但没有可用产品；
- `repo_mismatch`：GitHub 和 token 叙事不一致；
- `launchpad_noise`：发射台批量噪音；
- `liquidity_exit_risk`：流动性不足，退出困难。

## 6. Auto / Quick / Deep 三种模式

### Auto 模式

最推荐的日常入口，只给 CA 就能跑：

```bash
npm run base:dd:auto -- 0xTokenAddress
```

它会自动完成：

```text
CA → DEX Screener / OKX / Basescan / GitHub Search 自动发现 → 尽调 → 纯文字报告
```

### Quick 模式

适合日常快速丢 CA。

它会快速抓链上基础、官网、GitHub 和用户提供的项目线索，给出第一轮判断。

适合问：

- “这个 CA 是干啥的？”
- “这个 Agent 看着真实吗？”
- “这个 GitHub 能信吗？”
- “这个项目值不值得继续看？”

### Deep 模式

适合准备发内容、重点研究、或者项目已经有热度时使用。

Deep 模式会额外检索外部新闻、生态资料、KOL 讨论、同叙事案例和镜像页面。

建议配置 `TAVILY_API_KEY`、`BRAVE_API_KEY` 或 `SERPAPI_KEY`，否则外部搜索会比较慢。

### Grok 模式

如果你配置了 `XAI_API_KEY`，可以运行：

```bash
npm run base:grok -- 0xTokenAddress --website https://example.xyz --twitter https://x.com/project --github https://github.com/project/repo --market-cap "$1.2M"
```

这个模式会让 Grok 调用 Web Search 和 X Search，按照更接近人工投研的结构判断：产品形态、机制类型、是否有飞轮、机制不可替代性、团队和 dev 背景、历史风险、是否有知名实体互动，以及结合当前市值后的最终评分和未来预期。

它适合已经通过第一轮筛查、值得认真研究的项目。日常快速判断仍然建议先用 Auto 或 Quick。

## 7. 结论等级怎么理解

| 等级 | 含义 |
|---|---|
| `strong_watch` | 链上基础、官网证据、GitHub 证据和 X 认领相对完整，值得重点观察。 |
| `watch` | 有一定产品证据和链上基础，但仍需要 dev/X/GitHub 或真实使用继续确认。 |
| `weak_watch` | 有叙事或热度线索，但产品证据不足，适合放入 watchlist，不适合盲冲。 |
| `avoid` | 关键证据不足或风险过高，更像噪音、包装或发射台批量项目。 |

这里的 watch 是研究优先级，不是交易建议。

## 8. 适合什么人用

- Base 链扫新项目的人；
- 喜欢研究 Agent / devtool / creator / Farcaster 叙事的人；
- 经常被官网、GitHub、AI 产品文案唬住的人；
- 想快速区分“真实 builder”和“产品式包装”的人；
- 需要把 Base 项目做成 watchlist 的内容创作者或研究员。

## 9. 不适合什么用途

- 不适合当自动交易工具；
- 不适合把 `watch` 当买入信号；
- 不适合替代人工判断；
- 不适合判断非 Base 链普通 token；
- 不适合在没有任何输入线索时幻想项目价值。

## 10. 产品定位

Base 项目证据雷达不是“帮你找到百倍币”的工具。

它更像一个第一轮过滤器：先帮你省掉那些明显信息不完整、GitHub 不认领、官网像壳、叙事靠堆词的项目。

它的价值不是让你变聪明，而是让你少被最基础的包装骗。

## 11. 推文标题备选

1. 连 GitHub 都能造假的时代，Base 项目到底还怎么看？
2. 现在最危险的不是土狗，是看起来像真产品的土狗
3. 我做了个 Skill，专门拆 Base 上那些“像真项目”的 Agent
4. 你以为自己在投 AI Agent，其实可能只是投了个 landing page
5. Base 上最该防的不是没官网，而是官网太像真的
6. 一个 CA、一个官网、一个 GitHub，就想让我相信你是项目？
7. 这届 Base 项目，最会涨的可能不是产品，是包装能力
8. 我不怕 Base 上项目多，我怕每个都长得像真的
9. 谁认领？谁更新？谁在 build？别再只看一个 GitHub 了
10. 别问这个 Agent 值不值钱，先问它到底是不是个 Agent

## 12. 可直接发的产品介绍短版

Base 上现在最折磨人的不是没项目，而是项目都长得太像真的。

一个 CA，一个官网，一个 GitHub，再配几句 Agent / workflow / autonomous / API，很多人就开始脑补。

所以我手搓了一个 Base 项目证据雷达 Skill。

你把 CA、官网、GitHub、X，甚至一段项目文案喂给它，它会帮你做第一轮判断：

- 项目是谁；
- 从哪里发射；
- 官网有没有产品痕迹；
- GitHub 是显式关联还是同名撞车；
- dev 有没有认领；
- 叙事属于 AI Agent、devtool、Farcaster、creator 还是纯包装；
- 最后给出 strong_watch / watch / weak_watch / avoid。

它不负责喊单，也不负责替你冲。

它只负责把“我看不懂”拆成一张证据表。

初版比较粗糙，如果 Base 继续热，我会持续把好玩的 Agent、devtool、Virtuals、Clanker、Flaunch 案例补进资料库里。

球球不冲了，球球现在先学会问一句：

这个项目到底是真的在 build，还是只是 GitHub 看起来很努力？

## 13. 免责声明

这个 Skill 是球球自己写着玩儿的 1.0 版本。

它不是投资建议，不是买卖信号，也不是安全审计。它只是提供一个判断 Base 产品型 token 的思路：把 CA、官网、GitHub、X、项目文案这些线索拆开看，尽量少被漂亮官网和 AI 文案糊弄。

`strong_watch / watch / weak_watch / avoid` 只是研究优先级，不是交易指令。

欢迎自己魔改：你可以换评分规则、换叙事分类、接自己的搜索 API、接自己的地址库、加截图、加 X 数据源，甚至把它改成完全不同链上的项目侦察器。

反正 DYOR，钱包是自己的，亏了别找球球。

另外再说一句：球球从不发币，也不会接受别人打币、发币、挂名站台。写这个 Skill 纯粹是为了把自己踩过的坑整理出来，顺便涨点粉丝、涨点流量。如果你觉得有用，就多多点赞互动一下吧，粉丝只有 2000 多，实在太丢人了。
