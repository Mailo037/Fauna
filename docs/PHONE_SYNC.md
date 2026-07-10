# Phone Sync: access, security, and recovery

Phone Sync exposes a small Fauna-specific HTTP API and the mobile UI from the Electron desktop process. It does not expose the Electron renderer, arbitrary files, or the Local Workspace Bridge directly.

## Trust boundaries

- Phone Sync is disabled until the user enables it.
- Every `/api/*` request requires the current 192-bit bearer token.
- Static mobile assets are public, but they contain no token; QR/deep-link tokens remain in the URL fragment or Android profile storage.
- A phone can be blocked or forgotten in desktop settings. Blocking is enforced after authentication and device identification.
- LAN mode listens on the desktop network interfaces and advertises private IPv4 URLs.
- Internet mode advertises only HTTPS. Public HTTP, URL credentials, paths, query strings, and fragments are rejected for custom endpoints.
- The Local Workspace Bridge remains a separate, opt-in service on `127.0.0.1`. Phone Sync tunnel settings never change its bind host or forward its port.

The Phone Sync token is powerful: a holder can read synchronized chat content, send prompts and attachments, and change the settings exposed to the mobile client. Keep public URLs and tokens together only in trusted devices.

## LAN setup

1. Open **Fauna Desktop > Settings > Phone Sync**.
2. Enable **Android remote access**.
3. Scan the QR code in Fauna Phone, or copy the private Phone URL and token.
4. Confirm the Android profile name and connect.
5. Verify the phone appears under **Paired devices**.

Private HTTP is allowed only for local hosts such as `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, localhost, link-local addresses, and local hostnames.

## Internet setup

### Temporary Quick Tunnel

1. Install Cloudflare's `cloudflared` executable independently and place it on `PATH`.
2. Enable normal Phone Sync first.
3. Choose **Quick Tunnel** and approve the public exposure notice.
4. Wait for the status to become **Online** and pair with the new HTTPS URL.

Fauna launches only:

```text
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:<phone-sync-port>
```

The token is never included in the child-process arguments. Quick Tunnel URLs are temporary and may change after a restart. If `cloudflared` is unavailable or exits, LAN Phone Sync continues to work.

### Stable custom HTTPS

1. Configure and secure your own tunnel or reverse proxy to the local Phone Sync endpoint.
2. Save its public, origin-only HTTPS URL in desktop Phone Sync settings.
3. Choose **Custom HTTPS** and approve the exposure notice.
4. Pair the phone with the advertised URL.

Fauna validates the URL format but cannot prove that your external tunnel routes correctly or applies additional access controls. Keep the Fauna bearer token enabled even when the proxy has its own authentication.

## Multiple Android PCs

The native Android shell stores up to 20 profiles. Each profile contains:

- a generated local profile id;
- a display name;
- the normalized Phone Sync origin;
- the Phone Sync token.

The previous `server_url` and `token` preferences migrate into the first profile once. The top-bar PC control and **Settings > Phone Sync > Manage PCs** return to the native profile manager without exposing tokens to page scripts.

## Backup formats

### Portable desktop settings

Schema: `fauna-portable-settings`, version `1`.

This allowlisted backup contains portable preferences only. It excludes chats, API keys, tokens, paths, bridge controls, workspace controls, and machine-local endpoints. Desktop and mobile both validate the schema and normalize every imported value against the existing setting definition.

### Private Android connections

Schema: `fauna-phone-connections`, version `1`.

This backup intentionally includes Phone Sync tokens so profiles can move to another phone. It is unencrypted JSON and is therefore sensitive. Android platform backup is disabled; export and import require explicit user actions through the system document picker.

## Incident recovery

If a URL, QR code, token, or private connection backup may have leaked:

1. Open desktop **Settings > Phone Sync**.
2. Select **New token**. All old Android pairings and copied links stop authenticating.
3. Stop **Quick Tunnel** or **Custom HTTPS** until the exposure is understood.
4. Block or forget unfamiliar devices.
5. Delete exposed backup files and pair trusted phones again.

If a custom domain or proxy is compromised, rotate the Fauna token and fix or disable that external routing separately.
