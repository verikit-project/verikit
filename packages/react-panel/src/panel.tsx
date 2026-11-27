import { Button } from "@verikit/react/components/button";
import { cn } from "@verikit/react/lib/utils";
import { LayoutDashboardIcon, LogOutIcon, MenuIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { PanelContext, usePanel, type PanelContextValue } from "./context.js";
import { PanelLink } from "./link.js";
import {
  CreatePage,
  DetailPage,
  EditPage,
  ListPage,
  NotFoundPage,
} from "./pages.js";
import {
  normalizePanelResources,
  type PanelRecordClick,
  type PanelResourceEntry,
  type PanelResourceInput,
} from "./resources.js";
import { navigate, usePathname } from "./routing/location.js";
import {
  matchPanelRoute,
  normalizeBasePath,
  panelHref,
  type PanelRoute,
} from "@verikit/ui-core/routing/routes";

/** The current sign-in state, as returned by `auth.useSession()`. */
export type PanelSession<TUser> =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      user: TUser;
      /** Shows a "Sign out" button in the navigation when provided. */
      signOut?: () => void | Promise<void>;
    };

/** Puts the panel behind sign-in. */
export interface PanelAuth<TUser> {
  /**
   * A React hook returning the current session, for example a thin wrapper
   * around your auth library's own session hook. Called on every render.
   */
  useSession: () => PanelSession<TUser>;
  /** Rendered instead of the panel when the session is unauthenticated. */
  signIn: ReactNode;
  /** Text shown for the signed-in user. Defaults to `name`, then `email`. */
  userLabel?: (user: TUser) => string;
}

/** Props for {@link Panel}. */
export interface PanelProps<TUser = unknown> {
  /** Resources to manage, in navigation order. */
  resources: readonly PanelResourceInput[];
  /** Shown at the top of the navigation. Defaults to `"Admin"`. */
  title?: string;
  /** URL path the panel is mounted at, such as `"/admin"`. Defaults to `"/"`. */
  basePath?: string;
  /**
   * Content for the panel's home page, listed as "Dashboard" in the
   * navigation. Without one, the home page opens the first resource.
   */
  dashboard?: ReactNode;
  /** Requires a signed-in user before showing the panel. */
  auth?: PanelAuth<TUser>;
  /**
   * Where list rows lead: `"view"` (the default) opens the record's page,
   * where Edit is; `"edit"` keeps rows to their Edit button, which opens the
   * edit page. A resource's own `recordClick` overrides this.
   */
  recordClick?: PanelRecordClick;
}

function defaultUserLabel(user: unknown): string {
  const { name, email } = (user ?? {}) as { name?: unknown; email?: unknown };

  if (typeof name === "string" && name) {
    return name;
  }

  return typeof email === "string" ? email : "";
}

/**
 * A complete admin panel for Verikit resources: navigation, a list page with
 * search, filters, and bulk delete, plus record, create, and edit pages for
 * each resource. Must be rendered inside a `VerikitProvider`.
 *
 * Routes (relative to `basePath`): `/`, `/{resource}`, `/{resource}/create`,
 * `/{resource}/{id}`, and `/{resource}/{id}/edit`. Serve your app's
 * `index.html` for every path under `basePath` so these URLs work on reload.
 */
export function Panel<TUser = unknown>(props: PanelProps<TUser>): ReactElement {
  return props.auth ? (
    <AuthenticatedPanel {...props} auth={props.auth} />
  ) : (
    <PanelShell {...props} user={undefined} signOut={undefined} />
  );
}

function AuthenticatedPanel<TUser>(
  props: PanelProps<TUser> & { auth: PanelAuth<TUser> },
): ReactElement {
  const session = props.auth.useSession();

  if (session.status === "loading") {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
      >
        Loading…
      </div>
    );
  }

  if (session.status === "unauthenticated") {
    return <>{props.auth.signIn}</>;
  }

  return (
    <PanelShell
      {...props}
      user={session.user}
      signOut={session.signOut}
      userLabel={(props.auth.userLabel ?? defaultUserLabel)(session.user)}
    />
  );
}

interface PanelShellProps<TUser> extends PanelProps<TUser> {
  user: TUser | undefined;
  signOut: (() => void | Promise<void>) | undefined;
  userLabel?: string;
}

function PanelShell<TUser>({
  resources: inputs,
  title = "Admin",
  basePath: rawBasePath = "/",
  dashboard,
  recordClick,
  user,
  signOut,
  userLabel,
}: PanelShellProps<TUser>): ReactElement {
  const resources = useMemo(
    () => normalizePanelResources(inputs, { recordClick }),
    [inputs, recordClick],
  );
  const basePath = normalizeBasePath(rawBasePath);
  const pathname = usePathname();
  const route = matchPanelRoute(
    pathname,
    basePath,
    new Set(resources.map((entry) => entry.path)),
  );

  const context: PanelContextValue = {
    basePath,
    resources,
    user,
    signOut,
    navigate,
    href: {
      home: () => panelHref(basePath),
      list: (entry) => panelHref(basePath, entry.path),
      create: (entry) => panelHref(basePath, entry.path, "create"),
      view: (entry, id) => panelHref(basePath, entry.path, id),
      edit: (entry, id) => panelHref(basePath, entry.path, id, "edit"),
    },
  };

  return (
    <PanelContext.Provider value={context}>
      <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
        <Sidebar
          title={title}
          route={route}
          hasDashboard={dashboard !== undefined}
          userLabel={userLabel}
        />
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <RouteContent route={route} dashboard={dashboard} />
        </main>
      </div>
    </PanelContext.Provider>
  );
}

function RouteContent({
  route,
  dashboard,
}: {
  route: PanelRoute;
  dashboard: ReactNode;
}): ReactNode {
  const { resources } = usePanel();

  if (route.kind === "home") {
    return dashboard === undefined ? <OpenFirstResource /> : dashboard;
  }

  if (route.kind === "notFound") {
    return <NotFoundPage />;
  }

  // matchPanelRoute only returns resource routes for known paths.
  const entry = resources.find(
    (candidate) => candidate.path === route.resource,
  )!;

  if (route.kind === "create") {
    return <CreatePage key={entry.path} entry={entry} />;
  }

  if (route.kind === "view") {
    return (
      <DetailPage
        key={`${entry.path}/${route.id}`}
        entry={entry}
        id={route.id}
      />
    );
  }

  if (route.kind === "edit") {
    return (
      <EditPage key={`${entry.path}/${route.id}`} entry={entry} id={route.id} />
    );
  }

  return <ListPage key={entry.path} entry={entry} />;
}

function OpenFirstResource(): ReactNode {
  const { resources, href } = usePanel();
  const target = resources[0] ? href.list(resources[0]) : undefined;

  useEffect(() => {
    if (target) {
      navigate(target, { replace: true });
    }
  }, [target]);

  return target ? null : (
    <p className="text-sm text-muted-foreground">
      No resources yet. Pass some to <code>&lt;Panel resources&gt;</code>.
    </p>
  );
}

function NavItem({
  to,
  active,
  icon: Icon,
  onNavigate,
  children,
}: {
  to: string;
  active: boolean;
  icon?: ComponentType<{ className?: string }>;
  onNavigate: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <PanelLink
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </PanelLink>
  );
}

function groupResources(
  resources: readonly PanelResourceEntry[],
): [string | undefined, PanelResourceEntry[]][] {
  const groups = new Map<string | undefined, PanelResourceEntry[]>([
    [undefined, []],
  ]);

  for (const entry of resources) {
    const group = groups.get(entry.group) ?? [];
    group.push(entry);
    groups.set(entry.group, group);
  }

  return [...groups].filter(([, entries]) => entries.length > 0);
}

function Sidebar({
  title,
  route,
  hasDashboard,
  userLabel,
}: {
  title: string;
  route: PanelRoute;
  hasDashboard: boolean;
  userLabel: string | undefined;
}): ReactElement {
  const { resources, href, user, signOut } = usePanel();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const activePath = "resource" in route ? route.resource : undefined;

  return (
    <aside className="flex shrink-0 flex-col border-b border-border bg-muted/40 md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-2 p-4">
        <PanelLink
          to={href.home()}
          onClick={closeMenu}
          className="truncate font-semibold"
        >
          {title}
        </PanelLink>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon />
        </Button>
      </div>
      <div
        className={cn(
          "flex-1 flex-col md:flex md:overflow-y-auto",
          menuOpen ? "flex" : "hidden",
        )}
      >
        <nav aria-label="Panel" className="grid gap-4 px-2 pb-4">
          {hasDashboard ? (
            <NavItem
              to={href.home()}
              active={route.kind === "home"}
              icon={LayoutDashboardIcon}
              onNavigate={closeMenu}
            >
              Dashboard
            </NavItem>
          ) : null}
          {groupResources(resources).map(([group, entries]) => (
            <div key={group ?? ""} className="grid gap-0.5">
              {group ? (
                <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group}
                </p>
              ) : null}
              {entries.map((entry) => (
                <NavItem
                  key={entry.path}
                  to={href.list(entry)}
                  active={activePath === entry.path}
                  icon={entry.icon}
                  onNavigate={closeMenu}
                >
                  {entry.label}
                </NavItem>
              ))}
            </div>
          ))}
        </nav>
        {user !== undefined ? (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border p-4 text-sm">
            <span className="truncate">{userLabel}</span>
            {signOut ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
              >
                <LogOutIcon />
                Sign out
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
