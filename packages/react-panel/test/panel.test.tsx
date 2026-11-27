import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import type { ResourceAdapter } from "@verikit/server";
import { act } from "react";
import type { PanelSession } from "../src/index.js";
import {
  button,
  click,
  installJsdom,
  link,
  text,
  typeInto,
  waitFor,
} from "./dom.js";
import type { PostRecord } from "./harness.js";

// Imported after jsdom is installed: Base UI's Dialog detects the DOM once,
// when first imported. See @verikit/react's resource-table tests.
let harness: typeof import("./harness.js");
let Panel: typeof import("../src/index.js").Panel;
let usePanel: typeof import("../src/index.js").usePanel;
let uninstall: () => void;
let cleanup: (() => void) | undefined;

before(async () => {
  uninstall = installJsdom();
  harness = await import("./harness.js");
  ({ Panel, usePanel } = await import("../src/index.js"));
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstall();
});

function start(
  initial: PostRecord[] = [{ id: "1", title: "Hello", body: "First" }],
  wrap?: (adapter: ResourceAdapter<PostRecord>) => ResourceAdapter<PostRecord>,
) {
  const app = harness.setup(initial, wrap);
  cleanup = app.cleanup;
  return app;
}

function goTo(path: string) {
  window.history.replaceState(null, "", path);
}

function input(name: string): HTMLInputElement {
  return document.querySelector(`[name="${name}"]`) as HTMLInputElement;
}

describe("navigation and routing", () => {
  it("opens the first resource from the home page", async () => {
    const app = start();
    goTo("/admin");
    app.render(
      <Panel basePath="/admin" resources={[harness.post, harness.category]} />,
    );

    await waitFor(() => text().includes("Hello"));
    assert.equal(window.location.pathname, "/admin/posts");
    assert.match(text(), /^Admin/);
    assert.equal(
      document.querySelector('[aria-current="page"]')?.textContent,
      "Posts",
    );

    click(link("Categories"));
    await waitFor(() => window.location.pathname === "/admin/categories");
    assert.equal(
      document.querySelector('[aria-current="page"]')?.textContent,
      "Categories",
    );
  });

  it("explains an empty panel", () => {
    const app = start();
    app.render(<Panel resources={[]} />);

    assert.match(text(), /No resources yet/);
    assert.equal(window.location.pathname, "/");
  });

  it("shows a dashboard at home, grouped navigation, and icons", async () => {
    const app = start();
    const Icon = ({ className }: { className?: string }) => (
      <svg data-testid="icon" className={className} />
    );
    function Dashboard() {
      const { resources, href } = usePanel();
      return (
        <p>Dashboard for {resources.map((r) => href.list(r)).join(",")}</p>
      );
    }

    app.render(
      <Panel
        title="Acme"
        dashboard={<Dashboard />}
        resources={[
          harness.post,
          { resource: harness.category, group: "Catalog", icon: Icon },
        ]}
      />,
    );

    assert.match(text(), /Dashboard for \/posts,\/categories/);
    assert.equal(
      document.querySelector('[aria-current="page"]')?.textContent,
      "Dashboard",
    );
    assert.match(text(), /Catalog/);
    assert.ok(document.querySelector('[data-testid="icon"]'));

    const toggle = button("Toggle navigation");
    click(toggle);
    assert.equal(toggle.getAttribute("aria-expanded"), "true");

    click(link("Posts"));
    await waitFor(() => text().includes("Hello"));
    assert.equal(toggle.getAttribute("aria-expanded"), "false");

    click(link("Acme"));
    assert.equal(window.location.pathname, "/");
  });

  it("shows a not-found page with a way home", () => {
    const app = start();
    goTo("/nowhere");
    app.render(<Panel resources={[harness.post]} dashboard={<p>Home</p>} />);

    assert.match(text(), /Page not found/);
    click(link("Go to the dashboard"));
    assert.match(text(), /Home/);
  });

  it("follows back/forward navigation", async () => {
    const app = start();
    goTo("/posts");
    app.render(<Panel resources={[harness.post]} dashboard={<p>Home</p>} />);
    await waitFor(() => text().includes("Hello"));

    act(() => {
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    assert.match(text(), /Home/);
  });
});

describe("resource pages", () => {
  it("creates a record from the create page", async () => {
    const app = start([]);
    goTo("/posts");
    app.render(<Panel resources={[harness.post]} />);
    await waitFor(() => text().includes("No records found"));

    click(button("New"));
    await waitFor(() => Boolean(input("title")));
    assert.equal(window.location.pathname, "/posts/create");
    assert.match(text(), /New post/);

    typeInto(input("title"), "Created");
    click(button("Create"));

    await waitFor(() => window.location.pathname === "/posts");
    await waitFor(() => text().includes("Created"));
    assert.equal(app.records[0]?.title, "Created");
  });

  it("edits a record from the edit page", async () => {
    const app = start();
    goTo("/posts");
    app.render(<Panel resources={[harness.post]} />);
    await waitFor(() => text().includes("Hello"));

    click(document.querySelector('[aria-label="Edit"]') as HTMLElement);
    await waitFor(() => input("title")?.value === "Hello");
    assert.equal(window.location.pathname, "/posts/1/edit");
    assert.match(text(), /Edit post/);

    typeInto(input("title"), "Changed");
    click(button("Save changes"));

    // Saving returns to the record's page.
    await waitFor(() => window.location.pathname === "/posts/1");
    assert.equal(app.records[0]?.title, "Changed");
    await waitFor(() => text().includes("Changed"));

    goTo("/posts/1/edit");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() => Boolean(input("title")));
    click(link("Post"));
    assert.equal(window.location.pathname, "/posts/1");
    click(link("Posts"));
    assert.equal(window.location.pathname, "/posts");
  });

  it("opens a record's page from its row, with Edit and Delete there", async () => {
    const app = start();
    goTo("/posts");
    app.render(<Panel resources={[harness.post]} />);
    await waitFor(() => text().includes("Hello"));

    // A click on the row itself (here, its title cell) opens the record.
    const cell = Array.from(document.querySelectorAll("tbody td")).find(
      (candidate) => candidate.textContent === "Hello",
    ) as HTMLElement;
    click(cell);
    assert.equal(window.location.pathname, "/posts/1");
    await waitFor(() => document.querySelector("dl") !== null);
    assert.deepEqual(
      Array.from(document.querySelectorAll("dd")).map(
        (node) => node.textContent,
      ),
      ["Hello", "First"],
    );

    click(button("Edit"));
    assert.equal(window.location.pathname, "/posts/1/edit");
    await waitFor(() => input("title")?.value === "Hello");

    goTo("/posts/1");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() => document.querySelector("dl") !== null);
    click(button("Delete"));
    await waitFor(() => document.querySelector('[role="dialog"]') !== null);
    const confirm = Array.from(
      document.querySelectorAll('[role="dialog"] button'),
    ).find((candidate) => candidate.textContent === "Delete") as HTMLElement;
    click(confirm);

    await waitFor(() => window.location.pathname === "/posts");
    assert.equal(app.records.length, 0);
  });

  it('keeps rows to their Edit button with recordClick "edit"', async () => {
    const app = start();
    goTo("/posts");
    app.render(<Panel resources={[harness.post]} recordClick="edit" />);
    await waitFor(() => text().includes("Hello"));

    assert.equal(document.querySelector('[aria-label="View"]'), null);
    click(document.querySelector('[aria-label="Edit"]') as HTMLElement);
    await waitFor(() => input("title")?.value === "Hello");
    assert.throws(() => link("Post"), /no link "Post"/);

    typeInto(input("title"), "Changed");
    click(button("Save changes"));
    await waitFor(() => window.location.pathname === "/posts");
  });

  it("shows loading, missing, and failed records", async () => {
    const find = harness.gate();
    let failFind = false;
    const app = start(undefined, (adapter) => ({
      ...adapter,
      async find(id, options) {
        await find.wait;
        if (failFind) {
          throw new Error("storage offline");
        }
        return adapter.find(id, options);
      },
    }));

    goTo("/posts/missing/edit");
    app.render(<Panel resources={[harness.post]} />);
    assert.match(text(), /Loading…/);

    find.release();
    await waitFor(() => text().includes("doesn't exist or was deleted"));

    failFind = true;
    goTo("/posts/1/edit");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() => Boolean(document.querySelector('[role="alert"]')));
    assert.doesNotMatch(text(), /doesn't exist/);
  });

  it("deletes a record from the edit page", async () => {
    const remove = harness.gate();
    const app = start(undefined, (adapter) => ({
      ...adapter,
      async delete(id, options) {
        await remove.wait;
        return adapter.delete(id, options);
      },
    }));
    goTo("/posts/1/edit");
    app.render(<Panel resources={[harness.post]} />);
    await waitFor(() => Boolean(input("title")));

    click(button("Delete"));
    await waitFor(() => text().includes("Delete this post?"));
    const confirm = Array.from(
      document.querySelectorAll('[role="dialog"] button'),
    ).find((candidate) => candidate.textContent === "Delete") as HTMLElement;
    click(confirm);

    await waitFor(() => text().includes("Deleting…"));
    remove.release();

    await waitFor(() => window.location.pathname === "/posts");
    assert.equal(app.records.length, 0);
  });

  it("shows a failed delete", async () => {
    const app = start(undefined, (adapter) => ({
      ...adapter,
      async delete() {
        throw new Error("storage offline");
      },
    }));
    goTo("/posts/1/edit");
    app.render(<Panel resources={[harness.post]} />);
    await waitFor(() => Boolean(input("title")));

    click(button("Delete"));
    await waitFor(() => text().includes("Delete this post?"));
    click(
      Array.from(document.querySelectorAll('[role="dialog"] button')).find(
        (candidate) => candidate.textContent === "Delete",
      ) as HTMLElement,
    );

    await waitFor(() =>
      Boolean(document.querySelector('[role="dialog"] [role="alert"]')),
    );
    assert.equal(window.location.pathname, "/posts/1/edit");
  });
});

describe("auth", () => {
  function auth<TUser>(session: () => PanelSession<TUser>) {
    return { useSession: session, signIn: <p>Please sign in</p> };
  }

  it("waits for the session, then shows sign-in", () => {
    const app = start();
    let session: PanelSession<{ name: string }> = { status: "loading" };
    const element = () => (
      <Panel resources={[harness.post]} auth={auth(() => session)} />
    );

    app.render(element());
    assert.ok(document.querySelector('[role="status"]'));

    session = { status: "unauthenticated" };
    app.render(element());
    assert.equal(text(), "Please sign in");
  });

  it("shows the user and signs out", async () => {
    const app = start();
    let signedOut = 0;
    app.render(
      <Panel
        resources={[harness.post]}
        auth={auth(() => ({
          status: "authenticated",
          user: { name: "Ada" },
          signOut: () => {
            signedOut += 1;
          },
        }))}
      />,
    );
    await waitFor(() => text().includes("Ada"));

    click(button("Sign out"));
    assert.equal(signedOut, 1);
  });

  it("labels users by name, email, or a custom label", () => {
    const cases: [unknown, string, ((user: unknown) => string)?][] = [
      [{ name: "", email: "ada@example.com" }, "ada@example.com"],
      [{ email: 42 }, ""],
      [null, ""],
      [{ id: 7 }, "User 7", (user) => `User ${(user as { id: number }).id}`],
    ];

    for (const [user, label, userLabel] of cases) {
      const app = start();
      app.render(
        <Panel
          resources={[harness.post]}
          dashboard={<p>Home</p>}
          auth={{
            ...auth(() => ({ status: "authenticated", user })),
            userLabel,
          }}
        />,
      );

      const footer = document.querySelector("aside > div:last-child > div");
      assert.equal(footer?.querySelector("span")?.textContent, label);
      assert.equal(
        Array.from(document.querySelectorAll("button")).some(
          (candidate) => candidate.textContent === "Sign out",
        ),
        false,
      );
      app.cleanup();
      cleanup = undefined;
    }
  });
});
