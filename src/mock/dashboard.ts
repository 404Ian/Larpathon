/* All dashboard data in one place. Replace freely. */
export type StatRow = {
    label: string;
    value: string;
    trend?: "up" | "dn";
    chevron?: boolean;
};
export type Perf = {
    heading: string;
    title: string;
    thumb: [string, string];
    views: string;
    comments: string;
    likes: string;
    window: string;
    rows: StatRow[];
};

export const LATEST_VIDEO: Perf = {
    heading: "Latest video performance",
    title: "The Lost Future of Analog Computing",
    thumb: ["#2b3a67", "#c9a227"],
    views: "48.2K",
    comments: "420",
    likes: "2.15K",
    window: "First 2 days 10 hours",
    rows: [
        { label: "Ranking by views", value: "1 of 10", chevron: true },
        { label: "Views", value: "48.2K", trend: "up" },
        { label: "Thumbnail click-through rate", value: "5.4%", trend: "dn" },
        { label: "Average view duration", value: "14:01", trend: "up" },
    ],
};

export const LATEST_SHORT: Perf = {
    heading: "Latest Short performance",
    title: "How Vacuum Tubes Actually Work in 30 Seconds",
    thumb: ["#3a1c71", "#d76d77"],
    views: "31.7K",
    comments: "9",
    likes: "1.04K",
    window: "First 6 days 3 hours",
    rows: [
        { label: "Ranking by views", value: "7 of 10", chevron: true },
        { label: "Views", value: "31.7K", trend: "dn" },
        { label: "Viewed (vs. swiped away)", value: "64.2%" },
        { label: "Average view duration", value: "0:22", trend: "up" },
    ],
};

export const ANALYTICS = {
    subscribers: "52,400",
    delta: "+1.42K",
    summary: [
        ["Views", "486K"],
        ["Watch time (hours)", "49.2K"],
        ["Estimated revenue", "$845.60"],
    ] as [string, string][],
    top: [
        ["The Lost Future of Analog Computing", "36,457"],
        ["How Vacuum Tubes Actually Work in 30 Seconds", "20,537"],
        ["Building a Synth From Scrap", "1,446"],
    ] as [string, string][],
};

export const INSIDER = {
    title: "Inside Studio Algorithms 2026",
    description:
        "Updates and weekly creator recommendations from the Studio Liaison team.",
    thumb: ["#1d2b64", "#f8cdda"] as [string, string],
};

export const LATEST_POST_EMPTY =
    "Create your first post to start a conversation and get feedback from your community.";

export const COMMENTS = [
    {
        letter: "M",
        color: "#8d6e63",
        who: "@mira_codes",
        ago: "17 hours ago",
        text: "been here since the start, great growth",
        thumb: ["#2b3a67", "#c9a227"],
    },
    {
        letter: "T",
        color: "#43a047",
        who: "@tomas_r",
        ago: "13 hours ago",
        text: "easily your best video yet",
        thumb: ["#2b3a67", "#c9a227"],
    },
    {
        letter: "C",
        color: "#1fa38a",
        who: "@caleb_x19",
        ago: "15 hours ago",
        text: "finally a new upload",
        thumb: ["#3a1c71", "#d76d77"],
    },
] as {
    letter: string;
    color: string;
    who: string;
    ago: string;
    text: string;
    thumb: [string, string];
}[];

export const SUBSCRIBERS = [
    {
        letter: "K",
        color: "#ab47bc",
        name: "kai_wren",
        count: "2.3K subscribers",
    },
    { letter: "O", color: "#1fa38a", name: "ola_pax", count: "0 subscribers" },
    { letter: "J", color: "#ec407a", name: "jun_ito", count: "1 subscriber" },
];

export const IDEAS_FOR_YOU = [
    "A follow-up to “The Lost Future of Analog Computing”",
    "We rebuilt a synth in 24 hours",
    "Ranking your wildest build failures",
];

export const WHATS_NEW = [
    "New chapters tool for long videos",
    "Compare thumbnails side by side",
    "Shorts can now run up to three minutes",
    "More roles for channel permissions",
    "Refreshed Inspiration tab",
];

export const FOOTER_LINKS = [
    "Terms of use",
    "Privacy policy",
    "Policies & Safety",
];
