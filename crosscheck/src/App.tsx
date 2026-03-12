import { useAuth } from "react-oidc-context"
import { useState } from "react"
import { Route, Routes } from "react-router-dom"
import About from "./components/About.tsx"
import Profile from "./components/Profile.tsx"
import Sidebar from "./components/Sidebar.tsx"
import crosscheckLogo from "./assets/crosscheck_logo.png"
import Checker from "./components/Checker.tsx"
import Recents from "./components/Recents.tsx"

function App() {
  const auth = useAuth();
  const clientId = "47v1mbhis0gtrl7df2rm8n06nm";
  const logoutUri = "http://localhost:5173/";
  const cognitoDomain = "https://us-east-2r9vc108ea.auth.us-east-2.amazoncognito.com";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const SIDEBAR_OPEN_WIDTH = 100;
  const SIDEBAR_COLLAPSED_WIDTH = 64;

  // codex generated these two lines because accessing the username is ridiculously complicated for some reason
  const claims = auth.user?.profile as Record<string, string | undefined>;
  const username = claims?.["cognito:username"] || "User";

  // log out handler
  const logout = async () => {
    await auth.removeUser();
    auth.clearStaleState?.();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  // loading and error screens
  if (auth.isLoading) {return <div className="flex min-h-screen items-center justify-center bg-linear-to-l from-ccgreen-300 to-ccgreen-400 text-ccgreen-900">Loading...</div>;}
  if (auth.error) {return <div className="flex min-h-screen items-center justify-center bg-linear-to-l from-ccgreen-300 to-ccgreen-400 text-ccgreen-900">Encountering error... {auth.error.message}</div>;}

  // if the user is authenticated, render the apps main content
  if (auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen  bg-linear-to-l from-ccgreen-300 to-ccgreen-400 text-ccgreen-50">
        {/*Sidebar*/}
        <Sidebar 
          isCollapsed={!sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          username={username}
          onLogout={logout}
        />

        {/* Main content */}
        <main
          className="transition-all duration-300 p-6 mt-4"
          style={{marginLeft: sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_COLLAPSED_WIDTH}}>
          <Routes>
            <Route path = "/" element={<Checker />}/>
            <Route path = "/checker" element={<Checker />}/>
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="/recents" element={<Recents />} />
          </Routes>
        </main>
      </div>
    );
  }

  // render this if the user has not been authenticated
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-l from-ccgreen-300 to-ccgreen-400 text-white">
      <div className="relative p-8 w-full max-w-md text-left space-y-6 rounded-md bg-ccgreen-900">
        <h1 className="text-2xl font-semibold">Welcome to CrossCheck</h1>
        <p>Log in or sign up to continue.</p>
        <img
          src={crosscheckLogo}
          alt="CrossCheck logo"
          className="absolute top-8 right-8 w-20 h-auto"
        />
        <button
          className="w-full py-2 px-4 rounded bg-ccblue-600 hover:bg-ccblue-500"
          onClick={() => auth.signinRedirect()}
        >
          Sign in / Sign up
        </button>
      </div>

    </div>
  );
}

export default App;
