const fs = require("fs");
const http = require("http");
const path = require("path");

function getCdpPages() {
    return new Promise((resolve, reject) => {
        http.get("http://127.0.0.1:9222/json/list", (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(JSON.parse(data)));
        }).on("error", reject);
    });
}

class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.id = 1;
        this.callbacks = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (msg) => {
                const res = JSON.parse(msg.data);
                if (res.id && this.callbacks.has(res.id)) {
                    const { resolve, reject } = this.callbacks.get(res.id);
                    this.callbacks.delete(res.id);
                    if (res.error) reject(res.error);
                    else resolve(res.result);
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.id++;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expression) {
        const res = await this.send("Runtime.evaluate", {
            expression,
            returnByValue: true,
            awaitPromise: true,
        });
        return res.result?.value;
    }

    async setViewport(width, height) {
        await this.send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: false,
        });
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

const extractScript =
    "(" +
    fs.readFileSync(path.join(__dirname, "extract_measurements.js"), "utf8") +
    ")";

async function measurePage(client, width, height, theme) {
    await client.setViewport(width, height);
    await client.eval("document.body.className = '" + theme + "';");
    await new Promise((r) => setTimeout(r, 600));
    const check = await client.eval("({ cn: document.body.className, cmuBg: window.getComputedStyle(document.querySelector('.card.dc.lvp[data-v=\"v0\"] .btn.cmu-p') || document.body).backgroundColor })");
    console.log(`[debug ${theme}]`, check);
    return await client.eval(extractScript);
}

function compareObjects(origObj, cloneObj, elemName) {
    const mismatches = [];
    if (!origObj || !cloneObj) {
        if (!origObj && !cloneObj) return mismatches;
        mismatches.push({
            element: elemName,
            property: "existence",
            original: origObj ? "exists" : "missing",
            clone: cloneObj ? "exists" : "missing",
        });
        return mismatches;
    }

    const propsToCompare = [
        "rect.width",
        "rect.height",
        "rect.x",
        "rect.y",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
        "color",
        "backgroundColor",
        "borderTop",
        "borderBottom",
        "borderRadius",
        "padding",
        "margin",
        "gap",
        "boxShadow",
    ];

    for (const prop of propsToCompare) {
        let origVal, cloneVal;
        if (prop.startsWith("rect.")) {
            const k = prop.split(".")[1];
            origVal = origObj.rect ? origObj.rect[k] : undefined;
            cloneVal = cloneObj.rect ? cloneObj.rect[k] : undefined;

            // Allow 1.5px tolerance for subpixel geometry differences
            if (typeof origVal === "number" && typeof cloneVal === "number") {
                if (Math.abs(origVal - cloneVal) > 1.5) {
                    mismatches.push({
                        element: elemName,
                        property: prop,
                        original: origVal,
                        clone: cloneVal,
                        diff: Math.round((cloneVal - origVal) * 10) / 10,
                    });
                }
                continue;
            }
        } else {
            origVal = origObj[prop];
            cloneVal = cloneObj[prop];
        }

        if (origVal !== cloneVal) {
            mismatches.push({
                element: elemName,
                property: prop,
                original: origVal,
                clone: cloneVal,
            });
        }
    }

    return mismatches;
}

async function main() {
    const pages = await getCdpPages();
    const pageA = pages.find((p) => p.url.includes("larplabs.io"));
    const pageB = pages.find((p) => p.url.includes("localhost:5173"));

    if (!pageA || !pageB) {
        console.error(
            "Could not find both pages. Pages:",
            pages.map((p) => p.url),
        );
        process.exit(1);
    }

    console.log("Connecting to Tab A (Original):", pageA.url);
    const clientA = new CdpClient(pageA.webSocketDebuggerUrl);
    await clientA.connect();

    console.log("Connecting to Tab B (Clone):", pageB.url);
    const clientB = new CdpClient(pageB.webSocketDebuggerUrl);
    await clientB.connect();

    const configs = [
        { name: "1920x1080_dark", w: 1920, h: 1080, theme: "dk" },
        { name: "1920x1080_light", w: 1920, h: 1080, theme: "lt" },
        { name: "1440x900_dark", w: 1440, h: 900, theme: "dk" },
        { name: "1440x900_light", w: 1440, h: 900, theme: "lt" },
    ];

    const fullReport = {
        generatedAt: new Date().toISOString(),
        viewports: {},
        allMismatchesCount: 0,
        mismatchesByConfig: {},
    };

    for (const cfg of configs) {
        console.log(`Running measured diff for ${cfg.name}...`);
        const origData = await measurePage(clientA, cfg.w, cfg.h, cfg.theme);
        const cloneData = await measurePage(clientB, cfg.w, cfg.h, cfg.theme);

        const mismatches = [];
        if (origData && cloneData) {
            for (const key of Object.keys(origData)) {
                const diffs = compareObjects(
                    origData[key],
                    cloneData[key],
                    key,
                );
                mismatches.push(...diffs);
            }
        }

        fullReport.viewports[cfg.name] = {
            original: origData,
            clone: cloneData,
            mismatches,
        };
        fullReport.mismatchesByConfig[cfg.name] = mismatches.length;
        fullReport.allMismatchesCount += mismatches.length;
    }

    // Restore defaults
    await clientA.setViewport(1440, 900);
    await clientA.eval("document.body.className = 'dk';");
    await clientB.setViewport(1440, 900);
    await clientB.eval("document.body.className = 'dk';");

    clientA.close();
    clientB.close();

    const outPath = path.join(__dirname, "diff.json");
    fs.writeFileSync(outPath, JSON.stringify(fullReport, null, 2), "utf8");
    console.log(
        `Successfully generated ${outPath} with ${fullReport.allMismatchesCount} total mismatches.`,
    );
}

main().catch((err) => {
    console.error("Error running diff:", err);
    process.exit(1);
});
