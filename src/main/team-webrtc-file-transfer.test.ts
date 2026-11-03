// @vitest-environment node

import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeTeamProtocolV2FileChunk, encodeTeamProtocolV2Frame } from "@openbot/contracts/team-protocol/v2";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamWebRtcBridge } from "./team-webrtc-bridge";
import { TeamWebRtcFileTransfer } from "./team-webrtc-file-transfer";

type BridgeEvents = TeamWebRtcBridge extends EventEmitter<infer Events> ? Events : never;

// The permit is released before its waiters run. A frame that arrives in that gap used to be
// written before the frame that was already waiting, which rejected the copy with an invalid offset.
let jump: (() => void) | undefined;

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  let armed = true;
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      const write = handle.write.bind(handle);
      async function writeThenJump(
        buffer: Uint8Array,
        offset?: number | null,
        length?: number | null,
        position?: number | null,
      ) {
        const result = await write(buffer, offset, length, position);
        if (armed) {
          armed = false;
          queueMicrotask(() => queueMicrotask(() => jump?.()));
        }
        return result;
      }
      // biome-ignore lint/nursery/noUnsafeTypeAssertion: FileHandle.write has overloads that one wrapper cannot satisfy.
      handle.write = writeThenJump as typeof handle.write;
      return handle;
    },
  };
});

class Bridge extends EventEmitter<BridgeEvents> {
  readonly send: TeamWebRtcBridge["send"] = () => Effect.void;
  readonly disconnectPeer: TeamWebRtcBridge["disconnectPeer"] = () => Effect.void;
}

const chunk = (transferId: string, offset: number, bytes: Uint8Array): ArrayBuffer => {
  const encoded = encodeTeamProtocolV2FileChunk({ transferId, offset, bytes });
  const copy = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(copy).set(encoded);
  return copy;
};

describe("WebRTC file frame order", () => {
  const roots: string[] = [];

  afterEach(async () => {
    jump = undefined;
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("writes an early chunk before a later chunk that arrives while the permit is free", async () => {
    const root = await mkdtemp(join(tmpdir(), "openbot-file-order-"));
    roots.push(root);
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const transferId = "transfer-1";
    const bridge = new Bridge();
    const receiver = new TeamWebRtcFileTransfer(bridge, root, 10_000);
    receiver.setPeerAuthenticated("peer", true);
    const received = Effect.runPromise(receiver.receive("peer", transferId, 5_000));
    const emit = (data: string | ArrayBuffer) => {
      bridge.emit("data", "peer", "files", data);
    };
    jump = () => {
      emit(chunk(transferId, 8, bytes.subarray(8)));
      emit(
        encodeTeamProtocolV2Frame({
          version: 2,
          type: "file-complete",
          transferId,
        }),
      );
    };

    try {
      emit(
        encodeTeamProtocolV2Frame({
          version: 2,
          type: "file-open",
          transferId,
          name: "agents.zip",
          size: bytes.byteLength,
          mimeType: "application/zip",
          sha256: createHash("sha256").update(bytes).digest("hex"),
        }),
      );
      emit(chunk(transferId, 0, bytes.subarray(0, 4)));
      emit(chunk(transferId, 4, bytes.subarray(4, 8)));
      const file = await received;
      expect(new Uint8Array(await readFile(file.path))).toEqual(bytes);
    } finally {
      await Effect.runPromise(receiver.stop());
    }
  });
});
