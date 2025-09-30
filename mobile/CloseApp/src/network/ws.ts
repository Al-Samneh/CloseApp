export type RelayMessage = { session_id: string; ciphertext: string; nonce: string; ts: number };

export class RelayClient {
  private ws?: WebSocket;
  private url: string;
  constructor(url: string) { this.url = url; }
  connect(onMessage: (msg: RelayMessage) => void) {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = ev => {
      try { onMessage(JSON.parse(String(ev.data)) as RelayMessage); } catch {}
    };
  }
  send(msg: RelayMessage) {
    this.ws?.send(JSON.stringify(msg));
  }
  close() { this.ws?.close(); }
}

