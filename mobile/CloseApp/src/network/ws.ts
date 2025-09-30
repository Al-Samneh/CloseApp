export type RelayMessage = { session_id: string; ciphertext: string; nonce: string; ts: number };

export class RelayClient {
  public ws?: WebSocket;
  private url: string;
  private pendingMessages: RelayMessage[] = [];
  private onConnected?: () => void;
  
  constructor(url: string) { this.url = url; }
  
  connect(onMessage: (msg: RelayMessage) => void, onConnected?: () => void) {
    this.onConnected = onConnected;
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      // WebSocket ready; flush any queued messages
      
      // Notify that connection is ready
      if (this.onConnected) {
        this.onConnected();
      }
      
      // Send any pending messages immediately
      while (this.pendingMessages.length > 0) {
        const msg = this.pendingMessages.shift();
        if (msg) {
          this.ws?.send(JSON.stringify(msg));
        }
      }
    };
    
    this.ws.onerror = (error) => {
      // no-op
    };
    
    this.ws.onclose = () => {
      // no-op
    };
    
    this.ws.onmessage = ev => {
      try { 
        const msg = JSON.parse(String(ev.data)) as RelayMessage;
        onMessage(msg); 
      } catch (err) {
        // swallow malformed messages
      }
    };
  }
  
  send(msg: RelayMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      // Queue message to send when connection opens
      this.pendingMessages.push(msg);
    }
  }
  
  close() { 
    if (this.ws) {
      this.ws.close(); 
    }
  }
}

