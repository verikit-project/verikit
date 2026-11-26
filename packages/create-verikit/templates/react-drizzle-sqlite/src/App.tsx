import { ResourceTable } from "@verikit/react";
import { useState } from "react";
import { navigation } from "../resources/index.ts";

export function App() {
  const [active, setActive] = useState(navigation[0]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b bg-muted/40 p-4 md:w-56 md:border-r md:border-b-0">
        <p className="mb-4 px-2 text-sm font-semibold">{"{{projectName}}"}</p>
        <nav className="flex gap-1 md:flex-col">
          {navigation.map((item) => (
            <button
              key={item.resource.name}
              type="button"
              onClick={() => setActive(item)}
              className={
                "rounded-md px-2 py-1.5 text-left text-sm " +
                (item === active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60")
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-semibold">{active.label}</h1>
        <ResourceTable
          key={active.resource.name}
          resource={active.resource}
          actions
        />
      </main>
    </div>
  );
}
