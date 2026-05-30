# IUTverse Database Structure

This document describes the current Supabase database structure used by the IUTverse backend. The active schema is defined by SQL migrations in `Codebase/server/supabase/migrations`, especially:

- `202605280001_supabase_native_schema.sql`
- `202605280002_rls_and_storage.sql`

The old Prisma schema remains as historical/reference material. The active backend uses Supabase Auth, PostgreSQL tables in `public`, Supabase Row Level Security, and Supabase Storage.

## High-Level Model

The database is organized around Supabase Auth users. Every application user has an `auth.users` row managed by Supabase and a matching `public.profiles` row for app-specific profile data.

Most feature tables reference `public.profiles(id)`, where `id` is the Supabase Auth UUID.

Major domains:

- Identity and academic profile data.
- General posts, categories, comments, and reactions.
- Lost-and-found posts.
- Jobs, job applications, and job comments.
- Academic resource hub.
- Cat Corner posts, likes, comments, questions, and answers.
- Anonymous confessions, reactions, polls, options, and votes.
- Chat conversations, participants, and messages.
- Events and RSVPs.
- Legacy migration mapping.
- Supabase Storage buckets for media and documents.

## Custom Types

The schema defines PostgreSQL enum types to keep common state fields consistent.

### `app_role`

Allowed values:

- `user`
- `mod`
- `admin`

Used by `profiles.role` and the helper function `public.is_admin_or_mod()`.

### `content_status`

Allowed values:

- `active`
- `resolved`
- `archived`
- `deleted`
- `flagged`

Used by posts, comments, lost-and-found posts, jobs, academic resources, cat content, confessions, and events.

### `lost_found_type`

Allowed values:

- `lost`
- `found`

Used by `lost_and_found_posts.type`.

### `reaction_type`

Allowed values:

- `like`
- `funny`
- `relatable`
- `angry`
- `insightful`
- `helpful`
- `wholesome`

Used by regular post reactions and confession reactions.

### `conversation_type`

Allowed values:

- `direct`
- `group`

Used by `conversations.conversation_type`.

### `rsvp_status`

Allowed values:

- `going`
- `interested`
- `not_going`

Used by `event_rsvps.status`.

### `job_type`

Allowed values:

- `Internship`
- `Freelance`
- `PartTime`
- `Volunteer`

Used by `jobs.type`.

### `resource_type`

Allowed values:

- `QUESTION`
- `NOTE`
- `BOOK`
- `OTHER`
- `CLASS_LECTURE`

Used by `academic_resources.type`.

## Identity And Profile Tables

### `auth.users`

This table is owned by Supabase Auth. The backend does not create its own password table. Supabase Auth handles credentials, sessions, password reset, and token verification.

### `public.profiles`

Stores app-specific user profile fields.

Important columns:

- `id uuid primary key`: references `auth.users(id)` and is the app-wide user ID.
- `legacy_user_id integer unique`: optional bridge to old integer user IDs.
- `display_name text`: visible user name.
- `department_id bigint`: optional reference to `departments`.
- `batch integer`: academic batch.
- `student_id text unique`: optional student ID.
- `role app_role`: defaults to `user`.
- Profile detail fields: `bio`, `interests`, `badges`, school/college/current residence fields.
- Media paths: `profile_image_path`, `cover_image_path`.
- `created_at`, `updated_at`.

Lifecycle:

- The trigger `on_auth_user_created` runs `public.handle_new_user()` after a new Supabase Auth user is inserted.
- That trigger creates a matching `profiles` row.
- `display_name` defaults to Supabase metadata `display_name` or the email username.

Privacy model:

- The database allows authenticated profile reads through RLS.
- The backend intentionally maps public profile responses to a smaller shape so email, role, student ID, department, and batch are not exposed casually.

### `public.departments`

Stores academic departments.

Columns:

- `id bigserial primary key`
- `name text not null unique`
- `created_at`

Used by:

- `profiles.department_id`
- `academic_resources.department_id`

Backend department creation is admin-only.

### `public.legacy_user_map`

Migration helper table.

Columns:

- `legacy_user_id integer primary key`
- `auth_user_id uuid unique references auth.users(id)`
- `migrated_at`

RLS denies all normal access. It is intended for controlled service-role migration work only.

## General Posting Tables

### `public.posts`

Stores regular user posts.

Important columns:

- `id bigserial primary key`
- `author_id uuid not null references profiles(id)`
- `content text not null`
- `is_anonymous boolean`
- Media metadata: `image_path`, `image_bucket`, `image_mime_type`, `image_size_bytes`
- Counters: `reaction_count`, `comment_count`
- Moderation/status: `status`, `reported_count`, `moderated_by_id`, `deleted_at`
- Timestamps: `created_at`, `updated_at`

Notes:

- Post images are stored in Supabase Storage bucket `post-media`.
- The database maintains reaction/comment counts through triggers.
- Post categories are normalized through a join table rather than a single required category column.

### `public.post_categories`

Stores category names for posts.

Columns:

- `id bigserial primary key`
- `name text not null unique`
- `created_at`

### `public.post_category_links`

Many-to-many join table between posts and categories.

Columns:

- `post_id bigint references posts(id)`
- `category_id bigint references post_categories(id)`
- Composite primary key: `(post_id, category_id)`

### `public.post_comments`

Stores comments and replies on regular posts.

Columns:

- `id bigserial primary key`
- `post_id bigint references posts(id)`
- `author_id uuid references profiles(id)`
- `parent_comment_id bigint references post_comments(id)`: enables threaded replies.
- `content text not null`
- `is_anonymous boolean`
- `status content_status`
- `created_at`, `updated_at`

Deleting a post cascades to its comments.

### `public.post_reactions`

Stores one reaction per user per post.

Columns:

- `id bigserial primary key`
- `post_id bigint references posts(id)`
- `user_id uuid references profiles(id)`
- `reaction_type reaction_type`
- `created_at`
- Unique constraint: `(post_id, user_id)`

The unique constraint prevents multiple simultaneous reaction rows per user/post. The backend uses upsert behavior to update reactions safely.

## Lost And Found Tables

### `public.lost_and_found_posts`

Stores lost/found item posts.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `type lost_found_type`
- `title`
- `description`
- `location`
- `contact`
- Image metadata: `image_path`, `image_bucket`, `image_mime_type`, `image_size_bytes`
- `status content_status`
- `created_at`, `updated_at`

Images are stored in the Supabase Storage bucket `lost-found`.

Backend ownership rules:

- Users can create their own posts.
- Users can update/delete/resolve/activate their own posts.
- Moderator/admin permissions are represented in RLS and service logic where needed.

## Job Tables

### `public.jobs`

Stores job or opportunity posts.

Columns:

- `id bigserial primary key`
- `title text not null`
- `type job_type`
- `description text not null`
- `requirements text[]`
- `compensation text`
- `deadline timestamptz`
- `posted_by_id uuid references profiles(id)`
- `status content_status`
- `created_at`, `updated_at`

Delete behavior in the backend is a soft delete: status is set to `deleted`.

### `public.job_applications`

Stores applications to jobs.

Columns:

- `id bigserial primary key`
- `job_id bigint references jobs(id)`
- `applicant_id uuid references profiles(id)`
- `applied_at`
- Unique constraint: `(job_id, applicant_id)`

Visibility:

- Applicants can see their own application rows.
- Job posters can see applications to their jobs.
- Moderators/admins can see application rows.
- The backend additionally restricts application detail listing to the job owner or moderator/admin.

### `public.job_comments`

Stores job comments and replies.

Columns:

- `id bigserial primary key`
- `job_id bigint references jobs(id)`
- `author_id uuid references profiles(id)`
- `parent_comment_id bigint references job_comments(id)`
- `content text not null`
- `created_at`, `updated_at`

The backend paginates top-level job comments and limits fetched replies.

## Academic Resource Tables

### `public.academic_resources`

Stores academic files and links.

Columns:

- `id bigserial primary key`
- `title text not null`
- `type resource_type`
- `department_id bigint references departments(id)`
- `course_code text`
- File metadata: `file_path`, `file_bucket`, `file_mime_type`, `file_size_bytes`
- `external_link text`
- `uploaded_by_id uuid references profiles(id) on delete set null`
- `status content_status`
- `created_at`, `updated_at`

Constraints and indexes:

- `academic_resource_has_file_or_link`: requires either `file_path` or `external_link`.
- `academic_resources_dedupe_idx`: unique index over department, course code, type, and lowercased title.

Storage:

- Uploaded PDFs go to the private `academic-resources` bucket.
- The backend validates PDF content by file signature before upload.

## Cat Corner Tables

### `public.cat_posts`

Stores cat-related posts.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `caption text not null`
- Image metadata: `image_path`, `image_bucket`, `image_mime_type`, `image_size_bytes`
- `like_count integer`
- `status content_status`
- `created_at`, `updated_at`

Images are stored in the `cat-posts` bucket.

### `public.cat_post_likes`

Stores one like per user per cat post.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `cat_post_id bigint references cat_posts(id)`
- `created_at`
- Unique constraint: `(user_id, cat_post_id)`

### `public.cat_post_comments`

Stores comments on cat posts.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `cat_post_id bigint references cat_posts(id)`
- `content text not null`
- `created_at`, `updated_at`

### `public.cat_questions`

Stores Cat Q&A questions.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `question text not null`
- `status content_status`
- `created_at`, `updated_at`

### `public.cat_answers`

Stores answers to Cat Q&A questions.

Columns:

- `id bigserial primary key`
- `user_id uuid references profiles(id)`
- `question_id bigint references cat_questions(id)`
- `answer text not null`
- `status content_status`
- `created_at`, `updated_at`

Question deletion cascades to answers.

## Confession Tables

### `public.confessions`

Stores anonymous confession content.

Columns:

- `id bigserial primary key`
- `content text not null`
- `tag text not null`
- `reaction_count integer`
- `status content_status`
- `reported_count integer`
- `created_at`

Confessions do not store an author ID in the current schema.

### `public.confession_reactions`

Stores one reaction per user per confession.

Columns:

- `id bigserial primary key`
- `confession_id bigint references confessions(id)`
- `user_id uuid references profiles(id)`
- `reaction_type reaction_type`
- `created_at`
- Unique constraint: `(confession_id, user_id)`

### `public.confession_polls`

Stores optional polls attached to confessions.

Columns:

- `id bigserial primary key`
- `confession_id bigint unique references confessions(id)`
- `question text not null`
- `total_votes integer`
- `created_at`

The unique `confession_id` means a confession can have at most one poll.

### `public.confession_poll_options`

Stores poll answer choices.

Columns:

- `id bigserial primary key`
- `poll_id bigint references confession_polls(id)`
- `text text not null`
- `vote_count integer`
- `order_index integer`

### `public.confession_poll_votes`

Stores one poll vote per user per poll.

Columns:

- `id bigserial primary key`
- `poll_id bigint references confession_polls(id)`
- `option_id bigint references confession_poll_options(id)`
- `user_id uuid references profiles(id)`
- `voted_at`
- Unique constraint: `(poll_id, user_id)`

The unique constraint prevents duplicate voting in the same poll.

## Chat Tables

### `public.conversations`

Stores direct and group conversations.

Columns:

- `id bigserial primary key`
- `conversation_type conversation_type`
- `title text`
- `direct_key text unique`
- `created_at`, `updated_at`

For direct conversations, the backend computes `direct_key` by sorting the two participant UUIDs and joining them with `:`. The unique constraint prevents duplicate direct conversations.

### `public.conversation_participants`

Stores conversation membership.

Columns:

- `id bigserial primary key`
- `conversation_id bigint references conversations(id)`
- `user_id uuid references profiles(id)`
- `joined_at`
- Unique constraint: `(conversation_id, user_id)`

### `public.chat_messages`

Stores messages.

Columns:

- `id bigserial primary key`
- `conversation_id bigint references conversations(id)`
- `sender_id uuid references profiles(id)`
- `content text not null`
- `sent_at`
- `read_at`

Realtime:

- `chat_messages` is added to `supabase_realtime`.
- `conversations` is also added to `supabase_realtime`.

## Event Tables

### `public.events`

Stores events.

Columns:

- `id bigserial primary key`
- `title text not null`
- `description text not null`
- `location text not null`
- `event_date timestamptz`
- `created_by_id uuid references profiles(id)`
- `is_public boolean`
- `status content_status`
- `created_at`, `updated_at`

### `public.event_rsvps`

Stores a user's RSVP status for an event.

Columns:

- `event_id bigint references events(id)`
- `user_id uuid references profiles(id)`
- `status rsvp_status`
- `created_at`, `updated_at`
- Primary key: `(event_id, user_id)`

## Indexes

The schema adds indexes for common access paths:

- `profiles_department_batch_idx`: feed and academic identity matching.
- `posts_author_created_idx`: author profile post history.
- `posts_status_created_idx`: public active post feed.
- `post_comments_post_created_idx`: post comment listing.
- `lost_found_filter_idx`: lost/found type/status filtering.
- `chat_messages_conversation_sent_idx`: conversation message pagination.
- `conversation_participants_user_idx`: user conversation listing.
- `academic_resources_filter_idx`: academic resource filtering by department/type/course code.
- `academic_resources_dedupe_idx`: deduplication for academic resources.

## Functions And Triggers

### `public.touch_updated_at()`

Trigger function that sets `updated_at = now()` before updates.

Applied to:

- `profiles`
- `posts`
- `post_comments`
- `lost_and_found_posts`
- `jobs`
- `job_comments`
- `academic_resources`
- `cat_posts`
- `cat_post_comments`
- `cat_questions`
- `cat_answers`
- `conversations`
- `events`
- `event_rsvps`

### `public.is_admin_or_mod()`

Returns true when the current authenticated user has role `admin` or `mod` in `profiles`.

Used heavily in RLS policies to grant moderation access.

### `public.handle_new_user()`

Runs after insertion into `auth.users`. It creates a matching `profiles` row and sets `display_name` from auth metadata or email username.

### Post Counter Triggers

Functions:

- `increment_post_reaction_count`
- `decrement_post_reaction_count`
- `increment_post_comment_count`
- `decrement_post_comment_count`

Triggers:

- `post_reaction_insert_count`
- `post_reaction_delete_count`
- `post_comment_insert_count`
- `post_comment_delete_count`

These keep `posts.reaction_count` and `posts.comment_count` synchronized.

### Confession Poll Vote Trigger

Function:

- `increment_confession_vote_counts`

Trigger:

- `confession_poll_vote_insert_count`

This increments both:

- `confession_poll_options.vote_count`
- `confession_polls.total_votes`

### Direct Conversation Key Function

`public.set_direct_conversation_key()` computes a `direct_key` from two participant IDs. The backend currently also computes direct keys itself before inserting conversations. The database function exists as schema support for the same concept.

## Row Level Security

RLS is enabled for all application tables. Policies generally follow these rules:

- Authenticated users can read active/public content.
- Users can create rows owned by themselves.
- Users can update/delete rows they own.
- Moderators/admins can manage broader content through `public.is_admin_or_mod()`.
- Chat rows are visible only to conversation participants or moderators/admins.
- Job applications are visible to the applicant, job poster, or moderators/admins.
- Legacy migration mapping is blocked from normal access.

Important examples:

- `profiles`: authenticated users can read profiles; users update/insert their own profile; moderators have broader access.
- `posts`: active posts are readable; owners and moderators can see/manage their own non-active content.
- `post_reactions`: users manage only their own reactions.
- `lost_and_found_posts`: users manage their own records; moderators can manage broader records.
- `jobs`: posters manage their jobs; moderators/admins can also manage.
- `academic_resources`: uploader or moderator/admin can update/delete.
- `cat_questions` and `cat_answers`: users manage own rows; moderators/admins can manage.
- `confessions`: authenticated users can create; moderators manage; active confessions are readable.
- `conversation_participants`, `conversations`, `chat_messages`: participants can read/send within conversations.

The backend often uses the Supabase service-role client, which bypasses RLS. Therefore, backend services must still enforce route-level ownership and role checks even though RLS exists.

## Storage Buckets

The migration creates these Supabase Storage buckets:

| Bucket | Public | Purpose |
| --- | --- | --- |
| `avatars` | yes | Profile pictures |
| `covers` | yes | Profile cover images |
| `post-media` | yes | Regular post images |
| `lost-found` | yes | Lost-and-found item images |
| `cat-posts` | yes | Cat Corner post images |
| `academic-resources` | no | Academic PDFs |

Storage policies:

- Authenticated users can read public app media buckets.
- Authenticated users can read academic resource objects.
- Users can upload only into a folder whose first path segment matches their auth UID.
- Users can update/delete their own storage objects.
- Moderators/admins can update/delete broader app media.

Backend storage behavior:

- Files are uploaded through `storageService.uploadObject`.
- Object paths are generated as `userId/prefix-timestamp-random.extension`.
- Original client filenames are not trusted or used in object paths.
- File extensions and content types are derived from verified file signatures.

## Realtime Publication

The schema adds these tables to Supabase Realtime:

- `chat_messages`
- `conversations`
- `posts`
- `post_comments`

The frontend can subscribe to these tables through Supabase Realtime channels.

## Relationship Summary

```text
auth.users
  -> profiles
      -> posts
          -> post_comments
          -> post_reactions
          -> post_category_links -> post_categories
      -> lost_and_found_posts
      -> jobs
          -> job_applications
          -> job_comments
      -> academic_resources
      -> cat_posts
          -> cat_post_likes
          -> cat_post_comments
      -> cat_questions
          -> cat_answers
      -> confession_reactions
      -> confession_poll_votes
      -> conversation_participants -> conversations -> chat_messages
      -> events -> event_rsvps
```

Confessions themselves are anonymous and do not reference `profiles`; only reactions and votes reference users.

## Migration And Operational Notes

Migrations are applied by `Codebase/server/scripts/applySupabaseMigrations.js`.

Expected environment variables:

- `DIRECT_URL` or `DATABASE_URL` for migration execution.
- Supabase project URL and service-role key for backend runtime.

The migration runner:

- Loads `Codebase/server/.env`.
- Rejects obvious placeholder Supabase URLs.
- Records applied files in `public.iutverse_schema_migrations`.
- Applies migration files in sorted order inside transactions.

Before changing the schema:

- Add a new SQL migration rather than editing already-applied migrations in a shared environment.
- Update this document when tables, policies, functions, or buckets change.
- Update backend services and tests in the same change when database shape changes.
