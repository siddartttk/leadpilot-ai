import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("dashboard loading, API error, and retry states work", async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/analytics?*", async (route) => {
    await barrier;
    await route.continue();
  });
  await page.goto("/demo");
  await expect(page.locator("main .loading")).toBeVisible();
  release();
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.unroute("**/api/analytics?*");
  let failures = 0;
  await page.route("**/api/analytics?*", async (route) => {
    if (failures++ === 0) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated analytics outage" }),
      });
    } else {
      await route.continue();
    }
  });
  await page.getByLabel("Reporting period").selectOption("30");
  await expect(
    page.getByText("Simulated analytics outage", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".kpi-value").first()).toBeVisible();
});

test("complete demo lead, draft, pipeline and follow-up workflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "A clearer view. A smarter next move." }),
  ).toBeVisible();
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.getByRole("link", { name: "Add lead", exact: true }).click();
  await page.getByLabel("Full name *").fill("Portfolio Test Buyer");
  await page.getByLabel("Email address *").fill("portfolio-test@example.com");
  await page
    .getByLabel("Company", { exact: true })
    .fill("Fictional Test Studio");
  await page.getByLabel("Estimated budget (INR)").fill("150000");
  await page
    .getByLabel("Project inquiry *")
    .fill(
      "We need a proposal for an AI automation project. We want to launch in six weeks and would like to discuss the full scope.",
    );
  await page.getByRole("button", { name: "Create lead", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio Test Buyer", exact: true }),
  ).toBeVisible();
  const url = page.url();
  await expect(page.getByText("A score you can explain")).toBeVisible();
  await page.getByRole("button", { name: "Edit lead", exact: true }).click();
  await page
    .getByLabel("Company", { exact: true })
    .fill("Updated Fictional Studio");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Updated Fictional Studio").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate draft", exact: true })
    .click();
  await expect(page.getByLabel("Draft message")).toHaveValue(/Thank you/);
  await page
    .getByLabel("Draft message")
    .fill(
      "Hello, thank you for your inquiry. Could we confirm the project scope?",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page
    .getByRole("button", { name: "Approve draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("No message was sent");
  await page
    .getByLabel("Stage for Portfolio Test Buyer")
    .selectOption("Qualified");
  await expect(page.locator(".heading-line .badge").first()).toHaveText(
    "Qualified",
  );
  await page.getByRole("button", { name: "Follow-ups", exact: true }).click();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByLabel("Task title").fill("Portfolio follow-up");
  await page
    .getByLabel("Due date & time (Asia/Kolkata)")
    .fill("2026-12-10T11:30");
  await page
    .getByRole("button", { name: "Schedule follow-up", exact: true })
    .click();
  await expect(
    page.getByText("Portfolio follow-up", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete Portfolio follow-up", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reopen Portfolio follow-up",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Updated Fictional Studio").first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.locator(".kpi-value").first()).toHaveText("161");
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search leads", exact: true })
    .fill("Portfolio Test");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto(url);
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Archive", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("capture, duplicate error, filter empty state and pipeline keyboard movement", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.goto("/capture");
  await page.getByLabel("Full name *").fill("Capture Test");
  await page.getByLabel("Email address *").fill("capture@example.com");
  await page
    .getByLabel("Project inquiry *")
    .fill(
      "We need a website proposal for our fictional business in six weeks.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit test inquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Your inquiry has a home." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit another" }).click();
  await page.getByLabel("Full name *").fill("Capture Test");
  await page.getByLabel("Email address *").fill("capture@example.com");
  await page
    .getByLabel("Project inquiry *")
    .fill(
      "We need a website proposal for our fictional business in six weeks.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit test inquiry" }).click();
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "already exists",
  );
  await page.goto("/pipeline");
  await page
    .getByRole("textbox", { name: "Search pipeline" })
    .fill("Capture Test");
  await page.getByLabel("Stage for Capture Test").selectOption("Contacted");
  await expect(
    page
      .locator(".kanban-column")
      .filter({ has: page.getByText("Contacted", { exact: true }).first() })
      .getByRole("heading", { name: "Capture Test" }),
  ).toBeVisible();
  await page.goto("/leads");
  await page
    .getByRole("textbox", { name: "Search leads", exact: true })
    .fill("nonexistentzzzz");
  await expect(
    page.getByRole("heading", { name: "No leads found" }),
  ).toBeVisible();
});

test("private sign up, empty dashboard, logout and login", async ({ page }) => {
  const email = `owner-${Date.now()}@example.com`;
  await page.goto("/login");
  await page
    .getByRole("button", { name: "New here? Create a private workspace" })
    .click();
  await page.getByLabel("Your name").fill("Test Owner");
  await page.getByLabel("Workspace name").fill("Private Test Workspace");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-with-12-characters");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.locator(".kpi-value").first()).toHaveText("0");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Every inquiry has potential/ }),
  ).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-with-12-characters");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".kpi-value").first()).toHaveText("0");
});

test("responsive views, navigation and actual portfolio screenshots", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.locator(".recharts-area").first().waitFor();
  const output = path.resolve("../docs/screenshots");
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync("public/screenshots", { recursive: true });
  await page.screenshot({
    path: path.join(output, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: "public/screenshots/dashboard.png",
    fullPage: true,
  });
  for (const route of [
    "/leads",
    "/pipeline",
    "/ai-assistant",
    "/follow-ups",
    "/analytics",
    "/automations",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main .loading")).toHaveCount(0);
  }
  await page.goto("/leads");
  await expect(page.locator(".overview-stat")).toHaveCount(6);
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.locator(".priority-lead")).toHaveCount(6);
  await page.screenshot({
    path: path.join(output, "leads-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await expect
    .poll(async () => {
      const box = await page.locator(".sidebar").boundingBox();
      return box ? box.x + box.width : 0;
    })
    .toBeLessThanOrEqual(0);
  await page.screenshot({
    path: path.join(output, "leads-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("/dashboard");
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.screenshot({
    path: path.join(output, "dashboard-tablet.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
  await page.goto("/dashboard");
  await expect(page.locator(".kpi-value").first()).toHaveText("160");
  await page.screenshot({
    path: path.join(output, "dashboard-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(output, "landing-desktop.png"),
    fullPage: true,
  });
});
