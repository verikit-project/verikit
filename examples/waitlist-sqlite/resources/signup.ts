import { defineResource, email, select, text } from "verikit";

// Created with:
//   npx verikit make:resource Signup email:email name:text? \
//     source:select:friend,search,social,other? status:select:waiting,invited
// then edited: email is unique, and status defaults to "waiting" so the
// public signup doesn't send it. Who may do what is in server/permissions.ts.
export const signup = defineResource("signup", {
  fields: {
    email: email()
      .label("Email")
      .required()
      .unique("That email is already on the waitlist.")
      .searchable()
      .sortable(),
    name: text().label("Name").nullable().searchable().sortable(),
    source: select()
      .options(["friend", "search", "social", "other"])
      .label("How did you hear about us?")
      .nullable()
      .filterable(),
    status: select()
      .options(["waiting", "invited"])
      .label("Status")
      .default("waiting")
      .filterable(),
  },
});
