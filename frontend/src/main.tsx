import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { BrowserRouter } from "react-router-dom";

const fallbackApiUrl = `${window.location.origin.replace(/\/?$/, "")}/graphql`;

const resolveApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (!envUrl) {
    return fallbackApiUrl;
  }

  try {
    const candidate = new URL(envUrl, window.location.origin);
    const isInternalService = candidate.hostname.endsWith(
      ".svc.cluster.local"
    );
    const protocolMismatch =
      window.location.protocol === "http:" && candidate.protocol === "https:";

    if (isInternalService || protocolMismatch) {
      return fallbackApiUrl;
    }

    return candidate.toString().replace(/\/?$/, "");
  } catch (error) {
    return fallbackApiUrl;
  }
};

const API_URL = resolveApiUrl();

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const httpLink = new HttpLink({
  uri: API_URL,
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);
