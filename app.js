import { app } from 'mu';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { isAuthorized } from './config/filter';
import { router } from './config/router';

app.use(async function (req, _res, next) {
  try {
    const session = req.get('Mu-Session-Id');
    await ensureAuthorized(session, req);
    next();
  } catch (err) {
    next(err);
  }
});

app.use(
  createProxyMiddleware({
    router: router,
    on: {
      proxyReq: fixRequestBody,
    },
  }),
);


async function ensureAuthorized(session, req) {
  let isAuth = await isAuthorized(session, req);
  if (!isAuth) {
    const err = new Error(
      'This session is not authorized to execute this request',
    );
    err.status = 403;
    throw err;
  }
}
