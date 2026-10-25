import { authenticateToken, route } from "@/server/kit";
import { search } from "@/server/controllers/searchController";

export const GET = route([authenticateToken], search);
