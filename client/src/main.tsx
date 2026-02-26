import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import { CollaborationProvider } from "./components/CollaborationContext";
import { FetchAllProvider } from "./components/FetchAllContext";
import "./lib/liveblocks"; // type augmentation
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CollaborationProvider>
          <FetchAllProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </FetchAllProvider>
        </CollaborationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
