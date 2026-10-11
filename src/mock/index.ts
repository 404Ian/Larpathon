// Custom fake data mock with identical shape: { S, D, V, AU, C, SUBS }
// Channel: SynthPulse (@synthpulse)

export interface ChannelSummary {
    v: number;
    id: string;
    name: string;
    handle: string;
    ucid: string;
    avatar: string;
    banner?: string;
    theme: string;
    monetized: boolean;
    country: string;
    countryName: string;
    niche: string;
    vibe: string;
    subs: number;
    totalVideos: number;
    range: string;
    now: number;
    today: string;
    age: number;
    rpm: number;
    cpm: number;
    pcpm: number;
    vpv: number;
}

export interface DailyHistory {
    vw: number[];
    wh: number[];
    sg: number[];
    sl: number[];
    rv: number[];
    im: number[];
    sv: number[];
    rt: number[];
}

export interface VideoItem {
    k: "video" | "short";
    id: string;
    s?: string;
    t: string;
    d: string;
    pub: number;
    vis: string;
    r?: number;
    vw: number;
    lk: number;
    dl: number;
    cm: number;
    avd: string;
    apv?: number;
    im?: number;
    ctr?: string;
    wh: number;
    sg: number;
    rv: number;
    st?: string;
    o?: number;
    dy?: number[];
    h48?: number;
    thumbnail?: string;
}

export interface AudienceData {
    traffic: Record<string, number>;
    trafficShorts: Record<string, number>;
    devices: Record<string, number>;
    geo: Record<string, number>;
    age: Record<string, number>;
    gender: Record<string, number>;
    subtitles: Record<string, number>;
    behavior: Record<string, number>;
    subscribed: { sub: number; unsub: number };
    search: string[];
    external: string[];
    heat: number[][];
    revenue: Record<string, number>;
}

export interface CommentItem {
    v: string;
    a: string;
    c: string;
    i: string;
    t: string;
    d: number;
    l: number;
    h: number;
    timeAgo?: string;
}

export interface SubscriberItem {
    n: string;
    h: string;
    s: number;
    c: string;
}

export interface MockPayload {
    S: ChannelSummary;
    D: DailyHistory;
    V: VideoItem[];
    AU: AudienceData;
    C: CommentItem[];
    SUBS: SubscriberItem[];
}

// Generate 28 days of daily history
const dailyViews = [
    14200, 15100, 16400, 15800, 17200, 19400, 21800, 18300, 16900, 17500, 18100,
    19600, 22400, 24800, 19100, 18400, 19200, 20100, 21400, 25100, 26900, 21200,
    20400, 21800, 22900, 24100, 27800, 29400,
];

const dailyHours = dailyViews.map((v) => Math.round(v * 0.102 * 10) / 10);
const dailyRev = dailyViews.map((v) => Math.round(v * 0.00174 * 100) / 100);
const dailyGain = [
    210, 240, 280, 260, 290, 340, 390, 280, 250, 270, 290, 320, 380, 420, 310,
    290, 310, 330, 360, 410, 450, 340, 320, 350, 370, 400, 460, 490,
];
const dailyLoss = dailyGain.map((g) => Math.round(g * 0.12));

export const mockData: MockPayload = {
    S: {
        v: 1,
        id: "cmv_synthpulse_9k",
        name: "SynthPulse",
        handle: "@synthpulse",
        ucid: "UC_synthpulse_audio_code",
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='hsl(168,64%25,42%25)'/%3E%3Ctext x='50%25' y='50%25' dy='0.35em' text-anchor='middle' font-family='-apple-system,BlinkMacSystemFont,Roboto,sans-serif' font-size='48' font-weight='600' fill='%23fff'%3ESP%3C/text%3E%3C/svg%3E",
        theme: "dk",
        monetized: true,
        country: "US",
        countryName: "United States",
        niche: "Tech & Audio Engineering",
        vibe: "Educational & Deep Tech",
        subs: 52400,
        totalVideos: 88,
        range: "last28",
        now: 1775836800000,
        today: "2026-10-11",
        age: 420,
        rpm: 1.74,
        cpm: 4.85,
        pcpm: 5.6,
        vpv: 1.2,
    },
    D: {
        vw: dailyViews,
        wh: dailyHours,
        sg: dailyGain,
        sl: dailyLoss,
        rv: dailyRev,
        im: dailyViews.map((v) => v * 12),
        sv: dailyViews.map((v) => Math.round(v * 0.4)),
        rt: dailyViews.map((v) => Math.round(v * 0.35)),
    },
    V: [
        {
            k: "video",
            id: "vid_lost_future",
            t: "The Lost Future of Analog Computing",
            d: "21:40",
            pub: 1775620800000,
            vis: "public",
            vw: 48200,
            lk: 2150,
            dl: 18,
            cm: 420,
            avd: "15:22",
            ctr: "5.8%",
            wh: 12340,
            sg: 1420,
            rv: 83.86,
            h48: 38200,
            dy: [12000, 18400, 17800],
        },
        {
            k: "short",
            id: "sh_vacuum_tubes",
            t: "How Vacuum Tubes Actually Work in 30 Seconds",
            d: "0:32",
            pub: 1775016000000,
            vis: "public",
            vw: 36100,
            lk: 1340,
            dl: 12,
            cm: 28,
            avd: "0:28",
            ctr: "68.2%",
            wh: 280,
            sg: 420,
            rv: 12.4,
            h48: 1420,
        },
        {
            k: "video",
            id: "vid_quantum_radio",
            t: "Can We Build a Quantum Radio Receiver?",
            d: "18:15",
            pub: 1774238400000,
            vis: "public",
            vw: 89400,
            lk: 4320,
            dl: 34,
            cm: 610,
            avd: "12:45",
            ctr: "6.2%",
            wh: 18900,
            sg: 2100,
            rv: 155.5,
            h48: 22400,
        },
        {
            k: "video",
            id: "vid_modular_synth",
            t: "Modular Synth Architecture From Scratch",
            d: "25:04",
            pub: 1773028800000,
            vis: "public",
            vw: 64200,
            lk: 3100,
            dl: 22,
            cm: 340,
            avd: "16:10",
            ctr: "5.1%",
            wh: 17200,
            sg: 1680,
            rv: 111.7,
            h48: 1650,
        },
    ],
    AU: {
        traffic: {
            "Browse features": 54.2,
            "YouTube search": 22.8,
            "Suggested videos": 14.5,
            "Channel pages": 4.8,
            Others: 3.7,
        },
        trafficShorts: {
            "Shorts feed": 86.4,
            "Channel pages": 6.8,
            "YouTube search": 4.2,
            "Sound page": 2.6,
        },
        devices: {
            "Mobile phone": 58.2,
            Computer: 31.4,
            TV: 8.1,
            Tablet: 2.3,
        },
        geo: {
            "United States": 42.1,
            "United Kingdom": 11.4,
            Germany: 8.6,
            Canada: 7.2,
            Australia: 5.1,
            Other: 25.6,
        },
        age: {
            "18–24 years": 18.2,
            "25–34 years": 44.6,
            "35–44 years": 24.1,
            "45–54 years": 9.5,
            "55+ years": 3.6,
        },
        gender: {
            Male: 78.4,
            Female: 19.8,
            "User-specified": 1.8,
        },
        subtitles: {
            "English (auto-generated)": 64.2,
            English: 28.4,
            "No subtitles": 7.4,
        },
        behavior: {
            "Returning viewers": 42.8,
            "New viewers": 57.2,
        },
        subscribed: { sub: 32.4, unsub: 67.6 },
        search: [
            "analog computer",
            "vacuum tube logic",
            "modular synth basics",
            "quantum radio receiver",
        ],
        external: [
            "google.com",
            "reddit.com",
            "news.ycombinator.com",
            "twitter.com",
        ],
        heat: Array.from({ length: 7 }, () =>
            Array.from({ length: 24 }, () => Math.floor(Math.random() * 5)),
        ),
        revenue: {
            "Watch page ads": 68.2,
            "YouTube Premium": 18.4,
            Memberships: 9.8,
            Supers: 3.6,
        },
    },
    C: [
        {
            v: "vid_lost_future",
            a: "@alex_k",
            c: "#5c6bc0",
            i: "A",
            t: "this channel never misses with the visuals and historical depth",
            d: 0,
            l: 42,
            h: 0,
            timeAgo: "14 hours ago",
        },
        {
            v: "vid_lost_future",
            a: "@nova_sound",
            c: "#26a69a",
            i: "N",
            t: "the pacing on this one is incredible, loved the breakdown of mechanical integrators",
            d: 0,
            l: 28,
            h: 0,
            timeAgo: "11 hours ago",
        },
        {
            v: "vid_lost_future",
            a: "@dev_marcus",
            c: "#ab47bc",
            i: "D",
            t: "finally a detailed explanation of analog diff analyzers that actually makes sense",
            d: 0,
            l: 19,
            h: 0,
            timeAgo: "18 hours ago",
        },
    ],
    SUBS: [
        { n: "marcus_w", h: "@marcus_w", s: 1420, c: "#ab47bc" },
        { n: "elena_code", h: "@elena_code", s: 820, c: "#26a69a" },
        { n: "kevin_beats", h: "@kevin_beats", s: 215, c: "#ec407a" },
        { n: "rachel_audio", h: "@rachel_audio", s: 3410, c: "#5c6bc0" },
        { n: "jordan_dsp", h: "@jordan_dsp", s: 94, c: "#42a5f5" },
        { n: "tara_synth", h: "@tara_synth", s: 12, c: "#ff7043" },
    ],
};
