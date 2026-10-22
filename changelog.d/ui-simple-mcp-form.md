### Changed

- The form for a custom MCP server is now smaller. It has a name, one "URL or command" field, and a closed Advanced part. Type a web address for a Streamable HTTP server, or a command such as `npx -y @acme/mcp` for a STDIO server. Before, you chose STDIO or Streamable HTTP and filled a separate command, argument and URL field.
- Environment variables, the working directory and headers moved into Advanced. A server that already has one of these opens with Advanced open. Saved servers keep their settings.
