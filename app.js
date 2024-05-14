import { app } from 'mu';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { isAuthorized, isBasicAuthorized } from './config/filter';
import { router } from './config/router';



app.use(async function (req, _res, next) {
  try {
    const authorization = req.get('authorization');
    if(authorization) {
      const userAndKey = authorization?.split('Basic ')[1];
      await ensureBasicAuthorized(userAndKey, req);
      next();
    }else{
      const session = req.get('Mu-Session-Id');
      await ensureAuthorized(session, req);
      next();
    }
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

async function ensureBasicAuthorized(key, req){
    const [username, password] = Buffer.from(key, 'base64').toString().split(':');
    return isBasicAuthorized(username, password, req);
}