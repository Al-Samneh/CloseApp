// Link request notification system

export type LinkRequest = {
  from_session_id: string;
  from_ephemeral_id: string;
  to_ephemeral_id: string;
  message?: string;
  timestamp: number;
};

export type LinkRequestResponse = {
  request_id: string;
  accepted: boolean;
};

import { WS_BASE } from '../config';
const WS_URL = WS_BASE;

export class LinkRequestManager {
  private ws: WebSocket | null = null;
  private myEphemeralId: string = '';
  private onRequestReceived?: (request: LinkRequest) => void;

  connect(ephemeralId: string, onRequest: (request: LinkRequest) => void) {
    this.myEphemeralId = ephemeralId;
    this.onRequestReceived = onRequest;

    
    this.ws = new WebSocket(`${WS_URL}/link-requests/${ephemeralId}`);

    this.ws.onopen = () => {
      
    };

    this.ws.onmessage = (event) => {
      try {
        
        const data = JSON.parse(event.data);
        if (data.type === 'link_request') {
          this.onRequestReceived?.(data.request);
        }
      } catch (error) {
        
      }
    };

    this.ws.onerror = (error) => {
      
    };
  }

  sendLinkRequest(toEphemeralId: string, sessionId: string, message?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to link request service');
    }

    const request: LinkRequest = {
      from_session_id: sessionId,
      from_ephemeral_id: this.myEphemeralId,
      to_ephemeral_id: toEphemeralId,
      message,
      timestamp: Date.now(),
    };

    

    this.ws.send(JSON.stringify({
      type: 'send_link_request',
      request,
    }));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
