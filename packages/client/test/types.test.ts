import type { ResourceDefinition, VerikitClient } from "../src/index.js";

interface Post {
  id: string;
  title: string;
  published: boolean;
}

interface User {
  id: string;
  name: string;
}

type Api = {
  post: ResourceDefinition<
    Post,
    { title: string; published?: boolean },
    { title?: string; published?: boolean },
    {
      publish: {
        input: { notify?: boolean };
        result: { id: string; published: boolean };
      };
    },
    {
      author: { record: User };
    },
    "heroImage"
  >;
};

function checkTypedClient(client: VerikitClient<Api>) {
  const post = client.resource("post");
  void post.create({ title: "Hello" });
  void post.update("1", { published: true });
  void post.list({
    sort: { field: "title" },
    filters: { published: { eq: true } },
  });
  void post.relationship("author", { sort: { field: "name" } });
  void post.upload("heroImage", new Blob());
  void post.action("publish", { notify: true });

  // @ts-expect-error resource names are checked against the API map.
  client.resource("posts");

  // @ts-expect-error create rejects misspelled fields.
  void post.create({ titlle: "Hello" });

  // @ts-expect-error update rejects wrong field types.
  void post.update("1", { published: "yes" });

  // @ts-expect-error sort fields are checked against the record.
  void post.list({ sort: { field: "publishedAt" } });

  // @ts-expect-error relationship names are checked against the resource definition.
  void post.relationship("owner");

  // @ts-expect-error upload fields are checked against the resource definition.
  void post.upload("avatar", new Blob());

  // @ts-expect-error action names are checked against the resource definition.
  void post.action("archive");

  // @ts-expect-error action input is checked against the action definition.
  void post.action("publish", { notify: "yes" });
}

void checkTypedClient;
