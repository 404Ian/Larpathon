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

      console.log('1. Setting 1920x1080 dk');
      await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
      await send('Runtime.evaluate', { expression: "document.body.className = 'dk';" });
      await new Promise(r => setTimeout(r, 600));

      console.log('2. Setting 1920x1080 lt');
      await send('Runtime.evaluate', { expression: "document.body.className = 'lt';" });
      await new Promise(r => setTimeout(r, 600));

      const resVal = await send('Runtime.evaluate', {
        expression: `({
          cn: document.body.className,
          cmuBg: window.getComputedStyle(document.querySelector(".btn.cmu-p")).backgroundColor,
          cardBg: window.getComputedStyle(document.querySelector(".card.dc")).backgroundColor
        })`,
        returnByValue: true
      });
      console.log('Result on Tab A after lt:', resVal.result.value);
      ws.close();
    };
  });
});
