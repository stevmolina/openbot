### Changed

- Composio, PostHog, Airtable and Resend now connect with a sign-in in the browser. Click Connect, sign in to your account, and the app is ready. Before, Composio asked for an MCP URL and an API key, and PostHog, Airtable and Resend asked for an API key.
- Airtable and Resend now use the official hosted MCP server of each company. Before, OpenBot started a local server with `npx`.
- Apps that you connected before with a URL or an API key keep their settings and continue to work.
