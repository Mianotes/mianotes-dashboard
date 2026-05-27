import { expect, test, type Page, type Route } from "@playwright/test";

const adminUser = {
  id: "user-admin",
  email: "admin@example.test",
  name: "Admin User",
  username: "admin",
  role: "CTO",
  is_admin: true,
  photo_url: null
};

const folder = {
  id: "folder-demo",
  user_id: adminUser.id,
  name: "Demo",
  slug: "demo",
  path: null,
  is_pinned: false,
  sort_order: 0,
  archived_at: null
};

const now = "2026-05-27T09:00:00Z";

async function fulfill(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function mockLoadedDashboard(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (!path.startsWith("/api/")) {
      await route.continue();
      return;
    }

    if (path === "/api/auth/session") {
      await fulfill(route, { user: adminUser });
      return;
    }
    if (path === "/api/users") {
      await fulfill(route, [adminUser]);
      return;
    }
    if (path === "/api/folders") {
      await fulfill(route, [folder]);
      return;
    }
    if (path === "/api/tags") {
      await fulfill(route, []);
      return;
    }
    if (path === "/api/notes") {
      await fulfill(route, [
        {
          id: "note-demo",
          user: adminUser,
          user_id: adminUser.id,
          folder,
          folder_id: folder.id,
          title: "Mobile layout",
          status: "ready",
          source_type: "text",
          revision_number: 1,
          is_published: false,
          is_starred: false,
          created_at: now,
          updated_at: now,
          summary: "Sidebar should not move the page.",
          text: "# Mobile layout\n\nSidebar should not move the page.",
          note_url: "/markdown/demo/mobile-layout-note-demo.md",
          comments_count: 0,
          comments_url: "/api/notes/note-demo/comments",
          source_files: [],
          tags: []
        }
      ]);
      return;
    }
    if (path === "/api/storage") {
      await fulfill(route, {
        data_dir: "/tmp/test-user/Mianotes",
        total_bytes: 1000000,
        used_bytes: 500000,
        free_bytes: 500000,
        data_size_bytes: 12000,
        used_percent: 50,
        cache_seconds: 3600,
        refreshed_at: now,
        cache_expires_at: now
      });
      return;
    }

    await fulfill(route, { detail: `Unhandled test route: ${path}` }, 500);
  });
}

test("opening the mobile sidebar locks background scrolling", async ({ page }) => {
  await mockLoadedDashboard(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Open sidebar" }).click();

  await expect(page.locator(".sidebar")).toHaveClass(/is-open/);
  await expect(page.getByRole("button", { name: "Close sidebar" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

  await page.getByRole("button", { name: "Close sidebar" }).click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
});
