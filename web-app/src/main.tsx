import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { AuthProvider } from "@/contexts/AuthProvider.tsx";
import { GOOGLE_CLIENT_ID } from "@/lib/config.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
