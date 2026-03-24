import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { BrowserRouter } from "react-router-dom"
import "./App.css"
import { AuthProvider } from "react-oidc-context"

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_r9vC108ea",
  client_id: "47v1mbhis0gtrl7df2rm8n06nm",
  redirect_uri: import.meta.env.VITE_REDIRECT_URI ?? window.location.origin + "/",
  response_type: "code",
  scope: "email openid profile aws.cognito.signin.user.admin",
};

const root = createRoot(document.getElementById("root")!);

root.render(
    <AuthProvider {...cognitoAuthConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>  
)
