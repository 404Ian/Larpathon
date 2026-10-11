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
        expression: `Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent.substring(0, 100))`,
        returnByValue: true
      });
      console.log('Scripts on Tab A:', res.result.value);
      ws.close();
    };
  });
});
