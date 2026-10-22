import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const require = createRequire(import.meta.url)
const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:4173'
const runsPerTarget = Number(process.env.LIGHTHOUSE_RUNS ?? 3)
const outputDir = path.resolve('reports/lighthouse')
const targets = [
  { name: 'home', pathname: '/' },
  { name: 'nft-detail', pathname: '/nfts/nft-01' },
]
const profiles = {
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttlingMethod: 'simulate',
  },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
    throttlingMethod: 'simulate',
  },
}
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const metrics = {
  lcpMs: 'largest-contentful-paint',
  fcpMs: 'first-contentful-paint',
  tbtMs: 'total-blocking-time',
  cls: 'cumulative-layout-shift',
  speedIndexMs: 'speed-index',
}
const targetsMin = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function isUp(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await isUp(baseUrl)) return null
  if (process.env.LIGHTHOUSE_BASE_URL) throw new Error(`Servidor indisponível em ${baseUrl}`)
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isUp(baseUrl)) return child
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  child.kill()
  throw new Error('Não foi possível iniciar o vite preview. Rode `npm run build` antes.')
}

await fs.mkdir(outputDir, { recursive: true })
const server = await ensureServer()
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
const versionInfo = await fetch(`http://127.0.0.1:${chrome.port}/json/version`).then((r) => r.json())
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  runsPerTarget,
  aggregation: 'mediana por categoria e métrica',
  environment: {
    lighthouse: require('lighthouse/package.json').version,
    chromeLauncher: require('chrome-launcher/package.json').version,
    browser: versionInfo.Browser,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model,
    build: 'vite build + vite preview (VITE_ENABLE_MSW=true)',
  },
  targets: targetsMin,
  results: {},
}

let failed = false
try {
  for (const target of targets) {
    summary.results[target.name] = {}
    for (const [profileName, profile] of Object.entries(profiles)) {
      const runs = []
      for (let run = 1; run <= runsPerTarget; run += 1) {
        const result = await lighthouse(new URL(target.pathname, baseUrl).href, {
          port: chrome.port,
          output: ['html', 'json'],
          logLevel: 'error',
          onlyCategories: categories,
          ...profile,
        })
        if (!result) throw new Error(`Lighthouse não retornou resultado para ${target.name}`)
        const scores = Object.fromEntries(categories.map((category) => [
          category,
          Math.round((result.lhr.categories[category]?.score ?? 0) * 100),
        ]))
        const values = Object.fromEntries(Object.entries(metrics).map(([key, audit]) => [
          key,
          Number((result.lhr.audits[audit]?.numericValue ?? 0).toFixed(key === 'cls' ? 3 : 0)),
        ]))
        runs.push({ run, scores, metrics: values })
        const base = path.join(outputDir, `${target.name}-${profileName}-${run}`)
        await fs.writeFile(`${base}.html`, result.report[0], 'utf8')
        await fs.writeFile(`${base}.json`, result.report[1], 'utf8')
      }
      const medians = Object.fromEntries(categories.map((category) => [
        category,
        median(runs.map((entry) => entry.scores[category])),
      ]))
      const medianMetrics = Object.fromEntries(Object.keys(metrics).map((key) => [
        key,
        median(runs.map((entry) => entry.metrics[key])),
      ]))
      for (const [category, min] of Object.entries(targetsMin)) {
        if (medians[category] < min) failed = true
      }
      summary.results[target.name][profileName] = { medians, medianMetrics, runs }
      console.log(
        `${target.name} (${profileName}): ${categories.map((key) => `${key} ${medians[key]}`).join(' | ')}`
        + ` | LCP ${medianMetrics.lcpMs}ms CLS ${medianMetrics.cls} TBT ${medianMetrics.tbtMs}ms`,
      )
    }
  }
} finally {
  await chrome.kill()
  server?.kill()
}

const rows = []
for (const [target, byProfile] of Object.entries(summary.results)) {
  for (const [profile, data] of Object.entries(byProfile)) {
    const { medians: m, medianMetrics: x } = data
    rows.push(`| ${target} | ${profile} | ${m.performance} | ${m.accessibility} | ${m['best-practices']} | ${m.seo} | ${x.lcpMs} | ${x.cls} | ${x.tbtMs} |`)
  }
}
const markdown = [
  '# Lighthouse — resumo (mediana de 3 execuções)',
  '',
  `Gerado em ${summary.generatedAt} contra ${baseUrl}.`,
  '',
  '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
  '## Ambiente',
  '',
  ...Object.entries(summary.environment).map(([key, value]) => `- ${key}: ${value}`),
  '',
].join('\n')

await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
await fs.writeFile(path.join(outputDir, 'SUMMARY.md'), markdown)
console.log(`Resumo salvo em ${path.join(outputDir, 'summary.json')} e SUMMARY.md`)
if (failed) {
  console.error('Alguma mediana ficou abaixo da meta.')
  process.exitCode = 1
}
