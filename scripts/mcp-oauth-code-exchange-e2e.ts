// Signs in to an MCP server that registers its clients (dynamic client registration, PKCE) through
// the real probe and `McpOAuth`, against a local server that mirrors Composio Connect: the MCP
// endpoint answers 401 until it gets a token, its metadata lists only `none` as a token endpoint
// authentication method, and yet a registration that names no method is made a confidential client
// (`client_secret_basic`) whose grant is refused with `invalid_client` unless it sends the secret.
// The sign-in must end with a token, from one registration.
// `bun scripts/mcp-oauth-code-exchange-e2e.ts`. Writes .openbot-build/mcp-oauth-code-exchange-e2e/report.json.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { McpServerConfig } from "@openbot/contracts/ipc";
import { Effect } from "effect";
import { z } from "zod";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { McpOAuth, type McpOAuthRecord } from "../src/backend/mcp-oauth-provider";
import { testMcpServer } from "../src/backend/mcp-probe";

const out = resolve(import.meta.dirname, "../.openbot-build/mcp-oauth-code-exchange-e2e");
const ACCESS_TOKEN = "e2e-access-token";
const CLIENT_ID = "e2e-registered-client";
const GRANT = "e2e-grant";

async function body(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function json(response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(value));
}

const registrationRequest = z.looseObject({ token_endpoint_auth_method: z.string().optional() });
const rpcRequest = z.looseObject({ id: z.union([z.string(), z.number()]).optional(), method: z.string() });

/** The client ID of an HTTP Basic `Authorization` header, which names it before the colon. */
function basicClientId(header: string | undefined): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  return decodeURIComponent(decoded.split(":")[0] ?? "");
}

interface Hits {
  registrations: number;
  tokenRequests: { clientId: string | null; code: string | null }[];
}

interface Report {
  passed: boolean;
  result?: { toolCount: number; error: string | null };
  pagesOpened?: number;
  registrations?: number;
  tokenRequests?: Hits["tokenRequests"];
  signedIn?: boolean;
  storeWrites?: string[];
}

async function fakeComposio() {
  const hits: Hits = { registrations: 0, tokenRequests: [] };
  let base = "";
  const confidential = new Map<string, boolean>();
  // Composio registers and trades grants on another origin (`login.composio.dev`) than the one it
  // advertises as the authorization server; `localhost` is the second origin here.
  const loginBase = () => base.replace("127.0.0.1", "localhost");
  const server = createServer((request, response) => {
    void (async () => {
      const path = new URL(request.url ?? "/", base).pathname;
      if (path === "/.well-known/oauth-protected-resource/mcp" || path === "/.well-known/oauth-protected-resource")
        return json(response, 200, { resource: `${base}/mcp`, authorization_servers: [base] });
      if (path === "/.well-known/oauth-authorization-server")
        return json(response, 200, {
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${loginBase()}/token`,
          registration_endpoint: `${loginBase()}/register`,
          response_types_supported: ["code"],
          token_endpoint_auth_methods_supported: ["none"],
          code_challenge_methods_supported: ["S256"],
          grant_types_supported: ["authorization_code", "refresh_token"],
        });
      if (path === "/register" && request.method === "POST") {
        hits.registrations += 1;
        const metadata = registrationRequest.parse(JSON.parse(await body(request)));
        const method = metadata.token_endpoint_auth_method ?? "client_secret_basic";
        const clientId = `${CLIENT_ID}-${hits.registrations}`;
        confidential.set(clientId, method !== "none");
        return json(response, 201, {
          ...metadata,
          client_id: clientId,
          token_endpoint_auth_method: method,
          ...(method === "none" ? {} : { client_secret: "e2e-client-secret", client_secret_expires_at: 0 }),
        });
      }
      if (path === "/token" && request.method === "POST") {
        const form = new URLSearchParams(await body(request));
        const basic = request.headers.authorization?.startsWith("Basic ") ?? false;
        const clientId = form.get("client_id") ?? basicClientId(request.headers.authorization);
        hits.tokenRequests.push({ clientId, code: form.get("code") });
        if (clientId !== null && confidential.get(clientId) && !basic && !form.has("client_secret"))
          return json(response, 401, { error: "invalid_client", error_description: "Missing client_secret." });
        if (form.get("code") !== GRANT) return json(response, 400, { error: "invalid_grant" });
        return json(response, 200, { access_token: ACCESS_TOKEN, token_type: "Bearer", expires_in: 3600 });
      }
      if (path !== "/mcp") return json(response, 404, { error: "not found" });
      if (request.headers.authorization !== `Bearer ${ACCESS_TOKEN}`)
        return json(
          response,
          401,
          { error: "unauthorized" },
          { "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"` },
        );
      if (request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      const message = rpcRequest.parse(JSON.parse(await body(request)));
      if (message.id === undefined) {
        response.writeHead(202).end();
        return;
      }
      if (message.method === "initialize")
        return json(response, 200, {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "fake-composio", version: "1" },
          },
        });
      const tool = (name: string) => ({ name, description: name, inputSchema: { type: "object", properties: {} } });
      return json(response, 200, {
        jsonrpc: "2.0",
        id: message.id,
        result: { tools: [tool("search_tools"), tool("execute_tool")] },
      });
    })().catch((error: unknown) => {
      response.writeHead(500).end(String(error));
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address !== null && typeof address === "object", "the server listens on a TCP port");
  base = `http://127.0.0.1:${address.port}`;
  return {
    url: `${base}/mcp`,
    hits,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

function httpConfig(url: string): McpServerConfig {
  return {
    id: "fake-composio",
    name: "fake_composio",
    transport: "http",
    enabled: true,
    command: "",
    args: [],
    env: [],
    envPassthrough: [],
    workingDirectory: "",
    url,
    headers: [],
  };
}

async function main(): Promise<void> {
  await mkdir(out, { recursive: true });
  const server = await fakeComposio();
  const records = new Map<string, McpOAuthRecord>();
  const writes: string[] = [];
  let pagesOpened = 0;
  const oauth: McpOAuth = new McpOAuth({
    storage: {
      read: (resource) => records.get(resource) ?? null,
      write: (resource, record) =>
        Effect.sync(() => {
          writes.push(`write client=${record.client?.client_id ?? "-"} issuer=${record.client?.issuer ?? "-"}`);
          records.set(resource, record);
        }),
      clear: (resource) =>
        Effect.sync(() => {
          writes.push("clear");
          records.delete(resource);
        }),
    },
    openExternal: async (page) => {
      pagesOpened += 1;
      const state = new URL(page).searchParams.get("state");
      assert.ok(state, "the page has a state");
      setTimeout(() => oauth.receiveAuthorizationCode(state, GRANT), 50);
    },
    redirectUrl: "http://127.0.0.1:28417/mcp-auth",
    signInTimeoutMs: 10_000,
  });
  const report: Report = { passed: false };
  try {
    const authority = {
      accessToken: (url: string) => oauth.accessToken(url),
      signIn: (url: string) => oauth.signIn(url),
    };
    const result = await runCauseEffect(testMcpServer(httpConfig(server.url), 10_000, undefined, authority, "here"));
    Object.assign(report, {
      result,
      pagesOpened,
      registrations: server.hits.registrations,
      tokenRequests: server.hits.tokenRequests,
      signedIn: oauth.signedIn(server.url),
      storeWrites: writes,
    });
    report.passed =
      result.error === null &&
      result.toolCount === 2 &&
      pagesOpened === 1 &&
      server.hits.registrations === 1 &&
      server.hits.tokenRequests.length === 1 &&
      oauth.signedIn(server.url);
  } finally {
    await runCauseEffect(oauth.close());
    await server.close();
  }
  await writeFile(resolve(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}

await main();
