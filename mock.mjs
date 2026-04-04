import WebSocket from 'ws';

console.log("Attempting to connect to Tauri local server at ws://127.0.0.1:1422/ws...");
const ws = new WebSocket('ws://127.0.0.1:1422/ws');

ws.on('open', () => {
    console.log('✅ Mock Extension Connected to Tauri!');
    
    let time = 85;
    
    // Blast a mocked song update every second
    setInterval(() => {
        const mockSong = {
            type: "songUpdate",
            data: {
                title: "Bohemian Rhapsody",
                artist: "Queen • 1.6B views",
                image: "https://lh3.googleusercontent.com/1B-Sny1bE72G581iXjUfXYA8rY9bB4lq0n3H1vS_gY_eO__f8Z1ZgUjPj-Q37jD2iK41jX9n=w544-h544-l90-rj",
                playing: true,
                currentTimeSeconds: time,
                durationSeconds: 354,
                progressPct: time / 354
            }
        };

        ws.send(JSON.stringify(mockSong));
        console.log(`Sent mock song update... Time: ${time}s`);
        time++;
    }, 1000);
});

ws.on('message', (data) => {
    console.log("Mock Extension received from Tauri GUI:", data.toString());
});

ws.on('error', (err) => {
    console.error("❌ Could not connect. Is the Tauri app running?", err.message);
});
