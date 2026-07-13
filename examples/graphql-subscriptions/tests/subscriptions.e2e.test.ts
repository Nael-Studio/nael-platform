import { describe, it, expect, afterEach } from 'bun:test';
import { createClient } from 'graphql-ws';
import type { GraphqlApplication } from '@nl-framework/graphql';
import { bootstrap } from '../src/main';

describe('graphql-subscriptions example (e2e)', () => {
  let app: GraphqlApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('delivers a sent message to a subscribed ws client and via HTTP mutation', async () => {
    app = await bootstrap(0);
    const address = (app as unknown as { wsServer?: { port: number } }).wsServer;
    const port = address!.port;

    const client = createClient({ url: `ws://localhost:${port}/graphql`, lazy: false, retryAttempts: 0 });

    const received: Array<{ text: string; author: string }> = [];
    const gotOne = new Promise<void>((resolve, reject) => {
      client.subscribe(
        {
          query: `subscription($room: String!) { messageSent(room: $room) { id room author text } }`,
          variables: { room: 'general' },
        },
        {
          next: (data: any) => {
            received.push(data.data.messageSent);
            resolve();
          },
          error: (err) => reject(err instanceof Error ? err : new Error(String(err))),
          complete: () => {},
        },
      );
    });

    // Let the subscription register before publishing.
    await new Promise((r) => setTimeout(r, 200));

    // Post a message over the HTTP endpoint (same port).
    const res = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `mutation { sendMessage(room: "general", author: "ada", text: "hi") { id text } }`,
      }),
    });
    const json = (await res.json()) as { data?: { sendMessage?: { text: string } } };
    expect(json.data?.sendMessage?.text).toBe('hi');

    await gotOne;
    expect(received[0]).toMatchObject({ author: 'ada', text: 'hi' });
    await client.dispose();
  });
});
