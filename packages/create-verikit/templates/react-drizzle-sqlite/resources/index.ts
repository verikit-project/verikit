import { post } from "./post.ts";

// Resources shown in the sidebar. Add new resources here and in server/app.ts.
export const navigation = [{ label: "Posts", resource: post }];
