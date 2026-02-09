type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function getRouteHandler(router: any, method: Method, path: string) {
  const layer = router.stack.find((l: any) => l.route && l.route.path === path && l.route.methods?.[method]);
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  // Último handler suele ser el handler real (después de middlewares)
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

export function getRouteHandlers(router: any, method: Method, path: string): Function[] {
  const layer = router.stack.find((l: any) => l.route && l.route.path === path && l.route.methods?.[method]);
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((s: any) => s.handle as Function);
}


