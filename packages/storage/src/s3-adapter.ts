import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presignUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter, UploadOptions, UploadResult } from './types';

export interface S3AdapterOptions {
  bucket: string;
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
  urlPrefix?: string;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly urlPrefix?: string;

  constructor(options: S3AdapterOptions) {
    this.bucket = options.bucket;
    this.urlPrefix = options.urlPrefix;
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: options.credentials,
    });
  }

  async uploadObject(key: string, data: ArrayBuffer | Uint8Array | Buffer, options?: UploadOptions): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
      }),
    );

    return {
      key,
      url: this.urlPrefix ? `${this.urlPrefix}/${key}` : undefined,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return presignUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
