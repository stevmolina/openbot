// Run: bun scripts/file-transfer-order-e2e.ts
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import type { TeamWebRtcBridge } from "../src/main/team-webrtc-bridge";
import { TeamWebRtcFileTransfer } from "../src/main/team-webrtc-file-transfer";

type BridgeEvents = TeamWebRtcBridge extends EventEmitter<infer Events> ? Events : never;
class Bridge extends EventEmitter<BridgeEvents> {
  peer: Bridge | undefined;
  readonly send: TeamWebRtcBridge["send"] = (peerId, channel, data) =>
    Effect.promise(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.ok(this.peer);
      this.peer.emit("data", peerId, channel, data);
    });
  readonly disconnectPeer: TeamWebRtcBridge["disconnectPeer"] = () => Effect.void;
}
const root = await mkdtemp(join(tmpdir(), "openbot-file-order-"));
const left = new Bridge();
const right = new Bridge();
left.peer = right;
right.peer = left;
const sender = new TeamWebRtcFileTransfer(left, join(root, "sender"), 10000);
const receiver = new TeamWebRtcFileTransfer(right, join(root, "receiver"), 10000);
sender.setPeerAuthenticated("peer", true);
receiver.setPeerAuthenticated("peer", true);
let report: { status: "passed" | "failed"; bytes?: number; transferId?: string; error?: string } = { status: "failed" };
try {
  const bytes = new Uint8Array(66_573_530);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  const transferId = await Effect.runPromise(
    sender.send("peer", { name: "agents.zip", mimeType: "application/zip", bytes }),
  );
  const received = await Effect.runPromise(receiver.receive("peer", transferId, 10000));
  assert.deepEqual(new Uint8Array(await readFile(received.path)), bytes);
  report = { status: "passed", bytes: bytes.length, transferId };
} catch (error) {
  report.error = error instanceof Error ? `${error.message}: ${String(error.cause)}` : String(error);
  process.exitCode = 1;
} finally {
  await Effect.runPromise(sender.stop());
  await Effect.runPromise(receiver.stop());
  await rm(root, { recursive: true });
  await mkdir(".openbot-build", { recursive: true });
  await writeFile(".openbot-build/file-transfer-order-e2e.json", JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
