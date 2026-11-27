import { expect, test } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/', heading: 'Find events and register in a minute' },
  { path: '/events', heading: 'Events' },
  { path: '/venues', heading: 'Venues' },
  { path: '/login', heading: 'Sign in' },
  { path: '/register', heading: 'Create an account' },
] as const;

const VIEWPORTS = [
  { label: 'mobile-360', width: 360, height: 800 },
  { label: 'tablet-768', width: 768, height: 1024 },
  { label: 'desktop-1440', width: 1440, height: 900 },
] as const;

test.describe('Cross-browser rendering, responsiveness and page load performance', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route.path} cleanly without console errors and loads within 2000ms`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const started = Date.now();
      const response = await page.goto(route.path, { waitUntil: 'load' });
      const elapsedMs = Date.now() - started;

      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
      expect(pageErrors).toEqual([]);
      expect(elapsedMs).toBeLessThan(2000);
    });
  }

  test('has no horizontal overflow across 360px, 768px and 1440px viewports', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          overflow.scrollWidth,
          `horizontal overflow on ${route.path} at ${vp.label}`,
        ).toBeLessThanOrEqual(overflow.innerWidth);
      }
    }
  });

  test('toggles mobile burger navigation menu at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const burger = page.getByRole('button', { name: 'Menu' });
    await expect(burger).toBeVisible();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');

    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#main-nav')).toHaveClass(/nav--open/);

    await page.locator('#main-nav').getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
  });

  test('displays clear client-side validation messages on invalid registration form input', async ({
    page,
  }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText('Enter your surname.')).toBeVisible();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter your phone number.')).toBeVisible();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Create a password.')).toBeVisible();
  });

  test('navigates catalog filters, event details and venue details across browsers', async ({
    page,
  }) => {
    await page.goto('/events', { waitUntil: 'networkidle' });
    await expect(page.locator('.entity-card').first()).toBeVisible();

    await page.getByRole('button', { name: /^Active/ }).click();
    await expect(page).toHaveURL(/status=ACTIVE/);

    await page.locator('.entity-card a').first().click();
    await expect(page).toHaveURL(/\/events\/.+/);
    await expect(page.getByRole('heading', { name: 'About this event' })).toBeVisible();

    await page.goto('/venues', { waitUntil: 'networkidle' });
    await expect(page.locator('.entity-card').first()).toBeVisible();
    await page.locator('.entity-card a').first().click();
    await expect(page).toHaveURL(/\/venues\/.+/);
    await expect(page.getByRole('heading', { name: /Events at this venue/i })).toBeVisible();
  });

  test('enforces role-based UI access between regular user and admin routes', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    const demoUserBtn = page.getByRole('button', { name: 'Sign in as demo user' });
    test.skip(!(await demoUserBtn.isVisible()), 'Demo auth buttons disabled in live API mode');

    await demoUserBtn.click();
    await expect(page).toHaveURL(/\/events$/);

    await page.goto('/profile', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();

    // Regular user opening /admin sees friendly 403 error message (F5, F25)
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await expect(page.getByText('You do not have permission to do this.')).toBeVisible();
  });
});
