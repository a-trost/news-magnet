import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { authClient } from "./lib/auth-client";
import ArticlesPage from "./pages/ArticlesPage";
import SavedPage from "./pages/SavedPage";
import SourcesPage from "./pages/SourcesPage";
import CriteriaPage from "./pages/CriteriaPage";
import FetchLogPage from "./pages/FetchLogPage";
import LoginPage from "./pages/LoginPage";

const ARTICLES_PATHS = ["/", "/sources", "/criteria", "/logs"];

function NavItem({ to, children, isActive: isActiveOverride }: { to: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const active = isActiveOverride ?? isActive;
        return `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
          active
            ? "text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-800"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`;
      }}
    >
      {children}
    </NavLink>
  );
}

function SubNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-2 py-2 text-sm transition-colors border-b-2 ${
          isActive
            ? "text-indigo-600 dark:text-indigo-400 border-indigo-500 font-medium"
            : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0f]">
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0f]">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4">
          <div className="flex items-center h-14 gap-1">
            <span className="text-gray-900 dark:text-gray-100 font-semibold tracking-tight text-base mr-6">
              Newsroom
            </span>
            <NavItem to="/" isActive={ARTICLES_PATHS.includes(location.pathname)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v11.75A2.75 2.75 0 0 0 16.75 18h-12A2.75 2.75 0 0 1 2 15.25V3.5Zm3.75 7a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM5 5.75A.75.75 0 0 1 5.75 5h4.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 8.25v-2.5Z" clipRule="evenodd" />
                <path d="M16.5 6.5h-1v8.75a1.25 1.25 0 1 0 2.5 0V8a1.5 1.5 0 0 0-1.5-1.5Z" />
              </svg>
              Articles
            </NavItem>
            <NavItem to="/saved" isActive={location.pathname.startsWith("/saved")}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
              Writing Room
            </NavItem>
            <div className="ml-auto">
              <button
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/login";
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      {ARTICLES_PATHS.includes(location.pathname) && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="px-4">
            <div className="flex items-center gap-4">
              <SubNavItem to="/">Feed</SubNavItem>
              <SubNavItem to="/sources">Sources</SubNavItem>
              <SubNavItem to="/criteria">Criteria</SubNavItem>
              <SubNavItem to="/logs">Fetch Log</SubNavItem>
            </div>
          </div>
        </div>
      )}
      <main className={`mx-auto px-4 py-6 ${location.pathname.startsWith("/saved") ? "max-w-full" : "max-w-6xl"}`}>
        <Routes>
          <Route path="/" element={<ArticlesPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/saved/:episodeId" element={<SavedPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/criteria" element={<CriteriaPage />} />
          <Route path="/logs" element={<FetchLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
