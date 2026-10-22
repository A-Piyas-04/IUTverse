import { authenticateToken, route } from "@/server/kit";

export const GET = route([authenticateToken], (ctx) =>
  Response.json({
    message: "Dashboard data",
    user: ctx.user,
    data: {
      posts: [],
      notifications: [],
      stats: {},
    },
  })
);
