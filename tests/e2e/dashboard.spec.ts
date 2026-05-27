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

const memberUser = {
  id: "user-member",
  email: "member@example.test",
  name: "Member User",
  username: "member",
  role: "Researcher",
  is_admin: false,
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
  const users = [adminUser, memberUser];
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
      await fulfill(route, users);
      return;
    }

    if (path === "/api/users" && method === "POST") {
      const payload = await readJson(route);
      remember("createUser", payload);
      const createdUser = {
        id: "user-created",
        username: "created",
        is_admin: false,
        photo_url: null,
        ...payload
      };
      users.unshift(createdUser);
      await fulfill(route, createdUser, 201);
      return;
    }

    if (path.startsWith("/api/users/") && path.endsWith("/admin") && method === "PATCH") {
      const payload = await readJson(route);
      remember("adminChange", payload);
      const userId = path.split("/")[3];
      const user = users.find((item) => item.id === userId) ?? memberUser;
      const updatedUser = { ...user, is_admin: Boolean(payload.is_admin) };
      const index = users.findIndex((item) => item.id === userId);
      if (index >= 0) {
        users[index] = updatedUser;
      }
      await fulfill(route, updatedUser);
      return;
    }

    if (path.startsWith("/api/users/") && path.endsWith("/password") && method === "PATCH") {
      remember("passwordUpdate", await readJson(route));
      const userId = path.split("/")[3];
      await fulfill(route, users.find((item) => item.id === userId) ?? memberUser);
      return;
    }

    if (path === "/api/folders" && method === "GET") {
      await fulfill(route, folders);
      return;
    }

    if (path === "/api/folders" && method === "POST") {
      const payload = await readJson(route);
      remember("createFolder", payload);
      const createdFolder = {
        id: "folder-created",
        user_id: adminUser.id,
        name: String(payload.name),
        slug: String(payload.name).toLowerCase().replace(/\s+/g, "-"),
        path: null,
        is_pinned: Boolean(payload.is_pinned),
        sort_order: -1,
        archived_at: null
      };
      folders.unshift(createdFolder);
      await fulfill(route, createdFolder, 201);
      return;
    }

    if (path.startsWith("/api/folders/") && method === "PATCH") {
      const payload = await readJson(route);
      remember("folderUpdate", payload);
      const folderId = path.split("/")[3];
      const index = folders.findIndex((item) => item.id === folderId);
      const current = folders[index] ?? demoFolder;
      const updatedFolder = {
        ...current,
        ...payload,
        slug: typeof payload.name === "string"
          ? payload.name.toLowerCase().replace(/\s+/g, "-")
          : current.slug
      };
      if (index >= 0) {
        folders[index] = updatedFolder;
      }
      await fulfill(route, updatedFolder);
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

    if (path === "/api/jobs" && method === "GET") {
      await fulfill(route, [{
        id: "job-demo",
        user: adminUser,
        note_id: "note-demo",
        note_title: "Getting started",
        job_type: "parse_url",
        status: "succeeded",
        input: { url: "https://example.test" },
        result: {},
        log: [{
          timestamp: now,
          status: "info",
          command: "start parse_url",
          response: "job is running"
        }],
        error: null,
        created_at: now,
        updated_at: now,
        started_at: now,
        finished_at: now
      }]);
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

    if (path === "/api/notes/from-text" && method === "POST") {
      const payload = await readJson(route);
      remember("fromText", payload);
      const created = note({
        id: "note-text",
        folder_id: payload.folder_id,
        folder: folders.find((folder) => folder.id === payload.folder_id) ?? demoFolder,
        title: payload.title,
        source_type: "text",
        summary: String(payload.text ?? "").trim(),
        text: payload.text
      });
      notes.unshift(created);
      await fulfill(route, created, 201);
      return;
    }

    if (path === "/api/notes/from-url" && method === "POST") {
      const payload = await readJson(route);
      remember("fromUrl", payload);
      const created = note({
        id: "note-url",
        folder_id: payload.folder_id,
        folder: folders.find((folder) => folder.id === payload.folder_id) ?? demoFolder,
        title: payload.title,
        source_type: "link",
        status: "queued",
        summary: "Mia is indexing this link.",
        text: "",
        source_files: [{
          id: "source-url",
          original_filename: String(payload.url),
          content_type: "text/html",
          url: String(payload.url)
        }]
      });
      notes.unshift(created);
      await fulfill(route, created, 201);
      return;
    }

    if (path.startsWith("/api/notes/") && path.endsWith("/star") && method === "PATCH") {
      const payload = await readJson(route);
      remember("star", payload);
      const noteId = path.split("/")[3];
      const index = notes.findIndex((item) => item.id === noteId);
      const updated = { ...(notes[index] ?? notes[0]), is_starred: Boolean(payload.is_starred) };
      if (index >= 0) {
        notes[index] = updated;
      }
      await fulfill(route, updated);
      return;
    }

    if (path.startsWith("/api/notes/") && method === "PATCH") {
      const payload = await readJson(route);
      remember("noteUpdate", payload);
      const noteId = path.split("/")[3];
      const nextFolder = folders.find((folder) => folder.id === payload.folder_id) ?? demoFolder;
      const index = notes.findIndex((item) => item.id === noteId);
      const updated = {
        ...(notes[index] ?? notes[0]),
        folder: nextFolder,
        folder_id: nextFolder.id
      };
      if (index >= 0) {
        notes[index] = updated;
      }
      await fulfill(route, updated);
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

    if (path === "/api/settings/api-key" && method === "POST") {
      remember("apiKey", {});
      await fulfill(route, {
        token: "mia_test_key",
        api_url: "http://127.0.0.1:8200"
      }, 201);
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

test("creates text and link notes from the add note modal", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Add Note" }).click();
  let dialog = page.getByRole("dialog", { name: "Add note" });
  await dialog.locator("select").selectOption(demoFolder.id);
  await dialog.getByLabel("Title").fill("Meeting notes");
  await dialog.getByLabel("Text (optional)").fill("Discuss the next release.");
  await dialog.getByRole("button", { name: "Create note" }).click();

  await expect(page.getByRole("heading", { name: "Meeting notes" })).toBeVisible();
  expect(requests.fromText?.[0]).toMatchObject({
    folder_id: demoFolder.id,
    title: "Meeting notes",
    text: "Discuss the next release."
  });

  await page.getByLabel("Back to notes").click();
  await page.getByRole("button", { name: "Add Note" }).click();
  dialog = page.getByRole("dialog", { name: "Add note" });
  await dialog.getByRole("button", { name: "Link" }).click();
  await dialog.locator("select").selectOption(archiveFolder.id);
  await dialog.getByLabel("URL").fill("https://example.com/private-doc");
  await dialog.getByLabel("Title").fill("Private reference");
  await dialog.getByRole("button", { name: "Create note" }).click();

  await expect(page.getByText("Private reference").first()).toBeVisible();
  expect(requests.fromUrl?.[0]).toMatchObject({
    folder_id: archiveFolder.id,
    title: "Private reference",
    url: "https://example.com/private-doc"
  });
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

test("creates and renames folders from the sidebar", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByLabel("Add folder").click();

  let dialog = page.getByRole("dialog", { name: "Add folder" });
  await dialog.getByLabel("Folder name").fill("Onboarding");
  await dialog.getByLabel("Pin to top").check();
  await dialog.getByRole("button", { name: "Create folder" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Onboarding/ })).toBeVisible();
  expect(requests.createFolder?.[0]).toMatchObject({
    name: "Onboarding",
    is_pinned: true
  });

  await page.getByRole("button", { name: /Onboarding/ }).hover();
  await page.getByLabel("Folder actions for Onboarding").click({ force: true });
  await page.getByRole("menuitem", { name: "Rename" }).click();

  dialog = page.getByRole("dialog", { name: "Rename folder" });
  await dialog.getByLabel("Folder name").fill("Team docs");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Team docs/ })).toBeVisible();
  expect(requests.folderUpdate?.[0]).toMatchObject({ name: "Team docs" });
});

test("moves a note to a different folder from the note actions menu", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".note-row-actions").first().getByRole("button", { name: "More note actions" }).click();
  await page.getByRole("menuitem", { name: "Move" }).click();

  const dialog = page.getByRole("dialog", { name: "Move note" });
  await expect(dialog).toBeVisible();
  await dialog.locator("select").selectOption(archiveFolder.id);
  await dialog.getByRole("button", { name: "Move note" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Archive").first()).toBeVisible();
  expect(requests.noteUpdate?.[0]).toMatchObject({ folder_id: archiveFolder.id });
});

test("stars a note and persists the change", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Add to starred", exact: true }).click();

  await expect(page.getByRole("button", { name: "Remove from starred", exact: true })).toBeVisible();
  expect(requests.star?.[0]).toMatchObject({ is_starred: true });
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

test("creates an API key from settings and shows the generated environment variables", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Create API Key" }).click();

  await expect(page.getByText("API key created")).toBeVisible();
  await expect(page.getByText("These variables were added to the")).toBeVisible();
  await expect(page.getByText("MIANOTES_API_URL")).toBeVisible();
  await expect(page.getByText("MIANOTES_API_KEY")).toBeVisible();
  await expect(page.locator('input[value="mia_test_key"]')).toBeVisible();
  expect(requests.apiKey).toHaveLength(1);
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

test("opens shareable internal URLs for notes, folders, users, console, publish, and settings", async ({ page }) => {
  await mockMianotesApi(page);

  await page.goto("/note/note-demo");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();

  await page.goto("/note/note-demo/edit");
  await expect(page.getByRole("button", { name: "Save" }).first()).toBeVisible();

  await page.goto("/folder/archive");
  await expect(page.getByRole("button", { name: /Archive/ })).toHaveClass(/active/);

  await page.goto("/users");
  await expect(page.getByRole("region", { name: "All user profiles" })).toBeVisible();

  await page.goto("/user/user-member/profile");
  await expect(page.getByRole("heading", { name: "Member User" })).toBeVisible();

  await page.goto("/jobs");
  await expect(page.getByRole("heading", { level: 1, name: "Console" })).toBeVisible();
  await expect(page.getByRole("row", { name: /succeeded Parse Url/ })).toBeVisible();

  await page.goto("/publish");
  await expect(page.getByRole("heading", { name: "Publish your notes" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("updates a team member password and makes them an admin", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Users" }).click();
  await page.getByRole("button", { name: "Open actions for Member User" }).click();
  await page.getByRole("menuitem", { name: "Update password" }).click();

  const passwordDialog = page.getByRole("dialog", { name: "Update password" });
  await passwordDialog.getByLabel("New password").fill("new-secret");
  await passwordDialog.getByLabel("Confirm password").fill("wrong-secret");
  await passwordDialog.getByRole("button", { name: "Update" }).click();
  await expect(passwordDialog.getByRole("alert")).toContainText("Passwords do not match.");

  await passwordDialog.getByLabel("Confirm password").fill("new-secret");
  await passwordDialog.getByRole("button", { name: "Update" }).click();
  await expect(passwordDialog).toBeHidden();
  expect(requests.passwordUpdate?.[0]).toMatchObject({
    password: "new-secret",
    password_confirmation: "new-secret"
  });

  await page.getByRole("button", { name: "Open actions for Member User" }).click();
  await page.getByRole("menuitem", { name: "Make admin" }).click();

  const adminDialog = page.getByRole("dialog", { name: "Make admin" });
  await expect(adminDialog).toContainText("Give Member User admin access to this workspace?");
  await adminDialog.getByRole("button", { name: "Make admin" }).click();

  await expect(adminDialog).toBeHidden();
  await expect(page.getByText("Admin").nth(1)).toBeVisible();
  expect(requests.adminChange?.[0]).toMatchObject({ is_admin: true });
});
