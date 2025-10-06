import type { ApiInterfaceEntry } from '../../types';

export const interfaceReference: ApiInterfaceEntry[] = [
  {
    name: 'RequestContext',
    description: 'HTTP request metadata injected into controller methods.',
    properties: [
      {
        name: 'request',
        type: 'Request',
        description: 'Native Request object for the incoming call.',
        required: true,
      },
      {
        name: 'params',
        type: 'Record<string, string>',
        description: 'Route parameters extracted from the URL.',
        required: true,
      },
      {
        name: 'query',
        type: 'URLSearchParams',
        description: 'Querystring parameters.',
        required: true,
      },
    ],
  },
  {
    name: 'BootstrapOptions',
    description: 'Configuration for platform bootstrap helpers.',
    properties: [
      {
        name: 'port',
        type: 'number',
        description: 'Listening port for HTTP applications.',
        required: false,
      },
      {
        name: 'logger',
        type: 'boolean | Logger',
        description: 'Enable or provide a logger instance.',
        required: false,
      },
    ],
  },
];
