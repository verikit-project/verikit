import type { PanelResourceInput } from "@verikit/react-panel";
import { FileTextIcon } from "lucide-react";
import { post } from "./post.ts";

// Resources in the admin panel, in navigation order. Each one gets a list,
// create, and edit page. Register new resources here and in server/app.ts.
export const panelResources: PanelResourceInput[] = [
  { resource: post, icon: FileTextIcon },
];
