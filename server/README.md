# Close relay server (FastAPI)

Ephemeral websocket relay for E2E-encrypted chat. Stores no plaintext; keeps messages in-memory with TTL.

Run locally:

```bash
docker build -t close-relay ./server
docker run -p 8080:8080 close-relay
```

