const { createApp } = require('../dist/bootstrap');

let cachedHandler;

// Vercel's Node.js runtime invokes this with a plain (req, res) pair — the same
// interface an Express app already implements — so the Express instance itself
// is the handler. (serverless-http instead bridges to AWS Lambda's event/context
// invocation style, which is a different shape and silently breaks this.)
async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};
