import assert from "node:assert/strict";
import { describe, it } from "node:test";

// A fresh in-memory database and a known admin token for every run.
process.env.DATABASE_PATH = ":memory:";
process.env.ADMIN_TOKEN = "test-admin-token";
const { app } = await import("../server/app.ts");

const ADMIN = { authorization: "Bearer test-admin-token" };

async function api(
  path: string,
  {
    method = "GET",
    body,
    headers = {},
  }: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  const response = await app.fetch(
    new Request(`http://test/api${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function join(email: string) {
  return api("/signup", {
    method: "POST",
    body: { email, name: "Test", source: "friend" },
  });
}

async function findId(email: string): Promise<string> {
  const { body } = await api(`/signup?search=${encodeURIComponent(email)}`, {
    headers: ADMIN,
  });
  return body.data[0].id;
}

describe("the public", () => {
  it("can join the waitlist but not see it", async () => {
    assert.equal((await join("public@example.com")).status, 201);
    assert.equal((await api("/signup")).status, 403);
    assert.equal(
      (await api("/signup", { headers: { authorization: "Bearer wrong" } }))
        .status,
      403,
    );
  });

  it("can't choose their own status", async () => {
    const { status, body } = await api("/signup", {
      method: "POST",
      body: { email: "sneaky@example.com", status: "invited" },
    });
    assert.equal(status, 400);
    assert.match(
      JSON.stringify(body),
      /You do not have permission to write to \\"status\\"/,
    );
  });

  it("gets a clear error for a duplicate email", async () => {
    await join("twice@example.com");
    const { status, body } = await join("twice@example.com");

    assert.equal(status, 400);
    assert.match(JSON.stringify(body), /already on the waitlist/);
  });
});

describe("an admin", () => {
  it("sees signups, which start out waiting", async () => {
    await join("waiting@example.com");
    const { status, body } = await api("/signup?search=waiting@", {
      headers: ADMIN,
    });

    assert.equal(status, 200);
    assert.equal(body.data[0].email, "waiting@example.com");
    assert.equal(body.data[0].status, "waiting");
  });

  it("can edit a signup; revisions make this safe without extra setup", async () => {
    await join("edit@example.com");
    const id = await findId("edit@example.com");
    const { status, body } = await api(`/signup/${id}`, {
      method: "PATCH",
      body: { name: "Edited" },
      headers: ADMIN,
    });

    assert.equal(status, 200);
    assert.equal(body.data.name, "Edited");
  });

  it("can invite a signup, which only admins may do", async () => {
    await join("invite@example.com");
    const id = await findId("invite@example.com");
    const invite = (body: object, headers: Record<string, string> = ADMIN) =>
      api("/signup/actions/invite", { method: "POST", body, headers });

    // A record the caller may not read looks missing, so its existence
    // isn't revealed.
    assert.equal((await invite({ recordId: id }, {})).status, 404);

    // The declaration asks for confirmation, so an unconfirmed call is refused.
    assert.equal((await invite({ recordId: id })).status, 409);
    assert.equal((await invite({ confirmed: true })).status, 400);

    const invited = await invite({ recordId: id, confirmed: true });
    assert.equal(invited.status, 200);
    assert.deepEqual(invited.body.data, { id, status: "invited" });

    const { body } = await api(`/signup/${id}`, { headers: ADMIN });
    assert.equal(body.data.status, "invited");

    // availableWhen turns the action off once someone is invited.
    const again = await invite({ recordId: id, confirmed: true });
    assert.equal(again.status, 422);
    assert.match(JSON.stringify(again.body), /Already invited/);

    // The action bumped the revision, so editing afterwards still works.
    const edited = await api(`/signup/${id}`, {
      method: "PATCH",
      body: { name: "Invited person" },
      headers: ADMIN,
    });
    assert.equal(edited.status, 200);
  });

  it("is told which rows can't be invited, so the panel can disable them", async () => {
    await join("listed@example.com");
    const id = await findId("listed@example.com");
    await api("/signup/actions/invite", {
      method: "POST",
      body: { recordId: id, confirmed: true },
      headers: ADMIN,
    });

    const { body } = await api("/signup?include=actions", { headers: ADMIN });
    assert.match(JSON.stringify(body.meta.actions), /Already invited/);
  });

  it("can delete a signup", async () => {
    await join("delete@example.com");
    const id = await findId("delete@example.com");

    assert.equal(
      (await api(`/signup/${id}`, { method: "DELETE", headers: ADMIN })).status,
      204,
    );
    assert.equal((await api(`/signup/${id}`, { headers: ADMIN })).status, 404);
  });
});
