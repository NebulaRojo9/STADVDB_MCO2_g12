export function createTrace() {
  const start = Date.now();
  const logs = [];

  return {
    log: (msg) => logs.push({
      msg,
      t: Date.now() - start  // elapsed time for pretty demo
    }),

    get: () => logs
  };
}
