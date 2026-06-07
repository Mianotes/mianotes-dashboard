import { expect, test, type Page, type Route } from "@playwright/test";
import { stableShareBase } from "../../src/utils/share";

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

const researchFolder = {
  ...demoFolder,
  id: "folder-research",
  name: "Research notes",
  slug: "research-notes",
  sort_order: 0
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
    source_files: [],
    tags: [demoTag],
    ...overrides
  };
}

type MockAppOptions = {
  authenticated?: boolean;
  denyWorkspaceSwitchId?: string | null;
  runningJob?: boolean;
  workspaceUrl?: string | null;
};

async function mockMianotesApi(page: Page, options: MockAppOptions = {}) {
  let authenticated = options.authenticated ?? true;
  let workspaceUrl = options.workspaceUrl ?? null;
  let activeLocationId = "storage-current";
  let jobDetailCalls = 0;
  const requests: Record<string, unknown[]> = {};
  const notes = [note()];
  const users = [adminUser, memberUser];
  const folders = [demoFolder, archiveFolder];
  const researchNotes = [
    note({
      id: "note-research",
      folder: researchFolder,
      folder_id: researchFolder.id,
      title: "Research brief",
      summary: "A note from the research workspace.",
      text: "# Research brief\n\nA note from the research workspace.",
      note_url: "/markdown/research/research-brief-note-research.md"
    })
  ];
  const storageLocations = [
    {
      id: "storage-current",
      name: "Mianotes",
      folder_path: "/tmp/test-user/Mianotes",
      database_path: "/tmp/test-user/data/workspaces/storage-current.db",
      database_exists: true,
      notes_count: 1,
      users_count: 1,
      last_updated_at: now
    },
    {
      id: "storage-archive",
      name: "Research",
      folder_path: "/tmp/test-user/Research",
      database_path: "/tmp/test-user/data/workspaces/storage-archive.db",
      database_exists: true,
      notes_count: 1,
      users_count: 1,
      last_updated_at: now
    }
  ];

  function activeFolders() {
    if (activeLocationId === "storage-archive") {
      return [researchFolder];
    }
    if (activeLocationId === "storage-new") {
      return [];
    }
    return folders;
  }

  function activeNotes() {
    if (activeLocationId === "storage-archive") {
      return researchNotes;
    }
    if (activeLocationId === "storage-new") {
      return [];
    }
    return notes;
  }

  function noteListPage(items = activeNotes()) {
    return {
      items,
      total: null,
      limit: 10,
      next_cursor: null,
      counts: null
    };
  }

  function filteredNotes(url: URL) {
    let items = activeNotes();
    const folderId = url.searchParams.get("folder_id");
    const userId = url.searchParams.get("user_id");
    const starred = url.searchParams.get("starred");
    const query = url.searchParams.get("query")?.trim().toLowerCase();

    if (folderId) {
      items = items.filter((item) => item.folder_id === folderId);
    }
    if (userId) {
      items = items.filter((item) => item.user_id === userId);
    }
    if (starred === "true") {
      items = items.filter((item) => item.is_starred);
    }
    if (query) {
      items = items.filter((item) => {
        const haystack = `${item.title} ${item.summary ?? ""} ${item.text ?? ""}`.toLowerCase();
        return haystack.includes(query);
      });
    }
    return items;
  }

  function folderNoteCounts(items = activeNotes()) {
    const folders = items.reduce<Record<string, number>>((acc, item) => {
      if (typeof item.folder_id === "string") {
        acc[item.folder_id] = (acc[item.folder_id] ?? 0) + 1;
      }
      return acc;
    }, {});
    return { folders };
  }

  function profileSummaries() {
    return users.map((user) => ({
      user_id: user.id,
      notes_count: activeNotes().filter((item) => item.user_id === user.id).length,
      tags_count: user.id === adminUser.id ? 1 : 0,
      folders_count: user.id === adminUser.id ? activeFolders().length : 0,
      tags: user.id === adminUser.id ? [demoTag] : []
    }));
  }

  function storageSettings() {
    const activeLocation = storageLocations.find((location) => location.id === activeLocationId)
      ?? storageLocations[0];
    return {
      active_location: activeLocation.id,
      data_dir: activeLocation.folder_path,
      database_path: activeLocation.database_path,
      locations: storageLocations.map((location) => ({
        ...location,
        is_active: location.id === activeLocation.id
      }))
    };
  }

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

    if (path === "/api/users/profile-summaries" && method === "GET") {
      await fulfill(route, profileSummaries());
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

    if (path.startsWith("/api/users/") && method === "DELETE") {
      const userId = path.split("/")[3];
      remember("deleteUser", { user_id: userId });
      const index = users.findIndex((item) => item.id === userId);
      if (index >= 0) {
        users.splice(index, 1);
      }
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === "/api/folders" && method === "GET") {
      await fulfill(route, activeFolders());
      return;
    }

    if (path === "/api/folders/counts" && method === "GET") {
      await fulfill(route, folderNoteCounts());
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
      remember("notesList", {
        folder_id: url.searchParams.get("folder_id"),
        query: url.searchParams.get("query"),
        workspace: request.headers()["x-mianotes-workspace"] ?? null
      });
      await fulfill(route, noteListPage(filteredNotes(url)));
      return;
    }

    if (path === "/api/notes/shared/workspaces/storage-current/share-token/avatar" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />'
      });
      return;
    }

    if (path.startsWith("/api/notes/shared/workspaces/") && method === "GET") {
      await fulfill(route, {
        ...activeNotes()[0],
        user: {
          ...activeNotes()[0].user,
          photo_url: "/.profiles/user-admin/avatar-seed.jpg"
        },
        shared_at: now,
        share_url: "/api/notes/shared/workspaces/storage-current/share-token"
      });
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
      const jobStatus = options.runningJob ? "running" : "succeeded";
      await fulfill(route, {
        items: [{
          id: "job-demo",
          user: adminUser,
          note_id: "note-demo",
          note_title: "Getting started",
          job_type: "parse_url",
          status: jobStatus,
          client: null,
          created_at: now,
          updated_at: now,
          started_at: now,
          finished_at: options.runningJob ? null : now
        }],
        total: null,
        limit: 50,
        next_cursor: null
      });
      return;
    }

    if (path === "/api/jobs/job-demo" && method === "GET") {
      jobDetailCalls += 1;
      const jobStatus = options.runningJob ? "running" : "succeeded";
      await fulfill(route, {
        id: "job-demo",
        user: adminUser,
        note_id: "note-demo",
        note_title: "Getting started",
        job_type: "parse_url",
        status: jobStatus,
        client: null,
        input: { url: "https://example.test" },
        result: {},
        log: [{
          timestamp: now,
          status: "info",
          command: "start parse_url",
          response: jobDetailCalls > 1 ? "second log line" : "first log line"
        }],
        error: null,
        created_at: now,
        updated_at: now,
        started_at: now,
        finished_at: options.runningJob ? null : now
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

    if (path.startsWith("/api/notes/") && path.endsWith("/share") && method === "POST") {
      const noteId = path.split("/")[3];
      remember("shareNote", { note_id: noteId });
      const index = notes.findIndex((item) => item.id === noteId);
      if (index >= 0) {
        notes[index] = {
          ...notes[index],
          shared_at: now,
          share_url: "http://127.0.0.1:8200/api/notes/shared/workspaces/storage-current/share-token"
        };
      }
      await fulfill(route, {
        share_url: "http://127.0.0.1:8200/api/notes/shared/workspaces/storage-current/share-token"
      });
      return;
    }

    if (path.startsWith("/api/notes/") && method === "GET") {
      const currentNotes = activeNotes();
      await fulfill(route, currentNotes.find((item) => path.endsWith(String(item.id))) ?? currentNotes[0]);
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
      await fulfill(route, storageSettings());
      return;
    }

    if (path === "/api/settings/share" && method === "GET") {
      await fulfill(route, { workspace_url: workspaceUrl });
      return;
    }

    if (path === "/api/settings/share" && method === "PATCH") {
      const payload = await readJson(route);
      remember("shareSettings", payload);
      workspaceUrl = String(payload.workspace_url || "").replace(/\/$/, "") || null;
      await fulfill(route, { workspace_url: workspaceUrl });
      return;
    }

    if (path === "/api/settings/storage/locations" && method === "POST") {
      const payload = await readJson(route);
      remember("storageLocation", payload);
      const name = String(payload.name);
      const folderPath = String(payload.folder_path);
      storageLocations.unshift({
        id: "storage-new",
        name,
        folder_path: folderPath,
        database_path: "/tmp/test-user/data/workspaces/storage-new.db",
        database_exists: true,
        notes_count: 0,
        users_count: 1,
        last_updated_at: null
      });
      await fulfill(route, storageSettings(), 201);
      return;
    }

    if (path === "/api/settings/storage/active" && method === "PATCH") {
      const payload = await readJson(route);
      remember("storageSwitch", payload);
      if (payload.location_id === options.denyWorkspaceSwitchId) {
        await fulfill(route, {
          detail: "This is a protected workspace. Please contact Admin User to request access."
        }, 403);
        return;
      }
      activeLocationId = String(payload.location_id);
      await fulfill(route, { storage: storageSettings(), session_ended: false });
      return;
    }

    if (path === "/api/install/skill" && method === "POST") {
      const payload = await readJson(route);
      remember("skillInstall", payload);
      await fulfill(route, {
        install_url: "http://127.0.0.1:8200/api/install/skill/test-token",
        command: "curl -fsSL http://127.0.0.1:8200/api/install/skill/test-token | bash",
        expires_at: now
      }, 201);
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

  await expect(page.locator("header").getByText("Mianotes", { exact: true })).toBeVisible();
  expect(requests.join?.[0]).toMatchObject({ workspace_access_mode: "admin_only" });
});

test("creates text and link notes from the add note modal", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.getByRole("complementary").getByRole("button", { name: "Add Note" }).click();
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

test("keeps a selected folder's notes visible after renaming the folder", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/folder/demo");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();

  const sidebar = page.locator(".sidebar");
  await sidebar.getByRole("button", { name: "Demo 1" }).hover();
  await page.getByLabel("Folder actions for Demo").click({ force: true });
  await page.getByRole("menuitem", { name: "Rename" }).click();

  const dialog = page.getByRole("dialog", { name: "Rename folder" });
  await dialog.getByLabel("Folder name").fill("mianotes-web-service");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(dialog).toBeHidden();
  await expect(sidebar.getByRole("button", { name: "mianotes-web-service 1" })).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No notes found" })).toBeHidden();
  expect(requests.folderUpdate?.[0]).toMatchObject({ name: "mianotes-web-service" });
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

test("creates and copies a guest share link when a workspace address is configured", async ({ page, context }) => {
  const requests = await mockMianotesApi(page, { workspaceUrl: "https://notes.example.test" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/");
  await page.locator(".note-row-actions").first().getByRole("button", { name: "More note actions" }).click();
  await page.getByRole("menuitem", { name: "Share" }).click();

  const shareNotice = page.getByRole("status").filter({ hasText: "Share link copied to clipboard" });
  await expect(shareNotice).toBeVisible();
  await expect(shareNotice).toHaveClass(/success/);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://notes.example.test/shared/workspaces/storage-current/getting-started/share-token"
  );
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(shareNotice).toBeHidden();
  expect(requests.shareNote?.[0]).toMatchObject({ note_id: "note-demo" });
});

test("clears the copied share link notice when returning from a note", async ({ page, context }) => {
  await mockMianotesApi(page, { workspaceUrl: "https://notes.example.test" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/");
  await page.locator(".note-row").first().click();
  await page.getByLabel("More note actions").click();
  await page.getByRole("menuitem", { name: "Share" }).click();

  const shareNotice = page.getByRole("status").filter({ hasText: "Share link copied to clipboard" });
  await expect(shareNotice).toBeVisible();
  await page.getByLabel("Back to notes").click();
  await expect(shareNotice).toBeHidden();
});

test("treats local workspace origins as unstable share bases", () => {
  expect(stableShareBase(null, "http://federico.local:8201")).toBeNull();
  expect(stableShareBase(null, "http://192.168.1.20:8201")).toBeNull();
  expect(stableShareBase("fed.com", "http://federico.local:8201")).toBe("https://fed.com");
  expect(stableShareBase("http://fed.com", "http://federico.local:8201")).toBe("http://fed.com");
  expect(stableShareBase("http:://fed.com", "http://federico.local:8201")).toBe("http://fed.com");
  expect(stableShareBase("https://notes.example.test", "http://federico.local:8201")).toBe(
    "https://notes.example.test"
  );
});

test("blocks local share links until a workspace address is configured", async ({ page, context }) => {
  const requests = await mockMianotesApi(page);
  await context.addInitScript(() => {
    window.print = () => undefined;
  });

  await page.goto("/");
  await page.locator(".note-row-actions").first().getByRole("button", { name: "More note actions" }).click();
  await page.getByRole("menuitem", { name: "Share" }).click();

  const dialog = page.getByRole("dialog", { name: "Share this note" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("This note is using a local Mianotes address");
  await expect(dialog).toContainText("Add a public workspace address to create reliable links");
  await expect(dialog.getByRole("button", { name: "Go to settings" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Download PDF" })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "Download PDF" }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\/workspace\/storage-current\/note\/note-demo\?print=1$/);
  expect(requests.shareNote).toBeUndefined();
});

test("exports notes as PDF without creating a share link", async ({ page, context }) => {
  const requests = await mockMianotesApi(page);
  await context.addInitScript(() => {
    window.print = () => undefined;
  });

  await page.goto("/");
  await page.locator(".note-row-actions").first().getByRole("button", { name: "More note actions" }).click();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("menuitem", { name: "Export as PDF" }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\/workspace\/storage-current\/note\/note-demo\?print=1$/);
  expect(requests.shareNote).toBeUndefined();
});

test("opens guest shared notes without signing in", async ({ page }) => {
  await mockMianotesApi(page, { authenticated: false });

  await page.goto("/shared/workspaces/storage-current/getting-started/share-token");

  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByText("Welcome to Mianotes.").first()).toBeVisible();
  await expect(page.locator(".shared-note-screen > header")).toHaveCount(0);
  await expect(page.locator(".shared-note-author img.avatar-photo")).toHaveAttribute(
    "src",
    /\/api\/notes\/shared\/workspaces\/storage-current\/share-token\/avatar$/
  );
  await expect(page.locator(".shared-note-footer img")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeHidden();
});

test("validates publish configuration before publishing and hides the form after success", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/folder/archive");
  await expect(page.getByRole("button", { name: /Archive/ })).toHaveClass(/active/);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator(".publish-controls select").first()).toHaveValue("all");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Site configuration" })).toBeVisible();
  await page.getByLabel("Version").fill("");
  await page.locator("form").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("alert")).toContainText("Version is required.");

  await page.getByLabel("Version").fill("0.1.0");
  await page.locator("form").getByRole("button", { name: "Publish" }).click();

  await expect(page.getByRole("status")).toContainText("Your static site is ready.");
  await expect(page.getByRole("button", { name: "Continue" })).toBeHidden();
  expect(requests.publish).toHaveLength(1);
});

test("settings opens on workspaces and generates an API install command from Connect tools", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();

  const settingsNav = page.getByRole("navigation", { name: "Settings navigation" });
  await expect(settingsNav.getByRole("button", { name: "Workspaces" })).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "Workspaces", exact: true })).toBeVisible();

  await settingsNav.getByRole("button", { name: "Connect tools" }).click();
  await page.getByRole("button", { name: "Generate install link" }).click();

  await expect(page.getByText("Install script")).toBeVisible();
  await expect(page.getByText("curl -fsSL http://127.0.0.1:8200/api/install/skill/test-token | bash")).toBeVisible();
  const appOrigin = await page.evaluate(() => window.location.origin);
  expect(requests.skillInstall?.[0]).toMatchObject({
    api_url: appOrigin
  });
});

test("saves a workspace address from settings", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("navigation", { name: "Settings navigation" })
    .getByRole("button", { name: "Custom Domain" })
    .click();
  await page.getByPlaceholder("https://notes.yourdomain.com").fill("https://notes.example.test/");
  await page.getByRole("button", { name: "Save address" }).click();

  await expect(page.getByRole("status")).toContainText("Workspace address saved.");
  await expect(page.getByPlaceholder("https://notes.yourdomain.com")).toHaveValue("https://notes.example.test");
  expect(requests.shareSettings?.[0]).toMatchObject({ workspace_url: "https://notes.example.test/" });
});

test("switches workspaces from the breadcrumb switcher without signing out", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await expect(page.locator(".breadcrumb")).toContainText("Mianotes");
  await expect(
    page.getByRole("navigation", { name: "Dashboard navigation" })
      .getByRole("button", { name: "Mianotes" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();

  await page.getByRole("button", { name: /Change workspace from Mianotes/ }).click();
  await page.getByRole("menuitemradio", { name: /Research/ }).click();

  await expect(page.locator(".breadcrumb")).toContainText("Research");
  await expect(
    page.getByRole("navigation", { name: "Dashboard navigation" })
      .getByRole("button", { name: "Research" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Research brief" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeHidden();
  expect(requests.storageSwitch?.[0]).toMatchObject({ location_id: "storage-archive" });

  await page.locator(".note-row").first().click();
  await expect(page.locator(".note-document-breadcrumb")).toContainText("Research");
  await expect(page.getByRole("heading", { name: "Research brief" })).toBeVisible();
});

test("denied workspace switch keeps the current workspace visible", async ({ page }) => {
  const requests = await mockMianotesApi(page, { denyWorkspaceSwitchId: "storage-archive" });

  await page.goto("/");
  await expect(page.locator(".breadcrumb")).toContainText("Mianotes");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();

  await page.getByRole("button", { name: /Change workspace from Mianotes/ }).click();
  await page.getByRole("menuitemradio", { name: /Research/ }).click();

  const dialog = page.getByRole("dialog", { name: "Protected workspace" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("protected workspace");
  await expect(page.locator(".breadcrumb")).toContainText("Mianotes");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Research brief" })).toBeHidden();
  expect(requests.storageSwitch?.[0]).toMatchObject({ location_id: "storage-archive" });
});

test("creates and switches workspaces from settings without ending the session", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Settings" }).click();

  await expect(page.getByRole("heading", { name: "Current workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Available workspaces" })).toBeVisible();
  await page.getByRole("button", { name: "Create a workspace" }).click();
  await page.getByLabel("Workspace name").fill("Field notes");
  await page.getByLabel("Workspace path").fill("/tmp/test-user/Field notes");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.getByRole("button", { name: /Field notes/ }).click();
  await page.getByRole("button", { name: "Change workspace", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeHidden();
  await expect(page.locator(".breadcrumb")).toContainText("Field notes");
  await expect(
    page.getByRole("navigation", { name: "Dashboard navigation" })
      .getByRole("button", { name: "Field notes" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "No notes found" })).toBeVisible();
  expect(requests.storageLocation?.[0]).toMatchObject({
    name: "Field notes",
    folder_path: "/tmp/test-user/Field notes"
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
  await expect(page.locator(".breadcrumb")).toContainText("Mianotes");
  await expect(page.locator(".breadcrumb")).toContainText("Archive");
  await expect(page.locator(".breadcrumb").getByText("Folder", { exact: true })).toHaveCount(0);

  await page.goto("/users");
  await expect(page.getByRole("region", { name: "All user profiles" })).toBeVisible();
  await expect(page.locator(".breadcrumb")).toHaveText("UsersAll users");
  await expect(page.locator(".breadcrumb-workspace-switcher")).toHaveCount(0);

  await page.goto("/user/user-member/profile");
  await expect(page.getByRole("heading", { name: "Member User" })).toBeVisible();
  await expect(page.locator(".breadcrumb")).toHaveText("UsersMember User");
  await expect(page.locator(".breadcrumb-workspace-switcher")).toHaveCount(0);

  await page.goto("/user/missing-user/profile");
  await expect(page.getByRole("heading", { name: "User not found" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admin User" })).toBeHidden();
  await page.getByRole("button", { name: "View users" }).click();
  await expect(page.getByRole("region", { name: "All user profiles" })).toBeVisible();

  await page.goto("/jobs");
  await expect(page.getByRole("heading", { level: 1, name: "Console" })).toBeVisible();
  await expect(page.locator(".breadcrumb")).toHaveText("Console");
  await expect(page.locator(".breadcrumb-workspace-switcher")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /succeeded.*Parse Url/ })).toBeVisible();
  await page.getByRole("button", { name: "Open Admin User profile" }).click();
  await expect(page).toHaveURL(/\/user\/user-admin\/profile$/);
  await expect(page.getByRole("heading", { name: "Admin User" })).toBeVisible();
  await expect(page.locator(".breadcrumb")).toHaveText("UsersAdmin User");

  await page.goto("/publish");
  await expect(page.getByRole("heading", { name: "Publish your notes" })).toBeVisible();
  await expect(page.locator(".breadcrumb-workspace-switcher")).toHaveCount(1);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.locator(".breadcrumb")).toHaveText("Settings");
  await expect(page.locator(".breadcrumb-workspace-switcher")).toHaveCount(0);
});

test("polls selected Console job details while jobs are active", async ({ page }) => {
  await mockMianotesApi(page, { runningJob: true });

  await page.goto("/jobs");

  await expect(page.getByText("first log line")).toBeVisible();
  await expect(page.getByText("second log line")).toBeVisible({ timeout: 5000 });
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

test("deletes a team member from the users menu", async ({ page }) => {
  const requests = await mockMianotesApi(page);

  await page.goto("/");
  await page.locator(".account-avatar-button").click();
  await page.getByRole("menuitem", { name: "Users" }).click();
  await page.getByRole("button", { name: "Open actions for Admin User" }).click();
  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open actions for Member User" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const deleteDialog = page.getByRole("dialog", { name: "Delete user" });
  await expect(deleteDialog).toContainText('Delete "Member User" from this workspace?');
  await expect(deleteDialog).toContainText("Files on disk will not be deleted.");
  await deleteDialog.getByRole("button", { name: "Delete" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Member User/ })).toBeHidden();
  expect(requests.deleteUser?.[0]).toMatchObject({ user_id: "user-member" });
});
