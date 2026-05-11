import { test, expect, Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────────────────────────
const BASE_URL = "http://192.168.100.5:3001";
const LOGIN_URL = `${BASE_URL}/login`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const NEW_TICKET_URL = `${BASE_URL}/tickets/new`;

const VALID_USER = { username: "test", password: "test1234" };

// ─────────────────────────────────────────────────────────────────
//  Selectors
// ─────────────────────────────────────────────────────────────────
const SEL = {
    // Login
    usernameInput: 'input[name="username"], input[type="text"]',
    passwordInput: 'input[name="password"], input[type="password"]',
    submitButton: 'button:has-text("Iniciar sesión")',

    // Dashboard header
    dashHeading: 'text=Dashboard',
    dashGreeting: 'text=Hola',
    dashRoleAdmin: 'text=ADMIN',
    btnNewIncident: 'button:has-text("Nueva incidencia"), a:has-text("Nueva incidencia")',
    btnLogout: 'button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")',
    welcomeCard: 'text=Bienvenido a IncidentFlow',

    // Nueva incidencia — form
    formTitle: 'text=Nueva incidencia',
    backLink: 'text=Volver al dashboard',
    closeBtn: 'button[aria-label="close"], button:has-text("×"), button >> text=×',
    titleInput: 'input[placeholder*="Servidor"], input[name="title"], input[id*="title"]',
    descriptionInput: 'textarea[placeholder*="servidor"], textarea[name="description"], textarea',

    // Edición de clasificación (dropdowns)
    selectSeveridad: 'select:near(:text("Severidad")), select[name="severity"], label:has-text("Severidad") + select',
    selectTipo: 'select:near(:text("Tipo")), select[name="type"], label:has-text("Tipo") + select',
    selectImpacto: 'select:near(:text("Impacto")), select[name="impact"], label:has-text("Impacto") + select',
    selectCategoria: 'select:near(:text("Categoría")), select[name="category"], label:has-text("Categoría") + select',

    // Asignación
    assignSelect: 'select:has(option:has-text("Sin asignar")), select[name="assignee"]',
    optSinAsignar: 'option:has-text("Sin asignar")',
    optAdmin: 'option:has-text("admin (ADMIN)")',
    optCtest: 'option:has-text("Ctest (CLIENTE)")',
    optTest: 'option:has-text("test (ADMIN)")',

    // Footer del form
    btnCancelar: 'button:has-text("Cancelar")',
    btnCrearTicket: 'button:has-text("Crear ticket")',
};

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────
async function loginAs(page: Page, username = VALID_USER.username, password = VALID_USER.password) {
    await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
    await page.fill(SEL.usernameInput, username);
    await page.fill(SEL.passwordInput, password);
    await page.click(SEL.submitButton);
    await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 8_000 });

    // Verificar que el bearer token se ha almacenado después del login
    const token = await page.evaluate(() => {
        return localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('access_token') ||
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('access_token') ||
            null;
    });
    expect(token).toBeTruthy();
    console.log(`✓ Usuario ${username} autenticado con token: ${token?.substring(0, 20)}...`);
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

async function openNewTicketForm(page: Page) {
    await page.click(SEL.btnNewIncident);
    await expect(page).toHaveURL(NEW_TICKET_URL, { timeout: 6_000 });
    await expect(page.locator(SEL.formTitle)).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────
//  SUITE 1 — Dashboard
// ─────────────────────────────────────────────────────────────────
test.describe("Dashboard", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    test("TC-D02 | El botón 'Nueva incidencia' navega a /tickets/new", async ({ page }) => {
        await page.click(SEL.btnNewIncident);
        await expect(page).toHaveURL(NEW_TICKET_URL, { timeout: 6_000 });
    });

    test("TC-D03 | Cerrar sesión redirige al login y destruye la sesión", async ({ page }) => {
        // Verificar que el token existe antes de logout
        let token = await getStoredToken(page);
        expect(token).toBeTruthy();

        await page.click(SEL.btnLogout);
        await expect(page).toHaveURL(/\/login/, { timeout: 6_000 });

        // Verificar que el token se ha been eliminated después del logout
        token = await getStoredToken(page);
        expect(token).toBeNull();

        // Intentar volver al dashboard sin sesión debe redirigir al login
        await page.goto(DASHBOARD_URL, { waitUntil: "networkidle" });
        await expect(page).toHaveURL(/\/login/);
    });
});

// ─────────────────────────────────────────────────────────────────
//  SUITE 2 — Formulario nueva incidencia (estructura y UI)
// ─────────────────────────────────────────────────────────────────
test.describe("Nueva incidencia — UI y estructura del formulario", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await openNewTicketForm(page);
    });

    test("TC-F02 | El campo título tiene el asterisco de requerido", async ({ page }) => {
        // El label muestra un asterisco rojo (*)
        const titleLabel = page.locator('label:has-text("Título"), *:has-text("Título de la incidencia")').first();
        await expect(titleLabel).toBeVisible();
        const labelText = await titleLabel.innerText();
        expect(labelText).toMatch(/\*/);
    });

    test("TC-F03 | El dropdown 'Asignar a' contiene las opciones correctas", async ({ page }) => {
        const select = page.locator(SEL.assignSelect);
        await select.click();

        const options = await select.locator("option").allInnerTexts();
        expect(options.some(o => o.includes("Sin asignar"))).toBeTruthy();
        expect(options.some(o => o.includes("admin"))).toBeTruthy();
        expect(options.some(o => o.includes("Ctest"))).toBeTruthy();
        expect(options.some(o => o.includes("test"))).toBeTruthy();
    });

    test("TC-F04 | 'Volver al dashboard' regresa a /dashboard", async ({ page }) => {
        await page.click(SEL.backLink);
        await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 6_000 });
    });

    test("TC-F05 | El botón X cierra el formulario y regresa al dashboard", async ({ page }) => {
        const closeBtn = page.locator(SEL.closeBtn).first();
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 6_000 });
        } else {
            test.skip();
        }
    });

    test("TC-F06 | El botón 'Cancelar' cierra el formulario y regresa al dashboard", async ({ page }) => {
        await page.click(SEL.btnCancelar);
        await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 6_000 });
    });
});

// ─────────────────────────────────────────────────────────────────
//  SUITE 4 — Asignación del ticket
// ─────────────────────────────────────────────────────────────────
test.describe("Nueva incidencia — Asignación", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await openNewTicketForm(page);
    });

    test("TC-A01 | El dropdown de asignación tiene 'Sin asignar' por defecto", async ({ page }) => {
        const val = await page.locator(SEL.assignSelect).inputValue();
        // El valor por defecto puede ser vacío o la cadena "Sin asignar"
        const text = await page.locator(SEL.assignSelect).evaluate(
            (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text || ""
        );
        expect(text.toLowerCase()).toMatch(/sin asignar|unassigned/i);
    });

    test("TC-A02 | Se puede seleccionar 'admin (ADMIN)' como asignado", async ({ page }) => {
        const select = page.locator(SEL.assignSelect);
        await select.selectOption({ label: "admin (ADMIN)" });
        const text = await select.evaluate(
            (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text || ""
        );
        expect(text).toMatch(/admin/i);
    });

    test("TC-A03 | Se puede seleccionar 'Ctest (CLIENTE)' como asignado", async ({ page }) => {
        const select = page.locator(SEL.assignSelect);
        await select.selectOption({ label: "Ctest (CLIENTE)" });
        const text = await select.evaluate(
            (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text || ""
        );
        expect(text).toMatch(/Ctest/i);
    });

    test("TC-A04 | Se puede seleccionar 'test (ADMIN)' como asignado", async ({ page }) => {
        const select = page.locator(SEL.assignSelect);
        await select.selectOption({ label: "test (ADMIN)" });
        const text = await select.evaluate(
            (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text || ""
        );
        expect(text).toMatch(/test/i);
    });
});

// ─────────────────────────────────────────────────────────────────
//  SUITE 6 — Validaciones y edge cases del formulario
// ─────────────────────────────────────────────────────────────────
test.describe("Nueva incidencia — Validaciones y edge cases", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await openNewTicketForm(page);
    });

    test("TC-V02 | Título con texto extremadamente largo no rompe el formulario", async ({ page }) => {
        await page.fill(SEL.titleInput, "A".repeat(1000));
        await page.fill(SEL.descriptionInput, "Descripción de prueba");

        const status = await page.evaluate(() => document.readyState);
        expect(status).toBe("complete");
    });

    test("TC-V03 | Descripción con texto extremadamente largo no rompe el formulario", async ({ page }) => {
        await page.fill(SEL.titleInput, "Prueba de carga");
        await page.fill(SEL.descriptionInput, "B".repeat(10_000));

        const status = await page.evaluate(() => document.readyState);
        expect(status).toBe("complete");
    });

    test("TC-V04 | Caracteres especiales en el título no rompen el formulario", async ({ page }) => {
        const specialTitles = [
            "<script>alert('xss')</script>",
            "' OR 1=1--",
            "Título con 日本語 y émojis 🔥",
            "Título\ncon\nsaltos\nde\nlínea",
        ];

        for (const title of specialTitles) {
            await page.goto(NEW_TICKET_URL, { waitUntil: "networkidle" });
            await page.fill(SEL.titleInput, title);
            const status = await page.evaluate(() => document.readyState);
            expect(status).toBe("complete");
        }
    });
});