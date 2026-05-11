import type { Page } from "@playwright/test";
import {
    Eyes,
    VisualGridRunner,
    Target,
    BrowserType,
} from "@applitools/eyes-playwright";

const APIKEY = process.env.APIKEY_APPLITOOLS || process.env.APPLITOOLS_API_KEY || null;

/**
 * Realiza una comprobación visual con Applitools si la API key está disponible.
 * En el plan gratuito puede tardar más; si no hay API key, la función es noop.
 */
export async function visualCheck(page: Page, tag: string): Promise<void> {
    if (!APIKEY) {
        // No hay API key configurada: saltar visual checks
        // eslint-disable-next-line no-console
        console.warn("Applitools API key not found — skipping visual check");
        return;
    }

    const runner = new VisualGridRunner({ testConcurrency: 5 });
    const eyes = new Eyes(runner);

    const cfg = eyes.getConfiguration();
    cfg.setApiKey(APIKEY);
    cfg.setAppName("front-ai-ticket-sys");
    cfg.setTestName(tag);
    cfg.setViewportSize({ width: 1280, height: 720 });
    cfg.addBrowser(1200, 800, BrowserType.CHROME);
    eyes.setConfiguration(cfg);

    try {
        await eyes.open(page);
        await eyes.check(tag, Target.window().fully());
        await eyes.close();
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Applitools visual check failed:", err);
        try {
            await eyes.abort();
        } catch (_) {
            // ignore
        }
    }
}

export default visualCheck;
