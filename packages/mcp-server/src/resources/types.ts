export interface ResourceResponse {
  uri: string;
  mimeType: string;
  data: unknown;
}

export interface ResourceRequest {
  uri: string;
}

export interface ResourceProvider {
  name: string;
  patterns: RegExp[];
  resolve: (request: ResourceRequest) => Promise<ResourceResponse | undefined>;
}
