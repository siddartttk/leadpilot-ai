import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
test("core views have no serious accessibility findings", async ({
  page,
}, testInfo) => {
  const all: { route: string; id: string; elements: number }[] = [];
  for (const route of ["/", "/demo", "/leads", "/login"]) {
    await page.goto(route);
    if (route === "/demo")
      await expect(page.locator(".kpi-value").first()).toHaveText("160");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    fs.writeFileSync(
      testInfo.outputPath(
        "accessibility-" + (route.replaceAll("/", "-") || "landing") + ".json",
      ),
      JSON.stringify(violations, null, 2),
    );
    await testInfo.attach("accessibility-" + route.replaceAll("/", "-"), {
      body: JSON.stringify(violations, null, 2),
      contentType: "application/json",
    });
    all.push(
      ...violations.map((v) => ({ route, id: v.id, elements: v.nodes.length })),
    );
  }
  expect(all).toEqual([]);
});
