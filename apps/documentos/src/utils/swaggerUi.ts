export type SwaggerUiModule = {
  serve: any;
  setup: (...args: any[]) => any;
};

/**
 * swagger-ui-express is optional in some deployments. This wrapper keeps the
 * dependency optional while allowing deterministic unit testing.
 */
export function tryGetSwaggerUi(): SwaggerUiModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('swagger-ui-express');
    return mod?.default || mod;
  } catch {
    return null;
  }
}


