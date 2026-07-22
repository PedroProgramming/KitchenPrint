import { cookies } from "next/headers";
import { getUserBySession } from "./database";

export async function currentUser() { return getUserBySession((await cookies()).get("kprint_session")?.value); }
