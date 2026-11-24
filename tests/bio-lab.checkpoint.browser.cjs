const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:8791";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(
      (url) => !url.href.startsWith(base),
      (route) => route.abort(),
    );
    await page.goto(base + "/juegos/bio-lab-defense/");
    await page.locator("#campaign-button").tap();
    await page.locator(".level").first().tap();
    await page.locator("#launch-mission").tap();

    async function tapBoard(x = 170, y = 170) {
      const canvas = page.locator("#board");
      const box = await canvas.boundingBox();
      await canvas.tap({
        position: { x: ((box.width - 2) * x) / 900, y: ((box.height - 2) * y) / 540 },
      });
    }
    const drill = page.getByRole("dialog", { name: "Ensayo de la oleada 1" });
    const beforeDrill = await page.locator("#atp").textContent();
    await page.locator("#run-drill").tap();
    await drill.getByRole("status").getByText(/Núcleo .* % →/).waitFor();
    await drill.getByText(/Entrada A · .*fugas?/).waitFor();
    await drill.getByRole("button", { name: "Volver a preparar" }).tap();
    assert.equal(await page.locator("#atp").textContent(), beforeDrill);
    assert.equal(await page.locator("#wave").textContent(), "0/4");
    await tapBoard();
    await page.locator("#run-drill").tap();
    await drill.getByText(/Ensayo anterior/).waitFor();
    await drill.getByRole("button", { name: "Volver a preparar" }).tap();
    await tapBoard();
    assert.equal(await page.locator("#near-board-selection #selection").isVisible(), true);
    await page.getByText(/Daño 14 → 20 · Alcance 120 → 133/).waitFor();
    await page.getByRole("button", { name: /^Mejorar/ }).tap();
    await page.getByText(/Daño 20 → 46 · Alcance 133 → 146/).waitFor();
    const range = page.getByRole("button", { name: "Ver alcance · Cadencia" });
    const beforePreview = await page.locator("#atp").textContent();
    await range.tap();
    const analysis = page.locator("#placement-analysis");
    await analysis.getByText("Nano-Láser · Cadencia").waitFor();
    assert.match(await analysis.textContent(), /A \d+ → \d+ %/);
    await page.keyboard.press("Escape");
    assert.equal(await range.getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator("#atp").textContent(), beforePreview);
    await range.tap();
    assert.equal(await range.getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: /^Perforante/ }).tap();
    await page.getByLabel("Prioridad de objetivo").selectOption("last");
    const atpBeforeMove = await page.locator("#atp").textContent();
    await page.getByRole("button", { name: "Reubicar gratis" }).tap();
    await page.locator("#board").focus();
    await page.keyboard.press("ArrowRight");
    await analysis.getByText("Nano-Láser · Traslado").waitFor();
    await analysis.getByText(/Trazo discontinuo/).waitFor();
    assert.equal(await page.locator("#atp").textContent(), atpBeforeMove);
    await tapBoard(220, 243);
    await page.locator("#board-status").getByText("Deja despejado el conducto.", { exact: true }).waitFor();
    await tapBoard(330, 255);
    await page.getByText("Nano-Láser reubicada.", { exact: true }).waitFor();
    assert.equal(await page.locator("#atp").textContent(), atpBeforeMove);
    await page.locator("#buy-atp").tap();
    await page.locator("#speed").tap();
    const saved = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("biolab_checkpoint:guest")),
      );
    const before = await saved();
    assert.equal(before.towers[0].rank, 3);
    assert.equal(before.towers[0].targeting, "last");
    assert.ok(before.towers[0].x > 300);
    assert.equal(before.speed, 2);
    assert.equal(before.atpBought, true);
    await page.locator("#next").tap();
    assert.equal(await page.locator("#relocate-tower").count(), 0);
    await page.reload();
    await page.locator("#home-resume-run").tap();
    assert.equal(await page.locator("#wave").textContent(), "0/4");
    assert.equal(await page.locator("#atp").textContent(), String(before.atp));
    assert.equal(await page.locator("#buy-atp").isDisabled(), true);
    assert.equal(await page.locator("#speed").textContent(), "Velocidad ×2");
    assert.deepEqual(await saved(), before);
    await tapBoard(330, 255);
    await page.getByText("Nano-Láser · Nivel 3 · Perforante").waitFor();
    await page.getByText(/Daño infligido · 0 · Bajas 0/).waitFor();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Volver con guardado" }).tap();
    await page.locator(".level").first().tap();
    await page.locator("#launch-mission").tap();
    await page
      .getByRole("heading", { name: "Hay una partida guardada" })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Retomar partida" })
      .tap();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    assert.equal(await saved(), null);
    assert.deepEqual(errors, []);
    console.log(
      "Bio-Lab reload, single-use supplies, tower specialization and safe discard passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
