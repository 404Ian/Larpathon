/* YouTube Studio desktop (2026) for LarpLabs WEB LARPs.
   Renders every page from the payload the server embeds (#payload): the
   channel's daily history, each upload's daily views, audience splits,
   comments. All numbers come from the shared channel model, so ranges,
   charts, tables and Ask Studio answers always agree with each other and
   with the phone app. */
(function () {
    "use strict";
    var P = JSON.parse(document.getElementById("payload").textContent);
    var S = P.S,
        AU = P.AU;
    var DAY = 864e5,
        HOUR = 36e5;
    var H = S.H,
        TODAY = S.today;
    var MON = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    var MONTH = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var WDL = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    /* ── DOM + text helpers ──────────────────────────────────── */
    function $(s, r) {
        return (r || document).querySelector(s);
    }
    function $$(s, r) {
        return Array.prototype.slice.call((r || document).querySelectorAll(s));
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[c];
        });
    }
    function clamp(x, a, b) {
        return Math.max(a, Math.min(b, x));
    }
    function hash(s) {
        var h = 2166136261;
        s = String(s);
        for (var i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }
    function rng(seed) {
        var a = hash(seed) || 1;
        return function () {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function pick(r, a) {
        return a[Math.floor(r() * a.length)];
    }
    var LIGHT = S.theme === "light";

    /* ── Number formats (Studio desktop rules) ───────────────── */
    // Three significant digits, rounded down: 4.63K, 22.6K, 474K, 1.23M.
    function cmp(n) {
        var x = Math.abs(n),
            sg = n < 0 ? "-" : "";
        if (x < 1000) return sg + String(Math.round(x));
        var units = [
            [1e9, "B"],
            [1e6, "M"],
            [1e3, "K"],
        ];
        for (var i = 0; i < units.length; i++) {
            if (x >= units[i][0]) {
                var v = x / units[i][0],
                    d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
                var f = Math.pow(10, d),
                    t = Math.floor(v * f + 1e-9) / f;
                if (t >= 1000 && i > 0) {
                    v = x / units[i - 1][0];
                    return (
                        sg +
                        (Math.floor(v * 100) / 100)
                            .toFixed(2)
                            .replace(/\.?0+$/, "") +
                        units[i - 1][1]
                    );
                }
                return (
                    sg +
                    t
                        .toFixed(d)
                        .replace(/\.0+$/, "")
                        .replace(/(\.\d*?)0+$/, "$1") +
                    units[i][1]
                );
            }
        }
        return sg + String(x);
    }
    function full(n) {
        return Math.round(n).toLocaleString("en-US");
    }
    function signed(s, n) {
        return (n > 0 ? "+" : n < 0 ? "" : "") + s;
    }
    function hrs(n) {
        return n < 10
            ? n.toFixed(1)
            : n < 1000
              ? (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "")
              : cmp(n);
    }
    function money(n, opt) {
        opt = opt || {};
        var x = Math.abs(n),
            sg = n < 0 ? "-" : "";
        if (opt.short && x >= 10000) return sg + "$" + cmp(x);
        var cents = opt.cents != null ? opt.cents : x < 1000;
        return (
            sg +
            "$" +
            x.toLocaleString("en-US", {
                minimumFractionDigits: cents ? 2 : 0,
                maximumFractionDigits: cents ? 2 : 0,
            })
        );
    }
    function pct(n, d) {
        d = d == null ? 1 : d;
        if (n > 0 && n < Math.pow(10, -d)) return "< " + Math.pow(10, -d) + "%";
        return n.toFixed(d) + "%";
    }
    function mmss(sec) {
        var s = Math.max(0, Math.round(sec)),
            h = Math.floor(s / 3600),
            m = Math.floor((s % 3600) / 60),
            r = s % 60;
        return h
            ? h +
                  ":" +
                  String(m).padStart(2, "0") +
                  ":" +
                  String(r).padStart(2, "0")
            : m + ":" + String(r).padStart(2, "0");
    }
    function plural(n, w, ws) {
        return full(n) + " " + (Math.round(n) === 1 ? w : ws || w + "s");
    }

    /* ── Dates (all UTC: the model's days are UTC days) ──────── */
    function dt(ms) {
        return new Date(ms);
    }
    function dShort(ms) {
        var d = dt(ms);
        return MON[d.getUTCMonth()] + " " + d.getUTCDate();
    }
    function dLong(ms) {
        var d = dt(ms);
        return (
            MON[d.getUTCMonth()] +
            " " +
            d.getUTCDate() +
            ", " +
            d.getUTCFullYear()
        );
    }
    function dMonY(ms) {
        var d = dt(ms);
        return MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
    }
    function ago(ms) {
        var s = Math.max(0, (S.now - ms) / 1000);
        if (s < 60) return "just now";
        if (s < 3600)
            return (
                Math.floor(s / 60) +
                " minute" +
                (Math.floor(s / 60) === 1 ? "" : "s") +
                " ago"
            );
        if (s < 86400)
            return (
                Math.floor(s / 3600) +
                " hour" +
                (Math.floor(s / 3600) === 1 ? "" : "s") +
                " ago"
            );
        var d = Math.floor(s / 86400);
        if (d < 7) return d + " day" + (d === 1 ? "" : "s") + " ago";
        if (d < 30)
            return (
                Math.floor(d / 7) +
                " week" +
                (Math.floor(d / 7) === 1 ? "" : "s") +
                " ago"
            );
        if (d < 365)
            return (
                Math.floor(d / 30) +
                " month" +
                (Math.floor(d / 30) === 1 ? "" : "s") +
                " ago"
            );
        return (
            Math.floor(d / 365) +
            " year" +
            (Math.floor(d / 365) === 1 ? "" : "s") +
            " ago"
        );
    }
    function clock(ms) {
        var d = dt(ms + tzMs()),
            h = d.getUTCHours(),
            m = d.getUTCMinutes();
        return (
            (h % 12 || 12) +
            ":" +
            String(m).padStart(2, "0") +
            " " +
            (h < 12 ? "AM" : "PM")
        );
    }
    var TZ = {
        US: -5,
        CA: -5,
        GB: 0,
        IE: 0,
        AU: 10,
        NZ: 12,
        IN: 5.5,
        DE: 1,
        FR: 1,
        ES: 1,
        IT: 1,
        NL: 1,
        SE: 1,
        PL: 1,
        BR: -3,
        MX: -6,
        PH: 8,
        ID: 7,
        JP: 9,
        KR: 9,
        NG: 1,
        ZA: 2,
        PK: 5,
    };
    function tzMs() {
        return (TZ[S.country] != null ? TZ[S.country] : -5) * HOUR;
    }

    /* ── The channel's history ───────────────────────────────── */
    // The window holds H days ending yesterday (index H-1). Channels older than
    // the window get their earlier history rebuilt from the lifetime totals so
    // Lifetime and calendar-year ranges still add up.
    var PRE = Math.max(0, Math.round(S.age) - H);
    var L = H + PRE; // full history length in days
    var BIRTH = L - Math.min(L, Math.round(S.age)); // index of the channel's first day
    function dayMs(i) {
        return TODAY - (L - i) * DAY;
    } // start of day i (UTC)
    function idxOf(ms) {
        return L - Math.round((TODAY - Math.floor(ms / DAY) * DAY) / DAY);
    }
    var CH = (function () {
        var D = P.D,
            keys = ["vw", "wh", "sg", "sl", "rv", "im", "sv"],
            sc = { wh: 10, rv: 100 },
            out = {};
        keys.forEach(function (k) {
            var a = new Float64Array(L),
                src = D[k],
                f = sc[k] || 1;
            for (var i = 0; i < H; i++) a[PRE + i] = src[i] / f;
            out[k] = a;
        });
        if (PRE > 0) {
            var sum = function (a) {
                var t = 0;
                for (var i = PRE; i < L; i++) t += a[i];
                return t;
            };
            var wVw = sum(out.vw),
                wWh = sum(out.wh),
                wRv = sum(out.rv),
                wSg = sum(out.sg),
                wSl = sum(out.sl),
                wIm = sum(out.im),
                wSv = sum(out.sv);
            var restVw = Math.max(0, S.life.vw - wVw),
                restWh = Math.max(0, S.life.wh - wWh),
                restRv = Math.max(0, S.life.rv - wRv);
            var netW = wSg - wSl,
                restNet = Math.max(0, S.subs - netW);
            var r = rng(S.id + ":pre"),
                w = new Float64Array(PRE),
                tw = 0;
            // Earlier years grew into the window's level: a convex ramp with weekly texture.
            for (var i = 0; i < PRE; i++) {
                var x = (i + 1) / PRE;
                w[i] =
                    (0.04 + Math.pow(x, 1.7)) *
                    (0.9 + r() * 0.2) *
                    (i % 7 >= 5 ? 1.05 : 1);
                tw += w[i];
            }
            var whPerVw = wVw ? restWh / Math.max(1, restVw) : 0,
                lossRate = wSg ? Math.min(0.4, wSl / wSg) : 0.15;
            for (i = 0; i < PRE; i++) {
                var share = w[i] / tw;
                out.vw[i] = restVw * share;
                out.wh[i] = restVw * share * whPerVw;
                out.rv[i] = restRv * share;
                var net = restNet * share;
                out.sg[i] = net / (1 - lossRate);
                out.sl[i] = out.sg[i] - net;
                out.im[i] = wVw ? out.vw[i] * (wIm / wVw) : 0;
                out.sv[i] = wVw ? out.vw[i] * (wSv / wVw) : 0;
            }
        }
        out.net = new Float64Array(L);
        for (var j = 0; j < L; j++) out.net[j] = out.sg[j] - out.sl[j];
        out.lv = new Float64Array(L);
        for (j = 0; j < L; j++) out.lv[j] = out.vw[j] - out.sv[j];
        // prefix sums for O(1) range totals
        out.P = {};
        Object.keys(out).forEach(function (k) {
            if (k === "P") return;
            var a = out[k],
                p = new Float64Array(L + 1);
            for (var i = 0; i < L; i++) p[i + 1] = p[i] + a[i];
            out.P[k] = p;
        });
        return out;
    })();
    function csum(k, a, b) {
        var p = CH.P[k];
        a = clamp(a, 0, L);
        b = clamp(b, 0, L - 1);
        return b < a ? 0 : p[b + 1] - p[a];
    }

    /* ── Uploads ─────────────────────────────────────────────── */
    var V = P.V.map(function (r, n) {
        var dy = new Float64Array(L),
            pre = new Float64Array(L + 1);
        for (var i = 0; i < r.dy.length; i++) dy[PRE + r.o + i] = r.dy[i];
        for (i = 0; i < L; i++) pre[i + 1] = pre[i] + dy[i];
        var win = pre[L];
        var v = {
            n: n,
            key: r.k,
            vid: r.id,
            short: !!r.s,
            title: r.t,
            dur: r.d,
            pub: r.pub,
            vis:
                ["Public", "Unlisted", "Private", "Scheduled"][r.vis] ||
                "Public",
            restr: r.r || "None",
            views: r.vw,
            likes: r.lk,
            dislikes: r.dl,
            comments: r.cm,
            avd: r.avd,
            apv: r.apv,
            impr: r.im,
            ctr: r.ctr,
            wh: r.wh,
            subs: r.sg,
            rev: r.rv,
            stayed: r.st,
            daily: dy,
            pre: pre,
            h48: r.h48 || null,
            // Views before the window (old uploads) so lifetime ranges still add up.
            before: Math.max(0, r.vw - win),
            desc: "",
            tags: [],
            made: false,
            comm: r.cm > 0,
            cat: "",
        };
        v.pubIdx = Math.max(0, idxOf(v.pub));
        return v;
    });
    var LONG = V.filter(function (v) {
            return !v.short;
        }),
        SHORTS = V.filter(function (v) {
            return v.short;
        });
    var byKey = {};
    V.forEach(function (v) {
        byKey[v.key] = v;
        byKey[v.vid] = v;
    });
    function vsum(v, a, b) {
        a = clamp(a, 0, L);
        b = clamp(b, 0, L - 1);
        if (b < a) return 0;
        var s = v.pre[b + 1] - v.pre[a];
        if (v.before && a < PRE) {
            // Views from before the window follow a launch decay from the upload day.
            var p0 = v.pubIdx,
                span = Math.max(1, PRE - p0),
                tau = v.short ? 6 : 40;
            var F = function (x) {
                x = clamp(x - p0, 0, span);
                return (1 - Math.exp(-x / tau)) / (1 - Math.exp(-span / tau));
            };
            s += v.before * (F(Math.min(b + 1, PRE)) - F(a));
        }
        return s;
    }
    // Per-upload rates for metrics the payload carries as lifetime totals.
    function vrate(v, k) {
        var base = Math.max(1, v.views);
        return {
            wh: v.avd / 3600,
            lk: v.likes / base,
            dl: v.dislikes / base,
            cm: v.comments / base,
            sg: v.subs / base,
            rv: v.rev / base,
            im: v.impr / base,
        }[k];
    }
    function thumb(v, q) {
        if (!v || !v.vid) return "";
        if (v.custom) return v.custom;
        return (
            "https://i.ytimg.com/vi/" +
            encodeURIComponent(v.vid) +
            "/" +
            (v.short ? "oar2.jpg" : q || "mqdefault.jpg")
        );
    }
    function thumbImg(v, cls, q) {
        var src = thumb(v, q);
        return src
            ? '<img class="' +
                  (cls || "th") +
                  '" src="' +
                  esc(src) +
                  '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
            : '<span class="' + (cls || "th") + ' ph"></span>';
    }

    /* -- Icons: Studio's own (captured) plus matching extras -- */
    var ICONS = {
        menu: 'F<path d="M20 5H4a1 1 0 000 2h16a1 1 0 100-2Zm0 6H4a1 1 0 000 2h16a1 1 0 000-2Zm0 6H4a1 1 0 000 2h16a1 1 0 000-2Z"/>',
        search: 'F<path d="M11 2a9 9 0 105.641 16.01.966.966 0 00.152.197l3.5 3.5a1 1 0 101.414-1.414l-3.5-3.5a1 1 0 00-.197-.153A8.96 8.96 0 0020 11a9 9 0 00-9-9Zm0 2a7 7 0 110 14 7 7 0 010-14Z"/>',
        close: 'F<path d="M17.293 5.293 12 10.586 6.707 5.293a1 1 0 10-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 001.414 1.414L12 13.414l5.293 5.293a1 1 0 001.414-1.414L13.414 12l5.293-5.293a1 1 0 10-1.414-1.414Z"/>',
        help: 'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm.5 3h-.483a3.45 3.45 0 00-3.089 1.909l-.323.644a1 1 0 001.79.894l.322-.643a1.46 1.46 0 011.3-.804h.483a1.5 1.5 0 01.153 2.992l-.306.016A1.5 1.5 0 0011 12.5v1a1 1 0 002 0v-.535A3.5 3.5 0 0012.5 6Zm-.5 9.75a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5Z"/>',
        bell: 'F<path d="M16 19a4 4 0 11-8 0H4.765C3.21 19 2.25 17.304 3.05 15.97l1.806-3.01A1 1 0 005 12.446V8a7 7 0 0114 0v4.446c0 .181.05.36.142.515l1.807 3.01c.8 1.333-.161 3.029-1.716 3.029H16ZM12 3a5 5 0 00-5 5v4.446a3 3 0 01-.428 1.543L4.765 17h14.468l-1.805-3.01A3 3 0 0117 12.445V8a5 5 0 00-5-5Zm-2 16a2 2 0 104 0h-4Z"/>',
        create: 'F<path d="M14 4H4a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3v-1.536l3 1.732c1.333.77 3-.191 3-1.731V8.536c0-1.539-1.667-2.501-3-1.731l-3 1.731V7a3 3 0 00-3-3ZM4 6h10a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1Zm5 2a1 1 0 00-1 1v2H6a1 1 0 000 2h2v2a1 1 0 102 0v-2h2a1 1 0 000-2h-2V9a1 1 0 00-1-1Zm8 2.846 4-2.31v6.929l-4-2.309v-2.31Z"/>',
        external:
            'F<path d="M19 5H8a1 1 0 000 2h7.586L5.293 17.293a1 1 0 101.414 1.414L17 8.414V16a1 1 0 002 0V5Z"/>',
        "dashboard-f":
            'F<path d="M9 2H4a2 2 0 00-2 2v7a2 2 0 002 2h5a2 2 0 002-2V4a2 2 0 00-2-2Zm11 0h-5a2 2 0 00-2 2v3a2 2 0 002 2h5a2 2 0 002-2V4a2 2 0 00-2-2Zm0 9h-5a2 2 0 00-2 2v7a2 2 0 002 2h5a2 2 0 002-2v-7a2 2 0 00-2-2ZM9 15H4a2 2 0 00-2 2v3a2 2 0 002 2h5a2 2 0 002-2v-3a2 2 0 00-2-2Z"/>',
        content:
            'F<path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2ZM8 16V4h12v12H8Zm-4 4V6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2H4Zm13-10-5-3v6l5-3Z"/>',
        analytics:
            'F<path d="M20 2H4a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2ZM4 20V4h16v16H4Zm8-13a1 1 0 00-1 1v9h2V8a1 1 0 00-1-1Zm-4 3a1 1 0 00-1 1v6h2v-6a1 1 0 00-1-1Zm8 2a1 1 0 00-1 1v4h2v-4a1 1 0 00-1-1Z"/>',
        community:
            'F<path d="M18 3a4 4 0 00-3.25 1.668 6 6 0 011.6 1.202A2 2 0 1118 9l-.084-.002c.112.662.112 1.339.001 2.001A4 4 0 1018 3ZM6 3.001a4 4 0 10.083 8 6 6 0 010-2.001 2 2 0 111.566-3.13A6 6 0 019.25 4.668 4 4 0 006 3.001Zm6 3a4 4 0 100 8 4 4 0 000-8Zm0 2a2 2 0 110 4 2 2 0 010-4Zm-5.656 4.01A6 6 0 000 18a1 1 0 102 0 3.998 3.998 0 015.53-3.694l.057.024.155-.1a6 6 0 01-1.398-2.219ZM18 12c-.115 0-.23.003-.345.01a5.999 5.999 0 01-1.398 2.22l.155.1A3.998 3.998 0 0122 18a1 1 0 002 0 6 6 0 00-6-6Zm-6 3.001a6 6 0 00-6 6 1 1 0 102 0 4 4 0 018 .001 1 1 0 002 0 6 6 0 00-6-6.001Z"/>',
        subtitles:
            'F<path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2ZM3 19V5h18v14H3Zm5-8H6a1 1 0 000 2h2a1 1 0 000-2Zm10 0h-6a1 1 0 000 2h6a1 1 0 000-2Zm0 4h-2a1 1 0 000 2h2a1 1 0 000-2Zm-6 0H6a1 1 0 000 2h6a1 1 0 000-2Z"/>',
        copyright:
            'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3ZM9.954 7.438a5 5 0 105.307 8.352 1 1 0 00-1.305-1.516 3 3 0 11.026-4.525 1 1 0 001.322-1.501 5 5 0 00-5.35-.81Z"/>',
        earn: 'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 2a1 1 0 00-1 1v1.104a3.5 3.5 0 00-1.435.656C8.886 8.3 8.5 9.09 8.5 10c0 .525.13 1.005.402 1.417.251.368.591.667.989.869.638.339 1.437.495 2.058.615l.109.022c.728.143 1.242.259 1.588.456.107.053.2.133.268.232.039.063.086.174.086.389 0 .2-.267 1-2 1-1.033 0-1.547-.303-1.788-.509a1.199 1.199 0 01-.274-.337 1 1 0 00-1.886.662L9 14.5l-.948.317.001.002.008.024c.055.143.123.281.203.413.175.283.394.537.648.753.478.41 1.156.765 2.088.915V18a1 1 0 002 0v-1.082c1.757-.299 3-1.394 3-2.918 0-.534-.125-1.022-.387-1.444a2.7 2.7 0 00-.978-.915c-.671-.383-1.512-.548-2.153-.673l-.04-.008c-.74-.145-1.258-.251-1.614-.439a.699.699 0 01-.258-.206c-.029-.045-.07-.13-.07-.315 0-.308.114-.518.31-.674C11.027 9.153 11.414 9 12 9c.463.006.917.133 1.316.368.167.095.323.206.468.331l.005.004.01.01a1 1 0 001.408-1.42L14.5 9l.706-.708-.011-.011-.017-.016-.054-.05A5 5 0 0013 7.115V6a1 1 0 00-1-1Z"/>',
        customization:
            'F<path d="m18.266 1.107-.878 2.283-2.282.878a.25.25 0 000 .466l2.282.878.878 2.283a.25.25 0 00.467 0l.878-2.283 2.282-.878a.25.25 0 000-.466l-2.282-.878-.878-2.283a.25.25 0 00-.467 0Zm-11 0L6.388 3.39l-2.282.878a.25.25 0 000 .466l2.282.878.878 2.283a.25.25 0 00.467 0l.878-2.283 2.282-.878a.25.25 0 000-.466L8.611 3.39l-.878-2.283a.25.25 0 00-.467 0ZM11.9 7.864l-8.486 8.484a2 2 0 000 2.83l1.412 1.411a2 2 0 002.828 0l8.485-8.485a2 2 0 000-2.829l-1.41-1.411a2 2 0 00-2.829 0Zm-7.072 9.9 6.715-6.715 1.411 1.411-6.714 6.714-1.412-1.41Zm14.438-4.657-.878 2.283-2.282.878a.25.25 0 000 .466l2.282.878.878 2.283a.25.25 0 00.467 0l.878-2.283 2.282-.878a.25.25 0 000-.466l-2.282-.878-.878-2.283a.25.25 0 00-.467 0Z"/>',
        audio: 'F<path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2ZM8 16V4h12v12H8Zm6-10.513v3.687a3 3 0 101.996 2.98L16 12V8.3l1.621.973A.25.25 0 0018 9.059V7.302a.5.5 0 00-.241-.428l-3-1.814a.5.5 0 00-.759.427ZM4 20V6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2H4Zm9-9a1 1 0 110 2 1 1 0 010-2Z"/>',
        settings:
            'F<path d="M12.844 1h-1.687a2 2 0 00-1.962 1.616 3 3 0 01-3.92 2.263 2 2 0 00-2.38.891l-.842 1.46a2 2 0 00.417 2.507 3 3 0 010 4.525 2 2 0 00-.417 2.507l.843 1.46a2 2 0 002.38.892 3.001 3.001 0 013.918 2.263A2 2 0 0011.157 23h1.686a2 2 0 001.963-1.615 3.002 3.002 0 013.92-2.263 2 2 0 002.38-.892l.842-1.46a2 2 0 00-.418-2.507 3 3 0 010-4.526 2 2 0 00.418-2.508l-.843-1.46a2 2 0 00-2.38-.891 3 3 0 01-3.919-2.263A2 2 0 0012.844 1Zm-1.767 2.347a6 6 0 00.08-.347h1.687a4.98 4.98 0 002.407 3.37 4.98 4.98 0 004.122.4l.843 1.46A4.98 4.98 0 0018.5 12a4.98 4.98 0 001.716 3.77l-.843 1.46a4.98 4.98 0 00-4.123.4A4.979 4.979 0 0012.843 21h-1.686a4.98 4.98 0 00-2.408-3.371 4.999 4.999 0 00-4.12-.399l-.844-1.46A4.979 4.979 0 005.5 12a4.98 4.98 0 00-1.715-3.77l.842-1.459a4.98 4.98 0 004.123-.399 4.981 4.981 0 002.327-3.025ZM16 12a4 4 0 11-7.999 0 4 4 0 018 0Zm-4 2a2 2 0 100-4 2 2 0 000 4Z"/>',
        feedback:
            'F<path d="M19 2H5a4 4 0 00-4 4v10a4 4 0 004 4h2v1.604a1.41 1.41 0 002.095 1.232L14.2 20H19a4 4 0 004-4V6a4 4 0 00-4-4ZM5 4h14a2 2 0 012 2v10a2 2 0 01-2 2h-5.318l-.453.252L9 20.6V18H5a2 2 0 01-2-2V6a2 2 0 012-2Zm7 2a1 1 0 00-1 1v4.5a1 1 0 002 0V7a1 1 0 00-1-1Zm0 7.75a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5Z"/>',
        upload: 'F<path d="M18.707 8.293 12 1.586 5.293 8.293a1 1 0 101.414 1.414L11 5.414V17a1 1 0 002 0V5.414l4.293 4.293a1 1 0 101.414-1.414ZM19 20H5a1 1 0 000 2h14a1 1 0 000-2Z"/>',
        live: 'F<path d="M18.364 4.224a1 1 0 011.414 0 11 11 0 010 15.557 1 1 0 01-1.414-1.414 9 9 0 000-12.729 1 1 0 010-1.414ZM4.222 4.222a1 1 0 011.414 1.415 9 9 0 000 12.728 1 1 0 11-1.414 1.414 11.002 11.002 0 010-15.557Zm3.181 3.181a1.002 1.002 0 011.415 1.415 4.503 4.503 0 00-.975 4.904c.226.545.558 1.042.975 1.46a1.001 1.001 0 01-1.415 1.414 6.502 6.502 0 010-9.193Zm7.779 0c.39-.39 1.024-.39 1.415 0a6.5 6.5 0 010 9.193 1.001 1.001 0 01-1.415-1.415 4.5 4.5 0 000-6.363 1.001 1.001 0 010-1.415ZM12 10a2 2 0 110 4 2 2 0 010-4Z"/>',
        post: 'F<path d="m17.232 2.354-9.546 9.547a3 3 0 00-.789 1.394l-.866 3.462-.404 1.617 1.616-.404 3.463-.865a3 3 0 001.394-.79l9.546-9.547a2.5 2.5 0 000-3.536l-.878-.878a2.5 2.5 0 00-3.536 0ZM14.758 2H4a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V9.242l-2 2V20H4V4h8.758l2-2Zm4.597 1.768.877.878a.5.5 0 010 .708l-.732.732L17.915 4.5l.733-.732a.5.5 0 01.707 0ZM9.1 13.315l7.4-7.4L18.086 7.5l-7.4 7.401c-.129.128-.29.22-.465.264l-1.846.46.462-1.846a1 1 0 01.263-.464Z"/>',
        bars: 'F<path d="M3 2a1 1 0 011 1v17h17a1 1 0 010 2H3a1 1 0 01-1-1V3a1 1 0 011-1Zm10 2a1 1 0 00-1 1v12h2V5a1 1 0 00-1-1ZM8 8a1 1 0 00-1 1v8h2V9a1 1 0 00-1-1Zm10 3a1 1 0 00-1 1v5h2v-5a1 1 0 00-1-1Z"/>',
        comment:
            'F<path d="M14.25 1.5H3.75a3 3 0 00-3 3V12a3 3 0 003 3h1.5v1.203c0 .806.867 1.316 1.571.924L10.651 15h3.599a3 3 0 003-3V4.5a3 3 0 00-3-3ZM3.75 3h10.5l.153.008A1.5 1.5 0 0115.75 4.5V12a1.5 1.5 0 01-1.5 1.5h-3.988l-.34.188L6.75 15.45V13.5h-3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 013.75 3Zm9 3h-7.5a.75.75 0 000 1.5h7.5a.75.75 0 100-1.5Zm-3 3h-4.5a.75.75 0 000 1.5h4.5a.75.75 0 100-1.5Z"/>',
        like: 'F<path d="m7.748.854.779.13a3 3 0 012.44 3.588L10.5 6.75h3.046a2.748 2.748 0 012.204 4.387l.015.066A2.862 2.862 0 0115 13.874v.033c0 .227-.037.452-.109.668l-.08.21a2.815 2.815 0 01-2.59 1.715H9.516l-.294-.005a9.002 9.002 0 01-3.918-1.041l-.256-.142-.204-.116a1.502 1.502 0 00-.55-.186L4.102 15H2.625l-.116-.006a1.126 1.126 0 01-1.003-1.005l-.006-.114v-4.5c0-.62.504-1.124 1.125-1.124h1.342a.75.75 0 00.66-.395l.048-.107 2.24-6.403a.75.75 0 01.833-.491ZM6.09 8.243A2.25 2.25 0 013.967 9.75H3v3.749h1.1a3 3 0 011.49.395l.202.116a7.503 7.503 0 003.724.99h2.703c.566 0 1.07-.363 1.248-.9a.61.61 0 00.032-.193v-.655l.44-.439a1.36 1.36 0 00.363-1.272l-.014-.065-.157-.675.413-.556a1.248 1.248 0 00-.999-1.995H10.5a1.501 1.501 0 01-1.467-1.815L9.5 4.257a1.5 1.5 0 00-1.22-1.794l-.157-.026L6.09 8.243Z"/>',
        "chev-up":
            'F<path d="M5.293 15.207a1 1 0 001.414 0L12 9.914l5.293 5.293a1 1 0 101.414-1.414L12 7.086l-6.707 6.707a1 1 0 000 1.414Z"/>',
        "down-circle":
            'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 5a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414L12 18.414l-4.707-4.707a1 1 0 111.414-1.414L11 14.586V7a1 1 0 011-1Z"/>',
        "chev-left":
            'F<path d="M13.793 5.293 7.086 12l6.707 6.707a1 1 0 101.414-1.414L9.914 12l5.293-5.293a1 1 0 10-1.414-1.414Z"/>',
        "chev-right":
            'F<path d="M8.793 5.293a1 1 0 000 1.414L14.086 12l-5.293 5.293a1 1 0 101.414 1.414L16.914 12l-6.707-6.707a1 1 0 00-1.414 0Z"/>',
        sparkle:
            'F<path d="M1 12c6.075 0 11 4.925 11 11 0-6.075 4.925-11 11-11-6.075 0-11-4.925-11-11 0 6.075-4.925 11-11 11Z"/>',
        dashboard:
            'F<path d="M9 2H4a2 2 0 00-2 2v7a2 2 0 002 2h5a2 2 0 002-2V4a2 2 0 00-2-2Zm11 0h-5a2 2 0 00-2 2v3a2 2 0 002 2h5a2 2 0 002-2V4a2 2 0 00-2-2ZM4 11V4h5v7H4Zm11-4V4h5v3h-5Zm5 4h-5a2 2 0 00-2 2v7a2 2 0 002 2h5a2 2 0 002-2v-7a2 2 0 00-2-2Zm-5 9v-7h5v7h-5Zm-6-5H4a2 2 0 00-2 2v3a2 2 0 002 2h5a2 2 0 002-2v-3a2 2 0 00-2-2Zm-5 5v-3h5v3H4Z"/>',
        "content-f":
            'F<path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2ZM4 20h14a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2v14Zm8-7V7l5 3-5 3Z"/>',
        filter: 'F<path d="M21 5H3a1 1 0 000 2h18a1 1 0 100-2Zm-3 6H6a1 1 0 000 2h12a1 1 0 000-2Zm-3 6H9a1 1 0 000 2h6a1 1 0 000-2Z"/>',
        "chev-down":
            'F<path d="M18.707 8.793a1 1 0 00-1.414 0L12 14.086 6.707 8.793a1 1 0 10-1.414 1.414L12 16.914l6.707-6.707a1 1 0 000-1.414Z"/>',
        "arrow-down":
            'F<path d="M12 3a1 1 0 00-1 1v13.586l-5.293-5.293a1 1 0 10-1.414 1.414L12 21.414l7.707-7.707a1 1 0 10-1.414-1.414L13 17.586V4a1 1 0 00-1-1Z"/>',
        public: 'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2.007c.048.021.153.081.315.248.302.313.667.872 1.016 1.725.611 1.494 1.053 3.597 1.149 6.02H9.519c.097-2.423.539-4.526 1.15-6.021.349-.852.714-1.411 1.016-1.724.162-.167.267-.228.315-.248Zm-2.835.45C8.248 5.277 7.632 7.96 7.52 11H3.057a9.01 9.01 0 016.108-7.543Zm5.669 0A9.01 9.01 0 0120.943 11H16.48c-.112-3.04-.729-5.723-1.646-7.543ZM9.52 13h4.961c-.097 2.423-.539 4.526-1.15 6.02-.349.853-.714 1.412-1.016 1.725-.162.167-.267.228-.315.248-.048-.021-.153-.081-.315-.248-.302-.313-.667-.872-1.016-1.725-.611-1.494-1.053-3.597-1.149-6.02Zm-6.463 0H7.52c.112 3.039.729 5.722 1.645 7.542A9 9 0 013.057 13Zm13.423 0h4.464a9.001 9.001 0 01-6.11 7.542c.916-1.82 1.534-4.502 1.646-7.542Z"/>',
        link: 'F<path d="M9 18c.226 0 .448-.012.667-.037A8.001 8.001 0 018.07 16H7a4 4 0 110-8h2a4 4 0 014 4 2 2 0 001.668 1.973A5.999 5.999 0 009 6H7a6 6 0 100 12h2Zm8 0a6 6 0 100-12h-2c-.225 0-.448.012-.667.036A8 8 0 0115.93 8H17a4 4 0 110 8h-2a4 4 0 01-4-4 2 2 0 00-1.668-1.973A6 6 0 0015 18h2Z"/>',
        first: 'F<path d="M18.293 4.293 10.586 12l7.707 7.707a1 1 0 101.414-1.414L13.414 12l6.293-6.293a1 1 0 10-1.414-1.414ZM6 4a1 1 0 00-1 1v14a1 1 0 102 0V5a1 1 0 00-1-1Z"/>',
        last: 'F<path d="M5.707 4.293a1 1 0 10-1.414 1.414L10.586 12l-6.293 6.293a1 1 0 101.414 1.414L13.414 12 5.707 4.293ZM18 4a1 1 0 00-1 1v14a1 1 0 002 0V5a1 1 0 00-1-1Z"/>',
        "analytics-f":
            'F<path d="M4 2a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4Zm7 6a1 1 0 012 0v9h-2V8Zm-3 2a1 1 0 011 1v6H7v-6a1 1 0 011-1Zm8 2a1 1 0 011 1v4h-2v-4a1 1 0 011-1Z"/>',
        more: 'F<path d="M12 4a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Z"/>',
        warning:
            'F<path d="M10.68 1.844 1.017 19.79a1.5 1.5 0 001.32 2.211h19.326a1.5 1.5 0 001.32-2.21L13.32 1.843c-.566-1.052-2.074-1.052-2.64 0ZM3.174 20 12 3.61 20.826 20H3.174ZM12 8a1 1 0 00-1 1v4.5a1 1 0 002 0V9a1 1 0 00-1-1Zm0 7.75a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5Z"/>',
        "check-circle":
            'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm4.293 5.293L10 14.586l-2.293-2.293a1 1 0 10-1.414 1.414L10 17.414l7.707-7.707a1 1 0 10-1.414-1.414Z"/>',
        "earn-f":
            'F<path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 3.5a1 1 0 011 1v1.614a5 5 0 011.946.949c.08.064.157.131.232.202l.017.017.012.01L14.5 9l.707-.707a1 1 0 01-1.408 1.42l-.01-.01-.005-.004a3.001 3.001 0 00-.468-.331A2.67 2.67 0 0012 9c-.586 0-.973.153-1.19.326-.196.156-.31.366-.31.674 0 .185.041.271.07.315.07.09.155.158.258.205.356.19.874.295 1.614.44l.039.008c.642.125 1.483.291 2.154.673a2.7 2.7 0 01.978.915c.262.422.387.909.387 1.444 0 1.524-1.243 2.618-3 2.918V18.5a1 1 0 01-2 0v-1.576c-.932-.15-1.61-.505-2.088-.915a3.2 3.2 0 01-.648-.753 2.5 2.5 0 01-.203-.413l-.009-.024v-.002L9 14.5l-.948.316a1 1 0 011.886-.662c.07.13.162.242.275.337.24.206.754.509 1.787.509 1.733 0 2-.8 2-1 0-.215-.047-.326-.086-.389a.7.7 0 00-.268-.232c-.346-.197-.86-.313-1.588-.456l-.109-.022c-.621-.121-1.421-.276-2.058-.614a2.7 2.7 0 01-.989-.87C8.63 11.005 8.5 10.525 8.5 10c0-.91.385-1.7 1.065-2.24A3.5 3.5 0 0111 7.104V5.5a1 1 0 011-1Z"/>',
        private:
            'F<path d="M12 1a5 5 0 00-5 5v3H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V11a2 2 0 00-2-2h-2V6a5 5 0 00-5-5Zm0 2a3 3 0 013 3v3H9V6a3 3 0 013-3ZM5 21V11h14v10H5Zm7-8a2 2 0 00-1 3.73v1.77a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1.77A2 2 0 0012 13Z"/>',
        info: 'G18|<path d="M9 .75a8.25 8.25 0 100 16.5A8.25 8.25 0 009 .75Zm0 1.5a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5Zm0 2.813a.937.937 0 100 1.876.937.937 0 000-1.877m.75 6.187V7.5H7.875a.75.75 0 000 1.5h.375v2.25H7.5a.75.75 0 100 1.5h3a.75.75 0 100-1.5l-.75-.001Z"/>',
        "comments-f":
            'F<path d="M1 6a4 4 0 014-4h14a4 4 0 014 4v10a4 4 0 01-4 4h-4.8l-5.105 2.836A1.41 1.41 0 017 21.604V20H5a4 4 0 01-4-4V6Zm8 12v2.601l4.229-2.35.453-.251H19a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h4ZM7 8a1 1 0 000 2h10a1 1 0 100-2H7Zm-1 5a1 1 0 001 1h6a1 1 0 000-2H7a1 1 0 00-1 1Z"/>',
        pip: 'F<path d="M1 6a2 2 0 012-2h18a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V6Zm2 0v12h18V6H3Zm16 6h-6v4h6v-4Z"/>',
        eye: 'S<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        clock: 'S<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
        heart: 'S<path d="M12 20s-7.2-4.4-9.1-9A4.9 4.9 0 0 1 12 6.6 4.9 4.9 0 0 1 21.1 11C19.2 15.6 12 20 12 20z"/>',
        reply: 'S<path d="M10 8l-5 4 5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>',
        flag: 'S<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
        sort: 'S<path d="M4 7h16M7 12h10M10 17h4"/>',
        copy: 'S<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        download: 'S<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
        trash: 'S<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/>',
        pencil: 'S<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
        calendar:
            'S<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        send: 'S<path d="M4.5 12L20 4.5l-5.5 15-2.6-6.1L4.5 12z"/>',
        mic: 'S<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
        plus: 'S<path d="M12 5v14M5 12h14"/>',
        refresh: 'S<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v5h-5"/>',
        expand: 'S<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        history:
            'S<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>',
        newchat:
            'S<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M10 14l.8-3.5L18.5 2.8l2.7 2.7-7.7 7.7L10 14z"/>',
        people: 'S<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.6a5 5 0 0 1 5 5.4"/>',
        person: 'S<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        image: 'S<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8.5 9"/>',
        translate:
            'S<path d="M4 6h9M8.5 4v2M6 6c1 4 4 7 7 8M11 6c-1 4-4 7-7 8"/><path d="M13 20l4-9 4 9M14.6 16.5h4.8"/>',
        playlist:
            'S<path d="M4 6h12M4 11h12M4 16h7"/><path d="M15.5 14.5v6l4.5-3z"/>',
        podcast:
            'S<circle cx="12" cy="10.5" r="2"/><path d="M12 13v8"/><path d="M8.3 14.2a5.5 5.5 0 1 1 7.4 0M5.4 17a9 9 0 1 1 13.2 0"/>',
        bulb: 'S<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
        trend: 'S<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
        bag: 'S<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        badge: 'S<circle cx="12" cy="9" r="5"/><path d="M9.2 13.4L7.5 21l4.5-2.4 4.5 2.4-1.7-7.6"/>',
        star: 'S<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
        music: 'S<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
        check: 'S<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        "arrow-up": 'S<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>',
        "arrow-left": 'S<path d="M19 12H5M11.5 5.5L5 12l6.5 6.5"/>',
        moon: 'S<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
        signout:
            'S<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9.5 16.5L5 12l4.5-4.5M5 12h11"/>',
        tag: 'S<path d="M3.5 12V3.5H12l8.5 8.5-8.5 8.5-8.5-8.5z"/><circle cx="8" cy="8" r="1.4"/>',
        code: 'S<path d="M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5"/>',
        share: 'S<path d="M14 4.5l7 7-7 7M21 11.5H10a6.5 6.5 0 0 0-6.5 6.5v1"/>',
        compare: 'S<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
        chart: 'S<path d="M3.5 3.5v17h17"/><path d="M7 15l4-4 3 3 5.5-6"/>',
        table: 'S<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.8h18M9 4v16"/>',
        mail: 'S<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
        film: 'S<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
        scissors:
            'S<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8 8l12 10M8 16L20 6"/>',
        shield: 'S<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z"/>',
        gift: 'S<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8zm0 0s1.5-4.5 4-3.5S15 8 12 8z"/>',
        emoji: 'S<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.2 2 3.5 2 3.5-2 3.5-2"/><circle cx="9" cy="9.8" r=".8"/><circle cx="15" cy="9.8" r=".8"/>',
        "thumb-up-o":
            'S<path d="M7 10.5v9.5H4.5V10.5H7zm0 0l4-7.5c1.5 0 2.5 1 2.2 2.6L12.6 9.5H18a2 2 0 0 1 2 2.3l-1.2 6.4a2.2 2.2 0 0 1-2.2 1.8H7"/>',
        "thumb-down-o":
            'S<path d="M17 13.5V4h2.5v9.5H17zm0 0l-4 7.5c-1.5 0-2.5-1-2.2-2.6l.6-3.9H6a2 2 0 0 1-2-2.3l1.2-6.4A2.2 2.2 0 0 1 7.4 4H17"/>',
        pin: 'S<path d="M9 3.5h6l-1 5 3 3v2H7v-2l3-3-1-5zM12 13.5V21"/>',
        hide: 'S<path d="M3 3l18 18M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.3 6.4C3.9 8 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/>',
        "chev-dd": 'S<path d="M7 10l5 5 5-5"/>',
        dock: 'S<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14.5 4v16"/>',
        keyboard:
            'S<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"/>',
        location:
            'S<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
        monitor:
            'S<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>',
        phone: 'S<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18.5h2"/>',
        stop: 'S<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
        bookmark: 'S<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
        notice: 'S<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
        cards: 'S<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M13.5 9.5h4v5h-4z"/>',
        "check-circle-o":
            'S<circle cx="12" cy="12" r="9.2"/><path d="M8.2 12.4l2.6 2.6 5-5.3"/>',
        play: 'F<path d="M8 5v14l11-7z"/>',
        pause: 'F<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
        caret: 'F<path d="M7 10l5 5 5-5z"/>',
        dot: 'F<circle cx="12" cy="12" r="4"/>',
        "thumb-up-f":
            'F<path d="M3 10h3.5v10H3zM8 20V10.4L12.2 3c1.6 0 2.6 1.1 2.3 2.7L13.8 9.5H19a2 2 0 0 1 2 2.4l-1.3 6.4A2.2 2.2 0 0 1 17.5 20z"/>',
        "heart-f":
            'F<path d="M12 20.5s-7.6-4.6-9.6-9.4A5.2 5.2 0 0 1 12 6.2a5.2 5.2 0 0 1 9.6 4.9c-2 4.8-9.6 9.4-9.6 9.4z"/>',
        shorts: 'F<path d="M17.8 10.5l-1.4-.7 1.3-.7a3.9 3.9 0 0 0-3.6-6.9L6.3 6.4a3.9 3.9 0 0 0-.1 6.9l1.4.7-1.3.7a3.9 3.9 0 0 0 3.6 6.9l7.8-4.2a3.9 3.9 0 0 0 .1-6.9zM10 15V9l5 3z"/>',
        yt: 'F<path fill="#FF0033" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8z"/><path fill="#fff" d="M10 15l5.2-3L10 9z"/>',
        "up-circle":
            'F<circle cx="12" cy="12" r="10"/><path fill="var(--ic-in,#0f0f0f)" d="M12 6.5l4.5 4.6h-3.2V17.5h-2.6v-6.4H7.5z"/>',
        "down-circle-f":
            'F<circle cx="12" cy="12" r="10"/><path fill="var(--ic-in,#0f0f0f)" d="M12 17.5l-4.5-4.6h3.2V6.5h2.6v6.4h3.2z"/>',
    };
    function ic(name, cls) {
        var s = ICONS[name] || ICONS.info,
            k = s.charAt(0),
            stroke = k === "S",
            vb = "24",
            body = s.slice(1);
        if (k === "G") {
            var bar = body.indexOf("|");
            vb = body.slice(0, bar);
            body = body.slice(bar + 1);
        }
        return (
            '<svg class="ic ' +
            (cls || "") +
            '" viewBox="0 0 ' +
            vb +
            " " +
            vb +
            '" aria-hidden="true"' +
            (stroke
                ? ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
                : ' fill="currentColor"') +
            ">" +
            body +
            "</svg>"
        );
    }
    var LOGO =
        '<svg class="logo" viewBox="0 0 81 20" aria-label="YouTube Studio">' +
        '<path d="M35.9084 19.1299C38.9684 19.1299 40.1884 17.8899 40.1884 14.7799C40.1884 12.2599 38.9484 11.2499 36.9184 9.50994C35.1484 8.00994 34.3784 7.42994 34.3784 5.65994C34.3784 4.28994 34.8984 3.74994 35.9984 3.74994C37.1784 3.74994 37.5784 4.54994 37.4884 6.89994L39.8784 6.74994C40.2984 3.40994 39.0984 1.82994 36.1184 1.82994C33.2784 1.82994 31.8584 3.09994 31.8584 5.80994C31.8584 8.43994 32.7284 9.40994 34.9984 11.1999C36.4984 12.3899 37.6484 13.3399 37.6484 15.2299C37.6484 16.7199 37.1084 17.2699 36.0084 17.2699C34.7984 17.2699 34.3384 16.4399 34.4284 14.2899L32.0384 14.3299C31.5484 17.5499 32.7584 19.1299 35.9084 19.1299Z" fill="currentColor"/>\n<path d="M44.2098 19.0899C44.9098 19.0899 45.9398 18.9699 46.7898 18.5899L46.4698 16.9799C46.1098 17.0899 45.7498 17.1399 45.3498 17.1399C44.6498 17.1399 44.5298 16.6799 44.5298 15.6699V8.51994H46.5498V6.53994H44.4098V3.12994H42.5098L42.1398 6.53994H40.8598V8.51994H42.0198V16.0099C42.0198 17.8999 42.2098 19.0899 44.2098 19.0899Z" fill="currentColor"/>\n<path d="M50.3571 19.0899C51.8172 19.0899 52.7271 18.4799 53.4771 17.3799H53.5871L53.6971 18.8999H55.6871V6.53994H53.0471V16.4699C52.7671 16.9599 52.1171 17.3199 51.5071 17.3199C50.7371 17.3199 50.4971 16.7099 50.4971 15.6899V6.53994H47.8671V15.8099C47.8671 17.8199 48.4471 19.0899 50.3571 19.0899Z" fill="currentColor"/>\n<path d="M63.1287 4.70994C63.1287 5.50994 63.1687 6.36994 63.2487 7.47994H63.1387C62.5787 6.69994 61.6687 6.29994 60.4787 6.29994C58.1987 6.29994 57.5887 8.49994 57.5887 11.6199V13.5399C57.5887 17.1399 58.1687 19.0999 60.4387 19.0999C61.8887 19.0999 62.7687 18.3399 63.3287 17.3099H63.3487L63.6887 18.8999H65.6987V1.43994H63.1287V4.70994ZM63.1287 15.9699C62.9187 16.7499 62.2287 17.2799 61.5787 17.2699C60.6187 17.2399 60.2687 16.1899 60.2687 13.6499V11.7999C60.2687 9.21994 60.6087 8.04994 61.7387 8.04994C62.2687 8.04994 62.8287 8.42994 63.1287 8.95994V15.9699Z" fill="currentColor"/>\n<path d="M69.0851 4.96994C69.9851 4.96994 70.4051 4.66994 70.4051 3.42994C70.4051 2.26994 69.9551 1.90994 69.0851 1.90994C68.2051 1.90994 67.7751 2.22994 67.7751 3.42994C67.7751 4.66994 68.1851 4.96994 69.0851 4.96994ZM67.8651 18.8999H70.3951V6.53994H67.8651V18.8999Z" fill="currentColor"/>\n<path d="M76.2409 6.29994C73.2109 6.29994 72.1709 8.04994 72.1709 11.8199V13.6099C72.1709 16.9899 72.8209 19.1099 76.1809 19.1099C79.4909 19.1099 80.2009 17.0899 80.2009 13.6099V11.8199C80.2009 8.44994 79.5209 6.29994 76.2409 6.29994ZM77.5309 14.7199C77.5309 16.3599 77.2409 17.3899 76.1909 17.3899C75.1609 17.3899 74.8709 16.3499 74.8709 14.7199V10.6799C74.8709 9.27994 75.0709 8.02994 76.1909 8.02994C77.3709 8.02994 77.5309 9.34994 77.5309 10.6799V14.7199Z" fill="currentColor"/>\n<path d="M14.4848 20C14.4848 20 23.5695 20 25.8229 19.4C27.0917 19.06 28.0459 18.08 28.3808 16.87C29 14.65 29 9.98 29 9.98C29 9.98 29 5.34 28.3808 3.14C28.0459 1.9 27.0917 0.94 25.8229 0.61C23.5695 0 14.4848 0 14.4848 0C14.4848 0 5.42037 0 3.17711 0.61C1.9286 0.94 0.954148 1.9 0.59888 3.14C0 5.34 0 9.98 0 9.98C0 9.98 0 14.65 0.59888 16.87C0.954148 18.08 1.9286 19.06 3.17711 19.4C5.42037 20 14.4848 20 14.4848 20Z" fill="#FF0033"/>\n<path d="M19 10L11.5 5.75V14.25L19 10Z" fill="#fff"/>' +
        "</svg>";

    /* ── Date ranges ─────────────────────────────────────────── */
    // A range is a span of day indexes [a, b] (inclusive) in the full history.
    var YDAY = L - 1;
    function rangeOf(key) {
        var r = { key: key };
        var m = /^last(\d+)$/.exec(key),
            d = dt(TODAY);
        if (m) {
            var n = +m[1];
            r.a = L - n;
            r.b = YDAY;
            r.label = "Last " + n + " days";
            r.n = n;
        } else if (key === "life") {
            r.a = BIRTH;
            r.b = YDAY;
            r.label = "Lifetime";
        } else if (/^y\d{4}$/.test(key)) {
            var y = +key.slice(1);
            r.a = idxOf(Date.UTC(y, 0, 1));
            r.b = Math.min(YDAY, idxOf(Date.UTC(y, 11, 31)));
            r.label = String(y);
        } else if (/^m\d$/.test(key)) {
            var k = +key.slice(1),
                mm = d.getUTCMonth() - k,
                yy = d.getUTCFullYear();
            while (mm < 0) {
                mm += 12;
                yy--;
            }
            r.a = idxOf(Date.UTC(yy, mm, 1));
            r.b = Math.min(YDAY, idxOf(Date.UTC(yy, mm + 1, 0)));
            r.label = MONTH[mm];
            if (yy !== d.getUTCFullYear()) r.label += " " + yy;
        } else if (/^p\d+$/.test(key)) {
            r.a = +key.slice(1);
            r.b = YDAY;
            r.label = "Since published";
        } else if (/^c\d+_\d+$/.test(key)) {
            var p = key.slice(1).split("_");
            r.a = +p[0];
            r.b = +p[1];
            r.label = "Custom";
        } else return rangeOf("last28");
        r.a = Math.max(r.a, 0);
        if (r.a > r.b) r.a = r.b;
        r.days = r.b - r.a + 1;
        r.sub = dLong(dayMs(r.a)) + " – " + dLong(dayMs(r.b));
        r.gran = r.days > 400 ? "month" : "day";
        // The period before, for "vs previous" comparisons.
        r.pa = r.a - r.days;
        r.pb = r.a - 1;
        return r;
    }
    function rangeMenu() {
        var d = dt(TODAY),
            y = d.getUTCFullYear(),
            out = [
                ["last7", "Last 7 days"],
                ["last28", "Last 28 days"],
                ["last90", "Last 90 days"],
                ["last365", "Last 365 days"],
                ["life", "Lifetime"],
                "-",
            ];
        for (var k = 0; k < 2; k++)
            if (idxOf(Date.UTC(y - k, 11, 31)) >= BIRTH)
                out.push(["y" + (y - k), String(y - k)]);
        out.push("-");
        for (k = 0; k < 3; k++) {
            var mm = (d.getUTCMonth() - k + 12) % 12,
                yy = d.getUTCFullYear() - (d.getUTCMonth() - k < 0 ? 1 : 0);
            if (idxOf(Date.UTC(yy, mm + 1, 0)) >= BIRTH)
                out.push(["m" + k, MONTH[mm] + (yy !== y ? " " + yy : "")]);
        }
        out.push("-");
        out.push(["custom", "Custom"]);
        return out;
    }

    /* ── Metrics ─────────────────────────────────────────────── */
    // Views per unique viewer grows slowly with the window length.
    function vpvFor(days) {
        return 1 + (S.vpv - 1) * Math.pow(Math.max(1, days) / 28, 0.35);
    }
    function shareOf(rows, label) {
        for (var i = 0; i < rows.length; i++)
            if (rows[i][0] === label) return rows[i][1] / 100;
        return 0;
    }
    var RET =
        shareOf(AU.behavior, "Casual viewers") +
        shareOf(AU.behavior, "Regular viewers");
    var M = {
        views: {
            label: "Views",
            sum: function (a, b) {
                return csum("vw", a, b);
            },
            fmt: function (x) {
                return cmp(x);
            },
            fullFmt: full,
            k: "vw",
        },
        watch: {
            label: "Watch time (hours)",
            sum: function (a, b) {
                return csum("wh", a, b);
            },
            fmt: function (x) {
                return hrs(x);
            },
            fullFmt: function (x) {
                return x < 100 ? x.toFixed(1) : full(x);
            },
            k: "wh",
        },
        subs: {
            label: "Subscribers",
            sum: function (a, b) {
                return csum("net", a, b);
            },
            fmt: function (x) {
                return signed(cmp(x), x);
            },
            fullFmt: function (x) {
                return signed(full(x), x);
            },
            k: "net",
            signed: true,
        },
        rev: {
            label: "Estimated revenue",
            sum: function (a, b) {
                return csum("rv", a, b);
            },
            fmt: function (x) {
                return money(x, { cents: x < 1000 });
            },
            fullFmt: function (x) {
                return money(x, { cents: true });
            },
            k: "rv",
            money: true,
        },
        impr: {
            label: "Thumbnail impressions",
            sum: function (a, b) {
                return csum("im", a, b);
            },
            fmt: cmp,
            fullFmt: full,
            k: "im",
        },
        ctr: {
            label: "Thumbnail click-through rate",
            sum: function (a, b) {
                var im = csum("im", a, b);
                return im ? ((csum("lv", a, b) * 0.68) / im) * 100 : 0;
            },
            fmt: function (x) {
                return pct(x);
            },
            fullFmt: function (x) {
                return pct(x);
            },
            ratio: true,
        },
        avd: {
            label: "Average view duration",
            sum: function (a, b) {
                var v = csum("vw", a, b);
                return v ? (csum("wh", a, b) * 3600) / v : 0;
            },
            fmt: mmss,
            fullFmt: mmss,
            ratio: true,
        },
        uniq: {
            label: "Unique viewers",
            sum: function (a, b) {
                return csum("vw", a, b) / vpvFor(b - a + 1);
            },
            fmt: cmp,
            fullFmt: full,
        },
        ret: {
            label: "Returning viewers",
            sum: function (a, b) {
                return (csum("vw", a, b) / vpvFor(b - a + 1)) * RET;
            },
            fmt: cmp,
            fullFmt: full,
        },
        newv: {
            label: "New viewers",
            sum: function (a, b) {
                return (csum("vw", a, b) / vpvFor(b - a + 1)) * (1 - RET);
            },
            fmt: cmp,
            fullFmt: full,
        },
        sgain: {
            label: "Subscribers gained",
            sum: function (a, b) {
                return csum("sg", a, b);
            },
            fmt: cmp,
            fullFmt: full,
            k: "sg",
        },
        slost: {
            label: "Subscribers lost",
            sum: function (a, b) {
                return csum("sl", a, b);
            },
            fmt: cmp,
            fullFmt: full,
            k: "sl",
        },
        rpm: {
            label: "RPM",
            sum: function (a, b) {
                var v = csum("vw", a, b);
                return v ? (csum("rv", a, b) / v) * 1000 : 0;
            },
            fmt: function (x) {
                return money(x, { cents: true });
            },
            fullFmt: function (x) {
                return money(x, { cents: true });
            },
            ratio: true,
        },
        cpm: {
            label: "Playback-based CPM",
            sum: function (a, b) {
                var v = csum("vw", a, b);
                return v
                    ? (csum("rv", a, b) / v) *
                          1000 *
                          (S.pcpm / Math.max(0.01, S.rpm || 1))
                    : 0;
            },
            fmt: function (x) {
                return money(x, { cents: true });
            },
            fullFmt: function (x) {
                return money(x, { cents: true });
            },
            ratio: true,
        },
        sviews: {
            label: "Shorts views",
            sum: function (a, b) {
                return csum("sv", a, b);
            },
            fmt: cmp,
            fullFmt: full,
            k: "sv",
        },
        lviews: {
            label: "Views",
            sum: function (a, b) {
                return csum("lv", a, b);
            },
            fmt: cmp,
            fullFmt: full,
            k: "lv",
        },
    };
    // Daily (or monthly) points for a metric over a range.
    function series(mk, r, opt) {
        opt = opt || {};
        var m = M[mk],
            pts = [];
        var monthly = (opt.gran || r.gran) === "month";
        if (!monthly) {
            for (var i = r.a; i <= r.b; i++)
                pts.push({ t: dayMs(i), a: i, b: i, v: m.sum(i, i) });
        } else {
            var i0 = r.a;
            while (i0 <= r.b) {
                var d = dt(dayMs(i0)),
                    end = Math.min(
                        r.b,
                        idxOf(
                            Date.UTC(
                                d.getUTCFullYear(),
                                d.getUTCMonth() + 1,
                                0,
                            ),
                        ),
                    );
                pts.push({ t: dayMs(i0), a: i0, b: end, v: m.sum(i0, end) });
                i0 = end + 1;
            }
        }
        return pts;
    }
    // Studio compares a period with the channel's usual range: the median of
    // the six windows of the same length before it. Long ranges compare with
    // the period right before them.
    function versus(mk, r) {
        var m = M[mk],
            cur = m.sum(r.a, r.b);
        if (r.n && r.n <= 90) {
            var prev = [];
            for (var k = 1; k <= 6; k++) {
                var a = r.a - r.days * k,
                    b = r.b - r.days * k;
                if (a < BIRTH) break;
                prev.push(m.sum(a, b));
            }
            if (!prev.length) return { cur: cur, base: null, kind: "usual" };
            prev.sort(function (x, y) {
                return x - y;
            });
            var base =
                prev.length % 2
                    ? prev[(prev.length - 1) / 2]
                    : (prev[prev.length / 2 - 1] + prev[prev.length / 2]) / 2;
            // Typical range: the spread of the previous windows, trimmed at the ends.
            var lo = prev[prev.length > 3 ? 1 : 0],
                hi = prev[prev.length > 3 ? prev.length - 2 : prev.length - 1];
            return {
                cur: cur,
                base: base,
                kind: "usual",
                lo: Math.min(lo, base),
                hi: Math.max(hi, base),
            };
        }
        if (r.pa < BIRTH) return { cur: cur, base: null, kind: "prev" };
        return {
            cur: cur,
            base: m.sum(r.pa, r.pb),
            kind: "prev",
            days: r.days,
        };
    }
    // "388% more than usual", "About the same as usual", "12.4K less than usual".
    function versusText(mk, vs) {
        if (vs.base == null) return "";
        var m = M[mk],
            diff = vs.cur - vs.base,
            p = vs.base ? (diff / Math.abs(vs.base)) * 100 : diff > 0 ? 100 : 0;
        var tail =
            vs.kind === "usual"
                ? " than usual"
                : " than previous " + vs.days + " days";
        if (Math.abs(p) < 5 || (Math.abs(diff) < 1 && !m.ratio))
            return vs.kind === "usual"
                ? "About the same as usual"
                : "About the same as previous " + vs.days + " days";
        var amt =
            m.ratio || m.money || Math.abs(p) >= 100
                ? Math.min(999, Math.round(Math.abs(p))) + "%"
                : m.fmt(Math.abs(diff)).replace(/^[+-]/, "");
        return amt + (diff > 0 ? " more" : " less") + tail;
    }
    function trendDir(mk, vs) {
        if (vs.base == null) return 0;
        var d = vs.cur - vs.base,
            p = vs.base ? d / Math.abs(vs.base) : 1;
        return Math.abs(p) < 0.05 ? 0 : d > 0 ? 1 : -1;
    }

    /* ── Per-upload metrics in a range ───────────────────────── */
    function vstats(v, r) {
        var vw = r ? vsum(v, r.a, r.b) : v.views;
        return {
            v: v,
            views: vw,
            wh: (vw * v.avd) / 3600,
            likes: vw * vrate(v, "lk"),
            comments: vw * vrate(v, "cm"),
            subs: vw * vrate(v, "sg"),
            rev: vw * vrate(v, "rv"),
            impr: vw * vrate(v, "im"),
        };
    }
    function topIn(r, kind, by) {
        by = by || "views";
        return V.filter(function (v) {
            return (
                (!kind || (kind === "short" ? v.short : !v.short)) &&
                v.vis !== "Private"
            );
        })
            .map(function (v) {
                return vstats(v, r);
            })
            .filter(function (x) {
                return x.views >= 0.5;
            })
            .sort(function (x, y) {
                return y[by] - x[by];
            });
    }
    // Views in the first `days` days after publishing (for "Ranking by views").
    function firstDays(v, days) {
        var a = Math.max(PRE, v.pubIdx),
            b = Math.min(YDAY, a + days - 1);
        return vsum(v, a, b) + (v.pubIdx < PRE ? 0 : 0);
    }
    function liveAge(v) {
        return Math.max(0, (S.now - v.pub) / DAY);
    }

    /* ── Charts ──────────────────────────────────────────────── */
    var NS = "http://www.w3.org/2000/svg";
    // Monotone cubic through the points (no overshoot), like Studio's lines.
    function smooth(P) {
        var n = P.length;
        if (!n) return "";
        if (n === 1) return "M" + P[0][0] + "," + P[0][1];
        var dx = [],
            m = [],
            t = [],
            i;
        for (i = 0; i < n - 1; i++) {
            dx[i] = P[i + 1][0] - P[i][0] || 1e-6;
            m[i] = (P[i + 1][1] - P[i][1]) / dx[i];
        }
        t[0] = m[0];
        t[n - 1] = m[n - 2];
        for (i = 1; i < n - 1; i++)
            t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
        for (i = 0; i < n - 1; i++) {
            if (m[i] === 0) {
                t[i] = 0;
                t[i + 1] = 0;
                continue;
            }
            var a = t[i] / m[i],
                b = t[i + 1] / m[i],
                s = a * a + b * b;
            if (s > 9) {
                var k = 3 / Math.sqrt(s);
                t[i] = k * a * m[i];
                t[i + 1] = k * b * m[i];
            }
        }
        var d = "M" + P[0][0].toFixed(1) + "," + P[0][1].toFixed(1);
        for (i = 0; i < n - 1; i++) {
            var h = dx[i] / 3;
            d +=
                "C" +
                (P[i][0] + h).toFixed(1) +
                "," +
                (P[i][1] + t[i] * h).toFixed(1) +
                " " +
                (P[i + 1][0] - h).toFixed(1) +
                "," +
                (P[i + 1][1] - t[i + 1] * h).toFixed(1) +
                " " +
                P[i + 1][0].toFixed(1) +
                "," +
                P[i + 1][1].toFixed(1);
        }
        return d;
    }
    // Studio splits the y axis into three equal steps from zero: 0, 41K, 82K, 123K.
    function axisMax(v) {
        if (!(v > 0)) return 3;
        var step = (v * 1.04) / 3,
            p = Math.pow(10, Math.floor(Math.log10(step)) - 1);
        step = Math.ceil(step / p) * p;
        return step * 3;
    }
    function axisLabel(mk, v) {
        var m = M[mk] || {};
        if (m.money)
            return v >= 1000
                ? "$" + cmp(v)
                : "$" + (v % 1 && v < 10 ? v.toFixed(2) : Math.round(v));
        if (mk === "ctr") return v.toFixed(1) + "%";
        if (mk === "avd") return mmss(v);
        if (mk === "watch") return v < 10 && v % 1 ? v.toFixed(1) : cmp(v);
        if (mk === "pct") return Math.round(v) + "%";
        return cmp(v);
    }
    // Line chart. pts: [{t, v}], opts: {h, mk, markers, compare, anim, tip, pending, xFmt}
    function lineChart(host, pts, opt) {
        opt = opt || {};
        host._lc = { pts: pts, opt: Object.assign({}, opt, { anim: false }) };
        var mk = opt.mk || "views";
        var cs = getComputedStyle(host),
            W = Math.max(
                200,
                host.clientWidth -
                    parseFloat(cs.paddingLeft || 0) -
                    parseFloat(cs.paddingRight || 0) || 600,
            ),
            PH = opt.h || 150,
            RIGHT = opt.noAxis ? 0 : 48,
            TOP = 8;
        var MK = opt.markers ? 30 : 0,
            XL = 26,
            Hh = TOP + PH + MK + XL;
        var PW = W - RIGHT,
            n = pts.length;
        var vals = pts.map(function (p) {
            return p.v;
        });
        if (opt.compare)
            vals = vals.concat(
                opt.compare.map(function (p) {
                    return p.v;
                }),
            );
        var lo = Math.min(0, Math.min.apply(null, vals)),
            hiRaw = Math.max.apply(null, vals.concat([0]));
        var hi = opt.max != null ? opt.max : axisMax(hiRaw - lo) + lo;
        if (!(hi > lo)) hi = lo + 3;
        var X = function (i) {
            return n <= 1 ? PW / 2 : (i / (n - 1)) * PW;
        };
        var Y = function (v) {
            return TOP + PH - ((v - lo) / (hi - lo)) * PH;
        };
        var P = pts.map(function (p, i) {
            return [X(i), Y(p.v)];
        });
        var svg =
            '<svg class="lc" width="' +
            W +
            '" height="' +
            Hh +
            '" viewBox="0 0 ' +
            W +
            " " +
            Hh +
            '">';
        var steps = opt.steps || 3,
            ticks = [];
        for (var tk = 0; tk <= steps; tk++) ticks.push(tk);
        ticks.forEach(function (k) {
            var v = lo + ((hi - lo) * k) / steps,
                y = Y(v).toFixed(1);
            svg +=
                '<line class="gl' +
                (v === 0 ? " z" : "") +
                '" x1="0" x2="' +
                PW +
                '" y1="' +
                y +
                '" y2="' +
                y +
                '"/>';
            if (!opt.noAxis)
                svg +=
                    '<text class="yl" x="' +
                    (PW + 12) +
                    '" y="' +
                    (+y + 4) +
                    '">' +
                    esc(axisLabel(mk, v)) +
                    "</text>";
        });
        svg +=
            '<line class="ax" x1="0" x2="' +
            PW +
            '" y1="' +
            (TOP + PH) +
            '" y2="' +
            (TOP + PH) +
            '"/>';
        // x labels
        var want = Math.max(
            2,
            Math.min(
                n,
                Math.floor(PW / (opt.xw || (opt.gran === "hour" ? 130 : 118))),
            ),
        );
        var step = n <= want ? 1 : (n - 1) / (want - 1);
        var xFmt =
            opt.xFmt ||
            (opt.gran === "month"
                ? function (t) {
                      return dMonY(t);
                  }
                : opt.gran === "hour"
                  ? function (t) {
                        var d = dt(t + tzMs()),
                            h = d.getUTCHours();
                        return (
                            MON[d.getUTCMonth()] +
                            " " +
                            d.getUTCDate() +
                            ", " +
                            (h % 12 || 12) +
                            " " +
                            (h < 12 ? "AM" : "PM")
                        );
                    }
                  : dLong);
        var bottom = TOP + PH + MK;
        for (var j = 0; j < want && j < n; j++) {
            var i = Math.round(j * step);
            if (i > n - 1) i = n - 1;
            var x = X(i),
                anchor =
                    i === 0 && n > 1
                        ? "start"
                        : i === n - 1 && n > 1
                          ? "end"
                          : "middle";
            svg +=
                '<line class="tk" x1="' +
                x.toFixed(1) +
                '" x2="' +
                x.toFixed(1) +
                '" y1="' +
                bottom +
                '" y2="' +
                (bottom + 6) +
                '"/>';
            svg +=
                '<text class="xl" x="' +
                x.toFixed(1) +
                '" y="' +
                (bottom + 20) +
                '" text-anchor="' +
                anchor +
                '">' +
                esc(xFmt(pts[i].t)) +
                "</text>";
        }
        if (opt.markers)
            svg +=
                '<line class="sep" x1="0" x2="' +
                PW +
                '" y1="' +
                bottom +
                '" y2="' +
                bottom +
                '"/>';
        if (opt.compare && opt.compare.length) {
            var C = opt.compare.map(function (p, i) {
                return [
                    X((i * (n - 1)) / Math.max(1, opt.compare.length - 1)),
                    Y(p.v),
                ];
            });
            svg += '<path class="cmpl" d="' + smooth(C) + '"/>';
        }
        if (opt.extra)
            opt.extra.forEach(function (ex) {
                var E = ex.pts.map(function (p, i) {
                    return [X(i), Y(p.v)];
                });
                svg +=
                    '<path class="exl" style="stroke:' +
                    ex.color +
                    '" d="' +
                    smooth(E) +
                    '"/>';
            });
        var line = smooth(P);
        if (opt.area !== false && n > 1)
            svg +=
                '<path class="ar" d="' +
                line +
                "L" +
                P[n - 1][0].toFixed(1) +
                "," +
                (TOP + PH) +
                "L" +
                P[0][0].toFixed(1) +
                "," +
                (TOP + PH) +
                'Z"/>';
        if (opt.pending && n > 1) {
            // The most recent days are still being processed: dashed tail.
            var k0 = Math.max(0, n - 1 - opt.pending);
            svg +=
                '<path class="ln" d="' +
                smooth(P.slice(0, k0 + 1)) +
                '"/><path class="ln pend" d="' +
                smooth(P.slice(k0)) +
                '"/>';
        } else svg += '<path class="ln" d="' + line + '"/>';
        if (n === 1)
            svg +=
                '<circle class="dot1" cx="' +
                P[0][0] +
                '" cy="' +
                P[0][1] +
                '" r="3"/>';
        // upload markers
        if (opt.markers && opt.range) {
            var r = opt.range,
                ups = V.filter(function (v) {
                    return (
                        v.pubIdx >= r.a && v.pubIdx <= r.b && v.vis === "Public"
                    );
                });
            var lastX = -99;
            ups.slice()
                .reverse()
                .forEach(function (v) {
                    var fi =
                            ((v.pubIdx - r.a) / Math.max(1, r.b - r.a)) *
                            (n - 1),
                        mx = X(fi);
                    if (mx - lastX < 18) return;
                    lastX = mx;
                    svg +=
                        '<g class="mkr" data-v="' +
                        v.key +
                        '" transform="translate(' +
                        Math.max(0, Math.min(PW - 16, mx - 8)).toFixed(1) +
                        "," +
                        (TOP + PH + 7) +
                        ')"><rect width="16" height="16" rx="2"/><path d="M6 4.5l5 3.5-5 3.5z"/></g>';
                });
        }
        svg +=
            '<line class="xh" x1="0" x2="0" y1="' +
            TOP +
            '" y2="' +
            (TOP + PH) +
            '"/><circle class="hd" r="4" cx="-99" cy="-99" style="opacity:0"/>';
        svg +=
            '<rect class="cap" x="0" y="0" width="' +
            PW +
            '" height="' +
            (TOP + PH) +
            '"/></svg>';
        host.innerHTML = svg + '<div class="ctip"></div>';
        host.classList.add("chart");
        if (opt.color) host.style.setProperty("--chart", opt.color);
        else host.style.removeProperty("--chart");
        var el = host.firstChild,
            tip = host.lastChild,
            xh = $(".xh", el),
            hd = $(".hd", el);
        if (opt.anim) {
            var ln = $$(".ln", el);
            ln.forEach(function (p) {
                var len = p.getTotalLength ? p.getTotalLength() : 1000;
                p.style.strokeDasharray = len;
                p.style.strokeDashoffset = len;
                p.getBoundingClientRect();
                p.style.transition =
                    "stroke-dashoffset .9s cubic-bezier(.2,0,0,1)";
                p.style.strokeDashoffset = 0;
                setTimeout(function () {
                    p.style.strokeDasharray = "";
                }, 950);
            });
            var ar = $(".ar", el);
            if (ar) {
                ar.style.opacity = 0;
                ar.getBoundingClientRect();
                ar.style.transition = "opacity .9s";
                ar.style.opacity = 1;
            }
        }
        function at(ev) {
            var b = el.getBoundingClientRect(),
                x = ev.clientX - b.left;
            var i = n <= 1 ? 0 : Math.round(clamp(x / PW, 0, 1) * (n - 1));
            return i;
        }
        $(".cap", el).addEventListener("mousemove", function (ev) {
            var i = at(ev),
                p = pts[i];
            xh.setAttribute("x1", P[i][0]);
            xh.setAttribute("x2", P[i][0]);
            xh.style.opacity = 1;
            hd.setAttribute("cx", P[i][0]);
            hd.setAttribute("cy", P[i][1]);
            hd.style.opacity = 1;
            var t = opt.tip
                ? opt.tip(p, i)
                : '<div class="tt-d">' +
                  esc(
                      opt.gran === "month"
                          ? MONTH[dt(p.t).getUTCMonth()] +
                                " " +
                                dt(p.t).getUTCFullYear()
                          : opt.gran === "hour"
                            ? WD[dt(p.t + tzMs()).getUTCDay()] +
                              ", " +
                              dShort(p.t + tzMs()) +
                              ", " +
                              clock(p.t) +
                              " – " +
                              clock(p.t + HOUR)
                            : WD[dt(p.t).getUTCDay()] + ", " + dLong(p.t),
                  ) +
                  '</div><div class="tt-r"><span>' +
                  esc(M[mk] ? M[mk].label : "") +
                  "</span><b>" +
                  esc(M[mk] ? M[mk].fullFmt(p.v) : full(p.v)) +
                  "</b></div>";
            tip.innerHTML = t;
            tip.style.display = "block";
            var tw = tip.offsetWidth,
                left = clamp(P[i][0] - tw / 2, 0, W - tw);
            tip.style.left = left + "px";
            tip.style.top = Math.max(0, P[i][1] - tip.offsetHeight - 14) + "px";
        });
        $(".cap", el).addEventListener("mouseleave", function () {
            xh.style.opacity = 0;
            hd.style.opacity = 0;
            tip.style.display = "none";
        });
        $$(".mkr", el).forEach(function (g) {
            g.addEventListener("mouseenter", function () {
                var v = byKey[g.getAttribute("data-v")],
                    b = g.getBoundingClientRect(),
                    hb = host.getBoundingClientRect();
                tip.innerHTML =
                    '<div class="tt-v">' +
                    thumbImg(v, "tt-th") +
                    '<div><div class="tt-vt">' +
                    esc(v.title) +
                    '</div><div class="tt-d">Published ' +
                    esc(dLong(v.pub)) +
                    "</div></div></div>";
                tip.style.display = "block";
                tip.style.left =
                    clamp(
                        b.left - hb.left - tip.offsetWidth / 2 + 8,
                        0,
                        W - tip.offsetWidth,
                    ) + "px";
                tip.style.top =
                    Math.max(0, b.top - hb.top - tip.offsetHeight - 8) + "px";
            });
            g.addEventListener("mouseleave", function () {
                tip.style.display = "none";
            });
            g.addEventListener("click", function () {
                go("video/" + g.getAttribute("data-v") + "/analytics");
            });
        });
        return { el: el, X: X, Y: Y };
    }
    // Vertical bars (Realtime: 48 hourly bars or 60 minute bars).
    function barChart(host, vals, opt) {
        opt = opt || {};
        host._bc = { vals: vals, opt: opt };
        var W = Math.max(60, host.getBoundingClientRect().width || 260),
            Hh = opt.h || 56,
            n = vals.length,
            mx = Math.max.apply(null, vals.concat([1]));
        var bw = W / n,
            svg = '<svg class="bc" width="' + W + '" height="' + Hh + '">';
        for (var i = 0; i < n; i++) {
            var h = (vals[i] / mx) * (Hh - 2);
            svg +=
                '<rect data-i="' +
                i +
                '" x="' +
                (i * bw + bw * 0.14).toFixed(2) +
                '" y="' +
                (Hh - Math.max(h, vals[i] > 0 ? 1 : 0)).toFixed(2) +
                '" width="' +
                Math.max(1, bw * 0.72).toFixed(2) +
                '" height="' +
                Math.max(h, vals[i] > 0 ? 1 : 0).toFixed(2) +
                '"/>';
        }
        svg += "</svg>";
        host.innerHTML = svg + (opt.tip ? '<div class="ctip"></div>' : "");
        if (opt.tip) {
            var tip = host.lastChild;
            host.firstChild.addEventListener("mousemove", function (ev) {
                var b = host.getBoundingClientRect(),
                    i = clamp(Math.floor((ev.clientX - b.left) / bw), 0, n - 1);
                $$("rect", host).forEach(function (r, k) {
                    r.classList.toggle("on", k === i);
                });
                tip.innerHTML = opt.tip(i, vals[i]);
                tip.style.display = "block";
                tip.style.left =
                    clamp(
                        i * bw - tip.offsetWidth / 2,
                        0,
                        W - tip.offsetWidth,
                    ) + "px";
                tip.style.top = -tip.offsetHeight - 6 + "px";
            });
            host.firstChild.addEventListener("mouseleave", function () {
                tip.style.display = "none";
                $$("rect", host).forEach(function (r) {
                    r.classList.remove("on");
                });
            });
        }
    }
    // Labelled horizontal bars: [[label, pct], ...]
    function hbars(rows, opt) {
        opt = opt || {};
        var mx = Math.max.apply(
            null,
            rows
                .map(function (r) {
                    return r[1];
                })
                .concat([1]),
        );
        return (
            '<div class="hb">' +
            rows
                .map(function (r) {
                    return (
                        '<div class="hb-r"><div class="hb-l">' +
                        esc(r[0]) +
                        '</div><div class="hb-t"><i style="width:' +
                        ((r[1] / (opt.abs ? mx : 100)) * 100).toFixed(1) +
                        '%"></i></div><div class="hb-v">' +
                        esc(opt.fmt ? opt.fmt(r[1], r) : pct(r[1])) +
                        "</div></div>"
                    );
                })
                .join("") +
            "</div>"
        );
    }
    // 7 x 24 heat map (when viewers are on YouTube), shifted to the viewer's time zone.
    function heatmap(rows) {
        var today = dt(TODAY).getUTCDay();
        var html = '<div class="hm"><div class="hm-g">';
        for (var d = 0; d < 7; d++) {
            var dow = (today - 6 + d + 14) % 7;
            html +=
                '<div class="hm-r"><span class="hm-dl">' + WD[dow] + "</span>";
            for (var h = 0; h < 24; h++) {
                var x = rows[dow][h],
                    lvl =
                        x > 0.85
                            ? 4
                            : x > 0.65
                              ? 3
                              : x > 0.45
                                ? 2
                                : x > 0.3
                                  ? 1
                                  : 0;
                html +=
                    '<i class="l' +
                    lvl +
                    '" title="' +
                    WDL[dow] +
                    " " +
                    (h % 12 || 12) +
                    (h < 12 ? " AM" : " PM") +
                    '"></i>';
            }
            html += "</div>";
        }
        html +=
            '<div class="hm-x"><span></span><b>12 AM</b><b>6 AM</b><b>12 PM</b><b>6 PM</b></div></div>';
        html +=
            '<div class="hm-k"><span>Fewer viewers</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>More viewers</span></div></div>';
        return html;
    }

    /* ── Shell state ─────────────────────────────────────────── */
    var app = $("#app"),
        view = $("#view"),
        layers = $("#layers");
    var BASE = "/youtube/" + S.id;
    var MODE = S.preview
        ? "mem"
        : location.pathname.indexOf(BASE) === 0
          ? "larp"
          : "studio";
    var ST = {
        route: "dashboard",
        range: "last" + S.range,
        navMini: false,
        cleanup: [],
    };
    try {
        var rr = sessionStorage.getItem("ytd-range-" + S.id);
        if (rr) ST.range = rr;
    } catch (e) {
        /* storage off */
    }
    function setRange(k) {
        ST.range = k;
        try {
            sessionStorage.setItem("ytd-range-" + S.id, k);
        } catch (e) {
            /* storage off */
        }
    }
    function avatar(size, cls) {
        return (
            '<img class="' +
            (cls || "av") +
            '" src="' +
            esc(S.avatar) +
            '" width="' +
            size +
            '" height="' +
            size +
            '" alt="" referrerpolicy="no-referrer">'
        );
    }

    /* ── Routing ─────────────────────────────────────────────── */
    // Routes are mode independent ("analytics/audience", "video/v3/edit").
    // On LarpLabs they live under /youtube/<id>/, on the desktop companion's
    // studio.youtube.com they use Studio's own paths.
    var STUDIO_TABS = {
        overview: "tab-overview",
        content: "tab-content",
        audience: "tab-build_audience",
        revenue: "tab-earn_revenue",
        trends: "tab-trends",
    };
    var CONTENT_TABS = {
        videos: "upload",
        shorts: "short",
        live: "live",
        posts: "posts",
        playlists: "playlists",
        podcasts: "podcasts",
    };
    function urlFor(route) {
        var parts = route.split("/"),
            uc = "/channel/" + S.ucid;
        if (MODE === "larp") {
            if (route === "dashboard") return BASE;
            if (route === "content/videos") return BASE + "/content";
            if (route === "analytics/overview") return BASE + "/analytics";
            if (parts[0] === "video" && byKey[parts[1]] && byKey[parts[1]].vid)
                return (
                    BASE +
                    "/video/" +
                    byKey[parts[1]].vid +
                    "/" +
                    parts.slice(2).join("/")
                );
            return BASE + "/" + route;
        }
        switch (parts[0]) {
            case "dashboard":
                return uc;
            case "content":
                return uc + "/videos/" + (CONTENT_TABS[parts[1]] || "upload");
            case "analytics":
                return (
                    uc +
                    "/analytics/" +
                    (STUDIO_TABS[parts[1]] || "tab-overview") +
                    "/period-default"
                );
            case "advanced":
                return uc + "/analytics/tab-overview/period-default/explore";
            case "video":
                var v = byKey[parts[1]];
                return (
                    "/video/" +
                    (v ? v.vid : parts[1]) +
                    "/" +
                    ({
                        analytics: "analytics/tab-overview/period-default",
                        comments: "comments/inbox",
                        editor: "editor",
                        subtitles: "translations",
                        copyright: "copyright",
                        earn: "monetization",
                        clips: "clips",
                    }[parts[2]] || "edit")
                );
            case "comments":
                return uc + "/comments/" + (parts[1] || "inbox");
            case "subtitles":
                return uc + "/translations";
            case "copyright":
                return uc + "/copyright";
            case "earn":
                return uc + "/monetization/" + (parts[1] || "overview");
            case "customization":
                return uc + "/editing/" + (parts[1] || "profile");
            case "audio":
                return uc + "/music";
            default:
                return uc;
        }
    }
    function routeFromUrl() {
        var p = location.pathname.replace(/\/+$/, "");
        if (MODE === "larp") {
            var rest = p.slice(BASE.length).replace(/^\//, "");
            if (!rest) return "dashboard";
            if (rest === "content") return "content/videos";
            if (rest === "analytics") return "analytics/overview";
            var vm = /^video\/([^/]+)(\/.*)?$/.exec(rest);
            if (vm && byKey[vm[1]])
                return "video/" + byKey[vm[1]].key + (vm[2] || "/edit");
            return rest;
        }
        var m;
        if ((m = /\/video\/([^/]+)\/?([a-z]*)/.exec(p))) {
            var v = byKey[m[1]];
            return (
                "video/" +
                (v ? v.key : m[1]) +
                "/" +
                ({
                    analytics: "analytics",
                    comments: "comments",
                    editor: "editor",
                    translations: "subtitles",
                    copyright: "copyright",
                    monetization: "earn",
                    clips: "clips",
                }[m[2]] || "edit")
            );
        }
        if ((m = /\/videos\/([a-z]+)/.exec(p))) {
            for (var k in CONTENT_TABS)
                if (CONTENT_TABS[k] === m[1]) return "content/" + k;
            return "content/videos";
        }
        if (/\/analytics\/.*explore/.test(p)) return "advanced";
        if ((m = /\/analytics\/(tab-[a-z_]+)/.exec(p))) {
            for (var t in STUDIO_TABS)
                if (STUDIO_TABS[t] === m[1]) return "analytics/" + t;
            return "analytics/overview";
        }
        if (/\/analytics/.test(p)) return "analytics/overview";
        if ((m = /\/comments\/?([a-z]*)/.exec(p)))
            return "comments" + (m[1] && m[1] !== "inbox" ? "/" + m[1] : "");
        if (/\/translations/.test(p)) return "subtitles";
        if (/\/copyright/.test(p)) return "copyright";
        if ((m = /\/monetization\/?([a-z]*)/.exec(p)))
            return "earn" + (m[1] && m[1] !== "overview" ? "/" + m[1] : "");
        if (/\/editing/.test(p)) return "customization";
        if (/\/music/.test(p)) return "audio";
        return "dashboard";
    }
    function initialRoute() {
        var pg = app.getAttribute("data-page") || "dashboard";
        var fromServer = {
            dashboard: "dashboard",
            content: "content/videos",
            analytics: "analytics/overview",
            "analytics-content": "analytics/content",
            "analytics-audience": "analytics/audience",
            "analytics-trends": "analytics/trends",
            "analytics-revenue": "analytics/revenue",
            earn: "earn",
            comments: "comments",
            community: "comments",
        }[pg];
        if (MODE === "mem") return fromServer || "dashboard";
        var r = routeFromUrl();
        if (r === "dashboard" && fromServer && fromServer !== "dashboard")
            r = fromServer;
        return r;
    }
    function go(route, opt) {
        opt = opt || {};
        closeLayers();
        if (MODE !== "mem" && !opt.noPush) {
            var url = urlFor(route);
            if (url !== location.pathname)
                history.pushState({ r: route }, "", url);
        }
        render(route, opt);
    }
    window.addEventListener("popstate", function (e) {
        render(e.state && e.state.r ? e.state.r : routeFromUrl(), {
            back: true,
        });
    });

    /* ── Overlays ────────────────────────────────────────────── */
    var openMenus = [];
    function closeLayers() {
        openMenus.slice().forEach(function (m) {
            m.close();
        });
    }
    function place(el, anchor, opt) {
        opt = opt || {};
        var b = anchor.getBoundingClientRect(),
            w = el.offsetWidth,
            h = el.offsetHeight;
        var left =
            opt.align === "right"
                ? b.right - w
                : opt.align === "center"
                  ? b.left + b.width / 2 - w / 2
                  : b.left;
        var top = opt.above
            ? b.top - h - 4
            : b.bottom + (opt.gap != null ? opt.gap : 4);
        if (top + h > innerHeight - 8) top = Math.max(8, b.top - h - 4);
        el.style.left = clamp(left, 8, innerWidth - w - 8) + "px";
        el.style.top = clamp(top, 8, Math.max(8, innerHeight - h - 8)) + "px";
    }
    // A floating menu: items [{t, ic, sub, act, on, sep, head, dis}]
    function menuAt(anchor, items, onPick, opt) {
        opt = opt || {};
        closeLayers();
        var el = document.createElement("div");
        el.className = "menu " + (opt.cls || "");
        el.setAttribute("role", "menu");
        el.innerHTML =
            (opt.head || "") +
            items
                .map(function (it, i) {
                    if (it === "-" || it.sep)
                        return '<div class="m-sep"></div>';
                    if (it.head)
                        return '<div class="m-h">' + esc(it.head) + "</div>";
                    return (
                        '<button class="m-i' +
                        (it.on ? " on" : "") +
                        (it.dis ? " dis" : "") +
                        '" data-i="' +
                        i +
                        '" role="menuitem">' +
                        (it.check != null
                            ? '<span class="m-ck">' +
                              (it.on ? ic("check") : "") +
                              "</span>"
                            : "") +
                        (it.ic ? ic(it.ic) : "") +
                        '<span class="m-t">' +
                        esc(it.t) +
                        (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") +
                        "</span>" +
                        (it.right
                            ? '<span class="m-r">' + it.right + "</span>"
                            : "") +
                        "</button>"
                    );
                })
                .join("") +
            (opt.foot || "");
        layers.appendChild(el);
        place(el, anchor, opt);
        requestAnimationFrame(function () {
            el.classList.add("in");
        });
        var rec = {
            el: el,
            close: function () {
                el.classList.remove("in");
                el.classList.add("out");
                setTimeout(function () {
                    el.remove();
                }, 120);
                openMenus.splice(openMenus.indexOf(rec), 1);
                document.removeEventListener("mousedown", outside, true);
                anchor.classList && anchor.classList.remove("open");
            },
        };
        anchor.classList && anchor.classList.add("open");
        function outside(e) {
            if (!el.contains(e.target) && !anchor.contains(e.target))
                rec.close();
        }
        setTimeout(function () {
            document.addEventListener("mousedown", outside, true);
        }, 0);
        el.addEventListener("click", function (e) {
            var b = e.target.closest(".m-i");
            if (!b || b.classList.contains("dis")) return;
            var it = items[+b.getAttribute("data-i")];
            rec.close();
            if (onPick) onPick(it);
        });
        openMenus.push(rec);
        return rec;
    }
    function modal(html, opt) {
        opt = opt || {};
        var wrap = document.createElement("div");
        wrap.className = "scrim " + (opt.cls || "");
        wrap.innerHTML =
            '<div class="dlg" role="dialog" aria-modal="true" style="' +
            (opt.w ? "width:" + opt.w + "px;" : "") +
            '">' +
            html +
            "</div>";
        layers.appendChild(wrap);
        requestAnimationFrame(function () {
            wrap.classList.add("in");
        });
        var rec = {
            el: wrap.firstChild,
            close: function () {
                wrap.classList.remove("in");
                setTimeout(function () {
                    wrap.remove();
                }, 180);
                document.removeEventListener("keydown", key);
                if (opt.onClose) opt.onClose();
            },
        };
        function key(e) {
            if (e.key === "Escape") rec.close();
        }
        document.addEventListener("keydown", key);
        wrap.addEventListener("mousedown", function (e) {
            if (e.target === wrap && !opt.sticky) rec.close();
        });
        $$("[data-x]", wrap).forEach(function (b) {
            b.addEventListener("click", rec.close);
        });
        return rec;
    }
    var toastT = 0;
    function toast(msg, action) {
        var t = $("#toast");
        t.innerHTML =
            "<span>" +
            esc(msg) +
            "</span>" +
            (action
                ? '<button class="t-a">' + esc(action.t) + "</button>"
                : "");
        if (action)
            $(".t-a", t).addEventListener("click", function () {
                t.classList.remove("in");
                action.f();
            });
        t.classList.add("in");
        clearTimeout(toastT);
        toastT = setTimeout(function () {
            t.classList.remove("in");
        }, 4200);
    }
    function tip(el, text) {
        el.setAttribute("data-tip", text);
    }
    // Hover tooltips for icon buttons ([data-tip]).
    (function () {
        var tt = document.createElement("div");
        tt.className = "htip";
        document.body.appendChild(tt);
        var cur = null,
            timer = 0;
        document.addEventListener("mouseover", function (e) {
            var t =
                e.target.closest && e.target.closest("[data-tip],[data-tiph]");
            if (t === cur) return;
            cur = t;
            clearTimeout(timer);
            tt.classList.remove("in");
            if (!t) return;
            timer = setTimeout(function () {
                // data-tiph holds markup built from escaped values (metric hover cards).
                var rich = !t.hasAttribute("data-tip");
                tt.classList.toggle("rich", rich);
                if (rich) tt.innerHTML = t.getAttribute("data-tiph");
                else tt.textContent = t.getAttribute("data-tip");
                var b = t.getBoundingClientRect();
                tt.style.left =
                    clamp(
                        b.left + b.width / 2 - tt.offsetWidth / 2,
                        4,
                        innerWidth - tt.offsetWidth - 4,
                    ) + "px";
                tt.style.top =
                    (b.bottom + 8 + tt.offsetHeight > innerHeight
                        ? b.top - tt.offsetHeight - 8
                        : b.bottom + 8) + "px";
                tt.classList.add("in");
            }, 450);
        });
        document.addEventListener("mousedown", function () {
            clearTimeout(timer);
            tt.classList.remove("in");
        });
    })();

    /* ── Header ──────────────────────────────────────────────── */
    var unread = 3;
    function renderTop() {
        $("#top").innerHTML =
            '<button class="ib hb-menu" data-act="nav" data-tip="Menu" aria-label="Menu">' +
            ic("menu") +
            "</button>" +
            '<a class="home" href="' +
            esc(MODE === "larp" ? BASE : "/channel/" + S.ucid) +
            '" data-act="home" title="YouTube Studio dashboard">' +
            LOGO +
            "</a>" +
            '<div class="srch" id="srch"><span class="s-ic">' +
            ic("search") +
            '</span><input id="sq" placeholder="Search across your channel" autocomplete="off" spellcheck="false"><button class="s-x" data-act="sclear" aria-label="Clear">' +
            ic("close") +
            '</button><div class="s-dd" id="sdd"></div></div>' +
            '<span class="fl"></span>' +
            '<button class="ib" data-act="help" data-tip="Help" aria-label="Help">' +
            ic("help") +
            "</button>" +
            '<button class="ib bell" data-act="notifs" data-tip="Notifications" aria-label="Notifications">' +
            ic("bell") +
            (unread ? '<span class="nb">' + unread + "</span>" : "") +
            "</button>" +
            '<button class="btn outline askp" data-act="ask"><span class="ai-spark">' +
            ic("sparkle") +
            "</span><span>Ask Studio</span></button>" +
            '<button class="btn outline create" data-act="create">' +
            ic("create") +
            "<span>Create</span></button>" +
            '<button class="acct" data-act="account" aria-label="Account">' +
            avatar(32) +
            "</button>";
        bindSearch();
    }

    /* ── Left navigation ─────────────────────────────────────── */
    var NAV = [
        ["dashboard", "Dashboard", "dashboard", "dashboard-f"],
        ["content/videos", "Content", "content", "content-f"],
        ["analytics/overview", "Analytics", "analytics", "analytics-f"],
        ["comments", "Community", "community", "community"],
        ["subtitles", "Languages", "subtitles", "subtitles"],
        ["copyright", "Content detection", "copyright", "copyright"],
        ["earn", "Earn", "earn", "earn-f"],
        ["customization", "Customization", "customization", "customization"],
        ["audio", "Audio library", "audio", "audio"],
    ];
    function navKey(route) {
        var p = route.split("/")[0];
        return p === "advanced" ? "analytics" : p === "video" ? "" : p;
    }
    function renderNav() {
        var cur = navKey(ST.route);
        var item = function (n) {
            var on = navKey(n[0]) === cur;
            return (
                '<a class="ni' +
                (on ? " on" : "") +
                '" href="' +
                esc(urlFor(n[0])) +
                '" data-go="' +
                n[0] +
                '"' +
                (ST.navMini ? ' data-tip="' + n[1] + '"' : "") +
                ">" +
                ic(on ? n[3] : n[2]) +
                '<span class="nt">' +
                n[1] +
                "</span></a>"
            );
        };
        var vid =
            ST.route.indexOf("video/") === 0
                ? byKey[ST.route.split("/")[1]]
                : null;
        if (vid) {
            // Inside a video, the drawer switches to that video's pages.
            var sub = ST.route.split("/")[2] || "edit";
            $("#nav").innerHTML =
                '<div class="nv-top"><a class="nv-back" href="' +
                esc(urlFor("content/" + (vid.short ? "shorts" : "videos"))) +
                '" data-go="content/' +
                (vid.short ? "shorts" : "videos") +
                '">' +
                ic("arrow-left") +
                "<span>Channel content</span></a>" +
                '<div class="nv-vid"><a class="nv-th" href="https://www.youtube.com/watch?v=' +
                esc(vid.vid) +
                '" target="_blank" rel="noopener">' +
                thumbImg(vid, "nvt", "mqdefault.jpg") +
                '<span class="dur">' +
                mmss(vid.dur) +
                '</span></a><div class="nv-l">Video</div><div class="nv-n">' +
                esc(vid.title) +
                "</div></div></div>" +
                '<div class="nv-items">' +
                [
                    ["edit", "Details", "post"],
                    ["analytics", "Analytics", "analytics"],
                    ["editor", "Editor", "film"],
                    ["comments", "Comments", "comment"],
                    ["subtitles", "Languages", "subtitles"],
                    ["earn", "Earn", "earn"],
                    ["copyright", "Claims", "copyright"],
                    ["clips", "Clips and Shorts", "scissors"],
                ]
                    .map(function (n) {
                        var on = n[0] === sub;
                        return (
                            '<a class="ni' +
                            (on ? " on" : "") +
                            '" href="' +
                            esc(urlFor("video/" + vid.key + "/" + n[0])) +
                            '" data-go="video/' +
                            vid.key +
                            "/" +
                            n[0] +
                            '">' +
                            ic(
                                on && n[2] === "analytics"
                                    ? "analytics-f"
                                    : n[2],
                            ) +
                            '<span class="nt">' +
                            n[1] +
                            "</span></a>"
                        );
                    })
                    .join("") +
                "</div>" +
                navFoot();
            return;
        }
        $("#nav").innerHTML =
            '<div class="nv-top"><a class="nv-ch" href="https://www.youtube.com/' +
            esc(S.handle) +
            '" target="_blank" rel="noopener" data-tip="View channel on YouTube">' +
            avatar(ST.navMini ? 32 : 112, "nv-av") +
            '</a><div class="nv-yc">Your channel</div><div class="nv-cn">' +
            esc(S.name) +
            "</div></div>" +
            '<div class="nv-items">' +
            NAV.map(item).join("") +
            "</div>" +
            navFoot();
    }
    function navFoot() {
        return (
            '<div class="nv-foot"><a class="ni" href="#" data-act="settings"' +
            (ST.navMini ? ' data-tip="Settings"' : "") +
            ">" +
            ic("settings") +
            '<span class="nt">Settings</span></a><a class="ni" href="#" data-act="feedback"' +
            (ST.navMini ? ' data-tip="Send feedback"' : "") +
            ">" +
            ic("feedback") +
            '<span class="nt">Send feedback</span></a></div>'
        );
    }
    function toggleNav() {
        ST.navMini = !ST.navMini;
        app.classList.toggle("mini", ST.navMini);
        try {
            localStorage.setItem("ytd-nav-mini", ST.navMini ? "1" : "");
        } catch (e) {
            /* storage off */
        }
        renderNav();
        setTimeout(function () {
            window.dispatchEvent(new Event("resize"));
        }, 220);
    }
    try {
        ST.navMini = localStorage.getItem("ytd-nav-mini") === "1";
    } catch (e) {
        /* storage off */
    }
    if (innerWidth < 1100) ST.navMini = true;
    app.classList.toggle("mini", ST.navMini);

    /* ── Small UI pieces ─────────────────────────────────────── */
    function btn(t, attrs, kind, icon) {
        return (
            '<button class="btn ' +
            (kind || "tonal") +
            '" ' +
            (attrs || "") +
            ">" +
            (icon ? ic(icon) : "") +
            (t ? "<span>" + esc(t) + "</span>" : "") +
            "</button>"
        );
    }
    function ibtn(icon, attrs, tipText, cls) {
        return (
            '<button class="ib ' +
            (cls || "") +
            '" ' +
            (attrs || "") +
            (tipText
                ? ' data-tip="' +
                  esc(tipText) +
                  '" aria-label="' +
                  esc(tipText) +
                  '"'
                : "") +
            ">" +
            ic(icon) +
            "</button>"
        );
    }
    function pageHead(title, right, opt) {
        opt = opt || {};
        return (
            '<div class="ph' +
            (opt.cls ? " " + opt.cls : "") +
            '"><h1 class="pt">' +
            esc(title) +
            "</h1>" +
            (opt.after || "") +
            '<span class="fl"></span>' +
            (right || "") +
            "</div>"
        );
    }
    // Status next to a number: above typical, about the same, below, or no comparison yet.
    function trendIcon(dir, has) {
        if (has === false) return '<span class="ti na">—</span>';
        return dir > 0
            ? ic("up-circle", "ti up")
            : dir < 0
              ? ic("down-circle-f", "ti dn")
              : ic("check-circle-o", "ti ok");
    }
    function letterAv(c, size) {
        return (
            '<span class="lav" style="background:' +
            esc(c.c || c.color) +
            ";width:" +
            size +
            "px;height:" +
            size +
            "px;font-size:" +
            Math.round(size * 0.46) +
            'px">' +
            esc(c.i || (c.n || "U").charAt(0).toUpperCase()) +
            "</span>"
        );
    }
    function footer() {
        return '<div class="pfoot"><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Terms of use</a><a href="https://www.google.com/policies/privacy/" target="_blank" rel="noopener">Privacy policy</a><a href="https://www.youtube.com/about/policies/" target="_blank" rel="noopener">Policies &amp; Safety</a></div>';
    }
    function vlink(v, inner, sub) {
        return (
            '<a href="' +
            esc(urlFor("video/" + v.key + "/" + (sub || "analytics"))) +
            '" data-go="video/' +
            v.key +
            "/" +
            (sub || "analytics") +
            '">' +
            inner +
            "</a>"
        );
    }
    function visIcon(v) {
        return v.vis === "Public"
            ? "public"
            : v.vis === "Unlisted"
              ? "link"
              : v.vis === "Private"
                ? "private"
                : "clock";
    }
    // "First 2 days 5 hours", "First 21 hours", the label Studio uses for young uploads.
    function firstLabel(v) {
        var h = Math.max(1, Math.floor((S.now - v.pub) / HOUR));
        if (h < 24) return "First " + h + " hour" + (h === 1 ? "" : "s");
        var d = Math.floor(h / 24),
            r = h % 24;
        if (d >= 90) return "Lifetime";
        return (
            "First " +
            d +
            " day" +
            (d === 1 ? "" : "s") +
            (r ? " " + r + " hour" + (r === 1 ? "" : "s") : "")
        );
    }
    // Rank of an upload against the last ten of the same kind at the same age.
    function rankOf(v) {
        var pool = (v.short ? SHORTS : LONG)
            .filter(function (x) {
                return x.pub <= v.pub;
            })
            .slice(0, 10);
        if (pool.indexOf(v) < 0) pool = [v].concat(pool.slice(0, 9));
        var age = Math.max(1, Math.round(liveAge(v)));
        var score = function (x) {
            if (x === v) return v.views;
            var a = Math.max(PRE, x.pubIdx);
            return (
                vsum(x, a, Math.min(YDAY, a + age - 1)) +
                (x.pubIdx < PRE ? x.before : 0)
            );
        };
        var mine = score(v),
            rank = 1;
        pool.forEach(function (x) {
            if (x !== v && score(x) > mine) rank++;
        });
        return { rank: rank, of: pool.length };
    }
    function viewedPct(v) {
        return v.short
            ? clamp(48 + v.apv * 0.22 + (hash(v.key) % 9), 35, 92)
            : 0;
    }
    // Live counts: views added since midnight, from the realtime hourly split.
    function todayViews(v) {
        var hrsToday = Math.floor((S.now - TODAY) / HOUR),
            arr = v ? v.h48 : P.D.rt;
        if (!arr) return 0;
        var s = 0;
        for (var i = Math.max(0, arr.length - hrsToday); i < arr.length; i++)
            s += arr[i];
        return s;
    }

    /* ── Dashboard ───────────────────────────────────────────── */
    var CREATOR_INSIDER = [
        {
            id: "dhYIb72L1hU",
            t: "The YouTube Algorithms in 2025, Explained!",
            d: "Rene from the Creator Liaison team breaks down how recommendations work across Home, Shorts, Search and Suggested, and what that means for your uploads.",
        },
        {
            id: "F1AUZaddxCo",
            t: "This Week at YouTube: Improvements to Content Management",
            d: "New filters in the Content tab, bulk edits for Shorts, and a faster way to find videos with restrictions.",
        },
        {
            id: "md0Ud3omCdo",
            t: "New YouTube Features, Explained!",
            d: "A roundup of the newest Studio features, including Ask Studio, Inspiration and A/B title testing.",
        },
    ];
    var WHATS_NEW = [
        "Ask Studio is now available on desktop",
        "Test & compare thumbnails and titles",
        "Increasing Shorts length to three minutes",
        "Expansion of channel permissions",
        "Updates to the Inspiration tab",
    ];
    // The latest upload against the channel's typical upload at the same age.
    function typicalRows(v) {
        var ent = videoEnt(v),
            r = rangeOf("p" + Math.max(BIRTH, v.pubIdx));
        var rows = [["views", "Views", cmp(v.views)]]
            .concat(
                v.short
                    ? [
                          [
                              "viewed",
                              "Viewed (vs. swiped away)",
                              pct(viewedPct(v)),
                          ],
                      ]
                    : [["ctr", "Thumbnail click-through rate", pct(v.ctr)]],
            )
            .concat([["avd", "Average view duration", mmss(v.avd)]]);
        return rows.map(function (rw) {
            if (rw[0] === "viewed")
                return { l: rw[1], v: rw[2], icon: "", tip: "" };
            var vs = ent.vs(rw[0], r),
                has = vs.base != null && vs.base > 0,
                dir = has
                    ? vs.cur > vs.base * 1.1
                        ? 1
                        : vs.cur < vs.base * 0.9
                          ? -1
                          : 0
                    : 0;
            return {
                l: rw[1],
                v: rw[2],
                icon: trendIcon(dir, has),
                tip: has
                    ? ent.vsText(rw[0], vs)
                    : "Not enough data to compare yet",
            };
        });
    }
    function dashLatest(v) {
        if (!v) return "";
        var rk = rankOf(v),
            stats = typicalRows(v);
        return (
            '<section class="card dc lvp" data-v="' +
            v.key +
            '"><h2 class="ch">' +
            (v.short
                ? "Latest Short performance"
                : "Latest video performance") +
            "</h2>" +
            '<div class="lv-th' +
            (v.short ? " sh" : "") +
            '">' +
            vlink(
                v,
                thumbImg(v, "lv-img", "hqdefault.jpg") +
                    '<span class="lv-sh"></span><span class="lv-t">' +
                    esc(v.title) +
                    "</span>",
            ) +
            "</div>" +
            '<div class="lv-m"><span data-tip="Views">' +
            ic("bars") +
            cmp(v.views) +
            '</span><span data-tip="Comments">' +
            ic("comment") +
            cmp(v.comments) +
            '</span><span data-tip="Likes">' +
            ic("like") +
            cmp(v.likes) +
            '</span><span class="fl"></span>' +
            ibtn("chev-up", 'data-act="collapse"', "", "sm lv-tg") +
            "</div>" +
            '<div class="lv-body"><div class="lv-l">' +
            esc(firstLabel(v)) +
            "</div>" +
            '<div class="kv"><span>Ranking by views</span><a class="kv-r" href="#" data-act="rankinfo" data-v="' +
            v.key +
            '">' +
            rk.rank +
            " of " +
            rk.of +
            ic("chev-right") +
            "</a></div>" +
            stats
                .map(function (s) {
                    return (
                        '<div class="kv"><span>' +
                        s.l +
                        '</span><span class="kv-v">' +
                        s.v +
                        (s.icon
                            ? '<span data-tip="' +
                              esc(s.tip) +
                              '">' +
                              s.icon +
                              "</span>"
                            : "") +
                        "</span></div>"
                    );
                })
                .join("") +
            "</div>" +
            (S.ai
                ? '<div class="cmu">' +
                  btn(
                      "Catch me up on this video",
                      'data-ask="Catch me up on this video" data-askv="' +
                          v.key +
                          '"',
                      "tonal cmu-p",
                      "sparkle",
                  ) +
                  '<span class="cmu-r"><a class="rbtn" href="' +
                  esc(urlFor("video/" + v.key + "/analytics")) +
                  '" data-go="video/' +
                  v.key +
                  '/analytics" data-tip="Video analytics" aria-label="Video analytics">' +
                  ic("bars") +
                  '</a><a class="rbtn" href="' +
                  esc(urlFor("video/" + v.key + "/comments")) +
                  '" data-go="video/' +
                  v.key +
                  '/comments" data-tip="Comments" aria-label="Comments">' +
                  ic("comment") +
                  "</a></span></div></section>"
                : '<div class="cbtns">' +
                  btn(
                      "Go to video analytics",
                      'data-go="video/' + v.key + '/analytics"',
                  ) +
                  btn(
                      "See comments (" + full(v.comments) + ")",
                      'data-go="video/' + v.key + '/comments"',
                  ) +
                  "</div></section>")
        );
    }
    function dashAnalytics() {
        var r = rangeOf("last28"),
            net = M.subs.sum(r.a, r.b);
        var rows = [
            ["views", "Views"],
            ["watch", "Watch time (hours)"],
        ];
        if (S.monetized) rows.push(["rev", "Estimated revenue"]);
        var top = V.map(function (v) {
            return {
                v: v,
                n: v.h48
                    ? v.h48.reduce(function (a, b) {
                          return a + b;
                      }, 0)
                    : 0,
            };
        })
            .filter(function (x) {
                return x.n >= 1;
            })
            .sort(function (a, b) {
                return b.n - a.n;
            })
            .slice(0, 3);
        return (
            '<section class="card dc"><h2 class="ch">Channel analytics</h2>' +
            '<div class="ca-l">Current subscribers</div><div class="ca-big" id="live-subs">' +
            full(S.subs) +
            "</div>" +
            '<div class="ca-s"><span class="' +
            (net >= 0 ? "pos" : "neg") +
            '">' +
            signed(cmp(net), net) +
            "</span> in last 28 days</div><hr>" +
            '<div class="sec-t">Summary</div><div class="sec-s">Last 28 days</div>' +
            rows
                .map(function (rw) {
                    var vs = versus(rw[0], r),
                        has = vs.base != null;
                    return (
                        '<div class="kv"><span>' +
                        rw[1] +
                        '</span><span class="kv-v">' +
                        M[rw[0]].fmt(vs.cur) +
                        '<span data-tip="' +
                        esc(
                            has
                                ? versusText(rw[0], vs)
                                : "Not enough data to compare yet",
                        ) +
                        '">' +
                        trendIcon(trendDir(rw[0], vs), has) +
                        "</span></span></div>"
                    );
                })
                .join("") +
            "<hr>" +
            '<div class="sec-t">Top content</div><div class="sec-s">Last 48 hours · Views</div>' +
            (top.length
                ? top
                      .map(function (x) {
                          return (
                              '<div class="kv tc">' +
                              vlink(x.v, esc(x.v.title)) +
                              "<span>" +
                              full(x.n) +
                              "</span></div>"
                          );
                      })
                      .join("")
                : '<div class="muted sm">No views in the last 48 hours</div>') +
            '<div class="cbtns">' +
            btn("Go to channel analytics", 'data-go="analytics/overview"') +
            "</div></section>"
        );
    }
    function dashComments() {
        var cs = P.C.slice(0, 3);
        if (!cs.length)
            return '<section class="card dc"><h2 class="ch">Latest comments</h2><p class="muted">Respond to comments from your viewers. Comments on your videos will show up here.</p></section>';
        return (
            '<section class="card dc"><h2 class="ch">Latest comments</h2><div class="sec-s">Channel comments I haven’t responded to</div>' +
            cs
                .map(function (c, i) {
                    var v = byKey[c.v];
                    return (
                        (i ? "<hr>" : "") +
                        '<div class="dcm">' +
                        letterAv(c, 24) +
                        '<div class="dcm-b"><div class="dcm-m"><span class="dcm-a">' +
                        esc(c.a) +
                        "</span> • " +
                        esc(ago(S.now - c.d * DAY - (hash(c.a) % 20) * HOUR)) +
                        '</div><div class="dcm-t">' +
                        esc(c.t) +
                        "</div></div>" +
                        (v ? vlink(v, thumbImg(v, "dcm-th"), "comments") : "") +
                        "</div>"
                    );
                })
                .join("") +
            '<div class="cbtns">' +
            btn("View more", 'data-go="comments"') +
            "</div></section>"
        );
    }
    function dashSubs() {
        return (
            '<section class="card dc"><h2 class="ch">Recent subscribers</h2><div class="sec-s">Last 90 days</div>' +
            P.SUBS.slice(0, 3)
                .map(function (s) {
                    return (
                        '<div class="rs">' +
                        letterAv({ c: s.c, n: s.n }, 40) +
                        '<div><div class="rs-n">' +
                        esc(s.n) +
                        '</div><div class="rs-s">' +
                        esc(cmp(s.s)) +
                        " subscriber" +
                        (s.s === 1 ? "" : "s") +
                        "</div></div></div>"
                    );
                })
                .join("") +
            '<div class="cbtns">' +
            btn("See all", 'data-act="allsubs"') +
            "</div></section>"
        );
    }
    function dashInsider(i) {
        var c = CREATOR_INSIDER[i % CREATOR_INSIDER.length];
        return (
            '<section class="card dc ci" data-i="' +
            i +
            '"><div class="ci-h"><h2 class="ch">Creator Insider</h2><span class="fl"></span>' +
            ibtn("chev-left", 'data-act="ci-prev"', "Previous", "sm") +
            '<span class="ci-n">' +
            ((i % CREATOR_INSIDER.length) + 1) +
            " / " +
            CREATOR_INSIDER.length +
            "</span>" +
            ibtn("chev-right", 'data-act="ci-next"', "Next", "sm") +
            "</div>" +
            '<a class="ci-th" href="https://www.youtube.com/watch?v=' +
            c.id +
            '" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/' +
            c.id +
            '/hqdefault.jpg" alt="" referrerpolicy="no-referrer"></a>' +
            '<h3 class="ci-t">' +
            esc(c.t) +
            '</h3><p class="ci-d">' +
            esc(c.d) +
            '</p><div class="cbtns"><a class="btn tonal" href="https://www.youtube.com/watch?v=' +
            c.id +
            '" target="_blank" rel="noopener"><span>Watch on YouTube</span></a></div></section>'
        );
    }
    function dashNews() {
        return (
            '<section class="card dc"><h2 class="ch">What’s new in Studio</h2>' +
            WHATS_NEW.map(function (t, i) {
                return (
                    (i ? "<hr>" : "") +
                    '<a class="wn" href="#" data-act="whatsnew" data-t="' +
                    esc(t) +
                    '">' +
                    esc(t) +
                    "</a>"
                );
            }).join("") +
            "</section>"
        );
    }
    function dashIdeas() {
        var ideas = ideasFor(3);
        return (
            '<section class="card dc ideas"><h2 class="ch">Ideas for you</h2><div class="sec-s">Based on what your audience is watching</div>' +
            ideas
                .map(function (t, i) {
                    return (
                        (i ? "<hr>" : "") +
                        '<div class="idea">' +
                        ic("bulb") +
                        "<span>" +
                        esc(t) +
                        "</span></div>"
                    );
                })
                .join("") +
            '<div class="cbtns">' +
            btn(
                "Get more ideas",
                'data-ask="Give me video ideas for my channel"',
                "tonal",
                "sparkle",
            ) +
            "</div></section>"
        );
    }
    function dashPost() {
        return (
            '<section class="card dc post"><h2 class="ch">Latest post</h2><div class="pst-e">' +
            ic("post", "pst-ic") +
            '<p class="muted">Create your first post to start a conversation and get feedback from your community.</p>' +
            btn("Create post", 'data-act="newpost"', "filled") +
            "</div></section>"
        );
    }
    function dashboard() {
        var latest = V.filter(function (v) {
            return v.vis === "Public";
        });
        var lv = latest.filter(function (v) {
                return !v.short;
            })[0],
            ls = latest.filter(function (v) {
                return v.short;
            })[0];
        var first = latest[0];
        var cols = [
            [
                dashLatest(first),
                first && first.short
                    ? lv
                        ? dashLatest(lv)
                        : ""
                    : ls && liveAge(ls) < 60
                      ? dashLatest(ls)
                      : "",
                dashPost(),
            ],
            [dashAnalytics(), dashComments(), dashSubs()],
            [dashInsider(0), dashIdeas(), dashNews()],
        ];
        view.innerHTML =
            '<div class="pg dash">' +
            pageHead(
                "Channel dashboard",
                ibtn("upload", 'data-act="upload"', "Upload videos", "oc") +
                    ibtn("live", 'data-act="golive"', "Go live", "oc") +
                    ibtn("post", 'data-act="newpost"', "Create post", "oc"),
            ) +
            '<div class="mason" id="mason">' +
            cols
                .map(function (c) {
                    return '<div class="mcol">' + c.join("") + "</div>";
                })
                .join("") +
            "</div>" +
            footer() +
            "</div>";
        layoutMason();
        // live subscriber counter on the dashboard card
        liveSubs($("#live-subs"));
    }
    // Two columns on narrower screens, three on wide ones (Studio's masonry).
    function layoutMason() {
        var m = $("#mason");
        if (!m) return;
        var cols = $$(".mcol", m),
            w = m.clientWidth,
            n = w >= 940 ? 3 : w >= 640 ? 2 : 1;
        if (!m._cards)
            m._cards = cols.map(function (c) {
                return $$(".card", c);
            });
        var all = m._cards;
        cols.forEach(function (c) {
            c.innerHTML = "";
            c.style.display = "none";
        });
        if (n === 3)
            all.forEach(function (cs, i) {
                cs.forEach(function (x) {
                    cols[i].appendChild(x);
                });
                cols[i].style.display = "";
            });
        else if (n === 2) {
            all[0].concat(all[2]).forEach(function (x) {
                cols[0].appendChild(x);
            });
            all[1].forEach(function (x) {
                cols[1].appendChild(x);
            });
            cols[0].style.display = cols[1].style.display = "";
        } else {
            all[0].concat(all[1], all[2]).forEach(function (x) {
                cols[0].appendChild(x);
            });
            cols[0].style.display = "";
        }
    }
    // Subscriber count ticks up now and then, like Studio's live count.
    function liveSubs(el) {
        if (!el) return;
        var r = rng(S.id + ":live"),
            net = M.subs.sum(L - 28, YDAY) / 28 / 24 / 3600;
        var base = S.subs,
            start = Date.now();
        var t = setInterval(function () {
            if (!document.body.contains(el)) return clearInterval(t);
            var add = Math.floor(
                (net * (Date.now() - start)) / 1000 + r() * 0.3,
            );
            if (add > 0) el.textContent = full(base + add);
        }, 4000);
    }
    function ideasFor(n) {
        var top = topIn(rangeOf("last90"), "video")
            .slice(0, 3)
            .map(function (x) {
                return x.v.title;
            });
        var niche = (S.niche || "").toLowerCase();
        var bank = {
            gaming: [
                "I tried the hardest challenge in the new update",
                "Ranking every season from worst to best",
                "What 100 hours in the new map taught me",
            ],
            tech: [
                "The one setting everyone should change on their new phone",
                "I used the cheapest laptop for 30 days",
                "Things I wish I knew before buying",
            ],
            vlog: [
                "A realistic week in my life",
                "Answering your most asked questions",
                "What I spend in a week, honestly",
            ],
            music: [
                "Breaking down how I wrote my most played song",
                "Covering your song requests live",
                "Behind the scenes of making the beat",
            ],
            fitness: [
                "The 20 minute workout I actually stick to",
                "What I eat in a day to stay consistent",
                "Fixing the 5 most common form mistakes",
            ],
            education: [
                "The simplest explanation you'll ever hear",
                "Why everything you learned about this is wrong",
                "Explained in 10 minutes",
            ],
            food: [
                "3 dinners under $10 that taste expensive",
                "I tested viral recipes so you don't have to",
                "My go-to weeknight meal, start to finish",
            ],
            entertainment: [
                "Reacting to my first ever video",
                "We said yes to everything for 24 hours",
                "Ranking your wildest stories",
            ],
            finance: [
                "How I'd invest my first $1,000 in 2026",
                "The budget that finally worked for me",
                "Mistakes that cost me thousands",
            ],
            comedy: [
                "POV: your group chat at 3 AM",
                "Every type of person at the gym",
                "If my life had a laugh track",
            ],
            automation: [
                "I automated my whole week with AI agents",
                "This workflow saves me 10 hours a week",
                "Building a full app with no code in one day",
            ],
        }[niche] || [
            "Answering your most asked questions",
            "Behind the scenes of how I make videos",
            "My biggest lessons from this year",
        ];
        var out = bank.slice(0, n);
        if (top[0])
            out[0] =
                "A follow-up to “" +
                top[0].replace(/\s+#.*$/, "").slice(0, 60) +
                "”";
        return out;
    }

    /* ── Content ─────────────────────────────────────────────── */
    var CT = {
        sort: "date",
        dir: -1,
        page: 0,
        per: 30,
        q: "",
        filters: [],
        sel: {},
    };
    function tabsBar(items, cur, attr) {
        return (
            '<div class="tabs" role="tablist">' +
            items
                .map(function (t) {
                    return (
                        '<button class="tab' +
                        (t[0] === cur ? " on" : "") +
                        '" ' +
                        attr +
                        '="' +
                        t[0] +
                        '" role="tab">' +
                        esc(t[1]) +
                        "</button>"
                    );
                })
                .join("") +
            '<span class="tab-ink"></span></div>'
        );
    }
    function placeInk(bar) {
        var on = $(".tab.on", bar),
            ink = $(".tab-ink", bar);
        if (!on || !ink) return;
        ink.style.width = on.offsetWidth + "px";
        ink.style.transform = "translateX(" + on.offsetLeft + "px)";
    }
    function likePct(v) {
        return v.likes + v.dislikes
            ? (v.likes / (v.likes + v.dislikes)) * 100
            : 0;
    }
    function contentRows(kind) {
        var list = V.filter(function (v) {
            return kind === "shorts" ? v.short : !v.short;
        });
        if (CT.q) {
            var q = CT.q.toLowerCase();
            list = list.filter(function (v) {
                return (
                    v.title.toLowerCase().indexOf(q) >= 0 ||
                    (v.desc || "").toLowerCase().indexOf(q) >= 0
                );
            });
        }
        CT.filters.forEach(function (f) {
            if (f.k === "vis")
                list = list.filter(function (v) {
                    return v.vis === f.v;
                });
            if (f.k === "restr")
                list = list.filter(function (v) {
                    return f.v === "Copyright"
                        ? /Copyright/.test(v.restr)
                        : f.v === "Age restriction"
                          ? /Age/.test(v.restr)
                          : v.restr !== "None";
                });
            if (f.k === "views")
                list = list.filter(function (v) {
                    return v.views >= f.v;
                });
        });
        var key = {
            date: function (v) {
                return v.pub;
            },
            views: function (v) {
                return v.views;
            },
            comments: function (v) {
                return v.comments;
            },
            likes: function (v) {
                return likePct(v);
            },
            rev: function (v) {
                return estRev(v);
            },
        }[CT.sort];
        return list.slice().sort(function (a, b) {
            return (key(a) - key(b)) * CT.dir;
        });
    }
    function contentPage(tab) {
        tab = tab || "videos";
        var TABS = [
            ["inspiration", "Inspiration"],
            ["videos", "Videos"],
            ["shorts", "Shorts"],
            ["live", "Live"],
            ["posts", "Posts"],
            ["playlists", "Playlists"],
            ["podcasts", "Podcasts"],
        ];
        var body = "";
        if (tab === "videos" || tab === "shorts") body = contentTable(tab);
        else if (tab === "inspiration") body = inspirationTab();
        else if (tab === "live")
            body = emptyState(
                "live",
                "Live streams you create will show up here",
                "Go live",
                "golive",
            );
        else if (tab === "posts") body = postsTab();
        else if (tab === "playlists") body = playlistsTab();
        else
            body = emptyState(
                "podcast",
                "Create a podcast to group your episodes and help listeners find them",
                "New podcast",
                "newpodcast",
            );
        view.innerHTML =
            '<div class="pg content">' +
            pageHead("Channel content") +
            '<div class="ct-tabs">' +
            tabsBar(TABS, tab, "data-ctab") +
            "</div>" +
            body +
            "</div>";
        placeInk($(".ct-tabs"));
        if (tab === "videos" || tab === "shorts") bindContent(tab);
    }
    function emptyState(icon, text, cta, act) {
        return (
            '<div class="empty">' +
            '<div class="em-art">' +
            ic(icon) +
            "</div><p>" +
            esc(text) +
            "</p>" +
            (cta ? btn(cta, 'data-act="' + act + '"', "filled") : "") +
            "</div>"
        );
    }
    function filterBar() {
        return (
            '<div class="fbar">' +
            ic("filter", "fb-ic") +
            CT.filters
                .map(function (f, i) {
                    return (
                        '<span class="fchip">' +
                        esc(f.label) +
                        '<button data-act="rmfilter" data-i="' +
                        i +
                        '" aria-label="Remove">' +
                        ic("close") +
                        "</button></span>"
                    );
                })
                .join("") +
            '<input id="cfq" placeholder="Filter" value="' +
            esc(CT.q) +
            '" autocomplete="off"><span class="fl"></span></div>'
        );
    }
    // Lifetime estimated revenue for one upload (Content > Est. revenue).
    function estRev(v) {
        return v.views * vrate(v, "rv");
    }
    // Notices: a coloured dot for limits on a video, a dash when there are none.
    function noticeOf(v) {
        if (v.restr === "Copyright claim")
            return (
                '<span class="ntc y" data-tip="Copyright claim: the copyright owner is sharing revenue from this video">' +
                ic("notice") +
                "<span>Copyright</span></span>"
            );
        if (v.restr && v.restr !== "None")
            return (
                '<span class="ntc y" data-tip="Age-restricted: some viewers can’t watch this video and it isn’t shown in some places">' +
                ic("notice") +
                "<span>Age restriction</span></span>"
            );
        return '<span class="muted">—</span>';
    }
    function contentTable(kind) {
        var rows = contentRows(kind),
            total = rows.length,
            all =
                kind === "shorts"
                    ? Math.max(
                          SHORTS.length,
                          Math.round(
                              S.totalVideos *
                                  (SHORTS.length / Math.max(1, V.length)),
                          ),
                      )
                    : Math.max(
                          LONG.length,
                          S.totalVideos -
                              Math.round(
                                  S.totalVideos *
                                      (SHORTS.length / Math.max(1, V.length)),
                              ),
                      );
        var start = CT.page * CT.per,
            page = rows.slice(start, start + CT.per);
        var nsel = Object.keys(CT.sel).filter(function (k) {
            return CT.sel[k];
        }).length;
        var head = function (k, t, cls) {
            return (
                '<div class="th ' +
                (cls || "") +
                (CT.sort === k ? " sorted" : "") +
                '"' +
                (k ? ' data-sort="' + k + '"' : "") +
                ">" +
                (k && CT.sort === k
                    ? ic("arrow-down", CT.dir > 0 ? "up" : "")
                    : "") +
                "<span>" +
                t +
                "</span></div>"
            );
        };
        var html =
            (nsel
                ? '<div class="bulk"><span>' +
                  nsel +
                  ' selected</span><button class="bk" data-act="bulkedit">Edit ' +
                  ic("caret") +
                  '</button><button class="bk" data-act="bulkpl">Add to playlist</button><button class="bk" data-act="bulkmore">More actions ' +
                  ic("caret") +
                  '</button><span class="fl"></span>' +
                  ibtn("close", 'data-act="bulkclear"', "Deselect") +
                  "</div>"
                : filterBar()) +
            '<div class="vt' +
            (kind === "shorts" ? " shorts" : "") +
            (S.monetized ? " money" : "") +
            '"><div class="tr thead"><div class="th cb"><span class="ck' +
            (nsel && nsel === page.length ? " on" : "") +
            '" data-act="selall"></span></div>' +
            head("", kind === "shorts" ? "Short" : "Video", "c-v") +
            head("", "Notices", "c-no") +
            head("", "Visibility", "c-vis") +
            head("date", "Date", "c-d") +
            head("views", "Views", "c-n") +
            (S.monetized ? head("rev", "Est. revenue", "c-n") : "") +
            head("comments", "Comments", "c-n") +
            "</div>";
        if (!page.length)
            html +=
                '<div class="vt-empty">' +
                (CT.q || CT.filters.length
                    ? "No content matches your filters"
                    : "No content available") +
                "</div>";
        page.forEach(function (v) {
            var lp = likePct(v);
            html +=
                '<div class="tr row' +
                (CT.sel[v.key] ? " sel" : "") +
                '" data-v="' +
                v.key +
                '"><div class="td cb"><span class="ck' +
                (CT.sel[v.key] ? " on" : "") +
                '" data-act="sel"></span></div>' +
                '<div class="td c-v"><a class="vt-th" href="' +
                esc(urlFor("video/" + v.key + "/edit")) +
                '" data-go="video/' +
                v.key +
                '/edit">' +
                thumbImg(v, "vthumb") +
                '<span class="dur">' +
                mmss(v.dur) +
                "</span></a>" +
                '<div class="vt-x"><a class="vt-t" href="' +
                esc(urlFor("video/" + v.key + "/edit")) +
                '" data-go="video/' +
                v.key +
                '/edit">' +
                esc(v.title) +
                '</a><div class="vt-d">' +
                esc(v.desc || "Add description") +
                "</div>" +
                '<div class="vt-a">' +
                ibtn("post", 'data-go="video/' + v.key + '/edit"', "Details") +
                ibtn(
                    "analytics",
                    'data-go="video/' + v.key + '/analytics"',
                    "Analytics",
                ) +
                ibtn(
                    "comment",
                    'data-go="video/' + v.key + '/comments"',
                    "Comments",
                ) +
                (S.monetized
                    ? ibtn("earn", 'data-go="video/' + v.key + '/earn"', "Earn")
                    : "") +
                '<a class="ib" href="https://www.youtube.com/' +
                (v.short ? "shorts/" : "watch?v=") +
                esc(v.vid) +
                '" target="_blank" rel="noopener" data-tip="View on YouTube">' +
                ic("yt") +
                "</a>" +
                ibtn("more", 'data-act="vmenu"', "Options") +
                "</div></div></div>" +
                '<div class="td c-no">' +
                noticeOf(v) +
                "</div>" +
                '<div class="td c-vis"><button class="visb" data-act="vis">' +
                ic(visIcon(v)) +
                "<span>" +
                v.vis +
                "</span>" +
                ic("caret", "dd") +
                "</button></div>" +
                '<div class="td c-d"><div>' +
                esc(dLong(v.pub)) +
                '</div><div class="muted">' +
                (v.vis === "Scheduled" ? "Scheduled" : "Published") +
                "</div></div>" +
                '<div class="td c-n">' +
                full(v.views) +
                "</div>" +
                (S.monetized
                    ? '<div class="td c-n">' +
                      (S.now - v.pub < 2 * DAY
                          ? '<span class="pend" data-tip="Estimated revenue for this video is still being calculated">' +
                            ic("clock") +
                            "</span>"
                          : money(estRev(v), { cents: true })) +
                      "</div>"
                    : "") +
                '<div class="td c-n">' +
                full(v.comments) +
                "</div></div>";
            void lp;
        });
        var last = Math.min(total, start + CT.per),
            totalLabel =
                CT.q || CT.filters.length
                    ? String(total)
                    : "about " + full(all);
        html +=
            '</div><div class="pager"><span>Rows per page:</span><button class="per" data-act="per">' +
            CT.per +
            ic("caret") +
            "</button><span>" +
            (total ? start + 1 : 0) +
            "–" +
            last +
            " of " +
            totalLabel +
            "</span>" +
            ibtn(
                "first",
                'data-act="pg" data-p="first"' + (CT.page ? "" : " disabled"),
                "First page",
            ) +
            ibtn(
                "chev-left",
                'data-act="pg" data-p="prev"' + (CT.page ? "" : " disabled"),
                "Previous page",
            ) +
            ibtn(
                "chev-right",
                'data-act="pg" data-p="next"' +
                    (last < total ? "" : " disabled"),
                "Next page",
            ) +
            ibtn(
                "last",
                'data-act="pg" data-p="last"' +
                    (last < total ? "" : " disabled"),
                "Last page",
            ) +
            "</div>";
        return '<div class="ctable">' + html + "</div>";
    }
    function bindContent(kind) {
        var q = $("#cfq");
        if (q) {
            q.addEventListener("input", function () {
                CT.q = q.value;
                CT.page = 0;
                var pos = q.selectionStart;
                rerenderTable(kind);
                var q2 = $("#cfq");
                if (q2) {
                    q2.focus();
                    q2.setSelectionRange(pos, pos);
                }
            });
            q.addEventListener("focus", function () {
                if (q.value) return;
                menuAt(
                    q,
                    [
                        { t: "Title" },
                        { t: "Description" },
                        { t: "Visibility" },
                        { t: "Restrictions" },
                        { t: "Views" },
                    ],
                    function (it) {
                        if (it.t === "Visibility")
                            return menuAt(
                                $(".fbar"),
                                ["Public", "Unlisted", "Private"].map(
                                    function (x) {
                                        return { t: x };
                                    },
                                ),
                                function (o) {
                                    CT.filters.push({
                                        k: "vis",
                                        v: o.t,
                                        label: "Visibility: " + o.t,
                                    });
                                    CT.page = 0;
                                    rerenderTable(kind);
                                },
                            );
                        if (it.t === "Restrictions")
                            return menuAt(
                                $(".fbar"),
                                [{ t: "Copyright" }, { t: "Age restriction" }],
                                function (o) {
                                    CT.filters.push({
                                        k: "restr",
                                        v: o.t,
                                        label: "Restrictions: " + o.t,
                                    });
                                    CT.page = 0;
                                    rerenderTable(kind);
                                },
                            );
                        if (it.t === "Views")
                            return menuAt(
                                $(".fbar"),
                                [1000, 10000, 100000, 1000000].map(
                                    function (x) {
                                        return {
                                            t: "Views ≥ " + full(x),
                                            n: x,
                                        };
                                    },
                                ),
                                function (o) {
                                    CT.filters.push({
                                        k: "views",
                                        v: o.n,
                                        label: o.t,
                                    });
                                    CT.page = 0;
                                    rerenderTable(kind);
                                },
                            );
                        q.focus();
                    },
                    { cls: "fmenu" },
                );
            });
        }
    }
    function rerenderTable(kind) {
        var host = $(".ctable");
        if (!host) return;
        var tmp = document.createElement("div");
        tmp.innerHTML = contentTable(kind);
        host.replaceWith(tmp.firstChild);
        bindContent(kind);
    }
    function videoMenu(anchor, v) {
        menuAt(
            anchor,
            [
                { t: "Edit title and description", ic: "pencil" },
                { t: "Get shareable link", ic: "share" },
                { t: "Promote", ic: "trend" },
                { t: "Download", ic: "download" },
                "-",
                { t: "Delete forever", ic: "trash" },
            ],
            function (it) {
                if (it.t === "Edit title and description")
                    return go("video/" + v.key + "/edit");
                if (it.t === "Get shareable link") {
                    copyText("https://youtu.be/" + v.vid);
                    return toast("Link copied to clipboard");
                }
                if (it.t === "Download")
                    return toast("Your download will start shortly");
                if (it.t === "Promote")
                    return toast("Promotions are not available for this video");
                if (it.t === "Delete forever") confirmDelete(v);
            },
        );
    }
    function confirmDelete(v) {
        var d = modal(
            '<div class="dlg-h"><h2>Permanently delete this video?</h2></div><div class="dlg-b"><div class="del-v">' +
                thumbImg(v, "del-th") +
                '<div><div class="del-t">' +
                esc(v.title) +
                '</div><div class="muted">Uploaded ' +
                esc(dLong(v.pub)) +
                "<br>" +
                full(v.views) +
                " views · " +
                full(v.comments) +
                ' comments</div></div></div><label class="cbx"><span class="ck" data-act="delok"></span>I understand that deleting is permanent and can\'t be undone</label></div><div class="dlg-f">' +
                btn("Cancel", "data-x", "text") +
                btn(
                    "Delete forever",
                    'data-act="dodelete" disabled',
                    "text danger",
                ) +
                "</div>",
            { w: 560 },
        );
        $(".ck", d.el).addEventListener("click", function () {
            this.classList.toggle("on");
            $("[data-act=dodelete]", d.el).disabled =
                !this.classList.contains("on");
        });
        $("[data-act=dodelete]", d.el).addEventListener("click", function () {
            d.close();
            var i = V.indexOf(v);
            if (i >= 0) V.splice(i, 1);
            LONG = V.filter(function (x) {
                return !x.short;
            });
            SHORTS = V.filter(function (x) {
                return x.short;
            });
            render(ST.route);
            toast("Video deleted");
        });
    }
    function visMenu(anchor, v) {
        var d = modal(
            '<div class="dlg-h"><h2>Visibility</h2></div><div class="dlg-b vis-d">' +
                [
                    ["Public", "Everyone can watch your video"],
                    [
                        "Unlisted",
                        "Anyone with the video link can watch your video",
                    ],
                    [
                        "Private",
                        "Only you and people you choose can watch your video",
                    ],
                ]
                    .map(function (o) {
                        return (
                            '<label class="rad"><span class="rb' +
                            (v.vis === o[0] ? " on" : "") +
                            '" data-v="' +
                            o[0] +
                            '"></span><span><b>' +
                            o[0] +
                            "</b><small>" +
                            o[1] +
                            "</small></span></label>"
                        );
                    })
                    .join("") +
                '</div><div class="dlg-f">' +
                btn("Cancel", "data-x", "text") +
                btn("Save", 'data-act="savevis"', "filled") +
                "</div>",
            { w: 420, cls: "small" },
        );
        $$(".rb", d.el).forEach(function (r) {
            r.parentNode.addEventListener("click", function () {
                $$(".rb", d.el).forEach(function (x) {
                    x.classList.remove("on");
                });
                r.classList.add("on");
            });
        });
        $("[data-act=savevis]", d.el).addEventListener("click", function () {
            v.vis = $(".rb.on", d.el).getAttribute("data-v");
            d.close();
            render(ST.route);
            toast("Changes saved");
        });
    }
    function copyText(t) {
        try {
            navigator.clipboard.writeText(t);
        } catch (e) {
            /* clipboard blocked */
        }
    }

    /* Content sub-tabs that have no uploads in the model */
    function postsTab() {
        var posts = ST.posts || [];
        return (
            '<div class="posts"><div class="composer card">' +
            avatar(40) +
            '<div class="cmp-b"><div class="cmp-n">' +
            esc(S.name) +
            '</div><textarea id="postq" placeholder="Share a sneak peek, ask a question or start a conversation" rows="2"></textarea><div class="cmp-f">' +
            ibtn("image", 'data-act="noop"', "Image") +
            ibtn("playlist", 'data-act="noop"', "Poll") +
            ibtn("bulb", 'data-act="noop"', "Quiz") +
            ibtn("film", 'data-act="noop"', "Video") +
            '<span class="fl"></span>' +
            btn("Post", 'data-act="post"', "filled") +
            "</div></div></div>" +
            (posts.length
                ? posts.map(postCard).join("")
                : '<div class="empty sm"><p class="muted">Posts you share will appear here and on your channel’s Posts tab.</p></div>') +
            "</div>"
        );
    }
    function postCard(p) {
        return (
            '<div class="card pcard">' +
            avatar(40) +
            '<div><div class="cmp-n">' +
            esc(S.name) +
            ' <span class="muted">' +
            esc(ago(p.t)) +
            '</span></div><div class="pc-t">' +
            esc(p.text) +
            '</div><div class="pc-a">' +
            ic("like") +
            "<span>" +
            full(p.likes) +
            "</span>" +
            ic("comment") +
            "<span>" +
            full(p.comments) +
            "</span></div></div></div>"
        );
    }
    function playlistsTab() {
        var lists = [
            {
                t: "Best of " + dt(TODAY).getUTCFullYear(),
                n: Math.min(LONG.length, 12),
                v: LONG[0],
            },
            { t: "Shorts", n: SHORTS.length, v: SHORTS[0] },
            {
                t: "Most popular",
                n: Math.min(LONG.length, 25),
                v:
                    topIn(rangeOf("life"), "video")[0] &&
                    topIn(rangeOf("life"), "video")[0].v,
            },
        ].filter(function (l) {
            return l.n && l.v;
        });
        if (!lists.length)
            return emptyState(
                "playlist",
                "Organize your videos into playlists so viewers keep watching",
                "New playlist",
                "newplaylist",
            );
        return (
            '<div class="vt pl"><div class="tr thead"><div class="th c-v">Playlist</div><div class="th c-vis">Type</div><div class="th c-vis">Visibility</div><div class="th c-d">Last updated</div><div class="th c-n">Video count</div></div>' +
            lists
                .map(function (l) {
                    return (
                        '<div class="tr row"><div class="td c-v"><span class="vt-th pl-th">' +
                        thumbImg(l.v, "vthumb") +
                        '<span class="pl-c">' +
                        ic("playlist") +
                        l.n +
                        '</span></span><div class="vt-x"><span class="vt-t">' +
                        esc(l.t) +
                        '</span><div class="vt-d">Add description</div></div></div><div class="td c-vis">Playlist</div><div class="td c-vis"><span class="visb">' +
                        ic("public") +
                        '<span>Public</span></span></div><div class="td c-d">' +
                        esc(dLong(l.v.pub)) +
                        '</div><div class="td c-n">' +
                        l.n +
                        "</div></div>"
                    );
                })
                .join("") +
            "</div>"
        );
    }
    function inspirationTab() {
        var ideas = ideasFor(3).concat(ideasFor(6).slice(3));
        var top = topIn(rangeOf("last90"), "video").slice(0, 3);
        return (
            '<div class="insp"><div class="insp-hero card"><div class="ih-t">' +
            ic("sparkle", "spk") +
            '<div><h2>Brainstorm with Ask Studio</h2><p class="muted">Get video ideas, titles and outlines tailored to what your audience is watching.</p></div></div><div class="ih-in"><input id="inspq" placeholder="Describe a video idea, topic or keyword" autocomplete="off">' +
            btn("Brainstorm", 'data-act="inspgo"', "filled") +
            "</div></div>" +
            '<h3 class="sh3">Ideas for you</h3><div class="insp-g">' +
            ideas
                .map(function (t, i) {
                    return (
                        '<div class="card ic-c"><div class="ic-k">' +
                        [
                            "Trending with your audience",
                            "Based on your top video",
                            "Popular in your niche",
                            "Fresh angle",
                            "Series idea",
                            "Viewers are searching",
                        ][i % 6] +
                        '</div><div class="ic-t">' +
                        esc(t) +
                        '</div><div class="cbtns">' +
                        btn(
                            "Develop idea",
                            'data-ask="Help me develop this video idea: ' +
                                esc(t) +
                                '"',
                            "tonal",
                            "sparkle",
                        ) +
                        "</div></div>"
                    );
                })
                .join("") +
            "</div>" +
            (top.length
                ? '<h3 class="sh3">Your recent hits</h3><div class="insp-hits">' +
                  top
                      .map(function (x) {
                          return (
                              '<div class="ih-v">' +
                              vlink(x.v, thumbImg(x.v, "ih-th")) +
                              '<div><div class="ih-vt">' +
                              esc(x.v.title) +
                              '</div><div class="muted">' +
                              cmp(x.views) +
                              " views in the last 90 days</div></div></div>"
                          );
                      })
                      .join("") +
                  "</div>"
                : "") +
            "</div>"
        );
    }

    /* ── Analytics entities: the channel, or one upload ──────── */
    var CHAN = {
        sum: function (mk, a, b) {
            return M[mk].sum(a, b);
        },
        series: function (mk, r) {
            return series(mk, r);
        },
        vs: function (mk, r) {
            return versus(mk, r);
        },
        vsText: function (mk, vs) {
            return versusText(mk, vs);
        },
        markers: true,
    };
    function videoEnt(v) {
        var per = function (mk, a, b) {
            var vw = vsum(v, a, b);
            switch (mk) {
                case "views":
                case "lviews":
                    return vw;
                case "watch":
                    return (vw * v.avd) / 3600;
                case "subs":
                case "sgain":
                    return vw * vrate(v, "sg");
                case "slost":
                    return vw * vrate(v, "sg") * 0.08;
                case "rev":
                    return vw * vrate(v, "rv");
                case "impr":
                    return vw * vrate(v, "im");
                case "ctr":
                    return v.short
                        ? 0
                        : v.ctr *
                              (1 +
                                  ((hash(v.key + a) % 100) / 100 - 0.5) *
                                      0.12 *
                                      (b === a ? 1 : 0));
                case "avd":
                    return v.avd;
                case "rpm":
                    return vw ? vrate(v, "rv") * 1000 : 0;
                case "uniq":
                    return (vw / vpvFor(b - a + 1)) * 0.92;
                case "ret":
                    return (vw / vpvFor(b - a + 1)) * 0.92 * RET;
                case "newv":
                    return (vw / vpvFor(b - a + 1)) * 0.92 * (1 - RET);
                case "likes":
                    return vw * vrate(v, "lk");
                case "comments":
                    return vw * vrate(v, "cm");
                default:
                    return vw;
            }
        };
        // "Typical": the median of the channel's last ten uploads of the same kind at this age.
        var typical = function (mk) {
            var age = Math.max(1, Math.round(liveAge(v)));
            var pool = (v.short ? SHORTS : LONG)
                .filter(function (x) {
                    return x !== v && x.pub < v.pub;
                })
                .slice(0, 10);
            if (pool.length < 3) return null;
            var vals = pool
                .map(function (x) {
                    var a = Math.max(PRE, x.pubIdx);
                    return videoEnt(x).sum(mk, a, Math.min(YDAY, a + age - 1));
                })
                .sort(function (a, b) {
                    return a - b;
                });
            return vals[Math.floor(vals.length / 2)];
        };
        return {
            v: v,
            sum: function (mk, a, b) {
                if (mk === "views" && b === YDAY && a <= v.pubIdx)
                    return v.views;
                return per(mk, a, b);
            },
            series: function (mk, r) {
                var pts = [];
                if (r.days <= 3 && v.h48) {
                    // Young uploads: Studio switches to hourly points.
                    var nowH = Math.floor(S.now / HOUR) * HOUR,
                        start = Math.max(v.pub, dayMs(r.a)),
                        hours = clamp(Math.ceil((S.now - start) / HOUR), 2, 72);
                    var rate = {
                        views: 1,
                        lviews: 1,
                        watch: v.avd / 3600,
                        subs: vrate(v, "sg"),
                        sgain: vrate(v, "sg"),
                        rev: vrate(v, "rv"),
                        impr: vrate(v, "im"),
                        uniq: 0.92,
                        ret: 0.92 * RET,
                        newv: 0.92 * (1 - RET),
                    }[mk];
                    // Hourly views that add up to the video's total: the realtime split for
                    // the last 48 hours, and the launch burst before that.
                    var raw = [],
                        inWin = 0,
                        before = 0;
                    for (var k = hours - 1; k >= 0; k--) {
                        var tt = nowH - k * HOUR,
                            x =
                                tt + HOUR <= v.pub
                                    ? 0
                                    : k < 48
                                      ? v.h48[47 - k]
                                      : 0;
                        raw.push(x);
                        if (k < 48) inWin += x;
                    }
                    if (S.now - v.pub < 72 * HOUR) {
                        var scale =
                                inWin > v.views * 0.9
                                    ? (v.views * 0.9) / inWin
                                    : 1,
                            rest = v.views - inWin * scale,
                            wsum = 0,
                            ws = [];
                        for (var j = 0; j < raw.length; j++) {
                            var kk = hours - 1 - j;
                            ws.push(
                                kk >= 48 && nowH - kk * HOUR + HOUR > v.pub
                                    ? Math.exp(-(raw.length - 1 - kk) / 8)
                                    : 0,
                            );
                            wsum += ws[j];
                        }
                        for (j = 0; j < raw.length; j++)
                            raw[j] =
                                raw[j] * scale +
                                (wsum ? (Math.max(0, rest) * ws[j]) / wsum : 0);
                        void before;
                    }
                    for (var q = 0; q < raw.length; q++)
                        pts.push({
                            t: nowH - (hours - 1 - q) * HOUR,
                            v:
                                rate == null
                                    ? per(mk, YDAY, YDAY)
                                    : raw[q] * rate,
                        });
                    pts.hourly = true;
                    return pts;
                }
                if (/^p\d+$/.test(r.key) && CUM[mk]) {
                    // Lifetime charts run as a running total over days since publishing.
                    var run = 0,
                        tot = this.sum(mk, r.a, r.b);
                    for (var i2 = r.a; i2 <= r.b; i2++) {
                        run += per(mk, i2, i2);
                        pts.push({ t: dayMs(i2), a: r.a, b: i2, v: run });
                    }
                    var f = run > 0 ? tot / run : 1;
                    pts.forEach(function (p) {
                        p.v *= f;
                    });
                    pts.cum = true;
                    return pts;
                }
                for (var i = r.a; i <= r.b; i++)
                    pts.push({ t: dayMs(i), a: i, b: i, v: per(mk, i, i) });
                return pts;
            },
            vs: function (mk, r) {
                var cur = this.sum(mk, r.a, r.b);
                return /^p\d+$/.test(r.key)
                    ? { cur: cur, base: typical(mk), kind: "typical" }
                    : { cur: cur, base: null };
            },
            vsText: function (mk, vs) {
                if (vs.base == null) return "";
                var p = vs.base
                    ? ((vs.cur - vs.base) / Math.abs(vs.base)) * 100
                    : 0;
                if (Math.abs(p) < 10)
                    return "About the same as your typical video";
                return (
                    Math.min(999, Math.round(Math.abs(p))) +
                    "% " +
                    (p > 0 ? "more" : "less") +
                    " than your typical video"
                );
            },
            markers: false,
        };
    }

    var CUM = {
        views: 1,
        lviews: 1,
        watch: 1,
        subs: 1,
        sgain: 1,
        rev: 1,
        impr: 1,
        uniq: 1,
        likes: 1,
        comments: 1,
    };
    /* ── Shared analytics pieces ─────────────────────────────── */
    var after = [];
    function afterRender(fn) {
        after.push(fn);
    }
    function datePicker(r, cls) {
        return (
            '<button class="dp ' +
            (cls || "") +
            '" data-act="range"><span class="dp-x"><span class="dp-s">' +
            esc(r.sub) +
            '</span><span class="dp-l">' +
            esc(r.label) +
            "</span></span>" +
            ic("caret", "dp-c") +
            "</button>"
        );
    }
    function pickRange(anchor, cur, onPick, extra) {
        var items = (extra || []).concat(rangeMenu()).map(function (x) {
            return x === "-"
                ? "-"
                : { t: x[1], k: x[0], check: true, on: x[0] === cur };
        });
        menuAt(
            anchor,
            items,
            function (it) {
                if (it.k === "custom") return customRange(onPick);
                onPick(it.k);
            },
            { align: "right", cls: "rmenu" },
        );
    }
    function isoOf(i) {
        var d = dt(dayMs(i));
        return (
            d.getUTCFullYear() +
            "-" +
            String(d.getUTCMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getUTCDate()).padStart(2, "0")
        );
    }
    function customRange(onPick) {
        var r = rangeOf(ST.range);
        var d = modal(
            '<div class="dlg-h"><h2>Custom date range</h2></div><div class="dlg-b cr"><label>Start date<input type="date" id="cr-a" value="' +
                isoOf(r.a) +
                '" min="' +
                isoOf(BIRTH) +
                '" max="' +
                isoOf(YDAY) +
                '"></label><span class="cr-d">–</span><label>End date<input type="date" id="cr-b" value="' +
                isoOf(r.b) +
                '" min="' +
                isoOf(BIRTH) +
                '" max="' +
                isoOf(YDAY) +
                '"></label></div><div class="dlg-f">' +
                btn("Cancel", "data-x", "text") +
                btn("Apply", 'data-act="crok"', "filled") +
                "</div>",
            { w: 460, cls: "small" },
        );
        $("[data-act=crok]", d.el).addEventListener("click", function () {
            var a = idxOf(Date.parse($("#cr-a", d.el).value)),
                b = idxOf(Date.parse($("#cr-b", d.el).value));
            if (!(a >= 0) || !(b >= 0)) return;
            if (a > b) {
                var t = a;
                a = b;
                b = t;
            }
            d.close();
            onPick("c" + clamp(a, BIRTH, YDAY) + "_" + clamp(b, BIRTH, YDAY));
        });
    }
    // The headline card: metric tabs over one big chart.
    function keyCard(ent, mks, r, opt) {
        opt = opt || {};
        var sel = opt.sel && mks.indexOf(opt.sel) >= 0 ? opt.sel : mks[0],
            id = "kc" + Math.floor(Math.random() * 1e9);
        var tabs = mks
            .map(function (mk) {
                var vs = ent.vs(mk, r),
                    txt = ent.vsText(mk, vs),
                    dir =
                        vs.kind === "typical"
                            ? vs.base
                                ? vs.cur > vs.base * 1.1
                                    ? 1
                                    : vs.cur < vs.base * 0.9
                                      ? -1
                                      : 0
                                : 0
                            : trendDir(mk, vs),
                    has = vs.base != null,
                    big =
                        vs.base != null &&
                        vs.base > 0 &&
                        Math.abs(vs.cur / vs.base - 1) > 1.5 &&
                        mk !== "avd" &&
                        mk !== "ctr";
                return (
                    '<button class="kt' +
                    (mk === sel ? " on" : "") +
                    '" data-mk="' +
                    mk +
                    '" data-tiph="' +
                    esc(ktip(mk, vs, txt)) +
                    '"><span class="kt-l">' +
                    esc(M[mk].label) +
                    (EST[mk] ? ic("clock", "kt-w") : "") +
                    (big && !opt.noWarn ? ic("warning", "kt-w") : "") +
                    '</span><span class="kt-v">' +
                    esc(M[mk].fmt(vs.cur)) +
                    (has && opt.icons !== false ? trendIcon(dir, true) : "") +
                    '</span><span class="kt-s">' +
                    esc(txt || (has ? "" : "—")) +
                    "</span></button>"
                );
            })
            .join("");
        afterRender(function () {
            var host = document.getElementById(id);
            if (!host) return;
            var draw = function (mk, anim) {
                var pts = ent.series(mk, r),
                    o = {
                        mk: mk,
                        h: opt.h || 170,
                        markers: ent.markers && r.days <= 400 && !pts.hourly,
                        range: r,
                        anim: anim,
                        gran: pts.hourly ? "hour" : r.gran,
                        color: opt.chartColor,
                    };
                if (pts.cum) {
                    var t0 = pts[0].t,
                        last = pts.length - 1;
                    o.xFmt = function (t) {
                        var d = Math.round((t - t0) / DAY);
                        return d === last ? d + " days" : String(d);
                    };
                    o.xw = 90;
                }
                lineChart($(".kc-ch", host), pts, o);
            };
            draw(sel, true);
            $$(".kt", host).forEach(function (t) {
                t.addEventListener("click", function () {
                    $$(".kt", host).forEach(function (x) {
                        x.classList.toggle("on", x === t);
                    });
                    draw(t.getAttribute("data-mk"), true);
                    host.setAttribute("data-mk", t.getAttribute("data-mk"));
                    if (opt.onSel) opt.onSel(t.getAttribute("data-mk"));
                });
            });
            host._redraw = function () {
                draw(host.getAttribute("data-mk") || sel, false);
            };
        });
        return (
            '<section class="card kc" id="' +
            id +
            '" data-mk="' +
            sel +
            '"><div class="kts n' +
            mks.length +
            '">' +
            tabs +
            '</div><div class="kc-ch"></div>' +
            (opt.more !== false
                ? '<div class="kc-f">' +
                  btn("See more", 'data-act="advanced"') +
                  "</div>"
                : "") +
            "</section>"
        );
    }
    // Metrics Studio marks as estimated (clock icon after the label).
    var EST = { rev: 1, uniq: 1, ret: 1, rpm: 1, cpm: 1 };
    var KDESC = {
        views: "Channel views compared to your typical performance. Over time, this can help you spot high-performing videos, anticipate seasonal changes, and determine when to upload new videos. This includes public, private, unlisted, and deleted videos.",
        watch: "Watch time compared with your typical performance. This includes public, private, unlisted, and deleted videos.",
        subs: "Change in total subscribers, found by subtracting subscribers lost from subscribers gained.",
        rev: "Estimated net revenue from all Google-sold ads and transactions. Estimated revenue may change after final numbers are reported.",
        impr: "How many times your thumbnails were shown to viewers on YouTube through registered impressions.",
        ctr: "How often viewers chose to watch a video after seeing a thumbnail. This is calculated as views per impression shown. Previously called 'Impressions click-through rate'.",
        avd: "Estimated average minutes watched per view for the selected content, date range, region and other filters.",
        uniq: "Estimated number of people who watched your content in the selected date range.",
        ret: "Estimated number of unique viewers who watched your content at least once this month.",
    };
    function ktip(mk, vs, txt) {
        var m = M[mk],
            rows =
                '<div class="kh-r"><span>' +
                esc(m.label) +
                "</span><b>" +
                esc((m.fullFmt || m.fmt)(vs.cur)) +
                "</b></div>";
        if (vs.lo != null)
            rows +=
                '<div class="kh-r"><span>Typical</span><span>' +
                esc(m.fmt(vs.lo)) +
                "–" +
                esc(m.fmt(vs.hi)) +
                "</span></div>";
        else if (vs.base != null)
            rows +=
                '<div class="kh-r"><span>' +
                (vs.kind === "typical"
                    ? "Your typical video"
                    : "Previous " + vs.days + " days") +
                "</span><span>" +
                esc(m.fmt(vs.base)) +
                "</span></div>";
        if (txt)
            rows +=
                '<div class="kh-r"><span>Performance</span><span class="' +
                (vs.cur >= (vs.base || 0) ? "pos" : "") +
                '">' +
                esc(txt) +
                "</span></div>";
        return (
            '<div class="kh">' +
            rows +
            (KDESC[mk] ? "<p>" + esc(KDESC[mk]) + "</p>" : "") +
            "</div>"
        );
    }
    function acard(title, sub, body, opt) {
        opt = opt || {};
        return (
            '<section class="card ac' +
            (opt.cls ? " " + opt.cls : "") +
            '">' +
            (title
                ? '<div class="ac-h"><div><h3 class="ac-t">' +
                  esc(title) +
                  "</h3>" +
                  (sub ? '<div class="ac-s">' + esc(sub) + "</div>" : "") +
                  "</div>" +
                  (opt.info
                      ? '<span class="ac-i" data-tip="' +
                        esc(opt.info) +
                        '">' +
                        ic("info") +
                        "</span>"
                      : "") +
                  "</div>"
                : "") +
            body +
            (opt.more
                ? '<div class="cbtns">' + btn("See more", opt.more) + "</div>"
                : "") +
            "</section>"
        );
    }
    function rangeSubline(r) {
        return r.key === "life"
            ? "Lifetime"
            : r.label === "Custom"
              ? r.sub
              : r.label;
    }
    function topTable(rows, opt) {
        opt = opt || {};
        if (!rows.length)
            return '<div class="nd">Not enough data to show this report</div>';
        return (
            '<div class="tt"><div class="tt-h"><span class="tt-c1">Content</span><span class="tt-c2">Average view duration</span><span class="tt-c3">Views</span></div>' +
            rows
                .map(function (x, i) {
                    var p = x.v.dur
                        ? Math.min(100, (x.v.avd / x.v.dur) * 100)
                        : 0;
                    return (
                        '<a class="tt-r" href="' +
                        esc(urlFor("video/" + x.v.key + "/analytics")) +
                        '" data-go="video/' +
                        x.v.key +
                        '/analytics"><span class="tt-n">' +
                        (i + 1) +
                        "</span>" +
                        thumbImg(x.v, "tt-th" + (x.v.short ? " sh" : "")) +
                        '<span class="tt-x"><span class="tt-t">' +
                        esc(x.v.title) +
                        '</span><span class="tt-d">' +
                        esc(dLong(x.v.pub)) +
                        '</span></span><span class="tt-c2"><span>' +
                        mmss(x.v.avd) +
                        '</span> <span class="muted">(' +
                        p.toFixed(1) +
                        '%)</span></span><span class="tt-c3">' +
                        full(x.views) +
                        "</span></a>"
                    );
                })
                .join("") +
            "</div>"
        );
    }

    /* ── Realtime card ───────────────────────────────────────── */
    var RT = { bars: P.D.rt.slice(), vids: null };
    function rtTop() {
        return V.filter(function (v) {
            return v.h48;
        })
            .map(function (v) {
                return {
                    v: v,
                    n: v.h48.reduce(function (a, b) {
                        return a + b;
                    }, 0),
                };
            })
            .filter(function (x) {
                return x.n >= 1;
            })
            .sort(function (a, b) {
                return b.n - a.n;
            });
    }
    function realtimeCard() {
        var tot = RT.bars.reduce(function (a, b) {
                return a + b;
            }, 0),
            top = rtTop().slice(0, 3);
        afterRender(function () {
            var h = $("#rt-bars");
            if (!h) return;
            barChart(h, RT.bars, {
                h: 56,
                tip: function (i, n) {
                    var k = RT.bars.length - 1 - i;
                    return (
                        '<div class="tt-d">' +
                        (k === 0
                            ? "Now"
                            : k + (k === 1 ? " hour ago" : " hours ago")) +
                        '</div><div class="tt-r"><span>Views</span><b>' +
                        full(n) +
                        "</b></div>"
                    );
                },
            });
        });
        return (
            '<section class="card rtc"><h3 class="ac-t">Realtime</h3><div class="rt-live"><i class="pulse"></i>Updating live</div><hr>' +
            '<div class="rt-n" id="rt-subs">' +
            full(S.subs) +
            '</div><div class="ac-s">Subscribers</div><div class="cbtns tight">' +
            btn("See live count", 'data-act="livecount"') +
            "</div><hr>" +
            '<div class="rt-n" id="rt-views">' +
            full(tot) +
            '</div><div class="ac-s">Views · Last 48 hours</div><div class="rt-b" id="rt-bars"></div><div class="rt-ax"><span>-48h</span><span>Now</span></div>' +
            '<div class="rt-th"><span>Top content</span><span>Views</span></div>' +
            (top.length
                ? top
                      .map(function (x) {
                          return (
                              '<a class="rt-r" href="' +
                              esc(urlFor("video/" + x.v.key + "/analytics")) +
                              '" data-go="video/' +
                              x.v.key +
                              '/analytics">' +
                              thumbImg(x.v, "rt-thumb") +
                              '<span class="rt-t">' +
                              esc(x.v.title) +
                              '</span><span class="rt-v" data-rtv="' +
                              x.v.key +
                              '">' +
                              full(x.n) +
                              "</span></a>"
                          );
                      })
                      .join("")
                : '<div class="nd sm">No views in the last 48 hours</div>') +
            '<div class="cbtns">' +
            btn("See more", 'data-act="realtime"') +
            "</div></section>"
        );
    }
    // Views keep arriving while the page is open.
    var rtTimer = 0;
    function startLive() {
        clearInterval(rtTimer);
        var r = rng(S.id + ":tick" + Date.now()),
            last24 = RT.bars.slice(-25, -1),
            perSec =
                last24.reduce(function (a, b) {
                    return a + b;
                }, 0) /
                24 /
                3600;
        var subRate = Math.max(0, M.subs.sum(L - 7, YDAY) / 7 / 86400),
            subs = S.subs,
            subAcc = 0;
        var top = rtTop(),
            totalTop =
                top.reduce(function (a, x) {
                    return a + x.n;
                }, 0) || 1;
        rtTimer = setInterval(function () {
            var exp = perSec * 3,
                add = Math.floor(exp) + (r() < exp % 1 ? 1 : 0);
            if (add > 0) {
                RT.bars[RT.bars.length - 1] += add;
                var el = $("#rt-views");
                if (el) {
                    el.textContent = full(
                        RT.bars.reduce(function (a, b) {
                            return a + b;
                        }, 0),
                    );
                    el.classList.remove("bump");
                    void el.offsetWidth;
                    el.classList.add("bump");
                }
                var bars = $("#rt-bars");
                if (bars && bars.firstChild) {
                    var rects = $$("rect", bars),
                        mx = Math.max.apply(null, RT.bars),
                        hh = 54;
                    rects.forEach(function (rc, i) {
                        var h2 = (RT.bars[i] / mx) * hh;
                        rc.setAttribute(
                            "height",
                            Math.max(h2, RT.bars[i] > 0 ? 1 : 0),
                        );
                        rc.setAttribute(
                            "y",
                            56 - Math.max(h2, RT.bars[i] > 0 ? 1 : 0),
                        );
                    });
                }
                for (var k = 0; k < add; k++) {
                    var pick2 = r() * totalTop,
                        acc = 0;
                    for (var j = 0; j < top.length; j++) {
                        acc += top[j].n;
                        if (pick2 <= acc) {
                            top[j].n++;
                            top[j].v.views++;
                            var c = $('[data-rtv="' + top[j].v.key + '"]');
                            if (c) c.textContent = full(top[j].n);
                            break;
                        }
                    }
                }
            }
            subAcc += subRate * 3;
            if (subAcc >= 1 || r() < subAcc) {
                subs += Math.max(1, Math.floor(subAcc));
                subAcc = 0;
                ["#rt-subs", "#lc-n"].forEach(function (s) {
                    var e = $(s);
                    if (e) {
                        e.textContent = full(subs);
                    }
                });
            }
        }, 3000);
    }
    function liveCountModal() {
        var d = modal(
            '<div class="dlg-h"><h2>Live subscriber count</h2>' +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b lc">' +
                avatar(72) +
                '<div class="lc-ch">' +
                esc(S.name) +
                '</div><div class="lc-n" id="lc-n">' +
                full(S.subs) +
                '</div><div class="muted">Subscribers</div><div class="rt-live"><i class="pulse"></i>Updating live</div></div>',
            { w: 480 },
        );
        return d;
    }
    function realtimeModal() {
        var tot = RT.bars.reduce(function (a, b) {
                return a + b;
            }, 0),
            top = rtTop();
        var mins = [];
        var rr = rng(S.id + ":min");
        var lastHour = RT.bars[RT.bars.length - 1] || 0,
            prevHour = RT.bars[RT.bars.length - 2] || 0;
        for (var i = 0; i < 60; i++) {
            var base = (prevHour + lastHour) / 2 / 60;
            mins.push(Math.max(0, Math.round(base * (0.55 + rr() * 0.9))));
        }
        var d = modal(
            '<div class="dlg-h"><h2>Realtime</h2>' +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b rtm"><div class="rtm-g"><div><div class="rt-n">' +
                full(tot) +
                '</div><div class="ac-s">Views · Last 48 hours</div><div class="rt-b" id="rtm-48"></div><div class="rt-ax"><span>-48h</span><span>Now</span></div></div><div><div class="rt-n">' +
                full(
                    mins.reduce(function (a, b) {
                        return a + b;
                    }, 0),
                ) +
                '</div><div class="ac-s">Views · Last 60 minutes</div><div class="rt-b" id="rtm-60"></div><div class="rt-ax"><span>-60min</span><span>Now</span></div></div></div>' +
                '<div class="rt-th"><span>Top content</span><span>Views · Last 48 hours</span></div>' +
                top
                    .slice(0, 10)
                    .map(function (x) {
                        return (
                            '<a class="rt-r" href="' +
                            esc(urlFor("video/" + x.v.key + "/analytics")) +
                            '" data-go="video/' +
                            x.v.key +
                            '/analytics">' +
                            thumbImg(x.v, "rt-thumb") +
                            '<span class="rt-t">' +
                            esc(x.v.title) +
                            '</span><span class="rt-v">' +
                            full(x.n) +
                            "</span></a>"
                        );
                    })
                    .join("") +
                "</div>",
            { w: 640 },
        );
        barChart($("#rtm-48", d.el), RT.bars, { h: 64 });
        barChart($("#rtm-60", d.el), mins, { h: 64 });
        $$("[data-go]", d.el).forEach(function (a) {
            a.addEventListener("click", function () {
                d.close();
            });
        });
    }

    /* ── Channel analytics page ──────────────────────────────── */
    var AN = { tab: "overview", ctype: "all", sel: {} };
    function analyticsPage(tab) {
        AN.tab = tab || "overview";
        if (AN.tab === "revenue" && !S.monetized) AN.tab = "overview";
        var r = rangeOf(ST.range);
        var TABS = [
            ["overview", "Overview"],
            ["content", "Content"],
            ["audience", "Audience"],
        ];
        if (S.monetized) TABS.push(["revenue", "Revenue"]);
        TABS.push(["trends", "Trends"]);
        var chips = S.ai
            ? '<div class="aichips">' +
              [
                  "How did viewers find my content?",
                  "How many new viewers did I reach?",
                  "Summarize my latest video performance",
              ]
                  .map(function (q) {
                      return btn(
                          q,
                          'data-ask="' + esc(q) + '"',
                          "tonal chip",
                          "sparkle",
                      );
                  })
                  .join("") +
              ibtn("more", 'data-act="aimore"', "More options") +
              "</div>"
            : "";
        var body = {
            overview: anOverview,
            content: anContent,
            audience: anAudience,
            revenue: anRevenue,
            trends: anTrends,
        }[AN.tab](r);
        view.innerHTML =
            '<div class="pg an">' +
            pageHead(
                "Channel analytics",
                btn("Advanced mode", 'data-act="advanced"'),
            ) +
            chips +
            '<div class="an-bar">' +
            tabsBar(TABS, AN.tab, "data-atab") +
            '<span class="fl"></span>' +
            datePicker(r) +
            "</div>" +
            '<div class="an-body">' +
            body +
            "</div>" +
            footer() +
            "</div>";
        placeInk($(".an-bar"));
        flushAfter();
        startLive();
    }
    function flushAfter() {
        var fs = after;
        after = [];
        fs.forEach(function (f) {
            f();
        });
    }
    function headline(r, what) {
        var n = M.views.sum(r.a, r.b);
        if (r.key === "life")
            return "Your channel has gotten " + full(n) + " views so far";
        if (r.n)
            return (
                "Your channel got " +
                full(n) +
                " views in the last " +
                r.n +
                " days"
            );
        if (/^y/.test(r.key) || /^m/.test(r.key))
            return "Your channel got " + full(n) + " views in " + r.label;
        return (
            "Your channel got " +
            full(n) +
            " views " +
            (what || "in this period")
        );
    }
    function anOverview(r) {
        var mks = ["views", "watch", "subs"];
        if (S.monetized) mks.push("rev");
        var top = topIn(r).slice(0, 10);
        var latest = V.filter(function (v) {
            return v.vis === "Public";
        })[0];
        var hd = overviewHead(r);
        return (
            viewsBanner() +
            '<div class="ov"><div class="ov-main"><h2 class="hl">' +
            esc(hd.h) +
            "</h2>" +
            hd.s +
            keyCard(CHAN, mks, r, {
                sel: AN.sel.overview,
                onSel: function (k) {
                    AN.sel.overview = k;
                },
            }) +
            '<div class="ov-sep"></div><h2 class="sub-hl">Your top content in this period</h2><section class="card bl">' +
            topTable(top) +
            '<div class="cbtns">' +
            btn("See more", 'data-act="advanced"') +
            "</div></section></div>" +
            '<div class="ov-side">' +
            realtimeCard() +
            (latest ? latestContentCard(latest) : "") +
            "</div></div>"
        );
    }
    // "...which is around the upper end of the 225,000–654,000 views your channel usually gets in 28 days"
    // With a typical range, the headline turns into a verdict and the numbers
    // move to the line under it, as Studio does.
    function overviewHead(r) {
        var vs = versus("views", r);
        if (vs.lo == null || !r.n) return { h: headline(r), s: "" };
        var n = full(Math.round(vs.cur)),
            span = full(roundNice(vs.lo)) + "–" + full(roundNice(vs.hi)),
            w = vs.hi - vs.lo,
            pos = w > 0 ? (vs.cur - vs.lo) / w : 0.5,
            how,
            h;
        var inN = " in the last " + r.n + " days.";
        if (vs.cur > vs.hi * 1.05) {
            how = "which is above the " + span + " views";
            h =
                "Looking good! Your channel's views were higher than usual" +
                inN;
        } else if (vs.cur < vs.lo * 0.95) {
            how = "which is below the " + span + " views";
            h = "Your channel's views were lower than usual" + inN;
        } else if (pos > 0.7) {
            how = "which is around the upper end of the " + span + " views";
            h =
                "Looking good! Your channel's views were slightly higher than usual" +
                inN;
        } else if (pos < 0.3) {
            how = "which is around the lower end of the " + span + " views";
            h = "Your channel's views were slightly lower than usual" + inN;
        } else {
            how = "which is similar to the " + span + " views";
            h =
                "Keep it up! Your channel got about the same number of views as usual.";
        }
        return {
            h: h,
            s:
                '<p class="hl-s">Your channel got ' +
                n +
                " views " +
                how +
                " your channel usually gets in " +
                r.n +
                " days</p>",
        };
    }
    function roundNice(x) {
        var p = Math.pow(
            10,
            Math.max(0, Math.floor(Math.log10(Math.max(1, x))) - 2),
        );
        return Math.round(x / p) * p;
    }
    var BANNER = { off: false };
    function viewsBanner() {
        if (BANNER.off || TODAY < Date.UTC(2026, 7, 27)) return "";
        return (
            '<div class="vbn">' +
            ic("info") +
            '<span>We updated how views are counted, so recent counts may be higher. Keep this in mind when analyzing your performance.</span><a class="btn text" href="https://support.google.com/youtube/answer/2991785" target="_blank" rel="noopener">Learn more</a><button class="btn text" data-act="dismissvb">Dismiss</button></div>'
        );
    }
    function latestContentCard(v) {
        var rk = rankOf(v);
        return (
            '<section class="card lcc"><h3 class="ac-t">Latest content</h3>' +
            vlink(v, thumbImg(v, "lcc-th", "hqdefault.jpg")) +
            '<div class="lcc-t">' +
            esc(v.title) +
            '</div><div class="ac-s">' +
            esc(firstLabel(v)) +
            " compared to your typical performance</div>" +
            '<div class="kv"><span>Ranking by views</span><span>' +
            rk.rank +
            " of " +
            rk.of +
            "</span></div>" +
            '<div class="kv"><span>Views</span><span>' +
            cmp(v.views) +
            "</span></div>" +
            (v.short
                ? '<div class="kv"><span>Viewed (vs. swiped away)</span><span>' +
                  pct(viewedPct(v)) +
                  "</span></div>"
                : '<div class="kv"><span>Thumbnail click-through rate</span><span>' +
                  pct(v.ctr) +
                  "</span></div>") +
            '<div class="kv"><span>Average view duration</span><span>' +
            mmss(v.avd) +
            "</span></div>" +
            '<div class="cbtns">' +
            btn(
                "See video analytics",
                'data-go="video/' + v.key + '/analytics"',
            ) +
            "</div></section>"
        );
    }
    function trafficRows(kind) {
        var rows = kind === "short" ? AU.trafficShorts : AU.traffic;
        return rows.slice().sort(function (a, b) {
            return b[1] - a[1];
        });
    }
    function anContent(r) {
        var ct = AN.ctype,
            kind = ct === "videos" ? "video" : ct === "shorts" ? "short" : "";
        var chips =
            '<div class="cchips">' +
            [
                ["all", "All"],
                ["videos", "Videos"],
                ["shorts", "Shorts"],
                ["live", "Live"],
                ["posts", "Posts"],
            ]
                .map(function (c) {
                    return (
                        '<button class="cchip' +
                        (c[0] === ct ? " on" : "") +
                        '" data-ctype="' +
                        c[0] +
                        '">' +
                        c[1] +
                        "</button>"
                    );
                })
                .join("") +
            "</div>";
        if (ct === "live" || ct === "posts")
            return (
                chips +
                '<section class="card empty-an">' +
                ic(ct === "live" ? "live" : "post", "ea-ic") +
                "<p>" +
                (ct === "live"
                    ? "Your live streams will show up here after you go live"
                    : "You haven’t published any posts in this period") +
                "</p></section>"
            );
        var vols = kind === "short" ? SHORTS : kind === "video" ? LONG : V;
        var ent = kind ? kindEnt(kind) : CHAN;
        var mks =
            kind === "short"
                ? ["views", "subs", "watch"]
                : kind === "video"
                  ? ["views", "impr", "ctr", "avd"]
                  : ["views", "watch", "subs"];
        var top = topIn(r, kind).slice(0, 10);
        var trs = trafficRows(kind === "short" ? "short" : "").slice(0, 6);
        var viewsR = ent.sum("views", r.a, r.b);
        var cards =
            '<div class="g2">' +
            acard(
                "How viewers find your " +
                    (kind === "short"
                        ? "Shorts"
                        : kind === "video"
                          ? "videos"
                          : "content"),
                "Views · " + rangeSubline(r),
                hbars(
                    trs.map(function (t) {
                        return [t[0], t[1]];
                    }),
                    {
                        fmt: function (p) {
                            return pct(p);
                        },
                    },
                ),
                { more: 'data-act="advanced" data-dim="traffic"' },
            );
        if (kind !== "short") {
            var im = M.impr.sum(r.a, r.b),
                ctr = M.ctr.sum(r.a, r.b),
                lv = M.lviews.sum(r.a, r.b),
                vfi = (im * ctr) / 100,
                avd = M.avd.sum(r.a, r.b),
                whi = (vfi * avd) / 3600;
            cards += acard(
                "Impressions and how they led to watch time",
                rangeSubline(r),
                '<div class="fun">' +
                    funnelStep(
                        cmp(im),
                        "Thumbnail impressions",
                        100,
                        "From YouTube recommending your content",
                    ) +
                    funnelStep(
                        pct(ctr),
                        "Thumbnail click-through rate",
                        62,
                        "",
                    ) +
                    funnelStep(cmp(vfi), "Views from impressions", 44, "") +
                    funnelStep(mmss(avd), "Average view duration", 30, "") +
                    funnelStep(
                        hrs(whi),
                        "Watch time from impressions (hours)",
                        22,
                        "",
                    ) +
                    "</div>" +
                    '<div class="fun-n muted">' +
                    Math.round(lv ? (vfi / lv) * 100 : 0) +
                    "% of views came from impressions</div>",
                {
                    info: "Thumbnail impressions are counted when your thumbnail is shown to a viewer on YouTube",
                },
            );
        } else {
            var shown =
                viewsR /
                Math.max(
                    0.3,
                    viewedPct(SHORTS[0] || { short: 1, apv: 70, key: "x" }) /
                        100,
                );
            cards += acard(
                "How many chose to view",
                rangeSubline(r),
                '<div class="cv"><div class="cv-p">' +
                    pct((viewsR / Math.max(1, shown)) * 100) +
                    '</div><div class="muted">Viewed (vs. swiped away)</div><div class="cv-b"><i style="width:' +
                    ((viewsR / Math.max(1, shown)) * 100).toFixed(1) +
                    '%"></i></div><div class="kv"><span>Shown in feed</span><span>' +
                    cmp(shown) +
                    '</span></div><div class="kv"><span>Viewed</span><span>' +
                    cmp(viewsR) +
                    '</span></div><div class="kv"><span>Swiped away</span><span>' +
                    cmp(shown - viewsR) +
                    "</span></div></div>",
            );
        }
        cards += acard(
            "Top content",
            "Views · " + rangeSubline(r),
            miniTop(top.slice(0, 5)),
            { more: 'data-act="advanced"' },
        );
        var lat = vols.filter(function (v) {
            return v.vis === "Public";
        })[0];
        if (lat && !lat.short)
            cards += acard(
                "Key moments for audience retention",
                lat.title,
                '<div class="ret-ch" data-v="' +
                    lat.key +
                    '"></div><div class="kv"><span>Average percentage viewed</span><span>' +
                    pct(lat.apv) +
                    '</span></div><div class="kv"><span>Average view duration</span><span>' +
                    mmss(lat.avd) +
                    "</span></div>",
                { more: 'data-go="video/' + lat.key + '/analytics"' },
            );
        else
            cards += acard(
                "Top Shorts",
                "Views · " + rangeSubline(r),
                miniTop(topIn(r, "short").slice(0, 5)),
            );
        cards += "</div>";
        afterRender(function () {
            $$(".ret-ch").forEach(function (h) {
                retentionChart(h, byKey[h.getAttribute("data-v")], { h: 120 });
            });
        });
        return (
            chips +
            keyCard(ent, mks, r, {
                sel: AN.sel["content-" + ct],
                chartColor: "var(--c-content)",
                onSel: function (k) {
                    AN.sel["content-" + ct] = k;
                },
            }) +
            cards
        );
    }
    function kindEnt(kind) {
        // Channel totals restricted to one format (videos or Shorts).
        var vs = kind === "short" ? SHORTS : LONG;
        var sumV = function (a, b) {
            var s = 0;
            vs.forEach(function (v) {
                s += vsum(v, a, b);
            });
            return s;
        };
        var share = function (a, b) {
            var t = M.views.sum(a, b);
            return t ? sumV(a, b) / t : 0;
        };
        return {
            sum: function (mk, a, b) {
                if (mk === "views")
                    return kind === "short"
                        ? M.sviews.sum(a, b)
                        : M.lviews.sum(a, b);
                if (mk === "impr" || mk === "ctr") return M[mk].sum(a, b);
                if (mk === "avd") {
                    var w = 0,
                        n = 0;
                    vs.forEach(function (v) {
                        var x = vsum(v, a, b);
                        w += x * v.avd;
                        n += x;
                    });
                    return n ? w / n : 0;
                }
                return (
                    M[mk].sum(a, b) *
                    clamp(
                        share(a, b) *
                            (mk === "subs" && kind === "short" ? 0.35 : 1),
                        0,
                        1,
                    )
                );
            },
            series: function (mk, r) {
                var pts = [],
                    self = this;
                if (r.gran === "month")
                    return series(mk, r).map(function (p) {
                        return {
                            t: p.t,
                            a: p.a,
                            b: p.b,
                            v: self.sum(mk, p.a, p.b),
                        };
                    });
                for (var i = r.a; i <= r.b; i++)
                    pts.push({
                        t: dayMs(i),
                        a: i,
                        b: i,
                        v: self.sum(mk, i, i),
                    });
                return pts;
            },
            vs: function (mk, r) {
                var self = this,
                    cur = self.sum(mk, r.a, r.b);
                if (r.n && r.n <= 90) {
                    var prev = [];
                    for (var k = 1; k <= 6; k++) {
                        var a = r.a - r.days * k;
                        if (a < BIRTH) break;
                        prev.push(self.sum(mk, a, r.b - r.days * k));
                    }
                    prev.sort(function (x, y) {
                        return x - y;
                    });
                    return {
                        cur: cur,
                        base: prev.length
                            ? prev[Math.floor(prev.length / 2)]
                            : null,
                        kind: "usual",
                    };
                }
                return {
                    cur: cur,
                    base: r.pa >= BIRTH ? self.sum(mk, r.pa, r.pb) : null,
                    kind: "prev",
                    days: r.days,
                };
            },
            vsText: function (mk, vs2) {
                return versusText(mk, vs2);
            },
            markers: true,
        };
    }
    function funnelStep(v, l, w, s) {
        return (
            '<div class="fs"><div class="fs-bar" style="width:' +
            w +
            '%"></div><div class="fs-x"><b>' +
            esc(v) +
            "</b><span>" +
            esc(l) +
            "</span>" +
            (s ? "<small>" + esc(s) + "</small>" : "") +
            "</div></div>"
        );
    }
    function miniTop(rows) {
        if (!rows.length)
            return '<div class="nd">Not enough data to show this report</div>';
        return rows
            .map(function (x) {
                return (
                    '<a class="mt" href="' +
                    esc(urlFor("video/" + x.v.key + "/analytics")) +
                    '" data-go="video/' +
                    x.v.key +
                    '/analytics">' +
                    thumbImg(x.v, "mt-th" + (x.v.short ? " sh" : "")) +
                    '<span class="mt-t">' +
                    esc(x.v.title) +
                    '</span><span class="mt-v">' +
                    full(x.views) +
                    "</span></a>"
                );
            })
            .join("");
    }
    function anAudience(r) {
        var mks = ["ret", "uniq", "subs"];
        var uniq = M.uniq.sum(r.a, r.b),
            g = AU.gender,
            beh = AU.behavior;
        var subW = shareOf(AU.subscribed, "Subscribed") * 100;
        var formats = (function () {
            var sv = M.sviews.sum(r.a, r.b),
                tv = M.views.sum(r.a, r.b) || 1;
            var s = (sv / tv) * 100;
            return [
                ["Videos", Math.max(0, 100 - s - 3.5)],
                ["Shorts", s],
                ["Live", 3.5],
            ];
        })();
        var cards =
            '<div class="g2">' +
            acard(
                "Audience by watch behavior",
                rangeSubline(r),
                '<div class="beh">' +
                    beh
                        .map(function (b, i) {
                            return (
                                '<div class="beh-c"><div class="beh-v">' +
                                cmp((uniq * b[1]) / 100) +
                                '</div><div class="beh-l"><i class="sw s' +
                                i +
                                '"></i>' +
                                esc(b[0]) +
                                '</div><div class="muted sm">' +
                                pct(b[1]) +
                                "</div></div>"
                            );
                        })
                        .join("") +
                    '</div><div class="stack">' +
                    beh
                        .map(function (b, i) {
                            return (
                                '<i class="s' +
                                i +
                                '" style="width:' +
                                b[1] +
                                '%"></i>'
                            );
                        })
                        .join("") +
                    '</div><p class="muted sm">New viewers watched for the first time in this period. Casual viewers watched in 1 to 5 months of the last 12; regular viewers in 6 or more.</p>',
                {
                    info: "Viewers are grouped by how often they watched your channel over the last year",
                },
            ) +
            acard(
                "When your viewers are on YouTube",
                "Your local time (GMT" +
                    ((TZ[S.country] != null ? TZ[S.country] : -5) >= 0
                        ? "+"
                        : "") +
                    (TZ[S.country] != null ? TZ[S.country] : -5) +
                    ") · Last 28 days",
                heatmap(AU.heat),
            ) +
            acard(
                "Watch time from subscribers",
                "Watch time · " + rangeSubline(r),
                '<div class="ws"><div class="ws-r"><span>Not subscribed</span><b>' +
                    pct(100 - subW) +
                    '</b></div><div class="cv-b big"><i style="width:' +
                    (100 - subW).toFixed(1) +
                    '%"></i></div><div class="ws-r"><span>Subscribed</span><b>' +
                    pct(subW) +
                    '</b></div><div class="cv-b big alt"><i style="width:' +
                    subW.toFixed(1) +
                    '%"></i></div></div>',
            ) +
            acard(
                "Age and gender",
                "Views · " + rangeSubline(r),
                '<div class="gen">' +
                    g
                        .slice(0, 2)
                        .map(function (x) {
                            return (
                                '<div><div class="gen-v">' +
                                pct(x[1]) +
                                '</div><div class="muted">' +
                                esc(x[0]) +
                                "</div></div>"
                            );
                        })
                        .join("") +
                    (g[2]
                        ? '<div><div class="gen-v">' +
                          pct(g[2][1]) +
                          '</div><div class="muted">User-specified</div></div>'
                        : "") +
                    "</div>" +
                    hbars(
                        AU.age.map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                { more: 'data-act="advanced" data-dim="age"' },
            ) +
            acard(
                "Top geographies",
                "Views · " + rangeSubline(r),
                hbars(
                    AU.geo.slice(0, 6).map(function (a) {
                        return [a[0], a[1]];
                    }),
                ),
                { more: 'data-act="advanced" data-dim="geo"' },
            ) +
            acard(
                "Formats your viewers watch on YouTube",
                "Watch time · " + rangeSubline(r),
                hbars(formats),
            ) +
            acard(
                "Top subtitle/CC languages",
                "Views · " + rangeSubline(r),
                hbars(
                    AU.subtitles.map(function (a) {
                        return [a[0], a[1]];
                    }),
                ),
            ) +
            acard(
                "Devices",
                "Watch time · " + rangeSubline(r),
                hbars(
                    AU.devices.map(function (a) {
                        return [a[0], a[1]];
                    }),
                ),
                { more: 'data-act="advanced" data-dim="device"' },
            ) +
            "</div>";
        return (
            keyCard(CHAN, mks, r, {
                sel: AN.sel.audience,
                noWarn: true,
                chartColor: "var(--c-aud)",
                onSel: function (k) {
                    AN.sel.audience = k;
                },
            }) + cards
        );
    }
    function anRevenue(r) {
        var mks = ["rev", "rpm", "cpm"];
        var months = [],
            d = dt(TODAY);
        for (var k = 5; k >= 0; k--) {
            var mm = d.getUTCMonth() - k,
                yy = d.getUTCFullYear();
            while (mm < 0) {
                mm += 12;
                yy--;
            }
            var a = Math.max(BIRTH, idxOf(Date.UTC(yy, mm, 1))),
                b = Math.min(YDAY, idxOf(Date.UTC(yy, mm + 1, 0)));
            months.push({
                l: MON[mm],
                v: b >= a ? M.rev.sum(a, b) : 0,
                cur: k === 0,
            });
        }
        var mx = Math.max.apply(
            null,
            months
                .map(function (m) {
                    return m.v;
                })
                .concat([1]),
        );
        var srcs =
            AU.revenue && AU.revenue.length
                ? AU.revenue
                : [
                      ["Watch Page ads", 80],
                      ["YouTube Premium", 14],
                      ["Shorts Feed ads", 6],
                  ];
        var rev = M.rev.sum(r.a, r.b);
        var topE = topIn(r, null, "rev").slice(0, 5);
        var cards =
            '<div class="g2">' +
            acard(
                "Monthly estimated revenue",
                "Last 6 months",
                '<div class="mbars">' +
                    months
                        .map(function (m) {
                            return (
                                '<div class="mb' +
                                (m.cur ? " cur" : "") +
                                '" data-tip="' +
                                esc(
                                    m.l +
                                        ": " +
                                        money(m.v, { cents: true }) +
                                        (m.cur ? " (so far)" : ""),
                                ) +
                                '"><span class="mb-v">' +
                                esc(
                                    money(m.v, {
                                        short: true,
                                        cents: m.v < 1000,
                                    }),
                                ) +
                                '</span><i style="height:' +
                                ((m.v / mx) * 100).toFixed(1) +
                                '%"></i><span class="mb-l">' +
                                m.l +
                                "</span></div>"
                            );
                        })
                        .join("") +
                    "</div>",
            ) +
            acard(
                "How you make money",
                rangeSubline(r),
                hbars(
                    srcs.map(function (s) {
                        return [s[0], s[1]];
                    }),
                    {
                        fmt: function (p) {
                            return money((rev * p) / 100, {
                                cents: (rev * p) / 100 < 1000,
                            });
                        },
                    },
                ) +
                    '<p class="muted sm">Revenue sources include ads, YouTube Premium and Shorts Feed ads. Memberships and Supers are shown when you earn from them.</p>',
            ) +
            acard(
                "Top-earning content",
                "Estimated revenue · " + rangeSubline(r),
                topE.length
                    ? topE
                          .map(function (x) {
                              return (
                                  '<a class="mt" href="' +
                                  esc(
                                      urlFor("video/" + x.v.key + "/analytics"),
                                  ) +
                                  '" data-go="video/' +
                                  x.v.key +
                                  '/analytics">' +
                                  thumbImg(
                                      x.v,
                                      "mt-th" + (x.v.short ? " sh" : ""),
                                  ) +
                                  '<span class="mt-t">' +
                                  esc(x.v.title) +
                                  '</span><span class="mt-v">' +
                                  money(x.rev, { cents: true }) +
                                  "</span></a>"
                              );
                          })
                          .join("")
                    : '<div class="nd">Not enough data to show this report</div>',
            ) +
            acard(
                "Revenue sources",
                rangeSubline(r),
                '<div class="rsrc">' +
                    [
                        ["Ads", 0.84],
                        ["YouTube Premium", 0.12],
                        ["Shorts Feed", 0.04],
                    ]
                        .map(function (s) {
                            return (
                                '<div class="kv"><span>' +
                                s[0] +
                                "</span><span>" +
                                money(rev * s[1], { cents: true }) +
                                "</span></div>"
                            );
                        })
                        .join("") +
                    '</div><div class="kv strong"><span>Total</span><span>' +
                    money(rev, { cents: true }) +
                    "</span></div>",
            ) +
            "</div>";
        return (
            keyCard(CHAN, mks, r, {
                sel: AN.sel.revenue,
                chartColor: "var(--c-rev)",
                onSel: function (k) {
                    AN.sel.revenue = k;
                },
            }) + cards
        );
    }
    function anTrends(r) {
        var searches = AU.search.map(function (s, i) {
            return {
                t: s[0],
                v: i < 2 ? "High" : i < 4 ? "Medium" : "Low",
                gap: i === 3 || i === 5,
            };
        });
        var extra = ideasFor(6)
            .slice(0, 4)
            .map(function (t) {
                return {
                    t: t.toLowerCase().replace(/[“”"]/g, "").slice(0, 48),
                    v: "Medium",
                    gap: true,
                };
            });
        return (
            '<div class="g2 tr2">' +
            acard(
                "Your viewers’ searches",
                "Searches by your viewers across YouTube · Last 28 days",
                '<div class="srt"><div class="srt-h"><span>Search term</span><span>Search volume</span></div>' +
                    searches
                        .concat(extra.slice(0, 3))
                        .map(function (s) {
                            return (
                                '<div class="srt-r"><span>' +
                                ic("search") +
                                esc(s.t) +
                                (s.gap
                                    ? '<span class="gap" data-tip="Viewers search for this, but there isn’t much content about it">Content gap</span>'
                                    : "") +
                                '</span><span class="vol v' +
                                s.v.charAt(0) +
                                '"><i></i><i></i><i></i>' +
                                s.v +
                                "</span></div>"
                            );
                        })
                        .join("") +
                    "</div>",
                {
                    info: "Searches your viewers made on YouTube in the last 28 days",
                },
            ) +
            acard(
                "Searches across YouTube",
                "Find what viewers are searching for",
                '<div class="sx"><div class="sx-in">' +
                    ic("search") +
                    '<input id="trq" placeholder="Search a topic" autocomplete="off"></div><div class="sx-r" id="trr"><p class="muted">Search a topic to see what viewers are looking for and how much content already covers it.</p></div></div>',
            ) +
            acard(
                "Saved ideas",
                "",
                '<p class="muted">Save searches to come back to them when you plan your next video.</p>',
            ) +
            acard(
                "Brainstorm with Ask Studio",
                "",
                '<p class="muted">Turn a search into a title, outline and thumbnail ideas.</p><div class="cbtns">' +
                    btn(
                        "Brainstorm ideas",
                        'data-ask="Give me video ideas for my channel"',
                        "tonal",
                        "sparkle",
                    ) +
                    "</div>",
            ) +
            "</div>"
        );
    }

    /* ── Audience retention ──────────────────────────────────── */
    function retentionCurve(v, apvOverride) {
        var r = rng(v.key + ":ret"),
            N = 101,
            out = new Array(N);
        var apv = clamp(
            (apvOverride || v.apv) / 100,
            0.05,
            v.short ? 1.6 : 0.92,
        );
        if (v.short) {
            // Shorts loop: retention can stay above 100%.
            var s0 = clamp(apv * 1.25, 0.6, 1.9),
                lo = 0.0001,
                hi = 8,
                k = 1;
            var mean = function (k) {
                return (s0 * (1 - Math.exp(-k))) / k;
            };
            if (mean(lo) < apv) {
                s0 = (apv / mean(0.6)) * 1.0;
            }
            for (var it = 0; it < 50; it++) {
                k = (lo + hi) / 2;
                if (mean(k) > apv) lo = k;
                else hi = k;
            }
            for (var i = 0; i < N; i++) {
                var x = i / (N - 1);
                out[i] = s0 * Math.exp(-k * x) * (1 + (r() - 0.5) * 0.02);
            }
            return out;
        }
        var x0 = clamp(30 / Math.max(60, v.dur), 0.02, 0.1),
            p0 = clamp(0.58 + apv * 0.5, 0.55, 0.92);
        var meanFor = function (k) {
            var s = 0,
                n = 200;
            for (var j = 0; j <= n; j++) {
                var x = j / n;
                s +=
                    x < x0
                        ? 1 - (1 - p0) * (x / x0)
                        : p0 * Math.exp(-k * (x - x0));
            }
            return s / (n + 1);
        };
        if (meanFor(0) < apv)
            p0 = Math.min(0.97, p0 + (apv - meanFor(0)) * 1.4);
        var lo2 = 0,
            hi2 = 12,
            kk = 1;
        for (var it2 = 0; it2 < 50; it2++) {
            kk = (lo2 + hi2) / 2;
            if (meanFor(kk) > apv) lo2 = kk;
            else hi2 = kk;
        }
        var bumps = [
            [0.15 + r() * 0.6, 0.04 + r() * 0.05],
            [0.2 + r() * 0.7, 0.02 + r() * 0.03],
        ];
        for (var i2 = 0; i2 < N; i2++) {
            var x2 = i2 / (N - 1),
                y =
                    x2 < x0
                        ? 1 - (1 - p0) * (x2 / x0)
                        : p0 * Math.exp(-kk * (x2 - x0));
            bumps.forEach(function (b) {
                y += b[1] * y * Math.exp(-Math.pow((x2 - b[0]) / 0.025, 2));
            });
            if (x2 > 0.96) y *= 1 - ((x2 - 0.96) / 0.04) * 0.35; // end screen
            out[i2] = Math.max(0.005, y * (1 + (r() - 0.5) * 0.015));
        }
        out[0] = 1;
        return out;
    }
    function typicalApv(v) {
        var pool = (v.short ? SHORTS : LONG)
            .filter(function (x) {
                return x !== v;
            })
            .slice(0, 10);
        if (!pool.length) return v.apv;
        return (
            pool.reduce(function (a, x) {
                return a + x.apv;
            }, 0) / pool.length
        );
    }
    function retentionChart(host, v, opt) {
        if (!host || !v) return;
        opt = opt || {};
        var cur = retentionCurve(v),
            typ = retentionCurve({
                key: v.key + "t",
                short: v.short,
                dur: v.dur,
                apv: typicalApv(v),
            });
        var mx = Math.max(
            1,
            Math.max.apply(null, cur),
            Math.max.apply(null, typ),
        );
        var pts = cur.map(function (y, i) {
            return { t: i, v: y * 100 };
        });
        lineChart(host, pts, {
            mk: "pct",
            h: opt.h || 150,
            max: mx <= 1.0001 ? 100 : Math.ceil((mx * 100) / 50) * 50,
            steps: 3,
            color: "var(--c-eng)",
            compare: typ.map(function (y, i) {
                return { t: i, v: y * 100 };
            }),
            xFmt: function (i) {
                return mmss((i / 100) * v.dur);
            },
            xw: 70,
            area: true,
            tip: function (p, i) {
                return (
                    '<div class="tt-d">' +
                    mmss((i / 100) * v.dur) +
                    '</div><div class="tt-r"><span>Audience retention</span><b>' +
                    Math.round(p.v) +
                    '%</b></div><div class="tt-r"><span>Typical retention</span><b>' +
                    Math.round(typ[i] * 100) +
                    "%</b></div>"
                );
            },
        });
    }

    /* ── Video pages ─────────────────────────────────────────── */
    var VA = { tab: "overview", range: {}, sel: {} };
    function videoPage(key, sub) {
        var v = byKey[key];
        if (!v) {
            view.innerHTML =
                '<div class="pg">' +
                pageHead("Video not found") +
                '<p class="muted pad">This video may have been deleted.</p></div>';
            return;
        }
        sub = sub || "edit";
        if (sub === "analytics") return videoAnalytics(v);
        if (sub === "comments") return commentsPage({ video: v });
        if (sub === "edit") return videoDetails(v);
        var titles = {
            editor: "Video editor",
            subtitles: "Video subtitles",
            copyright: "Video copyright",
            earn: "Video monetization",
            clips: "Video clips",
        };
        var bodies = {
            editor:
                '<section class="card ed"><div class="ed-pv">' +
                thumbImg(v, "ed-th", "hqdefault.jpg") +
                '<span class="ed-pl">' +
                ic("play") +
                '</span></div><div class="ed-tl"><div class="ed-rule">' +
                Array.from({ length: 11 }, function (_, i) {
                    return "<span>" + mmss((i / 10) * v.dur) + "</span>";
                }).join("") +
                '</div><div class="ed-tr vid"><span>' +
                ic("film") +
                'Video</span></div><div class="ed-tr"><span>' +
                ic("music") +
                'Audio</span></div><div class="ed-tr"><span>' +
                ic("cards") +
                'End screen</span></div><div class="ed-tr"><span>' +
                ic("info") +
                "Info cards</span></div></div></section>",
            subtitles:
                '<section class="card"><div class="vt sub"><div class="tr thead"><div class="th c-v">Language</div><div class="th c-d">Modified on</div><div class="th c-vis">Title & description</div><div class="th c-vis">Subtitles</div></div><div class="tr row"><div class="td c-v">English (Video language)</div><div class="td c-d">' +
                esc(dLong(v.pub)) +
                '</div><div class="td c-vis">Published<br><span class="muted">Creator</span></div><div class="td c-vis">Published<br><span class="muted">Automatic</span></div></div></div><div class="cbtns">' +
                btn("Add language", 'data-act="noop"', "tonal") +
                "</div></section>",
            copyright:
                '<section class="card">' +
                (v.restr === "Copyright claim"
                    ? '<div class="cpr"><b>Copyright claim</b><p class="muted">Content used: “' +
                      esc(
                          pick(rng(v.key), [
                              "Midnight City (Instrumental)",
                              "Blinding Lights",
                              "Lose Yourself",
                              "Levitating",
                          ]),
                      ) +
                      "”. Impact: monetized by the claimant. The claimant can share revenue from ads that run on this video.</p>" +
                      btn("Take action", 'data-act="noop"', "tonal") +
                      "</div>"
                    : '<div class="empty sm">' +
                      ic("check-circle", "ok-ic") +
                      "<p>No issues found. Your video doesn’t contain any copyright-protected content.</p></div>") +
                "</section>",
            earn:
                '<section class="card"><div class="kv"><span>Monetization</span><span>' +
                (S.monetized
                    ? v.restr === "Copyright claim"
                        ? "Claimed"
                        : "On"
                    : "Not eligible yet") +
                '</span></div><div class="kv"><span>Ad suitability</span><span>' +
                (S.monetized ? "Suitable for most advertisers" : "–") +
                '</span></div><div class="kv"><span>Estimated revenue (since published)</span><span>' +
                (S.monetized ? money(v.rev, { cents: true }) : "–") +
                "</span></div></section>",
            clips: emptyState(
                "scissors",
                "Clips that viewers create from this video will show up here",
                "",
                "",
            ),
        };
        view.innerHTML =
            '<div class="pg vpg">' +
            pageHead(titles[sub] || "Video") +
            (bodies[sub] || "") +
            "</div>";
    }
    function videoAnalytics(v) {
        var rk = VA.range[v.key] || "p" + Math.max(BIRTH, v.pubIdx);
        var r = rangeOf(rk);
        var tab = VA.tab;
        var ent = videoEnt(v);
        var TABS = [
            ["overview", "Overview"],
            ["reach", "Reach"],
            ["engagement", "Engagement"],
            ["audience", "Audience"],
        ];
        var since = /^p\d+$/.test(r.key);
        var head = since
            ? "Your video has gotten " +
              full(v.views) +
              " views since it was published"
            : "Your video got " +
              full(ent.sum("views", r.a, r.b)) +
              " views " +
              (r.n ? "in the last " + r.n + " days" : "in " + r.label);
        var body = "";
        var share = function () {
            var tv = M.views.sum(r.a, r.b);
            return tv ? Math.min(1, ent.sum("views", r.a, r.b) / tv) : 0;
        };
        if (tab === "overview") {
            var mks = ["views", "watch", "subs"];
            if (S.monetized) mks.push("rev");
            body =
                '<div class="ov"><div class="ov-main"><h2 class="hl">' +
                esc(head) +
                "</h2>" +
                keyCard(ent, mks, r, {
                    sel: VA.sel.overview,
                    onSel: function (m) {
                        VA.sel.overview = m;
                    },
                    more: false,
                }) +
                (v.short
                    ? ""
                    : acard(
                          "Key moments for audience retention",
                          "",
                          '<div class="ret-ch big" data-v="' +
                              v.key +
                              '"></div><div class="ret-k"><div><b>' +
                              pct(v.apv) +
                              "</b><span>Average percentage viewed</span></div><div><b>" +
                              mmss(v.avd) +
                              "</b><span>Average view duration</span></div><div><b>" +
                              v.stayed +
                              "%</b><span>Stayed to watch at 0:30</span></div></div>",
                          {
                              info: "How far viewers watch into your video, compared with your typical retention (dotted)",
                          },
                      )) +
                "</div>" +
                '<div class="ov-side">' +
                videoRealtime(v) +
                videoTypical(v) +
                "</div></div>";
        } else if (tab === "reach") {
            var trs = trafficRows(v.short ? "short" : "");
            body =
                keyCard(
                    ent,
                    v.short
                        ? ["views", "uniq", "subs"]
                        : ["impr", "ctr", "views", "uniq"],
                    r,
                    {
                        sel: VA.sel.reach,
                        chartColor: "var(--c-content)",
                        onSel: function (m) {
                            VA.sel.reach = m;
                        },
                        more: false,
                    },
                ) +
                '<div class="g2">' +
                acard(
                    "Traffic source types",
                    "Views · " + rangeSubline(r),
                    hbars(
                        trs.slice(0, 6).map(function (t) {
                            return [t[0], t[1]];
                        }),
                    ),
                ) +
                (v.short
                    ? acard(
                          "How many chose to view",
                          "",
                          '<div class="cv"><div class="cv-p">' +
                              pct(viewedPct(v)) +
                              '</div><div class="muted">Viewed (vs. swiped away)</div><div class="cv-b"><i style="width:' +
                              viewedPct(v) +
                              '%"></i></div></div>',
                      )
                    : acard(
                          "Impressions and how they led to watch time",
                          rangeSubline(r),
                          '<div class="fun">' +
                              funnelStep(
                                  cmp(ent.sum("impr", r.a, r.b)),
                                  "Thumbnail impressions",
                                  100,
                                  "",
                              ) +
                              funnelStep(
                                  pct(v.ctr),
                                  "Impressions click-through rate",
                                  62,
                                  "",
                              ) +
                              funnelStep(
                                  cmp(
                                      (ent.sum("impr", r.a, r.b) * v.ctr) / 100,
                                  ),
                                  "Views from impressions",
                                  44,
                                  "",
                              ) +
                              funnelStep(
                                  mmss(v.avd),
                                  "Average view duration",
                                  30,
                                  "",
                              ) +
                              "</div>",
                      )) +
                acard(
                    "Traffic source: YouTube search",
                    "Views · " + rangeSubline(r),
                    hbars(
                        AU.search.slice(0, 5).map(function (s, i) {
                            return [
                                i === 0
                                    ? v.title
                                          .split(/[|:(\-–—]/)[0]
                                          .trim()
                                          .toLowerCase()
                                          .slice(0, 40)
                                    : s[0],
                                s[1],
                            ];
                        }),
                    ),
                ) +
                acard(
                    "Traffic source: External",
                    "Views · " + rangeSubline(r),
                    hbars(
                        AU.external.slice(0, 5).map(function (s) {
                            return [s[0], s[1]];
                        }),
                    ),
                ) +
                "</div>";
        } else if (tab === "engagement") {
            var likes = v.likes,
                dis = v.dislikes;
            body =
                keyCard(ent, ["watch", "avd"], r, {
                    sel: VA.sel.engagement,
                    chartColor: "var(--c-eng)",
                    onSel: function (m) {
                        VA.sel.engagement = m;
                    },
                    more: false,
                }) +
                '<div class="g2">' +
                (v.short
                    ? ""
                    : acard(
                          "Audience retention",
                          "",
                          '<div class="ret-ch" data-v="' + v.key + '"></div>',
                      )) +
                acard(
                    "Likes (vs. dislikes)",
                    rangeSubline(r),
                    '<div class="cv"><div class="cv-p">' +
                        pct(likePct(v)) +
                        '</div><div class="cv-b"><i style="width:' +
                        likePct(v).toFixed(1) +
                        '%"></i></div><div class="kv"><span>Likes</span><span>' +
                        full(likes) +
                        '</span></div><div class="kv"><span>Dislikes</span><span>' +
                        full(dis) +
                        '</span></div><div class="kv"><span>Comments</span><span>' +
                        full(v.comments) +
                        '</span></div><div class="kv"><span>Shares</span><span>' +
                        full(
                            Math.round(
                                v.views *
                                    0.0021 *
                                    (1 + (hash(v.key) % 40) / 100),
                            ),
                        ) +
                        "</span></div></div>",
                ) +
                (v.short
                    ? ""
                    : acard(
                          "End screen element click rate",
                          rangeSubline(r),
                          '<div class="cv"><div class="cv-p">' +
                              pct(1.2 + (hash(v.key) % 30) / 10) +
                              '</div><div class="muted">of viewers clicked an end screen element</div></div>',
                      )) +
                acard(
                    "Top playlists",
                    "Views · " + rangeSubline(r),
                    '<div class="mt"><span class="mt-t">Uploads from ' +
                        esc(S.name) +
                        '</span><span class="mt-v">' +
                        full(ent.sum("views", r.a, r.b) * 0.06) +
                        "</span></div>",
                ) +
                "</div>";
        } else {
            var uniq = ent.sum("uniq", r.a, r.b);
            body =
                keyCard(ent, ["ret", "uniq", "subs"], r, {
                    sel: VA.sel.audience,
                    chartColor: "var(--c-aud)",
                    onSel: function (m) {
                        VA.sel.audience = m;
                    },
                    more: false,
                    noWarn: true,
                }) +
                '<div class="g2">' +
                acard(
                    "Audience by watch behavior",
                    rangeSubline(r),
                    '<div class="beh">' +
                        AU.behavior
                            .map(function (b, i) {
                                return (
                                    '<div class="beh-c"><div class="beh-v">' +
                                    cmp((uniq * b[1]) / 100) +
                                    '</div><div class="beh-l"><i class="sw s' +
                                    i +
                                    '"></i>' +
                                    esc(b[0]) +
                                    "</div></div>"
                                );
                            })
                            .join("") +
                        "</div>",
                ) +
                acard(
                    "Age and gender",
                    "Views · " + rangeSubline(r),
                    hbars(
                        AU.age.map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                ) +
                acard(
                    "Top geographies",
                    "Views · " + rangeSubline(r),
                    hbars(
                        AU.geo.slice(0, 5).map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                ) +
                acard(
                    "Watch time from subscribers",
                    "Watch time · " + rangeSubline(r),
                    hbars(
                        AU.subscribed.map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                ) +
                "</div>";
        }
        void share;
        view.innerHTML =
            '<div class="pg an va">' +
            pageHead(
                "Video analytics",
                btn(
                    "Advanced mode",
                    'data-act="advanced" data-v="' + v.key + '"',
                ),
            ) +
            (S.ai
                ? '<div class="aichips">' +
                  [
                      "Summarize this video’s performance",
                      "How did viewers find this video?",
                      "Why did viewers stop watching?",
                  ]
                      .map(function (q) {
                          return btn(
                              q,
                              'data-ask="' +
                                  esc(q) +
                                  '" data-askv="' +
                                  v.key +
                                  '"',
                              "tonal chip",
                              "sparkle",
                          );
                      })
                      .join("") +
                  "</div>"
                : "") +
            '<div class="an-bar">' +
            tabsBar(TABS, tab, "data-vtab") +
            '<span class="fl"></span>' +
            datePicker(r, "vdp") +
            "</div>" +
            '<div class="an-body">' +
            body +
            "</div>" +
            footer() +
            "</div>";
        placeInk($(".an-bar"));
        afterRender(function () {
            $$(".ret-ch").forEach(function (h) {
                retentionChart(h, byKey[h.getAttribute("data-v")], {
                    h: h.classList.contains("big") ? 170 : 130,
                });
            });
        });
        flushAfter();
        var vdp = $(".vdp");
        if (vdp)
            vdp.addEventListener("click", function (e) {
                e.stopPropagation();
                pickRange(
                    vdp,
                    rk,
                    function (k) {
                        VA.range[v.key] = k;
                        videoAnalytics(v);
                    },
                    [["p" + Math.max(BIRTH, v.pubIdx), "Since published"], "-"],
                );
            });
    }
    function videoRealtime(v) {
        var bars = v.h48 || new Array(48).fill(0),
            tot = bars.reduce(function (a, b) {
                return a + b;
            }, 0);
        afterRender(function () {
            var h = $("#vrt-bars");
            if (h)
                barChart(h, bars, {
                    h: 56,
                    tip: function (i, n) {
                        var k = bars.length - 1 - i;
                        return (
                            '<div class="tt-d">' +
                            (k === 0
                                ? "Now"
                                : k + (k === 1 ? " hour ago" : " hours ago")) +
                            '</div><div class="tt-r"><span>Views</span><b>' +
                            full(n) +
                            "</b></div>"
                        );
                    },
                });
        });
        return (
            '<section class="card rtc"><h3 class="ac-t">Realtime</h3><div class="rt-live"><i class="pulse"></i>Updating live</div><hr><div class="rt-n">' +
            full(tot) +
            '</div><div class="ac-s">Views · Last 48 hours</div><div class="rt-b" id="vrt-bars"></div><div class="rt-ax"><span>-48h</span><span>Now</span></div></section>'
        );
    }
    function videoTypical(v) {
        var rk = rankOf(v),
            ent = videoEnt(v),
            r = rangeOf("p" + Math.max(BIRTH, v.pubIdx));
        var rows = [["views", "Views"]]
            .concat(v.short ? [] : [["ctr", "Thumbnail click-through rate"]])
            .concat([["avd", "Average view duration"]]);
        return (
            '<section class="card lcc"><h3 class="ac-t">Performance</h3><div class="ac-s">' +
            esc(firstLabel(v)) +
            " compared to your typical performance</div>" +
            '<div class="kv"><span>Ranking by views</span><span>' +
            rk.rank +
            " of " +
            rk.of +
            "</span></div>" +
            rows
                .map(function (rw) {
                    var vs = ent.vs(rw[0], r);
                    var dir = vs.base
                            ? vs.cur > vs.base * 1.1
                                ? 1
                                : vs.cur < vs.base * 0.9
                                  ? -1
                                  : 0
                            : 0,
                        has = !!vs.base;
                    return (
                        '<div class="kv"><span>' +
                        rw[1] +
                        '</span><span class="kv-v">' +
                        (rw[0] === "views"
                            ? cmp(v.views)
                            : rw[0] === "ctr"
                              ? pct(v.ctr)
                              : mmss(v.avd)) +
                        '<span data-tip="' +
                        esc(
                            ent.vsText(rw[0], vs) ||
                                "Not enough data to compare yet",
                        ) +
                        '">' +
                        trendIcon(dir, has) +
                        "</span></span></div>"
                    );
                })
                .join("") +
            "</section>"
        );
    }

    /* Video details (edit page) */
    function videoDetails(v) {
        var draft = {
            title: v.title,
            desc: v.desc || "",
            kids: v.kids || "no",
            vis: v.vis,
        };
        var counter = function (n, max) {
            return '<span class="cnt">' + n + "/" + max + "</span>";
        };
        view.innerHTML =
            '<div class="pg vd">' +
            pageHead(
                "Video details",
                btn("Undo changes", 'data-act="undo" disabled', "text") +
                    btn("Save", 'data-act="save" disabled', "filled") +
                    ibtn("more", 'data-act="vdmore"', "More"),
            ) +
            '<div class="vd-g"><div class="vd-l">' +
            '<label class="fld"><span class="fl-l">Title (required)</span><textarea id="vd-t" rows="2" maxlength="100">' +
            esc(draft.title) +
            "</textarea>" +
            counter(draft.title.length, 100) +
            "</label>" +
            '<label class="fld tall"><span class="fl-l">Description</span><textarea id="vd-d" rows="7" maxlength="5000" placeholder="Tell viewers about your video (type @ to mention a channel)">' +
            esc(draft.desc) +
            "</textarea>" +
            counter(draft.desc.length, 5000) +
            "</label>" +
            '<h3 class="vd-h">Thumbnail</h3><p class="muted sm">Set a thumbnail that stands out and draws viewers’ attention.</p><div class="thg"><button class="tho" data-act="thupload">' +
            ic("image") +
            '<span>Upload file</span></button><button class="tho" data-act="thauto">' +
            ic("sparkle") +
            '<span>Auto-generated</span></button><button class="tho" data-act="thtest">' +
            ic("compare") +
            '<span>Test &amp; compare</span></button><span class="thc on">' +
            thumbImg(v, "thc-i") +
            "</span></div>" +
            '<h3 class="vd-h">Playlists</h3><p class="muted sm">Add your video to one or more playlists to organize your content for viewers.</p><button class="sel" data-act="playlist"><span>Select</span>' +
            ic("caret") +
            "</button>" +
            '<h3 class="vd-h">Audience</h3><p class="sm"><b>This video is set to not made for kids</b> <span class="muted">Set by you</span></p><p class="muted sm">Regardless of your location, you’re legally required to comply with the Children’s Online Privacy Protection Act (COPPA) and/or other laws.</p>' +
            '<label class="rad"><span class="rb' +
            (draft.kids === "yes" ? " on" : "") +
            '" data-kids="yes"></span><span>Yes, it’s made for kids</span></label><label class="rad"><span class="rb' +
            (draft.kids === "no" ? " on" : "") +
            '" data-kids="no"></span><span>No, it’s not made for kids</span></label>' +
            '<button class="btn text more-b" data-act="showmore"><span>Show more</span></button><div class="vd-more" hidden><h3 class="vd-h">Tags</h3><input class="inp" placeholder="Add tag"><h3 class="vd-h">Language and captions certification</h3><button class="sel"><span>English</span>' +
            ic("caret") +
            '</button><h3 class="vd-h">Category</h3><button class="sel"><span>' +
            esc(
                {
                    GAMING: "Gaming",
                    TECH: "Science & Technology",
                    VLOG: "People & Blogs",
                    MUSIC: "Music",
                    FITNESS: "Howto & Style",
                    EDUCATION: "Education",
                    FOOD: "Howto & Style",
                    ENTERTAINMENT: "Entertainment",
                    FINANCE: "Education",
                    COMEDY: "Comedy",
                    AUTOMATION: "Science & Technology",
                }[S.niche] || "People & Blogs",
            ) +
            "</span>" +
            ic("caret") +
            "</button></div>" +
            '</div><div class="vd-r"><div class="vd-card"><a class="vd-pl" href="https://www.youtube.com/' +
            (v.short ? "shorts/" : "watch?v=") +
            esc(v.vid) +
            '" target="_blank" rel="noopener">' +
            thumbImg(v, "vd-th", "hqdefault.jpg") +
            '<span class="vd-pb">' +
            ic("play") +
            '</span><span class="dur">' +
            mmss(v.dur) +
            "</span></a>" +
            '<div class="vd-i"><div class="muted sm">Video link</div><div class="vd-link"><a href="https://youtu.be/' +
            esc(v.vid) +
            '" target="_blank" rel="noopener">https://youtu.be/' +
            esc(v.vid) +
            "</a>" +
            ibtn(
                "copy",
                'data-act="copylink" data-link="https://youtu.be/' +
                    esc(v.vid) +
                    '"',
                "Copy video link",
            ) +
            '</div><div class="muted sm">Filename</div><div class="sm">' +
            esc(
                v.title
                    .replace(/[^\w ]+/g, "")
                    .trim()
                    .slice(0, 32)
                    .replace(/\s+/g, "_") || "video",
            ) +
            '.mp4</div><div class="muted sm">Video quality</div><div class="vq"><span>SD</span><span>HD</span>' +
            (v.dur > 240 ? "<span>4K</span>" : "") +
            "</div></div></div>" +
            '<button class="vbox" data-act="vdvis"><span class="muted sm">Visibility</span><span class="vb-v">' +
            ic(visIcon(v)) +
            "<span>" +
            esc(v.vis) +
            "</span>" +
            ic("caret") +
            "</span></button>" +
            '<div class="vbox"><span class="muted sm">Restrictions</span><span class="vb-v">' +
            (v.restr === "None" ? "None" : esc(v.restr)) +
            "</span></div>" +
            '<div class="vbox lnk" data-go="video/' +
            v.key +
            '/subtitles"><span>' +
            ic("subtitles") +
            "Subtitles</span>" +
            ic("chev-right") +
            "</div>" +
            '<div class="vbox lnk" data-act="endscreen"><span>' +
            ic("cards") +
            "End screen</span>" +
            ic("chev-right") +
            "</div>" +
            '<div class="vbox lnk" data-act="cards"><span>' +
            ic("info") +
            "Cards</span>" +
            ic("chev-right") +
            "</div></div></div></div>";
        var dirty = function () {
            var t = $("#vd-t").value,
                d = $("#vd-d").value,
                k = ($(".rb.on[data-kids]") || {}).getAttribute
                    ? $(".rb.on[data-kids]").getAttribute("data-kids")
                    : "no";
            var ch =
                t !== v.title || d !== (v.desc || "") || k !== (v.kids || "no");
            $("[data-act=save]").disabled = !ch || !t.trim();
            $("[data-act=undo]").disabled = !ch;
            $$(".fld .cnt")[0].textContent = t.length + "/100";
            $$(".fld .cnt")[1].textContent = d.length + "/5000";
        };
        $("#vd-t").addEventListener("input", dirty);
        $("#vd-d").addEventListener("input", dirty);
        $$(".rb[data-kids]").forEach(function (rb) {
            rb.parentNode.addEventListener("click", function () {
                $$(".rb[data-kids]").forEach(function (x) {
                    x.classList.remove("on");
                });
                rb.classList.add("on");
                dirty();
            });
        });
        $("[data-act=undo]").addEventListener("click", function () {
            videoDetails(v);
        });
        $("[data-act=save]").addEventListener("click", function () {
            v.title = $("#vd-t").value.trim();
            v.desc = $("#vd-d").value;
            v.kids = $(".rb.on[data-kids]").getAttribute("data-kids");
            renderNav();
            videoDetails(v);
            toast("Changes saved");
        });
        $("[data-act=showmore]").addEventListener("click", function () {
            var m = $(".vd-more");
            m.hidden = !m.hidden;
            this.firstChild.textContent = m.hidden ? "Show more" : "Show less";
        });
    }

    /* ── Community (comments) ────────────────────────────────── */
    var CM = {
        filter: "published",
        sort: "relevant",
        unresp: true,
        replies: {},
        liked: {},
        hearted: {},
        hidden: {},
    };
    P.C.forEach(function (c, i) {
        c.id = "c" + i;
        c.ts =
            S.now -
            c.d * DAY -
            (hash(c.a + i) % 22) * HOUR -
            (hash(c.t) % 50) * 60000;
        if (c.h) CM.hearted[c.id] = true;
    });
    function commentsPage(opt) {
        opt = opt || {};
        var v = opt.video,
            tab = opt.tab || "comments";
        var list = P.C.filter(function (c) {
            return (
                !CM.hidden[c.id] &&
                (!v || c.v === v.key) &&
                (!CM.unresp ||
                    !(CM.replies[c.id] || []).length ||
                    CM.keep === c.id)
            );
        });
        if (CM.sort === "newest")
            list.sort(function (a, b) {
                return b.ts - a.ts;
            });
        else
            list.sort(function (a, b) {
                return (
                    b.l +
                    (b.ts > S.now - DAY ? 40 : 0) -
                    (a.l + (a.ts > S.now - DAY ? 40 : 0))
                );
            });
        var held = CM.filter === "held";
        var body = held
            ? '<div class="empty sm">' +
              ic("check-circle", "ok-ic") +
              "<p>No comments held for review</p></div>"
            : list.length
              ? list.map(commentRow).join("")
              : '<div class="empty sm"><p class="muted">' +
                (v
                    ? "This video doesn’t have any comments yet"
                    : "Comments on your videos will show up here") +
                "</p></div>";
        view.innerHTML =
            '<div class="pg cmts">' +
            pageHead(v ? "Video comments" : "Community") +
            (v
                ? ""
                : '<div class="ct-tabs">' +
                  tabsBar(
                      [
                          ["comments", "Comments"],
                          ["posts", "Viewer posts"],
                          ["mentions", "Mentions"],
                      ],
                      tab,
                      "data-cmtab",
                  ) +
                  "</div>") +
            (tab === "comments"
                ? '<div class="cm-bar">' +
                  ic("filter", "fb-ic") +
                  '<button class="fc" data-act="cmfilter"><span>' +
                  (held ? "Held" : "Published") +
                  "</span>" +
                  ic("caret") +
                  '</button><button class="fc" data-act="cmsort"><span>' +
                  (CM.sort === "newest" ? "Newest" : "Most relevant") +
                  "</span>" +
                  ic("caret") +
                  '</button><button class="fc" data-act="cmsearch">' +
                  ic("refresh") +
                  "<span>Search</span>" +
                  ic("caret") +
                  "</button>" +
                  (CM.unresp
                      ? '<span class="fc on">Response status: Unresponded<button data-act="cmunresp" aria-label="Remove">' +
                        ic("close") +
                        "</button></span>"
                      : "") +
                  '<input id="cmq" placeholder="Filter" autocomplete="off"></div>' +
                  '<div class="cm-list" id="cmlist">' +
                  body +
                  "</div>"
                : tab === "mentions"
                  ? '<div class="empty"><div class="em-art">' +
                    ic("people") +
                    "</div><p>When someone mentions your channel in a comment, it shows up here</p></div>"
                  : '<div class="empty"><div class="em-art">' +
                    ic("post") +
                    "</div><p>When viewers create posts on your channel, they show up here</p></div>") +
            "</div>";
        if (tab === "comments") bindComments();
        if (tab !== "comments" && tab !== "mentions") placeInk($(".ct-tabs"));
        else if (!v) placeInk($(".ct-tabs"));
    }
    // AI suggested replies Studio shows under some comments.
    function suggestReplies(c) {
        var h = hash(c.id + c.t),
            t = c.t.toLowerCase();
        if (!S.ai || h % 5 > 1) return [];
        if (/\?/.test(t))
            return [
                "Great question! I’ll cover it soon.",
                "Let me know if you find a faster way.",
            ];
        if (
            /(love|great|amazing|best|thank|helpful|awesome|favorite|fire|goat)/.test(
                t,
            )
        )
            return [
                "I appreciate that!",
                "Glad you like them!",
                "Thank you so much!",
            ];
        return ["I appreciate that!", "Glad to help"];
    }
    function subsChip(c) {
        var h = hash(c.a + "subs");
        if (h % 7) return "";
        var n = [12, 140, 312, 1200, 8400, 48000, 1100000][
            (h % 7) + ((h >> 3) % 3)
        ];
        return '<span class="cm-sc">' + cmp(n || 312) + " subscribers</span>";
    }
    function commentRow(c) {
        var v = byKey[c.v],
            liked = CM.liked[c.id],
            heart = CM.hearted[c.id],
            reps = CM.replies[c.id] || [],
            sug = reps.length ? [] : suggestReplies(c);
        return (
            '<div class="cm" data-c="' +
            c.id +
            '">' +
            letterAv(c, 40) +
            '<div class="cm-b"><div class="cm-m"><span class="cm-a">' +
            esc(c.a) +
            '</span><span class="muted"> • ' +
            esc(ago(c.ts)) +
            "</span>" +
            subsChip(c) +
            '</div><div class="cm-t">' +
            esc(c.t) +
            "</div>" +
            '<div class="cm-x"><button class="btn tonal sm" data-act="reply">Reply</button><span class="cm-r">' +
            (reps.length
                ? reps.length +
                  " repl" +
                  (reps.length === 1 ? "y" : "ies") +
                  " " +
                  ic("chev-up")
                : "0 replies " + ic("chev-down")) +
            "</span>" +
            ibtn(liked ? "thumb-up-f" : "like", 'data-act="clike"', "Like") +
            '<span class="cm-n">' +
            (c.l + (liked ? 1 : 0) || "") +
            "</span>" +
            ibtn("thumb-down-o", 'data-act="cdis"', "Dislike") +
            '<button class="ib heart' +
            (heart ? " on" : "") +
            '" data-act="cheart" data-tip="' +
            (heart ? "Remove heart" : "Heart") +
            '">' +
            (heart ? avatar(16, "hav") + ic("heart-f", "hh") : ic("heart")) +
            "</button>" +
            ibtn("more", 'data-act="cmore"', "Options") +
            "</div>" +
            (sug.length
                ? '<div class="cm-sug">' +
                  sug
                      .map(function (s) {
                          return (
                              '<button class="cm-sg" data-act="sugrep" data-t="' +
                              esc(s) +
                              '">' +
                              esc(s) +
                              "</button>"
                          );
                      })
                      .join("") +
                  ibtn("more", 'data-act="sugmore"', "More") +
                  "</div>"
                : "") +
            '<div class="cm-reps">' +
            reps
                .map(function (t) {
                    return (
                        '<div class="cm rep">' +
                        avatar(24) +
                        '<div class="cm-b"><div class="cm-m"><span class="cm-a own">' +
                        esc(S.handle) +
                        '</span><span class="muted"> • just now</span></div><div class="cm-t">' +
                        esc(t) +
                        "</div></div></div>"
                    );
                })
                .join("") +
            "</div></div>" +
            (v
                ? '<a class="cm-v" href="' +
                  esc(urlFor("video/" + v.key + "/analytics")) +
                  '" data-go="video/' +
                  v.key +
                  '/analytics">' +
                  thumbImg(v, "cm-th") +
                  '<span class="cm-vt">' +
                  esc(v.title) +
                  "</span></a>"
                : "") +
            "</div>"
        );
    }
    function bindComments() {
        var list = $("#cmlist");
        if (!list) return;
        var q = $("#cmq");
        if (q)
            q.addEventListener("input", function () {
                var s = q.value.toLowerCase();
                $$(".cm[data-c]", list).forEach(function (el) {
                    el.style.display =
                        !s || el.textContent.toLowerCase().indexOf(s) >= 0
                            ? ""
                            : "none";
                });
            });
        list.addEventListener("click", function (e) {
            var b = e.target.closest("[data-act]");
            if (!b) return;
            var row = b.closest(".cm[data-c]"),
                id = row && row.getAttribute("data-c"),
                c = P.C.filter(function (x) {
                    return x.id === id;
                })[0];
            if (!c) return;
            var act = b.getAttribute("data-act");
            if (act === "clike") {
                CM.liked[id] = !CM.liked[id];
                row.outerHTML = commentRow(c);
            } else if (act === "cheart") {
                CM.hearted[id] = !CM.hearted[id];
                row.outerHTML = commentRow(c);
            } else if (act === "cdis") b.classList.toggle("on");
            else if (act === "sugrep") {
                (CM.replies[id] = CM.replies[id] || []).push(
                    b.getAttribute("data-t"),
                );
                CM.keep = id;
                row.outerHTML = commentRow(c);
                toast("Reply added");
            } else if (act === "sugmore")
                menuAt(
                    b,
                    [
                        { t: "Turn off suggested replies", ic: "hide" },
                        { t: "Send feedback", ic: "feedback" },
                    ],
                    function (it) {
                        if (/Turn off/.test(it.t)) {
                            S.ai = false;
                            render(ST.route, { keepScroll: true });
                            toast("Suggested replies turned off");
                        } else toast("Thanks for your feedback");
                    },
                );
            else if (act === "reply") {
                if ($(".rbox", row)) return;
                var box = document.createElement("div");
                box.className = "rbox";
                box.innerHTML =
                    avatar(24) +
                    '<div class="rb-b"><input placeholder="Add a reply..." maxlength="500"><div class="rb-f">' +
                    ibtn("emoji", "", "Emoji") +
                    '<span class="fl"></span>' +
                    btn("Cancel", 'data-r="x"', "text") +
                    btn("Reply", 'data-r="ok" disabled', "filled") +
                    "</div></div>";
                $(".cm-x", row).after(box);
                var inp = $("input", box);
                inp.focus();
                inp.addEventListener("input", function () {
                    $("[data-r=ok]", box).disabled = !inp.value.trim();
                });
                inp.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" && inp.value.trim())
                        $("[data-r=ok]", box).click();
                });
                $("[data-r=x]", box).addEventListener("click", function (ev) {
                    ev.stopPropagation();
                    box.remove();
                });
                $("[data-r=ok]", box).addEventListener("click", function (ev) {
                    ev.stopPropagation();
                    (CM.replies[id] = CM.replies[id] || []).push(
                        inp.value.trim(),
                    );
                    CM.keep = id;
                    row.outerHTML = commentRow(c);
                    toast("Reply added");
                });
            } else if (act === "cmore") {
                menuAt(
                    b,
                    [
                        { t: "Pin", ic: "pin" },
                        { t: "Hide user from channel", ic: "hide" },
                        { t: "Report", ic: "flag" },
                        "-",
                        { t: "Remove", ic: "trash" },
                    ],
                    function (it) {
                        if (it.t === "Remove") {
                            CM.hidden[id] = true;
                            row.remove();
                            toast("Comment removed", {
                                t: "Undo",
                                f: function () {
                                    delete CM.hidden[id];
                                    render(ST.route);
                                },
                            });
                        } else if (it.t === "Pin") toast("Comment pinned");
                        else if (it.t === "Hide user from channel")
                            toast("User hidden from your channel");
                        else toast("Thanks for reporting");
                    },
                );
            }
        });
    }

    /* ── Earn ────────────────────────────────────────────────── */
    function earnPage(tab) {
        tab = tab || "overview";
        if (!S.monetized) return earnNotYet();
        var TABS = [
            ["overview", "Overview"],
            ["watchads", "Watch Page Ads"],
            ["shortsads", "Shorts Feed Ads"],
            ["memberships", "Memberships"],
            ["supers", "Supers"],
            ["shopping", "Shopping"],
            ["partnerships", "Partnerships"],
        ];
        var r28 = rangeOf("last28"),
            rev28 = M.rev.sum(r28.a, r28.b),
            d = dt(TODAY);
        var mStart = idxOf(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
            thisMonth = M.rev.sum(mStart, YDAY);
        var pm = d.getUTCMonth() - 1,
            py = d.getUTCFullYear();
        if (pm < 0) {
            pm += 12;
            py--;
        }
        var lastMonth = M.rev.sum(
            Math.max(BIRTH, idxOf(Date.UTC(py, pm, 1))),
            idxOf(Date.UTC(py, pm + 1, 0)),
        );
        var pays = [];
        for (var k = 1; k <= 6; k++) {
            var mm = d.getUTCMonth() - k,
                yy = d.getUTCFullYear();
            while (mm < 0) {
                mm += 12;
                yy--;
            }
            var a = idxOf(Date.UTC(yy, mm, 1)),
                b = idxOf(Date.UTC(yy, mm + 1, 0));
            if (b < BIRTH) break;
            var paid = Date.UTC(yy, mm + 1, 21 + (hash(S.id + k) % 4));
            if (paid > S.now) continue;
            pays.push({
                d: paid,
                amt: M.rev.sum(Math.max(a, BIRTH), b),
                m: MONTH[mm] + " " + yy,
            });
        }
        var joined = dayMs(
            Math.max(BIRTH, L - Math.min(S.age - 30, 900 + (hash(S.id) % 400))),
        );
        var body;
        var pub =
            "pub-" +
            String(1e15 + ((hash(S.id + "pub") * 7919) % 9e15)).slice(0, 16);
        var using = [
            ["earn", "Watch Page Ads", "watchads", "#ff7a00"],
            ["shorts", "Shorts Feed Ads", "shortsads", "#f2b600"],
        ]
            .concat(
                S.subs > 50000
                    ? [["badge", "Memberships", "memberships", "#2ba640"]]
                    : [],
            )
            .concat(
                S.subs > 20000
                    ? [["heart", "Supers", "supers", "#e3367a"]]
                    : [],
            )
            .concat([["bag", "Shopping", "shopping", "#3e7bfa"]]);
        if (tab === "overview") {
            body =
                '<div class="e26"><div><h2 class="e-h">You’re a YouTube Partner</h2><h3 class="e-sh">What you’re using</h3><section class="card e-list">' +
                using
                    .map(function (u) {
                        return (
                            '<a class="e-row" href="#" data-etab="' +
                            u[2] +
                            '"><span class="e-ic" style="color:' +
                            u[3] +
                            '">' +
                            ic(u[0]) +
                            "</span><span>" +
                            u[1] +
                            "</span>" +
                            ic("chev-right", "e-go") +
                            "</a>"
                        );
                    })
                    .join("") +
                "</section>" +
                '<h3 class="e-sh">Your earnings</h3><section class="card ac"><div class="ac-s">Estimated revenue · Last 28 days</div><div class="earn-big">' +
                money(rev28, { cents: true }) +
                '</div><div class="earn-sp" id="earn-sp"></div><div class="kv"><span>This month (so far)</span><span>' +
                money(thisMonth, { cents: true }) +
                '</span></div><div class="kv"><span>Last month</span><span>' +
                money(lastMonth, { cents: true }) +
                '</span></div><div class="cbtns">' +
                btn("Go to revenue analytics", 'data-go="analytics/revenue"') +
                "</div></section></div>" +
                '<div><section class="card ac"><h3 class="ac-t">Getting paid</h3><p class="e-p">Great job! You’ve earned <b>' +
                money(thisMonth, { cents: true }) +
                "</b> so far in " +
                MONTH[d.getUTCMonth()] +
                '.</p><div class="e-sub">When you’ll get paid</div><p class="muted">If you meet the $100 payment threshold, you’ll receive a payment between the 21st and 26th of next month. <a class="lnk" href="https://support.google.com/youtube/answer/72902" target="_blank" rel="noopener">Learn more</a></p>' +
                (pays.length
                    ? '<div class="e-sub">Recent payments</div>' +
                      pays
                          .slice(0, 4)
                          .map(function (p) {
                              return (
                                  '<div class="kv"><span>' +
                                  esc(dLong(p.d)) +
                                  '<br><small class="muted">' +
                                  esc(p.m) +
                                  " earnings</small></span><span>" +
                                  money(p.amt, { cents: true }) +
                                  "</span></div>"
                              );
                          })
                          .join("")
                    : "") +
                '<p class="muted sm">To view your payment details, go to <a class="lnk" href="https://adsense.google.com" target="_blank" rel="noopener">AdSense for YouTube</a>.</p></section>' +
                '<section class="card ac"><h3 class="ac-t">YouTube payment options</h3><div class="e-pay">' +
                ic("earn", "e-pic") +
                '<div><b>AdSense for YouTube</b><div class="muted sm">ID: ' +
                esc(pub) +
                '</div><div class="muted sm">Associated on ' +
                esc(dLong(joined)) +
                "</div></div>" +
                btn("Change", 'data-act="noop"', "tonal sm") +
                "</div></section>" +
                '<section class="card ac ypp"><h3 class="ac-t">YouTube Partner Program</h3><div class="ypp-s">' +
                ic("check-circle", "ok-ic") +
                '<div><b>You’re in the YouTube Partner Program</b><div class="muted sm">Member since ' +
                esc(dLong(joined)) +
                '</div></div></div><div class="kv"><span>Monetization policies</span><span class="pos">No issues</span></div></section></div></div>';
        } else if (tab === "watchads" || tab === "shortsads") {
            var share = tab === "watchads" ? 0.86 : 0.07,
                nm = tab === "watchads" ? "Watch Page Ads" : "Shorts Feed Ads";
            body =
                '<div class="e26"><div><section class="card ac"><h3 class="ac-t">' +
                nm +
                '</h3><div class="ypp-s">' +
                ic("check-circle", "ok-ic") +
                '<div><b>On</b><div class="muted sm">' +
                (tab === "watchads"
                    ? "Earn from ads and YouTube Premium on the Watch Page"
                    : "Earn from ads that run between videos in the Shorts Feed") +
                '</div></div></div><div class="ac-s">Estimated revenue · Last 28 days</div><div class="earn-big">' +
                money(rev28 * share, { cents: true }) +
                '</div><div class="kv"><span>This month (so far)</span><span>' +
                money(thisMonth * share, { cents: true }) +
                '</span></div><div class="kv"><span>Last month</span><span>' +
                money(lastMonth * share, { cents: true }) +
                "</span></div></section></div>" +
                '<div><section class="card ac"><h3 class="ac-t">How it works</h3><p class="muted">' +
                (tab === "watchads"
                    ? "You can earn from ads on or around your videos and from YouTube Premium subscribers watching your videos on the Watch Page."
                    : "Revenue from ads in the Shorts Feed is pooled and shared with creators based on their share of Shorts views.") +
                "</p></section></div></div>";
        } else if (tab === "partnerships") {
            var r28b = rangeOf("last28"),
                mk = function (l, v2) {
                    return (
                        '<div class="mk-t"><div class="muted sm">' +
                        esc(l) +
                        '</div><div class="mk-v">' +
                        esc(v2) +
                        "</div></div>"
                    );
                };
            body =
                '<div class="e26"><div><section class="card ac"><h3 class="ac-t">Welcome to Creator Partnerships</h3><p class="muted">Creator Partnerships offers tools and solutions to help you manage your branded content deals.</p><p class="muted">You now have access to Media Kit. Media Kit helps you pitch your channel to brands by automatically creating a shareable summary of your audience insights.</p></section>' +
                '<section class="card ac"><h3 class="ac-t">Media Kit</h3><p class="muted sm">This is your personalized digital portfolio to showcase your unique audience and creative work</p><div class="mk-g">' +
                mk("Subscribers (Lifetime)", cmp(S.subs)) +
                mk("Videos published (Lifetime)", full(S.totalVideos)) +
                mk("Unique viewers", cmp(M.uniq.sum(r28b.a, r28b.b))) +
                mk("Views", cmp(M.views.sum(r28b.a, r28b.b))) +
                mk("Watch time (hours)", cmp(M.watch.sum(r28b.a, r28b.b))) +
                mk("Average view duration", mmss(M.avd.sum(r28b.a, r28b.b))) +
                "</div>" +
                '<div class="cbtns">' +
                btn("View Media Kit", 'data-act="noop"', "tonal") +
                "</div></section></div>" +
                '<div><section class="card ac"><h3 class="ac-t">Preferences</h3><div class="kv"><span>Desired rates</span><span class="muted">Not specified</span></div><div class="cbtns">' +
                btn("Set your desired rates", 'data-act="noop"', "tonal sm") +
                btn(
                    "Update business contact email",
                    'data-act="noop"',
                    "tonal sm",
                ) +
                "</div></section></div></div>";
        } else if (false) {
            body =
                '<div class="earn-g"><section class="card ac"><h3 class="ac-t">Estimated revenue</h3><div class="ac-s">Last 28 days</div><div class="earn-big">' +
                money(rev28, { cents: true }) +
                '</div><div class="earn-sp" id="earn-sp"></div><div class="kv"><span>This month (so far)</span><span>' +
                money(thisMonth, { cents: true }) +
                '</span></div><div class="kv"><span>Last month</span><span>' +
                money(lastMonth, { cents: true }) +
                '</span></div><div class="cbtns">' +
                btn("Go to revenue analytics", 'data-go="analytics/revenue"') +
                "</div></section>" +
                '<section class="card ac"><h3 class="ac-t">Payments</h3><div class="ac-s">Paid through AdSense for YouTube</div>' +
                (pays.length
                    ? pays
                          .map(function (p) {
                              return (
                                  '<div class="kv"><span>' +
                                  esc(dLong(p.d)) +
                                  '<br><small class="muted">' +
                                  esc(p.m) +
                                  " earnings</small></span><span>" +
                                  money(p.amt, { cents: true }) +
                                  "</span></div>"
                              );
                          })
                          .join("")
                    : '<p class="muted">Your first payment is sent around the 21st of the month after you reach the $100 payment threshold.</p>') +
                '<div class="cbtns"><a class="btn tonal" href="https://adsense.google.com" target="_blank" rel="noopener"><span>Go to AdSense</span></a></div></section>' +
                '<section class="card ac ypp"><h3 class="ac-t">YouTube Partner Program</h3><div class="ypp-s">' +
                ic("check-circle", "ok-ic") +
                '<div><b>You’re in the YouTube Partner Program</b><div class="muted sm">Member since ' +
                esc(dLong(joined)) +
                '</div></div></div><div class="kv"><span>Partner Program terms</span><a href="#" data-act="noop">View</a></div><div class="kv"><span>Monetization policies</span><span class="pos">No issues</span></div></section>' +
                '<section class="card ac"><h3 class="ac-t">Ways to earn</h3>' +
                [
                    ["earn", "Watch Page ads", "On"],
                    ["shorts", "Shorts Feed ads", "On"],
                    ["badge", "Memberships", S.subs > 50000 ? "On" : "Turn on"],
                    ["bag", "Shopping", "Turn on"],
                    ["heart", "Supers", S.subs > 20000 ? "On" : "Turn on"],
                    ["star", "YouTube Premium", "On"],
                ]
                    .map(function (w) {
                        return (
                            '<div class="w2e">' +
                            ic(w[0]) +
                            "<span>" +
                            w[1] +
                            '</span><span class="fl"></span>' +
                            (w[2] === "On"
                                ? '<span class="on-t">On</span>'
                                : btn(w[2], 'data-act="noop"', "text sm")) +
                            "</div>"
                        );
                    })
                    .join("") +
                "</section></div>";
        } else {
            var info = {
                memberships: [
                    "badge",
                    "Memberships",
                    "Offer channel memberships with perks like badges, emoji and members-only content.",
                ],
                shopping: [
                    "bag",
                    "Shopping",
                    "Tag products in your videos and Shorts and earn commission when viewers buy.",
                ],
                supers: [
                    "heart",
                    "Supers",
                    "Let viewers support you with Super Chat, Super Stickers and Super Thanks.",
                ],
            }[tab];
            body =
                '<section class="card earn-on">' +
                ic(info[0], "eo-ic") +
                "<h3>" +
                info[1] +
                '</h3><p class="muted">' +
                info[2] +
                "</p>" +
                btn("Get started", 'data-act="noop"', "filled") +
                "</section>";
        }
        view.innerHTML =
            '<div class="pg earn">' +
            pageHead("Earn") +
            '<div class="ct-tabs">' +
            tabsBar(TABS, tab, "data-etab") +
            "</div>" +
            body +
            footer() +
            "</div>";
        placeInk($(".ct-tabs"));
        var sp = $("#earn-sp");
        if (sp)
            lineChart(sp, series("rev", r28), {
                mk: "rev",
                h: 70,
                noAxis: true,
                xw: 400,
            });
    }
    function earnNotYet() {
        var r365 = rangeOf("last365"),
            r90 = rangeOf("last90");
        var wh = M.watch.sum(r365.a, r365.b),
            sv = M.sviews.sum(r90.a, r90.b),
            subs = S.subs;
        var bar = function (cur, goal, label, fmt) {
            var p = Math.min(100, (cur / goal) * 100);
            return (
                '<div class="yb"><div class="yb-h"><b>' +
                esc(fmt(cur)) +
                '</b><span class="muted">' +
                esc(label) +
                '</span></div><div class="yb-t"><i style="width:' +
                p.toFixed(1) +
                '%"></i></div><div class="muted sm">' +
                (p >= 100 ? "Done" : esc(fmt(goal)) + " needed") +
                "</div></div>"
            );
        };
        var t1 = subs >= 500 && (wh >= 3000 || sv >= 3e6),
            t2 = subs >= 1000 && (wh >= 4000 || sv >= 1e7);
        var BEN = [
            [
                "Watch Page Ads",
                "Earn from ads & YouTube Premium on the Watch Page",
                "You can earn from ads on or around your videos and from YouTube Premium subscribers watching your videos on the Watch Page.",
            ],
            [
                "Shorts Feed Ads",
                "Earn from ads between Shorts",
                "Get a share of the ad revenue from ads that run between videos in the Shorts Feed.",
            ],
            [
                "Memberships",
                "Offer monthly memberships",
                "Fans pay a monthly fee for perks like badges, emoji and members-only content.",
            ],
            [
                "Supers",
                "Get Super Chat, Super Stickers and Super Thanks",
                "Viewers can support you with Supers during live streams, Premieres and on your videos.",
            ],
            [
                "Shopping",
                "Feature products in your content",
                "Tag products from your store or from brands and earn when viewers buy.",
            ],
        ];
        var hero =
            '<div class="e26"><div><div class="e-ms">Next milestone ' +
            ic("private", "e-lock") +
            '</div><h2 class="e-h">Start your earning journey</h2><p class="muted">Earn income by showing ads and connecting with your fans, and gain access to creator tools and support</p><section class="card e-acc">' +
            BEN.map(function (x, i) {
                return (
                    '<details class="e-ac"' +
                    (i ? "" : " open") +
                    "><summary><b>" +
                    x[0] +
                    "</b>" +
                    ic("chev-down", "e-cv") +
                    '</summary><div class="e-acb"><b>' +
                    x[1] +
                    '</b><p class="muted">' +
                    x[2] +
                    "</p></div></details>"
                );
            }).join("") +
            '</section><p class="muted sm">Some benefits may have additional eligibility criteria.</p></div><div><section class="card ac"><h3 class="ac-t">After you apply</h3><p class="muted">We’ll check if your channel follows YouTube’s monetization policies. If everything looks good, you’re in!</p><a class="lnk" href="https://support.google.com/youtube/answer/72851" target="_blank" rel="noopener">Learn more</a></section></div></div>';
        view.innerHTML =
            '<div class="pg earn">' +
            pageHead("Earn") +
            hero +
            '<section class="card ac yppn"><div class="yp-h">' +
            ic("earn", "yp-ic") +
            "<div><h2>" +
            (t2
                ? "You’re eligible to apply"
                : "Grow your channel to join the YouTube Partner Program") +
            '</h2><p class="muted">Earn money, get creator support and more.</p></div></div>' +
            '<div class="yp-g"><div><h3 class="sh3">Unlock fan funding and Shopping</h3>' +
            bar(subs, 500, "subscribers", full) +
            bar(wh, 3000, "public watch hours · last 365 days", function (x) {
                return full(x);
            }) +
            '<p class="muted sm">or ' +
            full(sv) +
            " / 3,000,000 public Shorts views in the last 90 days</p>" +
            (t1 ? '<span class="on-t">Eligible</span>' : "") +
            "</div>" +
            '<div><h3 class="sh3">Unlock ad revenue sharing</h3>' +
            bar(subs, 1000, "subscribers", full) +
            bar(wh, 4000, "public watch hours · last 365 days", function (x) {
                return full(x);
            }) +
            '<p class="muted sm">or ' +
            full(sv) +
            " / 10,000,000 public Shorts views in the last 90 days</p></div></div>" +
            '<div class="cbtns">' +
            (t1 || t2
                ? btn("Apply now", 'data-act="ypply"', "filled")
                : btn("Get notified", 'data-act="notify"', "filled")) +
            "</div></section>" +
            footer() +
            "</div>";
    }

    /* ── Subtitles, copyright, customization, audio library ──── */
    function subtitlesPage() {
        view.innerHTML =
            '<div class="pg"><div class="ph"><h1 class="pt">Channel subtitles</h1></div><div class="ct-tabs">' +
            tabsBar(
                [
                    ["all", "All"],
                    ["drafts", "Drafts"],
                    ["published", "Published"],
                ],
                "all",
                "data-noop",
            ) +
            '</div><div class="vt sub"><div class="tr thead"><div class="th c-v">Video</div><div class="th c-d">Languages</div><div class="th c-d">Modified on</div></div>' +
            V.slice(0, 20)
                .map(function (v) {
                    return (
                        '<div class="tr row"><div class="td c-v"><a class="vt-th" data-go="video/' +
                        v.key +
                        '/subtitles" href="' +
                        esc(urlFor("video/" + v.key + "/subtitles")) +
                        '">' +
                        thumbImg(v, "vthumb") +
                        '<span class="dur">' +
                        mmss(v.dur) +
                        '</span></a><div class="vt-x"><span class="vt-t">' +
                        esc(v.title) +
                        '</span></div></div><div class="td c-d">' +
                        (hash(v.key) % 5 === 0 ? "2" : "1") +
                        '</div><div class="td c-d">' +
                        esc(dLong(v.pub)) +
                        "</div></div>"
                    );
                })
                .join("") +
            "</div></div>";
        placeInk($(".ct-tabs"));
    }
    function copyrightPage() {
        var claims = V.filter(function (v) {
            return v.restr === "Copyright claim";
        });
        view.innerHTML =
            '<div class="pg">' +
            pageHead("Content detection") +
            '<div class="ct-tabs">' +
            tabsBar(
                [
                    ["copyright", "Copyright"],
                    ["likeness", 'Likeness <span class="beta">Beta</span>'],
                ],
                "copyright",
                "data-noop",
            ) +
            "</div>" +
            '<div class="cchips">' +
            ["Matches", "Removal requests", "Messages", "Archived"]
                .map(function (x, i) {
                    return (
                        '<button class="cchip' +
                        (i ? "" : " on") +
                        '" data-act="noop">' +
                        x +
                        "</button>"
                    );
                })
                .join("") +
            "</div>" +
            (claims.length
                ? '<div class="vt sub"><div class="tr thead"><div class="th c-v">Video</div><div class="th c-d">Claimed content</div><div class="th c-d">Impact</div><div class="th c-d">Date</div></div>' +
                  claims
                      .map(function (v) {
                          return (
                              '<div class="tr row"><div class="td c-v"><span class="vt-th">' +
                              thumbImg(v, "vthumb") +
                              '</span><div class="vt-x"><span class="vt-t">' +
                              esc(v.title) +
                              '</span></div></div><div class="td c-d">' +
                              esc(
                                  pick(rng(v.key), [
                                      "Midnight City (Instrumental)",
                                      "Blinding Lights",
                                      "Lose Yourself",
                                      "Levitating",
                                  ]),
                              ) +
                              '</div><div class="td c-d">Monetized by claimant</div><div class="td c-d">' +
                              esc(dLong(v.pub + 2 * DAY)) +
                              "</div></div>"
                          );
                      })
                      .join("") +
                  "</div>"
                : '<div class="empty">' +
                  '<div class="em-art">' +
                  ic("check-circle") +
                  '</div><p>Nice work, you’re all caught up!</p><p class="muted sm">Here’s where you’ll find videos that match yours. For now, there’s nothing new.</p></div>') +
            "</div>";
        placeInk($(".ct-tabs"));
    }
    function customizationPage(tab) {
        tab = tab || "profile";
        var body =
            tab === "profile"
                ? '<div class="cz"><h3 class="vd-h">Banner image</h3><p class="muted sm">This image will appear across the top of your channel.</p><div class="cz-row"><div class="cz-ban">' +
                  (S.banner
                      ? '<img src="' +
                        esc(S.banner) +
                        '" alt="" referrerpolicy="no-referrer">'
                      : "") +
                  '</div><div class="muted sm">For the best results on all devices, use an image that’s at least 2048 x 1152 pixels and 6MB or less.<div class="cz-b">' +
                  btn("Change", 'data-act="noop"', "text") +
                  btn("Remove", 'data-act="noop"', "text") +
                  "</div></div></div>" +
                  '<h3 class="vd-h">Picture</h3><p class="muted sm">Your profile picture will appear where your channel is presented on YouTube.</p><div class="cz-row">' +
                  avatar(140, "cz-av") +
                  '<div class="muted sm">It’s recommended to use a picture that’s at least 98 x 98 pixels and 4MB or less.<div class="cz-b">' +
                  btn("Change", 'data-act="noop"', "text") +
                  btn("Remove", 'data-act="noop"', "text") +
                  "</div></div></div>" +
                  '<label class="fld"><span class="fl-l">Name</span><input id="cz-n" value="' +
                  esc(S.name) +
                  '"></label><p class="muted sm">Choose a channel name that represents you and your content.</p>' +
                  '<label class="fld"><span class="fl-l">Handle</span><input id="cz-h" value="' +
                  esc(S.handle) +
                  '"></label><p class="muted sm">https://www.youtube.com/' +
                  esc(S.handle) +
                  "</p>" +
                  '<label class="fld tall"><span class="fl-l">Description</span><textarea rows="5" placeholder="Tell viewers about your channel. Your description will appear in the About section of your channel and search results, among other places."></textarea></label>' +
                  '<h3 class="vd-h">Channel URL</h3><div class="vd-link sm">https://www.youtube.com/channel/' +
                  esc(S.ucid) +
                  ibtn(
                      "copy",
                      'data-act="copylink" data-link="https://www.youtube.com/channel/' +
                          esc(S.ucid) +
                          '"',
                      "Copy",
                  ) +
                  "</div></div>"
                : '<div class="cz"><h3 class="vd-h">Video spotlight</h3><p class="muted sm">Add a video to the top of your channel homepage.</p><div class="cz-sp"><div class="card cz-c"><b>Channel trailer for people who haven’t subscribed</b><p class="muted sm">Share a preview of your channel to get people to subscribe.</p>' +
                  btn("Add", 'data-act="noop"', "text") +
                  '</div><div class="card cz-c"><b>Featured video for returning subscribers</b>' +
                  (LONG[0]
                      ? '<div class="cz-fv">' +
                        thumbImg(LONG[0], "cz-fth") +
                        "<span>" +
                        esc(LONG[0].title) +
                        "</span></div>"
                      : "") +
                  btn("Change", 'data-act="noop"', "text") +
                  "</div></div>" +
                  '<h3 class="vd-h">Sections</h3><p class="muted sm">Customize the layout of your channel homepage with up to 12 sections.</p>' +
                  ["Videos", "Shorts", "Popular videos", "Created playlists"]
                      .map(function (s) {
                          return (
                              '<div class="card cz-s">' +
                              ic("menu") +
                              "<span>" +
                              s +
                              "</span>" +
                              "</div>"
                          );
                      })
                      .join("") +
                  "</div>";
        view.innerHTML =
            '<div class="pg cust">' +
            pageHead(
                "Channel customization",
                '<a class="btn text" href="https://www.youtube.com/' +
                    esc(S.handle) +
                    '" target="_blank" rel="noopener"><span>View channel</span></a>' +
                    btn("Cancel", 'data-act="noop"', "text") +
                    btn("Publish", 'data-act="czpub"', "filled"),
            ) +
            '<div class="ct-tabs">' +
            tabsBar(
                [
                    ["profile", "Profile"],
                    ["home", "Home tab"],
                ],
                tab,
                "data-cztab",
            ) +
            "</div>" +
            body +
            "</div>";
        placeInk($(".ct-tabs"));
    }
    var TRACKS = [
        ["Golden Hour Drive", "Dyalla", "Pop", "Bright", 182],
        ["Night Market", "Patrick Patrikios", "Hip Hop & Rap", "Calm", 154],
        [
            "Paper Planes Over Tokyo",
            "Jeremy Black",
            "Electronic",
            "Inspirational",
            201,
        ],
        ["Slow Burn", "Freedom Trail Studio", "R&B & Soul", "Romantic", 166],
        ["Cinematic Rise", "Aakash Gandhi", "Cinematic", "Dramatic", 213],
        ["Weekend Coffee", "Nana Kwabena", "Jazz & Blues", "Happy", 138],
        ["Static Bloom", "Vans in Japan", "Ambient", "Calm", 247],
        [
            "Backyard Rodeo",
            "Topher Mohr and Alex Elena",
            "Country & Folk",
            "Funky",
            129,
        ],
        ["Midnight Signals", "The Grey Room", "Electronic", "Dark", 195],
        [
            "Sunday Morning Run",
            "Josh Lippi & The Overtimers",
            "Rock",
            "Bright",
            174,
        ],
        ["Lofi Study Session", "Quincas Moreira", "Hip Hop & Rap", "Calm", 221],
        ["Glass Ocean", "Dan Lebowitz", "Ambient", "Sad", 188],
    ];
    var AUD = { playing: -1, saved: {} };
    function audioPage() {
        view.innerHTML =
            '<div class="pg aud">' +
            pageHead("Audio library") +
            (AUD.terms
                ? ""
                : '<div class="vbn">' +
                  ic("info") +
                  '<span>By using this audio library, you agree with the YouTube Audio Library terms and conditions.</span><a class="btn text" href="https://www.youtube.com/audiolibrary_terms" target="_blank" rel="noopener">Learn more</a><button class="btn text" data-act="audterms">Got it</button></div>') +
            '<div class="ct-tabs">' +
            tabsBar(
                [
                    ["music", "Music"],
                    ["fx", "Sound effects"],
                    ["starred", "Starred"],
                ],
                "music",
                "data-noop",
            ) +
            "</div>" +
            '<div class="fbar">' +
            ic("search", "fb-ic") +
            '<input id="audq" placeholder="Search or filter library" autocomplete="off"></div>' +
            '<div class="vt aul"><div class="tr thead"><div class="th c-p"></div><div class="th c-v">Track title</div><div class="th c-s"></div><div class="th c-d">Genre</div><div class="th c-d">Mood</div><div class="th c-d">Artist</div><div class="th c-n">Duration</div><div class="th c-d">License type</div><div class="th c-d sorted">' +
            ic("arrow-down") +
            "<span>Added</span></div></div>" +
            TRACKS.map(function (t, i) {
                return (
                    '<div class="tr row" data-tk="' +
                    i +
                    '"><div class="td c-p"><button class="ib" data-act="play">' +
                    ic(AUD.playing === i ? "pause" : "play") +
                    '</button></div><div class="td c-v">' +
                    esc(t[0]) +
                    '</div><div class="td c-s"><button class="ib star' +
                    (AUD.saved[i] ? " on" : "") +
                    '" data-act="star">' +
                    ic("star") +
                    '</button></div><div class="td c-d">' +
                    esc(t[2]) +
                    '</div><div class="td c-d">' +
                    esc(t[3]) +
                    '</div><div class="td c-d">' +
                    esc(t[1]) +
                    '</div><div class="td c-n">' +
                    mmss(t[4]) +
                    '</div><div class="td c-d">' +
                    ic("copyright", "sm-ic") +
                    '</div><div class="td c-d">' +
                    esc(
                        MON[(dt(TODAY).getUTCMonth() + 12 - (i % 5)) % 12] +
                            " " +
                            dt(TODAY).getUTCFullYear(),
                    ) +
                    "</div></div>"
                );
            }).join("") +
            "</div></div>";
        placeInk($(".ct-tabs"));
        var q = $("#audq");
        q.addEventListener("input", function () {
            var s = q.value.toLowerCase();
            $$("[data-tk]").forEach(function (r) {
                r.style.display =
                    r.textContent.toLowerCase().indexOf(s) >= 0 ? "" : "none";
            });
        });
    }

    /* ── Search (omnisearch) ─────────────────────────────────── */
    function bindSearch() {
        var inp = $("#sq"),
            dd = $("#sdd"),
            box = $("#srch");
        if (!inp) return;
        var show = function () {
            var q = inp.value.trim().toLowerCase();
            box.classList.toggle("has", !!q);
            if (!q) {
                dd.innerHTML = "";
                box.classList.remove("dd");
                return;
            }
            var hits = V.filter(function (v) {
                return v.title.toLowerCase().indexOf(q) >= 0;
            }).slice(0, 6);
            dd.innerHTML =
                (hits.length
                    ? '<div class="sd-h">Your channel</div>' +
                      hits
                          .map(function (v) {
                              return (
                                  '<a class="sd-r" href="' +
                                  esc(urlFor("video/" + v.key + "/edit")) +
                                  '" data-go="video/' +
                                  v.key +
                                  '/edit">' +
                                  thumbImg(v, "sd-th") +
                                  '<span class="sd-t">' +
                                  esc(v.title) +
                                  '</span><span class="sd-m">' +
                                  esc(dShort(v.pub)) +
                                  " · " +
                                  cmp(v.views) +
                                  " views</span></a>"
                              );
                          })
                          .join("")
                    : '<div class="sd-e">No results in your channel</div>') +
                '<button class="sd-ask" data-ask="' +
                esc(inp.value.trim()) +
                '">' +
                ic("sparkle") +
                "<span>Ask Studio about “" +
                esc(inp.value.trim()) +
                "”</span></button>";
            box.classList.add("dd");
        };
        inp.addEventListener("input", show);
        inp.addEventListener("focus", function () {
            box.classList.add("foc");
            show();
        });
        inp.addEventListener("blur", function () {
            setTimeout(function () {
                box.classList.remove("foc", "dd");
            }, 160);
        });
        inp.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                inp.value = "";
                show();
                inp.blur();
            }
            if (e.key === "Enter") {
                var first = $(".sd-r", dd);
                if (first) first.click();
                else if (inp.value.trim()) openAsk(inp.value.trim());
            }
        });
    }

    /* ── Create menu, upload flow ────────────────────────────── */
    function createMenu(anchor) {
        menuAt(
            anchor,
            [
                { t: "Upload videos", ic: "upload" },
                { t: "Go live", ic: "live" },
                { t: "Create post", ic: "post" },
                { t: "New playlist", ic: "playlist" },
                { t: "New podcast", ic: "podcast" },
                { t: "New course", ic: "bulb" },
                { t: "New show", ic: "monitor" },
            ],
            function (it) {
                if (it.t === "Upload videos") uploadDialog();
                else if (it.t === "Go live") goLive();
                else if (it.t === "Create post") go("content/posts");
                else if (it.t === "New playlist") newPlaylist();
                else if (it.t === "New course") newPlaylist("course");
                else if (it.t === "New show") newPlaylist("show");
                else newPlaylist(true);
            },
            { align: "right", cls: "cmenu" },
        );
    }
    function goLive() {
        var d = modal(
            '<div class="dlg-h"><h2>Welcome to Live Control Room</h2>' +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b gl"><div class="gl-art">' +
                ic("live") +
                '</div><p>When do you want to go live?</p><div class="gl-o"><button class="card gl-c" data-act="glnow"><b>Right now</b><span class="muted sm">Get set up to stream now</span></button><button class="card gl-c" data-act="glnow"><b>Later date</b><span class="muted sm">Schedule a stream for later</span></button></div><p class="muted sm">Live streaming will be available in 24 hours if this is your first time going live.</p></div>',
            { w: 560 },
        );
        $$("[data-act=glnow]", d.el).forEach(function (b) {
            b.addEventListener("click", function () {
                d.close();
                toast("Your live stream is being set up");
            });
        });
    }
    function newPlaylist(podcast) {
        var kindName =
            podcast === "course"
                ? "course"
                : podcast === "show"
                  ? "show"
                  : podcast
                    ? "podcast"
                    : "playlist";
        var d = modal(
            '<div class="dlg-h"><h2>New ' +
                kindName +
                '</h2></div><div class="dlg-b"><label class="fld"><span class="fl-l">Title (required)</span><input id="npl" maxlength="150" placeholder="Add title"></label><label class="fld tall"><span class="fl-l">Description</span><textarea rows="3" placeholder="Add description"></textarea></label><button class="sel"><span>' +
                ic("public") +
                " Public</span>" +
                ic("caret") +
                '</button></div><div class="dlg-f">' +
                btn("Cancel", "data-x", "text") +
                btn("Create", 'data-act="mkpl" disabled', "filled") +
                "</div>",
            { w: 520 },
        );
        var inp = $("#npl", d.el);
        inp.focus();
        inp.addEventListener("input", function () {
            $("[data-act=mkpl]", d.el).disabled = !inp.value.trim();
        });
        $("[data-act=mkpl]", d.el).addEventListener("click", function () {
            d.close();
            toast(
                kindName.charAt(0).toUpperCase() +
                    kindName.slice(1) +
                    " created",
            );
        });
    }
    function uploadDialog() {
        var d = modal(
            '<div class="dlg-h"><h2>Upload videos</h2>' +
                ibtn("feedback", 'data-act="noop"', "Send feedback") +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b up0" id="updrop"><div class="up-circ">' +
                ic("upload") +
                '</div><p class="up-t">Drag and drop video files to upload</p><p class="muted sm">Your videos will be private until you publish them.</p>' +
                btn("Select files", 'data-act="pick"', "filled") +
                '<input type="file" accept="video/*" hidden id="upfile"></div><div class="up-fine muted">By submitting your videos to YouTube, you acknowledge that you agree to YouTube’s <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/" target="_blank" rel="noopener">Community Guidelines</a>.<br>Please be sure not to violate others’ copyright or privacy rights.</div>',
            { w: 960, cls: "upd", sticky: true },
        );
        var drop = $("#updrop", d.el),
            file = $("#upfile", d.el);
        $("[data-act=pick]", d.el).addEventListener("click", function () {
            file.click();
        });
        file.addEventListener("change", function () {
            if (file.files[0]) uploadDetails(d, file.files[0]);
        });
        drop.addEventListener("dragover", function (e) {
            e.preventDefault();
            drop.classList.add("over");
        });
        drop.addEventListener("dragleave", function () {
            drop.classList.remove("over");
        });
        drop.addEventListener("drop", function (e) {
            e.preventDefault();
            drop.classList.remove("over");
            var f = e.dataTransfer.files[0];
            if (f) uploadDetails(d, f);
        });
    }
    // Grab a frame from the chosen file for the thumbnail, like Studio's auto thumbnails.
    function frameOf(f, cb) {
        try {
            var url = URL.createObjectURL(f),
                vid = document.createElement("video");
            vid.muted = true;
            vid.preload = "metadata";
            vid.src = url;
            vid.addEventListener("loadedmetadata", function () {
                vid.currentTime = Math.min(vid.duration * 0.3 || 1, 8);
            });
            vid.addEventListener("seeked", function () {
                try {
                    var c = document.createElement("canvas");
                    c.width = 480;
                    c.height = 270;
                    var g = c.getContext("2d");
                    g.fillStyle = "#000";
                    g.fillRect(0, 0, 480, 270);
                    var ar = vid.videoWidth / vid.videoHeight || 16 / 9,
                        w = ar > 16 / 9 ? 480 : 270 * ar,
                        h = ar > 16 / 9 ? 480 / ar : 270;
                    g.drawImage(vid, (480 - w) / 2, (270 - h) / 2, w, h);
                    cb(
                        c.toDataURL("image/jpeg", 0.82),
                        vid.duration,
                        vid.videoHeight > vid.videoWidth,
                    );
                } catch (e) {
                    cb("", vid.duration, false);
                }
            });
            vid.addEventListener("error", function () {
                cb("", 0, false);
            });
        } catch (e) {
            cb("", 0, false);
        }
    }
    function uploadDetails(d, f) {
        var name =
            f.name
                .replace(/\.[^.]+$/, "")
                .replace(/[_-]+/g, " ")
                .trim() || "My video";
        var state = {
            title: name,
            step: 0,
            pct: 0,
            thumb: "",
            dur: 0,
            vertical: false,
            vis: "Public",
        };
        var steps = S.monetized
            ? [
                  "Details",
                  "Monetization",
                  "Ad suitability",
                  "Video elements",
                  "Checks",
                  "Visibility",
              ]
            : ["Details", "Video elements", "Checks", "Visibility"];
        var LAST = steps.length - 1,
            CHECKS = steps.indexOf("Checks");
        d.el.classList.add("upw");
        d.el.innerHTML =
            '<div class="dlg-h"><h2 id="upt">' +
            esc(name) +
            '</h2><span class="up-s">Saved as private</span>' +
            ibtn("close", 'data-act="upx"', "Close") +
            '</div><div class="up-steps" id="upsteps"></div><div class="dlg-b up1" id="upbody"></div><div class="dlg-f up-f"><span class="up-p">' +
            ic("upload", "sm-ic") +
            '<span id="uppct">Uploading 0%</span><span class="up-bar"><i id="upbar"></i></span></span><span class="fl"></span>' +
            btn("Back", 'data-act="upback"', "text") +
            btn("Next", 'data-act="upnext"', "filled") +
            "</div>";
        frameOf(f, function (src, dur, vert) {
            state.thumb = src;
            state.dur = dur || 0;
            state.vertical = vert;
            paint();
        });
        var timer = setInterval(function () {
            state.pct = Math.min(100, state.pct + 3 + Math.random() * 9);
            var el = $("#uppct", d.el);
            if (!el) return clearInterval(timer);
            el.textContent =
                state.pct < 100
                    ? "Uploading " + Math.floor(state.pct) + "%"
                    : "Checks complete. No issues found.";
            $("#upbar", d.el).style.width = state.pct + "%";
            if (state.pct >= 100) {
                clearInterval(timer);
                $(".up-p", d.el).classList.add("done");
                if (state.step === CHECKS) paint();
            }
        }, 420);
        function paint() {
            $("#upsteps", d.el).innerHTML = steps
                .map(function (s, i) {
                    return (
                        '<div class="us' +
                        (i < state.step
                            ? " done"
                            : i === state.step
                              ? " on"
                              : "") +
                        '"><span class="us-l">' +
                        s +
                        '</span><span class="us-d">' +
                        (i < state.step ? ic("check") : "") +
                        "</span></div>" +
                        (i < steps.length - 1
                            ? '<span class="us-line"></span>'
                            : "")
                    );
                })
                .join("");
            var b = $("#upbody", d.el),
                prev =
                    '<div class="up-pv">' +
                    (state.thumb
                        ? '<img src="' + state.thumb + '" alt="">'
                        : '<div class="up-ph">' + ic("film") + "</div>") +
                    '<div class="up-pi"><div class="muted sm">Video link</div><div class="sm link">https://youtu.be/' +
                    esc(state.vid || (state.vid = vidId())) +
                    '</div><div class="muted sm">Filename</div><div class="sm">' +
                    esc(f.name) +
                    "</div></div></div>";
            var name = steps[state.step];
            if (name === "Monetization") {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Monetization</h3><p class="muted sm">Turn on monetization to earn money from ads on your video.</p><div class="card uel"><div><b>Monetization</b><div class="muted sm">On</div></div><button class="sel"><span>On</span>' +
                    ic("caret") +
                    '</button></div><div class="card uel"><div><b>Ad formats</b><div class="muted sm">Pre-roll, mid-roll and post-roll ads, skippable and non-skippable, chosen automatically to balance your earnings and viewer experience.</div></div></div><label class="cb-l"><span class="ck on"></span><span>Show mid-roll ads during my video</span></label></div>' +
                    prev +
                    "</div>";
            } else if (name === "Ad suitability") {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Ad suitability</h3><p class="muted sm">Help us show the right ads by telling us what’s in your video. Your rating is checked by our systems.</p>' +
                    [
                        "Inappropriate language",
                        "Adult content",
                        "Violence",
                        "Shocking content",
                        "Harmful acts and unreliable claims",
                        "Hateful and derogatory content",
                        "Recreational drugs and drug-related content",
                        "Firearms-related content",
                        "Controversial issues",
                        "Sensitive events",
                        "Enabling dishonest behavior",
                        "Inappropriate content for kids and families",
                        "Incendiary and demeaning",
                    ]
                        .map(function (x) {
                            return (
                                '<label class="cb-l"><span class="ck"></span><span>' +
                                x +
                                "</span></label>"
                            );
                        })
                        .join("") +
                    '<label class="cb-l"><span class="ck on"></span><span><b>None of the above</b></span></label></div>' +
                    prev +
                    "</div>";
                $$(".cb-l", b).forEach(function (l) {
                    l.addEventListener("click", function () {
                        var k = $(".ck", l),
                            none = l === b.querySelector(".cb-l:last-of-type");
                        k.classList.toggle("on");
                        if (k.classList.contains("on"))
                            $$(".cb-l", b).forEach(function (o) {
                                if (
                                    (o ===
                                        b.querySelector(
                                            ".cb-l:last-of-type",
                                        )) !==
                                    none
                                )
                                    $(".ck", o).classList.remove("on");
                            });
                    });
                });
            } else if (name === "Details") {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Details</h3><label class="fld"><span class="fl-l">Title (required)</span><textarea id="upti" rows="2" maxlength="100">' +
                    esc(state.title) +
                    '</textarea></label><label class="fld tall"><span class="fl-l">Description</span><textarea rows="5" placeholder="Tell viewers about your video (type @ to mention a channel)"></textarea></label><h3 class="vd-h">Thumbnail</h3><p class="muted sm">Set a thumbnail that stands out and draws viewers’ attention.</p><div class="thg">' +
                    (state.thumb
                        ? '<span class="thc on"><img class="thc-i" src="' +
                          state.thumb +
                          '" alt=""></span>'
                        : "") +
                    '<button class="tho">' +
                    ic("image") +
                    '<span>Upload file</span></button></div><h3 class="vd-h">Audience</h3><label class="rad"><span class="rb"></span><span>Yes, it’s made for kids</span></label><label class="rad"><span class="rb on"></span><span>No, it’s not made for kids</span></label></div>' +
                    prev +
                    "</div>";
                var ti = $("#upti", b);
                ti.addEventListener("input", function () {
                    state.title = ti.value;
                    $("#upt", d.el).textContent = ti.value || "Untitled";
                });
                $$(".rad", b).forEach(function (l) {
                    l.addEventListener("click", function () {
                        $$(".rb", b).forEach(function (x) {
                            x.classList.remove("on");
                        });
                        $(".rb", l).classList.add("on");
                    });
                });
            } else if (name === "Video elements") {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Video elements</h3><p class="muted sm">Use cards and an end screen to show viewers related videos, websites and calls to action.</p>' +
                    [
                        [
                            "subtitles",
                            "Add subtitles",
                            "Reach a broader audience by adding subtitles to your video",
                        ],
                        [
                            "cards",
                            "Add an end screen",
                            "Promote related content at the end of your video",
                        ],
                        [
                            "info",
                            "Add cards",
                            "Promote related content during your video",
                        ],
                    ]
                        .map(function (x) {
                            return (
                                '<div class="card uel">' +
                                ic(x[0]) +
                                "<div><b>" +
                                x[1] +
                                '</b><div class="muted sm">' +
                                x[2] +
                                "</div></div>" +
                                btn("Add", 'data-act="noop"', "text") +
                                "</div>"
                            );
                        })
                        .join("") +
                    "</div>" +
                    prev +
                    "</div>";
            } else if (name === "Checks") {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Checks</h3><p class="muted sm">We’ll check your video for issues that may restrict its visibility and then you will have the opportunity to fix issues before publishing your video.</p><div class="ck-r"><b>Copyright</b><span>' +
                    (state.pct >= 100
                        ? ic("check-circle", "ok-ic") + "No issues found"
                        : '<span class="spin"></span>Checking…') +
                    '</span></div><p class="muted sm">Remember: These check results aren’t final. Issues may come up in the future that impact your video.</p></div>' +
                    prev +
                    "</div>";
            } else {
                b.innerHTML =
                    '<div class="up-g"><div><h3 class="vd-h">Visibility</h3><p class="muted sm">Choose when to publish and who can see your video</p><div class="card visc">' +
                    [
                        [
                            "Private",
                            "Only you and people you choose can watch your video",
                        ],
                        [
                            "Unlisted",
                            "Anyone with the video link can watch your video",
                        ],
                        ["Public", "Everyone can watch your video"],
                    ]
                        .map(function (o) {
                            return (
                                '<label class="rad"><span class="rb' +
                                (state.vis === o[0] ? " on" : "") +
                                '" data-v="' +
                                o[0] +
                                '"></span><span><b>' +
                                o[0] +
                                "</b><small>" +
                                o[1] +
                                "</small></span></label>"
                            );
                        })
                        .join("") +
                    '</div><div class="card visc"><label class="rad"><span class="rb" data-v="Scheduled"></span><span><b>Schedule</b><small>Select a date to make your video public</small></span></label></div></div>' +
                    prev +
                    "</div>";
                $$(".rad", b).forEach(function (l) {
                    l.addEventListener("click", function () {
                        $$(".rb", b).forEach(function (x) {
                            x.classList.remove("on");
                        });
                        var rb = $(".rb", l);
                        rb.classList.add("on");
                        state.vis = rb.getAttribute("data-v");
                    });
                });
            }
            $("[data-act=upback]", d.el).style.visibility = state.step
                ? ""
                : "hidden";
            $("[data-act=upnext]", d.el).lastChild.textContent =
                state.step === LAST
                    ? state.vis === "Public"
                        ? "Publish"
                        : "Save"
                    : "Next";
        }
        paint();
        $("[data-act=upback]", d.el).addEventListener("click", function () {
            state.step = Math.max(0, state.step - 1);
            paint();
        });
        $("[data-act=upnext]", d.el).addEventListener("click", function () {
            if (state.step < LAST) {
                state.step++;
                return paint();
            }
            clearInterval(timer);
            var nv = publishUpload(state);
            d.close();
            published(nv);
        });
        $("[data-act=upx]", d.el).addEventListener("click", function () {
            clearInterval(timer);
            d.close();
            toast("Upload saved as a draft");
        });
    }
    function vidId() {
        var a =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
            s = "";
        for (var i = 0; i < 11; i++) s += a[Math.floor(Math.random() * 64)];
        return s;
    }
    function publishUpload(st) {
        var short = st.vertical && st.dur > 0 && st.dur <= 180;
        var v = {
            n: V.length,
            key: "u" + Date.now(),
            vid: st.vid,
            short: short,
            title: st.title || "Untitled",
            dur: Math.round(st.dur) || 60,
            pub: Date.now(),
            vis: st.vis === "Scheduled" ? "Scheduled" : st.vis,
            restr: "None",
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            avd: Math.round((st.dur || 60) * 0.45),
            apv: 45,
            impr: 0,
            ctr: 0,
            wh: 0,
            subs: 0,
            rev: 0,
            stayed: 60,
            daily: new Float64Array(L),
            pre: new Float64Array(L + 1),
            h48: new Array(48).fill(0),
            before: 0,
            desc: "",
            custom: st.thumb,
            pubIdx: L,
        };
        V.unshift(v);
        byKey[v.key] = v;
        byKey[v.vid] = v;
        LONG = V.filter(function (x) {
            return !x.short;
        });
        SHORTS = V.filter(function (x) {
            return x.short;
        });
        // Early views trickle in for a public upload.
        if (v.vis === "Public") {
            var base = Math.max(
                    1,
                    (M.views.sum(L - 7, YDAY) / 7 / 24 / 60) * 0.08,
                ),
                t = setInterval(function () {
                    var add = Math.floor(base * (0.4 + Math.random()));
                    if (Math.random() < base % 1) add++;
                    if (add > 0) {
                        v.views += add;
                        v.h48[47] += add;
                        if (Math.random() < 0.04) v.likes++;
                    }
                }, 4000);
            ST.cleanup.push(function () {
                /* keep ticking across pages */ void t;
            });
        }
        if (/^content/.test(ST.route) || ST.route === "dashboard")
            render(ST.route);
        return v;
    }
    function published(v) {
        var link = "https://youtu.be/" + v.vid;
        var d = modal(
            '<div class="dlg-h"><h2>' +
                (v.vis === "Public" ? "Video published" : "Video saved") +
                "</h2>" +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b pub">' +
                (v.custom
                    ? '<img class="pub-th" src="' + v.custom + '" alt="">'
                    : thumbImg(v, "pub-th")) +
                '<div class="pub-t">' +
                esc(v.title) +
                '</div><div class="muted sm">Share a link</div><div class="vd-link sm"><a href="' +
                link +
                '" target="_blank" rel="noopener">' +
                link +
                "</a>" +
                ibtn(
                    "copy",
                    'data-act="copylink" data-link="' + link + '"',
                    "Copy",
                ) +
                '</div><div class="shr">' +
                ["WhatsApp", "Facebook", "X", "Email", "KakaoTalk", "Reddit"]
                    .map(function (s) {
                        return (
                            '<span class="shr-i"><i>' +
                            esc(s.charAt(0)) +
                            "</i>" +
                            esc(s) +
                            "</span>"
                        );
                    })
                    .join("") +
                '</div></div><div class="dlg-f">' +
                btn("Close", "data-x", "filled") +
                "</div>",
            { w: 520 },
        );
        void d;
    }

    /* ── Notifications, account, help, settings ──────────────── */
    function notifPanel(anchor) {
        var items = [];
        var lv = V.filter(function (v) {
            return v.vis === "Public";
        })[0];
        if (lv)
            items.push({
                ic: "bars",
                t:
                    "Your latest " +
                    (lv.short ? "Short" : "video") +
                    " “" +
                    lv.title.slice(0, 48) +
                    "” got " +
                    cmp(lv.views) +
                    " views",
                w: lv.pub + 2 * HOUR,
                v: lv,
            });
        var c0 = P.C[0];
        if (c0)
            items.push({
                ic: "comment",
                t: c0.a + " commented: “" + c0.t + "”",
                w: c0.ts,
            });
        var net = M.subs.sum(L - 7, YDAY);
        if (net > 0)
            items.push({
                ic: "people",
                t: "You gained " + full(net) + " subscribers this week",
                w: S.now - 26 * HOUR,
            });
        items.push({
            ic: "sparkle",
            t: "Ask Studio can now answer questions about your channel analytics. Try it from the top bar.",
            w: S.now - 3 * DAY,
        });
        if (S.monetized)
            items.push({
                ic: "earn",
                t:
                    "Your " +
                    MONTH[(dt(TODAY).getUTCMonth() + 11) % 12] +
                    " estimated earnings are ready",
                w: S.now - 5 * DAY,
            });
        items.push({
            ic: "bulb",
            t: "New in Studio: Test & compare titles and thumbnails",
            w: S.now - 9 * DAY,
        });
        var html =
            '<div class="np-h"><b>Notifications</b><span class="fl"></span>' +
            ibtn("settings", 'data-act="noop"', "Settings") +
            "</div>" +
            items
                .map(function (n, i) {
                    return (
                        '<button class="np-i' +
                        (i < unread ? " new" : "") +
                        '"' +
                        (n.v
                            ? ' data-go="video/' + n.v.key + '/analytics"'
                            : "") +
                        ">" +
                        (n.v
                            ? thumbImg(n.v, "np-th")
                            : '<span class="np-ic">' + ic(n.ic) + "</span>") +
                        '<span class="np-t">' +
                        esc(n.t) +
                        "<small>" +
                        esc(ago(n.w)) +
                        "</small></span></button>"
                    );
                })
                .join("");
        menuAt(anchor, [], null, { align: "right", cls: "np", head: html });
        unread = 0;
        var nb = $(".bell .nb");
        if (nb) nb.remove();
    }
    function accountMenu(anchor) {
        var head =
            '<div class="am-h">' +
            avatar(40) +
            '<div><div class="am-n">' +
            esc(S.name) +
            '</div><div class="muted sm">' +
            esc(S.handle) +
            '</div><a class="am-l" href="https://www.youtube.com/' +
            esc(S.handle) +
            '" target="_blank" rel="noopener">View your channel</a></div></div>';
        menuAt(
            anchor,
            [
                { t: "YouTube", ic: "yt" },
                { t: "Switch account", ic: "person", right: ic("chev-right") },
                { t: "Sign out", ic: "signout" },
                "-",
                {
                    t: "Appearance: " + (LIGHT ? "Light theme" : "Dark theme"),
                    ic: "moon",
                    right: ic("chev-right"),
                },
                {
                    t: "Language: English",
                    ic: "translate",
                    right: ic("chev-right"),
                },
                "-",
                { t: "Send feedback", ic: "feedback" },
            ],
            function (it) {
                if (it.t === "YouTube")
                    window.open(
                        "https://www.youtube.com/",
                        "_blank",
                        "noopener",
                    );
                else if (/^Appearance/.test(it.t)) {
                    LIGHT = !LIGHT;
                    document.body.classList.toggle("lt", LIGHT);
                    document.body.classList.toggle("dk", !LIGHT);
                    document.documentElement.toggleAttribute("dark", !LIGHT);
                    render(ST.route);
                } else if (it.t === "Send feedback") feedback();
                else if (it.t === "Sign out")
                    toast("You can’t sign out of a preview");
                else toast("No other accounts");
            },
            { align: "right", cls: "am", head: head },
        );
    }
    function helpMenu(anchor) {
        menuAt(
            anchor,
            [
                { t: "Ask Studio", ic: "sparkle" },
                { t: "Help", ic: "help" },
                { t: "Creator Academy", ic: "bulb" },
                { t: "Keyboard shortcuts", ic: "keyboard" },
                "-",
                { t: "Send feedback", ic: "feedback" },
            ],
            function (it) {
                if (it.t === "Ask Studio") openAsk();
                else if (it.t === "Send feedback") feedback();
                else if (it.t === "Keyboard shortcuts")
                    toast("Press / to search, ? for help");
                else
                    window.open(
                        it.t === "Help"
                            ? "https://support.google.com/youtube"
                            : "https://www.youtube.com/creators/",
                        "_blank",
                        "noopener",
                    );
            },
            { align: "right" },
        );
    }
    function feedback() {
        var d = modal(
            '<div class="dlg-h"><h2>Send feedback to YouTube</h2>' +
                ibtn("close", "data-x", "Close") +
                '</div><div class="dlg-b"><label class="fld tall"><span class="fl-l">Describe your feedback (required)</span><textarea rows="5" id="fbq" placeholder="Tell us what prompted this feedback..."></textarea></label><p class="muted sm">Please don’t include any sensitive information</p></div><div class="dlg-f">' +
                btn("Send", 'data-act="fbsend" disabled', "filled") +
                "</div>",
            { w: 520 },
        );
        var t = $("#fbq", d.el);
        t.focus();
        t.addEventListener("input", function () {
            $("[data-act=fbsend]", d.el).disabled = !t.value.trim();
        });
        $("[data-act=fbsend]", d.el).addEventListener("click", function () {
            d.close();
            toast("Thanks for your feedback");
        });
    }
    function settingsModal(tab) {
        tab = tab || "General";
        var TABS = [
            "General",
            "Channel",
            "Upload defaults",
            "Permissions",
            "Community",
            "Agreements",
        ];
        var body = {
            General:
                '<h3 class="vd-h">Default currency</h3><button class="sel"><span>USD - US Dollar</span>' +
                ic("caret") +
                '</button><p class="muted sm">The currency used to show your estimated revenue in Analytics.</p>',
            Channel:
                '<div class="ct-tabs">' +
                tabsBar(
                    [
                        ["basic", "Basic info"],
                        ["adv", "Advanced settings"],
                        ["feat", "Feature eligibility"],
                    ],
                    "basic",
                    "data-noop",
                ) +
                '</div><h3 class="vd-h">Country of residence</h3><button class="sel"><span>' +
                esc(S.countryName) +
                "</span>" +
                ic("caret") +
                '</button><h3 class="vd-h">Keywords</h3><input class="inp" placeholder="Add keywords to help viewers find your channel">',
            "Upload defaults":
                '<label class="fld"><span class="fl-l">Title</span><input placeholder="Add a title that describes your video"></label><label class="fld tall"><span class="fl-l">Description</span><textarea rows="4"></textarea></label><h3 class="vd-h">Visibility</h3><button class="sel"><span>Private</span>' +
                ic("caret") +
                "</button>",
            Permissions:
                '<p class="muted sm">Invite others to work on your channel. Only the owner can manage permissions.</p><div class="vt sub"><div class="tr thead"><div class="th c-v">Name</div><div class="th c-d">Access</div></div><div class="tr row"><div class="td c-v">' +
                avatar(32) +
                " " +
                esc(S.name) +
                '</div><div class="td c-d">Owner</div></div></div><div class="cbtns">' +
                btn("Invite", 'data-act="noop"', "tonal") +
                "</div>",
            Community:
                '<h3 class="vd-h">Comments on your channel</h3><label class="rad"><span class="rb on"></span><span>On</span></label><label class="rad"><span class="rb"></span><span>Pause</span></label><label class="rad"><span class="rb"></span><span>Off</span></label><h3 class="vd-h">Blocked words</h3><textarea class="inp" rows="3" placeholder="Enter words or phrases separated by commas"></textarea>',
            Agreements:
                '<div class="kv"><span>YouTube Partner Program terms</span><span>' +
                (S.monetized ? "Accepted" : "Not accepted") +
                '</span></div><div class="kv"><span>Content ID agreement</span><span>Accepted</span></div><div class="kv"><span>Community Guidelines</span><a href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/" target="_blank" rel="noopener">View</a></div>',
        }[tab];
        var d = modal(
            '<div class="dlg-h"><h2>Settings</h2></div><div class="dlg-b set"><div class="set-n">' +
                TABS.map(function (t) {
                    return (
                        '<button class="set-i' +
                        (t === tab ? " on" : "") +
                        '" data-st="' +
                        t +
                        '">' +
                        t +
                        "</button>"
                    );
                }).join("") +
                '</div><div class="set-b">' +
                body +
                '</div></div><div class="dlg-f">' +
                btn("Close", "data-x", "text") +
                btn("Save", 'data-act="setsave"', "filled") +
                "</div>",
            { w: 960, cls: "setd" },
        );
        $$("[data-st]", d.el).forEach(function (b) {
            b.addEventListener("click", function () {
                d.close();
                settingsModal(b.getAttribute("data-st"));
            });
        });
        $("[data-act=setsave]", d.el).addEventListener("click", function () {
            d.close();
            toast("Changes saved");
        });
        var ink = $(".ct-tabs", d.el);
        if (ink) placeInk(ink);
    }

    /* ── Ask Studio ──────────────────────────────────────────── */
    // The docked assistant column (October 2026 layout): greeting, suggestion
    // chips above the input, a video picker on "+", streamed markdown answers
    // with tables and idea cards. Answers come from the channel's own numbers,
    // the same sums the analytics pages show, so every answer can be checked.
    var ASK = {
        el: null,
        open: false,
        convo: [],
        ctx: {},
        history: [],
        busy: false,
        stop: false,
        video: null,
        view: "chat",
        navWas: null,
    };
    try {
        ASK.history = JSON.parse(
            sessionStorage.getItem("ytd-ask-" + S.id) || "[]",
        );
    } catch (e) {
        ASK.history = [];
    }
    var firstName = (S.name || "").split(/\s+/)[0];
    var SUGGEST = [
        "How can Ask Studio help me?",
        "Create a thumbnail for my long-form video",
        "Suggest new video ideas",
        "Summarize my channel performance",
    ];
    var LIBRARY = [
        ["General", ["How can Ask Studio help me?"]],
        [
            "Catch up on your latest video",
            [
                "Summarize comments",
                "Summarize performance",
                "Refine my video title",
            ],
        ],
        [
            "Get inspired for you next content",
            [
                "Suggest new video ideas",
                "Workshop a video idea about...",
                "Create a content plan",
            ],
        ],
        [
            "Understand your channel and community",
            [
                "Summarize my channel performance",
                "Summarize viewer feedback",
                "What topics are my viewers into?",
                "How did viewers find my content?",
                "How many new viewers did I reach?",
            ],
        ],
        [
            "Engage with your community",
            [
                "Draft an engaging community post",
                "What are the top viewer questions?",
            ],
        ],
    ];
    var CHAT_TITLES = {
        caps: "How Ask Studio Can Help",
        growth: "Channel Performance",
        compare: "Channel Performance",
        latest: "Latest Video Insights",
        traffic: "Top Viewer Sources",
        newv: "New Viewers Reached",
        demo: "Audience Demographics",
        when: "Best Time to Publish",
        rev: "Revenue Overview",
        ypp: "Partner Program Progress",
        subs: "Subscriber Growth",
        top: "Top Performers",
        shorts: "Shorts vs Videos",
        comments: "Summarize Latest Comments",
        retention: "Retention Breakdown",
        thumb: "Thumbnail Design Ideas",
        titles: "Title insights",
        desc: "Description Draft",
        ideas: "New Video Inspiration",
        plan: "Content Plan",
        post: "Community Post Draft",
        questions: "Top Viewer Questions",
        topics: "Viewer Interests",
        thumbgen: "Thumbnail Design Ideas",
    };
    function ensureAsk() {
        if (ASK.el) return ASK.el;
        var el = document.createElement("aside");
        el.id = "ask";
        el.innerHTML =
            '<div class="ask-h"><button class="ibx" data-k="hist" data-tip="Chats" aria-label="Chats">' +
            ic("menu") +
            '</button><b id="ask-title">Ask Studio</b><span class="fl"></span><button class="ibx" data-k="new" data-tip="New conversation" aria-label="New conversation">' +
            ic("newchat") +
            '</button><button class="ibx" data-k="close" data-tip="Close" aria-label="Close">' +
            ic("close") +
            '</button></div><div class="ask-b" id="askb"></div>' +
            '<div class="ask-f"><div class="ask-sg" id="asksg"></div><div class="ask-in" id="askin"><div class="ask-chip" id="askchip" hidden></div><textarea id="askq" rows="1" placeholder="Ask something"></textarea><div class="ask-row"><button class="ask-plus" data-k="plus" aria-label="Add" data-tip="Add a video">' +
            ic("plus") +
            '</button><span class="fl"></span><button class="ask-go" data-k="send" aria-label="Send" disabled>' +
            ic("arrow-up") +
            '<i class="ask-stop"></i></button></div></div>' +
            '<div class="ask-d">AI can make mistakes. You are responsible for the content you publish. <a href="https://support.google.com/youtube/answer/16291691" target="_blank" rel="noopener">Learn more</a></div></div>';
        document.body.appendChild(el);
        ASK.el = el;
        var ta = $("#askq", el),
            goB = $("[data-k=send]", el);
        var fit = function () {
            ta.style.height = "auto";
            ta.style.height =
                Math.min(132, Math.max(24, ta.scrollHeight)) + "px";
            goB.disabled = !ASK.busy && !ta.value.trim();
            goB.classList.toggle("on", !!ta.value.trim() && !ASK.busy);
        };
        ASK.fit = fit;
        ta.addEventListener("input", function () {
            fit();
            if (/(^|\s)\+$/.test(ta.value)) videoPicker($("[data-k=plus]", el));
        });
        ta.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendInput();
            }
        });
        el.addEventListener("click", function (e) {
            var b = e.target.closest(
                "[data-k],[data-q],[data-go],[data-cp],[data-fb],[data-more],[data-save],[data-fill]",
            );
            if (!b) return;
            if (b.hasAttribute("data-q")) {
                if (!ASK.busy) ask(b.getAttribute("data-q"));
                return;
            }
            if (b.hasAttribute("data-fill")) {
                ta.value = b.getAttribute("data-fill");
                fit();
                ta.focus();
                ta.setSelectionRange(ta.value.length, ta.value.length);
                return;
            }
            if (b.hasAttribute("data-go")) {
                e.preventDefault();
                go(b.getAttribute("data-go"));
                return;
            }
            if (b.hasAttribute("data-cp")) {
                copyText(b.getAttribute("data-cp"));
                toast("Copied to clipboard");
                return;
            }
            if (b.hasAttribute("data-fb")) {
                $$("[data-fb]", b.parentNode).forEach(function (x) {
                    x.classList.toggle("on", x === b);
                });
                toast("Thanks for your feedback");
                return;
            }
            if (b.hasAttribute("data-more")) {
                if (!ASK.busy)
                    ask(
                        "Tell me more about the video idea “" +
                            b.getAttribute("data-more") +
                            "”",
                    );
                return;
            }
            if (b.hasAttribute("data-save")) {
                b.classList.toggle("on");
                toast(
                    b.classList.contains("on")
                        ? "Saved to Content > Saved Ideas"
                        : "Removed from Saved Ideas",
                );
                return;
            }
            var k = b.getAttribute("data-k");
            if (k === "close") closeAsk();
            else if (k === "new") {
                saveConvo();
                ASK.convo = [];
                ASK.ctx = {};
                ASK.video = null;
                renderChip();
                idle();
            } else if (k === "send") {
                if (ASK.busy) {
                    ASK.stop = true;
                    return;
                }
                sendInput();
            } else if (k === "hist") chatsView();
            else if (k === "plus") videoPicker(b);
            else if (k === "lib") libraryView();
            else if (k === "back") {
                if (ASK.convo.length) restoreChat();
                else idle();
            } else if (k === "unchip") {
                ASK.video = null;
                renderChip();
            }
        });
        // Frames that do not exist fall back to the main thumbnail.
        el.addEventListener(
            "error",
            function (e) {
                var t = e.target;
                if (
                    t.tagName === "IMG" &&
                    t.getAttribute("data-fb") &&
                    t.src !== t.getAttribute("data-fb")
                )
                    t.src = t.getAttribute("data-fb");
            },
            true,
        );
        idle();
        return el;
    }
    function sendInput() {
        var ta = $("#askq", ASK.el),
            q = ta.value.trim();
        if (!q || ASK.busy) return;
        ta.value = "";
        ASK.fit();
        var o = ASK.video ? { v: ASK.video.key } : {};
        ASK.video = null;
        renderChip();
        ask(q, o);
    }
    function renderChip() {
        var c = $("#askchip", ASK.el);
        if (!c) return;
        if (!ASK.video) {
            c.hidden = true;
            c.innerHTML = "";
            return;
        }
        c.hidden = false;
        c.innerHTML =
            ic("film") +
            "<span>" +
            esc(ASK.video.title) +
            '</span><button data-k="unchip" aria-label="Remove">' +
            ic("close") +
            "</button>";
    }
    function setSuggest(on) {
        var sg = $("#asksg", ASK.el);
        if (!sg) return;
        sg.innerHTML = on
            ? SUGGEST.map(function (q) {
                  return (
                      '<button class="ask-s" data-q="' +
                      esc(q) +
                      '">' +
                      esc(q) +
                      "</button>"
                  );
              }).join("") +
              '<button class="ask-s more" data-k="lib">More suggestions ' +
              ic("chev-right") +
              "</button>"
            : "";
    }
    function idle() {
        ASK.view = "chat";
        $("#ask-title", ASK.el).textContent = "Ask Studio";
        $("#askb", ASK.el).innerHTML =
            '<div class="ask-hi"><div class="ask-g1">Hello, ' +
            esc(S.name || "there") +
            '</div><div class="ask-g2">How can I help you?</div></div>';
        setSuggest(true);
    }
    function libraryView() {
        ASK.view = "lib";
        setSuggest(false);
        $("#askb", ASK.el).innerHTML =
            '<button class="ask-back" data-k="back">' +
            ic("chev-left") +
            "<b>Suggestion library</b></button>" +
            LIBRARY.map(function (g) {
                return (
                    '<div class="lib-g"><div class="lib-h">' +
                    esc(g[0]) +
                    '</div><div class="lib-c">' +
                    g[1]
                        .map(function (q) {
                            return /\.\.\.$/.test(q)
                                ? '<button class="ask-s" data-fill="' +
                                      esc(q.replace(/\.\.\.$/, " ")) +
                                      '">' +
                                      esc(q) +
                                      "</button>"
                                : '<button class="ask-s" data-q="' +
                                      esc(q) +
                                      '">' +
                                      esc(q) +
                                      "</button>";
                        })
                        .join("") +
                    "</div></div>"
                );
            }).join("");
    }
    function chatsView() {
        ASK.view = "chats";
        setSuggest(false);
        var items = ASK.history.slice(0, 12);
        $("#askb", ASK.el).innerHTML =
            '<button class="ask-back" data-k="back">' +
            ic("chev-left") +
            "<b>Chats</b></button>" +
            (items.length
                ? items
                      .map(function (h) {
                          return (
                              '<button class="chat-r" data-q="' +
                              esc(h.qs[0]) +
                              '"><span>' +
                              esc(h.t) +
                              "</span><small>" +
                              esc(ago(h.at - (Date.now() - S.now))) +
                              "</small></button>"
                          );
                      })
                      .join("")
                : '<p class="muted sm pad8">Your chats will show up here. They’re saved for up to 30 days.</p>');
    }
    function restoreChat() {
        ASK.view = "chat";
        var b = $("#askb", ASK.el);
        b.innerHTML = "";
        ASK.convo.forEach(function (c) {
            b.appendChild(c.node);
        });
        setSuggest(false);
        $("#ask-title", ASK.el).textContent = ASK.ctx.title || "Ask Studio";
        b.scrollTop = b.scrollHeight;
    }
    function videoPicker(anchor) {
        var vids = V.filter(function (v) {
            return v.vis !== "Private";
        }).slice(0, 40);
        var html =
            '<div class="vp-l">' +
            vids
                .map(function (v) {
                    return (
                        '<button class="m-i vp" data-v="' +
                        v.key +
                        '">' +
                        thumbImg(v, "vp-th") +
                        '<span class="m-t">' +
                        esc(v.title) +
                        "</span></button>"
                    );
                })
                .join("") +
            '</div><div class="vp-s">' +
            ic("search") +
            '<input placeholder="Search your video" id="vpq"></div>';
        closeLayers();
        var el = document.createElement("div");
        el.className = "menu vpm";
        el.innerHTML = html;
        layers.appendChild(el);
        var box = $("#askin", ASK.el).getBoundingClientRect();
        el.style.left = box.left + "px";
        el.style.width = box.width + "px";
        el.style.top = Math.max(8, box.top - el.offsetHeight - 8) + "px";
        requestAnimationFrame(function () {
            el.classList.add("in");
        });
        var rec = {
            el: el,
            close: function () {
                el.remove();
                var i = openMenus.indexOf(rec);
                if (i >= 0) openMenus.splice(i, 1);
                document.removeEventListener("mousedown", out, true);
            },
        };
        function out(e) {
            if (!el.contains(e.target) && !anchor.contains(e.target))
                rec.close();
        }
        setTimeout(function () {
            document.addEventListener("mousedown", out, true);
        }, 0);
        openMenus.push(rec);
        var q = $("#vpq", el);
        q.focus();
        q.addEventListener("input", function () {
            var s = q.value.toLowerCase();
            $$(".vp", el).forEach(function (b) {
                b.style.display =
                    b.textContent.toLowerCase().indexOf(s) >= 0 ? "" : "none";
            });
        });
        el.addEventListener("click", function (e) {
            var b = e.target.closest(".vp");
            if (!b) return;
            ASK.video = byKey[b.getAttribute("data-v")];
            renderChip();
            var ta = $("#askq", ASK.el);
            ta.value = ta.value.replace(/(^|\s)\+$/, "$1");
            ASK.fit();
            rec.close();
            ta.focus();
        });
    }
    function openAsk(q, opt) {
        ensureAsk();
        if (!ASK.open) {
            ASK.open = true;
            // Docked column: the page makes room and the nav becomes the icon rail.
            ASK.navWas = ST.navMini;
            if (!ST.navMini) {
                ST.navMini = true;
                app.classList.add("mini");
                renderNav();
            }
            document.body.classList.add("ask-open");
            $(".askp") && $(".askp").classList.add("on");
            setTimeout(function () {
                window.dispatchEvent(new Event("resize"));
            }, 160);
        }
        if (q)
            setTimeout(function () {
                ask(q, opt);
            }, 160);
        else
            setTimeout(function () {
                $("#askq", ASK.el).focus();
            }, 160);
    }
    function closeAsk() {
        ASK.open = false;
        document.body.classList.remove("ask-open");
        $(".askp") && $(".askp").classList.remove("on");
        if (ASK.navWas === false) {
            ST.navMini = false;
            app.classList.remove("mini");
            renderNav();
        }
        setTimeout(function () {
            window.dispatchEvent(new Event("resize"));
        }, 160);
    }
    function saveConvo() {
        if (!ASK.convo.length) return;
        ASK.history.unshift({
            t: ASK.ctx.title || ASK.convo[0].q,
            at: Date.now(),
            qs: ASK.convo.map(function (c) {
                return c.q;
            }),
        });
        ASK.history = ASK.history.slice(0, 12);
        try {
            sessionStorage.setItem(
                "ytd-ask-" + S.id,
                JSON.stringify(ASK.history),
            );
        } catch (e) {
            /* storage off */
        }
    }
    function histMenu(anchor) {
        void anchor;
        chatsView();
    }

    /* Formatting for answers: **bold**, [[v:key]] video links, line breaks */
    function md(s) {
        return esc(s)
            .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
            .replace(/\[\[v:([^\]]+)\]\]/g, function (m0, k) {
                var v = byKey[k];
                return v
                    ? '<a class="ask-vl" href="' +
                          esc(urlFor("video/" + v.key + "/analytics")) +
                          '" data-go="video/' +
                          v.key +
                          '/analytics">' +
                          esc(v.title) +
                          "</a>"
                    : "";
            })
            .replace(
                /\[\[c\]\]/g,
                '<span class="cite">' + ic("link") + "comments</span>",
            )
            .replace(/\n/g, "<br>");
    }
    var PENDING = {
        growth: "Looking through your content...",
        latest: "Finding your top-performing content...",
        comments: "Reading through viewer comments...",
        questions: "Gathering the comments on this video...",
        ideas: "Looking through your content...",
        thumb: "Taking a look...",
        thumbgen: "Taking a look...",
        traffic: "Looking through your content...",
        retention: "Finding your top-performing content...",
    };
    function ask(q, opt) {
        opt = opt || {};
        ensureAsk();
        var b = $("#askb", ASK.el);
        if (ASK.view !== "chat" || $(".ask-hi", b)) {
            if (ASK.convo.length) restoreChat();
            else b.innerHTML = "";
        }
        ASK.view = "chat";
        setSuggest(false);
        ASK.busy = true;
        ASK.stop = false;
        var goB = $("[data-k=send]", ASK.el);
        goB.disabled = false;
        goB.classList.add("busy");
        goB.classList.remove("on");
        var vid = opt.v ? byKey[opt.v] : null;
        var turn = document.createElement("div");
        turn.className = "ask-turn";
        turn.innerHTML =
            '<div class="ask-u"><div class="ask-ub">' +
            (vid
                ? '<span class="ub-v">' +
                  ic("play") +
                  esc(vid.title) +
                  "</span>"
                : "") +
            "<span>" +
            esc(q) +
            '</span></div></div><div class="ask-a"><div class="ask-th"><span class="ask-sp">' +
            ic("sparkle") +
            '<i></i></span><span class="ask-tht">Just a sec...</span></div><div class="ask-body"></div></div>';
        b.appendChild(turn);
        b.scrollTop = b.scrollHeight;
        var res;
        try {
            res = answer(q, opt);
        } catch (err) {
            res = {
                blocks: [{ p: "Something went wrong. Please try again." }],
            };
            if (window.console)
                console.error(String((err && err.stack) || err));
        }
        ASK.convo.push({ q: q, intent: res.intent, node: turn });
        if (ASK.convo.length === 1) {
            ASK.ctx.title = CHAT_TITLES[res.intent] || q.slice(0, 28);
            $("#ask-title", ASK.el).textContent =
                ASK.ctx.title.length > 24
                    ? ASK.ctx.title.slice(0, 24) + "..."
                    : ASK.ctx.title;
        }
        var th = $(".ask-th", turn),
            tht = $(".ask-tht", turn),
            body = $(".ask-body", turn);
        var steps = [
                "Just a sec...",
                "Reviewing your request...",
                PENDING[res.intent] || "Taking a look...",
            ],
            si = 0;
        var stepMs = opt.instant ? 0 : 700;
        return new Promise(function (done) {
            var next = function () {
                if (ASK.stop) {
                    th.remove();
                    finish(true);
                    return;
                }
                if (si < steps.length) {
                    tht.textContent = steps[si++];
                    return setTimeout(next, stepMs + Math.random() * 300);
                }
                th.remove();
                stream(body, res.blocks, opt.instant, function (stopped) {
                    finish(stopped);
                });
            };
            var finish = function (stopped) {
                if (res.after && !stopped) res.after(body);
                if (stopped)
                    body.insertAdjacentHTML(
                        "beforeend",
                        '<p class="muted">You stopped this response.</p>',
                    );
                body.insertAdjacentHTML(
                    "beforeend",
                    '<div class="ask-act"><button class="ibx" data-cp="' +
                        esc(plainOf(res.blocks)) +
                        '" data-tip="Copy">' +
                        ic("copy") +
                        '</button><button class="ibx" data-fb="up" data-tip="Good response">' +
                        ic("thumb-up-o") +
                        '</button><button class="ibx" data-fb="down" data-tip="Bad response">' +
                        ic("thumb-down-o") +
                        "</button></div>",
                );
                b.scrollTop = b.scrollHeight;
                ASK.busy = false;
                ASK.stop = false;
                goB.classList.remove("busy");
                ASK.fit();
                done();
            };
            setTimeout(next, opt.instant ? 0 : 250);
        });
    }
    function plainOf(blocks) {
        return blocks
            .map(function (x) {
                if (x.p)
                    return x.p
                        .replace(/\*\*/g, "")
                        .replace(/\[\[v:([^\]]+)\]\]/g, function (m0, k) {
                            return byKey[k] ? byKey[k].title : "";
                        })
                        .replace(/\[\[c\]\]/g, "");
                if (x.ul)
                    return x.ul
                        .map(function (l) {
                            return (
                                "• " +
                                l
                                    .replace(/\*\*/g, "")
                                    .replace(
                                        /\[\[v:([^\]]+)\]\]/g,
                                        function (m0, k) {
                                            return byKey[k]
                                                ? byKey[k].title
                                                : "";
                                        },
                                    )
                                    .replace(/\[\[c\]\]/g, "")
                            );
                        })
                        .join("\n");
                if (x.table)
                    return [x.table.head.join(" | ")]
                        .concat(
                            x.table.rows.map(function (r) {
                                return r
                                    .map(function (c) {
                                        return String(c)
                                            .replace(/\*\*/g, "")
                                            .replace(
                                                /\[\[v:([^\]]+)\]\]/g,
                                                function (m0, k) {
                                                    return byKey[k]
                                                        ? byKey[k].title
                                                        : "";
                                                },
                                            );
                                    })
                                    .join(" | ");
                            }),
                        )
                        .join("\n");
                if (x.h) return x.h;
                if (x.ideas)
                    return x.ideas
                        .map(function (i) {
                            return i.title + ": " + i.desc;
                        })
                        .join("\n");
                return "";
            })
            .filter(Boolean)
            .join("\n\n");
    }
    // Streams text in chunks and fades tables, idea cards and other cards in.
    function stream(host, blocks, instant, cb) {
        var i = 0,
            box = $("#askb", ASK.el);
        var next = function () {
            if (ASK.stop) return cb(true);
            if (i >= blocks.length) return cb(false);
            var bl = blocks[i++],
                el;
            if (bl.p != null || bl.ul || bl.ol || bl.h) {
                el = document.createElement(
                    bl.ul ? "ul" : bl.ol ? "ol" : bl.h ? "h4" : "p",
                );
                host.appendChild(el);
                var src = bl.ul || bl.ol || [bl.p != null ? bl.p : bl.h];
                if (instant) {
                    el.innerHTML =
                        bl.ul || bl.ol
                            ? src
                                  .map(function (l) {
                                      return "<li>" + md(l) + "</li>";
                                  })
                                  .join("")
                            : md(src[0]);
                    return next();
                }
                var li = 0,
                    k = 0,
                    cur = null;
                var tick = function () {
                    if (ASK.stop) return cb(true);
                    if (li >= src.length) {
                        box.scrollTop = box.scrollHeight;
                        return setTimeout(next, 50);
                    }
                    var text = src[li];
                    if ((bl.ul || bl.ol) && !cur) {
                        cur = document.createElement("li");
                        el.appendChild(cur);
                    }
                    // Whole tokens at a time so links and bold never render half-open.
                    k = Math.min(
                        text.length,
                        k + 6 + Math.floor(Math.random() * 8),
                    );
                    while (
                        k < text.length &&
                        /\[\[[^\]]*$/.test(text.slice(0, k))
                    )
                        k++;
                    var part = text.slice(0, k),
                        open =
                            (part.match(/\*\*/g) || []).length % 2 ? "**" : "";
                    (bl.ul || bl.ol ? cur : el).innerHTML = md(part + open);
                    box.scrollTop = box.scrollHeight;
                    if (k >= text.length) {
                        li++;
                        k = 0;
                        cur = null;
                    }
                    setTimeout(tick, 22);
                };
                tick();
            } else {
                el = document.createElement("div");
                el.className = "ask-card";
                if (bl.table)
                    el.innerHTML =
                        '<div class="ask-tbl"><table><thead><tr>' +
                        bl.table.head
                            .map(function (h) {
                                return "<th>" + esc(h) + "</th>";
                            })
                            .join("") +
                        "</tr></thead><tbody>" +
                        bl.table.rows
                            .map(function (r) {
                                return (
                                    "<tr>" +
                                    r
                                        .map(function (c, ci) {
                                            return (
                                                "<td" +
                                                (ci ? "" : ' class="b"') +
                                                ">" +
                                                md(String(c)) +
                                                "</td>"
                                            );
                                        })
                                        .join("") +
                                    "</tr>"
                                );
                            })
                            .join("") +
                        "</tbody></table></div>";
                else if (bl.ideas)
                    el.innerHTML = bl.ideas
                        .map(function (it) {
                            return (
                                '<div class="idea-c"><div class="ic-e">' +
                                esc(it.eyebrow) +
                                '</div><div class="ic-t">' +
                                esc(it.title) +
                                '</div><div class="ic-d">' +
                                esc(it.desc) +
                                '</div><div class="ic-f"><button class="btn tonal sm" data-more="' +
                                esc(it.title) +
                                '"><span>Tell me more</span></button><button class="ibx bm" data-save="1" data-tip="Save idea">' +
                                ic("bookmark") +
                                "</button></div></div>"
                            );
                        })
                        .join("");
                else el.innerHTML = bl.card || "";
                host.appendChild(el);
                if (bl.chart) {
                    var ch = document.createElement("div");
                    ch.className = "ask-ch";
                    el.appendChild(ch);
                    lineChart(ch, bl.chart.pts, {
                        mk: bl.chart.mk,
                        h: 90,
                        xw: 140,
                        gran: bl.chart.gran,
                        anim: !instant,
                        color: bl.chart.color,
                    });
                }
                if (!instant) {
                    el.style.opacity = 0;
                    el.style.transform = "translateY(4px)";
                    requestAnimationFrame(function () {
                        el.style.transition = "opacity .3s, transform .3s";
                        el.style.opacity = 1;
                        el.style.transform = "none";
                    });
                }
                box.scrollTop = box.scrollHeight;
                setTimeout(next, instant ? 0 : 200);
            }
        };
        next();
    }

    /* Cards inside answers */
    function askMetrics(rows) {
        return (
            '<div class="am-g">' +
            rows
                .map(function (r) {
                    return (
                        '<div class="am-c"><div class="am-l">' +
                        esc(r[0]) +
                        '</div><div class="am-v">' +
                        esc(r[1]) +
                        "</div>" +
                        (r[2]
                            ? '<div class="am-s ' +
                              (r[3] > 0 ? "pos" : r[3] < 0 ? "neg" : "") +
                              '">' +
                              esc(r[2]) +
                              "</div>"
                            : "") +
                        "</div>"
                    );
                })
                .join("") +
            "</div>"
        );
    }
    function askVideo(v, lines) {
        return (
            '<a class="av-c" href="' +
            esc(urlFor("video/" + v.key + "/analytics")) +
            '" data-go="video/' +
            v.key +
            '/analytics">' +
            thumbImg(v, "av-th" + (v.short ? " sh" : "")) +
            '<span class="av-x"><span class="av-t">' +
            esc(v.title) +
            '</span><span class="av-m">' +
            esc(lines || cmp(v.views) + " views · " + dShort(v.pub)) +
            "</span></span>" +
            ic("chev-right", "av-go") +
            "</a>"
        );
    }
    function askLink(t, route) {
        return (
            '<a class="ask-ln" href="' +
            esc(urlFor(route)) +
            '" data-go="' +
            route +
            '">' +
            ic("analytics") +
            "<span>" +
            esc(t) +
            "</span>" +
            ic("chev-right") +
            "</a>"
        );
    }

    /* ── Understanding the question ──────────────────────────── */
    function rangeIn(ql) {
        if (/\b(today|right now|live|realtime|real-time|48 hours)\b/.test(ql))
            return "rt";
        if (/\byesterday\b/.test(ql)) return "c" + YDAY + "_" + YDAY;
        if (/\b(7 days|this week|last week|past week|weekly|7d)\b/.test(ql))
            return "last7";
        if (/\b(90 days|3 months|three months|quarter)\b/.test(ql))
            return "last90";
        if (
            /\b(365 days|this year|past year|last year|12 months|year)\b/.test(
                ql,
            )
        )
            return "last365";
        if (
            /\b(lifetime|all time|all-time|ever|since i started|total)\b/.test(
                ql,
            )
        )
            return "life";
        if (
            /\b(28 days|this month|last month|past month|4 weeks|month)\b/.test(
                ql,
            )
        )
            return "last28";
        return null;
    }
    var STOP = {
        the: 1,
        a: 1,
        an: 1,
        my: 1,
        of: 1,
        to: 1,
        in: 1,
        on: 1,
        and: 1,
        for: 1,
        is: 1,
        how: 1,
        did: 1,
        do: 1,
        does: 1,
        what: 1,
        video: 1,
        short: 1,
        with: 1,
        this: 1,
        that: 1,
        i: 1,
        me: 1,
        about: 1,
        it: 1,
        was: 1,
        why: 1,
        are: 1,
        from: 1,
        vlog: 1,
    };
    function videoIn(ql) {
        var words = ql
            .replace(/[^a-z0-9 ]+/g, " ")
            .split(/\s+/)
            .filter(function (w) {
                return w.length > 2 && !STOP[w];
            });
        if (words.length < 2) return null;
        var best = null,
            bs = 0;
        V.forEach(function (v) {
            var t = v.title.toLowerCase(),
                s = 0;
            words.forEach(function (w) {
                if (t.indexOf(w) >= 0) s += w.length > 4 ? 2 : 1;
            });
            if (s > bs) {
                bs = s;
                best = v;
            }
        });
        return bs >= 3 ? best : null;
    }
    function intentOf(ql) {
        var T = [
            [
                "caps",
                /^(hi|hey|hello|yo|sup|what can you do|help|who are you)\b|how can ask studio help/,
            ],
            [
                "ideas",
                /tell me more about the video idea|workshop a video idea|help me develop this video idea/,
            ],
            [
                "thumbgen",
                /\b(create|make|design|generate)\b.*\bthumbnail|\bthumbnail (concept|idea)s?\b/,
            ],
            [
                "plan",
                /\b(content plan|content calendar|upload plan|plan (my|the) (next|month|week))/,
            ],
            [
                "post",
                /\b(community post|draft (a|an) .*post|write (a|an) .*post|engaging .*post)\b/,
            ],
            [
                "questions",
                /\b(top viewer questions|viewer questions|questions (do|are) .*(viewers|asking)|what are .*asking)\b/,
            ],
            [
                "topics",
                /\b(topics|interests|interested in|into\?|what (do|are) my viewers into)\b/,
            ],
            ["latest", /\b(catch me up|summarize performance)\b/],
            ["titles", /\b(title|titles|headline|refine my)\b/],
            [
                "when",
                /\b(when should|best time|what time|schedule|post time|upload time|when to post|when do|publish my next)\b/,
            ],
            [
                "ideas",
                /\b(idea|ideas|brainstorm|what should i (make|film|post|upload)|next video|video about|develop)\b/,
            ],
            ["desc", /\b(description|tags|hashtags|seo)\b/],
            [
                "thumb",
                /\b(thumbnail|thumbnails|ctr|click.?through|impressions|clicks?)\b/,
            ],
            [
                "retention",
                /\b(retention|stop watching|stopped watching|drop.?off|drop|watch the whole|average view duration|avd|how long)\b/,
            ],
            [
                "comments",
                /\b(comment|comments|saying|sentiment|feedback|reply|replies)\b/,
            ],
            [
                "traffic",
                /\b(find|found|discover|traffic|sources?|coming from|where do (my )?views|search|suggested|browse)\b/,
            ],
            [
                "newv",
                /\b(new viewers|reach|returning|unique viewers|audience size|monthly audience|casual|regular)\b/,
            ],
            [
                "demo",
                /\b(age|gender|country|countries|geograph|where are my|demographic|male|female|located|device)\b/,
            ],
            [
                "ypp",
                /\b(monetiz|partner program|ypp|eligible|eligibility|4,?000|1,?000 subscribers)\b/,
            ],
            [
                "rev",
                /\b(revenue|money|earn|earning|earnings|paid|rpm|cpm|income|make|\$)\b/,
            ],
            ["subs", /\b(subscriber|subscribers|subs|subscribe|followers)\b/],
            ["shorts", /\b(shorts|short form|long.?form|format)\b/],
            [
                "latest",
                /\b(latest|last|newest|recent|summari[sz]e|doing|perform)\b.*\b(video|upload|short|performance)\b|\bthis video\b/,
            ],
            ["top", /\b(best|top|most (viewed|popular)|biggest|popular|hit)\b/],
            [
                "compare",
                /\b(compare|compared|vs|versus|better|worse|than usual)\b/,
            ],
            [
                "growth",
                /\b(views|growth|growing|grow|doing|performance|perform|overview|summary|channel|stats|analytics|watch time)\b/,
            ],
        ];
        for (var i = 0; i < T.length; i++) if (T[i][1].test(ql)) return T[i][0];
        return null;
    }
    function vsPhrase(mk, vs) {
        var t = versusText(mk, vs);
        if (!t) return "";
        return t.charAt(0).toLowerCase() + t.slice(1);
    }
    function answer(q, opt) {
        opt = opt || {};
        var ql = q.toLowerCase().replace(/[’']/g, "'");
        var intent = intentOf(ql),
            rk = rangeIn(ql),
            vid = (opt.v && byKey[opt.v]) || videoIn(ql);
        if (/\b(this video|that video|it)\b/.test(ql) && ASK.ctx.v && !vid)
            vid = ASK.ctx.v;
        // Follow-ups like "what about the last 90 days?" reuse the previous intent.
        if (!intent && rk && ASK.ctx.intent) intent = ASK.ctx.intent;
        if (!intent && vid) intent = "latest";
        if (
            /^(and|what about|how about)\b/.test(ql) &&
            ASK.ctx.intent &&
            (rk || vid) &&
            !intentOf(ql.replace(/^(and|what about|how about)\s*/, ""))
        )
            intent = ASK.ctx.intent;
        if (opt.v && !intent) intent = "latest";
        var r = rangeOf(
            rk && rk !== "rt"
                ? rk
                : ASK.ctx.range && !rk
                  ? ASK.ctx.range
                  : "last28",
        );
        ASK.ctx.range = r.key;
        ASK.ctx.intent = intent || ASK.ctx.intent;
        var fn =
            {
                caps: aCaps,
                ideas: aIdeas,
                titles: aTitles,
                desc: aDesc,
                thumb: aThumb,
                thumbgen: aThumbGen,
                plan: aPlan,
                post: aPost,
                questions: aQuestions,
                topics: aTopics,
                retention: aRetention,
                comments: aComments,
                when: aWhen,
                traffic: aTraffic,
                newv: aNewViewers,
                demo: aDemo,
                ypp: aYpp,
                rev: aRevenue,
                subs: aSubs,
                shorts: aShorts,
                latest: aLatest,
                top: aTop,
                compare: aGrowth,
                growth: aGrowth,
            }[intent] || aFallback;
        var res = fn({ q: q, ql: ql, r: r, v: vid, rt: rk === "rt" });
        res.intent = intent;
        if (CLOSE[intent]) res.blocks.push({ p: CLOSE[intent] });
        if (res.v) ASK.ctx.v = res.v;
        return res;
    }
    var CLOSE = {
        growth: "Is there anything specific from your channel's history or performance that you'd like to look into today?",
        compare:
            "Is there anything specific from your channel's history or performance that you'd like to look into today?",
        latest: "Would you like me to look at how viewers found this video, or where they stopped watching?",
        traffic:
            "Want me to dig into the search terms bringing viewers in, or suggest ways to raise your thumbnail click-through rate?",
        newv: "Would you like to see which videos brought in the most new viewers?",
        demo: "Want me to suggest video ideas tailored to this audience?",
        when: "Would you like me to help plan your next upload?",
        subs: "Want me to suggest ways to turn more viewers into subscribers?",
        rev: "Would you like ideas for raising your RPM?",
        ypp: "Want me to suggest video ideas that could help you get there faster?",
        top: "Would you like me to break down why your top video did so well?",
        shorts: "Want me to suggest Shorts you could cut from your best videos?",
        comments:
            "Would you like me to draft replies to any of these, or turn them into video ideas?",
        retention:
            "Would you like tips to tighten the first 30 seconds of your next video?",
        thumb: "Want me to sketch a few thumbnail concepts for your latest video?",
        titles: "Would you like me to write a description to match?",
        desc: "Want me to suggest a few title options too?",
        thumbgen:
            "Want me to write a title that pairs with one of these concepts?",
        plan: "Would you like me to outline the first video in this plan?",
        post: "Want a version with a poll instead?",
        questions:
            "Would you like me to turn one of these questions into a video idea?",
        topics: "Want me to suggest video ideas based on these interests?",
    };
    function inRange(r) {
        return r.key === "life"
            ? "since you started"
            : r.n
              ? "in the last " + r.n + " days"
              : r.label === "Since published"
                ? "since it was published"
                : "in " + r.label;
    }

    /* ── Answers ─────────────────────────────────────────────── */
    function aCaps() {
        return {
            blocks: [
                {
                    p:
                        "I'm Ask Studio, your AI creative partner here in YouTube Studio! Think of me as a specialized assistant designed to help you manage and grow your channel, **" +
                        S.name +
                        "**. Here's a look at how we can work together:",
                },
                {
                    ul: [
                        "**Brainstorm & Create:** I can suggest video ideas, help you workshop titles and descriptions, and sketch thumbnail concepts.",
                        "**Deep-Dive Analytics:** I can summarize how your channel and your latest videos are performing, and explain what's driving the numbers.",
                        "**Audience Insights:** I can tell you who your viewers are, what they're searching for, and when they're on YouTube.",
                        "**Community:** I can summarize your comments, find the top viewer questions, and draft a community post.",
                    ],
                },
                {
                    p: "Essentially, I'm here to handle the data-heavy and creative heavy-lifting so you can focus on making great content. What's on your mind today?",
                },
            ],
        };
    }
    function aGrowth(c) {
        var r = c.r,
            vv = versus("views", r),
            ww = versus("watch", r),
            ss = versus("subs", r),
            im = versus("impr", r),
            ct = versus("ctr", r),
            av = versus("avd", r);
        var prevLbl = r.n ? "vs. Prev " + r.n + " Days" : "vs. previous period";
        var pv = function (mk) {
            var cur = M[mk].sum(r.a, r.b),
                prev = r.pa >= BIRTH ? M[mk].sum(r.pa, r.pb) : null;
            if (prev == null) return "—";
            if (!prev) return cur ? "New" : "Steady (0%)";
            var d = ((cur - prev) / Math.abs(prev)) * 100;
            return Math.abs(d) < 0.5
                ? "Steady (0%)"
                : (d > 0 ? "+" : "") + d.toFixed(1) + "%";
        };
        var likesC = V.reduce(function (a, v) {
                return a + vsum(v, r.a, r.b) * vrate(v, "lk");
            }, 0),
            comC = V.reduce(function (a, v) {
                return a + vsum(v, r.a, r.b) * vrate(v, "cm");
            }, 0);
        var top = topIn(r).slice(0, 3);
        var mood = trendDir("views", vv);
        var blocks = [
            {
                p:
                    "Here's a look at how **" +
                    S.name +
                    "** performed " +
                    inRange(r) +
                    ". Your channel got **" +
                    full(vv.cur) +
                    " views**" +
                    (vv.base != null ? ", " + vsPhrase("views", vv) : "") +
                    ".",
            },
            { h: "Key Metrics Overview" },
            {
                table: {
                    head: [
                        "Metric",
                        r.n ? "Last " + r.n + " Days" : r.label,
                        "Comparison (" + prevLbl + ")",
                    ],
                    rows: [
                        ["Views", full(vv.cur), pv("views")],
                        [
                            "Watch Time",
                            (ww.cur < 100 ? ww.cur.toFixed(1) : full(ww.cur)) +
                                " hours",
                            pv("watch"),
                        ],
                        [
                            "Subscribers",
                            signed(full(ss.cur), ss.cur),
                            pv("subs"),
                        ],
                        ["Thumbnail impressions", full(im.cur), pv("impr")],
                        ["CTR (Click-Through Rate)", pct(ct.cur, 2), pv("ctr")],
                        ["Average View Duration", mmss(av.cur), pv("avd")],
                        ["Likes", full(likesC), pv("views")],
                        ["Comments", full(comC), pv("views")],
                    ],
                },
            },
            { h: "What's Performing Well" },
            {
                ul: top
                    .map(function (x, i) {
                        return (
                            (i === 0 ? "**Lead:** " : "") +
                            "[[v:" +
                            x.v.key +
                            "]] brought in **" +
                            full(x.views) +
                            " views** (" +
                            Math.round((x.views / Math.max(1, vv.cur)) * 100) +
                            "% of the period)."
                        );
                    })
                    .concat(
                        ct.cur >= 5
                            ? [
                                  "Your thumbnails are working: a **" +
                                      pct(ct.cur) +
                                      " click-through rate** is strong for your niche.",
                              ]
                            : [],
                    ),
            },
            { h: "Opportunities for Improvement" },
            {
                ul: [
                    mood < 0
                        ? "Views are below your usual range. A new upload usually brings the channel back, since your back catalog keeps getting recommended."
                        : "Keep the momentum: upload again while your recent videos are still being recommended.",
                    "Average view duration is **" +
                        mmss(av.cur) +
                        "**. Getting to the point faster in the first 30 seconds keeps more viewers watching.",
                    ss.cur < vv.cur * 0.002
                        ? "Few viewers are subscribing. A clear reason to come back, like a series, helps convert viewers into subscribers."
                        : "Subscribers are growing steadily. End screens pointing to your next video can keep that going.",
                ],
            },
        ];
        return { blocks: blocks };
    }
    function aLatest(c) {
        var v =
            c.v ||
            V.filter(function (x) {
                return x.vis === "Public";
            })[0];
        if (!v) return aFallback(c);
        var rk = rankOf(v),
            ent = videoEnt(v),
            rr = rangeOf("p" + Math.max(BIRTH, v.pubIdx));
        var vsV = ent.vs("views", rr),
            typical = vsV.base;
        var good = typical != null ? v.views >= typical * 1.1 : rk.rank <= 3,
            bad = typical != null && v.views < typical * 0.8;
        var trs = trafficRows(v.short ? "short" : ""),
            t0 = trs[0],
            t1 = trs[1];
        var blocks = [
            {
                p:
                    (c.v
                        ? "Here's how **“" + v.title + "”** is doing. "
                        : "Your latest " +
                          (v.short ? "Short" : "video") +
                          ", **“" +
                          v.title +
                          "”**, was published " +
                          ago(v.pub) +
                          ". ") +
                    "It has **" +
                    full(v.views) +
                    " views** so far and ranks **" +
                    rk.rank +
                    " of your last " +
                    rk.of +
                    "** " +
                    (v.short ? "Shorts" : "videos") +
                    " by views at this point." +
                    (typical != null
                        ? " That's " +
                          (good
                              ? "**above**"
                              : bad
                                ? "**below**"
                                : "about in line with") +
                          " your typical " +
                          (v.short ? "Short" : "video") +
                          " (" +
                          cmp(typical) +
                          " views by this age)."
                        : ""),
            },
            {
                card:
                    askVideo(
                        v,
                        firstLabel(v) + " · " + cmp(v.views) + " views",
                    ) +
                    askMetrics([
                        ["Views", cmp(v.views), "", 0],
                        v.short
                            ? [
                                  "Viewed (vs. swiped away)",
                                  pct(viewedPct(v)),
                                  "",
                                  0,
                              ]
                            : ["Click-through rate", pct(v.ctr), "", 0],
                        [
                            "Avg view duration",
                            mmss(v.avd),
                            pct(v.apv) + " of the video",
                            0,
                        ],
                        [
                            "Likes",
                            cmp(v.likes),
                            pct(likePct(v)) + " like ratio",
                            0,
                        ],
                    ]),
            },
            { h: "What stands out" },
            {
                ul: [
                    "Most views came from **" +
                        t0[0] +
                        "** (" +
                        pct(t0[1], 0) +
                        ")" +
                        (t1
                            ? ", followed by **" +
                              t1[0] +
                              "** (" +
                              pct(t1[1], 0) +
                              ")"
                            : "") +
                        ".",
                    v.short
                        ? "**" +
                          pct(viewedPct(v), 0) +
                          "** of people who saw it in the Shorts feed chose to view it."
                        : "Viewers watched **" +
                          pct(v.apv) +
                          "** of the video on average (" +
                          mmss(v.avd) +
                          " of " +
                          mmss(v.dur) +
                          ")" +
                          (v.apv >= typicalApv(v)
                              ? ", better than your typical retention."
                              : ", a little under your typical retention."),
                    "It has **" +
                        full(v.comments) +
                        " comments** and **" +
                        full(v.likes) +
                        " likes**" +
                        (v.subs > 0
                            ? ", and brought in about **" +
                              full(v.subs) +
                              " subscribers**."
                            : "."),
                ],
            },
            {
                p: good
                    ? "Nice work. To build on it, reply to early comments and consider a follow-up while interest is high."
                    : bad
                      ? "It's off to a slower start. If the click-through rate is low, a clearer thumbnail or title can help; you can try Test & compare to find a stronger one."
                      : "It's tracking close to your usual. Keep an eye on the first week, when most of its views will come in.",
            },
            {
                card: askLink(
                    "See video analytics",
                    "video/" + v.key + "/analytics",
                ),
            },
        ];
        blocks.splice(
            1,
            0,
            { h: "The Verdict: Where You Stand" },
            {
                table: {
                    head: ["Metric", "This video", "Your typical video"],
                    rows: [
                        [
                            "Views",
                            full(v.views),
                            typical != null ? full(Math.round(typical)) : "—",
                        ],
                        [
                            v.short
                                ? "Viewed (vs. swiped away)"
                                : "Thumbnail click-through rate",
                            v.short ? pct(viewedPct(v)) : pct(v.ctr),
                            v.short
                                ? "—"
                                : pct(
                                      LONG.slice(0, 10).reduce(function (a, x) {
                                          return a + x.ctr;
                                      }, 0) /
                                          Math.max(
                                              1,
                                              Math.min(10, LONG.length),
                                          ),
                                  ),
                        ],
                        [
                            "Average view duration",
                            mmss(v.avd),
                            mmss(
                                (v.short ? SHORTS : LONG)
                                    .slice(0, 10)
                                    .reduce(function (a, x) {
                                        return a + x.avd;
                                    }, 0) /
                                    Math.max(
                                        1,
                                        Math.min(
                                            10,
                                            (v.short ? SHORTS : LONG).length,
                                        ),
                                    ),
                            ),
                        ],
                        ["Ranking by views", rk.rank + " of " + rk.of, "—"],
                    ],
                },
            },
        );
        return { v: v, blocks: blocks };
    }
    function aTraffic(c) {
        var r = c.r,
            v = c.v,
            rows = trafficRows(v && v.short ? "short" : "");
        var views = v
            ? videoEnt(v).sum("views", r.a, r.b)
            : M.views.sum(r.a, r.b);
        var t = rows.slice(0, 5);
        var srch = AU.search
            .slice(0, 3)
            .map(function (s) {
                return "“" + s[0] + "”";
            })
            .join(", ");
        var blocks = [
            {
                p:
                    (v ? "For **“" + v.title + "”**, " : "") +
                    "Most viewers found your content through **" +
                    t[0][0] +
                    "** (" +
                    pct(t[0][1]) +
                    " of views), then **" +
                    t[1][0] +
                    "** (" +
                    pct(t[1][1]) +
                    ") and **" +
                    t[2][0] +
                    "** (" +
                    pct(t[2][1]) +
                    ").",
            },
            {
                card: hbars(
                    t.map(function (x) {
                        return [x[0], x[1]];
                    }),
                    {
                        fmt: function (p) {
                            return cmp((views * p) / 100) + " · " + pct(p, 0);
                        },
                    },
                ),
            },
            { h: "What this means" },
            {
                ul: [
                    /Browse|Suggested/.test(t[0][0])
                        ? "YouTube is recommending your videos on the home page and next to other videos. Thumbnails and titles matter most here, since they decide who clicks."
                        : /search/i.test(t[0][0])
                          ? "Search is your biggest source, so viewers come looking for specific topics. Clear, keyword-rich titles help here."
                          : "A big share comes from the Shorts feed, where the first second decides whether viewers stay.",
                    "Top searches that led to your channel include " +
                        srch +
                        ".",
                    "**" +
                        pct(shareOf(AU.traffic, "External") * 100 || 4, 0) +
                        "** came from outside YouTube, mostly " +
                        AU.external
                            .slice(0, 2)
                            .map(function (x) {
                                return x[0];
                            })
                            .join(" and ") +
                        ".",
                ],
            },
            {
                card: askLink(
                    "See traffic sources in analytics",
                    "analytics/content",
                ),
            },
        ];
        return {
            v: v,
            steps: [
                "Looking at traffic sources",
                "Checking search terms and external sites",
            ],
            source: "Reviewed traffic sources · " + r.label,
            blocks: blocks,
            follow: [
                "How can I improve my click-through rate?",
                "What are my viewers searching for?",
                "How many new viewers did I reach?",
            ],
        };
    }
    function aNewViewers(c) {
        var r = c.r,
            nv = M.newv.sum(r.a, r.b),
            rv = M.ret.sum(r.a, r.b),
            u = M.uniq.sum(r.a, r.b);
        var pr = r.pa >= BIRTH ? M.newv.sum(r.pa, r.pb) : null;
        var beh = AU.behavior;
        return {
            steps: [
                "Looking at your audience",
                "Counting new and returning viewers",
            ],
            source: "Reviewed audience analytics · " + r.label,
            blocks: [
                {
                    p:
                        "You reached about **" +
                        full(nv) +
                        " new viewers** " +
                        inRange(r) +
                        ", people who hadn't watched your channel before" +
                        (pr != null
                            ? ", " +
                              (nv >= pr
                                  ? Math.round(
                                        (nv / Math.max(1, pr) - 1) * 100,
                                    ) + "% more"
                                  : Math.round(
                                        (1 - nv / Math.max(1, pr)) * 100,
                                    ) + "% fewer") +
                              " than the period before"
                            : "") +
                        ". About **" +
                        full(rv) +
                        "** returning viewers watched too, for **" +
                        full(u) +
                        " unique viewers** in total.",
                },
                {
                    card:
                        askMetrics([
                            ["New viewers", cmp(nv), "", 0],
                            ["Returning viewers", cmp(rv), "", 0],
                            ["Unique viewers", cmp(u), "", 0],
                        ]) +
                        '<div class="stack ask-st">' +
                        beh
                            .map(function (b, i) {
                                return (
                                    '<i class="s' +
                                    i +
                                    '" style="width:' +
                                    b[1] +
                                    '%"></i>'
                                );
                            })
                            .join("") +
                        '</div><div class="ask-lg2">' +
                        beh
                            .map(function (b, i) {
                                return (
                                    '<span><i class="sw s' +
                                    i +
                                    '"></i>' +
                                    esc(b[0]) +
                                    " " +
                                    pct(b[1], 0) +
                                    "</span>"
                                );
                            })
                            .join("") +
                        "</div>",
                },
                {
                    p:
                        "New viewers mostly arrive through " +
                        trafficRows("")[0][0].toLowerCase() +
                        ". Videos that do well with new viewers tend to have broad topics in the title and a strong first 30 seconds.",
                },
                {
                    card: askLink(
                        "Open the Audience tab",
                        "analytics/audience",
                    ),
                },
            ],
            follow: [
                "Where are my viewers from?",
                "When are my viewers on YouTube?",
                "How did viewers find my content?",
            ],
        };
    }
    function aDemo(c) {
        var r = c.r,
            g = AU.gender,
            age = AU.age.slice().sort(function (a, b) {
                return b[1] - a[1];
            });
        var geo = AU.geo;
        var dev = AU.devices;
        return {
            steps: ["Looking at your audience demographics"],
            source: "Reviewed audience analytics · " + r.label,
            blocks: [
                {
                    p:
                        "Your audience is **" +
                        pct(g[0][1], 0) +
                        " " +
                        g[0][0].toLowerCase() +
                        "** and **" +
                        pct(g[1][1], 0) +
                        " " +
                        g[1][0].toLowerCase() +
                        "**. The biggest age group is **" +
                        age[0][0] +
                        "** (" +
                        pct(age[0][1], 0) +
                        "), followed by " +
                        age[1][0] +
                        " (" +
                        pct(age[1][1], 0) +
                        ").",
                },
                {
                    card: hbars(
                        AU.age.map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                },
                {
                    p:
                        "Most views come from **" +
                        geo[0][0] +
                        "** (" +
                        pct(geo[0][1], 0) +
                        "), then " +
                        geo
                            .slice(1, 4)
                            .map(function (x) {
                                return x[0] + " (" + pct(x[1], 0) + ")";
                            })
                            .join(", ") +
                        ". Viewers watch mostly on **" +
                        dev[0][0].toLowerCase() +
                        "s** (" +
                        pct(dev[0][1], 0) +
                        ")" +
                        (dev[1]
                            ? " and " +
                              dev[1][0] +
                              " (" +
                              pct(dev[1][1], 0) +
                              ")"
                            : "") +
                        ".",
                },
                {
                    card: hbars(
                        geo.slice(0, 5).map(function (a) {
                            return [a[0], a[1]];
                        }),
                    ),
                },
                {
                    card: askLink(
                        "Open the Audience tab",
                        "analytics/audience",
                    ),
                },
            ],
            follow: [
                "When are my viewers on YouTube?",
                "How many new viewers did I reach?",
                "Give me video ideas for this audience",
            ],
        };
    }
    function aWhen() {
        var best = [],
            heat = AU.heat;
        for (var d = 0; d < 7; d++)
            for (var h = 0; h < 24; h++)
                best.push({ d: d, h: h, v: heat[d][h] });
        best.sort(function (a, b) {
            return b.v - a.v;
        });
        var top = best[0],
            dayBest = {};
        best.forEach(function (x) {
            dayBest[x.d] = (dayBest[x.d] || 0) + x.v;
        });
        var days = Object.keys(dayBest)
            .sort(function (a, b) {
                return dayBest[b] - dayBest[a];
            })
            .slice(0, 2)
            .map(function (d) {
                return WDL[d];
            });
        var hl = function (h) {
            return (h % 12 || 12) + " " + (h < 12 ? "AM" : "PM");
        };
        var pub = (top.h - 2 + 24) % 24;
        return {
            steps: ["Looking at when your viewers are on YouTube"],
            source: "Reviewed audience activity · Last 28 days",
            blocks: [
                {
                    p:
                        "Your viewers are most active on **" +
                        days.join(" and ") +
                        "**, peaking around **" +
                        hl(top.h) +
                        "** your time. To catch that peak, publish about **two hours earlier, around " +
                        hl(pub) +
                        "**, so your video has time to be picked up before most of your audience opens YouTube.",
                },
                { card: heatmap(AU.heat) },
                {
                    p: "This is based on when your viewers watched any video on YouTube in the last 28 days, not just yours. Consistency matters more than the exact hour, so pick a slot you can keep.",
                },
                {
                    card: askLink(
                        "Open the Audience tab",
                        "analytics/audience",
                    ),
                },
            ],
            follow: [
                "How many new viewers did I reach?",
                "Give me video ideas for my channel",
            ],
        };
    }
    function aSubs(c) {
        var r = c.r,
            ss = versus("subs", r),
            g = M.sgain.sum(r.a, r.b),
            l = M.slost.sum(r.a, r.b);
        var top = topIn(r, null, "subs").slice(0, 3);
        return {
            steps: [
                "Looking at subscriber changes",
                "Finding the videos that brought in subscribers",
            ],
            source: "Reviewed subscriber analytics · " + r.label,
            blocks: [
                {
                    p:
                        "You " +
                        (ss.cur >= 0
                            ? "gained a net **" +
                              signed(full(ss.cur), ss.cur) +
                              " subscribers**"
                            : "lost a net **" +
                              full(-ss.cur) +
                              " subscribers**") +
                        " " +
                        inRange(r) +
                        (ss.base != null ? ", " + vsPhrase("subs", ss) : "") +
                        ": **" +
                        full(g) +
                        "** subscribed and **" +
                        full(l) +
                        "** unsubscribed. You now have **" +
                        full(S.subs) +
                        " subscribers**.",
                },
                {
                    card: askMetrics([
                        [
                            "Net change",
                            signed(cmp(ss.cur), ss.cur),
                            versusText("subs", ss),
                            trendDir("subs", ss),
                        ],
                        ["Gained", cmp(g), "", 0],
                        ["Lost", cmp(l), "", 0],
                    ]),
                    chart: { pts: series("subs", r), mk: "subs", gran: r.gran },
                },
                top.length
                    ? { p: "The videos that brought in the most subscribers:" }
                    : { p: "" },
                {
                    card: top
                        .map(function (x) {
                            return askVideo(
                                x.v,
                                "+" +
                                    full(x.subs) +
                                    " subscribers · " +
                                    cmp(x.views) +
                                    " views",
                            );
                        })
                        .join(""),
                },
                {
                    p: "Videos that convert well usually end with a reason to come back, like a series or a clear promise of what's next.",
                },
            ].filter(function (x) {
                return x.p !== "";
            }),
            follow: [
                "Summarize my latest video performance",
                "Give me video ideas for my channel",
            ],
        };
    }
    function aRevenue(c) {
        if (!S.monetized) return aYpp(c);
        var r = c.r,
            rv = versus("rev", r),
            rpm = M.rpm.sum(r.a, r.b),
            cpm = M.cpm.sum(r.a, r.b);
        var top = topIn(r, null, "rev").slice(0, 3);
        var src =
            AU.revenue && AU.revenue.length
                ? AU.revenue
                : [["Watch Page ads", 85]];
        return {
            steps: [
                "Looking at your revenue",
                "Checking RPM and top-earning videos",
            ],
            source: "Reviewed revenue analytics · " + r.label,
            blocks: [
                {
                    p:
                        "You earned an estimated **" +
                        money(rv.cur, { cents: true }) +
                        "** " +
                        inRange(r) +
                        (rv.base != null ? ", " + vsPhrase("rev", rv) : "") +
                        ". Your **RPM** (what you earn per 1,000 views) was **" +
                        money(rpm, { cents: true }) +
                        "**, and advertisers paid a **playback-based CPM of " +
                        money(cpm, { cents: true }) +
                        "**.",
                },
                {
                    card: askMetrics([
                        [
                            "Estimated revenue",
                            money(rv.cur, { cents: rv.cur < 1000 }),
                            versusText("rev", rv),
                            trendDir("rev", rv),
                        ],
                        ["RPM", money(rpm, { cents: true }), "", 0],
                        [
                            "Playback-based CPM",
                            money(cpm, { cents: true }),
                            "",
                            0,
                        ],
                    ]),
                    chart: { pts: series("rev", r), mk: "rev", gran: r.gran },
                },
                {
                    p:
                        "Most of it came from **" +
                        src[0][0] +
                        "** (" +
                        pct(src[0][1], 0) +
                        ")" +
                        (src[1]
                            ? ", then " +
                              src[1][0] +
                              " (" +
                              pct(src[1][1], 0) +
                              ")"
                            : "") +
                        ". Your top-earning videos:",
                },
                {
                    card: top
                        .map(function (x) {
                            return askVideo(
                                x.v,
                                money(x.rev, { cents: true }) +
                                    " · " +
                                    cmp(x.views) +
                                    " views",
                            );
                        })
                        .join(""),
                },
                {
                    p: "Longer videos that keep viewers watching past 8 minutes can carry mid-roll ads, which usually lifts RPM.",
                },
                { card: askLink("Open the Revenue tab", "analytics/revenue") },
            ],
            follow: [
                "How can I increase my RPM?",
                "Which videos earned the most this year?",
                "Summarize my latest video performance",
            ],
        };
    }
    function aYpp() {
        var r365 = rangeOf("last365"),
            r90 = rangeOf("last90"),
            wh = M.watch.sum(r365.a, r365.b),
            sv = M.sviews.sum(r90.a, r90.b);
        if (S.monetized)
            return {
                steps: ["Checking your Partner Program status"],
                source: "Reviewed monetization status",
                blocks: [
                    {
                        p: "You're already in the **YouTube Partner Program**, so you earn from ads, YouTube Premium and the Shorts feed. You can also turn on memberships, Supers and Shopping from the Earn page.",
                    },
                    { card: askLink("Go to Earn", "earn") },
                ],
                follow: [
                    "How much did I earn this month?",
                    "How can I increase my RPM?",
                ],
            };
        return {
            steps: ["Checking your progress toward the Partner Program"],
            source: "Reviewed eligibility · Last 365 days",
            blocks: [
                {
                    p: "To earn from ads you need **1,000 subscribers** plus either **4,000 public watch hours** in the last 365 days or **10 million public Shorts views** in the last 90 days. Here's where you are:",
                },
                {
                    card: askMetrics([
                        [
                            "Subscribers",
                            full(S.subs) + " / 1,000",
                            S.subs >= 1000
                                ? "Done"
                                : full(1000 - S.subs) + " to go",
                            S.subs >= 1000 ? 1 : 0,
                        ],
                        [
                            "Watch hours (365 days)",
                            full(wh) + " / 4,000",
                            wh >= 4000 ? "Done" : full(4000 - wh) + " to go",
                            wh >= 4000 ? 1 : 0,
                        ],
                        ["Shorts views (90 days)", cmp(sv) + " / 10M", "", 0],
                    ]),
                },
                {
                    p:
                        S.subs >= 500 && wh >= 3000
                            ? "You already qualify for the first level: fan funding and Shopping (500 subscribers and 3,000 watch hours)."
                            : "Keep uploading on a steady schedule; channels usually cross these thresholds through one or two videos that take off.",
                },
                { card: askLink("Go to Earn", "earn") },
            ],
            follow: [
                "Give me video ideas for my channel",
                "How did viewers find my content?",
            ],
        };
    }
    function aTop(c) {
        var r = c.r,
            kind = /\bshorts?\b/.test(c.ql)
                ? "short"
                : /\bvideos?\b/.test(c.ql) && !/shorts/.test(c.ql)
                  ? ""
                  : "",
            top = topIn(r, kind || null).slice(0, 5);
        if (!top.length) return aFallback(c);
        return {
            v: top[0].v,
            steps: ["Ranking your content by views"],
            source: "Reviewed top content · " + r.label,
            blocks: [
                {
                    p:
                        "Your most viewed " +
                        (kind === "short" ? "Shorts" : "content") +
                        " " +
                        inRange(r) +
                        " was **“" +
                        top[0].v.title +
                        "”** with **" +
                        full(top[0].views) +
                        " views**.",
                },
                {
                    card: top
                        .map(function (x, i) {
                            return askVideo(
                                x.v,
                                "#" +
                                    (i + 1) +
                                    " · " +
                                    full(x.views) +
                                    " views · " +
                                    mmss(x.v.avd) +
                                    " avg view duration",
                            );
                        })
                        .join(""),
                },
                {
                    p:
                        "Together these " +
                        top.length +
                        " made up **" +
                        Math.round(
                            (top.reduce(function (a, x) {
                                return a + x.views;
                            }, 0) /
                                Math.max(1, M.views.sum(r.a, r.b))) *
                                100,
                        ) +
                        "%** of your views " +
                        inRange(r) +
                        ".",
                },
            ],
            follow: [
                "Why did my top video do so well?",
                "Give me video ideas like my top video",
                "Summarize my latest video performance",
            ],
        };
    }
    function aShorts(c) {
        var r = c.r,
            sv = M.sviews.sum(r.a, r.b),
            lv = M.lviews.sum(r.a, r.b),
            tot = sv + lv || 1;
        var ts = topIn(r, "short")[0],
            tl = topIn(r, "video")[0];
        return {
            steps: ["Comparing Shorts and videos"],
            source: "Reviewed content analytics · " + r.label,
            blocks: [
                {
                    p: SHORTS.length
                        ? "**Shorts** brought in **" +
                          full(sv) +
                          " views** (" +
                          pct((sv / tot) * 100, 0) +
                          ") " +
                          inRange(r) +
                          ", and **videos** brought in **" +
                          full(lv) +
                          "** (" +
                          pct((lv / tot) * 100, 0) +
                          "). Videos earn far more watch time per view, while Shorts are better at reaching new viewers."
                        : "You haven't posted Shorts recently, so all " +
                          full(lv) +
                          " views " +
                          inRange(r) +
                          " came from videos. Shorts are a low-effort way to reach new viewers; clips from your best videos are a good start.",
                },
                {
                    card:
                        askMetrics([
                            ["Shorts views", cmp(sv), "", 0],
                            ["Video views", cmp(lv), "", 0],
                        ]) +
                        (ts
                            ? askVideo(
                                  ts.v,
                                  "Top Short · " + cmp(ts.views) + " views",
                              )
                            : "") +
                        (tl
                            ? askVideo(
                                  tl.v,
                                  "Top video · " + cmp(tl.views) + " views",
                              )
                            : ""),
                },
            ],
            follow: [
                "Give me Shorts ideas",
                "How did viewers find my content?",
            ],
        };
    }
    function aComments(c) {
        var cs = P.C.filter(function (x) {
            return !c.v || x.v === c.v.key;
        }).slice(0, 40);
        if (!cs.length)
            return {
                blocks: [
                    { p: "There aren't any recent comments to summarize yet." },
                ],
            };
        var asks = cs.filter(function (x) {
            return /\?|part 2|please|can you|series|more/.test(
                x.t.toLowerCase(),
            );
        });
        var quotes = cs
            .slice()
            .sort(function (a, b) {
                return b.l - a.l;
            })
            .slice(0, 3);
        return {
            blocks: [
                {
                    p:
                        "Here's a summary of " +
                        (c.v
                            ? "the comments on [[v:" + c.v.key + "]]"
                            : "your recent comments") +
                        ". Overall, the response is **very positive**.",
                },
                { h: "What viewers love" },
                {
                    ul: [
                        "**Your content:** viewers praise the video and the editing, and many say they rewatched it. [[c]]",
                        "**You:** people mention your personality and how you explain things. [[c]]",
                    ],
                },
                { h: "What viewers are asking for" },
                {
                    ul: asks.length
                        ? asks.slice(0, 3).map(function (x) {
                              return "“" + x.t + "” [[c]]";
                          })
                        : [
                              "Viewers would like more videos like this one. [[c]]",
                          ],
                },
                { h: "Top comments" },
                {
                    card: quotes
                        .map(function (x) {
                            var v = byKey[x.v];
                            return (
                                '<div class="aq">' +
                                letterAv(x, 24) +
                                '<div><div class="aq-a">' +
                                esc(x.a) +
                                (v
                                    ? ' <span class="muted">on “' +
                                      esc(v.title.slice(0, 40)) +
                                      "”</span>"
                                    : "") +
                                '</div><div class="aq-t">' +
                                esc(x.t) +
                                "</div></div></div>"
                            );
                        })
                        .join(""),
                },
            ],
        };
    }
    function aRetention(c) {
        var v =
            c.v ||
            LONG.filter(function (x) {
                return x.vis === "Public";
            })[0];
        if (!v) return aFallback(c);
        var cur = retentionCurve(v),
            drop = 0,
            at = 0;
        for (var i = 3; i < 95; i++) {
            var d = cur[i - 3] - cur[i];
            if (d > drop) {
                drop = d;
                at = i;
            }
        }
        var t30 =
            cur[Math.min(100, Math.round((30 / Math.max(1, v.dur)) * 100))];
        var typ = typicalApv(v);
        return {
            v: v,
            steps: [
                "Looking at audience retention",
                "Finding where viewers drop off",
            ],
            source: "Reviewed audience retention · " + v.title.slice(0, 32),
            blocks: [
                {
                    p:
                        "On **“" +
                        v.title +
                        "”**, viewers watched **" +
                        pct(v.apv) +
                        "** on average (" +
                        mmss(v.avd) +
                        " of " +
                        mmss(v.dur) +
                        "), " +
                        (v.apv >= typ ? "better than" : "below") +
                        " your typical " +
                        pct(typ) +
                        ". About **" +
                        Math.round(t30 * 100) +
                        "%** were still watching at 0:30.",
                },
                { card: '<div class="ask-ret"></div>' },
                { h: "Where viewers leave" },
                {
                    ul: [
                        "The steepest drop is around **" +
                            mmss((at / 100) * v.dur) +
                            "**. Check what happens there: a slow section, a sponsor read or a topic change are common causes.",
                        "The first 30 seconds are where most viewers decide to stay. Get to the point the title promises as early as you can.",
                        "The last few percent always drop off when the end screen appears; that part is normal.",
                    ],
                },
                {
                    card: askLink(
                        "See retention in video analytics",
                        "video/" + v.key + "/analytics",
                    ),
                },
            ],
            follow: [
                "How can I improve retention?",
                "Summarize this video's performance",
            ],
            after: function (host) {
                var h = $(".ask-ret", host);
                if (h) retentionChart(h, v, { h: 110 });
            },
        };
    }
    function aThumb(c) {
        var v =
            c.v ||
            LONG.filter(function (x) {
                return x.vis === "Public";
            })[0];
        var r = c.r,
            ctr = M.ctr.sum(r.a, r.b),
            im = M.impr.sum(r.a, r.b);
        var best = LONG.slice(0, 20)
            .slice()
            .sort(function (a, b) {
                return b.ctr - a.ctr;
            })[0];
        return {
            v: v,
            steps: ["Looking at impressions and click-through rate"],
            source: "Reviewed reach analytics · " + r.label,
            blocks: [
                {
                    p:
                        "Your thumbnails were shown **" +
                        full(im) +
                        " times** " +
                        inRange(r) +
                        " and **" +
                        pct(ctr) +
                        "** of those impressions turned into views. Most channels land between 2% and 10%, so " +
                        (ctr >= 5
                            ? "that's a strong rate."
                            : ctr >= 3.5
                              ? "you're in a healthy range."
                              : "there's room to grow."),
                },
                {
                    card:
                        askMetrics([
                            ["Thumbnail impressions", cmp(im), "", 0],
                            ["Thumbnail click-through rate", pct(ctr), "", 0],
                        ]) +
                        (best
                            ? askVideo(
                                  best,
                                  "Highest CTR recently · " + pct(best.ctr),
                              )
                            : ""),
                },
                { h: "Ideas to try" },
                {
                    ul: [
                        "Use one clear subject and a face showing emotion, readable at phone size.",
                        "Keep thumbnail text to three or four words that add to the title rather than repeat it.",
                        "Use **Test & compare** to try up to three thumbnails or titles; YouTube picks the one with the most watch time.",
                    ],
                },
                v
                    ? {
                          card: askLink(
                              "Test thumbnails for “" +
                                  v.title.slice(0, 30) +
                                  "”",
                              "video/" + v.key + "/edit",
                          ),
                      }
                    : { p: "" },
            ].filter(function (x) {
                return x.p !== "";
            }),
            follow: [
                "Write better titles for my latest video",
                "How did viewers find my content?",
            ],
        };
    }
    function titleIdeas(v) {
        var t = v.title
                .replace(/\s*[#|].*$/, "")
                .replace(/[*()[\]]/g, "")
                .trim(),
            core = t.split(/[:\-–—!?.]/)[0].trim();
        var low = core.toLowerCase();
        return [
            core.charAt(0).toUpperCase() +
                core.slice(1) +
                " (what nobody tells you)",
            "I tried " + low + " so you don't have to",
            "The truth about " + low,
            low.charAt(0).toUpperCase() + low.slice(1) + ": the honest version",
            "Watch this before you " +
                (/(buy|try|start|make|do)/.test(low) ? low : "try " + low),
        ];
    }
    function aTitles(c) {
        var v =
            c.v ||
            ASK.ctx.v ||
            V.filter(function (x) {
                return x.vis === "Public";
            })[0];
        if (!v) return aIdeas(c);
        var ideas = titleIdeas(v);
        return {
            v: v,
            steps: ["Reading your video’s details", "Writing title options"],
            source: "Drafted titles for “" + v.title.slice(0, 30) + "”",
            blocks: [
                {
                    p:
                        "Here are a few title options for **“" +
                        v.title +
                        "”**. They keep your main topic up front and add a reason to click:",
                },
                {
                    card: ideas
                        .map(function (t) {
                            return (
                                '<div class="ai-row"><span>' +
                                esc(t) +
                                "</span>" +
                                '<button class="ib sm" data-cp="' +
                                esc(t) +
                                '" data-tip="Copy">' +
                                ic("copy") +
                                "</button></div>"
                            );
                        })
                        .join(""),
                },
                {
                    p: "Titles under about 60 characters show in full on most screens. You can test up to three with **Test & compare** on the video's details page.",
                },
                {
                    card: askLink(
                        "Edit video details",
                        "video/" + v.key + "/edit",
                    ),
                },
            ],
            follow: [
                "Write a description for this video",
                "How can I improve my click-through rate?",
            ],
        };
    }
    function aDesc(c) {
        var v =
            c.v ||
            ASK.ctx.v ||
            V.filter(function (x) {
                return x.vis === "Public";
            })[0];
        if (!v) return aIdeas(c);
        var topic = v.title
            .replace(/\s*[#|].*$/, "")
            .replace(/[*]/g, "")
            .trim();
        var d =
            "In this video: " +
            topic +
            ".\n\nIf you enjoyed it, subscribe for more and let me know in the comments what you want to see next.\n\nChapters\n0:00 Intro\n" +
            mmss(v.dur * 0.12) +
            " The main part\n" +
            mmss(v.dur * 0.7) +
            " What I learned\n" +
            mmss(v.dur * 0.92) +
            " Wrapping up\n\n#" +
            (S.niche || "video").toLowerCase() +
            " #" +
            S.handle.replace("@", "");
        return {
            v: v,
            steps: ["Reading your video’s details", "Writing a description"],
            source: "Drafted a description",
            blocks: [
                {
                    p:
                        "Here's a description for **“" +
                        v.title +
                        "”**. Chapters help viewers jump around and can show up in search:",
                },
                {
                    card:
                        '<pre class="ai-pre">' +
                        esc(d) +
                        '</pre><div class="ai-row end"><button class="btn tonal sm" data-cp="' +
                        esc(d) +
                        '">' +
                        ic("copy") +
                        "<span>Copy</span></button></div>",
                },
                {
                    card: askLink(
                        "Edit video details",
                        "video/" + v.key + "/edit",
                    ),
                },
            ],
            follow: [
                "Write better titles for this video",
                "Give me video ideas for my channel",
            ],
        };
    }
    function aIdeas(c) {
        var m =
            /(?:develop this video idea:|tell me more about the video idea|workshop a video idea about)\s*[“"]?(.+?)[”"]?\s*$/i.exec(
                c.q,
            );
        if (m && m[1].trim()) {
            var idea = m[1].trim().replace(/[.?!]$/, "");
            return {
                blocks: [
                    {
                        p:
                            "**“" +
                            idea +
                            "”** fits your channel well. Here's a way to shape it:",
                    },
                    { h: "Hook (first 15 seconds)" },
                    {
                        p: "Open on the most surprising moment or result, then promise what viewers will get by the end.",
                    },
                    { h: "Outline" },
                    {
                        ol: [
                            "Set up the question or challenge in under 30 seconds",
                            "Show the process, with one clear turning point in the middle",
                            "Pay off the promise from the hook",
                            "End with a question for the comments and point to a related video",
                        ],
                    },
                    { h: "Title options" },
                    {
                        card: [
                            idea,
                            idea + " (it actually worked)",
                            "I tried " +
                                idea.charAt(0).toLowerCase() +
                                idea.slice(1),
                        ]
                            .map(function (t) {
                                return (
                                    '<div class="ai-row"><span>' +
                                    esc(t) +
                                    '</span><button class="ibx sm" data-cp="' +
                                    esc(t) +
                                    '" data-tip="Copy">' +
                                    ic("copy") +
                                    "</button></div>"
                                );
                            })
                            .join(""),
                    },
                ],
            };
        }
        var top = topIn(rangeOf("last90"), "video")[0],
            shortsAsk = /\bshorts?\b/.test(c.ql);
        var base = shortsAsk
            ? [
                  "A 30-second version of your most viewed video",
                  "One quick tip from your latest upload",
                  "Behind the scenes of making your last video",
              ]
            : ideasFor(6).concat(ideasFor(9).slice(6)).slice(0, 3);
        var eyebrows = [
            top
                ? "Inspired by “" + top.v.title.slice(0, 48) + "”"
                : "Based on your recent uploads",
            "Based on audience requests in comments",
            "Popular with viewers like yours",
        ];
        var descs = [
            "Your audience responded strongly to this topic recently, so a follow-up is likely to be recommended to the same viewers.",
            "Viewers keep asking about this in your comments. Answering it directly builds trust and brings people back.",
            "Viewers who watch your channel also watch videos like this, so it can reach new people without leaving your niche.",
        ];
        return {
            blocks: [
                {
                    p:
                        (top
                            ? "Your audience responded best to [[v:" +
                              top.v.key +
                              "]] recently, and viewers often search for " +
                              AU.search
                                  .slice(1, 3)
                                  .map(function (s2) {
                                      return "“" + s2[0] + "”";
                                  })
                                  .join(" and ") +
                              ". "
                            : "") + "Here are a few ideas built around that:",
                },
                {
                    ideas: base.map(function (t, i) {
                        return {
                            eyebrow: eyebrows[i % 3],
                            title: t,
                            desc: descs[i % 3],
                        };
                    }),
                },
            ],
        };
    }
    // A short hook for a thumbnail: "TOP 15", "PIXEL VS IPHONE" or the title's subject.
    var HOOK_STOP =
        /^(with|from|this|that|your|what|when|have|just|into|about|they|them|will|were|best|most|than|then|here|there|every|after|before|actually|really|worth|which|while|video|vlog|update|part)$/i;
    function hookOf(title) {
        var t = title
                .replace(/[#|*()\[\]!?.,:;"“”]/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
            m;
        if ((m = /\b(top|best)\s+(\d+)\b/i.exec(t))) return ["TOP " + m[2]];
        if (
            (m =
                /\b([A-Za-z][\w']+)(?:\s+\d+)?(?:\s+\w+)?\s+vs\.?\s+([A-Za-z][\w']+)/i.exec(
                    t,
                ))
        )
            return [m[1].toUpperCase(), m[2].toUpperCase()];
        var words = t.split(" ").filter(function (w) {
            return (
                w.length > 3 &&
                !HOOK_STOP.test(w) &&
                !/^\d+$/.test(w) &&
                !/^(january|february|march|april|june|july|august|september|october|november|december)$/i.test(
                    w,
                )
            );
        });
        var caps = words
            .filter(function (w) {
                return /^[A-Z]/.test(w);
            })
            .sort(function (a, b) {
                return b.length - a.length;
            });
        var subject = (caps[0] || words[0] || "THIS").toUpperCase();
        return [subject + "?!"];
    }
    function aThumbGen(c) {
        var v = c.v;
        // "for my long-form video" with a Short attached: use the latest long video.
        if (!v || (v.short && /long/.test(c.ql)))
            v =
                LONG.filter(function (x) {
                    return x.vis === "Public";
                })[0] || v;
        if (!v) return aIdeas(c);
        var hook = hookOf(v.title),
            frames = [1, 2, 3];
        // Real frames from the video (hq1..3 are taken at 25, 50 and 75 percent).
        var frame = function (n) {
            var base = thumb(v, "hqdefault.jpg");
            return !v.custom && v.vid && !v.short
                ? "https://i.ytimg.com/vi/" +
                      encodeURIComponent(v.vid) +
                      "/hq" +
                      n +
                      ".jpg"
                : base;
        };
        var img = function (n) {
            return (
                '<img src="' +
                esc(frame(n)) +
                '" data-fb="' +
                esc(thumb(v, "hqdefault.jpg")) +
                '" alt="" referrerpolicy="no-referrer">'
            );
        };
        var two = hook.length > 1 ? hook : ["BEFORE", "AFTER"];
        return {
            v: v,
            blocks: [
                {
                    p:
                        (c.v && c.v !== v
                            ? "[[v:" +
                              c.v.key +
                              "]] is a Short, so here are concepts for your latest long-form video, [[v:" +
                              v.key +
                              "]]. "
                            : "Here are three thumbnail concepts for [[v:" +
                              v.key +
                              "]]. ") +
                        "Each one starts from a real frame of the video:",
                },
                { h: "Concept 1: Big Bold Hook" },
                {
                    card:
                        '<div class="tcon c1">' +
                        img(frames[1]) +
                        '<span class="tc-t">' +
                        esc(hook.length > 1 ? hook.join(" VS ") : hook[0]) +
                        '</span></div><div class="tc-l">High-contrast frame with a short hook</div>',
                },
                {
                    p: "**Why it works:** a few big words stay readable at phone size and tell viewers instantly what they'll get.",
                },
                { h: "Concept 2: Split-Screen Comparison (Two-Panel)" },
                {
                    card:
                        '<div class="tcon c2">' +
                        img(frames[0]) +
                        img(frames[2]) +
                        '<span class="tc-t l">' +
                        esc(two[0]) +
                        '</span><span class="tc-t r">' +
                        esc(two[1]) +
                        '</span></div><div class="tc-l">Two moments side by side</div>',
                },
                {
                    p: "**Why it works:** a visible contrast creates curiosity, which tends to raise click-through rate.",
                },
                { h: "Concept 3: Minimal Focus" },
                {
                    card:
                        '<div class="tcon c3">' +
                        img(frames[2]) +
                        '</div><div class="tc-l">Tight crop on one subject, no text</div>',
                },
                {
                    p: "**Why it works:** a clean image stands out in a busy feed and pairs well with a descriptive title.",
                },
                {
                    p: "You can try up to three thumbnails with **Test & compare** on the video's details page.",
                },
            ],
        };
    }
    function aPlan() {
        var ideas = ideasFor(6).concat(ideasFor(9).slice(6)),
            h = AU.heat,
            best = 0,
            bestD = 5;
        for (var d = 0; d < 7; d++) {
            var s2 = h[d].reduce(function (a, b) {
                return a + b;
            }, 0);
            if (s2 > best) {
                best = s2;
                bestD = d;
            }
        }
        var day = WDL[bestD];
        return {
            blocks: [
                {
                    p:
                        "Here's a four-week content plan based on what your audience is watching. Your viewers are most active on **" +
                        day +
                        "s**, so that's when each video goes out.",
                },
                {
                    table: {
                        head: ["Week", "Video", "Format"],
                        rows: [
                            ["Week 1", ideas[0], "Long-form"],
                            ["Week 2", ideas[1], "Long-form + 2 Shorts"],
                            ["Week 3", ideas[2], "Long-form"],
                            [
                                "Week 4",
                                ideas[3] ||
                                    "Answering your most asked questions",
                                "Long-form + community post",
                            ],
                        ],
                    },
                },
                {
                    ul: [
                        "Cut 1 or 2 Shorts from each long video to reach new viewers.",
                        "Post a community poll mid-week to keep subscribers engaged between uploads.",
                    ],
                },
            ],
        };
    }
    function aPost() {
        var v = V.filter(function (x) {
            return x.vis === "Public";
        })[0];
        var text = v
            ? "New video is up! 🎉 " +
              v.title.replace(/\s*[#|].*$/, "") +
              "\n\nWhat should I make next? Drop your ideas below 👇"
            : "What kind of video do you want to see next? Drop your ideas below 👇";
        return {
            blocks: [
                {
                    p:
                        "Here's a community post you can share" +
                        (v ? " to promote [[v:" + v.key + "]]" : "") +
                        ":",
                },
                {
                    card:
                        '<pre class="ai-pre">' +
                        esc(text) +
                        '</pre><div class="ai-row end"><button class="btn tonal sm" data-cp="' +
                        esc(text) +
                        '"><span>Copy</span></button><button class="btn tonal sm" data-go="content/posts"><span>Go to Posts</span></button></div>',
                },
                {
                    p: "Posts with a question or a poll usually get the most replies.",
                },
            ],
        };
    }
    function aQuestions() {
        var qs = P.C.filter(function (x) {
            return (
                /\?/.test(x.t) ||
                /^(can|how|what|where|which|why|do|is)\b/i.test(x.t)
            );
        }).slice(0, 5);
        return {
            blocks: [
                {
                    p: qs.length
                        ? "These are the questions viewers ask most in your recent comments:"
                        : "I didn't find many questions in your recent comments. Viewers mostly leave praise and reactions.",
                },
                qs.length
                    ? {
                          ol: qs.map(function (x) {
                              var v = byKey[x.v];
                              return (
                                  "“" +
                                  x.t +
                                  "”" +
                                  (v ? " on [[v:" + v.key + "]]" : "") +
                                  " [[c]]"
                              );
                          }),
                      }
                    : { p: "" },
                {
                    p: "Answering these in a video or a pinned comment shows viewers you're listening.",
                },
            ].filter(function (b) {
                return b.p !== "";
            }),
        };
    }
    function aTopics() {
        var terms = AU.search.slice(0, 5).map(function (x) {
            return x[0];
        });
        return {
            blocks: [
                {
                    p:
                        "Your viewers are into **" +
                        terms.slice(1, 4).join("**, **") +
                        "**, based on what they search for and watch across YouTube.",
                },
                {
                    table: {
                        head: ["Topic", "Search interest", "Your coverage"],
                        rows: terms.map(function (t, i) {
                            return [
                                t,
                                i < 2 ? "High" : i < 4 ? "Medium" : "Low",
                                i % 2 ? "Few videos" : "Covered",
                            ];
                        }),
                    },
                },
                {
                    p: "Topics with high interest and few of your videos are your best openings.",
                },
            ],
        };
    }
    function aFallback(c) {
        var r = rangeOf("last28"),
            vv = versus("views", r),
            ss = M.subs.sum(r.a, r.b);
        return {
            steps: ["Looking at your channel"],
            source: "Reviewed channel analytics · Last 28 days",
            blocks: [
                {
                    p:
                        "I'm not sure I understood that, but here's a quick look at your channel: **" +
                        full(vv.cur) +
                        " views** and **" +
                        signed(full(ss), ss) +
                        " subscribers** in the last 28 days" +
                        (vv.base != null ? ", " + vsPhrase("views", vv) : "") +
                        ".",
                },
                {
                    p:
                        "You can ask me about your latest video, where viewers come from, your audience, " +
                        (S.monetized ? "revenue, " : "") +
                        "or ideas for what to make next.",
                },
            ],
            follow: [
                "Summarize my latest video performance",
                "How did viewers find my content?",
                "Give me video ideas for my channel",
            ],
        };
    }

    /* ── Advanced mode ───────────────────────────────────────── */
    var ADV = {
        dim: "content",
        mk: "views",
        sel: {},
        v: null,
        prev: "analytics/overview",
    };
    var SERIES_COLORS = ["#ff4e45", "#00c853", "#ffab00", "#c158dc", "#ff6d00"];
    function advRows(r) {
        var tot = {
            views: M.views.sum(r.a, r.b),
            watch: M.watch.sum(r.a, r.b),
            subs: M.subs.sum(r.a, r.b),
            rev: M.rev.sum(r.a, r.b),
            impr: M.impr.sum(r.a, r.b),
            ctr: M.ctr.sum(r.a, r.b),
            avd: M.avd.sum(r.a, r.b),
        };
        var split = function (rows, key) {
            return rows.map(function (x) {
                var s = x[1] / 100;
                return {
                    k: key + x[0],
                    label: x[0],
                    views: tot.views * s,
                    watch: tot.watch * s,
                    subs: tot.subs * s,
                    rev: tot.rev * s,
                    impr: tot.impr * s,
                    ctr: tot.ctr,
                    avd: tot.avd,
                };
            });
        };
        if (ADV.v) {
            var v = ADV.v,
                e = videoEnt(v);
            tot = {
                views: e.sum("views", r.a, r.b),
                watch: e.sum("watch", r.a, r.b),
                subs: e.sum("subs", r.a, r.b),
                rev: e.sum("rev", r.a, r.b),
                impr: e.sum("impr", r.a, r.b),
                ctr: v.ctr,
                avd: v.avd,
            };
        }
        var rows;
        switch (ADV.dim) {
            case "content":
                rows = (ADV.v ? [vstats(ADV.v, r)] : topIn(r)).map(
                    function (x) {
                        return {
                            k: x.v.key,
                            label: x.v.title,
                            v: x.v,
                            views: x.views,
                            watch: x.wh,
                            subs: x.subs,
                            rev: x.rev,
                            impr: x.impr,
                            ctr: x.v.ctr,
                            avd: x.v.avd,
                        };
                    },
                );
                break;
            case "traffic":
                rows = split(
                    trafficRows(ADV.v && ADV.v.short ? "short" : ""),
                    "t:",
                );
                break;
            case "geo":
                rows = split(AU.geo, "g:");
                break;
            case "age":
                rows = split(AU.age, "a:");
                break;
            case "gender":
                rows = split(AU.gender, "s:");
                break;
            case "device":
                rows = split(AU.devices, "d:");
                break;
            case "subscribed":
                rows = split(AU.subscribed, "b:");
                break;
            case "date":
                rows = [];
                for (var i = r.b; i >= r.a && rows.length < 400; i--)
                    rows.push({
                        k: "dt" + i,
                        label: dLong(dayMs(i)),
                        views: M.views.sum(i, i),
                        watch: M.watch.sum(i, i),
                        subs: M.subs.sum(i, i),
                        rev: M.rev.sum(i, i),
                        impr: M.impr.sum(i, i),
                        ctr: M.ctr.sum(i, i),
                        avd: M.avd.sum(i, i),
                    });
                break;
        }
        rows.sort(function (a, b) {
            return ADV.dim === "date" ? 0 : b[ADV.mk] - a[ADV.mk];
        });
        return { tot: tot, rows: rows };
    }
    function advancedPage() {
        var r = rangeOf(ST.range),
            d = advRows(r);
        var DIMS = [
            ["content", "Content"],
            ["traffic", "Traffic source"],
            ["geo", "Geography"],
            ["age", "Viewer age"],
            ["gender", "Viewer gender"],
            ["date", "Date"],
            ["subscribed", "Subscription status"],
            ["device", "Device type"],
        ];
        var cols = [
            ["views", "Views"],
            ["watch", "Watch time (hours)"],
            ["avd", "Average view duration"],
            ["subs", "Subscribers"],
        ];
        if (S.monetized) cols.push(["rev", "Estimated revenue"]);
        cols.push(
            ["impr", "Thumbnail impressions"],
            ["ctr", "Thumbnail click-through rate"],
        );
        var fmt = function (k, x) {
            return k === "avd"
                ? mmss(x)
                : k === "ctr"
                  ? pct(x)
                  : k === "rev"
                    ? money(x, { cents: true })
                    : k === "watch"
                      ? x < 100
                          ? x.toFixed(1)
                          : full(x)
                      : k === "subs"
                        ? signed(full(x), x)
                        : full(x);
        };
        var share = function (k, x) {
            return d.tot[k] && k !== "avd" && k !== "ctr"
                ? ' <span class="muted">' +
                      ((x / d.tot[k]) * 100).toFixed(1) +
                      "%</span>"
                : "";
        };
        var selKeys = Object.keys(ADV.sel).filter(function (k) {
            return ADV.sel[k];
        });
        var html =
            '<div class="adv"><div class="adv-top">' +
            ibtn("close", 'data-act="advclose"', "Close") +
            '<h1 class="adv-t">' +
            (ADV.v ? esc(ADV.v.title) : "Channel analytics") +
            '</h1><span class="fl"></span>' +
            btn("Compare to", 'data-act="noop"', "text", "compare") +
            ibtn("download", 'data-act="export"', "Export current view") +
            datePicker(r, "adp") +
            "</div>" +
            '<div class="adv-ch"><div class="adv-chh"><button class="sel sm" data-act="advmk"><span>' +
            esc(M[ADV.mk].label) +
            "</span>" +
            ic("caret") +
            '</button><span class="muted sm">' +
            (selKeys.length
                ? "Total and " + selKeys.length + " selected"
                : "Total") +
            '</span></div><div class="adv-c" id="advc"></div></div>' +
            '<div class="adv-d">' +
            tabsBar(DIMS, ADV.dim, "data-dim") +
            "</div>" +
            '<div class="adv-tb"><div class="ar ah"><span class="ac0"></span><span class="ac1">' +
            esc(
                DIMS.filter(function (x) {
                    return x[0] === ADV.dim;
                })[0][1],
            ) +
            "</span>" +
            cols
                .map(function (c) {
                    return (
                        '<span class="acn' +
                        (c[0] === ADV.mk ? " on" : "") +
                        '" data-advsort="' +
                        c[0] +
                        '">' +
                        (c[0] === ADV.mk ? ic("arrow-down", "sm-ic") : "") +
                        esc(c[1]) +
                        "</span>"
                    );
                })
                .join("") +
            "</div>" +
            '<div class="ar tot"><span class="ac0"></span><span class="ac1"><b>Total</b></span>' +
            cols
                .map(function (c) {
                    return (
                        '<span class="acn"><b>' +
                        fmt(c[0], d.tot[c[0]]) +
                        "</b></span>"
                    );
                })
                .join("") +
            "</div>" +
            d.rows
                .slice(0, 100)
                .map(function (x, i) {
                    var on = ADV.sel[x.k],
                        ci = selKeys.indexOf(x.k);
                    return (
                        '<div class="ar' +
                        (on ? " sel" : "") +
                        '" data-k="' +
                        esc(x.k) +
                        '"><span class="ac0"><span class="ck' +
                        (on ? " on" : "") +
                        '" style="' +
                        (on
                            ? "background:" +
                              SERIES_COLORS[ci % 5] +
                              ";border-color:" +
                              SERIES_COLORS[ci % 5]
                            : "") +
                        '"></span></span><span class="ac1">' +
                        (x.v ? thumbImg(x.v, "adv-th") : "") +
                        "<span>" +
                        esc(x.label) +
                        "</span></span>" +
                        cols
                            .map(function (c) {
                                return (
                                    '<span class="acn">' +
                                    fmt(c[0], x[c[0]]) +
                                    (c[0] === ADV.mk
                                        ? share(c[0], x[c[0]])
                                        : "") +
                                    "</span>"
                                );
                            })
                            .join("") +
                        "</div>"
                    );
                })
                .join("") +
            "</div></div>";
        view.innerHTML = html;
        // chart: total plus any selected rows (per-video lines for the content dimension)
        var tpts = ADV.v
            ? videoEnt(ADV.v).series(ADV.mk, r)
            : series(ADV.mk, r);
        var extra = selKeys
            .map(function (k, i) {
                var row = d.rows.filter(function (x) {
                    return x.k === k;
                })[0];
                if (!row) return null;
                var pts = row.v
                    ? videoEnt(row.v).series(ADV.mk, r)
                    : tpts.map(function (p) {
                          return {
                              t: p.t,
                              v:
                                  p.v *
                                  (row[ADV.mk] / Math.max(1e-9, d.tot[ADV.mk])),
                          };
                      });
                if (r.gran === "month" && row.v)
                    pts = series(ADV.mk, r).map(function (p) {
                        return {
                            t: p.t,
                            v: videoEnt(row.v).sum(ADV.mk, p.a, p.b),
                        };
                    });
                return { pts: pts, color: SERIES_COLORS[i % 5] };
            })
            .filter(Boolean);
        lineChart($("#advc"), tpts, {
            mk: ADV.mk,
            h: 200,
            extra: extra,
            gran: r.gran,
            range: r,
            markers: !ADV.v && r.days <= 400,
            anim: true,
        });
        var adp = $(".adp");
        adp.addEventListener("click", function (e) {
            e.stopPropagation();
            pickRange(adp, ST.range, function (k) {
                setRange(k);
                advancedPage();
            });
        });
    }

    /* ── Page dispatch ───────────────────────────────────────── */
    var TITLES = {
        dashboard: "Channel dashboard",
        content: "Channel content",
        analytics: "Channel analytics",
        advanced: "Channel analytics",
        comments: "Community",
        subtitles: "Channel languages",
        copyright: "Content detection",
        earn: "Earn",
        customization: "Channel customization",
        audio: "Audio library",
    };
    function render(route, opt) {
        opt = opt || {};
        var prevRoute = ST.route;
        ST.route = route;
        clearInterval(rtTimer);
        after = [];
        var p = route.split("/");
        app.classList.toggle("adv-on", p[0] === "advanced");
        if (p[0] !== "content" || prevRoute !== route) {
            CT.page = 0;
            CT.sel = {};
        }
        try {
            switch (p[0]) {
                case "dashboard":
                    dashboard();
                    break;
                case "content":
                    contentPage(p[1]);
                    break;
                case "analytics":
                    analyticsPage(p[1]);
                    break;
                case "advanced":
                    ADV.v = p[1] ? byKey[p[1]] || null : null;
                    advancedPage();
                    break;
                case "video":
                    if (
                        p[2] === "analytics" &&
                        prevRoute.indexOf("video/" + p[1] + "/analytics") !== 0
                    )
                        VA.tab = "overview";
                    videoPage(p[1], p[2]);
                    break;
                case "comments":
                    commentsPage({ tab: p[1] });
                    break;
                case "subtitles":
                    subtitlesPage();
                    break;
                case "copyright":
                    copyrightPage();
                    break;
                case "earn":
                    earnPage(p[1]);
                    break;
                case "customization":
                    customizationPage(p[1]);
                    break;
                case "audio":
                    audioPage();
                    break;
                default:
                    ST.route = "dashboard";
                    dashboard();
            }
        } catch (err) {
            view.innerHTML =
                '<div class="pg">' +
                pageHead("Something went wrong") +
                '<p class="muted pad">Try reloading the page.</p></div>';
            if (window.console)
                console.error(String((err && err.stack) || err));
        }
        flushAfter();
        renderNav();
        var v = p[0] === "video" ? byKey[p[1]] : null;
        document.title =
            (v
                ? { analytics: "Video analytics", comments: "Video comments" }[
                      p[2]
                  ] || "Video details"
                : TITLES[p[0]] || "Channel dashboard") + " - YouTube Studio";
        if (!opt.keepScroll) window.scrollTo(0, 0);
    }

    /* ── Events ──────────────────────────────────────────────── */
    document.addEventListener("click", function (e) {
        var t = e.target;
        if (!t.closest) return;
        var a = t.closest("[data-ask]");
        if (a && !t.closest("#ask")) {
            e.preventDefault();
            openAsk(a.getAttribute("data-ask"), {
                v: a.getAttribute("data-askv"),
            });
            return;
        }
        var g = t.closest("[data-go]");
        if (g && !t.closest("#ask") && !t.closest(".menu")) {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            go(g.getAttribute("data-go"));
            return;
        }
        var tab;
        if ((tab = t.closest("[data-ctab]")))
            return go("content/" + tab.getAttribute("data-ctab"));
        if ((tab = t.closest("[data-atab]")))
            return go("analytics/" + tab.getAttribute("data-atab"));
        if ((tab = t.closest("[data-etab]")))
            return go(
                "earn" +
                    (tab.getAttribute("data-etab") === "overview"
                        ? ""
                        : "/" + tab.getAttribute("data-etab")),
            );
        if ((tab = t.closest("[data-cztab]")))
            return go("customization/" + tab.getAttribute("data-cztab"));
        if ((tab = t.closest("[data-cmtab]")))
            return go(
                "comments" +
                    (tab.getAttribute("data-cmtab") === "comments"
                        ? ""
                        : "/" + tab.getAttribute("data-cmtab")),
            );
        if ((tab = t.closest("[data-vtab]"))) {
            VA.tab = tab.getAttribute("data-vtab");
            return videoPage(ST.route.split("/")[1], "analytics");
        }
        if ((tab = t.closest("[data-ctype]"))) {
            AN.ctype = tab.getAttribute("data-ctype");
            return analyticsPage("content");
        }
        if ((tab = t.closest("[data-dim]")) && tab.classList.contains("tab")) {
            ADV.dim = tab.getAttribute("data-dim");
            ADV.sel = {};
            return advancedPage();
        }
        if ((tab = t.closest("[data-advsort]"))) {
            ADV.mk = tab.getAttribute("data-advsort");
            return advancedPage();
        }
        if ((tab = t.closest(".adv-tb .ar[data-k]"))) {
            var k = tab.getAttribute("data-k");
            if (
                !ADV.sel[k] &&
                Object.keys(ADV.sel).filter(function (x) {
                    return ADV.sel[x];
                }).length >= 5
            )
                return toast("You can select up to 5 rows");
            ADV.sel[k] = !ADV.sel[k];
            return advancedPage();
        }
        if ((tab = t.closest("[data-sort]"))) {
            var sk = tab.getAttribute("data-sort");
            if (CT.sort === sk) CT.dir = -CT.dir;
            else {
                CT.sort = sk;
                CT.dir = -1;
            }
            CT.page = 0;
            return rerenderTable(ST.route.split("/")[1] || "videos");
        }
        if ((tab = t.closest(".mkr"))) return;
        var b = t.closest("[data-act]");
        if (!b || b.disabled || b.closest("#ask")) return;
        var act = b.getAttribute("data-act"),
            row = b.closest("[data-v]"),
            v = row ? byKey[row.getAttribute("data-v")] : null;
        switch (act) {
            case "nav":
                return toggleNav();
            case "home":
                e.preventDefault();
                return go("dashboard");
            case "sclear":
                $("#sq").value = "";
                $("#sq").dispatchEvent(new Event("input"));
                return $("#sq").focus();
            case "help":
                return helpMenu(b);
            case "ask":
                return ASK.open ? closeAsk() : openAsk();
            case "notifs":
                return notifPanel(b);
            case "create":
                return createMenu(b);
            case "account":
                return accountMenu(b);
            case "settings":
                e.preventDefault();
                return settingsModal();
            case "feedback":
                e.preventDefault();
                return feedback();
            case "upload":
                return uploadDialog();
            case "golive":
                return goLive();
            case "newpost":
                return go("content/posts");
            case "newplaylist":
                return newPlaylist();
            case "newpodcast":
                return newPlaylist(true);
            case "collapse":
                var card = b.closest(".lvp");
                card.classList.toggle("shut");
                return;
            case "rankinfo":
                e.preventDefault();
                return modal(
                    '<div class="dlg-h"><h2>Ranking by views</h2>' +
                        ibtn("close", "data-x", "Close") +
                        '</div><div class="dlg-b"><p>Compares the views on this ' +
                        (v && v.short ? "Short" : "video") +
                        " with your last 10 " +
                        (v && v.short ? "Shorts" : "videos") +
                        " over the same amount of time since they were published.</p>" +
                        (function () {
                            var pool = (v.short ? SHORTS : LONG).slice(0, 10),
                                age = Math.max(1, Math.round(liveAge(v)));
                            return pool
                                .map(function (x) {
                                    var a2 = Math.max(PRE, x.pubIdx),
                                        n =
                                            x === v
                                                ? v.views
                                                : vsum(
                                                      x,
                                                      a2,
                                                      Math.min(
                                                          YDAY,
                                                          a2 + age - 1,
                                                      ),
                                                  );
                                    return { x: x, n: n };
                                })
                                .sort(function (p1, p2) {
                                    return p2.n - p1.n;
                                })
                                .map(function (o, i) {
                                    return (
                                        '<div class="rk' +
                                        (o.x === v ? " me" : "") +
                                        '"><span>' +
                                        (i + 1) +
                                        "</span>" +
                                        thumbImg(o.x, "rk-th") +
                                        '<span class="rk-t">' +
                                        esc(o.x.title) +
                                        "</span><b>" +
                                        cmp(o.n) +
                                        "</b></div>"
                                    );
                                })
                                .join("");
                        })() +
                        "</div>",
                    { w: 560 },
                );
            case "allsubs":
                return modal(
                    '<div class="dlg-h"><h2>Recent subscribers</h2>' +
                        ibtn("close", "data-x", "Close") +
                        '</div><div class="dlg-b"><p class="muted sm">Only subscribers who keep their subscriptions public are shown. Last 90 days.</p>' +
                        P.SUBS.map(function (s2) {
                            return (
                                '<div class="rs">' +
                                letterAv({ c: s2.c, n: s2.n }, 40) +
                                '<div><div class="rs-n">' +
                                esc(s2.n) +
                                '</div><div class="rs-s">' +
                                esc(cmp(s2.s)) +
                                " subscriber" +
                                (s2.s === 1 ? "" : "s") +
                                '</div></div><span class="fl"></span>' +
                                btn(
                                    "Subscribe",
                                    'data-act="noop"',
                                    "filled sm",
                                ) +
                                "</div>"
                            );
                        }).join("") +
                        "</div>",
                    { w: 520 },
                );
            case "ci-prev":
            case "ci-next":
                var ci = b.closest(".ci"),
                    i2 =
                        +ci.getAttribute("data-i") +
                        (act === "ci-next" ? 1 : CREATOR_INSIDER.length - 1);
                var tmp = document.createElement("div");
                tmp.innerHTML = dashInsider(i2);
                ci.replaceWith(tmp.firstChild);
                return;
            case "whatsnew":
                e.preventDefault();
                return openAsk("What's new in YouTube Studio?");
            case "advanced":
                ADV.prev = ST.route;
                ADV.mk = "views";
                ADV.dim = b.getAttribute("data-dim") || "content";
                ADV.sel = {};
                return go(
                    "advanced" +
                        (b.getAttribute("data-v")
                            ? "/" + b.getAttribute("data-v")
                            : ""),
                );
            case "advclose":
                return go(
                    ADV.v
                        ? "video/" + ADV.v.key + "/analytics"
                        : /^advanced/.test(ADV.prev)
                          ? "analytics/overview"
                          : ADV.prev,
                );
            case "advmk":
                return menuAt(
                    b,
                    ["views", "watch", "subs"]
                        .concat(S.monetized ? ["rev"] : [])
                        .concat(["impr", "ctr", "avd"])
                        .map(function (k2) {
                            return {
                                t: M[k2].label,
                                k: k2,
                                check: true,
                                on: k2 === ADV.mk,
                            };
                        }),
                    function (it) {
                        ADV.mk = it.k;
                        advancedPage();
                    },
                );
            case "export":
                return toast("Exporting current view as .csv");
            case "range":
                e.stopPropagation();
                return pickRange(b, ST.range, function (k3) {
                    setRange(k3);
                    render(ST.route, { keepScroll: true });
                });
            case "livecount":
                return liveCountModal();
            case "realtime":
                return realtimeModal();
            case "dismissvb":
                BANNER.off = true;
                var vb = $(".vbn");
                if (vb) vb.remove();
                return;
            case "audterms":
                AUD.terms = true;
                var ab = $(".vbn");
                if (ab) ab.remove();
                return;
            case "cmunresp":
                CM.unresp = false;
                render(ST.route, { keepScroll: true });
                return;
            case "cmsearch":
                var cq = $("#cmq");
                if (cq) cq.focus();
                return;
            case "aimore":
                return menuAt(
                    b,
                    [
                        { t: "Turn off suggested questions", ic: "hide" },
                        { t: "Learn about Ask Studio", ic: "help" },
                    ],
                    function (it) {
                        if (/Turn off/.test(it.t)) {
                            S.ai = false;
                            render(ST.route, { keepScroll: true });
                            toast("Suggested questions turned off");
                        } else openAsk("What can you do?");
                    },
                );
            case "vmenu":
                return videoMenu(b, v);
            case "vis":
                return visMenu(b, v);
            case "restr":
                return toast(
                    v && /Copyright/.test(v.restr)
                        ? "Copyright claim: the claimant is monetizing this video"
                        : "Age-restricted: not suitable for viewers under 18",
                );
            case "sel":
                if (v) {
                    CT.sel[v.key] = !CT.sel[v.key];
                    rerenderTable(ST.route.split("/")[1] || "videos");
                }
                return;
            case "selall":
                var rows2 = contentRows(
                        ST.route.split("/")[1] || "videos",
                    ).slice(CT.page * CT.per, CT.page * CT.per + CT.per),
                    allOn = rows2.every(function (x) {
                        return CT.sel[x.key];
                    });
                rows2.forEach(function (x) {
                    CT.sel[x.key] = !allOn;
                });
                return rerenderTable(ST.route.split("/")[1] || "videos");
            case "bulkclear":
                CT.sel = {};
                return rerenderTable(ST.route.split("/")[1] || "videos");
            case "bulkedit":
                return menuAt(
                    b,
                    [
                        { t: "Title" },
                        { t: "Description" },
                        { t: "Tags" },
                        { t: "Visibility" },
                        { t: "Comments" },
                    ],
                    function () {
                        toast(
                            "Bulk edits apply to " +
                                Object.keys(CT.sel).filter(function (x) {
                                    return CT.sel[x];
                                }).length +
                                " videos",
                        );
                    },
                );
            case "bulkpl":
                return toast("Added to playlist");
            case "bulkmore":
                return menuAt(
                    b,
                    [{ t: "Download" }, { t: "Delete forever" }],
                    function (it) {
                        toast(
                            it.t === "Download"
                                ? "Your downloads will start shortly"
                                : "Select one video at a time to delete it",
                        );
                    },
                );
            case "rmfilter":
                CT.filters.splice(+b.getAttribute("data-i"), 1);
                CT.page = 0;
                return rerenderTable(ST.route.split("/")[1] || "videos");
            case "pg":
                var kind = ST.route.split("/")[1] || "videos",
                    total = contentRows(kind).length,
                    lastP = Math.max(0, Math.ceil(total / CT.per) - 1),
                    w = b.getAttribute("data-p");
                CT.page =
                    w === "first"
                        ? 0
                        : w === "prev"
                          ? Math.max(0, CT.page - 1)
                          : w === "next"
                            ? Math.min(lastP, CT.page + 1)
                            : lastP;
                rerenderTable(kind);
                return window.scrollTo(0, 0);
            case "per":
                return menuAt(
                    b,
                    [10, 30, 50].map(function (n) {
                        return {
                            t: String(n),
                            n: n,
                            check: true,
                            on: n === CT.per,
                        };
                    }),
                    function (it) {
                        CT.per = it.n;
                        CT.page = 0;
                        rerenderTable(ST.route.split("/")[1] || "videos");
                    },
                );
            case "post":
                var pq = $("#postq");
                if (!pq || !pq.value.trim()) return pq && pq.focus();
                (ST.posts = ST.posts || []).unshift({
                    text: pq.value.trim(),
                    t: S.now,
                    likes: 0,
                    comments: 0,
                });
                render(ST.route, { keepScroll: true });
                return toast("Post published");
            case "copylink":
                copyText(b.getAttribute("data-link"));
                return toast("Link copied to clipboard");
            case "vdvis":
                var vv = byKey[ST.route.split("/")[1]];
                return visMenu(b, vv);
            case "playlist":
                return menuAt(
                    b,
                    [
                        {
                            t: "Best of " + dt(TODAY).getUTCFullYear(),
                            check: true,
                        },
                        { t: "Shorts", check: true },
                        "-",
                        { t: "New playlist", ic: "plus" },
                    ],
                    function (it) {
                        if (it.t === "New playlist") newPlaylist();
                        else toast("Added to " + it.t);
                    },
                );
            case "thupload":
                return toast("Choose an image at least 1280 x 720 pixels");
            case "thauto":
                return toast("Auto-generated thumbnails are ready");
            case "thtest":
                return modal(
                    '<div class="dlg-h"><h2>Test &amp; compare</h2>' +
                        ibtn("close", "data-x", "Close") +
                        '</div><div class="dlg-b"><p>Upload up to three thumbnails or titles to test. YouTube shows each one to a share of viewers and picks the one with the most watch time.</p><div class="tcmp3">' +
                        [1, 2, 3]
                            .map(function (n) {
                                return (
                                    '<div class="tcmp">' +
                                    (n === 1
                                        ? thumbImg(
                                              byKey[ST.route.split("/")[1]],
                                              "tcmp-i",
                                          )
                                        : ic("plus")) +
                                    "<span>" +
                                    (n === 1 ? "Current" : "Add thumbnail") +
                                    "</span></div>"
                                );
                            })
                            .join("") +
                        '</div></div><div class="dlg-f">' +
                        btn("Cancel", "data-x", "text") +
                        btn("Start test", "data-x", "filled") +
                        "</div>",
                    { w: 640 },
                );
            case "endscreen":
            case "cards":
                return toast(
                    act === "cards"
                        ? "Add cards to promote related content"
                        : "Add an end screen to promote your videos",
                );
            case "cmfilter":
                return menuAt(
                    b,
                    [
                        {
                            t: "Published",
                            check: true,
                            on: CM.filter === "published",
                            k: "published",
                        },
                        {
                            t: "Held for review",
                            check: true,
                            on: CM.filter === "held",
                            k: "held",
                        },
                        { t: "Likely spam", check: true, k: "held" },
                    ],
                    function (it) {
                        CM.filter = it.k;
                        render(ST.route, { keepScroll: true });
                    },
                );
            case "cmsort":
                return menuAt(
                    b,
                    [
                        {
                            t: "Most relevant",
                            check: true,
                            on: CM.sort !== "newest",
                            k: "relevant",
                        },
                        {
                            t: "Newest",
                            check: true,
                            on: CM.sort === "newest",
                            k: "newest",
                        },
                    ],
                    function (it) {
                        CM.sort = it.k;
                        render(ST.route, { keepScroll: true });
                    },
                );
            case "czpub":
                var nn = $("#cz-n"),
                    hh = $("#cz-h");
                if (nn && nn.value.trim()) S.name = nn.value.trim();
                if (hh && hh.value.trim())
                    S.handle = hh.value
                        .trim()
                        .replace(/^@?/, "@")
                        .replace(/\s+/g, "");
                renderNav();
                renderTop();
                return toast("Changes published");
            case "play":
                var tr = b.closest("[data-tk]"),
                    ti = +tr.getAttribute("data-tk");
                AUD.playing = AUD.playing === ti ? -1 : ti;
                return audioPage();
            case "star":
                var tr2 = b.closest("[data-tk]"),
                    ti2 = +tr2.getAttribute("data-tk");
                AUD.saved[ti2] = !AUD.saved[ti2];
                b.classList.toggle("on");
                return toast(
                    AUD.saved[ti2]
                        ? "Added to Starred"
                        : "Removed from Starred",
                );
            case "inspgo":
                var iq = $("#inspq");
                return openAsk(
                    iq && iq.value.trim()
                        ? "Help me develop this video idea: " + iq.value.trim()
                        : "Give me video ideas for my channel",
                );
            case "notify":
                return toast("We’ll let you know when you’re eligible");
            case "ypply":
                return toast("Application started");
            case "noop":
                return toast("This option isn’t available in this view");
        }
    });
    document.addEventListener("keydown", function (e) {
        var tag = (e.target.tagName || "").toLowerCase();
        if (e.key === "/" && tag !== "input" && tag !== "textarea") {
            e.preventDefault();
            var s = $("#sq");
            if (s) s.focus();
        }
        if (e.key === "Escape" && ASK.open && !$(".scrim")) closeAsk();
    });
    // Trends search box
    document.addEventListener("input", function (e) {
        if (e.target.id !== "trq") return;
        var q = e.target.value.trim(),
            out = $("#trr");
        if (!out) return;
        if (!q) {
            out.innerHTML =
                '<p class="muted">Search a topic to see what viewers are looking for and how much content already covers it.</p>';
            return;
        }
        var r = rng(q.toLowerCase()),
            vols = ["High", "Medium", "Low"];
        out.innerHTML =
            '<div class="srt">' +
            [q, q + " for beginners", "best " + q, q + " 2026", "how to " + q]
                .map(function (s, i) {
                    var vol = vols[Math.min(2, Math.floor(r() * 3 + i * 0.3))];
                    return (
                        '<div class="srt-r"><span>' +
                        ic("search") +
                        esc(s) +
                        (r() < 0.35
                            ? '<span class="gap">Content gap</span>'
                            : "") +
                        '</span><span class="vol v' +
                        vol.charAt(0) +
                        '"><i></i><i></i><i></i>' +
                        vol +
                        "</span></div>"
                    );
                })
                .join("") +
            "</div>";
    });
    // Redraw charts and layouts when the space changes (window, nav, Ask panel).
    var rsz = 0;
    window.addEventListener("resize", function () {
        clearTimeout(rsz);
        rsz = setTimeout(function () {
            $$(".chart").forEach(function (h) {
                if (h._lc && document.body.contains(h))
                    lineChart(h, h._lc.pts, h._lc.opt);
            });
            $$(".rt-b").forEach(function (h) {
                if (h._bc) barChart(h, h._bc.vals, h._bc.opt);
            });
            layoutMason();
            $$(".tabs").forEach(function (t) {
                placeInk(t.parentNode);
            });
        }, 120);
    });

    /* ── Boot ────────────────────────────────────────────────── */
    renderTop();
    var first = initialRoute();
    if (MODE !== "mem")
        history.replaceState({ r: first }, "", urlFor(first) + location.search);
    render(first);
    app.classList.add("ready");
})();
