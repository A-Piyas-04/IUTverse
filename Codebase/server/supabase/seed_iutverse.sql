-- IUTverse production-safe starter data
-- Generated 2026-07-04 from the live schema snapshot supplied by the project owner.
--
-- Verified institutional sources used for factual records:
--   https://www.iutoic-dhaka.edu/about
--   https://iutoic-dhaka.edu/academics/faculties_%26_departments
--   https://www.iutoic-dhaka.edu/campus_life/societies
--   https://www.iutoic-dhaka.edu/campus_life/culture_%26_diversity
--   https://www.iutoic-dhaka.edu/campus_life/games_%26_sports
--   https://repository.iutoic-dhaka.edu/
--   https://cse.iutoic-dhaka.edu/uploads/pdf/1713278640_1017.pdf
--   https://eee.iutoic-dhaka.edu/about-eee
--   https://mpe.iutoic-dhaka.edu/admission/undergraduate-study
--   https://mpe.iutoic-dhaka.edu/workshop-and-laboratories/cezeri-lab
--   https://cee.iutoic-dhaka.edu/syllabus
--   https://btm.iutoic-dhaka.edu/curriculum
--   https://tve.iutoic-dhaka.edu/about-tve
--
-- Important:
-- * Run this in the Supabase SQL Editor as the project owner/postgres role.
-- * At least one auth user/profile must already exist. The profile found in the
--   supplied snapshot is preferred; otherwise the oldest profile becomes the
--   owner of community seed content. No fake auth.users are created.
-- * Rows prefixed "[SEED DEMO]" are intentionally fictional UI demonstration data.
-- * The script is idempotent: running it again will not duplicate its seed rows.

begin;

set local statement_timeout = '120s';

-- -----------------------------------------------------------------------------
-- 1. Official IUT departments and useful feed categories
-- -----------------------------------------------------------------------------

insert into public.departments (name)
values
  ('Computer Science and Engineering (CSE)'),
  ('Electrical and Electronic Engineering (EEE)'),
  ('Mechanical and Production Engineering (MPE)'),
  ('Civil and Environmental Engineering (CEE)'),
  ('Technical and Vocational Education (TVE)'),
  ('Business and Technology Management (BTM)'),
  ('Natural Sciences (NSc)')
on conflict (name) do nothing;

insert into public.post_categories (name)
values
  ('general'),
  ('discussion'),
  ('academic'),
  ('campus-life'),
  ('clubs-and-societies'),
  ('opportunities'),
  ('events'),
  ('resources'),
  ('international-community'),
  ('sports')
on conflict (name) do nothing;

do $iutverse_seed$
declare
  v_user uuid;
  v_post bigint;
  v_poll bigint;
  v_option bigint;
  v_confession bigint;
  v_confession_poll bigint;
  v_resource bigint;
  v_event bigint;
  v_job bigint;
  v_cat_post bigint;
  v_question bigint;
  v_conversation bigint;
begin
  select p.id
  into v_user
  from public.profiles p
  order by
    (p.id = '95baa5bf-44a9-483b-9f4a-b2a625b0dd54'::uuid) desc,
    p.created_at,
    p.id
  limit 1;

  if v_user is null then
    raise exception using
      message = 'IUTverse seed stopped: public.profiles is empty.',
      hint = 'Create/sign in with one Supabase Auth user first, then rerun this script.';
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Verified official links for the Academic Resource Hub
  -- ---------------------------------------------------------------------------

  insert into public.academic_resources
    (title, type, department_id, course_code, external_link, uploaded_by_id,
     status, description, tags)
  select
    seed.title,
    seed.resource_type::public.resource_type,
    d.id,
    seed.course_code,
    seed.external_link,
    v_user,
    'active'::public.content_status,
    seed.description,
    seed.tags
  from (values
    (
      'CSE Academic Catalogue', 'LINK', 'Computer Science and Engineering (CSE)',
      null::text,
      'https://cse.iutoic-dhaka.edu/uploads/pdf/1713278640_1017.pdf',
      'Official IUT CSE academic catalogue, including undergraduate programme and course information.',
      array['official','catalogue','curriculum','cse']::text[]
    ),
    (
      'Machine Learning course page', 'LINK', 'Computer Science and Engineering (CSE)',
      'CSE 4621',
      'https://cse.iutoic-dhaka.edu/profile/hasanul/courses',
      'Official faculty course page listing CSE 4621: Machine Learning.',
      array['official','machine-learning','cse','course']::text[]
    ),
    (
      'EEE programmes and laboratory facilities', 'LINK', 'Electrical and Electronic Engineering (EEE)',
      null,
      'https://eee.iutoic-dhaka.edu/about-eee',
      'Official overview of EEE undergraduate and postgraduate programmes and laboratories.',
      array['official','eee','programmes','laboratories']::text[]
    ),
    (
      'EEE Academic Programme Guide', 'LINK', 'Electrical and Electronic Engineering (EEE)',
      null,
      'https://eee.iutoic-dhaka.edu/uploads/pdf/1757773186_1008.pdf',
      'Official EEE programme guide covering the B.Sc., M.Sc., M.Eng. and Ph.D. programmes.',
      array['official','eee','programme-guide']::text[]
    ),
    (
      'MPE Undergraduate Study Guide', 'LINK', 'Mechanical and Production Engineering (MPE)',
      null,
      'https://mpe.iutoic-dhaka.edu/admission/undergraduate-study',
      'Official overview of the Mechanical Engineering and Industrial and Production Engineering undergraduate programmes.',
      array['official','mpe','undergraduate','admission']::text[]
    ),
    (
      'Introduction to Mechanical Engineering syllabus', 'LINK', 'Mechanical and Production Engineering (MPE)',
      'MCE 4101',
      'https://mpe.iutoic-dhaka.edu/uploads/pdf/1614410710_1598.pdf',
      'Official MPE undergraduate course-content document containing MCE 4101 and other courses.',
      array['official','mpe','syllabus','mechanical-engineering']::text[]
    ),
    (
      'Cezeri Lab overview', 'LINK', 'Mechanical and Production Engineering (MPE)',
      'ME 4408',
      'https://mpe.iutoic-dhaka.edu/workshop-and-laboratories/cezeri-lab',
      'Official overview of the IUT Cezeri Lab, its fabrication equipment and a course conducted there.',
      array['official','mpe','cezeri-lab','fabrication']::text[]
    ),
    (
      'CEE Programme and Syllabus', 'LINK', 'Civil and Environmental Engineering (CEE)',
      null,
      'https://cee.iutoic-dhaka.edu/syllabus',
      'Official CEE page describing the B.Sc., M.Sc., M.Eng. and Ph.D. programmes.',
      array['official','cee','syllabus','civil-engineering']::text[]
    ),
    (
      'BTM Curriculum', 'LINK', 'Business and Technology Management (BTM)',
      null,
      'https://btm.iutoic-dhaka.edu/curriculum',
      'Official curriculum overview for the four-year BBA in Technology Management.',
      array['official','btm','curriculum','technology-management']::text[]
    ),
    (
      'TVE Department and Programmes', 'LINK', 'Technical and Vocational Education (TVE)',
      null,
      'https://tve.iutoic-dhaka.edu/about-tve',
      'Official overview of IUT''s Technical and Vocational Education department and its programmes.',
      array['official','tve','tvet','programmes']::text[]
    ),
    (
      'Faculty of Science and Technical Education', 'LINK', 'Natural Sciences (NSc)',
      null,
      'https://iutoic-dhaka.edu/academics/faculty-of-science-and-technical-education',
      'Official faculty page listing BTM, TVE and Natural Sciences.',
      array['official','natural-sciences','fste']::text[]
    )
  ) as seed(title, resource_type, department_name, course_code, external_link, description, tags)
  join public.departments d on d.name = seed.department_name
  on conflict do nothing;

  -- ---------------------------------------------------------------------------
  -- 3. Fact-checked IUT community feed posts
  -- ---------------------------------------------------------------------------

  insert into public.posts (author_id, content, is_anonymous, status, created_at)
  select v_user, seed.content, false, 'active'::public.content_status, seed.created_at
  from (values
    (
      'About IUT: Islamic University of Technology is an educational and research institution in Bangladesh run and funded by the Organisation of Islamic Cooperation (OIC). Its campus is at Boardbazar, Gazipur. Official source: https://www.iutoic-dhaka.edu/about',
      now() - interval '12 days'
    ),
    (
      'Know the academic community: IUT lists CSE, EEE, MPE and CEE under Engineering and Technology, and TVE, BTM and Natural Sciences under Science and Technical Education. Explore: https://iutoic-dhaka.edu/academics/faculties_%26_departments',
      now() - interval '10 days'
    ),
    (
      'Campus societies spotlight: IUT''s official campus-life page introduces the Computer Society, Photographic Society, Debating Society and Society of Islamic Knowledge Seekers. Explore and find your people: https://www.iutoic-dhaka.edu/campus_life/societies',
      now() - interval '8 days'
    ),
    (
      'One of IUT''s defining strengths is its international community. The university describes students from South Asia, the Middle East, Africa and other regions learning and living together on campus. Source: https://www.iutoic-dhaka.edu/campus_life/culture_%26_diversity',
      now() - interval '6 days'
    ),
    (
      'Looking for research material? The IUT Institutional Repository provides collections across departments, course resources and scholarly work: https://repository.iutoic-dhaka.edu/',
      now() - interval '4 days'
    ),
    (
      'Campus recreation reminder: IUT''s official sports page describes indoor and outdoor facilities, student centres, courts and annual athletic activities. Details: https://www.iutoic-dhaka.edu/campus_life/games_%26_sports',
      now() - interval '2 days'
    )
  ) as seed(content, created_at)
  where not exists (
    select 1 from public.posts p where p.content = seed.content
  );

  insert into public.post_category_links (post_id, category_id)
  select p.id, c.id
  from (values
    ('About IUT:%', 'general'),
    ('Know the academic community:%', 'academic'),
    ('Campus societies spotlight:%', 'clubs-and-societies'),
    ('One of IUT''s defining strengths%', 'international-community'),
    ('Looking for research material?%', 'resources'),
    ('Campus recreation reminder:%', 'sports')
  ) as mapping(content_pattern, category_name)
  join public.posts p on p.content like mapping.content_pattern
  join public.post_categories c on c.name = mapping.category_name
  on conflict do nothing;

  -- Add one useful comment and one reaction to each factual seed post.
  insert into public.post_comments (post_id, author_id, content, is_anonymous, status)
  select p.id, v_user,
         'Added from an official IUT source. Please report a broken link so the resource can be updated.',
         false, 'active'::public.content_status
  from public.posts p
  where p.author_id = v_user
    and (
      p.content like 'About IUT:%'
      or p.content like 'Know the academic community:%'
      or p.content like 'Campus societies spotlight:%'
      or p.content like 'One of IUT''s defining strengths%'
      or p.content like 'Looking for research material?%'
      or p.content like 'Campus recreation reminder:%'
    )
    and not exists (
      select 1
      from public.post_comments pc
      where pc.post_id = p.id
        and pc.content = 'Added from an official IUT source. Please report a broken link so the resource can be updated.'
    );

  insert into public.post_reactions (post_id, user_id, reaction_type)
  select p.id, v_user, 'helpful'::public.reaction_type
  from public.posts p
  where p.author_id = v_user
    and p.content like 'Looking for research material?%'
  on conflict (post_id, user_id) do nothing;

  -- A poll attached to the academic-community post.
  select p.id into v_post
  from public.posts p
  where p.content like 'Know the academic community:%'
  order by p.id
  limit 1;

  if v_post is not null then
    insert into public.post_polls (post_id, question)
    values (v_post, 'Which resource area should the community organise next?')
    on conflict (post_id) do nothing;

    select pp.id into v_poll
    from public.post_polls pp
    where pp.post_id = v_post;

    insert into public.post_poll_options (poll_id, text, position)
    select v_poll, seed.option_text, seed.position
    from (values
      ('Course notes and reading lists', 1::smallint),
      ('Laboratory manuals', 2::smallint),
      ('Past questions and solutions', 3::smallint),
      ('Research and project guides', 4::smallint)
    ) as seed(option_text, position)
    where not exists (
      select 1 from public.post_poll_options o
      where o.poll_id = v_poll and o.text = seed.option_text
    );

    select o.id into v_option
    from public.post_poll_options o
    where o.poll_id = v_poll
    order by o.position
    limit 1;

    if v_option is not null then
      insert into public.post_poll_votes (poll_id, option_id, user_id)
      values (v_poll, v_option, v_user)
      on conflict (poll_id, user_id) do nothing;
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 4. Academic-resource engagement
  -- ---------------------------------------------------------------------------

  select ar.id into v_resource
  from public.academic_resources ar
  where ar.title = 'CSE Academic Catalogue'
  order by ar.id
  limit 1;

  if v_resource is not null then
    insert into public.academic_resource_feedback (resource_id, user_id)
    values (v_resource, v_user)
    on conflict (resource_id, user_id) do nothing;

    insert into public.academic_resource_comments (resource_id, author_id, content)
    select v_resource, v_user,
           'Official catalogue link added as a starting point for the CSE resource collection.'
    where not exists (
      select 1 from public.academic_resource_comments arc
      where arc.resource_id = v_resource
        and arc.content = 'Official catalogue link added as a starting point for the CSE resource collection.'
    );
  end if;

  -- ---------------------------------------------------------------------------
  -- 5. Clearly labelled demo events (not official IUT announcements)
  -- ---------------------------------------------------------------------------

  insert into public.events
    (title, description, location, event_date, created_by_id, is_public,
     status, type, club_name, category)
  select
    seed.title, seed.description, seed.location, seed.event_date, v_user, true,
    'active'::public.content_status, seed.event_type, seed.club_name, seed.category
  from (values
    (
      '[SEED DEMO] IUTverse Resource Contribution Sprint',
      'Community demo listing: bring official links, notes metadata and reading-list suggestions. This is seed content, not an official university announcement.',
      'IUT Library', now() + interval '10 days',
      'Workshop', 'IUTverse Community', 'Academic'
    ),
    (
      '[SEED DEMO] Campus Societies Discovery Meetup',
      'Community demo listing inspired by IUT''s official societies page. Verify any real programme with the relevant society before attending.',
      'IUT Student Centre', now() + interval '17 days',
      'Meetup', 'IUTverse Community', 'Clubs'
    ),
    (
      '[SEED DEMO] Interdepartmental Project Showcase',
      'Community demo listing for students to share prototypes, research posters and works in progress. Not an official scheduled IUT event.',
      'IUT Auditorium', now() + interval '24 days',
      'Showcase', 'IUTverse Community', 'Technology'
    ),
    (
      '[SEED DEMO] International Community Story Evening',
      'Community demo listing celebrating the multicultural campus described on IUT''s official culture and diversity page. Not an official scheduled event.',
      'IUT Auditorium', now() + interval '31 days',
      'Community', 'IUTverse Community', 'Culture'
    )
  ) as seed(title, description, location, event_date, event_type, club_name, category)
  where not exists (
    select 1 from public.events e where e.title = seed.title
  );

  select e.id into v_event
  from public.events e
  where e.title = '[SEED DEMO] IUTverse Resource Contribution Sprint'
  order by e.id
  limit 1;

  if v_event is not null then
    insert into public.event_rsvps (event_id, user_id, status)
    values (v_event, v_user, 'interested'::public.rsvp_status)
    on conflict (event_id, user_id) do nothing;
  end if;

  -- ---------------------------------------------------------------------------
  -- 6. Clearly labelled demo opportunities
  -- ---------------------------------------------------------------------------

  insert into public.jobs
    (title, type, description, requirements, compensation, deadline,
     posted_by_id, status, organization, format, skills, department)
  select
    seed.title, seed.job_type::public.job_type, seed.description,
    seed.requirements, seed.compensation, seed.deadline, v_user,
    'active'::public.content_status, seed.organization, seed.format,
    seed.skills, seed.department
  from (values
    (
      '[SEED DEMO] Academic Resource Curator', 'Volunteer',
      'Demo IUTverse community role: organise verified official links and improve resource metadata. This is not an official IUT vacancy.',
      array['Current IUTverse member','Careful source verification']::text[],
      'Volunteer recognition', now() + interval '21 days',
      'IUTverse Community', 'Hybrid',
      array['Research','Content curation','Fact-checking']::text[],
      'Open to all departments'
    ),
    (
      '[SEED DEMO] Campus Accessibility Mapping Project', 'Project',
      'Demo student collaboration to document accessibility observations and propose improvements. Obtain university approval before any field activity.',
      array['Team collaboration','Respect for privacy and campus rules']::text[],
      'Unpaid community project', now() + interval '28 days',
      'IUTverse Community', 'On campus',
      array['Mapping','Documentation','UX research']::text[],
      'Open to all departments'
    ),
    (
      '[SEED DEMO] Open-source Contributor for IUTverse', 'Project',
      'Demo contributor listing for improving IUTverse documentation, testing and user experience. This is a community project, not university employment.',
      array['Git fundamentals','Constructive communication']::text[],
      'Portfolio experience', now() + interval '35 days',
      'IUTverse Community', 'Remote-friendly',
      array['Git','Testing','Documentation']::text[],
      'CSE / open to all'
    )
  ) as seed(title, job_type, description, requirements, compensation, deadline,
            organization, format, skills, department)
  where not exists (
    select 1 from public.jobs j
    where j.title = seed.title and j.organization = seed.organization
  );

  select j.id into v_job
  from public.jobs j
  where j.title = '[SEED DEMO] Academic Resource Curator'
  order by j.id
  limit 1;

  if v_job is not null then
    insert into public.job_comments (job_id, author_id, content)
    select v_job, v_user,
           'This is demonstration data. Replace it with a verified community opportunity before launch.'
    where not exists (
      select 1 from public.job_comments jc
      where jc.job_id = v_job
        and jc.content = 'This is demonstration data. Replace it with a verified community opportunity before launch.'
    );
  end if;

  -- ---------------------------------------------------------------------------
  -- 7. Clearly labelled lost-and-found examples
  -- ---------------------------------------------------------------------------

  insert into public.lost_and_found_posts
    (user_id, type, title, description, location, contact, status, category,
     occurred_at, contact_preference, contact_note, return_location,
     availability, privacy_accepted)
  select
    v_user, seed.item_type::public.lost_found_type, seed.title,
    seed.description, seed.location, 'Use IUTverse direct message',
    seed.status::public.content_status, seed.category, seed.occurred_at,
    'message', seed.contact_note, seed.return_location, seed.availability, true
  from (values
    (
      'found', '[SEED DEMO] Found scientific calculator',
      'Demonstration record only; no real calculator is being held.',
      'Second Academic Building', 'resolved', 'Electronics',
      now() - interval '3 days',
      'Demo row—do not submit a claim.', 'IUTverse demo only', 'Not applicable'
    ),
    (
      'lost', '[SEED DEMO] Lost blue water bottle',
      'Demonstration record only; this does not represent a real lost item.',
      'IUT Student Centre', 'resolved', 'Personal item',
      now() - interval '2 days',
      'Demo row—do not contact the poster.', 'IUTverse demo only', 'Not applicable'
    )
  ) as seed(item_type, title, description, location, status, category,
            occurred_at, contact_note, return_location, availability)
  where not exists (
    select 1 from public.lost_and_found_posts lf where lf.title = seed.title
  );

  -- ---------------------------------------------------------------------------
  -- 8. Cat Corner examples and Q&A
  -- ---------------------------------------------------------------------------

  insert into public.cat_posts
    (user_id, caption, category, location, status)
  select v_user, seed.caption, seed.category, seed.location,
         'active'::public.content_status
  from (values
    ('[SEED DEMO] Campus cat sighting—observe gently, do not disturb or feed without guidance.', 'Sighting', 'IUT campus'),
    ('[SEED DEMO] A reminder to keep shared spaces clean and safe for people and campus animals.', 'Awareness', 'IUT campus')
  ) as seed(caption, category, location)
  where not exists (
    select 1 from public.cat_posts cp where cp.caption = seed.caption
  );

  select cp.id into v_cat_post
  from public.cat_posts cp
  where cp.caption like '[SEED DEMO] Campus cat sighting%'
  order by cp.id
  limit 1;

  if v_cat_post is not null then
    insert into public.cat_post_likes (user_id, cat_post_id)
    values (v_user, v_cat_post)
    on conflict (user_id, cat_post_id) do nothing;

    insert into public.cat_post_comments (user_id, cat_post_id, content)
    select v_user, v_cat_post,
           'Demo guidance: keep a respectful distance and follow campus rules.'
    where not exists (
      select 1 from public.cat_post_comments cpc
      where cpc.cat_post_id = v_cat_post
        and cpc.content = 'Demo guidance: keep a respectful distance and follow campus rules.'
    );
  end if;

  insert into public.cat_questions (user_id, question, status)
  select v_user,
         '[SEED DEMO] What should I do if a campus animal appears injured?',
         'active'::public.content_status
  where not exists (
    select 1 from public.cat_questions cq
    where cq.question = '[SEED DEMO] What should I do if a campus animal appears injured?'
  );

  select cq.id into v_question
  from public.cat_questions cq
  where cq.question = '[SEED DEMO] What should I do if a campus animal appears injured?'
  order by cq.id
  limit 1;

  if v_question is not null then
    insert into public.cat_answers (user_id, question_id, answer, status)
    select v_user, v_question,
           'Keep a safe distance and contact the appropriate campus authority. Avoid handling or medicating the animal yourself.',
           'active'::public.content_status
    where not exists (
      select 1 from public.cat_answers ca
      where ca.question_id = v_question
        and ca.answer = 'Keep a safe distance and contact the appropriate campus authority. Avoid handling or medicating the animal yourself.'
    );
  end if;

  -- ---------------------------------------------------------------------------
  -- 9. Anonymous-community examples and poll
  -- ---------------------------------------------------------------------------

  insert into public.confessions (content, tag, status)
  select seed.content, seed.tag, 'active'::public.content_status
  from (values
    ('The international mix at IUT makes ordinary conversations feel like a small cultural exchange. I hope we create more spaces to hear one another''s stories.', 'Campus Life'),
    ('A quiet thank-you to everyone who shares notes and explains a difficult topic without making anyone feel small.', 'Gratitude'),
    ('Starting a project is much easier than finishing one. A regular peer accountability circle would genuinely help.', 'Academic')
  ) as seed(content, tag)
  where not exists (
    select 1 from public.confessions c where c.content = seed.content
  );

  select c.id into v_confession
  from public.confessions c
  where c.content = 'Starting a project is much easier than finishing one. A regular peer accountability circle would genuinely help.'
  order by c.id
  limit 1;

  if v_confession is not null then
    insert into public.confession_reactions (confession_id, user_id, reaction_type)
    values (v_confession, v_user, 'relatable'::public.reaction_type)
    on conflict (confession_id, user_id) do nothing;

    insert into public.confession_comments (confession_id, author_id, content)
    select v_confession, v_user,
           'A weekly study/project check-in could be a good community-led experiment.'
    where not exists (
      select 1 from public.confession_comments cc
      where cc.confession_id = v_confession
        and cc.content = 'A weekly study/project check-in could be a good community-led experiment.'
    );

    insert into public.confession_polls (confession_id, question)
    values (v_confession, 'Would you join a weekly peer accountability circle?')
    on conflict (confession_id) do nothing;

    select cp.id into v_confession_poll
    from public.confession_polls cp
    where cp.confession_id = v_confession;

    insert into public.confession_poll_options (poll_id, text, order_index)
    select v_confession_poll, seed.option_text, seed.order_index
    from (values
      ('Yes, weekly', 1),
      ('Maybe, before exams or deadlines', 2),
      ('I prefer informal check-ins', 3)
    ) as seed(option_text, order_index)
    where not exists (
      select 1 from public.confession_poll_options cpo
      where cpo.poll_id = v_confession_poll and cpo.text = seed.option_text
    );

    select cpo.id into v_option
    from public.confession_poll_options cpo
    where cpo.poll_id = v_confession_poll
    order by cpo.order_index
    limit 1;

    if v_option is not null then
      insert into public.confession_poll_votes (poll_id, option_id, user_id)
      values (v_confession_poll, v_option, v_user)
      on conflict (poll_id, user_id) do nothing;
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 10. A welcome group conversation for the existing user
  -- ---------------------------------------------------------------------------

  insert into public.conversations (conversation_type, title, direct_key)
  select 'group'::public.conversation_type,
         'IUTverse Seed Welcome', 'seed:iutverse:welcome'
  where not exists (
    select 1 from public.conversations c
    where c.direct_key = 'seed:iutverse:welcome'
  );

  select c.id into v_conversation
  from public.conversations c
  where c.direct_key = 'seed:iutverse:welcome'
  limit 1;

  if v_conversation is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation, v_user)
    on conflict (conversation_id, user_id) do nothing;

    insert into public.chat_messages (conversation_id, sender_id, content, sent_at)
    select v_conversation, v_user, seed.content, seed.sent_at
    from (values
      ('Welcome to the seeded IUTverse workspace. Official facts include source links; fictional UI examples are labelled [SEED DEMO].', now() - interval '5 minutes'),
      ('Before launch, replace or remove demo events, opportunities and lost-and-found records.', now() - interval '4 minutes')
    ) as seed(content, sent_at)
    where not exists (
      select 1 from public.chat_messages cm
      where cm.conversation_id = v_conversation and cm.content = seed.content
    );
  end if;

  -- ---------------------------------------------------------------------------
  -- 11. A few saved items to exercise cross-entity bookmarks
  -- ---------------------------------------------------------------------------

  if v_resource is not null then
    insert into public.saved_items (user_id, entity_kind, entity_id)
    values (v_user, 'resource'::public.entity_kind, v_resource)
    on conflict (user_id, entity_kind, entity_id) do nothing;
  end if;

  if v_event is not null then
    insert into public.saved_items (user_id, entity_kind, entity_id)
    values (v_user, 'event'::public.entity_kind, v_event)
    on conflict (user_id, entity_kind, entity_id) do nothing;
  end if;

  select p.id into v_post
  from public.posts p
  where p.content like 'Looking for research material?%'
  order by p.id
  limit 1;

  if v_post is not null then
    insert into public.saved_items (user_id, entity_kind, entity_id)
    values (v_user, 'post'::public.entity_kind, v_post)
    on conflict (user_id, entity_kind, entity_id) do nothing;
  end if;

  -- ---------------------------------------------------------------------------
  -- 12. Reconcile denormalized counters with their child tables
  -- ---------------------------------------------------------------------------

  update public.posts p
  set reaction_count = (
        select count(*)::integer from public.post_reactions pr where pr.post_id = p.id
      ),
      comment_count = (
        select count(*)::integer from public.post_comments pc where pc.post_id = p.id
      )
  where (
      p.content like 'About IUT:%'
      or p.content like 'Know the academic community:%'
      or p.content like 'Campus societies spotlight:%'
      or p.content like 'One of IUT''s defining strengths%'
      or p.content like 'Looking for research material?%'
      or p.content like 'Campus recreation reminder:%'
    )
    and (
      p.reaction_count is distinct from (
        select count(*)::integer from public.post_reactions pr where pr.post_id = p.id
      )
      or p.comment_count is distinct from (
        select count(*)::integer from public.post_comments pc where pc.post_id = p.id
      )
    );

  update public.cat_posts cp
  set like_count = (
    select count(*)::integer from public.cat_post_likes cpl where cpl.cat_post_id = cp.id
  )
  where cp.caption like '[SEED DEMO]%'
    and cp.like_count is distinct from (
      select count(*)::integer from public.cat_post_likes cpl where cpl.cat_post_id = cp.id
    );

  update public.academic_resources ar
  set helpful_count = (
        select count(*)::integer
        from public.academic_resource_feedback arf
        where arf.resource_id = ar.id
      ),
      comment_count = (
        select count(*)::integer
        from public.academic_resource_comments arc
        where arc.resource_id = ar.id
      )
  where ar.uploaded_by_id = v_user
    and 'official' = any(ar.tags)
    and (
      ar.helpful_count is distinct from (
        select count(*)::integer
        from public.academic_resource_feedback arf
        where arf.resource_id = ar.id
      )
      or ar.comment_count is distinct from (
        select count(*)::integer
        from public.academic_resource_comments arc
        where arc.resource_id = ar.id
      )
    );

  update public.confessions c
  set reaction_count = (
    select count(*)::integer
    from public.confession_reactions cr
    where cr.confession_id = c.id
  )
  where c.content in (
    'The international mix at IUT makes ordinary conversations feel like a small cultural exchange. I hope we create more spaces to hear one another''s stories.',
    'A quiet thank-you to everyone who shares notes and explains a difficult topic without making anyone feel small.',
    'Starting a project is much easier than finishing one. A regular peer accountability circle would genuinely help.'
  )
  and c.reaction_count is distinct from (
    select count(*)::integer
    from public.confession_reactions cr
    where cr.confession_id = c.id
  );

  update public.confession_poll_options cpo
  set vote_count = (
    select count(*)::integer
    from public.confession_poll_votes cpv
    where cpv.option_id = cpo.id
  )
  where cpo.poll_id = v_confession_poll
    and cpo.vote_count is distinct from (
      select count(*)::integer
      from public.confession_poll_votes cpv
      where cpv.option_id = cpo.id
    );

  update public.confession_polls cp
  set total_votes = (
    select count(*)::integer
    from public.confession_poll_votes cpv
    where cpv.poll_id = cp.id
  )
  where cp.id = v_confession_poll
    and cp.total_votes is distinct from (
      select count(*)::integer
      from public.confession_poll_votes cpv
      where cpv.poll_id = cp.id
    );
end;
$iutverse_seed$;

commit;

-- Compact verification result shown after a successful run.
select *
from (values
  ('departments',              (select count(*) from public.departments)),
  ('post_categories',          (select count(*) from public.post_categories)),
  ('academic_resources',       (select count(*) from public.academic_resources)),
  ('posts',                    (select count(*) from public.posts)),
  ('post_comments',            (select count(*) from public.post_comments)),
  ('events',                   (select count(*) from public.events)),
  ('jobs',                     (select count(*) from public.jobs)),
  ('lost_and_found_posts',     (select count(*) from public.lost_and_found_posts)),
  ('cat_posts',                (select count(*) from public.cat_posts)),
  ('cat_questions',            (select count(*) from public.cat_questions)),
  ('confessions',              (select count(*) from public.confessions)),
  ('conversations',            (select count(*) from public.conversations)),
  ('chat_messages',            (select count(*) from public.chat_messages))
) as seeded_table(table_name, total_rows)
order by table_name;
