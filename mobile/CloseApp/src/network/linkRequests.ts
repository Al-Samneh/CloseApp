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

const WS_URL = 'ws://192.168.1.216:8080';

export class LinkRequestManager {
  private ws: WebSocket | null = null;
  private myEphemeralId: string = '';
  private onRequestReceived?: (request: LinkRequest) => void;
  private onRequestAccepted?: (sessionId: string) => void;

  connect(ephemeralId: string, onRequest: (request: LinkRequest) => void, onAccepted?: (sessionId: string) => void) {
    this.myEphemeralId = ephemeralId;
    this.onRequestReceived = onRequest;
    this.onRequestAccepted = onAccepted;

    console.log('🔌 Connecting to link requests with ID:', ephemeralId);
    this.ws = new WebSocket(`${WS_URL}/link-requests/${ephemeralId}`);

    this.ws.onopen = () => {
      console.log('✅ Link request WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        console.log('📨 Received link request message:', event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'link_request') {
          this.onRequestReceived?.(data.request);
        } else if (data.type === 'request_accepted') {
          // Someone accepted our link request
          this.onRequestAccepted?.(data.session_id);
        }
      } catch (error) {
        console.error('Link request parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Link request WebSocket error:', error);
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

    console.log('📤 Sending link request:', {
      from: this.myEphemeralId,
      to: toEphemeralId,
      session: sessionId
    });

    this.ws.send(JSON.stringify({
      type: 'send_link_request',
      request,
    }));
  }

  respondToRequest(toEphemeralId: string, accepted: boolean, sessionId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log('📤 Sending acceptance response to:', toEphemeralId, 'session:', sessionId);

    this.ws.send(JSON.stringify({
      type: 'respond_to_request',
      to_ephemeral_id: toEphemeralId,
      accepted,
      session_id: sessionId,
    }));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
