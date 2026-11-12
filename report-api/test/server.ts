// Local automated-test harness only. Production Wrangler entry is ../worker.ts.
import { createServer } from "node:http";
import { dependencies, seed } from "./emulators";
import { reportHandler } from "../worker";
import { ApiError } from "../types";
import {createRelayHarness,fixtureRelaySecret,fixtureRelayUrl} from '../../report-relay/test/harness.mjs';
let relay=createRelayHarness();
const deps = await dependencies();
let rejectEmail = false;
const handler = reportHandler(
  {
    ...deps,
    archive:{relayUrl:fixtureRelayUrl,secret:fixtureRelaySecret,fetcher:(url,init)=>relay.fetcher(url,init),deletionEnabled:true,retentionDays:0,policyVersion:'isolated-emulator-policy'},
    identity: {
      ...deps.identity,
      reset: async (email, ip) => {
        if (rejectEmail) throw new ApiError("email_quota", 429);
        return deps.identity.reset(email, ip);
      },
    },
  },
  ["http://127.0.0.1:5188"],
);
createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url === "/__reset" && incoming.method === "POST") {
      await seed();
      rejectEmail = false;
      relay=createRelayHarness();
      outgoing.end("ready");
      return;
    }
    if (incoming.url === "/__email-fail" && incoming.method === "POST") {
      rejectEmail = true;
      outgoing.end("ready");
      return;
    }
    if (incoming.url === "/__email-ok" && incoming.method === "POST") {
      rejectEmail = false;
      outgoing.end("ready");
      return;
    }
    if (incoming.url === "/__health") {
      outgoing.end("ready");
      return;
    }
    if(incoming.url==='/__photo-relay'&&incoming.method==='POST'){const chunks=[];for await(const chunk of incoming)chunks.push(Buffer.from(chunk));outgoing.setHeader('Content-Type','application/json');outgoing.end(JSON.stringify(relay.post(JSON.parse(Buffer.concat(chunks).toString('utf8')))));return;}
    const chunks: Buffer[] = [];
    for await (const part of incoming) chunks.push(Buffer.from(part));
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(",") : value);
    headers.set("CF-Connecting-IP", "127.0.0.1");
    const response = await handler(
      new Request("http://127.0.0.1:8788" + incoming.url, {
        method: incoming.method,
        headers,
        ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
      }),
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500);
    outgoing.end("test harness error");
  }
}).listen(8788, "127.0.0.1");
