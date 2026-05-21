# Base Evidence Radar: Check Website and GitHub Before You Buy the Story

🌐 Language: [中文](./product-introduction.zh.md) | [English](./product-introduction.en.md)

🏠 Home: [中文 README](../README.md) | [English README](../README.en.md)

![Base Evidence Radar Workflow](../assets/base-radar-flow.svg)

## 1. One-Line Intro

Base Evidence Radar is a due diligence Skill for quickly judging Base product tokens.

You can give it a CA, website, GitHub repo, X/Twitter link, or even a short project description. It automatically organizes on-chain basics, website product evidence, GitHub evidence, X claim signals, case comparisons, and product-rug risks, then outputs an objective `strong_watch / watch / weak_watch / avoid` verdict.

Plain version: it does not help you ape in, and it does not shill a narrative. It first helps you decide whether the project looks like a real product and whether it deserves more research.

## 2. Install and Dependencies

One-line install:

```bash
git clone https://github.com/qiuqiubuchongle-cloud/base-narrative-radar.git && cd base-narrative-radar && npm test
```

For full functionality, install and verify OKX OnchainOS CLI:

```bash
npx skills add okx/onchainos-skills --yes --global
onchainos wallet status
```

Required:

- Node.js 18+: runs the scripts.
- OKX OnchainOS CLI: reads token reports, risk scans, creator, protocol, on-chain price, and liquidity.

Automatically used data sources:

- DEX Screener: discovers website, X, GitHub, docs, market cap, and liquidity.
- GitHub Search: searches same-name repos and organization repos.

Optional enhancements:

- `BASESCAN_API_KEY` or `ETHERSCAN_API_KEY`: independently verify contract creator.
- `TAVILY_API_KEY` / `BRAVE_API_KEY` / `SERPAPI_KEY`: Deep-mode news, ecosystem references, and similar narrative cases.
- `TWITTER_BEARER_TOKEN` or `X_BEARER_TOKEN`: X/Twitter official claims, KOL discussion, and same-name noise.
- `XAI_API_KEY`: use Grok/xAI Web Search + X Search for mechanism, team, entity-interaction, and valuation research.

Without OnchainOS, `npm run base:discover -- 0xCA` can still discover partial information. The full due diligence report will miss OKX on-chain evidence.

## 3. What Problem Does It Solve?

Base is no longer a pure meme-token environment. More and more opportunities appear wearing a product costume.

What does this Agent do? Is the GitHub real or just a same-name collision? Does the website have an actual product, or only a landing page? Did the dev publicly claim the token? Is the project just copying a hot narrative? Does the narrative have any Base-native value?

Sharp players can often judge these things in minutes. Most people spend too much time just collecting links.

The harder part: AI has made product-looking surfaces cheap.

- Websites can be generated quickly.
- GitHub repos can be assembled quickly.
- Project copy can sound like a real startup.
- A demo can be only a teaser.
- One X post saying “full MVP live” can be enough for the market to imagine the rest.

Base Evidence Radar does not predict price. It does not assign a high score to a narrative and call it alpha. It breaks “hard to tell” into evidence modules: does the website show product behavior, is the GitHub officially linked, does the repo contain a real code structure, and is there clear X recognition or ongoing updates?

## 4. Supported Inputs

It supports:

- Base token CA
- Project website
- X/Twitter link
- GitHub repo / organization / user link
- Project intro, tweet text, whitepaper fragment, or dev copy
- Clanker / Virtuals / Zora / Flaunch / Base App project clues

The lightest use case only needs a CA. More input makes the judgment more stable.

## 5. What Does It Output?

![Report Card Example](../assets/base-report-card.svg)

The report is split into modules.

### CA Identity

Identifies token name, symbol, market cap, liquidity, holders, risk level, creator, and protocol clues.

### Launch Surface

Judges whether the project looks like it came from Clanker, Virtuals, Zora, Flaunch, Base App, or an unknown source.

Different platforms require different reads. Clanker depends more on dev claim and social flow. Virtuals depends more on whether the Agent has an API, demo, revenue, and ecosystem usage. Zora is more content / creator driven. Flaunch depends more on whether the mechanism creates real demand.

### Website Product Evidence

A pretty website is not proof.

It checks whether the site is accessible, whether there is enough content, whether API/form/auth/dashboard/connect-wallet/app-route signals exist, whether the demo is real or simulated / teaser, and whether the site is only a template shell, coming soon page, or generic launchpad page.

### GitHub Product Evidence

It separates:

- website or X explicitly linking to GitHub
- recently updated GitHub repos
- repo components such as app / contracts / sdk / cli / docs / API / server / playground
- coherent product map under the same owner
- project-name and narrative match
- same-name search results only
- stale, archived, or irrelevant repos

Same-name GitHub is weak evidence. Explicit linkage is strong evidence.

### Base Agent Case Library

The repo includes an evidence-first case library:

```text
references/base-agent-evidence-cases.json
```

It classifies projects roughly as:

- `real_build`: website and GitHub support a real product.
- `front_end_shell`: polished site, but demo/static/frontend-shell signals are obvious.
- `repo_mismatch`: GitHub same-name collision, 404, private repo, or mismatch.
- `short_lived_launch`: launchpad/social token with hype but weak product evidence.
- `promising_but_unproven`: some evidence exists, but the product loop is not proven.

The report aims to answer whether a project is closer to a real build case or closer to a polished shell with evidence gaps.

### X / Twitter Evidence

For Base project judgment, X is often more important than the website.

When X API is configured, it searches CA, project name, symbol, website domain, and official handle, then checks:

- whether the official account directly claimed the project
- whether the dev is still posting
- whether high-follower accounts discussed it
- whether the spread looks organic or like low-quality same-name noise
- whether engagement supports the narrative heat

Without X API, the report marks `missing_api` and continues with discovered X links.

### Narrative Reference

It classifies projects into common Base narratives, but narrative is only a reference layer:

- AI Agent
- Developer Tool
- Automation Workflow
- Farcaster / Social Asset
- Content / Creator Economy
- Trading / Finance Tool
- Infra / API / Data

A narrative is worth further research only when it can be explained in one sentence, fits a familiar Base-native pattern, and is supported by website, GitHub, X, and launch-surface evidence.

If the website looks like a template shell, GitHub is unclaimed, and X is quiet, even a sexy narrative should remain weak-watch.

### Product-Rug Risk

Many Base risks are product-shaped packaging rather than traditional meme rugs.

Common types:

- `story_shell`: strong concept, weak product evidence
- `dev_silent`: dev does not claim, interact, or update
- `fake_product`: website or whitepaper exists, usable product does not
- `repo_mismatch`: GitHub and token story do not match
- `launchpad_noise`: batch launchpad noise
- `liquidity_exit_risk`: thin liquidity, hard exit

## 6. Auto / Quick / Deep

### Auto Mode

Recommended daily entry point:

```bash
npm run base:dd:auto -- 0xTokenAddress
```

It runs:

```text
CA -> DEX Screener / OKX / Basescan / GitHub Search discovery -> due diligence -> plain-text report
```

### Quick Mode

Best for fast daily CA checks.

It quickly gathers on-chain basics, website, GitHub, and user-provided clues to output a first read.

Use it for:

- “What is this CA?”
- “Does this Agent look real?”
- “Can I trust this GitHub?”
- “Is this project worth further research?”

### Deep Mode

Use Deep mode when preparing content, studying a focused project, or researching a project with existing heat.

Deep mode additionally searches external news, ecosystem references, KOL discussion, similar narrative cases, and mirror pages.

It works best with `TAVILY_API_KEY`, `BRAVE_API_KEY`, or `SERPAPI_KEY`; otherwise external search can be slow or sparse.

### Grok Mode

If `XAI_API_KEY` is configured, run:

```bash
npm run base:grok -- 0xTokenAddress --website https://example.xyz --twitter https://x.com/project --github https://github.com/project/repo --market-cap "$1.2M"
```

This mode asks Grok to use Web Search and X Search, then produce a more investment-research-like report: product form, mechanism type, flywheel, irreplaceability, team and dev background, historical risk, known-entity interaction, and a market-cap-adjusted score and expectation.

Use it after the first-pass filter finds something worth deeper research. For daily fast checks, start with Auto or Quick.

## 7. Verdict Levels

| Verdict | Meaning |
|---|---|
| `strong_watch` | On-chain basics, website evidence, GitHub evidence, and X claim signals are relatively complete. Worth focused observation. |
| `watch` | Some product evidence and on-chain baseline exist, but dev/X/GitHub or real usage still needs confirmation. |
| `weak_watch` | Narrative or hype exists, but product evidence is weak. Suitable for watchlist, not blind aping. |
| `avoid` | Key evidence is missing or risk is high. More likely noise, packaging, or launchpad batch output. |

`watch` is research priority, not trading advice.

## 8. Who Should Use It?

- Base project hunters
- Agent / devtool / creator / Farcaster narrative researchers
- People often fooled by websites, GitHub repos, and AI product copy
- Users trying to distinguish real builders from product-shaped packaging
- Content creators or researchers building Base watchlists

## 9. What It Is Not For

- Not an auto-trading tool
- Not a buy signal
- Not a substitute for human judgment
- Not designed for non-Base generic token analysis
- Not useful when there are no project clues at all

## 10. Product Positioning

Base Evidence Radar is not a “find me a 100x token” tool.

It is a first-pass filter. It helps you save time by removing projects with incomplete information, unclaimed GitHub repos, shell-like websites, and keyword-stuffed narratives.

Its value is not making you smarter. Its value is helping you avoid the most basic packaging traps.

## 11. Disclaimer

This Skill is a 1.0 version built by Qiuqiu for fun.

It is not investment advice, not a buy/sell signal, and not a security audit. It only provides a way to inspect Base product tokens by separating CA, website, GitHub, X, and project-copy evidence.

`strong_watch / watch / weak_watch / avoid` are research-priority labels, not trading instructions.

Feel free to fork and modify it: scoring rules, narrative categories, search APIs, address databases, screenshot modules, X data source, or even the target chain.

DYOR. Your wallet is yours.

One more thing: Qiuqiu does not launch coins, accept paid token promotion, or lend his name to projects. This Skill was built to document lessons from past mistakes, and maybe gain a few followers and some traffic. If it helps, please like and interact. Having only 2,000+ followers is honestly a little embarrassing.
