const serverless = require('serverless-http');
const { createApp } = require('../dist/bootstrap');

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    const expressInstance = app.getHttpAdapter().getInstance();
    cachedHandler = serverless(expressInstance);
  }
  return cachedHandler;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};
