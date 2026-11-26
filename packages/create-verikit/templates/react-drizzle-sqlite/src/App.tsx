import { Panel } from "@verikit/react-panel";
import { panelResources } from "../resources/index.ts";

export function App() {
  return <Panel title="{{projectName}}" resources={panelResources} />;
}
