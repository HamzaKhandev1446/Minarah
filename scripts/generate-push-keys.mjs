import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
const destination = new URL("../.env.push.local", import.meta.url);
await writeFile(destination, [
  "# Private deployment values. Do not commit or paste into chat.",
  "# Copy these into Vercel server environment settings after migration 008.",
  "PUSH_ENABLED=0",
  `VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  "VAPID_SUBJECT=https://minarah-seven.vercel.app",
  `CRON_SECRET=${randomBytes(32).toString("hex")}`,
  "# Add your Supabase service-role key in Vercel, never in NEXT_PUBLIC_*.",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "",
].join("\n"), { flag: "wx", mode: 0o600 });
console.log("Created ignored .env.push.local. Keys were not printed. Push remains disabled.");
