import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { BrowserRouter } from "react-router-dom";
import { getClientId } from "./utils/clientId";
import { resolveApiUrl } from "./utils/apiConfig";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient as createWsClient } from "graphql-ws";

const API_URL = resolveApiUrl();
const CLIENT_ID = getClientId();

function resolveWebSocketUrl(httpUrl: string): string {
  try {
    const parsed = new URL(httpUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.toString();
  } catch {
    return httpUrl.replace(/^http/i, (match) => (match.toLowerCase() === "https" ? "wss" : "ws"));
  }
}

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      "x-client-id": CLIENT_ID,
    },
  };
});

const httpLink = new HttpLink({
  uri: API_URL,
});

let link = authLink.concat(httpLink);

if (typeof window !== "undefined") {
  const wsUrl = resolveWebSocketUrl(API_URL);
  const wsLink = new GraphQLWsLink(
    createWsClient({
      url: wsUrl,
      lazy: true,
      connectionParams: (): Record<string, unknown> => {
        const token = localStorage.getItem("token");
        return {
          authorization: token ? `Bearer ${token}` : "",
          "x-client-id": CLIENT_ID,
        };
      },
    })
  );

  link = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    link
  );
}

const client = new ApolloClient({
  link,
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
