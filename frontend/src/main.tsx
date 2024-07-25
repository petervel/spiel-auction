import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { authConfig } from "./AuthConfig.ts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: authConfig.redirectUri,
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
