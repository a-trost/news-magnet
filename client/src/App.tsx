import { Routes, Route, NavLink } from "react-router-dom";
import ArticlesPage from "./pages/ArticlesPage";
import SavedPage from "./pages/SavedPage";
import SourcesPage from "./pages/SourcesPage";
import CriteriaPage from "./pages/CriteriaPage";
import FetchLogPage from "./pages/FetchLogPage";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? "text-gray-900 font-medium bg-gray-100"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-14 gap-1">
            <span className="text-gray-900 font-semibold tracking-tight text-base mr-6">
              🧲 News Magnet
            </span>
            <NavItem to="/">Articles</NavItem>
            <NavItem to="/saved">Saved</NavItem>
            <NavItem to="/sources">Sources</NavItem>
            <NavItem to="/criteria">Criteria</NavItem>
            <NavItem to="/logs">Fetch Log</NavItem>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ArticlesPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/criteria" element={<CriteriaPage />} />
          <Route path="/logs" element={<FetchLogPage />} />
        </Routes>
      </main>
    </div>
  );
}
