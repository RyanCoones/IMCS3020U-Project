import React from "react";
import { useNavigate } from "react-router-dom";
import { PanelRightClose, PanelRightOpen } from "lucide-react"

interface SidebarProps {
    isCollapsed: boolean;
    username?: string;
    toggleSidebar?: () => void;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({isCollapsed, username, toggleSidebar, onLogout}) => {
    const navigate = useNavigate();

    return(
        <div className={`v-full bg-ccgreen-700 text-white flex flex-col justify-between transition-all duration-200 ${isCollapsed ? "w-18" : "w-64"}`}>
            <div className="flex flex-col space-y-4 p-3">
                <div className="flex items-center justify-between overflow-hidden">
                    {/* Logo */}
                    {!isCollapsed && (
                        <div className="px-3 text-2xl font-bold transition-opacity duration-300">
                            CrossCheck
                        </div>
                    )}
                    {/* Toggle button */}
                    {toggleSidebar && (
                        <button
                            onClick={toggleSidebar}
                            className="flex items-center justify-center bg-ccgreen-800 hover:bg-ccgreen-900 rounded-md transition-all duration-300 shrink-0 w-12 h-12"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelRightClose size={24} /> : <PanelRightOpen size={24} />}
                        </button>
                    )}
                </div>
                {/* BUTTONS FOR NAVIGATION GO HERE WITH THIS FORMAT */}
                <button
                    title=""
                    onClick={() => navigate("/path")}
                    className={`flex items-center bg-ccgreen-800 text-white rounded-md cursor-pointer hover:bg-ccgreen-900 transition-all duration-200 ${isCollapsed ? "w-12 h-12 justify-center px-0" : "w-full h-12 px-3 py-2 justify-start"}`}
                >
                    {/* LUCIDE REACT SYMBOL SIZE 24: <Symbol size={24}/> */}
                    {!isCollapsed && <span className="ml-4">BUTTON TEXT</span>}
                </button>
            </div>
                



                <div className="py-4 px-2">
                    <div className="w-full h-px bg-ccgreen-800 mb-2"></div>
                    <button
                        onClick={() => navigate("/")}
                        className={`flex items-center bg-ccgreen-800 text-white rounded-md cursor-pointer hover:bg-ccgreen-900 transition-all duration-200 ${isCollapsed ? "w-full h-14 justify-center px-0" : "w-full h-14 px-3 py-2 justify-start"}`}
                        style={{paddingLeft: isCollapsed ? "0rem" : "0.5rem"}}
                    >
                        {/* USER ICON */}
                        <div className="flex justify-center items-center rounded-full overflow-hidden bg-linear-to-b from-ccblue-700 to-ccblue-900 text-white font-bold select-none w-10 h-10">{username ? username[0].toUpperCase() : "U"}</div>
                        {!isCollapsed && <span className="pl-2">{username}</span>}
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full bg-ccblue-800 hover:bg-ccblue-900 text-white font-bold py-2 px-4 mt-2 rounded"
                        style={{fontSize: isCollapsed ? "0.75rem" : "1rem", padding: isCollapsed ? "0.25rem" : "0.5rem 1rem"}}
                    >
                        Sign out
                    </button>
                </div>

        </div>
    );

};

export default Sidebar;