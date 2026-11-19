import { chromium } from "playwright"
import { createRequire } from "node:module"
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const axePath = require.resolve("axe-core/axe.min.js")
const url = process.env.ORIENTATION_URL
  ?? "http://localhost:5174/neo-beyond-lohnes/prototype/lived-day-orientation/"
const widths = [320, 360, 412]
const scenes = [
  { name: "Workday", recommendation: true },
  { name: "Day off", recommendation: true },
  { name: "Difficult day", recommendation: true },
  { name: "Sparse", recommendation: false },
  { name: "Unknown", recommendation: false },
]

const browser = await chromium.launch({ headless: true })
const results = []
const failures = []
let desktopReview

for (const width of widths) {
  for (const scene of scenes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const outsideRequests = []
    const pageErrors = []
    page.on("request", request => {
      if (!request.url().startsWith("http://localhost:5174/")) outsideRequests.push(request.url())
    })
    page.on("pageerror", error => pageErrors.push(error.message))

    await page.goto(url, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: new RegExp(`^${scene.name}`) }).click()
    await page.getByRole("button", { name: "Start day", exact: true }).click()

    const observed = await page.evaluate(() => {
      const recommendation = document.getElementById("recommendation")
      const visibleButtons = [...document.querySelectorAll("button")]
        .filter(button => button.getClientRects().length > 0)
      return {
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        recommendationVisible: recommendation.getClientRects().length > 0,
        supportingActions: document.querySelectorAll("#actions .action").length,
        minButtonHeight: Math.min(...visibleButtons.map(button => button.getBoundingClientRect().height)),
      }
    })

    await page.addScriptTag({ path: axePath })
    const axe = await page.evaluate(async () => {
      const report = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      })
      return report.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        targets: violation.nodes.map(node => node.target.join(" ")),
        details: violation.nodes.map(node => node.failureSummary),
      }))
    })

    const row = { width, scene: scene.name, ...observed, axe, outsideRequests, pageErrors }
    results.push(row)
    if (observed.horizontalOverflow) failures.push(`${width}/${scene.name}: horizontal overflow`)
    if (observed.recommendationVisible !== scene.recommendation) {
      failures.push(`${width}/${scene.name}: recommendation visibility`)
    }
    if (observed.supportingActions > 2) failures.push(`${width}/${scene.name}: action limit`)
    if (observed.minButtonHeight < 43.5) failures.push(`${width}/${scene.name}: touch target`)
    if (axe.length) failures.push(`${width}/${scene.name}: axe ${axe.map(item => item.id).join(", ")}`)
    if (outsideRequests.length) failures.push(`${width}/${scene.name}: external request`)
    if (pageErrors.length) failures.push(`${width}/${scene.name}: page error`)

    if (width === 360 && (scene.name === "Workday" || scene.name === "Day off")) {
      const filename = scene.name === "Workday" ? "preview-workday.png" : "preview-day-off.png"
      await page.setViewportSize({ width: 360, height: 1100 })
      await page.screenshot({ path: join(here, filename), fullPage: false })
    }

    if (width === 360 && scene.name === "Unknown") {
      await page.getByRole("button", { name: "Enter today", exact: true }).click()
      if (!await page.getByRole("region", { name: "Today preview" }).isVisible()) {
        failures.push("Enter today did not open TODAY preview")
      }
      await page.getByRole("button", { name: "Reopen orientation", exact: true }).click()
      if (!await page.getByRole("region", { name: "Lived-day orientation" }).isVisible()) {
        failures.push("Reopen did not restore Orientation")
      }
    }
    await page.close()
  }
}

{
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  const outsideRequests = []
  const pageErrors = []
  page.on("request", request => {
    if (!request.url().startsWith("http://localhost:5174/")) outsideRequests.push(request.url())
  })
  page.on("pageerror", error => pageErrors.push(error.message))
  await page.goto(url, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Start day", exact: true }).click()
  await page.addScriptTag({ path: axePath })
  const axe = await page.evaluate(async () => {
    const report = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    })
    return report.violations.map(violation => ({
      id: violation.id,
      targets: violation.nodes.map(node => node.target.join(" ")),
      details: violation.nodes.map(node => node.failureSummary),
    }))
  })
  desktopReview = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }))
  desktopReview.axe = axe
  desktopReview.outsideRequests = outsideRequests
  desktopReview.pageErrors = pageErrors
  if (desktopReview.horizontalOverflow) failures.push("1200/Review shell: horizontal overflow")
  if (axe.length) failures.push(`1200/Review shell: axe ${axe.map(item => item.id).join(", ")}`)
  if (outsideRequests.length) failures.push("1200/Review shell: external request")
  if (pageErrors.length) failures.push("1200/Review shell: page error")
  await page.close()
}

await browser.close()
const report = {
  generatedAt: new Date().toISOString(),
  url,
  result: failures.length ? "FAIL" : "PASS",
  failures,
  summary: {
    widths,
    scenes: scenes.map(scene => scene.name),
    checks: [
      "horizontal overflow",
      "recommendation abstention",
      "supporting-action limit",
      "touch targets",
      "axe WCAG A/AA",
      "page errors",
      "external network requests",
      "ENTER TODAY and reopen",
    ],
  },
  results,
  desktopReview,
}
await writeFile(join(here, "verification.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(`${report.result}: ${results.length} responsive state checks`)
if (failures.length) {
  console.error(failures.join("\n"))
  process.exitCode = 1
}
