import fs from "node:fs";
import { spawnSync } from "node:child_process";

const OUT_DIR = process.env.BASE_DISCOVER_OUT_DIR || "data/base_project_discovery";
const USER_AGENT = "Mozilla/5.0 (compatible; BaseProjectDiscover/0.1)";
const BASE_CHAIN_ID = "base";
const BASE_CHAIN_INDEX = "8453";

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

function first(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function num(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
}

function domainFromUrl(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

async function fetchJson(url, timeout = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "application/json,text/plain,*/*" }
    });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, url: res.url, data: JSON.parse(text), text };
    } catch {
      return { ok: false, status: res.status, url: res.url, error: "JSON parse failed", text: text.slice(0, 1000) };
    }
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function runJson(args, timeout = 30_000) {
  const run = spawnSync("onchainos", args, { encoding: "utf8", timeout });
  if (run.status !== 0) return { ok: false, error: (run.stderr || run.stdout || "").trim() };
  try {
    const parsed = JSON.parse(run.stdout || "{}");
    return { ok: true, data: parsed.data ?? parsed };
  } catch (error) {
    return { ok: false, error: `parse error: ${error.message}`, raw: run.stdout };
  }
}

function flattenRows(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenRows);
  if (Array.isArray(value.data)) return flattenRows(value.data);
  if (Array.isArray(value.list)) return flattenRows(value.list);
  if (Array.isArray(value.rows)) return flattenRows(value.rows);
  if (Array.isArray(value.items)) return flattenRows(value.items);
  return typeof value === "object" ? [value] : [];
}

function extractReportParts(report) {
  const obj = report || {};
  const pickFirst = (value) => Array.isArray(value) ? (value[0] || {}) : (value || {});
  return {
    info: pickFirst(obj.info || obj.tokenInfo || obj.basicInfo),
    priceInfo: pickFirst(obj.priceInfo || obj.price || obj.market),
    advanced: pickFirst(obj.advancedInfo || obj.advanced),
    security: pickFirst(obj.security || obj.securityScan || obj.tokenScan || obj.scan)
  };
}

function tokenFromOkxReport(data, address) {
  const report = extractReportParts(data);
  return {
    address: address.toLowerCase(),
    name: first(report.info.name, report.info.tokenName, report.priceInfo.name, report.priceInfo.tokenName),
    symbol: first(report.info.symbol, report.info.tokenSymbol, report.priceInfo.symbol, report.priceInfo.tokenSymbol),
    creator: first(report.advanced.creatorAddress, report.advanced.creator, report.advanced.devAddress),
    protocol: first(report.advanced.protocolId, report.advanced.protocol, report.advanced.platform),
    riskLevel: first(report.security.riskLevel, report.security.risk_level, report.security.level),
    rawAdvanced: report.advanced
  };
}

function collectDexLinks(pair) {
  const info = pair?.info || {};
  const websites = (info.websites || []).map((row) => ({
    label: row.label || "Website",
    url: normalizeUrl(row.url)
  })).filter((row) => row.url);
  const socials = (info.socials || []).map((row) => ({
    type: row.type || "",
    url: normalizeUrl(row.url)
  })).filter((row) => row.url);
  const github = uniq([
    ...websites.filter((row) => /github/i.test(`${row.label} ${row.url}`)).map((row) => row.url),
    ...socials.filter((row) => /github\.com/i.test(row.url)).map((row) => row.url)
  ]);
  const twitter = uniq(socials.filter((row) => /(twitter|x\.com|twitter\.com)/i.test(`${row.type} ${row.url}`)).map((row) => row.url));
  const telegram = uniq(socials.filter((row) => /(telegram|t\.me)/i.test(`${row.type} ${row.url}`)).map((row) => row.url));
  const discord = uniq(socials.filter((row) => /discord/i.test(`${row.type} ${row.url}`)).map((row) => row.url));
  const website = websites.find((row) => !/github|docs/i.test(`${row.label} ${row.url}`))?.url || "";
  const docs = uniq(websites.filter((row) => /docs|gitbook|readme/i.test(`${row.label} ${row.url}`)).map((row) => row.url));
  return { website, websites, docs, twitter, github, telegram, discord, socials };
}

async function discoverDexScreener(address, tokenHints = {}) {
  const exact = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
  let pairs = flattenRows(exact.data?.pairs).filter((pair) => String(pair.chainId).toLowerCase() === BASE_CHAIN_ID);
  if (!pairs.length) {
    const query = [tokenHints.name, tokenHints.symbol, address].filter(Boolean).join(" ");
    if (query.trim()) {
      const searched = await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
      pairs = flattenRows(searched.data?.pairs).filter((pair) => {
        const base = String(pair.baseToken?.address || "").toLowerCase();
        const quote = String(pair.quoteToken?.address || "").toLowerCase();
        return String(pair.chainId).toLowerCase() === BASE_CHAIN_ID && (base === address.toLowerCase() || quote === address.toLowerCase());
      });
    }
  }
  pairs.sort((a, b) => num(b.liquidity?.usd) - num(a.liquidity?.usd));
  const best = pairs[0] || null;
  const tokenSide = best
    ? (String(best.baseToken?.address || "").toLowerCase() === address.toLowerCase() ? best.baseToken : best.quoteToken)
    : {};
  return {
    ok: Boolean(best),
    source: "DEX Screener",
    pairCount: pairs.length,
    bestPair: best ? {
      url: best.url,
      dexId: best.dexId,
      pairAddress: best.pairAddress,
      labels: best.labels || [],
      tokenName: tokenSide?.name || "",
      tokenSymbol: tokenSide?.symbol || "",
      marketCap: num(best.marketCap),
      fdv: num(best.fdv),
      liquidityUsd: num(best.liquidity?.usd),
      priceUsd: first(best.priceUsd),
      volume24h: num(best.volume?.h24),
      priceChange24h: num(best.priceChange?.h24),
      pairCreatedAt: best.pairCreatedAt || ""
    } : null,
    links: best ? collectDexLinks(best) : { website: "", websites: [], docs: [], twitter: [], github: [], telegram: [], discord: [], socials: [] }
  };
}

async function discoverBasescan(address, creatorHint = "") {
  const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
  let creation = null;
  if (apiKey) {
    const url = `https://api.etherscan.io/v2/api?chainid=${BASE_CHAIN_INDEX}&module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetchJson(url);
    const row = Array.isArray(res.data?.result) ? res.data.result[0] : null;
    if (row && typeof row === "object") {
      creation = {
        contractCreator: first(row.contractCreator, row.creator, row.from),
        txHash: first(row.txHash, row.hash)
      };
    }
  }
  return {
    ok: Boolean(creation?.contractCreator || creatorHint),
    source: "Basescan",
    contractUrl: `https://basescan.org/address/${address}`,
    creator: first(creation?.contractCreator, creatorHint),
    creationTx: creation?.txHash || "",
    note: creation?.contractCreator
      ? "Basescan/Etherscan v2 contract creation checked."
      : creatorHint
        ? "Creator filled from OKX advanced-info; set BASESCAN_API_KEY or ETHERSCAN_API_KEY for independent contract creation lookup."
        : "Set BASESCAN_API_KEY or ETHERSCAN_API_KEY for contract creation lookup."
  };
}

async function searchGithubCandidates({ name, symbol, website, explicitGithub = [] }) {
  const queries = uniq([
    ...explicitGithub,
    name,
    symbol && symbol !== name ? symbol : "",
    domainFromUrl(website).replace(/\.[a-z]+$/i, "")
  ]).filter((q) => q && q.length >= 2);
  const candidates = [];
  for (const query of queries.slice(0, 4)) {
    if (/github\.com/i.test(query)) {
      const match = query.match(/github\.com\/([^/\s?#]+)(?:\/([^/\s?#]+))?/i);
      if (match) candidates.push({
        sourceQuery: query,
        full_name: match[2] ? `${match[1]}/${match[2].replace(/\.git$/i, "")}` : match[1],
        html_url: normalizeUrl(query),
        explicit: true
      });
      continue;
    }
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+in:name,description&sort=updated&order=desc&per_page=5`;
    const res = await fetchJson(url);
    for (const repo of res.data?.items || []) {
      candidates.push({
        sourceQuery: query,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        pushed_at: repo.pushed_at,
        explicit: false
      });
    }
  }
  const seen = new Set();
  return candidates.filter((row) => {
    const key = String(row.html_url || row.full_name).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function formatDiscoveryNotes(discovery) {
  const p = discovery.project || {};
  const parts = [];
  parts.push(`Auto-discovered project info for ${discovery.address}`);
  if (p.name || p.symbol) parts.push(`Token: ${p.name || "UNKNOWN"} (${p.symbol || "UNKNOWN"})`);
  if (p.website) parts.push(`Website: ${p.website}`);
  if (p.twitter?.length) parts.push(`X/Twitter: ${p.twitter.join(", ")}`);
  if (p.github?.length) parts.push(`GitHub: ${p.github.join(", ")}`);
  if (p.docs?.length) parts.push(`Docs: ${p.docs.join(", ")}`);
  if (p.telegram?.length) parts.push(`Telegram: ${p.telegram.join(", ")}`);
  if (p.discord?.length) parts.push(`Discord: ${p.discord.join(", ")}`);
  if (p.creator) parts.push(`Creator: ${p.creator}`);
  if (p.protocol) parts.push(`Protocol: ${p.protocol}`);
  if (discovery.dex?.bestPair) {
    const pair = discovery.dex.bestPair;
    parts.push(`DEX Screener: mcap=${pair.marketCap || "n/a"}, liquidity=${pair.liquidityUsd || "n/a"}, volume24h=${pair.volume24h || "n/a"}, pair=${pair.url || ""}`);
  }
  if (discovery.githubCandidates?.length) {
    parts.push(`GitHub search candidates: ${discovery.githubCandidates.slice(0, 5).map((r) => r.full_name || domainFromUrl(r.html_url)).join(", ")}`);
  }
  return parts.join("\n");
}

export async function discoverProject(address) {
  const tokenAddress = String(address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(tokenAddress)) throw new Error("Base CA required");
  const okxRes = runJson(["token", "report", "--address", tokenAddress, "--chain", "base"], 30_000);
  const okxToken = okxRes.ok ? tokenFromOkxReport(okxRes.data, tokenAddress) : { address: tokenAddress };
  const dex = await discoverDexScreener(tokenAddress, okxToken);
  const dexToken = dex.bestPair || {};
  const links = dex.links || {};
  const name = first(okxToken.name, dexToken.tokenName);
  const symbol = first(okxToken.symbol, dexToken.tokenSymbol);
  const basescan = await discoverBasescan(tokenAddress, okxToken.creator);
  const githubCandidates = await searchGithubCandidates({
    name,
    symbol,
    website: links.website,
    explicitGithub: links.github || []
  });
  const project = {
    name,
    symbol,
    website: links.website || "",
    docs: links.docs || [],
    twitter: links.twitter || [],
    github: uniq([...(links.github || []), ...githubCandidates.filter((row) => row.explicit).map((row) => row.html_url)]),
    telegram: links.telegram || [],
    discord: links.discord || [],
    creator: first(basescan.creator, okxToken.creator),
    protocol: okxToken.protocol || "",
    riskLevel: okxToken.riskLevel || "",
    marketCap: dexToken.marketCap || 0,
    liquidityUsd: dexToken.liquidityUsd || 0,
    priceUsd: dexToken.priceUsd || "",
    volume24h: dexToken.volume24h || 0
  };
  const discovery = {
    generatedAt: new Date().toISOString(),
    address: tokenAddress,
    project,
    dex,
    okx: { ok: okxRes.ok, token: okxToken, error: okxRes.error || "" },
    basescan,
    githubCandidates,
    notes: ""
  };
  discovery.notes = formatDiscoveryNotes(discovery);
  return discovery;
}

export function formatDiscoveryText(discovery) {
  const p = discovery.project || {};
  const lines = [];
  lines.push("Base 项目信息自动发现");
  lines.push("");
  lines.push(`合约：${discovery.address}`);
  lines.push(`项目：${p.name || "UNKNOWN"} (${p.symbol || "UNKNOWN"})`);
  lines.push(`官网：${p.website || "未发现"}`);
  lines.push(`X/Twitter：${p.twitter?.join(", ") || "未发现"}`);
  lines.push(`GitHub：${p.github?.join(", ") || "未发现"}`);
  lines.push(`Docs：${p.docs?.join(", ") || "未发现"}`);
  lines.push(`Telegram：${p.telegram?.join(", ") || "未发现"}`);
  lines.push(`Discord：${p.discord?.join(", ") || "未发现"}`);
  lines.push(`Creator：${p.creator || "未发现"}`);
  lines.push(`Protocol：${p.protocol || "未发现"}`);
  lines.push(`市值/流动性/24h成交量：$${Math.round(p.marketCap || 0)} / $${Math.round(p.liquidityUsd || 0)} / $${Math.round(p.volume24h || 0)}`);
  lines.push("");
  lines.push("来源命中");
  lines.push(`DEX Screener：${discovery.dex?.ok ? "命中" : "未命中"}${discovery.dex?.bestPair?.url ? `，${discovery.dex.bestPair.url}` : ""}`);
  lines.push(`OKX OnchainOS：${discovery.okx?.ok ? "命中" : "未命中"}`);
  lines.push(`Basescan：${discovery.basescan?.ok ? "命中" : "未命中"}；${discovery.basescan?.note || ""}`);
  lines.push(`GitHub Search：${discovery.githubCandidates?.length || 0} 个候选`);
  if (discovery.githubCandidates?.length) {
    for (const repo of discovery.githubCandidates.slice(0, 5)) {
      lines.push(`- ${repo.html_url || repo.full_name}${repo.explicit ? "（显式链接）" : ""}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const address = process.argv.find((arg) => /^0x[a-fA-F0-9]{40}$/.test(arg));
  if (!address) {
    console.error("Usage: node scripts/base_project_discover.mjs <base_token_ca>");
    process.exit(1);
  }
  const discovery = await discoverProject(address);
  const base = `${OUT_DIR}/${address.toLowerCase()}`;
  const text = formatDiscoveryText(discovery);
  fs.writeFileSync(`${base}.json`, JSON.stringify(discovery, null, 2));
  fs.writeFileSync(`${base}.txt`, text);
  console.log(text);
  console.log(`\nSaved:\n- ${base}.json\n- ${base}.txt`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
