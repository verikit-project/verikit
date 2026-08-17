# @verikit/server

Web-standard CRUD and action server for VeriKit resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Upload security

`file()` and `image()` accept rules validate the client-supplied filename and
MIME type; they do not verify the actual file contents.

Use `createServer({ uploadProcessor })` to verify file signatures, scan for
malware, or re-encode untrusted images before `storage.put()`. The processor can
reject an upload by throwing a `VerikitError` or return a sanitized `File`.

Storage implementations should generate server-side object keys, never use
client filenames as paths, and serve uploads from a non-executable origin.
Apply appropriate access control, retention, and malware-scanning policies.