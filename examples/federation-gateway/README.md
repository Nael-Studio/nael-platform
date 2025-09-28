# Federation Gateway Example

This example composes the `products` subgraph from `examples/federated-graphql` into a single supergraph using Apollo Gateway. It also enables an HTTP greeting endpoint via `NaelFactory` so you can see the framework running GraphQL federation and HTTP side-by-side.

## Prerequisites

- Install dependencies from the repository root:

```bash
bun install
```

- Build the framework packages so the latest subgraph artifacts are emitted:

```bash
bun run build
```

## Run the subgraph

From a separate terminal, start the products subgraph (exposes `http://localhost:4011/graphql` by default):

```bash
cd examples/federated-graphql
bun run start
```

## Run the gateway

With the subgraph running, launch the gateway (this starts both the Apollo Gateway and the HTTP greeting server):

```bash
cd examples/federation-gateway
bun run start
```

The gateway listens on `http://localhost:4020/graphql` by default and forwards requests to the registered subgraphs. The greeting endpoint is exposed from the same process at `http://localhost:4021/greeting`.

## Environment options

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4020` | Port where the gateway HTTP server listens. |
| `HOST` | `0.0.0.0` | Network interface for the gateway server. |
| `HTTP_PORT` | `4021` | Port for the Bun-powered HTTP greeting endpoint. |
| `HTTP_HOST` | `0.0.0.0` | Network interface for the HTTP greeting endpoint. |
| `PRODUCTS_SUBGRAPH_URL` | `http://localhost:4011/graphql` | Location of the products subgraph. |
| `EXTRA_SUBGRAPHS` | _undefined_ | JSON array of additional `{ name, url }` objects to compose alongside the products subgraph. |

Example of adding an extra subgraph:

```bash
EXTRA_SUBGRAPHS='[{"name":"inventory","url":"http://localhost:4021/graphql"}]' bun run start
```

## Test the supergraph

Send a query through the gateway endpoint:

```bash
curl -X POST \
  http://localhost:4020/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ productsCatalog { id name price inStock } }"}'
```

You should receive the combined response resolved by the products subgraph.

## Try the HTTP greeting endpoint

```bash
curl http://localhost:4021/greeting
```

Add a name to personalize the message:

```bash
curl http://localhost:4021/greeting/Apollo
```
