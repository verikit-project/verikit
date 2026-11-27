import {
  ResourceDetail,
  ResourceForm,
  ResourceTable,
  useDeleteResource,
  useResourceFind,
} from "@verikit/react";
import { Button } from "@verikit/react/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@verikit/react/components/dialog";
import { recordId } from "@verikit/ui-core/query/optimistic";
import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { usePanel } from "./context.js";
import { PanelLink } from "./link.js";
import type { PanelResourceEntry } from "./resources.js";

interface Crumb {
  label: string;
  to: string;
}

function PageHeader({
  title,
  crumbs = [],
  actions,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}): ReactElement {
  return (
    <header className="mb-6">
      {crumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex items-center gap-1 text-sm text-muted-foreground"
        >
          {crumbs.map((crumb) => (
            <span key={crumb.to} className="flex items-center gap-1">
              <PanelLink to={crumb.to} className="hover:text-foreground">
                {crumb.label}
              </PanelLink>
              <ChevronRightIcon className="size-3.5" />
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions}
      </div>
    </header>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function ListPage({
  entry,
}: {
  entry: PanelResourceEntry;
}): ReactElement {
  const { href, navigate } = usePanel();

  return (
    <>
      <PageHeader title={entry.label} />
      <ResourceTable
        resource={entry.resource}
        actions
        onCreate={() => navigate(href.create(entry))}
        // Adapters guarantee every record has a string or numeric id.
        onEdit={(record) => navigate(href.edit(entry, recordId(record)!))}
        onView={
          entry.recordClick === "view"
            ? (record) => navigate(href.view(entry, recordId(record)!))
            : undefined
        }
      />
    </>
  );
}

export function CreatePage({
  entry,
}: {
  entry: PanelResourceEntry;
}): ReactElement {
  const { href, navigate } = usePanel();

  return (
    <>
      <PageHeader
        title={`New ${lowerFirst(entry.singularLabel)}`}
        crumbs={[{ label: entry.label, to: href.list(entry) }]}
      />
      <div className="max-w-2xl rounded-lg border border-border p-4 md:p-6">
        <ResourceForm
          resource={entry.resource}
          submitLabel="Create"
          onSuccess={() => navigate(href.list(entry))}
        />
      </div>
    </>
  );
}

function DeleteRecordButton({
  entry,
  id,
}: {
  entry: PanelResourceEntry;
  id: string;
}): ReactElement {
  const { href, navigate } = usePanel();
  const [open, setOpen] = useState(false);
  const remove = useDeleteResource(entry.resource.name, {
    onSuccess: () => navigate(href.list(entry)),
  });
  const noun = lowerFirst(entry.singularLabel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        Delete
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this {noun}?</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        {remove.error ? (
          <p role="alert" className="text-sm text-destructive">
            {remove.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id)}
          >
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isNotFound(error: Error): boolean {
  return (error as { status?: unknown }).status === 404;
}

/**
 * A record's page: its fields, with relationships shown by their related
 * record's label, and its Edit, Delete, and declared actions. Edit opens the
 * edit page; deleting returns to the list.
 */
export function DetailPage({
  entry,
  id,
}: {
  entry: PanelResourceEntry;
  id: string;
}): ReactElement {
  const { href, navigate } = usePanel();

  return (
    <>
      <PageHeader
        title={entry.singularLabel}
        crumbs={[{ label: entry.label, to: href.list(entry) }]}
      />
      <ResourceDetail
        className="max-w-3xl"
        resource={entry.resource}
        id={id}
        actions
        onEdit={() => navigate(href.edit(entry, id))}
        onDeleted={() => navigate(href.list(entry))}
      />
    </>
  );
}

export function EditPage({
  entry,
  id,
}: {
  entry: PanelResourceEntry;
  id: string;
}): ReactElement {
  const { href, navigate } = usePanel();
  const record = useResourceFind(entry.resource.name, id);
  const withRecordPage = entry.recordClick === "view";
  const crumbs = [
    { label: entry.label, to: href.list(entry) },
    ...(withRecordPage
      ? [{ label: entry.singularLabel, to: href.view(entry, id) }]
      : []),
  ];
  const title = `Edit ${lowerFirst(entry.singularLabel)}`;

  if (record.error) {
    return (
      <>
        <PageHeader title={title} crumbs={crumbs} />
        <p role="alert" className="text-sm text-destructive">
          {isNotFound(record.error)
            ? `This ${lowerFirst(entry.singularLabel)} doesn't exist or was deleted.`
            : record.error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        crumbs={crumbs}
        actions={<DeleteRecordButton entry={entry} id={id} />}
      />
      <div className="max-w-2xl rounded-lg border border-border p-4 md:p-6">
        {record.data ? (
          <ResourceForm
            key={id}
            resource={entry.resource}
            id={id}
            defaultValues={record.data}
            submitLabel="Save changes"
            onSuccess={() =>
              navigate(withRecordPage ? href.view(entry, id) : href.list(entry))
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </div>
    </>
  );
}

export function NotFoundPage(): ReactElement {
  const { href } = usePanel();

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        There&apos;s nothing at this address.
      </p>
      <PanelLink
        to={href.home()}
        className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
      >
        Go to the dashboard
      </PanelLink>
    </div>
  );
}
