// Cloudflare Workers entry: adapts the Node-tested CJS handler to the runtime.
import exchange from './exchange.js';

export default {
  fetch(request, env) {
    return exchange.handleExchange(request, env, fetch);
  },
};
