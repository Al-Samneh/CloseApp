// Runtime configuration for network endpoints.
// Provide mobile/CloseApp/env.json (gitignored) with { "WS_BASE": "ws://YOUR_HOST:8080" }
// An example file is committed as env.json.example.
// This keeps your IP out of source control.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const env = require('../env.json');

export const WS_BASE: string = env.WS_BASE;


