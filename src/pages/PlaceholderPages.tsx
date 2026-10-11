import React from "react";

interface PlaceholderPageProps {
    title: string;
    tabs?: string[];
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
    title,
    tabs = [],
    activeTab,
    onTabChange,
    description = "This section will display channel data and tools.",
}) => {
    return (
        <div className="p-6 max-w-[1440px] mx-auto animate-fadeIn select-none">
            <h1 className="text-[25px] font-bold text-tx tracking-tight mb-4">
                {title}
            </h1>

            {tabs.length > 0 && (
                <div className="flex border-b border-line mb-6 gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => onTabChange?.(tab)}
                            className={`pb-3 text-[14px] font-medium transition-colors focus:outline-none ${
                                (activeTab || tabs[0]) === tab
                                    ? "text-tx border-b-2 border-tx"
                                    : "text-tx2 hover:text-tx"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            <div className="p-12 rounded-2xl border border-line bg-card flex flex-col items-center justify-center text-center my-6">
                <p className="text-[16px] font-medium text-tx mb-2">{title}</p>
                <p className="text-[13px] text-tx3 max-w-[400px]">
                    {description}
                </p>
            </div>
        </div>
    );
};

export const ContentPage: React.FC = () => (
    <PlaceholderPage
        title="Channel content"
        tabs={[
            "Videos",
            "Shorts",
            "Live",
            "Posts",
            "Playlists",
            "Podcasts",
            "Inspiration",
        ]}
        activeTab="Videos"
        description="Manage your channel uploads, live streams, posts, and podcasts."
    />
);

export const AnalyticsPage: React.FC = () => (
    <PlaceholderPage
        title="Channel analytics"
        tabs={["Overview", "Content", "Audience", "Revenue", "Trends"]}
        activeTab="Overview"
        description="Your channel analytics, viewer demographics, and performance metrics."
    />
);

export const CommunityPage: React.FC = () => (
    <PlaceholderPage
        title="Community"
        tabs={["Comments", "Viewer posts", "Mentions"]}
        activeTab="Comments"
        description="Review and reply to channel comments and viewer posts."
    />
);

export const SubtitlesPage: React.FC = () => (
    <PlaceholderPage
        title="Channel languages"
        description="Add and manage subtitles, captions, and translations for your videos."
    />
);

export const CopyrightPage: React.FC = () => (
    <PlaceholderPage
        title="Content detection"
        description="Review copyright takedown requests and content match identification."
    />
);

export const EarnPage: React.FC = () => (
    <PlaceholderPage
        title="Earn on Studio"
        description="Explore monetization opportunities, fan funding, and creator rewards."
    />
);

export const CustomizationPage: React.FC = () => (
    <PlaceholderPage
        title="Channel customization"
        tabs={["Layout", "Branding", "Basic info"]}
        activeTab="Layout"
        description="Customize your channel homepage layout, branding banner, and profile."
    />
);

export const AudioPage: React.FC = () => (
    <PlaceholderPage
        title="Audio library"
        tabs={["Free music", "Sound effects", "Starred"]}
        activeTab="Free music"
        description="Browse royalty-free music and sound effects to use in your videos."
    />
);

export const VideoAnalyticsPage: React.FC = () => (
    <PlaceholderPage
        title="Video analytics"
        tabs={["Overview", "Reach", "Engagement", "Audience", "Revenue"]}
        activeTab="Overview"
        description="Detailed metrics and audience insights for this video upload."
    />
);

export const VideoCommentsPage: React.FC = () => (
    <PlaceholderPage
        title="Video comments"
        tabs={["Comments"]}
        activeTab="Comments"
        description="View and reply to comments on this video."
    />
);
