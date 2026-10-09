# Security

Only the current main branch receives fixes. This is an experimental game, not a hardened authentication product or financial system.

Do not post vulnerabilities, live credentials, cookies, email verification links or player records in public issues. Use GitHub's **Security → Report a vulnerability** if private vulnerability reporting is enabled. Otherwise ask for a private contact channel in an issue without disclosing the exploit or affected data.

The production Worker requires a session, verified email where applicable, and a verified Google identity matching ADMIN_EMAIL for administrator access. A hidden admin URL is not an access-control mechanism.

Operators must configure provider spending limits, monitor abuse, keep dependencies updated, back up D1, restrict dashboard access, and review logging retention. Rate limits in this code are not a billing cap. Single-player saves are client-submitted; never treat coins or scores as real money or authoritative competitive rankings. No payment processing is implemented.

Before publishing changes, run check:public and a history-aware secret scanner. If a secret was ever exposed, revoke or rotate it first; deleting a file or rewriting Git history alone does not make it safe.

The preparation scan examined 200 locally reachable historical blobs and compared known locally configured secrets, with no matches. That is a limited finding, not a penetration test or a guarantee about remote logs, deleted objects, provider consoles or screenshots.
