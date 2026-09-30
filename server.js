const WebSocket = require('ws');

// Render asigna el puerto dinámicamente mediante process.env.PORT
const PORT = process.env.PORT || 8080;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "6ac125a3e51eb51126c7636b1f1477b4480b068b";

const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log('================================================');
    console.log(`  Servidor Proxy de MORA listo en el puerto ${PORT}`);
    console.log('================================================');
});

wss.on('connection', (agentSocket, req) => {
    console.log('[+] Un agente se ha conectado.');

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const rawLang = requestUrl.searchParams.get('lang') || requestUrl.searchParams.get('language') || 'en';
    const sampleRate = requestUrl.searchParams.get('sample_rate') || '48000';

    const selectedLang = rawLang.toLowerCase().includes('es') ? 'es-419' : 'en';

    console.log(`[🌐] Configurando Deepgram con idioma: [${selectedLang.toUpperCase()}]`);

    const deepgramUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${sampleRate}&channels=2&multichannel=true&model=nova-2&language=${selectedLang}`;

    const deepgramSocket = new WebSocket(deepgramUrl, {
        headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`
        }
    });

    deepgramSocket.on('open', () => {
        console.log(`[✔] Conexión exitosa con Deepgram en [${selectedLang.toUpperCase()}].`);
    });

    agentSocket.on('message', (data) => {
        if (deepgramSocket.readyState === WebSocket.OPEN) {
            deepgramSocket.send(data);
        }
    });

    deepgramSocket.on('message', (data) => {
        if (agentSocket.readyState === WebSocket.OPEN) {
            agentSocket.send(data.toString());
        }
    });

    agentSocket.on('close', () => {
        console.log('[-] El agente cerró MORA o detuvo el monitoreo.');
        if (deepgramSocket.readyState === WebSocket.OPEN) {
            deepgramSocket.close();
        }
    });

    deepgramSocket.on('error', (err) => {
        console.error('[!] Error en la conexión con Deepgram:', err.message);
    });
});