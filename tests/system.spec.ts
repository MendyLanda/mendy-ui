import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function open(page: Page, name: string) {
  await page.getByRole("button", { name: "Open filters" }).first().click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
async function paste(page: Page, value: string) {
  await page.getByRole("searchbox", { name: "Search references" }).evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData("text", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, value);
}
async function values(page: Page, label = "Dynamic filter values") {
  return JSON.parse((await page.locator(`pre[aria-label="${label}"]`).textContent()) ?? "{}");
}

test("recognized input bypasses the menu and can still be edited through its chip", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Open filters" }).first().click();
  for (const name of ["Issue ID", "Email", "Ticket", "Reference"])
    await expect(page.getByRole("menuitem", { name, exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const search = page.getByRole("searchbox", { name: "Search references" });
  await search.fill("issue-123, alex@example.com, remaining");
  await search.press("Enter");
  await expect(search).toHaveValue("remaining");
  await expect.poll(async () => (await values(page)).issueId).toEqual(["ISSUE-123"]);
  await expect.poll(async () => (await values(page)).email).toEqual(["alex@example.com"]);
  await page.getByRole("button", { name: "Edit Issue ID filter" }).click();
  const editor = page.getByRole("textbox", { name: "Issue ID", exact: true });
  await expect(editor).toBeFocused();
  await editor.fill("ISSUE-124, ISSUE-125");
  await editor.press("Enter");
  await expect.poll(async () => (await values(page)).issueId).toEqual(["ISSUE-124", "ISSUE-125"]);
  await page.getByRole("button", { name: "Remove Issue ID filter" }).click();
  await expect.poll(async () => (await values(page)).issueId).toBe(null);
});

test("the issue table filters recognized IDs entered in search", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search issues" });
  await search.fill("ui-039");
  await search.press("Enter");
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: "Edit Issue ID filter" })).toContainText("UI-039");
  await expect(page.getByRole("status").filter({ hasText: "of 8 issues" })).toContainText(
    "1 of 8 issues",
  );
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "of 8 issues" })).toContainText(
    "1 of 8 issues",
  );
});

test("calendar selection applies immediately with keyboard navigation and theme radius", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  await page.clock.setFixedTime(new Date("2026-09-07T12:00:00"));
  for (const dark of [false, true]) {
    if (dark) await page.getByRole("button", { name: "Toggle color theme" }).click();
    for (const radius of [0, 12]) {
      await page.evaluate(
        (radius) => document.documentElement.style.setProperty("--radius", `${radius}px`),
        radius,
      );
      const search = page.getByRole("searchbox", { name: "Search references" });
      await expect(search).toHaveCSS("border-radius", `${Math.max(0, radius - 2)}px`);
      await expect(page.locator('[data-slot="filter-suggestion"]').first()).toHaveCSS(
        "border-radius",
        `${Math.max(0, radius - 2)}px`,
      );
      await expect(page.getByRole("checkbox", { name: "Close menu after applying" })).toHaveCSS(
        "border-radius",
        `${Math.max(0, radius - 4)}px`,
      );
      await open(page, "Created date");
      const calendar = page.locator('[data-slot="calendar"]');
      const first = calendar.getByRole("button", { name: /Tuesday, September 1st, 2026/ });
      await first.focus();
      await first.press("ArrowRight");
      const second = calendar.getByRole("button", { name: /Wednesday, September 2nd, 2026/ });
      await expect(second).toBeFocused();
      await second.press("Enter");
      await expect
        .poll(async () => (await values(page)).created)
        .toEqual({ from: "2026-09-02", to: "2026-09-02" });
      await expect(second).toHaveCSS("border-radius", `${Math.max(0, radius - 2)}px`);
      const bounds = await calendar.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.evaluate(() =>
        Promise.allSettled(
          document
            .getAnimations()
            .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
            .map((animation) => animation.finished),
        ),
      );
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      await expect(page.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
      await expect
        .poll(async () => (await values(page)).created)
        .toEqual({ from: "2026-09-02", to: "2026-09-02" });
      await page.getByRole("button", { name: "Clear date", exact: true }).click();
      await expect.poll(async () => (await values(page)).created).toBe(null);
      await page.keyboard.press("Escape");
    }
  }
});

test("suggestions apply and stay open, then URL values survive a reload", async ({ page }) => {
  await page.goto("/?tab=retained");
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Apply Status filter" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Todo", exact: true })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "In progress", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("status")).toBe("in-progress");
  expect(new URL(page.url()).searchParams.get("tab")).toBe("retained");
  await page.reload();
  await expect(page.getByRole("button", { name: "Edit Status filter" })).toContainText(
    "In progress",
  );
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("button", { name: "Apply Status filter" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("status")).toBe(null);
});

test("text drafts stay out of the URL until Enter", async ({ page }) => {
  await page.goto("/");
  await open(page, "Title");
  const input = page.getByRole("textbox", { name: "Title contains" });
  await input.fill("keyboard");
  expect(new URL(page.url()).searchParams.has("title")).toBe(false);
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("title")).toBe("keyboard");
  await page.reload();
  await expect(page.getByRole("button", { name: "Edit Title filter" })).toContainText("keyboard");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("title")).toBe(null);
});

test("remote options resolve URL labels independently and load further pages", async ({ page }) => {
  await page.goto("/docs/advanced?owner=%5B%22sam%22%5D");
  await expect(page.getByRole("button", { name: "Edit Owner filter" })).toContainText("Sam Cohen");
  await open(page, "Owner");
  await expect(page.getByRole("menuitemcheckbox", { name: "Alex Rivera" })).toBeVisible();
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Sam Cohen" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await values(page)).owner).toEqual(["sam"]);
});

test("remote search retries failures and uses the latest query", async ({ page }) => {
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Fail next option request" }).click();
  await open(page, "Owner");
  await expect(page.getByRole("alert").filter({ hasText: "example request failed" })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Alex Rivera" })).toBeVisible();
  const input = page.getByRole("searchbox", { name: "Search owner" });
  await input.fill("alex");
  await page.waitForTimeout(225);
  await input.fill("sam");
  await expect(page.getByRole("menuitemcheckbox", { name: "Sam Cohen" })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "Alex Rivera" })).toHaveCount(0);
});

test("paste merges recognized tokens, keeps text, and asks about ambiguity", async ({ page }) => {
  await page.goto("/docs/advanced");
  await page.getByRole("searchbox", { name: "Search references" }).fill("existing");
  await paste(page, "ISSUE-123,ISSUE-123\nalex@example.com\tremaining\n#123");
  await expect.poll(async () => (await values(page)).issueId).toEqual(["ISSUE-123"]);
  await expect.poll(async () => (await values(page)).email).toEqual(["alex@example.com"]);
  await expect(page.getByRole("searchbox", { name: "Search references" })).toHaveValue(
    "existing remaining #123",
  );
  await page.getByRole("button", { name: "Ticket", exact: true }).click();
  await expect.poll(async () => (await values(page)).ticket).toEqual(["#123"]);
  await expect(page.getByRole("searchbox", { name: "Search references" })).toHaveValue(
    "existing remaining",
  );
});

test("URL takes precedence over remembered filters and clear removes remembered state", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Apply Owner filter" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => new URL(page.url()).searchParams.get("owner")).toBe('["mendy"]');
  await page.goto("/docs/advanced");
  await expect(page.getByRole("button", { name: "Edit Owner filter" })).toContainText(
    "Mendy Landa",
  );
  await page.goto("/docs/advanced?owner=%5B%22alex%22%5D");
  await expect(page.getByRole("button", { name: "Edit Owner filter" })).toContainText(
    "Alex Rivera",
  );
  await page.getByRole("button", { name: "Clear all" }).first().click();
  await page.goto("/docs/advanced");
  await expect(page.getByRole("button", { name: "Edit Owner filter" })).toHaveCount(0);
});

test("large pasted selections survive reload and do not pretend to be shareable", async ({
  page,
  context,
}) => {
  await page.goto("/docs/advanced");
  const ids = Array.from({ length: 100 }, (_, index) => `ISSUE-${12300 + index}`);
  await paste(page, ids.join("\n"));
  await expect.poll(() => new URL(page.url()).searchParams.has("_advanced")).toBe(true);
  await expect(
    page.getByText("This selection is saved in this browser session.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect.poll(async () => (await values(page)).issueId).toEqual(ids);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByText("This link refers to filters saved in another browser session.", {
      exact: false,
    }),
  ).toBeVisible();
  await other.close();
});

test("composite dates update both state keys and saved view drafts remain independent", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Project filters", exact: true });
  await page.clock.setFixedTime(new Date("2026-09-07T12:00:00"));
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Created date", exact: true }).click();
  const calendar = page.locator('[data-slot="calendar"]');
  await calendar.getByRole("button", { name: /Tuesday, September 1st, 2026/ }).click();
  await calendar.getByRole("button", { name: /Sunday, September 6th, 2026/ }).click();
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
  await expect
    .poll(() => values(page, "Project filters values"))
    .toMatchObject({ createdAfter: "2026-09-01", createdBefore: "2026-09-06" });
  expect(await values(page, "Saved view draft values")).toMatchObject({
    createdAfter: null,
    createdBefore: null,
  });
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");
  await lines.getByRole("button", { name: "Edit Created date filter" }).click();
  await calendar.getByRole("button", { name: /Monday, September 7th, 2026/ }).click();
  await expect
    .poll(() => values(page, "Project filters values"))
    .toMatchObject({ createdAfter: "2026-09-01", createdBefore: "2026-09-07" });
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");
  await lines.getByRole("button", { name: "Remove Created date filter" }).click();
  await expect
    .poll(() => values(page, "Project filters values"))
    .toMatchObject({ createdAfter: null, createdBefore: null });
});

test("grouped tags enforce mutually exclusive values and custom members retain their editor", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Project filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Tags", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Priority", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "No tags", exact: true }).click();
  await expect
    .poll(() => values(page, "Project filters values"))
    .toMatchObject({ tagId: null, hasTag: "without" });
  await page.keyboard.press("Escape");
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Members", exact: true }).click();
  await page.getByRole("checkbox", { name: "Alex Rivera" }).check();
  await page.getByRole("checkbox", { name: "Jordan Lee" }).check();
  await page.keyboard.press("Escape");
  await expect(lines.getByRole("button", { name: "Edit Members filter" })).toContainText(
    "Design team",
  );
  await lines.getByRole("button", { name: "Edit Members filter" }).click();
  await expect(page.getByRole("checkbox", { name: "Alex Rivera" })).toBeChecked();
});

test("clearing the last suggested selection closes its editor", async ({ page }) => {
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Apply Owner filter" }).click();
  await page.getByRole("searchbox", { name: "Search owner" }).fill("mendy");
  await page.getByRole("menuitemcheckbox", { name: "Mendy Landa" }).click();
  await expect(page.getByRole("button", { name: "Apply Owner filter" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search owner" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open filters" }).first()).toBeFocused();
});

test("empty number ranges disappear and invalid ranges explain the error", async ({ page }) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Project filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Team size", exact: true }).click();
  await page.getByLabel("Minimum", { exact: true }).fill("5");
  await page.getByLabel("Maximum", { exact: true }).fill("2");
  await expect(page.getByRole("alert")).toContainText("Minimum must not exceed maximum");
  await expect
    .poll(async () => (await values(page, "Project filters values")).teamSize)
    .toEqual([5, null]);
  await page.getByLabel("Maximum", { exact: true }).fill("");
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Minimum", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lines.getByRole("button", { name: "Edit Team size filter" })).toContainText(
    "5 – Any",
  );
  await lines.getByRole("button", { name: "Edit Team size filter" }).click();
  await page.getByLabel("Minimum", { exact: true }).fill("");
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
  await expect(lines.getByRole("button", { name: "Edit Team size filter" })).toHaveCount(0);
  await expect.poll(async () => (await values(page, "Project filters values")).teamSize).toBe(null);
});

test("custom member editor applies immediately without a Done button", async ({ page }) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Project filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Members", exact: true }).click();
  await page.getByRole("checkbox", { name: "Alex Rivera" }).check();
  await page.getByRole("checkbox", { name: "Jordan Lee" }).check();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Jordan Lee" })).toBeVisible();
  await expect
    .poll(async () => (await values(page, "Project filters values")).memberId)
    .toEqual(["one", "two"]);
});

test("ordinary and Shift paste remain native, ambiguity preserves longer words", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const search = page.getByRole("searchbox", { name: "Search references" });
  const prevented = async (text: string) =>
    search.evaluate((element, text) => {
      const data = new DataTransfer();
      data.setData("text", text);
      const event = new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }, text);
  expect(await prevented("foo, bar")).toBe(false);
  await search.focus();
  await page.keyboard.down("Shift");
  expect(await prevented("ISSUE-123")).toBe(false);
  await page.keyboard.up("Shift");
  await search.fill("#123 prefix#123suffix");
  await paste(page, "#123");
  await page.getByRole("button", { name: "Ticket", exact: true }).click();
  await expect(search).toHaveValue("#123 prefix#123suffix");
});

test("browser history restores ordinary and overflow states", async ({ page }) => {
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Apply Owner filter" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => new URL(page.url()).searchParams.get("owner")).toBe('["mendy"]');
  const ids = Array.from({ length: 100 }, (_, i) => `ISSUE-${12300 + i}`);
  await paste(page, ids.join("\n"));
  await expect.poll(() => new URL(page.url()).searchParams.has("_advanced")).toBe(true);
  const first = page.url();
  await paste(page, "ISSUE-999");
  await expect.poll(() => page.url()).not.toBe(first);
  await page.goBack();
  await expect.poll(async () => (await values(page)).issueId).toEqual(ids);
  await page.goBack();
  await expect.poll(async () => (await values(page)).issueId).toBe(null);
  await expect(page.getByRole("link", { name: "Link to these filters" })).toBeVisible();
  await page.goForward();
  await expect.poll(async () => (await values(page)).issueId).toEqual(ids);
  await page.getByRole("button", { name: "Remove Issue ID filter" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has("_advanced")).toBe(false);
  await expect(page.getByRole("link", { name: "Link to these filters" })).toBeVisible();
});

test("failed session storage still allows a complete URL link", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Unavailable");
    };
  });
  await page.goto("/docs/advanced");
  await page.getByRole("button", { name: "Apply Owner filter" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Filters could not be saved in this browser.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Link to these filters" })).toHaveAttribute(
    "href",
    /owner=/,
  );
});

test("changing dependent options retains the selected plan and its label", async ({ page }) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Project filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Project", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Website", exact: true }).click();
  await page.keyboard.press("Escape");
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Workspace", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Engineering", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(lines.getByRole("button", { name: "Edit Project filter" })).toContainText("Website");
  await lines.getByRole("button", { name: "Edit Project filter" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "API", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "Website", exact: true })).toHaveCount(0);
  await expect
    .poll(async () => (await values(page, "Project filters values")).projectId)
    .toEqual(["design-web"]);
});

test("chip summaries truncate without losing selected values or accessible descriptions", async ({
  page,
}) => {
  const owners = ["alex", "jordan", "mendy", "sam", "taylor"];
  const issueId = ["ISSUE-123", "ISSUE-124", "ISSUE-125"];
  const params = new URLSearchParams({
    owner: JSON.stringify(owners),
    issueId: JSON.stringify(issueId),
  });
  await page.goto(`/docs/advanced?${params}`);
  const owner = page.getByRole("button", { name: "Edit Owner filter" });
  await expect(owner).toContainText("Alex Rivera, Jordan Lee and 3 more");
  await expect(owner).toHaveAccessibleDescription(
    "Alex Rivera, Jordan Lee, Mendy Landa, Sam Cohen, Taylor Morgan",
  );
  const chip = page.getByRole("button", { name: "Edit Issue ID filter" });
  await expect(chip.locator("span.truncate")).toHaveCSS("text-overflow", "ellipsis");
  await expect(chip).toHaveAccessibleDescription(issueId.join(", "));
  await expect.poll(async () => (await values(page)).owner).toEqual(owners);
});

test("single and text filters can be applied without reopening the filter menu", async ({
  page,
}) => {
  await page.goto("/");
  await open(page, "Status");
  const todo = page.getByRole("menuitemradio", { name: "Todo", exact: true });
  await todo.click();
  await expect(todo).toBeChecked();
  await todo.press("ArrowLeft");
  await page.getByRole("menuitem", { name: "Title", exact: true }).click();
  await page.getByRole("textbox", { name: "Title contains" }).fill("keyboard");
  await page.getByRole("textbox", { name: "Title contains" }).press("Enter");
  await expect(page.getByRole("textbox", { name: "Title contains" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("title")).toBe("keyboard");
  expect(new URL(page.url()).searchParams.get("status")).toBe("todo");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open filters" })).toBeFocused();
});

test("closing after applying is configurable for dates and multiselects", async ({ page }) => {
  await page.goto("/docs/advanced");
  await page.getByRole("checkbox", { name: "Close menu after applying" }).check();
  await page.clock.setFixedTime(new Date("2026-09-07T12:00:00"));
  await open(page, "Created date");
  await page
    .locator('[data-slot="calendar"]')
    .getByRole("button", { name: /Tuesday, September 1st, 2026/ })
    .click();
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);
  await expect
    .poll(async () => (await values(page)).created)
    .toEqual({ from: "2026-09-01", to: "2026-09-01" });
  await open(page, "Owner");
  await page.getByRole("menuitemcheckbox", { name: "Alex Rivera", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search owner" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Owner filter" })).toContainText(
    "Alex Rivera",
  );
});

test("suggestions keep their positions when applied and return when removed", async ({ page }) => {
  await page.goto("/");
  const status = page.getByRole("button", { name: "Apply Status filter" });
  const assignee = page.getByRole("button", { name: "Apply Assignee filter" });
  const before = await assignee.boundingBox();
  await status.click();
  await expect(
    page.getByRole("button", { name: "Apply Assignee filter", includeHidden: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect((await assignee.boundingBox())?.y).toBe(before?.y);
  await assignee.click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Mendy", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove Status filter" }).click();
  await expect(status).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Assignee filter" })).toContainText("Mendy");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.locator('[data-slot="filter-suggestion"]')).toHaveCount(2);
});
