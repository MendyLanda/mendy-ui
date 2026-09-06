import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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

test("text drafts stay out of the URL until Apply", async ({ page }) => {
  await page.goto("/");
  await open(page, "Title");
  const input = page.getByRole("textbox", { name: "Title contains" });
  await input.fill("keyboard");
  expect(new URL(page.url()).searchParams.has("title")).toBe(false);
  await input.press("Tab");
  await page.keyboard.press("Enter");
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
  await paste(page, "123456789012345,123456789012345\n89123456789012345678\tremaining\n#123");
  await expect.poll(async () => (await values(page)).imei).toEqual(["123456789012345"]);
  await expect.poll(async () => (await values(page)).iccid).toEqual(["89123456789012345678"]);
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
  const ids = Array.from({ length: 100 }, (_, index) => String(123456789012300 + index));
  await paste(page, ids.join("\n"));
  await expect.poll(() => new URL(page.url()).searchParams.has("_advanced")).toBe(true);
  await expect(
    page.getByText("This selection is saved in this browser session.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect.poll(async () => (await values(page)).imei).toEqual(ids);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByText("This link refers to filters saved in another browser session.", {
      exact: false,
    }),
  ).toBeVisible();
  await other.close();
});

test("composite dates update both state keys and sourcing drafts remain independent", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Lines filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Activation date", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-09-01");
  await page.getByLabel("End date", { exact: true }).fill("2026-09-06");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect
    .poll(() => values(page, "Lines filters values"))
    .toMatchObject({ activeStart: "2026-09-01", activeEnd: "2026-09-06" });
  expect(await values(page, "Sourcing draft values")).toMatchObject({
    activeStart: null,
    activeEnd: null,
  });
  await lines.getByRole("button", { name: "Remove Activation date filter" }).click();
  await expect
    .poll(() => values(page, "Lines filters values"))
    .toMatchObject({ activeStart: null, activeEnd: null });
});

test("grouped tags enforce mutually exclusive values and custom companies retain their editor", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Lines filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Tags", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Priority", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "No tags", exact: true }).click();
  await expect
    .poll(() => values(page, "Lines filters values"))
    .toMatchObject({ tagId: null, hasTag: "without" });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Companies", exact: true }).click();
  await page.getByRole("checkbox", { name: "Company One" }).check();
  await page.getByRole("checkbox", { name: "Company Two" }).check();
  await page.keyboard.press("Escape");
  await expect(lines.getByRole("button", { name: "Edit Companies filter" })).toContainText(
    "North vendor",
  );
  await lines.getByRole("button", { name: "Edit Companies filter" }).click();
  await expect(page.getByRole("checkbox", { name: "Company One" })).toBeChecked();
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
  const lines = page.getByRole("region", { name: "Lines filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Member count", exact: true }).click();
  await page.getByLabel("Minimum", { exact: true }).fill("5");
  await page.getByLabel("Maximum", { exact: true }).fill("2");
  await expect(page.getByRole("alert")).toContainText("Minimum must not exceed maximum");
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
  await page.getByLabel("Maximum", { exact: true }).fill("");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(lines.getByRole("button", { name: "Edit Member count filter" })).toContainText(
    "5 – Any",
  );
  await lines.getByRole("button", { name: "Edit Member count filter" }).click();
  await page.getByLabel("Minimum", { exact: true }).fill("");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(lines.getByRole("button", { name: "Edit Member count filter" })).toHaveCount(0);
  await expect
    .poll(async () => (await values(page, "Lines filters values")).groupMemberCount)
    .toBe(null);
});

test("custom editor Apply keeps its latest immediate changes", async ({ page }) => {
  await page.goto("/docs/advanced");
  const lines = page.getByRole("region", { name: "Lines filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Companies", exact: true }).click();
  await page.getByRole("checkbox", { name: "Company One" }).check();
  await page.getByRole("checkbox", { name: "Company Two" }).check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect
    .poll(async () => (await values(page, "Lines filters values")).vendorCompanyId)
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
  expect(await prevented("123456789012345")).toBe(false);
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
  const ids = Array.from({ length: 100 }, (_, i) => String(123456789012300 + i));
  await paste(page, ids.join("\n"));
  await expect.poll(() => new URL(page.url()).searchParams.has("_advanced")).toBe(true);
  const first = page.url();
  await paste(page, "123456789012999");
  await expect.poll(() => page.url()).not.toBe(first);
  await page.goBack();
  await expect.poll(async () => (await values(page)).imei).toEqual(ids);
  await page.goBack();
  await expect.poll(async () => (await values(page)).imei).toBe(null);
  await expect(page.getByRole("link", { name: "Link to these filters" })).toBeVisible();
  await page.goForward();
  await expect.poll(async () => (await values(page)).imei).toEqual(ids);
  await page.getByRole("button", { name: "Remove IMEI filter" }).click();
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
  const lines = page.getByRole("region", { name: "Lines filters", exact: true });
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Plan", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "North voice", exact: true }).click();
  await page.keyboard.press("Escape");
  await lines.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Carrier", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "South", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(lines.getByRole("button", { name: "Edit Plan filter" })).toContainText(
    "North voice",
  );
  await lines.getByRole("button", { name: "Edit Plan filter" }).click();
  await expect(
    page.getByRole("menuitemcheckbox", { name: "South voice", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitemcheckbox", { name: "North voice", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await values(page, "Lines filters values")).carrierPlanId)
    .toEqual(["north-voice"]);
});

test("chip summaries truncate without losing selected values or accessible descriptions", async ({
  page,
}) => {
  const owners = ["alex", "jordan", "mendy", "sam", "taylor"];
  const imei = ["123456789012345", "123456789012346", "123456789012347"];
  const params = new URLSearchParams({ owner: JSON.stringify(owners), imei: JSON.stringify(imei) });
  await page.goto(`/docs/advanced?${params}`);
  const owner = page.getByRole("button", { name: "Edit Owner filter" });
  await expect(owner).toContainText("Alex Rivera, Jordan Lee and 3 more");
  await expect(owner).toHaveAccessibleDescription(
    "Alex Rivera, Jordan Lee, Mendy Landa, Sam Cohen, Taylor Morgan",
  );
  const chip = page.getByRole("button", { name: "Edit IMEI filter" });
  await expect(chip.locator("span.truncate")).toHaveCSS("text-overflow", "ellipsis");
  await expect(chip).toHaveAccessibleDescription(imei.join(", "));
  await expect.poll(async () => (await values(page)).owner).toEqual(owners);
});
