use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use futures_util::{StreamExt, SinkExt};
use warp::Filter;
use warp::ws::{Message, WebSocket};
use tokio::sync::mpsc;

// Map of all connected clients
type Clients = Arc<Mutex<HashMap<usize, mpsc::UnboundedSender<Result<Message, warp::Error>>>>>;

pub async fn start_server() {
    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));
    
    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(with_clients(clients.clone()))
        .map(|ws: warp::ws::Ws, clients| {
            ws.on_upgrade(move |socket| handle_client(socket, clients))
        });

    println!("Starting local WebSocket broadcast server on ws://127.0.0.1:1422/ws");
    warp::serve(ws_route).run(([127, 0, 0, 1], 1422)).await;
}

fn with_clients(clients: Clients) -> impl Filter<Extract = (Clients,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || clients.clone())
}

async fn handle_client(ws: WebSocket, clients: Clients) {
    static NEXT_ID: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(1);
    let id = NEXT_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    
    let (mut client_ws_sender, mut client_ws_rcv) = ws.split();
    
    // Create an unbounded channel for this client
    let (tx, mut rx) = mpsc::unbounded_channel::<Result<Message, warp::Error>>();
    
    // Spawn task to forward messages from the channel to the actual WebSocket sink
    tokio::task::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let _ = client_ws_sender.send(msg.unwrap()).await;
        }
    });

    clients.lock().unwrap().insert(id, tx);
    println!("WebSocket client connected. ID: {}", id);
    
    while let Some(result) = client_ws_rcv.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                println!("WebSocket error from client {}: {}", id, e);
                break;
            }
        };
        
        if msg.is_text() || msg.is_binary() {
            // Pub/Sub Broadcast: Send to all OTHER connected clients instantly
            let clients_lock = clients.lock().unwrap();
            
            for (&client_id, tx) in clients_lock.iter() {
                if client_id != id {
                    let _ = tx.send(Ok(msg.clone())); // Synchronous send! No MutexGuard across await.
                }
            }
        }
    }
    
    println!("WebSocket client disconnected. ID: {}", id);
    clients.lock().unwrap().remove(&id);
}
