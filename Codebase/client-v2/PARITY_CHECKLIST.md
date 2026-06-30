# IUTverse V2 parity and acceptance checklist

The old client remains at `Codebase/client`. V2 must not replace its production build target until this checklist is signed off in a production-like preview.

## Routes and features

- [x] `/login`, `/signup`: IUT-only authentication, reset request, legacy copy.
- [x] `/`: personalized feed, composer, campus utilities.
- [x] `/community`: campus-wide feed, search and categories.
- [x] `/posts/:postId`: deep-linked discussion and threaded replies.
- [x] `/profile`, `/profile/:userId`: owner/public profile, images, education, interests and privacy.
- [x] `/messages` plus `/chat` alias: conversations, search, realtime refresh and private attachments.
- [x] `/jobs` plus `/opportunities` alias: expanded types, applications, saves and discussion affordances.
- [x] `/academic`: resource filters, upload, secure download, feedback and saves.
- [x] `/lost-and-found` plus `/lostandfound` alias: filters, detail, four-step report draft, resolve/reactivate and contact.
- [x] `/confessions`: anonymous publishing, polls, reactions, drafts, saves and reports.
- [x] `/cat-corner` plus `/catcorner` alias: posts, profiles, breaks, facts, Q&A and Cat Game.
- [x] `/events` plus `/eventhub` alias: persistent events, RSVP and wishlist.
- [x] `/about`: legacy team content and persistent issue reports.
- [x] `/admin/moderation`: role-gated report queue.

## Preview acceptance

- [ ] Apply `202606300001_frontend_v2_features.sql` to a disposable Supabase project.
- [ ] Test authenticated CRUD with user, moderator and admin accounts.
- [ ] Verify storage buckets, signed resource URLs and private chat attachment URLs.
- [ ] Test 360×800, 768×1024, 1280×720 and 1440×900.
- [ ] Run Chromium, Firefox and WebKit E2E suites.
- [ ] Run keyboard, screen-reader, 200% zoom and reduced-motion checks.
- [ ] Confirm production environment variables and CORS origins.
- [ ] Record rollback artifact for `Codebase/client` before cutover.
