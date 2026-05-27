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

const demoFolder = {
  id: "folder-demo",
  user_id: adminUser.id,
  name: "Demo",
  slug: "demo",
  path: null,
  is_pinned: false,
  sort_order: 0,
  archived_at: null
};

const archiveFolder = {
  ...demoFolder,
  id: "folder-archive",
  name: "Archive",
  slug: "archive",
  sort_order: 1
};

const demoTag = {
  id: "tag-docs",
  name: "Docs",
  slug: "docs"
};

const now = "2026-05-27T09:00:00Z";

function note(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-demo",
    user: adminUser,
    user_id: adminUser.id,
    folder: demoFolder,
    folder_id: demoFolder.id,
    title: "Getting started",
    status: "ready",
    source_type: "text",
    revision_number: 1,
    is_published: false,
    is_starred: false,
    created_at: now,
    updated_at: now,
    summary: "Welcome to Mianotes.",
    text: "# Getting started\n\nWelcome to Mianotes.",
    note_url: "/markdown/demo/getting-started-note-demo.md",
    comments_count: 0,
    comments_url: "/api/notes/note-demo/comments",
    source_files: [],
    tags: [demoTag],
    ...overrides
  };
}

type MockAppOptions = {
  authenticated?: boolean;
};

async function mockMianotesApi(page: Page, options: MockAppOptions = {}) {
  let authenticated = options.authenticated ?? true;
  const requests: Record<string, unknown[]> = {};
  const notes = [note()];
  const folders = [demoFolder, archiveFolder];
  const storageSettings = {
    active_location: "storage-current",
    database_file: "mia.db",
    data_dir: "/tmp/test-user/Mianotes",
    database_path: "/tmp/test-user/Mianotes/.mianotes/mia.db",
    locations: [
      {
        id: "storage-current",
        name: "Mianotes",
        folder_path: "/tmp/test-user/Mianotes",
        database_path: "/tmp/test-user/Mianotes/.mianotes/mia.db",
        is_active: true,
        database_exists: true,
        notes_count: 1,
        users_count: 1,
        last_updated_at: now
      },
      {
        id: "storage-archive",
        name: "Archive",
        folder_path: "/tmp/test-user/Archive",
        database_path: "/tmp/test-user/Archive/.mianotes/mia.db",
        is_active: false,
        database_exists: true,
        notes_count: 0,
        users_count: 1,
        last_updated_at: null
      }
    ]
  };

  function remember(name: string, value: unknown) {
    requests[name] = [...(requests[name] ?? []), value];
  }

  async function readJson(route: Route) {
    return JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
  }

  async function fulfill(route: Route, body: unknown, status = 200) {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  }

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      await route.continue();
      return;
    }

    if (path === "/api/auth/session" && method === "GET") {
      if (!authenticated) {
        await fulfill(route, { detail: "Not authenticated" }, 401);
        return;
      }
      await fulfill(route, { user: adminUser });
      return;
    }

    if (path === "/api/auth/check-email" && method === "POST") {
      const payload = await readJson(route);
      remember("checkEmail", payload);
      await fulfill(route, {
        user_id: null,
        is_first_user: true,
        master_password_owner_name: null,
        signup_disabled: false
      });
      return;
    }

    if (path === "/api/auth/join" && method === "POST") {
      const payload = await readJson(route);
      remember("join", payload);
      authenticated = true;
      await fulfill(route, { user: adminUser });
      return;
    }

    if (path === "/api/users" && method === "GET") {
      await fulfill(route, [adminUser]);
      return;
    }

    if (path === "/api/folders" && method === "GET") {
      await fulfill(route, folders);
      return;
    }

    if (path === "/api/tags" && method === "GET") {
      await fulfill(route, [demoTag]);
      return;
    }

    if (path === "/api/notes" && method === "GET") {
      await fulfill(route, notes);
      return;
    }

    if (path.startsWith("/api/notes/") && method === "GET") {
      await fulfill(route, notes.find((item) => path.endsWith(String(item.id))) ?? notes[0]);
      return;
    }

    if (path === "/api/storage" && method === "GET") {
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

    if (path === "/api/notes/from-file" && method === "POST") {
      remember("fromFile", request.postData() ?? "");
      const created = note({
        id: "note-upload",
        title: "Uploaded Lesson",
        source_type: "file",
        summary: "Uploaded lesson notes.",
        text: "# Uploaded Lesson\n\nUploaded lesson notes."
      });
      notes.unshift(created);
      await fulfill(route, created, 201);
      return;
    }

    if (path === "/api/publish/themes" && method === "GET") {
      await fulfill(route, [
        { id: "mialight", name: "Mialight", description: "Light theme", version: "0.1.0" }
      ]);
      return;
    }

    if (path === "/api/publish/draft" && method === "GET") {
      await fulfill(route, {
        theme: "mialight",
        folder_id: null,
        tag_id: null,
        site_configuration: {
          brand: "mianotes",
          version: "0.1.0",
          showPreviousVersions: true
        },
        navigation: [
          {
            title: "Demo",
            items: [{ title: "Getting started", path: "getting-started.html" }]
          }
        ],
        updated_notes: [{ title: "Getting started", path: "getting-started.html" }],
        generated_at: now
      });
      return;
    }

    if (path === "/api/publish" && method === "POST") {
      remember("publish", await readJson(route));
      await fulfill(route, {
        id: "site-1",
        theme: "mialight",
        version: "0.1.0",
        folder_id: null,
        tag_id: null,
        note_count: 1,
        html_path: "html/0.1.0",
        markdown_path: "",
        url_path: "html/0.1.0/index.html",
        site_url: "/html/0.1.0/index.html",
        download_url: "/api/publish/site-1/download",
        created_at: now
      }, 201);
      return;
    }

    if (path === "/api/settings/storage" && method === "GET") {
      await fulfill(route, storageSettings);
      return;
    }

    if (path === "/api/settings/storage/locations" && method === "POST") {
      remember("storageLocation", await readJson(route));
      storageSettings.locations.unshift({
        id: "storage-new",
        name: "Research",
        folder_path: "/tmp/test-user/Research",
        database_path: "/tmp/test-user/Research/.mianotes/mia.db",
        is_active: false,
        database_exists: true,
        notes_count: 0,
        users_count: 1,
        last_updated_at: null
      });
      await fulfill(route, storageSettings, 201);
      return;
    }

    if (path === "/api/settings/storage/active" && method === "PATCH") {
      remember("storageSwitch", await readJson(route));
      authenticated = false;
      await fulfill(route, { storage: storageSettings, session_ended: true });
      return;
    }

    await fulfill(route, { detail: `Unhandled test route: ${method} ${path}` }, 500);
  });

  return requests;
}

test("admin signup captures the workspace access choice", async ({ page }) => {
  const requests = await mockMianotesApi(page, { authenticated: false });

  await page.goto("/");
  await page.getByPlaceholder("Email address").fill("admin@example.test");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Create the admin account for this workspace.")).toBeVisible();
  await page.getByLabel("Admin only").check();
  await page.getByPlaceholder("Your name").fill("Admin User");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("secret-password");
  await page.getByPlaceholder("Confirm password").fill("secret-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.locator("header").getByText("Dashboard", { exact: true })).toBeVisible();
  expect(requests.join?.[0]).toMatchObject({ workspace_access_mode: "admin_only" });
});

test("adds a note from one selected file", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Add Note" }).click();
  const dialog = page.getByRole("dialog", { name: "Add note" });
  await dialog.getByRole("button", { name: "File" }).click();
  await dialog.locator("select").selectOption(demoFolder.id);
  await dialog.getByLabel("Title").fill("Uploaded Lesson");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "lesson.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Uploaded lesson notes.")
  });

  await expect(page.getByText("lesson.txt")).toBeVisible();
  await page.getByRole("button", { name: "Create note" }).click();

  await expect(page.getByText("Uploaded Lesson").first()).toBeVisible();
  expect(requests.fromFile).toHaveLength(1);
});

test("validates publish JSON before publishing and hides the form after success", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Site configuration" })).toBeVisible();
  await page.locator(".json-block textarea").first().fill("{");
  await page.locator("form").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("alert")).toContainText("Site configuration must be valid JSON.");

  await page.locator(".json-block textarea").first().fill(
    JSON.stringify({ brand: "mianotes", version: "0.1.0", showPreviousVersions: true }, null, 2)
  );
  await page.locator("form").getByRole("button", { name: "Publish" }).click();

  await expect(page.getByRole("status")).toContainText("Your static site is ready.");
  await expect(page.getByRole("button", { name: "Continue" })).toBeHidden();
  expect(requests.publish).toHaveLength(1);
});

test("creates and switches workspace folders from settings", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Change folder" }).click();

  await expect(page.locator("#database-switch-title")).toBeVisible();
  await page.getByRole("button", { name: "Create a folder" }).click();
  await page.getByLabel("Folder name").fill("Research");
  await page.getByLabel("Folder path").fill("/tmp/test-user/Research");
  await page.getByRole("button", { name: "Create folder" }).click();
  await page.getByRole("button", { name: /Research/ }).click();
  await page.getByRole("button", { name: "Switch folder" }).click();

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(requests.storageLocation?.[0]).toMatchObject({
    name: "Research",
    folder_path: "/tmp/test-user/Research"
  });
  expect(requests.storageSwitch?.[0]).toMatchObject({ location_id: "storage-new" });
});
