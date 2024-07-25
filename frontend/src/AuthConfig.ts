export const authConfig = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? "<no auth0 domain set>",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? "<no auth0 client id set>",
  redirectUri: window.location.origin,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "<no auth0 audience set>",
};
