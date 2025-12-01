import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicUpload = `import { Controller, Post, Req } from '@nl-framework/http';

@Controller('/upload')
export class UploadController {
  @Post('/')
  async upload(@Req() req: Request) {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'file is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      });
    }

    const buffer = await file.arrayBuffer();
    // persist buffer to disk/object storage here

    return { name: file.name, size: file.size, type: file.type };
  }
}`;

const streamUpload = `@Post('/stream')
async stream(@Req() req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return new Response('file required', { status: 400 });
  }

  // Stream to storage without buffering entire file
  const reader = file.stream().getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    await writeChunk(chunk.value); // your storage writer
  }

  return { ok: true };
}`;

const multipleFiles = `@Post('/multi')
async multi(@Req() req: Request) {
  const form = await req.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);

  if (!files.length) {
    return new Response(JSON.stringify({ error: 'No files uploaded' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
  return { count: files.length, files: meta };
}`;

const graphqlUpload = `import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { Resolver, Mutation, Arg } from '@nl-framework/graphql';
import { UseInterceptors } from '@nl-framework/http';

@Resolver()
export class MediaResolver {
  @Mutation(() => Boolean)
  async uploadImage(
    @Arg('file', () => GraphQLUpload) file: Promise<FileUpload>,
  ): Promise<boolean> {
    const { createReadStream, filename, mimetype } = await file;
    const stream = createReadStream();
    await saveStreamToStorage(stream, filename, mimetype); // your storage client
    return true;
  }
}

// When bootstrapping Apollo/Nael GraphQL, ensure graphql-upload middleware is applied to the HTTP server.
// In Bun, wrap the request handler with processRequest from graphql-upload when content-type is multipart/form-data.`;

const storageSample = `import { Inject, Injectable } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import {
  AzureBlobStorageAdapter,
  S3StorageAdapter,
  createStorageModule,
  STORAGE_ADAPTER,
  type StorageAdapter,
} from '@nl-framework/storage';

// Build a StorageModule using ConfigModule to pick the adapter
export const StorageModule = createStorageModule({
  imports: [ConfigModule.forRoot()],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    if (config.get('storage.provider') === 'azure') {
      return new AzureBlobStorageAdapter({
        accountName: config.get('storage.azure.accountName') as string,
        accountKey: config.get('storage.azure.accountKey') as string,
        container: config.get('storage.azure.container', 'uploads') as string,
      });
    }

    return new S3StorageAdapter({
      bucket: config.get('storage.s3.bucket') as string,
      region: config.get('storage.s3.region') as string,
      credentials: {
        accessKeyId: config.get('storage.s3.accessKeyId') as string,
        secretAccessKey: config.get('storage.s3.secretAccessKey') as string,
      },
      urlPrefix: config.get('storage.s3.urlPrefix') as string | undefined,
    });
  },
});

@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter) {}

  async save(key: string, file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return this.storage.uploadObject(key, buffer, { contentType: file.type });
  }
}

// config/storage.yaml
// storage:
//   provider: s3
//   s3:
//     bucket: my-bucket
//     region: us-east-1
//     accessKeyId: ...
//     secretAccessKey: ...
//     urlPrefix: https://my-bucket.s3.us-east-1.amazonaws.com`;

export const metadata: Metadata = {
  title: "File upload · Techniques",
  description: "Handle multipart/form-data uploads in Nael HTTP handlers using native FormData APIs.",
};

export default function FileUploadTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-50">
          Techniques
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">File uploads</h1>
        <p className="text-lg text-muted-foreground">
          Nael doesn&apos;t bundle Multer or busboy. Instead, use the platform-native <code>Request.formData()</code> to
          access uploaded <code>File</code> objects, then stream or buffer them to storage.
        </p>
      </div>

      <section className="space-y-4" id="single">
        <h2 className="text-2xl font-semibold">Single file</h2>
        <p className="text-muted-foreground">
          Read <code>FormData</code> from the request, validate size and presence, then persist. Keep JSON responses for
          clients expecting structured metadata.
        </p>
        <CodeBlock code={basicUpload} title="upload.controller.ts" />
      </section>

      <section className="space-y-4" id="stream">
        <h2 className="text-2xl font-semibold">Stream to storage</h2>
        <p className="text-muted-foreground">
          For large files, stream chunks from <code>file.stream()</code> into your storage client to avoid buffering the
          entire payload in memory.
        </p>
        <CodeBlock code={streamUpload} title="Streaming upload" />
      </section>

      <section className="space-y-4" id="multiple">
        <h2 className="text-2xl font-semibold">Multiple files</h2>
        <p className="text-muted-foreground">
          Use <code>formData.getAll()</code> for multi-file inputs and iterate over <code>File</code> instances.
        </p>
        <CodeBlock code={multipleFiles} title="Multiple uploads" />
      </section>

      <section className="space-y-3" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Enforce size limits; reject or stream to avoid memory blowups.</li>
          <li>Whitelist MIME types and scan uploads before storing.</li>
          <li>Generate unique object keys (UUIDs) instead of trusting client filenames.</li>
          <li>Store files in object storage or CDN; return signed URLs for retrieval.</li>
          <li>Keep parsing logic at the handler layer—<code>@Body()</code> converts form fields but you need <code>@Req()</code> to access <code>File</code> objects.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Pair with <Link className="text-primary underline" href="/docs/techniques/compression">compression</Link> for downloads
          and <Link className="text-primary underline" href="/docs/techniques/caching">caching</Link> where appropriate.
        </p>
      </section>

      <section className="space-y-4" id="graphql">
        <h2 className="text-2xl font-semibold">GraphQL uploads</h2>
        <p className="text-muted-foreground">
          Use <code>graphql-upload</code> with the Nael GraphQL stack. Register the middleware on the HTTP server for multipart
          requests and use the <code>GraphQLUpload</code> scalar in your schema. Resolver receives a <code>FileUpload</code>
          with <code>createReadStream()</code> for streaming to storage.
        </p>
        <CodeBlock code={graphqlUpload} title="GraphQL upload resolver" />
      </section>

      <section className="space-y-4" id="storage">
        <h2 className="text-2xl font-semibold">Store files in S3 or Azure Blob</h2>
        <p className="text-muted-foreground">
          Use the <code>@nl-framework/storage</code> adapters and wire them through <code>ConfigModule</code>. Provide the adapter once via
          <code>createStorageModule</code>, inject the exported token, and keep credentials in config/env.
        </p>
        <CodeBlock code={storageSample} title="@nl-framework/storage adapters" />
      </section>
    </article>
  );
}
