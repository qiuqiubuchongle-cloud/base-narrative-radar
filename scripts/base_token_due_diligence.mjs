import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { discoverProject } from "./base_project_discover.mjs";

const CONFIG_PATH = process.env.BASE_DD_CONFIG || "data/base_token_due_diligence.config.json";
const OUT_DIR = process.env.BASE_DD_OUT_DIR || "data/base_token_due_diligence";
const USER_AGENT = "Mozilla/5.0 (compatible; BaseTokenDueDiligence/0.1)";

const config = loadJson(CONFIG_PATH, {});
const chain = config.chain || "base";
const chainIndex = String(config.chainIndex || "8453");
fs.mkdirSync(OUT_DIR, { recursive: true });

function loadJson(path, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
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

async function fetchText(url, timeout = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5" }
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") || "",
      server: res.headers.get("server") || "",
      text: text.slice(0, 2_000_000)
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error), text: "" };
  } finally {
    clearTimeout(timer);
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

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeUrl(url) {
  if (!url) return "";
  const clean = String(url).trim().split(/\\[nrt]|[\s"'<>]/)[0].replace(/[)\].,，。:：]+$/g, "");
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(clean)) return `https://${clean}`;
  return "";
}

function domainFromUrl(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseArgs(argv) {
  const args = {
    tokenAddress: "",
    website: "",
    twitter: "",
    github: "",
    notes: "",
    mode: process.env.BASE_DD_MODE || "quick",
    autoDiscover: process.env.BASE_DD_AUTO_DISCOVER === "1"
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (/^0x[a-fA-F0-9]{40}$/.test(arg)) args.tokenAddress = arg;
    else if (arg === "--website") args.website = normalizeUrl(argv[++i]);
    else if (arg === "--twitter" || arg === "--x") args.twitter = normalizeUrl(argv[++i]);
    else if (arg === "--github") args.github = normalizeUrl(argv[++i]);
    else if (arg === "--notes") args.notes = String(argv[++i] || "");
    else if (arg === "--mode") args.mode = String(argv[++i] || "quick").toLowerCase();
    else if (arg === "--deep") args.mode = "deep";
    else if (arg === "--quick") args.mode = "quick";
    else if (arg === "--auto-discover") args.autoDiscover = true;
    else if (arg === "--no-auto-discover") args.autoDiscover = false;
  }
  if (!["quick", "deep"].includes(args.mode)) args.mode = "quick";
  return args;
}

async function enrichArgsWithDiscovery(args) {
  if (!args.autoDiscover) return args;
  const discovery = await discoverProject(args.tokenAddress);
  const project = discovery.project || {};
  const merged = {
    ...args,
    website: args.website || project.website || "",
    twitter: args.twitter || project.twitter?.[0] || "",
    github: args.github || project.github?.[0] || "",
    notes: [args.notes, discovery.notes].filter(Boolean).join("\n\n"),
    discovery
  };
  return merged;
}

function extractUrls(value) {
  const text = JSON.stringify(value || {});
  const urls = [];
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>）)]+/gi)) urls.push(normalizeUrl(match[0]));
  return uniq(urls);
}

function classifyUrls(urls) {
  const assetLike = (u) => /\.(png|jpe?g|gif|svg|webp|ico)(\?|$|\/)/i.test(u)
    || /static\.oklink\.com|\/cdn\/|tokenLogo|default-logo|logo/i.test(u);
  const pageUrls = urls.filter((u) => !assetLike(u));
  const github = urls.filter((u) => /github\.com/i.test(u));
  const twitter = pageUrls.filter((u) => /(x\.com|twitter\.com)/i.test(u));
  const docs = pageUrls.filter((u) => /(docs\.|gitbook|readme|mirror\.xyz|notion\.site)/i.test(u));
  const website = pageUrls.find((u) => !/github\.com|x\.com|twitter\.com|t\.me|telegram|discord|docs\.|gitbook/i.test(u)) || "";
  return { website, github, twitter, docs, all: urls };
}

function textScore(text, keywords) {
  const haystack = String(text || "").toLowerCase();
  const hits = keywords.filter((kw) => haystack.includes(String(kw).toLowerCase()));
  return { hits, score: hits.length };
}

function classifyNarrative({ token, website, github, userNotes = "" }) {
  const text = [
    token.name,
    token.symbol,
    website.title,
    website.description,
    website.visibleText,
    github.repos?.map((r) => `${r.full_name} ${r.description || ""}`).join(" "),
    userNotes
  ].join(" ");
  const rows = (config.narratives || []).map((item) => ({
    name: item.name,
    ...textScore(text, item.keywords || [])
  })).filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
  return {
    primary: rows[0]?.name || "Unknown",
    matches: rows
  };
}

function detectLaunchpad({ token, urls, liquidity, advanced }) {
  const text = JSON.stringify({ token, urls, liquidity, advanced }).toLowerCase();
  const matches = (config.launchpads || []).map((item) => ({
    name: item.name,
    hits: (item.keywords || []).filter((kw) => text.includes(String(kw).toLowerCase()))
  })).filter((row) => row.hits.length);
  return {
    platform: matches[0]?.name || "Unknown",
    confidence: matches[0] ? "heuristic" : "unknown",
    matches
  };
}

function extractMeta(html) {
  const title = first(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], "").replace(/\s+/g, " ").trim();
  const description = first(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1],
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1],
    ""
  ).replace(/\s+/g, " ").trim();
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
  return { title, description, visibleText };
}

function websiteBackendSignals(html) {
  const apiHits = uniq([
    ...[...html.matchAll(/fetch\(["']([^"']+)/gi)].map((m) => m[1]),
    ...[...html.matchAll(/axios\.(?:get|post|put|delete)\(["']([^"']+)/gi)].map((m) => m[1]),
    ...[...html.matchAll(/["'](\/api\/[^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/["'](https?:\/\/[^"']*api[^"']*)["']/gi)].map((m) => m[1])
  ]).slice(0, 20);
  const forms = (html.match(/<form\b/gi) || []).length;
  const authHints = (html.match(/login|sign in|auth|dashboard|app\.|connect wallet|walletconnect/gi) || []).length;
  const staticHints = (html.match(/vercel|netlify|github pages|cloudflare pages|next-static|vite/gi) || []).length;
  return {
    apiHits,
    forms,
    authHints,
    staticHints,
    hasBackendEvidence: apiHits.length > 0 || forms > 0 || authHints >= 3
  };
}

function websiteRole(url, token) {
  const host = domainFromUrl(url);
  const genericDomains = config.launchpadDomains || ["clanker.world", "virtuals.io", "zora.co", "flaunch.gg"];
  const isGenericLaunchpad = genericDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (!isGenericLaunchpad) return "project_site";
  const path = (() => {
    try { return new URL(normalizeUrl(url)).pathname.toLowerCase(); } catch { return ""; }
  })();
  const hasTokenPath = [token?.address, token?.name, token?.symbol]
    .filter(Boolean)
    .some((item) => path.includes(String(item).toLowerCase()));
  return hasTokenPath ? "launchpad_token_page" : "launchpad_generic_site";
}

async function analyzeWebsite(url, token = {}) {
  if (!url) return { ok: false, reason: "no website url" };
  const res = await fetchText(url);
  if (!res.ok) return { ok: false, url, status: res.status, error: res.error || `HTTP ${res.status}` };
  const meta = extractMeta(res.text);
  const backend = websiteBackendSignals(res.text);
  const githubUrls = extractUrls(res.text).filter((u) => /github\.com/i.test(u));
  const role = websiteRole(url, token);
  const score = scoreWebsite({ res, meta, backend, role });
  return {
    ok: true,
    url,
    finalUrl: res.finalUrl,
    status: res.status,
    contentType: res.contentType,
    server: res.server,
    title: meta.title,
    description: meta.description,
    visibleText: meta.visibleText.slice(0, 4000),
    textLength: meta.visibleText.length,
    role,
    backend,
    githubUrls,
    score
  };
}

function scoreWebsite({ res, meta, backend, role }) {
  let score = 0;
  const reasons = [];
  if (res.ok) { score += 15; reasons.push("+ website reachable"); }
  if (meta.visibleText.length >= Number(config.thresholds?.minWebsiteTextLength || 800)) { score += 15; reasons.push("+ enough page content"); }
  else reasons.push("- thin website content");
  if (backend.hasBackendEvidence) { score += 20; reasons.push("+ backend/app signals found"); }
  else reasons.push("- no clear backend/app signal");
  if (/docs|api|github|demo|dashboard|app|agent|workflow/i.test(meta.visibleText)) { score += 15; reasons.push("+ product keywords found"); }
  if (/coming soon|lorem ipsum|template|under construction/i.test(meta.visibleText)) { score -= 20; reasons.push("- placeholder wording"); }
  if (role === "launchpad_generic_site") {
    score = Math.min(score, 45);
    reasons.push("- generic launchpad website, not project-owned website");
  } else if (role === "launchpad_token_page") {
    score = Math.min(score, 60);
    reasons.push("~ launchpad token page, useful but weaker than project-owned website");
  }
  return { score: clamp(score, 0, 100), reasons };
}

function parseGithubRepoUrl(url) {
  const match = String(url).match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/i, "")}`;
}

function parseGithubOwnerUrl(url) {
  const match = String(url).match(/github\.com\/([^/\s?#]+)(?:[/?#]|$)/i);
  if (!match) return null;
  const owner = match[1];
  if (/^(features|topics|trending|marketplace|explore|login|signup|orgs|users)$/i.test(owner)) return null;
  return owner;
}

async function fetchGithubRepo(fullName) {
  const res = await fetchText(`https://api.github.com/repos/${fullName}`);
  if (!res.ok) return { ok: false, full_name: fullName, error: res.error || `HTTP ${res.status}` };
  try {
    const repo = JSON.parse(res.text);
    return { ok: true, ...repo };
  } catch (error) {
    return { ok: false, full_name: fullName, error: error.message };
  }
}

async function fetchGithubOwnerRepos(owner) {
  const res = await fetchText(`https://api.github.com/users/${owner}/repos?sort=pushed&per_page=8`);
  if (!res.ok) return [];
  try {
    const repos = JSON.parse(res.text);
    return Array.isArray(repos) ? repos.map((repo) => ({ ...repo, ok: true, explicitOwner: owner })) : [];
  } catch {
    return [];
  }
}

async function searchGithubRepos(query) {
  if (!query || query.length < 2) return [];
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+in:name,description&sort=updated&order=desc&per_page=5`;
  const res = await fetchText(url);
  if (!res.ok) return [];
  try {
    const json = JSON.parse(res.text);
    return (json.items || []).map((repo) => ({ ...repo, ok: true }));
  } catch {
    return [];
  }
}

async function analyzeGithub({ urls, token }) {
  const explicitRepos = uniq(urls.map(parseGithubRepoUrl).filter(Boolean));
  const explicitOwners = uniq(urls.map(parseGithubOwnerUrl).filter(Boolean))
    .filter((owner) => !explicitRepos.some((repo) => repo.toLowerCase().startsWith(`${owner.toLowerCase()}/`)));
  const repos = [];
  for (const fullName of explicitRepos.slice(0, 5)) repos.push(await fetchGithubRepo(fullName));
  for (const owner of explicitOwners.slice(0, 3)) repos.push(...await fetchGithubOwnerRepos(owner));
  if (!repos.length) {
    const query = [token.name, token.symbol].filter(Boolean).join(" ");
    repos.push(...await searchGithubRepos(query));
  }
  const normalized = repos.filter((r) => r && r.ok).slice(0, 8).map((r) => ({
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    pushed_at: r.pushed_at,
    created_at: r.created_at,
    language: r.language,
    archived: r.archived,
    explicit: explicitRepos.includes(r.full_name) || Boolean(r.explicitOwner),
    explicitOwner: r.explicitOwner || ""
  }));
  return {
    repos: normalized,
    score: scoreGithub(normalized, token)
  };
}

function buildExternalQueries({ token, urls, userNotes }) {
  const domain = domainFromUrl(urls.website);
  const values = {
    name: token.name || token.symbol || "",
    symbol: token.symbol || token.name || "",
    domain,
    website: domain,
    ca: token.address,
    notes: userNotes || ""
  };
  const templates = config.externalSignalQueries || [];
  const queries = templates.map((tpl) => tpl.replace(/\{(\w+)\}/g, (_, key) => values[key] || ""));
  if (values.name) {
    queries.push(`${values.name} Base token`);
    queries.push(`${values.name} Farcaster Clanker Virtuals`);
  }
  if (values.symbol && values.symbol !== values.name) queries.push(`${values.symbol} Base crypto`);
  if (domain) queries.push(`${domain} ${values.name || values.symbol} crypto`);
  if (token.address) queries.push(`"${token.address}"`);
  return uniq(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter((q) => q.length >= 3)).slice(0, 12);
}

function buildConceptQueries({ token, narrative, launchpad, website, userNotes }) {
  const domain = domainFromUrl(website?.url || "");
  const base = [];
  if (launchpad.platform && launchpad.platform !== "Unknown") base.push(`${launchpad.platform} Base token launchpad`);
  if (narrative.primary && narrative.primary !== "Unknown") base.push(`Base ${narrative.primary} crypto token`);
  if (/git|repo|github|developer|short link|preview/i.test(`${token.name} ${token.symbol} ${website?.visibleText || ""} ${userNotes || ""}`)) {
    base.push("Base developer tool token GitHub repo preview");
    base.push("crypto GitHub developer tool token Base");
  }
  if (/agent|ai|llm|automation/i.test(`${narrative.primary} ${website?.visibleText || ""} ${userNotes || ""}`)) {
    base.push("Base AI agent token launchpad Virtuals Clanker");
  }
  if (/farcaster|warpcast|clanker/i.test(`${launchpad.platform} ${website?.visibleText || ""} ${userNotes || ""}`)) {
    base.push("Farcaster Clanker Base token creator economy");
  }
  if (domain) base.push(`${domain} ${token.name || token.symbol} Base`);
  return uniq(base).slice(0, Number(config.thresholds?.maxConceptQueries || 5));
}

function twitterBearerToken() {
  return process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN || process.env.X_API_BEARER_TOKEN || "";
}

function twitterHandleFromUrl(url) {
  const match = String(url || "").match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i);
  if (!match) return "";
  if (/^(home|search|intent|share|i)$/i.test(match[1])) return "";
  return match[1];
}

function buildTwitterQueries({ token, urls, website, userNotes }) {
  const handles = uniq((urls.twitter || []).map(twitterHandleFromUrl).filter(Boolean));
  const domain = domainFromUrl(urls.website || website?.url || "");
  const values = uniq([
    token.address,
    token.name,
    token.symbol,
    domain,
    ...handles.map((handle) => `from:${handle}`),
    ...handles.map((handle) => `@${handle}`),
    userNotes?.match(/@[A-Za-z0-9_]{1,15}/g)?.join(" ")
  ].filter(Boolean));
  const queries = [];
  if (token.address) queries.push(`"${token.address}"`);
  for (const handle of handles) {
    queries.push(`from:${handle}`);
    queries.push(`@${handle} (${token.name || token.symbol || token.address})`);
  }
  if (token.name) queries.push(`"${token.name}" Base`);
  if (token.symbol && token.symbol !== token.name) queries.push(`"${token.symbol}" Base`);
  if (domain) queries.push(`"${domain}"`);
  if (values.length) queries.push(values.slice(0, 4).join(" OR "));
  return uniq(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter((q) => q.length >= 3))
    .slice(0, Number(config.thresholds?.maxTwitterQueries || 6));
}

async function searchTwitterRecent(query) {
  const key = twitterBearerToken();
  if (!key) return { ok: false, reason: "missing_twitter_bearer_token", tweets: [] };
  const params = new URLSearchParams({
    query: `${query} -is:retweet`,
    max_results: "10",
    "tweet.fields": "created_at,author_id,public_metrics,lang,context_annotations",
    "expansions": "author_id",
    "user.fields": "username,name,verified,public_metrics"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${key}`, accept: "application/json" }
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, reason: `twitter_api_http_${res.status}`, raw: text.slice(0, 500), tweets: [] };
    const json = JSON.parse(text);
    const users = new Map((json.includes?.users || []).map((user) => [user.id, user]));
    return {
      ok: true,
      tweets: (json.data || []).map((tweet) => {
        const user = users.get(tweet.author_id) || {};
        return {
          query,
          id: tweet.id,
          url: user.username ? `https://x.com/${user.username}/status/${tweet.id}` : `https://x.com/i/web/status/${tweet.id}`,
          text: tweet.text,
          created_at: tweet.created_at,
          author_id: tweet.author_id,
          username: user.username || "",
          author_name: user.name || "",
          verified: Boolean(user.verified),
          followers: Number(user.public_metrics?.followers_count || 0),
          metrics: tweet.public_metrics || {}
        };
      })
    };
  } catch (error) {
    return { ok: false, reason: error.message || String(error), tweets: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeTwitterEvidence({ token, urls, website, userNotes }) {
  const queries = buildTwitterQueries({ token, urls, website, userNotes });
  const hasKey = Boolean(twitterBearerToken());
  if (!hasKey) return emptyTwitterEvidence("missing_api", queries);
  const tweets = [];
  const errors = [];
  for (const query of queries) {
    const res = await searchTwitterRecent(query);
    if (res.ok) tweets.push(...res.tweets);
    else errors.push({ query, reason: res.reason });
  }
  const deduped = [];
  const seen = new Set();
  for (const tweet of tweets) {
    if (seen.has(tweet.id)) continue;
    seen.add(tweet.id);
    deduped.push(tweet);
  }
  deduped.sort((a, b) => {
    const am = Number(a.metrics?.like_count || 0) + Number(a.metrics?.retweet_count || 0) * 2 + Number(a.followers || 0) / 1000;
    const bm = Number(b.metrics?.like_count || 0) + Number(b.metrics?.retweet_count || 0) * 2 + Number(b.followers || 0) / 1000;
    return bm - am;
  });
  const handles = uniq((urls.twitter || []).map(twitterHandleFromUrl).filter(Boolean).map((h) => h.toLowerCase()));
  const officialTweets = deduped.filter((tweet) => handles.includes(String(tweet.username || "").toLowerCase()));
  const highFollowerTweets = deduped.filter((tweet) => Number(tweet.followers || 0) >= Number(config.thresholds?.twitterInfluencerMinFollowers || 5000));
  const score = clamp(
    Math.min(officialTweets.length, 4) * 18 +
    Math.min(highFollowerTweets.length, 5) * 8 +
    Math.min(deduped.length, 20) * 2,
    0,
    100
  );
  const status = score >= 70 ? "strong_x_evidence" : score >= 35 ? "some_x_evidence" : deduped.length ? "weak_x_noise" : "not_found";
  return {
    status,
    score,
    queries,
    tweets: deduped.slice(0, Number(config.thresholds?.maxTwitterLinks || 12)),
    officialTweetCount: officialTweets.length,
    highFollowerTweetCount: highFollowerTweets.length,
    errors,
    read: twitterEvidenceRead(status, hasKey)
  };
}

function emptyTwitterEvidence(reason = "skipped", queries = []) {
  const missing = reason === "missing_api";
  return {
    status: missing ? "missing_api" : "skipped",
    score: 0,
    queries,
    tweets: [],
    officialTweetCount: 0,
    highFollowerTweetCount: 0,
    errors: [],
    read: missing
      ? "未配置 TWITTER_BEARER_TOKEN / X_BEARER_TOKEN，跳过 X 实时搜索；只能使用 DEX Screener 或用户提供的 X 链接。"
      : "当前模式跳过 X 实时搜索。"
  };
}

function twitterEvidenceRead(status, hasKey) {
  if (!hasKey) return "未配置 X API，无法检索实时推特证据。";
  if (status === "strong_x_evidence") return "X 证据较强：能看到官方账号或较高影响力账号的相关讨论。";
  if (status === "some_x_evidence") return "X 上有一定讨论，但还需要判断是否是官方认领或二级传播。";
  if (status === "weak_x_noise") return "X 上有零散结果，可能只是同名噪音或低质量传播。";
  return "X 最近搜索暂未发现有效讨论。";
}

async function searchWebLinks(query) {
  const apiRows = [
    ...await searchTavily(query),
    ...await searchBrave(query),
    ...await searchSerpApi(query)
  ];
  if (apiRows.length) return uniqByUrl(apiRows).slice(0, 8);

  const endpoints = [
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  ];
  for (const endpoint of endpoints) {
    const res = await fetchText(endpoint, 5_000);
    if (!res.ok || !res.text) continue;
    const rows = [];
    const resultLinkMatches = [...res.text.matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const liteMatches = [...res.text.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const matches = resultLinkMatches.length ? resultLinkMatches : liteMatches;
    for (const match of matches) {
      let url = decodeHtml(match[1]);
      const title = decodeHtml(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      try {
        const parsed = new URL(url);
        const uddg = parsed.searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      } catch {}
      url = normalizeUrl(url);
      if (!url || /duckduckgo\.com|javascript:|\/settings|\/feedback/i.test(url)) continue;
      rows.push({ query, title, url, sourceType: classifyExternalSource(url, title) });
    }
    if (rows.length) return uniqByUrl(rows).slice(0, 8);
  }
  return [];
}

async function searchTavily(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 8 })
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).map((row) => ({
      query,
      title: row.title || row.url,
      url: normalizeUrl(row.url),
      sourceType: classifyExternalSource(row.url, row.title),
      snippet: row.content || ""
    })).filter((row) => row.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchBrave(query) {
  const key = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`, {
      signal: controller.signal,
      headers: { "accept": "application/json", "x-subscription-token": key }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.web?.results || []).map((row) => ({
      query,
      title: row.title || row.url,
      url: normalizeUrl(row.url),
      sourceType: classifyExternalSource(row.url, row.title),
      snippet: row.description || ""
    })).filter((row) => row.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchSerpApi(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  const res = await fetchText(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=8&api_key=${encodeURIComponent(key)}`, 12_000);
  if (!res.ok) return [];
  try {
    const json = JSON.parse(res.text);
    return (json.organic_results || []).map((row) => ({
      query,
      title: row.title || row.link,
      url: normalizeUrl(row.link),
      sourceType: classifyExternalSource(row.link, row.title),
      snippet: row.snippet || ""
    })).filter((row) => row.url);
  } catch {
    return [];
  }
}

function classifyExternalSource(url, title = "") {
  const text = `${url} ${title}`.toLowerCase();
  if (/github\.com|docs\.|gitbook|mirror\.xyz|notion\.site|paragraph\.xyz/.test(text)) return "official_or_docs_source";
  if (/x\.com|twitter\.com|warpcast|farcaster|t\.me|telegram|discord/.test(text)) return "kol_or_social_source";
  if (/base\.org|coinbase|clanker|virtuals|zora|flaunch|aerodrome|uniswap/.test(text)) return "ecosystem_source";
  if (/coindesk|cointelegraph|decrypt|theblock|blockworks|beincrypto|bankless|foresight|panews|odaily|techflow/.test(text)) return "news_source";
  if (/twstalker|nitter|threadreader|rssing|archive|snapshot/.test(text)) return "mirror_source";
  return "web_source";
}

function uniqByUrl(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.url.replace(/#.*$/, "").replace(/[/?&]utm_[^=]+=[^&]+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function analyzeExternalSignals({ token, urls, userNotes }) {
  const queries = buildExternalQueries({ token, urls, userNotes });
  const links = [];
  const hasSearchApi = Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY || process.env.SERPAPI_KEY);
  const maxQueries = hasSearchApi
    ? Number(config.thresholds?.maxExternalQueries || 10)
    : Number(config.thresholds?.maxPublicExternalQueries || 3);
  for (const query of queries.slice(0, maxQueries)) {
    const found = await searchWebLinks(query);
    links.push(...found);
  }
  const deduped = uniqByUrl(links).filter((row) => {
    const host = domainFromUrl(row.url);
    return host && !/oklink\.com|etherscan\.io\/token|basescan\.org\/token/i.test(row.url);
  }).slice(0, Number(config.thresholds?.maxExternalLinks || 20));
  const sourceCounts = deduped.reduce((acc, row) => {
    acc[row.sourceType] = (acc[row.sourceType] || 0) + 1;
    return acc;
  }, {});
  const strongTypes = ["official_or_docs_source", "ecosystem_source", "news_source", "kol_or_social_source"];
  const strongLinkCount = deduped.filter((row) => strongTypes.includes(row.sourceType)).length;
  const score = clamp(
    Math.min(strongLinkCount, 6) * 12 +
    (sourceCounts.ecosystem_source ? 15 : 0) +
    (sourceCounts.news_source ? 10 : 0) +
    (sourceCounts.official_or_docs_source ? 10 : 0),
    0,
    100
  );
  const status = score >= 65 ? "strong_evidence" : score >= 35 ? "some_evidence" : deduped.length ? "weak_noise" : "not_found";
  return {
    status,
    score,
    queries,
    sourceCounts,
    links: deduped,
    read: externalSignalRead(status)
  };
}

async function analyzeConceptNews({ token, narrative, launchpad, website, userNotes }) {
  const queries = buildConceptQueries({ token, narrative, launchpad, website, userNotes });
  const links = [];
  for (const query of queries) links.push(...await searchWebLinks(query));
  const deduped = uniqByUrl(links)
    .filter((row) => row.url && !/oklink\.com|etherscan\.io\/token|basescan\.org\/token/i.test(row.url))
    .slice(0, Number(config.thresholds?.maxConceptLinks || 12));
  const sourceCounts = deduped.reduce((acc, row) => {
    acc[row.sourceType] = (acc[row.sourceType] || 0) + 1;
    return acc;
  }, {});
  return {
    status: deduped.length >= 5 ? "concept_context_found" : deduped.length ? "thin_context" : "not_found",
    queries,
    sourceCounts,
    links: deduped,
    read: deduped.length
      ? "找到了一些同叙事/同平台资料，可用于判断这个故事是不是 Base 用户能理解的方向。"
      : "暂时没有找到稳定的同叙事资料，可能是太早期或关键词太泛。"
  };
}

function emptyExternalSignals(mode) {
  return {
    status: mode === "quick" ? "skipped_quick_mode" : "not_found",
    score: 0,
    queries: [],
    sourceCounts: {},
    links: [],
    read: mode === "quick" ? "快速模式跳过外部搜索，需要时用 --deep 深挖新闻和同叙事资料。" : "暂时没有搜到有效外部证据，叙事主要来自项目自己。"
  };
}

function emptyConceptNews(mode) {
  return {
    status: mode === "quick" ? "skipped_quick_mode" : "not_found",
    queries: [],
    sourceCounts: {},
    links: [],
    read: mode === "quick" ? "快速模式跳过概念新闻搜索，需要时用 --deep。" : "暂时没有找到稳定的同叙事资料。"
  };
}

function externalSignalRead(status) {
  if (status === "strong_evidence") return "外部证据较完整，至少能看到生态/社媒/新闻/文档中的多源线索。";
  if (status === "some_evidence") return "有外部讨论或生态线索，但还不足以证明项目已经被市场确认。";
  if (status === "weak_noise") return "能搜到一些结果，但更像同名噪音或镜像页面，需要人工确认。";
  return "暂时没有搜到有效外部证据，叙事主要来自项目自己。";
}

function scoreGithub(repos, token) {
  let score = 0;
  const reasons = [];
  if (!repos.length) return { score: 0, reasons: ["- no GitHub repo found"] };
  const best = repos[0];
  if (best.explicit) { score += 25; reasons.push("+ repo linked by website/token metadata"); }
  else reasons.push("~ repo found by name search only");
  const pushedDays = best.pushed_at ? (Date.now() - new Date(best.pushed_at).getTime()) / 86_400_000 : Infinity;
  if (pushedDays <= Number(config.thresholds?.githubRecentPushDays || 45)) { score += 25; reasons.push("+ recently updated"); }
  else reasons.push("- stale repo");
  if ((best.stargazers_count || 0) >= 10) { score += 15; reasons.push("+ some GitHub stars"); }
  if (best.description && textScore(best.description, [token.name, token.symbol].filter(Boolean)).score > 0) {
    score += 15; reasons.push("+ repo description matches token");
  }
  if (best.archived) { score -= 30; reasons.push("- repo archived"); }
  return { score: clamp(score, 0, 100), reasons };
}

function scoreOnchain({ priceInfo, security, advanced, liquidity }) {
  let score = 50;
  const reasons = [];
  const riskLevel = String(first(security.riskLevel, security.risk_level, security.level, "")).toUpperCase();
  if (riskLevel === "LOW") { score += 20; reasons.push("+ token-scan low risk"); }
  else if (riskLevel === "MEDIUM") { score += 5; reasons.push("~ token-scan medium risk"); }
  else if (riskLevel === "HIGH" || riskLevel === "CRITICAL") { score -= 50; reasons.push(`- token-scan ${riskLevel}`); }
  else { score -= 20; reasons.push("- token-scan unknown"); }
  const mcap = num(priceInfo.marketCapUsd, priceInfo.marketCap, priceInfo.market_cap);
  const liq = num(priceInfo.liquidityUsd, priceInfo.liquidity);
  const holders = num(priceInfo.holders, priceInfo.holderCount);
  if (liq >= Number(config.thresholds?.minLiquidityUsd || 10000)) { score += 10; reasons.push("+ liquidity passes minimum"); }
  else { score -= 15; reasons.push("- low/missing liquidity"); }
  if (holders >= Number(config.thresholds?.minHolders || 30)) { score += 10; reasons.push("+ holder count passes minimum"); }
  else { score -= 10; reasons.push("- low/missing holders"); }
  if (mcap && mcap <= Number(config.thresholds?.maxMarketCapUsdForEarly || 2000000)) reasons.push("+ still early by market cap");
  const poolNames = JSON.stringify(liquidity || {}).toLowerCase();
  if (/clanker|virtual|zora|flaunch|aerodrome|uniswap/.test(poolNames)) reasons.push("+ recognizable liquidity venue");
  return { score: clamp(score, 0, 100), reasons };
}

function scoreNarrative({ narrative, launchpad, website, github }) {
  let score = 30;
  const reasons = [];
  if (narrative.primary !== "Unknown") { score += 20; reasons.push(`+ narrative detected: ${narrative.primary}`); }
  else reasons.push("- unclear Base narrative");
  if (launchpad.platform !== "Unknown") { score += 15; reasons.push(`+ launchpad/platform hint: ${launchpad.platform}`); }
  else reasons.push("~ launch platform unknown");
  if (website.score?.score >= 50) { score += 15; reasons.push("+ website supports narrative"); }
  if (github.score?.score >= 50) { score += 20; reasons.push("+ GitHub supports builder story"); }
  return { score: clamp(score, 0, 100), reasons };
}

function detectProductRugRisk({ report, website, github, launchpad }) {
  const riskTypes = [];
  const why = [];
  const websiteScore = website.score?.score || 0;
  const githubScore = github.score?.score || 0;
  const hasExplicitGithub = (github.repos || []).some((repo) => repo.explicit);
  const priceInfo = report.priceInfo || {};
  const liquidity = num(priceInfo.liquidityUsd, priceInfo.liquidity);

  if (websiteScore < 35 && githubScore < 35) {
    riskTypes.push("story_shell");
    why.push("官网和 GitHub 证据都偏薄，叙事可能大于产品");
  }
  if (!website.ok) {
    riskTypes.push("dev_silent");
    why.push("未找到官网，dev/项目认领证据不足");
  }
  if (website.ok && !website.backend?.hasBackendEvidence && githubScore < 45) {
    riskTypes.push("fake_product");
    why.push("官网可访问但没有明显应用/后端线索，GitHub 也不强");
  }
  if ((github.repos || []).length && !hasExplicitGithub) {
    riskTypes.push("repo_mismatch");
    why.push("GitHub 只是同名搜索结果，不是官网/X 明确链接");
  }
  if (launchpad.platform !== "Unknown" && websiteScore < 35 && githubScore < 35) {
    riskTypes.push("launchpad_noise");
    why.push(`${launchpad.platform} 线索存在，但产品证据不足，可能只是发射台噪音`);
  }
  if (!liquidity || liquidity < Number(config.thresholds?.minLiquidityUsd || 10000)) {
    riskTypes.push("liquidity_exit_risk");
    why.push("流动性缺失或不足，退出风险高");
  }

  const uniqueTypes = uniq(riskTypes);
  const level = uniqueTypes.length >= 4 ? "high" : uniqueTypes.length >= 2 ? "medium" : uniqueTypes.length === 1 ? "low" : "low";
  return { level, riskTypes: uniqueTypes, why: uniq(why) };
}

function buildModuleSummary(report) {
  return {
    ca_resolver: {
      status: report.token.name || report.token.symbol ? "resolved" : "weak",
      evidence: [`${report.token.name || "UNKNOWN"} (${report.token.symbol || "UNKNOWN"})`, report.token.address]
    },
    onchain_safety: {
      status: report.scores.onchain.score >= 70 ? "pass" : report.scores.onchain.score >= 40 ? "mixed" : "weak",
      evidence: report.scores.onchain.reasons
    },
    launchpad_birthplace: {
      status: report.launchpad.platform === "Unknown" ? "unknown" : "detected",
      evidence: [report.launchpad.platform, ...(report.launchpad.matches || []).flatMap((m) => m.hits || [])]
    },
    website_reality: {
      status: report.checks.website.ok ? (report.checks.website.backend?.hasBackendEvidence ? "app_signal" : "thin_or_static") : "missing",
      evidence: report.scores.website.reasons
    },
    twitter_reality: {
      status: report.twitterEvidence.status,
      evidence: [
        ...(report.urls.twitter?.length ? report.urls.twitter : ["no X/Twitter link found"]),
        report.twitterEvidence.read,
        ...report.twitterEvidence.tweets.slice(0, 4).map((tweet) => `@${tweet.username}: ${tweet.url}`)
      ]
    },
    github_reality: {
      status: report.checks.github.repos.some((r) => r.explicit) ? "explicit" : report.checks.github.repos.length ? "name_search_only" : "missing",
      evidence: report.scores.github.reasons
    },
    narrative_value: {
      status: report.narrative.primary === "Unknown" ? "unclear" : "detected",
      evidence: [report.narrative.primary, ...report.scores.narrative.reasons]
    },
    product_rug_risk: {
      status: report.rugRisk.level,
      evidence: report.rugRisk.why
    },
    external_signal_evidence: {
      status: report.externalSignals.status,
      evidence: [
        report.externalSignals.read,
        ...report.externalSignals.links.slice(0, 4).map((row) => `${row.sourceType}: ${row.title || row.url}`)
      ]
    },
    related_concept_news: {
      status: report.conceptNews.status,
      evidence: [
        report.conceptNews.read,
        ...report.conceptNews.links.slice(0, 4).map((row) => `${row.sourceType}: ${row.title || row.url}`)
      ]
    }
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
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

async function analyzeToken(tokenAddress, opts = {}) {
  const reportRes = runJson(["token", "report", "--address", tokenAddress, "--chain", chain], 30_000);
  const report = reportRes.ok ? extractReportParts(reportRes.data) : { info: {}, priceInfo: {}, advanced: {}, security: {} };
  const liquidityRes = runJson(["token", "liquidity", "--address", tokenAddress, "--chain", chain], 20_000);
  const userNoteUrls = extractUrls(opts.notes);
  const allUrls = uniq([
    ...extractUrls(report),
    ...extractUrls(liquidityRes.ok ? liquidityRes.data : {}),
    ...userNoteUrls,
    opts.website,
    opts.twitter,
    opts.github
  ]);
  const urlGroups = classifyUrls(allUrls);
  const token = {
    address: tokenAddress.toLowerCase(),
    chain,
    chainIndex,
    name: first(report.info.name, report.info.tokenName, report.priceInfo.name, report.priceInfo.tokenName),
    symbol: first(report.info.symbol, report.info.tokenSymbol, report.priceInfo.symbol, report.priceInfo.tokenSymbol),
    decimals: first(report.info.decimals, report.info.decimal)
  };
  const urls = {
    ...urlGroups,
    website: opts.website || urlGroups.website,
    twitter: uniq([opts.twitter, ...urlGroups.twitter]),
    github: uniq([opts.github, ...urlGroups.github])
  };
  const website = await analyzeWebsite(urls.website, token);
  const githubUrls = uniq([...urls.github, ...(website.githubUrls || [])]);
  const github = await analyzeGithub({ urls: githubUrls, token });
  const launchpad = detectLaunchpad({ token, urls: allUrls, liquidity: liquidityRes.data, advanced: report.advanced });
  const narrative = classifyNarrative({ token, website, github, userNotes: opts.notes });
  const isDeep = opts.mode === "deep";
  const externalSignals = isDeep
    ? await analyzeExternalSignals({ token, urls: { ...urls, github: githubUrls }, userNotes: opts.notes })
    : emptyExternalSignals(opts.mode);
  const conceptNews = isDeep
    ? await analyzeConceptNews({ token, narrative, launchpad, website, userNotes: opts.notes })
    : emptyConceptNews(opts.mode);
  const twitterEvidence = (isDeep || opts.autoDiscover)
    ? await analyzeTwitterEvidence({ token, urls, website, userNotes: opts.notes })
    : emptyTwitterEvidence("skipped", buildTwitterQueries({ token, urls, website, userNotes: opts.notes }));
  const onchainScore = scoreOnchain({
    priceInfo: report.priceInfo,
    security: report.security,
    advanced: report.advanced,
    liquidity: liquidityRes.ok ? liquidityRes.data : {}
  });
  const narrativeScore = scoreNarrative({ narrative, launchpad, website, github });
  const finalScore = clamp(
    onchainScore.score * 0.35 +
    (website.score?.score || 0) * 0.2 +
    github.score.score * 0.2 +
    narrativeScore.score * 0.2 +
    externalSignals.score * 0.05,
    0,
    100
  );
  const verdict = finalScore >= 75 ? "strong_watch" : finalScore >= 55 ? "watch" : finalScore >= 35 ? "weak_watch" : "avoid";
  const result = {
    generatedAt: new Date().toISOString(),
    token,
    verdict,
    finalScore,
    scores: {
      onchain: onchainScore,
      website: website.score || { score: 0, reasons: [website.reason || website.error || "- no website"] },
      github: github.score,
      narrative: narrativeScore
    },
    launchpad,
    narrative,
    twitterEvidence,
    externalSignals,
    conceptNews,
    userInputs: opts,
    rugRisk: detectProductRugRisk({ report, website, github, launchpad }),
    urls: { ...urls, github: githubUrls },
    checks: {
      onchainReportOk: reportRes.ok,
      onchainReportError: reportRes.error,
      liquidityOk: liquidityRes.ok,
      liquidityError: liquidityRes.error,
      website,
      github,
      raw: {
        report: reportRes.ok ? reportRes.data : null,
        liquidity: liquidityRes.ok ? liquidityRes.data : null
      }
    }
  };
  result.modules = buildModuleSummary(result);
  return result;
}

function formatTextReport(report) {
  const lines = [];
  lines.push(`Base 叙事雷达检测报告`);
  lines.push("");
  lines.push(`项目：${report.token.name || "UNKNOWN"} (${report.token.symbol || "UNKNOWN"})`);
  lines.push(`合约：${report.token.address}`);
  lines.push(`模式：${report.userInputs?.mode || "quick"}`);
  lines.push(`初判：${report.verdict}`);
  lines.push(`综合评分：${report.finalScore}/100`);
  lines.push(`叙事类型：${report.narrative.primary}`);
  lines.push(`叙事价值评分：${report.scores.narrative.score}/100`);
  lines.push(`发射平台：${report.launchpad.platform}`);
  lines.push(`产品式 Rug 风险：${report.rugRisk.level}${report.rugRisk.riskTypes.length ? `（${report.rugRisk.riskTypes.join(", ")}）` : ""}`);
  lines.push("");
  lines.push(`一句话判断`);
  lines.push(oneLineRead(report));
  lines.push("");
  lines.push(`叙事价值`);
  lines.push(narrativeValueRead(report));
  for (const reason of report.scores.narrative.reasons || []) lines.push(`- ${stripMarker(reason)}`);
  lines.push("");
  lines.push(`核心评分`);
  lines.push(`链上基础：${report.scores.onchain.score}/100`);
  lines.push(`官网真实性：${report.scores.website.score}/100`);
  lines.push(`GitHub 证据：${report.scores.github.score}/100`);
  lines.push(`叙事价值：${report.scores.narrative.score}/100`);
  lines.push("");
  lines.push(`官网`);
  lines.push(`URL：${report.urls.website || "暂无"}`);
  lines.push(`可访问：${report.checks.website.ok ? "是" : "否"}`);
  if (report.checks.website.ok) {
    lines.push(`标题：${report.checks.website.title || "暂无"}`);
    lines.push(`类型：${websiteRoleLabel(report.checks.website.role)}`);
    lines.push(`应用/后端线索：${report.checks.website.backend.hasBackendEvidence ? "有" : "未发现"}`);
    lines.push(`线索数量：${report.checks.website.backend.apiHits.length} 个 API，${report.checks.website.backend.forms} 个表单，${report.checks.website.backend.authHints} 个登录/应用词`);
  }
  lines.push("");
  lines.push(`X / Twitter`);
  if (report.urls.twitter?.length) {
    for (const url of report.urls.twitter) lines.push(`- ${url}`);
  } else {
    lines.push(`暂无明确 X 链接`);
  }
  lines.push(`X 搜索状态：${report.twitterEvidence.status}`);
  lines.push(`X 说明：${report.twitterEvidence.read}`);
  if (report.twitterEvidence.queries?.length) lines.push(`X 检索词：${report.twitterEvidence.queries.join(" | ")}`);
  if (report.twitterEvidence.tweets?.length) {
    for (const tweet of report.twitterEvidence.tweets.slice(0, 8)) {
      lines.push(`- @${tweet.username || tweet.author_id}：${String(tweet.text || "").replace(/\s+/g, " ").slice(0, 140)}`);
      lines.push(`  链接：${tweet.url}`);
      lines.push(`  粉丝：${tweet.followers || 0}；互动：${tweet.metrics?.like_count || 0} likes / ${tweet.metrics?.retweet_count || 0} RT`);
    }
  }
  lines.push("");
  lines.push(`GitHub`);
  if (report.checks.github.repos.length) {
    for (const repo of report.checks.github.repos.slice(0, 5)) {
      lines.push(`- ${repo.full_name}`);
      lines.push(`  地址：${repo.html_url}`);
      lines.push(`  Stars：${repo.stargazers_count || 0}；最近更新：${repo.pushed_at || "暂无"}；显式关联：${repo.explicit ? "是" : "否"}`);
    }
  } else {
    lines.push(`暂无 GitHub 仓库证据`);
  }
  lines.push("");
  lines.push(`外部证据`);
  lines.push(`状态：${report.externalSignals.status}`);
  lines.push(`说明：${report.externalSignals.read}`);
  if (report.externalSignals.links.length) {
    for (const link of report.externalSignals.links.slice(0, 12)) {
      lines.push(`- ${link.title || link.url}`);
      lines.push(`  链接：${link.url}`);
      lines.push(`  类型：${link.sourceType}；检索词：${link.query}`);
    }
  } else {
    lines.push(`暂无外部链接`);
  }
  lines.push("");
  lines.push(`同叙事新闻 / 案例`);
  lines.push(`状态：${report.conceptNews.status}`);
  lines.push(`说明：${report.conceptNews.read}`);
  if (report.conceptNews.links.length) {
    for (const link of report.conceptNews.links.slice(0, 10)) {
      lines.push(`- ${link.title || link.url}`);
      lines.push(`  链接：${link.url}`);
      lines.push(`  类型：${link.sourceType}；检索词：${link.query}`);
    }
  } else {
    lines.push(`暂无同叙事链接`);
  }
  lines.push("");
  if (report.userInputs?.notes) {
    lines.push(`用户补充信息`);
    lines.push(report.userInputs.notes);
    lines.push("");
  }
  lines.push(`备注`);
  lines.push(`这个报告用于 Base 产品型 token 检测，不等于买入建议。`);
  lines.push(`riskLevel LOW 只表示未发现常见自动化风险，不代表项目安全。`);
  lines.push(`官网、GitHub、X 都是证据链的一部分，最终仍要看 dev 是否公开认领和持续更新。`);
  lines.push(`quick 模式优先快结论；deep 模式才检索外部新闻和同叙事资料。`);
  return lines.join("\n");
}

function stripMarker(reason) {
  return String(reason || "").replace(/^[+\-~]\s*/, "");
}

function websiteRoleLabel(role) {
  if (role === "launchpad_generic_site") return "发射台通用官网";
  if (role === "launchpad_token_page") return "发射台项目页";
  return "项目自有官网";
}

function narrativeValueRead(report) {
  const score = report.scores.narrative.score;
  if (score >= 80) return `叙事价值高。这个项目的故事比较容易被 Base 用户理解，并且有发射平台、官网或 GitHub 证据支撑。`;
  if (score >= 60) return `叙事价值中上。方向是成立的，但还需要 X 认领、真实用户或更多产品更新来确认。`;
  if (score >= 40) return `叙事价值一般。有概念但证据偏薄，容易停留在包装层。`;
  return `叙事价值偏低。当前还看不出清晰的 Base 原生故事或产品落地路径。`;
}

function oneLineRead(report) {
  if (report.verdict === "strong_watch") {
    return "链上安全、产品证据和叙事证据都比较完整，值得进入重点观察。";
  }
  if (report.verdict === "watch") {
    return "有一定产品叙事和链上基础，但仍需要 dev/X/GitHub 或真实使用继续确认。";
  }
  if (report.verdict === "weak_watch") {
    return "有链上热度或叙事线索，但官网、X、GitHub、dev 认领证据不足，适合 watchlist，不适合盲冲。";
  }
  return "关键证据不足或风险过高，更像噪音/包装项目，默认避开。";
}

async function main() {
  const args = await enrichArgsWithDiscovery(parseArgs(process.argv));
  const tokenAddress = args.tokenAddress;
  if (!tokenAddress) {
    console.error("Usage: node scripts/base_token_due_diligence.mjs <base_token_ca> [--quick|--deep|--mode quick|deep] [--auto-discover] [--website <url>] [--twitter <url>] [--github <url>] [--notes \"...\"]");
    process.exit(1);
  }
  const report = await analyzeToken(tokenAddress, args);
  const base = `${OUT_DIR}/${tokenAddress.toLowerCase()}`;
  const textReport = formatTextReport(report);
  fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${base}.txt`, textReport);
  console.log(textReport);
  console.log(`\nSaved:\n- ${base}.json\n- ${base}.txt`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
