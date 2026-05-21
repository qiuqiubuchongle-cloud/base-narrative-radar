import fs from "node:fs";
import { discoverProject } from "./base_project_discover.mjs";

const OUT_DIR = process.env.BASE_XAI_OUT_DIR || "data/xai-research";
const XAI_ENDPOINT = process.env.XAI_RESPONSES_URL || "https://api.x.ai/v1/responses";
const DEFAULT_MODEL = process.env.XAI_MODEL || "grok-4.3";

fs.mkdirSync(OUT_DIR, { recursive: true });

function normalizeUrl(url) {
  if (!url) return "";
  const clean = String(url).trim().split(/\\[nrt]|[\s"'<>]/)[0].replace(/[)\].,，。:：]+$/g, "");
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(clean)) return `https://${clean}`;
  return "";
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseArgs(argv) {
  const args = {
    tokenAddress: "",
    website: "",
    twitter: "",
    github: "",
    notes: "",
    language: process.env.BASE_XAI_LANGUAGE || "zh",
    marketCap: "",
    autoDiscover: process.env.BASE_XAI_AUTO_DISCOVER !== "0",
    model: DEFAULT_MODEL
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (/^0x[a-fA-F0-9]{40}$/.test(arg)) args.tokenAddress = arg;
    else if (arg === "--website") args.website = normalizeUrl(argv[++i]);
    else if (arg === "--twitter" || arg === "--x") args.twitter = normalizeUrl(argv[++i]);
    else if (arg === "--github") args.github = normalizeUrl(argv[++i]);
    else if (arg === "--notes") args.notes = String(argv[++i] || "");
    else if (arg === "--language" || arg === "--lang") args.language = String(argv[++i] || "zh").toLowerCase();
    else if (arg === "--market-cap" || arg === "--mcap") args.marketCap = String(argv[++i] || "");
    else if (arg === "--model") args.model = String(argv[++i] || DEFAULT_MODEL);
    else if (arg === "--no-auto-discover") args.autoDiscover = false;
    else if (arg === "--auto-discover") args.autoDiscover = true;
  }
  if (!["zh", "en", "both"].includes(args.language)) args.language = "zh";
  return args;
}

async function enrichArgs(args) {
  if (!args.autoDiscover || !args.tokenAddress) return { args, discovery: null };
  try {
    const discovery = await discoverProject(args.tokenAddress);
    const project = discovery.project || {};
    return {
      args: {
        ...args,
        website: args.website || project.website || "",
        twitter: args.twitter || project.twitter?.[0] || "",
        github: args.github || project.github?.[0] || "",
        notes: [args.notes, discovery.notes].filter(Boolean).join("\n\n")
      },
      discovery
    };
  } catch (error) {
    return {
      args: {
        ...args,
        notes: [args.notes, `Auto-discovery failed: ${error.message || String(error)}`].filter(Boolean).join("\n\n")
      },
      discovery: null
    };
  }
}

function buildResearchPrompt(args, discovery) {
  const languageGuide = {
    zh: "请用中文输出，语气清晰、直接、适合 Web3 产品尽调报告。",
    en: "Please write in English, concise and suitable for a Web3 product due-diligence report.",
    both: "请先输出中文报告，再输出 English summary."
  }[args.language];

  const project = discovery?.project || {};
  const discoveredLinks = {
    website: project.website || "",
    twitter: project.twitter || [],
    github: project.github || [],
    docs: project.docs || [],
    telegram: project.telegram || [],
    discord: project.discord || []
  };

  return [
    "You are a strict Base-chain product due-diligence researcher.",
    "Your job is not to shill, not to predict price mechanically, and not to invent missing facts.",
    "Use web_search and x_search to verify public evidence. Prefer official websites, GitHub, X posts, docs, launchpad pages, reputable news, and known entity accounts.",
    "If evidence is missing, say it is missing. Mark all uncertain statements as assumptions.",
    languageGuide,
    "",
    "Input:",
    `- Chain: Base`,
    `- Contract address: ${args.tokenAddress}`,
    `- Website: ${args.website || discoveredLinks.website || "unknown"}`,
    `- X/Twitter: ${args.twitter || discoveredLinks.twitter.join(", ") || "unknown"}`,
    `- GitHub: ${args.github || discoveredLinks.github.join(", ") || "unknown"}`,
    `- Market cap: ${args.marketCap || project.marketCap || "unknown"}`,
    `- Discovered links: ${JSON.stringify(discoveredLinks, null, 2)}`,
    `- User notes: ${args.notes || "none"}`,
    "",
    "Research requirements:",
    "1. Product form: what is the product, who uses it, and what problem does it solve?",
    "2. Mechanism type: classify the mechanism. Is it new, copied, forked, or only a narrative wrapper?",
    "3. Flywheel: explain whether there is a real growth / revenue / usage / token-value flywheel.",
    "4. Irreplaceability: explain whether the mechanism is hard to replace, or whether competitors can copy it quickly.",
    "5. Team and dev background: search historical roles, prior projects, GitHub activity, X identity, and any reputation risk.",
    "6. Known-entity interaction: check whether known builders, funds, protocols, or ecosystem accounts interacted with it. Separate real interaction from low-quality mentions.",
    "7. Historical risk: look for old rugs, abandoned repos, fake links, suspicious rebrands, same-name collisions, and contract/platform risk.",
    "8. Market-cap-adjusted expectation: based on current market cap if available, explain what the project needs to justify the valuation.",
    "",
    "Scoring rubric, total 100:",
    "- Product clarity and real usage: 20",
    "- Mechanism / innovation / flywheel: 20",
    "- Website and GitHub evidence: 20",
    "- Team / dev credibility: 15",
    "- Known-entity interaction and community quality: 10",
    "- Risk control and valuation reasonableness: 15",
    "",
    "Output format:",
    "A. One-line conclusion",
    "B. Final score /100 and verdict: strong_watch | watch | weak_watch | avoid",
    "C. Evidence table with sections: product form, mechanism, flywheel, irreplaceability, team/dev, entity interaction, market-cap expectation, risk",
    "D. Source links and what each source proves",
    "E. Missing evidence checklist",
    "F. What would change the score upward or downward",
    "G. Not investment advice disclaimer"
  ].join("\n");
}

function extractOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      else if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callXai({ prompt, model }) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: "missing_api_key",
      error: "Set XAI_API_KEY to enable Grok/xAI research."
    };
  }

  const body = {
    model,
    input: [
      {
        role: "user",
        content: prompt
      }
    ],
    tools: [
      { type: "web_search" },
      { type: "x_search" }
    ]
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.XAI_TIMEOUT_MS || 240_000));
  try {
    const res = await fetch(XAI_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return { ok: false, status: "api_error", httpStatus: res.status, error: data?.error?.message || text, raw: data };
    }
    return {
      ok: true,
      status: "ok",
      model,
      text: extractOutputText(data),
      citations: data.citations || data.output?.flatMap((item) => item.citations || []) || [],
      raw: data
    };
  } catch (error) {
    return { ok: false, status: "request_failed", error: error.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function writeOutputs(args, result, prompt, discovery) {
  const suffix = args.tokenAddress ? args.tokenAddress.toLowerCase() : `research-${Date.now()}`;
  const base = `${OUT_DIR}/${suffix}.xai`;
  const json = {
    generatedAt: new Date().toISOString(),
    args,
    discovery,
    status: result.status,
    ok: result.ok,
    model: result.model || args.model,
    error: result.error || "",
    citations: result.citations || [],
    report: result.text || "",
    prompt
  };
  fs.writeFileSync(`${base}.json`, JSON.stringify(json, null, 2));
  const reportText = result.ok
    ? result.text || "Grok returned an empty report."
    : `Grok/xAI research skipped or failed.\nStatus: ${result.status}\nError: ${result.error || "unknown"}\n\nSet XAI_API_KEY and rerun.`;
  fs.writeFileSync(`${base}.txt`, reportText);
  return { jsonPath: `${base}.json`, textPath: `${base}.txt`, reportText };
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed.tokenAddress) {
    console.error("Usage: node scripts/base_xai_research.mjs <base_token_ca> [--website <url>] [--twitter <url>] [--github <url>] [--notes \"...\"] [--market-cap \"$1M\"] [--language zh|en|both] [--model grok-4.3]");
    process.exit(1);
  }
  const { args, discovery } = await enrichArgs(parsed);
  args.twitter = normalizeUrl(args.twitter);
  args.github = normalizeUrl(args.github);
  args.website = normalizeUrl(args.website);

  const prompt = buildResearchPrompt(args, discovery);
  const result = await callXai({ prompt, model: args.model });
  const paths = writeOutputs(args, result, prompt, discovery);

  console.log(paths.reportText);
  console.error(`\nSaved: ${paths.textPath}`);
  console.error(`Saved: ${paths.jsonPath}`);
  if (!result.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
