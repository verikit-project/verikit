import { action } from "verikit";

// Actions for "signup", declared where the browser can see them: the admin
// panel shows each one as a button on every row, with this label and
// confirmation. The server-side handler is in actions/signup/invite.ts.
// Created with `npx verikit make:action signup invite`, then given a
// confirmation.
export const invite = action("invite")
  .label("Invite")
  .confirmation("Send this person an invitation?");
