
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.JWT_SECRET;
// Also try with buffer for base64
const secretBuffer = Buffer.from(secret || "", 'base64');

console.log("Token:", token?.substring(0, 20) + "...");
console.log("Secret:", secret);

if (!token || !secret) {
  console.error("Missing token or secret");
  process.exit(1);
}

try {
    console.log("Attempting verify with string secret...");
    const decoded = jwt.verify(token, secret);
    console.log("SUCCESS (String):", decoded);
} catch (e: any) {
    console.log("FAIL (String):", e.message);
    
    try {
        console.log("Attempting verify with buffer secret...");
        const decoded = jwt.verify(token, secretBuffer);
        console.log("SUCCESS (Buffer):", decoded);
    } catch (e2: any) {
         console.log("FAIL (Buffer):", e2.message);
    }
}
