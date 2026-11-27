# @verikit/react-panel

A complete admin panel for VeriKit resources that you mount with one component.

```tsx
import { createClient } from "@verikit/client";
import { VerikitProvider } from "@verikit/react";
import { Panel } from "@verikit/react-panel";
import { post, user } from "./resources";

const client = createClient({ baseUrl: "/api" });

export function App() {
  return (
    <VerikitProvider client={client}>
      <Panel title="Acme" resources={[post, user]} />
    </VerikitProvider>
  );
}
```

Each resource gets a navigation entry and four pages:

| URL                        | Page                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `/{resource}`              | Table with search, filters, sorting, and bulk delete            |
| `/{resource}/create`       | Create form                                                     |
| `/{resource}/{id}`         | The record, with relationships by label, Edit, Delete, actions  |
| `/{resource}/{id}/edit`    | Edit form with a Delete button                                  |

Clicking a row opens its record page. Pass `recordClick="edit"` (to the panel,
or to one resource) to keep rows to their Edit button instead, which goes
straight to the edit form.

Serve your `index.html` for every URL under the panel so these pages work on
reload. Vite's dev server already does this.

## Styles

Add the panel and component sources to your Tailwind CSS entry:

```css
@import "@verikit/theme/globals.css";
@source "../node_modules/@verikit/react/dist";
@source "../node_modules/@verikit/react-panel/dist";
```

## Options

```tsx
<Panel
  title="Acme"
  basePath="/admin"            // mount under a path; defaults to "/"
  dashboard={<Dashboard />}    // home page; defaults to opening the first resource
  recordClick="view"           // rows open the record page ("edit": rows keep to Edit)
  resources={[
    post,                      // labels and URL derived from the name: "Posts", /posts
    {
      resource: person,
      label: "People",
      singularLabel: "Person",
      path: "people",
      icon: UsersIcon,         // any component that takes className, e.g. lucide-react
      group: "Accounts",       // navigation heading
      recordClick: "edit",     // overrides the panel's recordClick for this resource
    },
  ]}
/>
```

## Auth

Pass a hook that returns the current session. The panel shows `signIn` until a
user is signed in, then shows the user and a Sign out button in the navigation.

```tsx
function useSession(): PanelSession<User> {
  const { data, isPending } = authClient.useSession();

  if (isPending) return { status: "loading" };
  if (!data) return { status: "unauthenticated" };

  return {
    status: "authenticated",
    user: data.user,
    signOut: () => authClient.signOut(),
  };
}

<Panel resources={resources} auth={{ useSession, signIn: <SignInPage /> }} />;
```

The panel only controls what the browser shows. Enforce access on the server
with `createServer({ context })` and `definePermissions()`. When the signed-in
user changes, create a new client so cached data from the previous user isn't
reused (see `@verikit/client`'s cache identity notes).

## Custom content

`usePanel()` gives a dashboard or other custom content the panel's resources,
page URLs, navigation, and signed-in user. `PanelLink` is an `<a>` that
navigates without reloading the page.

```tsx
function Dashboard() {
  const { resources, href, user } = usePanel<User>();

  return resources.map((entry) => (
    <PanelLink key={entry.path} to={href.create(entry)}>
      New {entry.singularLabel}
    </PanelLink>
  ));
}
```
