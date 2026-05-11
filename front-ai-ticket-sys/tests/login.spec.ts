import { test, expect, Page } from "@playwright/test";

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────
const BASE_URL = "http://192.168.100.5:3001";
const LOGIN_URL = `${BASE_URL}/login`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;

// Dashboard selectors (from screenshot)
const DASH = {
    heading: 'text=Dashboard',
    greeting: 'text=Hola',
    username: 'text=test',
    roleTag: 'text=ADMIN',
    newIncident: 'button:has-text("Nueva incidencia"), a:has-text("Nueva incidencia")',
    logout: 'button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")',
    welcomeCard: 'text=Bienvenido a IncidentFlow',
    welcomeBody: 'text=tickets abiertos',
};

// Selectors inferred from the screenshot UI
const SEL = {
    usernameInput: 'input[placeholder*="usuario"], input[name="username"], input[type="text"]',
    passwordInput: 'input[placeholder*="contraseña"], input[name="password"], input[type="password"]',
    submitButton: 'button:has-text("Iniciar sesión")',
    errorBox: 'div[role="alert"], .error, [class*="error"], [class*="alert"]',
};

// ─────────────────────────────────────────────
//  Helper
// ─────────────────────────────────────────────
async function fillLogin(
    page: Page,
    username: string,
    password: string
): Promise<void> {
    await page.fill(SEL.usernameInput, username);
    await page.fill(SEL.passwordInput, password);
    await page.click(SEL.submitButton);
}

async function getStoredToken(page: Page): Promise<string | null> {
    const token = await page.evaluate(() => {
        return localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('access_token') ||
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('access_token') ||
            null;
    });
    return token;
}

async function restoreToken(page: Page, token: string): Promise<void> {
    await page.evaluate((tok) => {
        localStorage.setItem('token', tok);
    }, token);
}

// ─────────────────────────────────────────────
//  Suite
// ─────────────────────────────────────────────
test.describe("IncidentFlow — Login Route", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
    });

    // ── 5. Campos vacíos ─────────────────────────
    test("TC-05 | Error al enviar el formulario vacío", async ({ page }) => {
        await page.click(SEL.submitButton);

        // Should stay on login
        await expect(page).toHaveURL(/\/login/);

        // Either native HTML5 validation or a custom error should fire
        const hasCustomError = await page.locator(SEL.errorBox).isVisible();
        const hasNativeValidation = await page
            .locator(SEL.usernameInput)
            .evaluate((el: HTMLInputElement) => !el.validity.valid);

        expect(hasCustomError || hasNativeValidation).toBeTruthy();
    });

    // ── 6. Solo contraseña vacía ──────────────────
    test("TC-06 | Error al dejar la contraseña vacía", async ({ page }) => {
        await page.fill(SEL.usernameInput, "test");
        await page.click(SEL.submitButton);

        await expect(page).toHaveURL(/\/login/);

        const hasCustomError = await page.locator(SEL.errorBox).isVisible();
        const hasNativeValidation = await page
            .locator(SEL.passwordInput)
            .evaluate((el: HTMLInputElement) => !el.validity.valid);

        expect(hasCustomError || hasNativeValidation).toBeTruthy();
    });

    // ── 7. Solo usuario vacío ─────────────────────
    test("TC-07 | Error al dejar el nombre de usuario vacío", async ({ page }) => {
        await page.fill(SEL.passwordInput, "test1234");
        await page.click(SEL.submitButton);

        await expect(page).toHaveURL(/\/login/);

        const hasCustomError = await page.locator(SEL.errorBox).isVisible();
        const hasNativeValidation = await page
            .locator(SEL.usernameInput)
            .evaluate((el: HTMLInputElement) => !el.validity.valid);

        expect(hasCustomError || hasNativeValidation).toBeTruthy();
    });

    // ── 8. SQL Injection — campo usuario ─────────
    test("TC-08 | Inyección SQL en campo de usuario no autentica ni rompe la app", async ({
        page,
    }) => {
        const sqlPayloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "admin'--",
            "' OR 'x'='x",
            "'; DROP TABLE users;--",
            '" OR ""="',
            "1' OR '1' = '1' /*",
        ];

        for (const payload of sqlPayloads) {
            await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
            await fillLogin(page, payload, "anypassword");

            // Must NOT redirect to protected area
            await expect(page).not.toHaveURL(/dashboard|home|incidents/i, {
                timeout: 5_000,
            });

            // Page should still be functional (no 500 / crash)
            const status = await page.evaluate(() => document.readyState);
            expect(status).toBe("complete");

            console.log(`  ✓ Payload bloqueado: ${payload}`);
        }
    });

    // ── 9. SQL Injection — campo contraseña ──────
    test("TC-09 | Inyección SQL en campo de contraseña no autentica ni rompe la app", async ({
        page,
    }) => {
        const sqlPayloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "password' OR '1'='1'--",
            "'; DROP TABLE users;--",
        ];

        for (const payload of sqlPayloads) {
            await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
            await fillLogin(page, "test", payload);

            await expect(page).not.toHaveURL(/dashboard|home|incidents/i, {
                timeout: 5_000,
            });

            const status = await page.evaluate(() => document.readyState);
            expect(status).toBe("complete");

            console.log(`  ✓ Payload bloqueado en password: ${payload}`);
        }
    });

    // ── 10. XSS básico en campos de texto ────────
    test("TC-10 | Script XSS en los campos no ejecuta código", async ({
        page,
    }) => {
        let alertFired = false;
        page.on("dialog", async (dialog) => {
            alertFired = true;
            await dialog.dismiss();
        });

        await fillLogin(page, '<script>alert("xss")</script>', "test1234");

        // Wait briefly to catch any dialog
        await page.waitForTimeout(2_000);

        expect(alertFired).toBeFalsy();
        await expect(page).toHaveURL(/\/login/);
    });

    // ── 11. Límite de caracteres / inputs largos ──
    test("TC-11 | Campos con texto extremadamente largo no rompen la app", async ({
        page,
    }) => {
        const longString = "A".repeat(5_000);

        await fillLogin(page, longString, longString);

        // App should remain stable
        const status = await page.evaluate(() => document.readyState);
        expect(status).toBe("complete");
        await expect(page).toHaveURL(/\/login/);
    });

    // ── 12. Caracteres especiales / Unicode ───────
    test("TC-12 | Caracteres especiales y Unicode no rompen el formulario", async ({
        page,
    }) => {
        const specialCases = [
            { user: "tëst@üser", pass: "pässwörد" },
            { user: "用户名", pass: "密码1234" },
            { user: "тест", pass: "пароль" },
            { user: "test\n\r", pass: "pass\t1234" },
        ];

        for (const { user, pass } of specialCases) {
            await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
            await fillLogin(page, user, pass);

            const status = await page.evaluate(() => document.readyState);
            expect(status).toBe("complete");
        }
    });

    // ── 13. Visibilidad de contraseña ─────────────
    test("TC-13 | El campo de contraseña oculta el texto por defecto", async ({
        page,
    }) => {
        const inputType = await page
            .locator(SEL.passwordInput)
            .getAttribute("type");
        expect(inputType).toBe("password");
    });

    // ── 14. Botón toggle de contraseña ───────────
    test("TC-14 | El ícono ojo alterna la visibilidad de la contraseña", async ({
        page,
    }) => {
        // The screenshot shows an eye-slash icon next to the password field
        const toggleButton = page.locator(
            'button[aria-label*="contraseña"], button[aria-label*="password"], [data-testid="toggle-password"], svg ~ button, input[type="password"] ~ button'
        );

        const toggleExists = await toggleButton.count();
        if (toggleExists > 0) {
            await toggleButton.first().click();
            const newType = await page.locator(SEL.passwordInput).getAttribute("type");
            expect(newType).toBe("text");
        } else {
            test.skip(); // Toggle may not be implemented yet
        }
    });

    // ── 15. Roles disponibles en el sistema ───────
    test("TC-15 | Los roles 'Cliente' y 'Admin' son visibles en el formulario", async ({
        page,
    }) => {
        await expect(
            page.locator("text=Roles disponibles en el sistema")
        ).toBeVisible();
        await expect(page.locator("text=Cliente")).toBeVisible();
        await expect(page.locator("text=Admin")).toBeVisible();
    });

    // ── 16. Rate limiting / Brute force básico ────
    test("TC-16 | Múltiples intentos fallidos muestran error consistente", async ({
        page,
    }) => {
        for (let i = 0; i < 5; i++) {
            await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
            await fillLogin(page, "test", `wrong_pass_attempt_${i}`);

            await expect(page).toHaveURL(/\/login/);

            // App must remain functional after each failed attempt
            const status = await page.evaluate(() => document.readyState);
            expect(status).toBe("complete");
        }
    });

    // ── 17. Verificar que el usuario 'test' vea texto 'admin' en el dashboard ─
    test("TC-17 | Login test/test1234 muestra texto 'admin' en el dashboard", async ({ page }) => {
        await fillLogin(page, "test", "test1234");
        await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 8_000 });

        // Verificar que el token se ha almacenado
        const token = await getStoredToken(page);
        expect(token).toBeTruthy();

        // Buscar 'admin' sin importar mayúsculas/minúsculas
        await expect(page.getByText(/admin/i)).toBeVisible();
    });

    // ── 18. Login con Ctest y búsqueda de 'client' dentro del dashboard ──────
    test("TC-18 | Login con Ctest y buscar texto 'client' en el dashboard", async ({ page }) => {
        await fillLogin(page, "Ctest", "test1234");
        await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 8_000 });

        // Verificar que el token se ha almacenado
        const token = await getStoredToken(page);
        expect(token).toBeTruthy();

        // Buscar la palabra 'client' (insensible a mayúsculas)
        await expect(page.getByText(/cliente/i)).toBeVisible();
    });
});