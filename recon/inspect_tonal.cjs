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

      const cfgs = [
        { w: 1920, h: 1080, theme: 'dk' },
        { w: 1920, h: 1080, theme: 'lt' },
        { w: 1440, h: 900, theme: 'dk' },
        { w: 1440, h: 900, theme: 'lt' },
      ];

      for (const c of cfgs) {
        await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: false });
        await send('Runtime.evaluate', { expression: "document.body.className = '" + c.theme + "';" });
        await new Promise(r => setTimeout(r, 600));
        const val = await send('Runtime.evaluate', {
          expression: `({
            theme: '${c.theme}',
            w: ${c.w},
            cn: document.body.className,
            btnBg: window.getComputedStyle(document.querySelector('.card.dc.lvp[data-v="v0"] .btn.cmu-p')).backgroundColor
          })`,
          returnByValue: true
        });
        console.log(val.result.value);
      }
      ws.close();
    };
  });
});
