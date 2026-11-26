import { Panel } from "verikit/react-panel";
import { resources } from "../resources/index.ts";

// To set a resource's label, icon, or navigation group, pass an object
// instead, e.g. resources={[{ resource: post, icon: FileTextIcon }]}.
export function App() {
  return <Panel title="{{projectName}}" resources={resources} />;
}
