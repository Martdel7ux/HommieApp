-- ============================================================================
-- Hommie — seed data (Cyprus student life)
-- Runs after migrations on `supabase db reset`. Safe to re-run (idempotent-ish
-- via fixed UUIDs + on conflict do nothing).
--
-- Demo login password for every seeded account: Passw0rd!
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Universities
-- ---------------------------------------------------------------------------
insert into universities (id, name, short_name, city, campus_area, website) values
  ('11111111-0000-0000-0000-000000000001', 'University of Nicosia', 'UNIC', 'Nicosia', 'Engomi', 'https://www.unic.ac.cy'),
  ('11111111-0000-0000-0000-000000000002', 'European University Cyprus', 'EUC', 'Nicosia', 'Engomi', 'https://euc.ac.cy'),
  ('11111111-0000-0000-0000-000000000003', 'Frederick University', 'Frederick', 'Nicosia', 'Pallouriotissa', 'https://www.frederick.ac.cy'),
  ('11111111-0000-0000-0000-000000000004', 'University of Cyprus', 'UCY', 'Nicosia', 'Aglantzia', 'https://www.ucy.ac.cy'),
  ('11111111-0000-0000-0000-000000000005', 'Cyprus University of Technology', 'CUT', 'Limassol', 'City Centre', 'https://www.cut.ac.cy'),
  ('11111111-0000-0000-0000-000000000006', 'UCLan Cyprus', 'UCLan', 'Larnaca', 'Pyla', 'https://www.uclancyprus.ac.cy')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Auth users (local dev only). The on_auth_user_created trigger creates the
-- matching profiles / landlord_profiles rows.
-- ---------------------------------------------------------------------------
create or replace function _seed_user(
  p_id uuid, p_email text, p_role text, p_meta jsonb
) returns void language plpgsql as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    -- GoTrue scans these text columns into non-nullable Go strings; they MUST be
    -- '' not NULL or every auth call fails with "Database error querying schema".
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, extensions.crypt('Passw0rd!', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    p_meta || jsonb_build_object('role', p_role),
    now(), now(),
    '', '', '', '', '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', now(), now(), now()
  ) on conflict do nothing;
end;
$$;

-- Students
select _seed_user('a0000000-0000-0000-0000-000000000001', 'maria.student@hommie.test', 'student', '{"first_name":"Maria"}');
select _seed_user('a0000000-0000-0000-0000-000000000002', 'andreas.student@hommie.test', 'student', '{"first_name":"Andreas"}');
select _seed_user('a0000000-0000-0000-0000-000000000003', 'lena.student@hommie.test', 'student', '{"first_name":"Lena"}');
select _seed_user('a0000000-0000-0000-0000-000000000004', 'yiannis.student@hommie.test', 'student', '{"first_name":"Yiannis"}');
select _seed_user('a0000000-0000-0000-0000-000000000005', 'sofia.student@hommie.test', 'student', '{"first_name":"Sofia"}');
select _seed_user('a0000000-0000-0000-0000-000000000006', 'daniel.student@hommie.test', 'student', '{"first_name":"Daniel"}');
select _seed_user('a0000000-0000-0000-0000-000000000007', 'elena.student@hommie.test', 'student', '{"first_name":"Elena"}');

-- Landlords
select _seed_user('b0000000-0000-0000-0000-000000000001', 'costas.landlord@hommie.test', 'landlord', '{"first_name":"Costas","contact_name":"Costas Georgiou","phone":"+35799123456"}');
select _seed_user('b0000000-0000-0000-0000-000000000002', 'nicosia.rentals@hommie.test', 'landlord', '{"business_name":"Nicosia Student Rentals","contact_name":"Anna Papadopoulou","phone":"+35799765432"}');
select _seed_user('b0000000-0000-0000-0000-000000000003', 'engomi.homes@hommie.test', 'landlord', '{"business_name":"Engomi Homes","contact_name":"Marios Constantinou","phone":"+35799555111"}');

-- Admin (events)
select _seed_user('c0000000-0000-0000-0000-000000000001', 'team@hommie.test', 'student', '{"first_name":"Hommie"}');
update profiles set is_admin = true, display_name = 'Hommie Team' where id = 'c0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Flesh out student profiles
-- ---------------------------------------------------------------------------
update profiles set
  university_id = '11111111-0000-0000-0000-000000000001',
  city = 'Nicosia', campus_area = 'Engomi',
  study_level = 'undergraduate_y2', student_status = 'looking_for_accommodation',
  move_in_from = date '2026-09-01', move_in_to = date '2026-09-30',
  budget_min = 300, budget_max = 480,
  interests = array['football','photography','cooking'],
  avatar_url = 'https://i.pravatar.cc/300?img=47',
  bio = 'Second-year Business student, tidy and easy-going. Looking for a room near UNIC.',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000001';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000004',
  city = 'Nicosia', campus_area = 'Aglantzia',
  study_level = 'postgraduate', student_status = 'looking_for_roommate',
  move_in_from = date '2026-09-15', budget_min = 350, budget_max = 550,
  interests = array['music','hiking','coffee'],
  avatar_url = 'https://i.pravatar.cc/300?img=12',
  bio = 'MSc Computer Science at UCY. Night owl, quiet, love good coffee.',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000002';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000002',
  city = 'Nicosia', campus_area = 'Engomi',
  study_level = 'erasmus_exchange', student_status = 'new_to_cyprus',
  move_in_from = date '2026-09-01', move_in_to = date '2026-09-20',
  budget_min = 250, budget_max = 400,
  interests = array['art','travel','languages'],
  avatar_url = 'https://i.pravatar.cc/300?img=32',
  bio = 'Erasmus from Germany for one semester. Excited to meet people!',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000003';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000001',
  city = 'Nicosia', campus_area = 'Strovolos',
  study_level = 'undergraduate_y3', student_status = 'already_settled',
  budget_min = 300, budget_max = 450,
  interests = array['gaming','basketball'],
  avatar_url = 'https://i.pravatar.cc/300?img=15',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000004';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000003',
  city = 'Nicosia', campus_area = 'Pallouriotissa',
  study_level = 'undergraduate_y1', student_status = 'looking_for_roommate',
  move_in_from = date '2026-09-01', budget_min = 280, budget_max = 420,
  interests = array['cinema','volunteering','cats'],
  avatar_url = 'https://i.pravatar.cc/300?img=45',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000005';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000004',
  city = 'Nicosia', campus_area = 'Aglantzia',
  study_level = 'undergraduate_y2', student_status = 'looking_for_accommodation',
  move_in_from = date '2026-08-20', budget_min = 320, budget_max = 500,
  interests = array['running','startups'],
  avatar_url = 'https://i.pravatar.cc/300?img=52',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000006';

update profiles set
  university_id = '11111111-0000-0000-0000-000000000002',
  city = 'Nicosia', campus_area = 'Engomi',
  study_level = 'postgraduate', student_status = 'looking_for_roommate',
  move_in_from = date '2026-09-10', budget_min = 300, budget_max = 460,
  interests = array['yoga','baking','books'],
  avatar_url = 'https://i.pravatar.cc/300?img=20',
  onboarding_completed = true
where id = 'a0000000-0000-0000-0000-000000000007';

-- Surnames (shown as an initial on roommate cards: "Elena K.")
update profiles set last_name = case id
  when 'a0000000-0000-0000-0000-000000000001' then 'Antoniou'
  when 'a0000000-0000-0000-0000-000000000002' then 'Petrou'
  when 'a0000000-0000-0000-0000-000000000003' then 'Weber'
  when 'a0000000-0000-0000-0000-000000000004' then 'Charalambous'
  when 'a0000000-0000-0000-0000-000000000005' then 'Georgiou'
  when 'a0000000-0000-0000-0000-000000000006' then 'Nicolaou'
  when 'a0000000-0000-0000-0000-000000000007' then 'Kyriacou'
end
where id in (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007'
);

-- ---------------------------------------------------------------------------
-- Landlord profiles
-- ---------------------------------------------------------------------------
update landlord_profiles set
  operating_areas = array['Engomi','Aglantzia','Strovolos'],
  description = 'Family landlord with a few well-kept flats near UNIC and UCY. Quick to respond.',
  preferred_contact = 'in_app',
  verification = 'verified', verified_at = now()
where id = 'b0000000-0000-0000-0000-000000000001';

update landlord_profiles set
  operating_areas = array['Engomi','Nicosia','Latsia'],
  description = 'Managing student apartments across Nicosia since 2015.',
  preferred_contact = 'in_app',
  verification = 'verified', verified_at = now()
where id = 'b0000000-0000-0000-0000-000000000002';

update landlord_profiles set
  operating_areas = array['Engomi'],
  description = 'Renovated rooms and studios in Engomi, walking distance to campus.',
  preferred_contact = 'phone',
  verification = 'submitted', verification_submitted_at = now()
where id = 'b0000000-0000-0000-0000-000000000003';

-- ---------------------------------------------------------------------------
-- Accommodation listings
-- ---------------------------------------------------------------------------
insert into accommodation_listings (
  id, landlord_id, title, description, property_type, status,
  rent_month, deposit, bills_included, bills_note,
  bedrooms, bathrooms, furnished, roommate_suitable, max_occupants,
  city, area, address_line, approx_lat, approx_lng,
  nearest_university_id, distance_to_campus_km, amenities, available_from
) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Bright 2-bed flat, 5 min walk to UNIC', 'Sunny second-floor apartment on a quiet street in Engomi. Ideal for two students sharing. Fully furnished, A/C in both bedrooms, fast fibre internet.', 'apartment', 'active',
   750, 750, false, 'Electricity, water and internet approx €90/month split between tenants',
   2, 1, true, true, 2, 'Nicosia', 'Engomi', '12 Kallipoleos, Engomi', 35.1663, 33.3230,
   '11111111-0000-0000-0000-000000000001', 0.5,
   array['wifi','air_conditioning','washing_machine','furnished','balcony','near_bus_stop','study_desk'], date '2026-08-15'),

  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Private room in shared 3-bed house', 'One room available in a friendly 3-bedroom house shared with two other UCY students. Garden, big kitchen, close to the Aglantzia bus route.', 'private_room', 'active',
   330, 330, true, 'Bills included up to fair use',
   1, 2, true, true, 1, 'Nicosia', 'Aglantzia', '8 Athinon, Aglantzia', 35.1420, 33.4020,
   '11111111-0000-0000-0000-000000000004', 1.2,
   array['wifi','heating','washing_machine','furnished','parking','study_desk','pet_friendly'], date '2026-09-01'),

  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   'Modern studio near Engomi campus cluster', 'Newly renovated studio, perfect for one. Kitchenette, en-suite shower room, energy-efficient A/C. Managed professionally with 24h maintenance line.', 'studio', 'active',
   520, 520, false, 'Bills approx €55/month',
   0, 1, true, false, 1, 'Nicosia', 'Engomi', '3 Markou Drakou, Engomi', 35.1701, 33.3155,
   '11111111-0000-0000-0000-000000000002', 0.8,
   array['wifi','air_conditioning','elevator','furnished','study_desk','near_bus_stop'], date '2026-08-01'),

  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
   'Spacious 3-bed for a student group', 'Whole apartment for three friends. Two bathrooms, large living room, washing machine and dishwasher. Walkable to Frederick and a short drive to UNIC.', 'apartment', 'active',
   960, 960, false, null,
   3, 2, true, true, 3, 'Nicosia', 'Strovolos', '45 Tseriou, Strovolos', 35.1385, 33.3360,
   '11111111-0000-0000-0000-000000000003', 2.4,
   array['wifi','air_conditioning','washing_machine','dishwasher','furnished','parking','balcony'], date '2026-09-01'),

  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003',
   'Cosy room in Engomi, all bills included', 'Single room in a renovated flat, 10 minutes on foot to EUC and UNIC. Shared kitchen and bathroom with one other tenant. Great for a first year.', 'private_room', 'active',
   300, 150, true, 'All bills and internet included',
   1, 1, true, true, 1, 'Nicosia', 'Engomi', '19 Nikou Kranidioti, Engomi', 35.1655, 33.3100,
   '11111111-0000-0000-0000-000000000001', 0.9,
   array['wifi','air_conditioning','washing_machine','furnished','near_bus_stop'], date '2026-09-10'),

  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003',
   'Studio with balcony, Engomi', 'Compact studio with a west-facing balcony. Suits one quiet student. Available now.', 'studio', 'paused',
   470, 470, false, null,
   0, 1, true, false, 1, 'Nicosia', 'Engomi', '7 Andrea Avraamidi, Engomi', 35.1688, 33.3190,
   '11111111-0000-0000-0000-000000000002', 1.0,
   array['wifi','air_conditioning','furnished','balcony'], date '2026-08-01'),

  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'Draft — 1-bed near UCY (not published)', 'Work in progress listing.', 'apartment', 'draft',
   600, 600, false, null,
   1, 1, false, false, 2, 'Nicosia', 'Aglantzia', '2 Kyriakou Matsi, Aglantzia', 35.1440, 33.4090,
   '11111111-0000-0000-0000-000000000004', 0.7,
   array['wifi','heating'], date '2026-10-01')
on conflict (id) do nothing;

-- deterministic ids: this table has a surrogate pk, so `on conflict do nothing`
-- alone would let every re-seed insert duplicate rows.
insert into accommodation_listing_images (id, listing_id, storage_path, position) values
  ('d1a00000-0000-0000-0000-000000000101', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200', 0),
  ('d1a00000-0000-0000-0000-000000000102', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200', 1),
  ('d1a00000-0000-0000-0000-000000000103', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200', 2),
  ('d1a00000-0000-0000-0000-000000000104', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200', 3),
  ('d1a00000-0000-0000-0000-000000000105', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200', 4),
  ('d1a00000-0000-0000-0000-000000000201', 'd0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200', 0),
  ('d1a00000-0000-0000-0000-000000000202', 'd0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200', 1),
  ('d1a00000-0000-0000-0000-000000000301', 'd0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200', 0),
  ('d1a00000-0000-0000-0000-000000000302', 'd0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200', 1),
  ('d1a00000-0000-0000-0000-000000000401', 'd0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200', 0),
  ('d1a00000-0000-0000-0000-000000000501', 'd0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200', 0),
  ('d1a00000-0000-0000-0000-000000000601', 'd0000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200', 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Roommate profiles
-- ---------------------------------------------------------------------------
insert into roommate_preferences (
  user_id, age, is_published, headline, about, preferred_city, preferred_areas, university_id,
  budget_min, budget_max, move_in_from, move_in_to, smoking, pets, cleanliness,
  sleep_schedule, social_level, guests_frequency, gender_preference, lifestyle_tags
) values
  ('a0000000-0000-0000-0000-000000000002', 24, true, 'Quiet MSc student looking for a chill flatmate',
   'I study most evenings and value a calm home. Happy to share cooking and cleaning fairly.',
   'Nicosia', array['Aglantzia','Engomi'], '11111111-0000-0000-0000-000000000004',
   350, 550, date '2026-09-15', date '2026-10-05', 'no', 'no_preference', 4,
   'night_owl', 'balanced', 'rarely', 'no_preference', array['non_smoker','clean','studious']),

  ('a0000000-0000-0000-0000-000000000005', 19, true, 'First year, friendly and tidy',
   'Looking for a room or a flatmate to search together. I love cooking and film nights.',
   'Nicosia', array['Pallouriotissa','Engomi','Strovolos'], '11111111-0000-0000-0000-000000000003',
   280, 420, date '2026-09-01', date '2026-09-25', 'no', 'yes', 4,
   'flexible', 'very_social', 'sometimes', 'same', array['pet_lover','sociable','cook']),

  ('a0000000-0000-0000-0000-000000000007', 23, true, 'Postgrad, early riser, into yoga & baking',
   'Clean, organised and quiet in the mornings. Would love a flatmate with similar rhythm.',
   'Nicosia', array['Engomi','Aglantzia'], '11111111-0000-0000-0000-000000000002',
   300, 460, date '2026-09-10', date '2026-09-30', 'no', 'no', 5,
   'early_bird', 'balanced', 'rarely', 'same', array['non_smoker','clean','quiet'])
on conflict (user_id) do update set age = excluded.age;

-- ---------------------------------------------------------------------------
-- Community posts
-- ---------------------------------------------------------------------------
insert into community_posts (id, author_id, category, body, image_paths, created_at) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'new_in_cyprus',
   'Just landed in Nicosia for Erasmus! Any tips for getting a local SIM and a bus card?', '{}', now() - interval '2 minutes'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'campus_life',
   'The new study lounge at UNIC is actually amazing. Highly recommend checking it out if you need a quiet spot!',
   array['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200'], now() - interval '15 minutes'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'recommendations',
   'Best coffee near EUC? Looking for a place with good WiFi.', '{}', now() - interval '1 hour'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'housing_help',
   'Is €350 for a room in Engomi with bills included a good deal? First time renting here.', '{}', now() - interval '3 hours'),
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'general',
   'Welcome to the Hommie community! Be kind, keep it student-friendly, and report anything dodgy.', '{}', now() - interval '2 days')
on conflict (id) do nothing;

insert into community_comments (post_id, author_id, body) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Get a prepaid SIM from any kiosk, and the bus card at the OSEL office near the old town.'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'That is a fair price for Engomi, especially with bills included. Check the A/C works before signing.')
on conflict do nothing;

insert into community_post_likes (post_id, user_id) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Events (admin-created)
-- ---------------------------------------------------------------------------
insert into events (id, created_by, title, description, host_name, cover_image_path, starts_at, ends_at, location_name, city, area) values
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Hommie Welcome Mixer for New Students',
   'Kick off the new semester with our Welcome Mixer. Meet other students settling into Nicosia, connect with a few landlords in person, and get your housing questions answered at the Q&A corner. Free drinks, live music and a giveaway or two.',
   'Hommie',
   'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200',
   date_trunc('day', now() + interval '10 days') + interval '16 hours',
   date_trunc('day', now() + interval '10 days') + interval '19 hours',
   'The Old Town Courtyard', 'Nicosia', 'Old Town'),
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'UNIC Campus Tour + Coffee',
   'Guided walk around the Engomi campus followed by coffee with second-years who know all the shortcuts. Great for new and exchange students. Meet at the main entrance.',
   'UNIC Student Union',
   'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200',
   date_trunc('day', now() + interval '5 days') + interval '10 hours 30 minutes',
   date_trunc('day', now() + interval '5 days') + interval '12 hours',
   'UNIC Main Entrance', 'Nicosia', 'Engomi'),
  ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
   'Second-hand Market Day',
   'Bring what you no longer need, take what you do. Furniture, books, kitchen bits and bikes. Everything is free or a few euros. A great way to kit out a new room on a budget.',
   'Hommie',
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
   date_trunc('day', now() + interval '18 days') + interval '11 hours',
   date_trunc('day', now() + interval '18 days') + interval '15 hours',
   'Engomi Community Park', 'Nicosia', 'Engomi')
on conflict (id) do update set
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into event_rsvps (event_id, user_id, state) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'going'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'interested'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'going')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------
insert into marketplace_listings (id, seller_id, title, description, category, condition, price, is_free, city, area) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'IKEA desk + chair', 'Selling my study desk and chair, moving out. Good condition, small scratches.', 'furniture', 'good', 45, false, 'Nicosia', 'Strovolos'),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Microwave 700W', 'Works perfectly, had it one year.', 'kitchen', 'like_new', 25, false, 'Nicosia', 'Aglantzia'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Intro to Economics textbooks (set of 3)', 'UNIC first-year set. Some highlighting.', 'books', 'fair', 20, false, 'Nicosia', 'Engomi'),
  ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'City bike', 'Single speed, recently serviced. Great for campus.', 'transport', 'good', 70, false, 'Nicosia', 'Pallouriotissa'),
  ('a1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 'Free moving boxes', 'About 10 sturdy boxes, free to collect in Engomi.', 'other', 'good', 0, true, 'Nicosia', 'Engomi'),
  ('a1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'Desk lamp', 'LED, adjustable arm.', 'electronics', 'like_new', 12, false, 'Nicosia', 'Aglantzia')
on conflict (id) do nothing;

-- deterministic ids: marketplace_listing_images has a surrogate pk, so a plain
-- `on conflict do nothing` would let every re-seed insert duplicates.
insert into marketplace_listing_images (id, listing_id, storage_path, position) values
  ('b1a00000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1000', 0),
  ('b1a00000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=1000', 0),
  ('b1a00000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000', 0),
  ('b1a00000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1000', 0),
  ('b1a00000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1607166452427-7e4477079cb9?w=1000', 0),
  ('b1a00000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000', 0)
on conflict (id) do nothing;

insert into saved_marketplace_listings (user_id, listing_id) values
  ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sample conversations for Maria's inbox (1 unread + 2 read) + an enquiry.
-- Message created_at is staggered so the inbox shows realistic timestamps.
-- ---------------------------------------------------------------------------
do $$
begin
  -- 1) Maria <-> Costas (landlord) about listing 1 — Costas replied last => UNREAD for Maria
  insert into conversations (id, context, accommodation_listing_id, created_by, last_message_preview)
  values ('c1000000-0000-0000-0000-000000000001', 'accommodation', 'd0000000-0000-0000-0000-000000000001',
          'a0000000-0000-0000-0000-000000000001', 'placeholder')
  on conflict (id) do nothing;
  insert into conversation_participants (conversation_id, user_id) values
    ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')
  on conflict do nothing;
  insert into messages (id, conversation_id, sender_id, body, created_at) values
    ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Hi! Is the room still available for the fall semester?', date_trunc('day', now()) + interval '10 hours 42 minutes'),
    ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'I love the natural light in the photos — is a September move-in possible?', date_trunc('day', now()) + interval '10 hours 45 minutes'),
    ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Hello Maria, yes it is. The current tenant leaves late August. Would you like to view it this week?', date_trunc('day', now()) + interval '11 hours 2 minutes')
  on conflict (id) do nothing;

  -- 2) Maria <-> Andreas (roommate) — Maria replied last => READ
  insert into conversations (id, context, roommate_profile_id, created_by, last_message_preview)
  values ('c1000000-0000-0000-0000-000000000002', 'roommate', 'a0000000-0000-0000-0000-000000000002',
          'a0000000-0000-0000-0000-000000000001', 'placeholder')
  on conflict (id) do nothing;
  insert into conversation_participants (conversation_id, user_id) values
    ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002')
  on conflict do nothing;
  insert into messages (id, conversation_id, sender_id, body, created_at) values
    ('e1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
     'Hey! Saw we both want Engomi for September — want to look together?', date_trunc('day', now()) - interval '1 day' + interval '16 hours'),
    ('e1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Yes definitely! I''m free this weekend to view a few places.', date_trunc('day', now()) - interval '1 day' + interval '18 hours')
  on conflict (id) do nothing;

  -- 3) Maria <-> Sofia (roommate) — Maria replied last => READ
  insert into conversations (id, context, roommate_profile_id, created_by, last_message_preview)
  values ('c1000000-0000-0000-0000-000000000003', 'roommate', 'a0000000-0000-0000-0000-000000000005',
          'a0000000-0000-0000-0000-000000000001', 'placeholder')
  on conflict (id) do nothing;
  insert into conversation_participants (conversation_id, user_id) values
    ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005')
  on conflict do nothing;
  insert into messages (id, conversation_id, sender_id, body, created_at) values
    ('e1000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005',
     'Thanks for the tips on the bus routes!', date_trunc('day', now()) - interval '4 days' + interval '14 hours'),
    ('e1000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'No problem — shout if you need anything else settling in.', date_trunc('day', now()) - interval '4 days' + interval '15 hours')
  on conflict (id) do nothing;

  insert into enquiries (listing_id, student_id, landlord_id, conversation_id, message, share_move_in, share_budget, share_university)
  values ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
          'Hi! Is the room still available for the fall semester? I study at UNIC.', true, true, true)
  on conflict (listing_id, student_id) do nothing;
end $$;

-- saved items
insert into saved_accommodation_listings (user_id, listing_id) values
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Notifications for Maria. The message trigger (`bump_conversation_on_message`)
-- has already created "New message" rows from the seeded messages above, so we
-- clear Maria's notifications and lay down one deterministic, readable set.
-- ---------------------------------------------------------------------------
delete from notifications where user_id = 'a0000000-0000-0000-0000-000000000001';

insert into notifications (id, user_id, type, title, body, data, is_read, created_at) values
  ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'message',
   'Costas replied about the 2-bed flat', 'Hello Maria, yes it is. The current tenant leaves late August. Would you like to view it this week?',
   '{"conversation_id":"c1000000-0000-0000-0000-000000000001"}', false, now() - interval '2 hours'),
  ('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'event_reminder',
   'UNIC Campus Tour + Coffee is coming up', 'This Friday · UNIC Main Entrance, Engomi',
   '{"event_id":"f0000000-0000-0000-0000-000000000002"}', false, now() - interval '6 hours'),
  ('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'community_reply',
   'New reply on your post', 'Yiannis: That is a fair price for Engomi, especially with bills included. Check the A/C works before signing.',
   '{"post_id":"e0000000-0000-0000-0000-000000000002"}', false, now() - interval '1 day'),
  ('f1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'community_like',
   'Andreas liked your post', 'Is €350 for a room in Engomi with bills included a good deal?',
   '{"post_id":"e0000000-0000-0000-0000-000000000002"}', true, now() - interval '2 days'),
  ('f1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'system',
   'Welcome to Hommie', 'Complete your profile to get better roommate matches and recommendations.',
   '{}', true, now() - interval '4 days')
on conflict (id) do nothing;

drop function _seed_user(uuid, text, text, jsonb);
