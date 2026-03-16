// UI reworked with Claude AI — Carbon & Blue theme, dark bg, mobile layout, landing page, privacy route
import { useAuth } from "react-oidc-context"
import { useState, useEffect } from "react"
import { Route, Routes, useNavigate, useLocation } from "react-router-dom"
import About from "./components/About.tsx"
import Profile from "./components/Profile.tsx"
import Sidebar from "./components/Sidebar.tsx"
import PrivacyPolicy from "./components/PrivacyPolicy.tsx"
import crosscheckLogo from "./assets/crosscheck_logo.png"
import Checker from "./components/Checker.tsx"
import Recents from "./components/Recents.tsx"
import { ShieldCheck, Clock4, Info, Globe } from "lucide-react"

function App() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = "47v1mbhis0gtrl7df2rm8n06nm";
  const logoutUri = "http://localhost:5173/";
  const cognitoDomain = "https://us-east-2r9vc108ea.auth.us-east-2.amazoncognito.com";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const SIDEBAR_OPEN_WIDTH = 256;
  const SIDEBAR_COLLAPSED_WIDTH = 72;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // codex generated these two lines because accessing the username is ridiculously complicated for some reason
  const claims = auth.user?.profile as Record<string, string | undefined>;
  const username = claims?.["cognito:username"] || "User";

  // log out handler
  const logout = async () => {
    await auth.removeUser();
    auth.clearStaleState?.();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  // privacy policy is accessible whether logged in or not
  if (location.pathname === "/privacy") return <PrivacyPolicy />;

  // loading screen
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-neutral-800 border-t-blue-500 animate-spin"></div>
          <span className="text-neutral-500 text-sm">Loading CrossCheck...</span>
        </div>
      </div>
    );
  }

  // error screen
  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full">
          <div className="border-l-4 border-red-500/60 bg-red-500/10 rounded-lg p-4">
            <p className="text-red-300 font-semibold mb-1">Authentication Error</p>
            <p className="text-neutral-400 text-sm">{auth.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // if the user is authenticated, render the app's main content
  if (auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-neutral-950 text-neutral-100 overflow-x-hidden">
        {/* Desktop sidebar */}
        <Sidebar
          isCollapsed={!sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          username={username}
          onLogout={logout}
        />

        {/* Mobile top header */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 h-14">
          <div className="flex items-center gap-2">
            <img src={crosscheckLogo} alt="CrossCheck logo" className="w-6 h-6" />
            <span className="text-base font-bold text-neutral-100 tracking-tight">CrossCheck</span>
          </div>
        </header>

        {/* Main content */}
        <main
          className="min-w-0 w-full overflow-x-hidden transition-all duration-300 p-4 md:p-6 pt-18 md:pt-6 pb-20 md:pb-6"
          style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_COLLAPSED_WIDTH) }}
        >
          <Routes>
            <Route path="/" element={<Checker />} />
            <Route path="/checker" element={<Checker />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="/recents" element={<Recents />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around h-16">
          <button
            onClick={() => navigate("/checker")}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-blue-400 transition py-2 px-3"
          >
            <ShieldCheck size={20} />
            <span className="text-xs">Checker</span>
          </button>
          <button
            onClick={() => navigate("/recents")}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-blue-400 transition py-2 px-3"
          >
            <Clock4 size={20} />
            <span className="text-xs">Recents</span>
          </button>
          <button
            onClick={() => navigate("/about")}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-blue-400 transition py-2 px-3"
          >
            <Info size={20} />
            <span className="text-xs">About</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-blue-400 transition py-2 px-3"
          >
            <div className="w-5 h-5 rounded-full bg-linear-to-b from-blue-600 to-blue-900 flex items-center justify-center text-white text-xs font-bold">
              {username[0].toUpperCase()}
            </div>
            <span className="text-xs">Profile</span>
          </button>
        </nav>
      </div>
    );
  }

  // landing page for unauthenticated users — split layout on desktop, stacked on mobile
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row items-center justify-center gap-12 p-8">

      {/* Left — hero / features */}
      <div className="flex flex-col gap-6 max-w-md w-full">
        <div className="flex items-center gap-3">
          <img src={crosscheckLogo} alt="CrossCheck logo" className="w-14 h-auto" />
          <h1 className="text-4xl font-bold text-neutral-100 tracking-tight">CrossCheck</h1>
        </div>

        <p className="text-neutral-400 text-lg leading-relaxed">
          Instant credibility checks for news articles, powered by machine learning.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">ML-backed credibility scoring</p>
              <p className="text-xs text-neutral-500">GRU neural network trained on real and fake news datasets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Clock4 size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">Check history saved to your account</p>
              <p className="text-xs text-neutral-500">Review past checks any time from the Recents page</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Globe size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">Browser extension for one-click checks</p>
              <p className="text-xs text-neutral-500">Check any article directly from your browser toolbar</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-neutral-600">Built for IMCS 3020U · Ontario Tech University</p>
      </div>

      {/* Right — login card */}
      <div className="w-full max-w-sm">
        <div className="p-px rounded-2xl bg-linear-to-b from-blue-500/20 to-transparent">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/60 p-8 space-y-5">
            <div className="h-px bg-linear-to-r from-blue-500 to-transparent"></div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-100">Get started</h2>
              <p className="text-neutral-400 text-sm mt-1">Log in or create an account.</p>
            </div>
            <button
              className="w-full py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold transition-all duration-150 cursor-pointer"
              onClick={() => auth.signinRedirect()}
            >
              Sign in / Sign up
            </button>
            <p className="text-center text-xs text-neutral-600">
              By signing up you agree to the{" "}
              <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
