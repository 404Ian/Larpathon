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
            const styles = Array.from(document.styleSheets).map(s => {
              try {
                return Array.from(s.cssRules).map(r => r.cssText).join('\\n');
              } catch(e) {
                return '/* external: ' + s.href + ' */';
              }
            }).join('\\n\\n/* --- */\\n\\n');
            const fonts = Array.from(document.fonts).map(f => ({
              family: f.family,
              weight: f.weight,
              style: f.style,
              status: f.status
            }));
            const html = document.body.innerHTML;
            return { styles, fonts, htmlLength: html.length, bodyClass: document.body.className };
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
                fs.writeFileSync("recon/tab_a_styles.css", val.styles);
                console.log(
                    "Saved tab_a_styles.css, length:",
                    val.styles.length,
                );
                console.log("Fonts:", JSON.stringify(val.fonts, null, 2));
                console.log("Body class:", val.bodyClass);
                ws.close();
            }
        };
    });
});
