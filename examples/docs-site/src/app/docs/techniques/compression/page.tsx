import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const gzipMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

export const compressionMiddleware: MiddlewareHandler = async (ctx, next) => {
  const res = await next();

  const acceptEncoding = ctx.request.headers.get('accept-encoding') ?? '';
  if (!acceptEncoding.includes('gzip')) {
    return res;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return res;
  }

  const text = await res.text();
  const compressed = Bun.gzipSync(Buffer.from(text));

  const headers = new Headers(res.headers);
  headers.set('content-encoding', 'gzip');
  headers.set('content-length', compressed.length.toString());

  return new Response(compressed, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};`;

const applyMiddleware = `import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';
import { compressionMiddleware } from './compression.middleware';

const app = await NaelFactory.create(AppModule);
const http = app.getHttpApplication();

if (http) {
  http.use(compressionMiddleware);
}

await app.listen({ http: 3000 });`;

const streamExample = `// For streams, pre-compress assets or use Bun.gzipSync on Buffers before sending.
// Avoid buffering huge streams in memory; prefer CDN/static hosting for large files.`;

export const metadata: Metadata = {
  title: "Compression · Techniques",
  description: "Add response compression with HTTP middleware in Nael applications using Bun's built-in gzip utilities.",
};

export default function CompressionTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-50">
          Techniques
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Compression</h1>
        <p className="text-lg text-muted-foreground">
          Use HTTP middleware to gzip JSON responses when clients advertise support. Nael does not bundle a compressor by
          default; Bun&apos;s <code>gzipSync</code> makes it straightforward to add.
        </p>
      </div>

      <section className="space-y-4" id="middleware">
        <h2 className="text-2xl font-semibold">Add gzip middleware</h2>
        <p className="text-muted-foreground">
          Inspect <code>Accept-Encoding</code> and compress JSON bodies on the fly. Skip other content types to avoid
          double-compressing binaries.
        </p>
        <CodeBlock code={gzipMiddleware} title="compression.middleware.ts" />
        <CodeBlock code={applyMiddleware} title="Register middleware" />
      </section>

      <section className="space-y-4" id="streams">
        <h2 className="text-2xl font-semibold">Streaming and assets</h2>
        <p className="text-muted-foreground">
          For large files or streams, pre-compress assets or serve through a CDN that handles compression. Avoid buffering
          giant payloads in memory just to gzip them.
        </p>
        <CodeBlock code={streamExample} title="Streaming guidance" />
      </section>

      <section className="space-y-3" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Check <code>Accept-Encoding</code> before compressing; fall back to the original response otherwise.</li>
          <li>Compress textual payloads (JSON/HTML); skip images, PDFs, or already-compressed formats.</li>
          <li>Preserve or recalculate <code>Content-Type</code>/<code>Content-Length</code> headers after compression.</li>
          <li>Place compression after authentication/validation in the middleware pipeline.</li>
          <li>Pair with caching carefully—cache compressed and uncompressed variants separately if you add caching middleware.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          For more middleware patterns, see <Link className="text-primary underline" href="/docs/middleware">Middleware</Link>.
        </p>
      </section>
    </article>
  );
}
