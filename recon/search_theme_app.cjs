const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const pages = JSON.parse(data);
    const pA = pages.find(p => p.url.includes('larplabs.io'));
    const ws = new WebSocket(pA.webSocketDebuggerUrl);
    ws.onopen = async () => {
      const send = (method, params) => new Promise(res => {
        const id = Math.floor(Math.random() * 100000);
        const cb = msg => {
          const m = JSON.parse(msg.data);
          if (m.id === id) {
            ws.removeEventListener('message', cb);
            res(m.result);
          }
        };
        ws.addEventListener('message', cb);
        ws.send(JSON.stringify({ id, method, params }));
      });

      const res = await send('Runtime.evaluate', {
        expression: `fetch('https://larplabs.io/larp-assets/youtube-desktop/app.js?v=2026.10.10.1').then(r => r.text()).then(t => {
          const matches = [];
          const lines = t.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('theme') || lines[i].includes('.dk') || lines[i].includes('.lt') || lines[i].includes('tonal')) {
              matches.push({ line: i + 1, text: lines[i].substring(0, 150) });
            }
          }
          return matches.slice(0, 20);
        })`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Theme references in app.js:', res.result.value);
      ws.close();
    };
  });
});
