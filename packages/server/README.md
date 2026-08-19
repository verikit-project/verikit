# @verikit/server

Web-standard CRUD and action server for VeriKit resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Upload security

`file()` and `image()` accept rules verify recognized file signatures before
storage. In particular, `image()` rejects content that cannot be identified as
an image, even if its multipart MIME type or filename claims otherwise.

Use `createServer({ uploadProcessor })` to scan for malware, validate formats
that do not have a recognized signature, or re-encode untrusted images before
`storage.put()`. The processor can reject an upload by throwing a
`VerikitError` or return a sanitized `File`; its output is signature-validated
before storage.

Storage implementations should generate server-side object keys, never use
client filenames as paths, and serve uploads from a non-executable origin.
Apply appropriate access control, retention, and malware-scanning policies.

For resources with a `PermissionsBuilder`, uploads are fail-closed and require
both `.can("upload", ...)` and field-level write access. Upload permission is
separate from create/update because an upload persists to storage before any
record mutation occurs.
