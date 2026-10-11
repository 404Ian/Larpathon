import { useState } from "react";
import { Ic } from "../components/Ic";
import { BulbIcon, ComposeIcon } from "../components/DashIcons";
import {
    Avatar,
    Btn,
    Card,
    CardTitle,
    IconBtn,
    Kv,
    RBtn,
    Thumb,
    Trend,
} from "../components/ui";
import {
    ANALYTICS,
    COMMENTS,
    FOOTER_LINKS,
    IDEAS_FOR_YOU,
    INSIDER,
    LATEST_POST_EMPTY,
    LATEST_SHORT,
    LATEST_VIDEO,
    SUBSCRIBERS,
    WHATS_NEW,
    type Perf,
} from "../mock/dashboard";

const HR = "h-0 border-0 border-t border-solid border-[color:var(--line)]";
const Divider = () => <hr className={`my-[12px] ${HR}`} />;
const SecTitle = ({ t, s }: { t: string; s: string }) => (
    <>
        <div className="text-[16px] font-medium leading-[24px]">{t}</div>
        <div className="mb-[8px] text-[12px] leading-[16px] text-[color:var(--tx2)]">
            {s}
        </div>
    </>
);
const Sub = ({ children }: { children: string }) => (
    <div className="mb-[8px] text-[12px] leading-[16px] text-[color:var(--tx2)]">
        {children}
    </div>
);

/* Latest video / Latest Short */
function Performance({ d }: { d: Perf }) {
    const [open, setOpen] = useState(true);
    const stat = "inline-flex items-center gap-[8px]";
    return (
        <Card>
            <CardTitle>{d.heading}</CardTitle>
            <div className="relative aspect-video overflow-hidden rounded-[12px] bg-[var(--thumb)]">
                <Thumb a={d.thumb[0]} b={d.thumb[1]} />
                <div className="absolute inset-0 bg-[linear-gradient(transparent_45%,rgba(0,0,0,0.75))]" />
                <div className="absolute bottom-[12px] left-[24px] right-[24px] line-clamp-2 text-[15px] font-medium leading-[24px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                    {d.title}
                </div>
            </div>

            <div
                className={`flex h-[52px] items-center gap-[24px] text-[color:var(--tx2)] ${open ? "border-b border-solid border-[color:var(--line)]" : ""}`}
            >
                <span className={stat}>
                    <Ic name="bars" className="h-[20px] w-[20px]" />
                    {d.views}
                </span>
                <span className={stat}>
                    <Ic name="comment" className="h-[20px] w-[20px]" />
                    {d.comments}
                </span>
                <span className={stat}>
                    <Ic name="thumb" className="h-[20px] w-[20px]" />
                    {d.likes}
                </span>
                <span className="flex-1" />
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[color:var(--tx)]"
                    aria-label="Toggle details"
                >
                    <Ic
                        name="chevron-up"
                        className={`h-[24px] w-[24px] transition-transform duration-200 ${open ? "" : "rotate-180"}`}
                    />
                </button>
            </div>

            {open && (
                <>
                    <div className="pb-[6px] pt-[16px] text-[14px] text-[color:var(--tx2)]">
                        {d.window}
                    </div>
                    {d.rows.map((r) => (
                        <Kv key={r.label} label={r.label}>
                            {r.chevron ? (
                                <span className="inline-flex items-center gap-[2px]">
                                    {r.value}
                                    <Ic
                                        name="chevron-right"
                                        className="h-[18px] w-[18px]"
                                    />
                                </span>
                            ) : (
                                <>
                                    {r.value}
                                    {r.trend && <Trend dir={r.trend} />}
                                </>
                            )}
                        </Kv>
                    ))}
                    <div className="mt-[16px] flex flex-wrap items-center gap-x-[16px] gap-y-[12px]">
                        <Btn>
                            <Ic
                                name="sparkle"
                                className="ml-[-2px] h-[20px] w-[20px]"
                            />
                            Catch me up on this video
                        </Btn>
                        <span className="inline-flex gap-[16px]">
                            <RBtn name="bars" />
                            <RBtn name="comment" />
                        </span>
                    </div>
                </>
            )}
        </Card>
    );
}

type Props = {
    onOpenUpload?: () => void;
    onCreatePost?: () => void;
    onSeeAllSubscribers?: () => void;
    onViewMoreComments?: () => void;
};

export default function Dashboard({
    onOpenUpload,
    onCreatePost,
    onSeeAllSubscribers,
    onViewMoreComments,
}: Props) {
    const col = "flex min-w-0 flex-1 basis-0 flex-col gap-[24px]";
    return (
        <div className="max-w-[1720px] px-[24px]">
            {/* page header */}
            <div className="flex min-h-[55px] items-center pl-[8px] pt-[23px]">
                <h1 className="m-0 text-[32px] font-bold leading-[40px] tracking-[-0.4px]">
                    Channel dashboard
                </h1>
                <span className="flex-1" />
                <IconBtn
                    size="oc"
                    className="!ml-0"
                    aria-label="Upload"
                    onClick={onOpenUpload}
                >
                    <Ic name="upload" />
                </IconBtn>
                <IconBtn size="oc" aria-label="Go live">
                    <Ic name="live" />
                </IconBtn>
                <IconBtn
                    size="oc"
                    aria-label="Create post"
                    onClick={onCreatePost}
                >
                    <Ic name="edit" />
                </IconBtn>
            </div>

            <div className="mt-[24px] flex items-start gap-[24px]">
                {/* column 1 */}
                <div className={col}>
                    <Performance d={LATEST_VIDEO} />
                    <Performance d={LATEST_SHORT} />

                    <Card>
                        <CardTitle>Latest post</CardTitle>
                        <div className="flex flex-col items-center gap-[12px] rounded-[8px] border border-solid border-[color:var(--line)] p-[24px] text-center">
                            <ComposeIcon className="h-[56px] w-[56px] text-[color:var(--tx3)]" />
                            <p className="m-0 text-[14px] text-[color:var(--tx2)]">
                                {LATEST_POST_EMPTY}
                            </p>
                            <Btn variant="filled" onClick={onCreatePost}>
                                Create post
                            </Btn>
                        </div>
                    </Card>
                </div>

                {/* column 2 */}
                <div className={col}>
                    <Card>
                        <CardTitle>Channel analytics</CardTitle>
                        <div className="text-[14px]">Current subscribers</div>
                        <div className="my-[2px] text-[36px] font-bold leading-[44px] tracking-[-0.3px] [font-variant-numeric:tabular-nums]">
                            {ANALYTICS.subscribers}
                        </div>
                        <div className="text-[12px] leading-[16px] text-[color:var(--tx2)]">
                            <span className="text-[color:var(--green)]">
                                {ANALYTICS.delta}
                            </span>{" "}
                            in last 28 days
                        </div>
                        <Divider />
                        <SecTitle t="Summary" s="Last 28 days" />
                        {ANALYTICS.summary.map(([l, v]) => (
                            <Kv key={l} label={l}>
                                {v}
                                <Trend dir="up" />
                            </Kv>
                        ))}
                        <Divider />
                        <SecTitle t="Top content" s="Last 48 hours · Views" />
                        {ANALYTICS.top.map(([t, v]) => (
                            <div
                                key={t}
                                className="flex min-h-[32px] items-center justify-between gap-[16px] text-[14px]"
                            >
                                <a className="min-w-0 cursor-pointer truncate hover:underline">
                                    {t}
                                </a>
                                <span>{v}</span>
                            </div>
                        ))}
                        <div className="mt-[16px]">
                            <Btn>Go to channel analytics</Btn>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>Latest comments</CardTitle>
                        <Sub>Channel comments I haven&apos;t responded to</Sub>
                        {COMMENTS.map((c, i) => (
                            <div key={c.who}>
                                {i > 0 && <Divider />}
                                <div className="flex items-start gap-[12px]">
                                    <Avatar
                                        letters={c.letter}
                                        size={24}
                                        bg={c.color}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] text-[color:var(--tx2)]">
                                            <span className="font-medium">
                                                {c.who}
                                            </span>{" "}
                                            · {c.ago}
                                        </div>
                                        <div className="mt-[4px] text-[13px] [overflow-wrap:anywhere]">
                                            {c.text}
                                        </div>
                                    </div>
                                    <div className="h-[36px] w-[64px] flex-none overflow-hidden rounded-[4px] bg-[var(--thumb)]">
                                        <Thumb a={c.thumb[0]} b={c.thumb[1]} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="mt-[16px]">
                            <Btn onClick={onViewMoreComments}>View more</Btn>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>Recent subscribers</CardTitle>
                        <Sub>Last 90 days</Sub>
                        {SUBSCRIBERS.map((s) => (
                            <div
                                key={s.name}
                                className="flex items-center gap-[16px] py-[12px]"
                            >
                                <Avatar
                                    letters={s.letter}
                                    size={40}
                                    bg={s.color}
                                />
                                <div>
                                    <div className="text-[13px]">{s.name}</div>
                                    <div className="text-[12px] leading-[16px] text-[color:var(--tx2)]">
                                        {s.count}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="mt-[16px]">
                            <Btn onClick={onSeeAllSubscribers}>See all</Btn>
                        </div>
                    </Card>
                </div>

                {/* column 3 */}
                <div className={col}>
                    <Card>
                        <div className="flex items-center gap-[4px]">
                            <h2 className="m-0 text-[18px] font-bold leading-[24px]">
                                Creator Insider
                            </h2>
                            <span className="flex-1" />
                            <IconBtn size="sm" aria-label="Previous">
                                <Ic
                                    name="chevron-left"
                                    className="h-[20px] w-[20px]"
                                />
                            </IconBtn>
                            <span className="min-w-[30px] text-center text-[12px] text-[color:var(--tx2)]">
                                1 / 3
                            </span>
                            <IconBtn size="sm" aria-label="Next">
                                <Ic
                                    name="chevron-right"
                                    className="h-[20px] w-[20px]"
                                />
                            </IconBtn>
                        </div>
                        <div className="mt-[16px] block aspect-[4/3] overflow-hidden rounded-[8px] bg-[var(--thumb)]">
                            <Thumb a={INSIDER.thumb[0]} b={INSIDER.thumb[1]} />
                        </div>
                        <div className="mb-[4px] mt-[12px] text-[15px] font-medium leading-[24px]">
                            {INSIDER.title}
                        </div>
                        <p className="m-0 text-[13px] text-[color:var(--tx2)]">
                            {INSIDER.description}
                        </p>
                        <div className="mt-[16px]">
                            <Btn>Watch on YouTube</Btn>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>Ideas for you</CardTitle>
                        <Sub>Based on what your audience is watching</Sub>
                        {IDEAS_FOR_YOU.map((t, i) => (
                            <div
                                key={t}
                                className={`flex items-center gap-[12px] py-[12px] text-[13px] ${i > 0 ? "border-t border-solid border-[color:var(--line)]" : ""}`}
                            >
                                <BulbIcon className="h-[20px] w-[20px] text-[color:var(--tx2)]" />
                                {t}
                            </div>
                        ))}
                        <div className="mt-[4px]">
                            <Btn>
                                <Ic
                                    name="sparkle"
                                    className="ml-[-4px] h-[24px] w-[24px]"
                                />
                                Get more ideas
                            </Btn>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>What&apos;s new in Studio</CardTitle>
                        {WHATS_NEW.map((t, i) => (
                            <div key={t}>
                                {i > 0 && <Divider />}
                                <a className="relative block cursor-pointer py-[6px] pr-[36px] text-[13px] hover:text-[color:var(--blue)]">
                                    {t}
                                </a>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>

            {/* footer links */}
            <div className="flex gap-[38px] pb-[32px] pt-[40px] text-[13px] text-[color:var(--tx2)]">
                {FOOTER_LINKS.map((l) => (
                    <a
                        key={l}
                        className="cursor-pointer hover:text-[color:var(--tx)]"
                    >
                        {l}
                    </a>
                ))}
            </div>
        </div>
    );
}
