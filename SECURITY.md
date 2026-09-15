# Security policy

## Supported versions

| Version | Security fixes |
| --- | --- |
| Latest public release | Supported |
| Older releases and development snapshots | Not supported |

Install KikiLink from the links in [README.md](README.md). Security fixes are made only on the
current release line; users should update before reporting a problem that may already be fixed.

## Report a vulnerability privately

Please use [GitHub private vulnerability reporting](https://github.com/Lilja000/KikiLink/security/advisories/new).
Do not post an unpatched vulnerability in a public issue, chat room, or Discord channel.

Include, when possible:

- the KikiLink version and whether it was loaded by FUSAM or as a standalone userscript;
- browser, userscript manager, and Bondage Club environment;
- reproducible steps and the expected security boundary;
- likely impact and any affected data or accounts; and
- a minimal proof of concept, screenshots, or logs with personal data and tokens removed.

Please test only with accounts and data you control. Do not access another person's data, disrupt a
service, or publish working exploitation details before a fix is available.

## Scope

Reports about KikiLink's source, official build files, storage boundaries, network requests, or
Bondage Club integration are in scope. Bondage Club, FUSAM, browser/userscript-manager behavior,
GitHub, Catbox, and Litterbox have their own security policies, but an integration flaw caused by
KikiLink should still be reported here.

The prepared FUSAM Catbox relay is also in scope, although it is not deployed or enabled. Relevant
reports include bypasses of its exact Bondage Club origin checks, Cloudflare Turnstile verification,
short-lived in-memory bearer token, file signature/type/size checks, request and byte quotas, fixed
Catbox destination, or guarantees that it does not retain file content or forward a Catbox `userhash`,
account cookie, or arbitrary caller headers. Remove bearer tokens, IP addresses, file contents, and
other personal data from reports and logs.

The relay is not an anonymity service: Cloudflare can transiently observe the uploader's IP, origin,
timing, and file bytes, while Catbox receives the file and timing and may receive the uploader IP in
Cloudflare-added forwarding headers as well as the Worker connection. Catbox URLs are public
bearer links. The relay must remain disabled until Catbox grants explicit written permission and any
required whitelisting; Catbox's [Terms](https://catbox.moe/legal.php) prohibit supplying its service
to others, and its
[April 14, 2026 notice](https://blog.catbox.moe/post/813932072453455872/happy-11th-birthday-catbox)
restricts anonymous uploads from datacenter/proxy networks.

For the privacy and trust model that security reports should assume, see [PRIVACY.md](PRIVACY.md).
