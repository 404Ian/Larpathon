import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    useOutletContext,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AppLayout } from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import {
    ContentPage,
    AnalyticsPage,
    CommunityPage,
    SubtitlesPage,
    CopyrightPage,
    EarnPage,
    CustomizationPage,
    AudioPage,
    VideoAnalyticsPage,
    VideoCommentsPage,
} from "./pages/PlaceholderPages";

const DashboardWrapper: React.FC = () => {
    const { onOpenUpload } = useOutletContext<{ onOpenUpload: () => void }>();
    return <DashboardPage onOpenUpload={onOpenUpload} />;
};

export const App: React.FC = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<DashboardWrapper />} />
                        <Route path="content/*" element={<ContentPage />} />
                        <Route path="analytics/*" element={<AnalyticsPage />} />
                        <Route path="comments/*" element={<CommunityPage />} />
                        <Route path="subtitles" element={<SubtitlesPage />} />
                        <Route path="copyright" element={<CopyrightPage />} />
                        <Route path="earn" element={<EarnPage />} />
                        <Route
                            path="customization"
                            element={<CustomizationPage />}
                        />
                        <Route path="audio" element={<AudioPage />} />
                        <Route
                            path="video/:id/analytics"
                            element={<VideoAnalyticsPage />}
                        />
                        <Route
                            path="video/:id/comments"
                            element={<VideoCommentsPage />}
                        />
                        <Route path="*" element={<DashboardWrapper />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
};

export default App;
