const http = require("http");
const fs = require("fs");

http.get("http://127.0.0.1:9222/json/list", (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", async () => {
        const pages = JSON.parse(data);
        const pA = pages.find((p) => p.url.includes("larplabs.io"));
        const ws = new WebSocket(pA.webSocketDebuggerUrl);
        ws.onopen = () => {
            ws.send(
                JSON.stringify({
                    id: 1,
                    method: "Runtime.evaluate",
                    params: {
                        expression: `(() => {
            const top = document.querySelector('#top')?.outerHTML || '';
            const nav = document.querySelector('#nav')?.outerHTML || '';
            const main = document.querySelector('#main')?.outerHTML || '';
            return { top, nav, main };
          })()`,
                        returnByValue: true,
                    },
                }),
            );
        };
        ws.onmessage = (msg) => {
            const r = JSON.parse(msg.data);
            if (r.id === 1) {
                const val = r.result.result.value;
                fs.writeFileSync("recon/tab_a_top.html", val.top);
                fs.writeFileSync("recon/tab_a_nav.html", val.nav);
                fs.writeFileSync("recon/tab_a_main.html", val.main);
                console.log("Saved top, nav, main HTML");
                ws.close();
            }
        };
    });
});
