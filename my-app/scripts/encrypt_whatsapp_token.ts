import { encrypt } from "../lib/utils/encryption";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local so it can find ENCRYPTION_KEY
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const token = process.argv[2];

if (!token) {
  console.error("\n❌ Error: Missing token argument.");
  console.error("Usage: npx tsx scripts/encrypt_whatsapp_token.ts <YOUR_SYSTEM_USER_TOKEN>\n");
  process.exit(1);
}

try {
  const encrypted = encrypt(token);
  console.log("\n✅ Successfully encrypted using lib/utils/encryption.ts!\n");
  console.log("Encrypted Output:");
  console.log("------------------------------------------------------------");
  console.log(encrypted);
  console.log("------------------------------------------------------------");
  console.log("\nCopy the above string and use it in your SQL INSERT statement.\n");
} catch (error: any) {
  console.error("\n❌ Encryption failed:", error.message, "\n");
}
