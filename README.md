# ldes-authorization-wrapper-service

Wrapper for a mu-semtech ldes service that adds some extra
authorization checks.

This service forwards a request to a mu-semtech ldes service in the sense that
a proxy server would. However, the request is intercepted and some authorization
rules can be configured to allow or disallow the request from being proxied.
These rules can be written in JavaScript with the possibility to send SPARQL
queries for checking permissions. This service relies on the presence of the
`mu-session-id` header that is introduced in the request by the
[mu-identifier](https://github.com/mu-semtech/mu-identifier) and
checks for existing sessions after a log in via the [Vendor Login
Service](https://github.com/lblod/vendor-login-service).

Alternatively, one can also authenticate using Basic authentication.
In that case the alternative isBasicAuthorized function in the `filter.js`
config is used.

> [!CAUTION]
> This is a very shallow check on authorization and will only return whether a user can access the ldes feed, yes or no. This is a stark contrast with what mu-authorization offers on the database level. In a perfect world, the LDES service would also offer such deep nesting so multiple users can consume the same LDES feed but only see the data they have access to depending on their roles. This isn't something easy to do, so as an in-between solution, this service was created. Do NOT see this as a permanent thing.

## Adding to a stack

Add the SPARQL Authorization Service to a mu-semtech stack by placing the
following snippet in the `docker-compose.yml` file as a service:

```yaml
authorization-wrapper:
  image: lblod/ldes-authorization-wrapper-service:0.0.1
  volumes:
    - ../path-to-config:/config
```

where `../path-to-config` contains the configuration files (see below).

Add the following lines to the dispatcher's configuration:

```elixir
match "/your/authenticated/service/path/*" do
  Proxy.forward conn, path, "http://authorization-wrapper/your/authenticated/service/path/"
end
```

Note that you should use `match` in the above configuration, because this
service can respond to both GET and POST on the same URL.

## Writing rules

Rules shoud be written in a file called `filter.js` that should be placed in
the configuration folder that is mounted as a subvolume (see the Docker
configuration above). Define a JavaScript function called `isAuthorized` that
accepts a single parameter, namely the client's session-id. By importing from
`mu` and `mu-auth-sudo`, you get access to the `uuid()`, `sparqlEscape*()`,
`query()`, `update()`, `querySudo()` and `updateSudo()` functions that you can
use to verify authorization of the current client. The function should return a
truthy value to indicate the client is authorized to access a service,
or a falsy value to indicate it is not allowed to.

To allow basic authentication, build a query that uses the user, key and
possibly the request being passed in.

Note that you also receive the request in the filter function so you can have
different restrictions based on the path of the service being accessed.

A typical `filter.js` file
might, e.g., look like the following:

```javascript
import * as mu from 'mu';
import * as mas from '@lblod/mu-auth-sudo';

export async function isBasicAuthorized(user, key, _req) {
  // never allow basic authentication, force mu-auth login
  return false;
}

export async function isAuthorized(sessionUri, _req) {
  const checkSessionQuery = `
    # A SPARQL query
  `;
  const response = await mas.querySudo(checkSessionQuery);
  return response.results?.bindings?.length === 1;
}
```

## Routing

The routes for this service need to be configured in a router.js file in the
config directory. The routes follow the configuration of [the chimurai http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware/tree/master).

An example could be:

```javascript
export const router = {
  '/ldes-users': 'http://ldes-backend-users:80',
  '/ldes-cars': 'http://ldes-backend-cars:80',
}
```

## Environment variables
As this service is built on top of the [mu-javascript-template](https://github.com/mu-semtech/mu-javascript-template/tree/master), all of those environment variables are inherited (e.g. to reduce the number of queries logged.)

## Model

This service check for the existence of a session with a model that is
specified by the [Vendor Login
Service](https://github.com/lblod/vendor-login-service).
