const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Lee la API key guardada en las variables de entorno de Render
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

wss.on('connection', (ws, req) => {
    // Extrae parámetros de la URL
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const lang = urlParams.get('lang') || 'en';
    const sampleRate = urlParams.get('sample_rate') || '48000';

    if (!DEEPGRAM_API_KEY) {
        console.error("ERROR: No se ha configurado DEEPGRAM_API_KEY en las variables de entorno.");
        ws.close();
        return;
    }

    // Conexión segura hacia Deepgram desde el servidor
    const deepgramUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${sampleRate}&channels=2&multichannel=true&language=${lang}&model=nova-2`;
    
    const deepgramWs = new WebSocket(deepgramUrl, {
        headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`
        }
    });

    deepgramWs.on('open', () => {
        console.log('Conectado exitosamente a Deepgram');
    });

    ws.on('message', (message) => {
        if (deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(message);
        }
    });

    deepgramWs.on('message', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data.toString());
        }
    });

    ws.on('close', () => deepgramWs.close());
    deepgramWs.on('close', () => ws.close());
    deepgramWs.on('error', (err) => console.error('Error en Deepgram WS:', err));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
