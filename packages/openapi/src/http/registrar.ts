import { DiscoveryService } from '@nl-framework/core';
import { registerHttpRouteRegistrar, type HttpRouteRegistrationApi } from '@nl-framework/http';
import { OPENAPI_OPTIONS } from '../constants';
import type { NormalizedOpenApiOptions } from '../options';
import { buildOpenApiDocument } from '../document/build-document';
import { renderViewerHtml } from './ui-html';

let registered = false;

const mountRoutes = async (api: HttpRouteRegistrationApi): Promise<void> => {
  let options: NormalizedOpenApiOptions;
  try {
    options = await api.resolve<NormalizedOpenApiOptions>(OPENAPI_OPTIONS);
  } catch {
    // Options provider absent — the module was not installed. Nothing to mount.
    return;
  }

  const discovery = await api.resolve(DiscoveryService);
  const controllers = discovery.getControllerClasses();

  // Built once at boot and cached as a serialized string.
  const document = buildOpenApiDocument(controllers, options.config);
  const documentJson = JSON.stringify(document);

  api.registerRoute('GET', options.path, () =>
    new Response(documentJson, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    }),
  );

  if (options.ui) {
    const html = renderViewerHtml({
      documentUrl: options.path,
      title: options.config.title,
    });
    api.registerRoute('GET', options.ui, () =>
      new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      }),
    );
  }

  api.logger.info(
    `[openapi] document mounted at ${options.path}${options.ui ? ` (viewer at ${options.ui})` : ''}`,
  );
};

/** Register the OpenAPI route registrar once (idempotent). */
export const ensureOpenApiIntegration = (): void => {
  if (registered) {
    return;
  }
  registered = true;
  registerHttpRouteRegistrar(mountRoutes);
};

/** Test-only: reset the idempotent registration flag. */
export const resetOpenApiIntegrationForTests = (): void => {
  registered = false;
};
