import { hashPassword } from "./server/password-utils";
import { db } from "./server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function resetAdminPassword() {
  try {
    const hashedPassword = await hashPassword("admin");
    
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, "admin"))
      .returning({ username: users.username });
    
    if (result.length > 0) {
      console.log("✅ Admin password has been reset to: admin");
    } else {
      console.log("❌ Admin user not found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

resetAdminPassword();
