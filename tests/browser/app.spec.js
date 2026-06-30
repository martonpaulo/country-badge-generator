import {
  expect,
  test
} from "@playwright/test";

const testedCountries = [
  { name: "Paraguay", code: "PY" },
  { name: "Brazil", code: "BR" },
  { name: "Spain", code: "ES" }
];

async function installDiagnostics(page) {
  const diagnostics = {
    consoleErrors: [],
    failedRequests: []
  };

  page.on("console", message => {
    if (["error", "warning"].includes(message.type())) {
      diagnostics.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", error => {
    diagnostics.consoleErrors.push(error.message);
  });

  page.on("requestfailed", request => {
    diagnostics.failedRequests.push(
      `${request.failure()?.errorText ?? "failed"} ${request.url()}`
    );
  });

  page.on("response", response => {
    if (response.status() >= 400) {
      diagnostics.failedRequests.push(
        `${response.status()} ${response.url()}`
      );
    }
  });

  return diagnostics;
}

async function openApp(page) {
  await page.goto("./", {
    waitUntil: "networkidle"
  });
  await expect(page.locator("#country-search")).toBeEnabled();
}

async function searchCountry(page, query) {
  const input = page.locator("#country-search");

  await input.fill(query);
  await expect(page.locator("#country-options")).toBeVisible();
}

async function selectCountry(page, query, code) {
  await searchCountry(page, query);

  const option = page.locator("#country-options [role='option']").filter({
    hasText: code
  }).first();

  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator(".palette-option")).toHaveCount(3);
  await expect(page.locator("#output-name")).toHaveText(`${code}.svg`);
}

async function downloadCurrentFile(page) {
  return Promise.all([
    page.waitForEvent("download"),
    page.locator("#download-button").click()
  ]).then(([downloadEvent]) => downloadEvent);
}

async function getPaletteHexes(page) {
  return page.locator(".palette-hex").evaluateAll(elements =>
    elements.map(element => element.textContent.trim())
  );
}

async function assertDropdownIsAboveContent(page) {
  const result = await page.evaluate(() => {
    const list = document.querySelector("#country-options");
    const rect = list.getBoundingClientRect();
    const style = getComputedStyle(list);
    const pointX = rect.left + Math.min(24, rect.width / 2);
    const pointY = rect.top + Math.min(24, rect.height / 2);
    const topElement = document.elementFromPoint(pointX, pointY);

    return {
      visible: rect.width > 0 && rect.height > 0,
      zIndex: Number(style.zIndex),
      topElementIsDropdown:
        topElement === list ||
        Boolean(topElement?.closest("#country-options")),
      withinViewport:
        rect.left >= 0 &&
        rect.right <= window.innerWidth &&
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight
    };
  });

  expect(result.visible).toBe(true);
  expect(result.zIndex).toBeGreaterThanOrEqual(80);
  expect(result.topElementIsDropdown).toBe(true);
  expect(result.withinViewport).toBe(true);
}

test("combobox opens, filters, rejects free text, and supports keyboard and pointer selection", async ({ page }) => {
  const diagnostics = await installDiagnostics(page);
  await openApp(page);

  const input = page.locator("#country-search");

  await input.focus();
  await expect(page.locator("#country-options")).toBeVisible();
  await assertDropdownIsAboveContent(page);

  await input.fill("zzzzzz");
  await expect(page.locator(".country-no-results")).toHaveText("No countries found.");

  await input.fill("Paraguay");
  await expect(page.locator("#country-options [role='option']").first()).toContainText("PY");

  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /country-option-/);

  await input.press("ArrowUp");
  await expect(input).toHaveAttribute("aria-activedescendant", /country-option-/);

  await input.press("Escape");
  await expect(page.locator("#country-options")).toBeHidden();

  await input.fill("Brazil");
  await page.mouse.click(10, 10);
  await expect(page.locator("#country-options")).toBeHidden();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#output-name")).toHaveText("--");

  await input.fill("PY");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#output-name")).toHaveText("PY.svg");
  await expect(page.locator(".palette-option")).toHaveCount(3);

  await page.locator("#clear-search").click();
  await expect(input).toHaveValue("");
  await expect(page.locator("#output-name")).toHaveText("--");
  await expect(page.locator("#download-button")).toBeDisabled();

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
});

test("generates deterministic palettes, previews every option, and downloads self-contained SVGs", async ({ page }) => {
  const diagnostics = await installDiagnostics(page);
  await openApp(page);

  for (const country of testedCountries) {
    await selectCountry(page, country.name, country.code);

    const hexes = await getPaletteHexes(page);
    expect(hexes).toHaveLength(3);
    expect(new Set(hexes).size).toBe(3);

    for (const hex of hexes) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }

    const distances = await page.evaluate(async colors => {
      const { colorDistance } = await import("./js/palette.js");
      const parse = hex => ({
        r: Number.parseInt(hex.slice(1, 3), 16),
        g: Number.parseInt(hex.slice(3, 5), 16),
        b: Number.parseInt(hex.slice(5, 7), 16)
      });

      return colors.flatMap((first, firstIndex) =>
        colors.slice(firstIndex + 1).map(second =>
          colorDistance(parse(first), parse(second))
        )
      );
    }, hexes);

    expect(Math.min(...distances)).toBeGreaterThan(0.07);

    const previewColors = [];

    for (let index = 0; index < 3; index += 1) {
      await page.locator(".palette-option").nth(index).click();
      await expect(page.locator(".palette-option").nth(index)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#selected-color")).toHaveText(hexes[index]);

      const previewColor = await page.locator("#preview-canvas > svg rect").getAttribute("fill");
      previewColors.push(previewColor);
    }

    expect(previewColors).toEqual(hexes);

    const download = await downloadCurrentFile(page);

    expect(download.suggestedFilename()).toBe(`${country.code}.svg`);

    const path = await download.path();
    const svgText = await import("node:fs/promises").then(fs =>
      fs.readFile(path, "utf8")
    );

    expect(svgText).toContain('viewBox="0 0 1024 1024"');
    expect(svgText).toContain(`fill="${hexes[2]}"`);
    expect(svgText).toContain('width="558"');
    expect(svgText).toContain('height="351"');
    expect(svgText).toContain("data:image/svg+xml;base64,");
    expect(svgText).not.toMatch(/href="https?:\/\//);
  }

  await page.locator("#clear-search").click();
  await selectCountry(page, "Brazil", "BR");

  await page.getByLabel("PNG").check();
  await expect(page.locator("#output-name")).toHaveText("BR.png");
  await expect(page.locator("#download-label")).toHaveText("Download PNG");

  const pngDownload = await downloadCurrentFile(page);
  expect(pngDownload.suggestedFilename()).toBe("BR.png");

  const pngPath = await pngDownload.path();
  const pngBytes = await import("node:fs/promises").then(fs =>
    fs.readFile(pngPath)
  );

  expect(pngBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.getByLabel("JPG").check();
  await expect(page.locator("#output-name")).toHaveText("BR.jpg");
  await expect(page.locator("#download-label")).toHaveText("Download JPG");

  const jpgDownload = await downloadCurrentFile(page);
  expect(jpgDownload.suggestedFilename()).toBe("BR.jpg");

  const jpgPath = await jpgDownload.path();
  const jpgBytes = await import("node:fs/promises").then(fs =>
    fs.readFile(jpgPath)
  );

  expect(jpgBytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  await page.getByLabel("SVG").check();

  await page.locator("#clear-search").click();
  await selectCountry(page, "Brazil", "BR");
  const firstBrazil = await getPaletteHexes(page);
  await page.locator("#clear-search").click();
  await selectCountry(page, "BR", "BR");
  expect(await getPaletteHexes(page)).toEqual(firstBrazil);

  await page.locator("#clear-search").click();
  await selectCountry(page, "Paraguay", "PY");
  const firstParaguay = await getPaletteHexes(page);
  await page.locator("#clear-search").click();
  await selectCountry(page, "PY", "PY");
  expect(await getPaletteHexes(page)).toEqual(firstParaguay);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
});

test("layout remains usable at desktop and mobile viewports", async ({ page, viewport }) => {
  await openApp(page);
  await searchCountry(page, "Paraguay");
  await assertDropdownIsAboveContent(page);
  await page.locator("#country-options [role='option']").first().click();
  await expect(page.locator(".palette-option")).toHaveCount(3);

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    downloadVisible: (() => {
      const rect = document.querySelector("#download-button").getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    })(),
    previewVisible: (() => {
      const rect = document.querySelector("#preview-canvas").getBoundingClientRect();
      return rect.width >= 280 && rect.height >= 280 && rect.top < window.innerHeight && rect.bottom > 0;
    })()
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);

  if (viewport.width >= 940) {
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
    expect(metrics.downloadVisible).toBe(true);
    expect(metrics.previewVisible).toBe(true);
  } else {
    await page.locator("#preview-canvas").scrollIntoViewIfNeeded();
    await expect(page.locator("#preview-canvas")).toBeInViewport();
    await page.locator("#download-button").scrollIntoViewIfNeeded();
    await expect(page.locator("#download-button")).toBeInViewport();

    const touchTargets = await page.locator(".button, #country-search, .palette-option").evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height
        };
      })
    );

    expect(touchTargets.every(rect => rect.height >= 44)).toBe(true);
  }
});
