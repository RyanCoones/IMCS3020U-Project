// UI reworked with Claude AI — neutral colors, active route highlighting, hidden on mobile (bottom nav takes over)
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PanelRightClose, PanelRightOpen, ShieldCheck, Info, Clock4 } from "lucide-react"


interface SidebarProps {
    isCollapsed: boolean;
    username?: string;
    toggleSidebar?: () => void;
    onLogout?: () => void;
    isGuest?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({isCollapsed, username, toggleSidebar, onLogout, isGuest}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navBtnClass = (path: string) => {
        const isActive = location.pathname === path || (path === "/checker" && location.pathname === "/");
        return `flex items-center rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium
            ${isActive
                ? "bg-neutral-800 text-blue-400 border border-neutral-700"
                : "bg-transparent text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 border border-transparent"}
            ${isCollapsed ? "w-12 h-12 justify-center px-0" : "w-full h-11 px-3 py-2 justify-start"}`;
    };

    return(
        <div className={`hidden md:flex h-full fixed left-0 top-0 bg-neutral-900 border-r border-neutral-800 text-white flex-col justify-between transition-all duration-200 ${isCollapsed ? "w-18" : "w-64"}`}>
            <div className="flex flex-col space-y-1 p-3">
                <div className="flex items-center justify-between overflow-hidden mb-3">
                    {/* Logo */}
                    {!isCollapsed && (
                        <div className="px-2 text-lg font-bold tracking-tight text-neutral-100 transition-opacity duration-300">
                            CrossCheck
                        </div>
                    )}
                    {/* Toggle button */}
                    {toggleSidebar && (
                        <button
                            onClick={toggleSidebar}
                            className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 rounded-lg transition-all duration-200 shrink-0 w-10 h-10"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                        </button>
                    )}
                </div>

                <button
                    title="Checker"
                    onClick={() => navigate("/checker")}
                    className={navBtnClass("/checker")}
                >
                    <ShieldCheck size={18} />
                    {!isCollapsed && <span className="ml-3">Checker</span>}
                </button>
                {!isGuest && (
                    <button
                        title="Recently Checked"
                        onClick={() => navigate("/recents")}
                        className={navBtnClass("/recents")}
                    >
                        <Clock4 size={18} />
                        {!isCollapsed && <span className="ml-3">Recently Checked</span>}
                    </button>
                )}
                <button
                    title="About"
                    onClick={() => navigate("/about")}
                    className={navBtnClass("/about")}
                >
                    <Info size={18} />
                    {!isCollapsed && <span className="ml-3">About</span>}
                </button>
            </div>

            <div className="py-3 px-3">
                <div className="w-full h-px bg-neutral-800 mb-3 opacity-60"></div>
                {!isGuest ? (
                    <button
                        onClick={() => navigate("/profile")}
                        className={`flex items-center rounded-lg cursor-pointer transition-all duration-200 border
                            ${location.pathname === "/profile"
                                ? "bg-neutral-800 border-neutral-700"
                                : "bg-transparent hover:bg-neutral-800 border-transparent"}
                            ${isCollapsed ? "w-full h-12 justify-center px-0" : "w-full h-12 px-3 py-2 justify-start"}`}
                    >
                        <div className="flex justify-center items-center rounded-full overflow-hidden bg-linear-to-b from-blue-600 to-blue-900 text-white font-bold select-none w-8 h-8 text-sm ring-2 ring-blue-500/30 shrink-0">
                            {username ? username[0].toUpperCase() : "U"}
                        </div>
                        {!isCollapsed && <span className="pl-2 text-sm text-neutral-300 truncate">{username}</span>}
                    </button>
                ) : (
                    <div
                        className={`flex items-center rounded-lg border border-transparent
                            ${isCollapsed ? "w-full h-12 justify-center px-0" : "w-full h-12 px-3 py-2 justify-start"}`}
                    >
                        <div className="flex justify-center items-center rounded-full overflow-hidden bg-neutral-700 text-white font-bold select-none w-8 h-8 text-sm ring-2 ring-neutral-600 shrink-0">
                            G
                        </div>
                        {!isCollapsed && <span className="pl-2 text-sm text-neutral-400 truncate">Guest</span>}
                    </div>
                )}
                <button
                    onClick={onLogout}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 font-medium py-2 px-3 mt-2 rounded-lg transition-colors duration-150 cursor-pointer text-sm"
                >
                    {isCollapsed ? "↩" : (isGuest ? "Exit guest mode" : "Sign out")}
                </button>
            </div>

        </div>
    );

};

export default Sidebar;
