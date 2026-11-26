const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const base = process.env.BASE_URL || "http://127.0.0.1:8928";

(async () => {
  const { Match } = await import("../juegos/bio-lab-defense/engine.js");
  const model = new Match(1, null, { fixedLayout: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });

  try {
    for (const width of [320, 1280]) {
      const mobile = width === 320;
      const page = await browser.newPage({ viewport: { width, height: 850 }, isMobile: mobile, hasTouch: mobile });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route(url => !url.href.startsWith(base), route => route.abort());
      await page.goto(base + "/juegos/bio-lab-defense/");
      await page.locator("#campaign-button").click();
      await page.locator(".level").first().click();
      await page.locator("#briefing-build-sites").getByText(new RegExp(`${model.buildSites.length} puestos de construcción`)).waitFor();
      await page.locator("#launch-mission").click();

      const board = page.locator("#board");
      const touchBoard = async (x, y) => {
        const bounds = await board.boundingBox();
        const position = { x: (bounds.width - 2) * x / 900, y: (bounds.height - 2) * y / 540 };
        await (mobile ? board.tap({ position }) : board.click({ position }));
      };
      const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("biolab_checkpoint:guest")));
      const status = page.locator("#board-status");
      const budget = Number(await page.locator("#atp").textContent());

      await page.getByRole("button", { name: "Ver posición sugerida" }).click();
      await page.getByRole("button", { name: /Instalar Nano-Láser en la posición sugerida/ }).waitFor();
      await page.getByRole("button", { name: "Quitar marcador" }).click();
      assert.equal(Number(await page.locator("#atp").textContent()), budget);

      await touchBoard(...model.routes[0].points[2]);
      await status.getByText("Construye en un puesto libre.").waitFor();
      assert.equal(Number(await page.locator("#atp").textContent()), budget);

      const [first, second] = model.buildSites;
      await touchBoard(first.x + 6, first.y + 4);
      await status.getByText("Nano-Láser instalada.").waitFor();
      const built = await saved();
      assert.equal(built.fixedLayout, true);
      assert.deepEqual([built.towers[0].x, built.towers[0].y], [first.x, first.y]);
      assert.equal(built.atp, budget - 50);

      await touchBoard(first.x, first.y);
      await page.locator("#relocate-tower").click();
      await touchBoard(second.x + 5, second.y + 5);
      await status.getByText("Nano-Láser reubicada.").waitFor();
      const moved = await saved();
      assert.deepEqual([moved.towers[0].x, moved.towers[0].y], [second.x, second.y]);
      assert.equal(moved.atp, built.atp);

      await page.reload();
      await page.locator("#home-resume-run").click();
      assert.match(await board.getAttribute("aria-label"), /saltar entre puestos/);
      assert.deepEqual((await saved()).towers, moved.towers);
      assert.equal(await page.locator("#tower-limit").textContent(), `${model.buildSites.length - 1} puestos libres`);
      if (!mobile) {
        await page.locator('#dock [data-type="nanolaser"]').click();
        await board.focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Enter");
        await status.getByText("Nano-Láser instalada.").waitFor();
        const keyboardBuild = (await saved()).towers[1];
        assert.ok(model.buildSites.some(site => site.x === keyboardBuild.x && site.y === keyboardBuild.y));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator("#next").click();
      await page.locator("#wave").getByText("1/4", { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Fixed construction, relocation, and checkpoint passed at ${width}px.`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
