import React, { useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AskStudioDrawer } from "./AskStudioDrawer";
import { UploadModal } from "./UploadModal";
import { SettingsModal } from "./SettingsModal";
import { FeedbackModal } from "./FeedbackModal";

export const AppLayout: React.FC = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [askStudioOpen, setAskStudioOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    return (
        // --nav drives the sidebar width and the main content offset
        <div
            style={
                {
                    "--nav": sidebarCollapsed ? "72px" : "256px",
                } as CSSProperties
            }
        >
            <Header
                onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
                onToggleAskStudio={() => setAskStudioOpen((prev) => !prev)}
                onOpenUpload={() => setUploadOpen(true)}
            />

            <Sidebar
                collapsed={sidebarCollapsed}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenFeedback={() => setFeedbackOpen(true)}
            />

            <main
                className="ml-nav min-h-screen pt-[64px] transition-[margin] duration-200 ease-studio"
                style={{
                    marginRight: askStudioOpen
                        ? "calc(380px + 32px)"
                        : undefined,
                }}
            >
                <div>
                    <Outlet
                        context={{ onOpenUpload: () => setUploadOpen(true) }}
                    />
                </div>
            </main>

            <AskStudioDrawer
                open={askStudioOpen}
                onClose={() => setAskStudioOpen(false)}
            />
            <UploadModal
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
            />
            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
            <FeedbackModal
                open={feedbackOpen}
                onClose={() => setFeedbackOpen(false)}
            />
        </div>
    );
};
