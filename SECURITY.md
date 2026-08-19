# Security Policy

## Supported Versions

VeriKit is currently in active pre-1.0 development.

Security fixes are provided for the latest released version. Users are
encouraged to keep VeriKit packages up to date.

| Version        | Supported |
| -------------- | --------- |
| Latest release | ✅        |
| Older releases | ❌        |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

To report a vulnerability, use GitHub's private vulnerability reporting
feature for the VeriKit repository.

When submitting a report, please include:

- A description of the vulnerability.
- The affected package(s) and version(s).
- Steps to reproduce the issue.
- The potential security impact.
- A proof of concept, if available.
- Any suggested mitigation or fix, if known.

Please avoid publicly disclosing the vulnerability until it has been
investigated and, where necessary, a fix has been released.

## Response Process

Security reports will be reviewed and validated as soon as reasonably
possible.

If a vulnerability is confirmed, the project will work toward a fix and
coordinate disclosure through an appropriate security release or advisory.

Reports that cannot be reproduced or are not considered security
vulnerabilities may be closed with an explanation.

## Scope

Security issues may include vulnerabilities affecting VeriKit's:

- Server request handling and validation.
- Authentication or authorization boundaries provided by VeriKit.
- Resource and field permission enforcement.
- File and image upload handling.
- Database adapters.
- Generated API behavior.
- Client/server data handling.
- Dependency or supply-chain security where VeriKit introduces or exposes
  the vulnerability.

General bugs without a security impact should be reported through the normal
GitHub issue tracker.