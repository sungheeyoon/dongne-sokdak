-- 20260205_seed_data.sql
-- Initial seed data for development
-- Note: User UUIDs are hardcoded placeholders. 
-- IN REAL USAGE: Create users via Auth API first, then update these UUIDs to match.

-- 1. Insert Test Profiles (Assuming these UUIDs exist in auth.users)
-- For local dev/testing, you might manually insert into auth.users or use these IDs after signing up.

INSERT INTO public.profiles (id, nickname, role, location)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'AdminUser', 'admin', ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326)), -- Gangnam
    ('00000000-0000-0000-0000-000000000002', 'RegularUser', 'user', ST_SetSRID(ST_MakePoint(126.9244, 37.5575), 4326)); -- Hongdae

-- 2. Insert Test Reports
INSERT INTO public.reports (id, user_id, title, description, category, status, location, address)
VALUES
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '00000000-0000-0000-0000-000000000002',
        'Noise complaint in Hongdae',
        'Street performers are too loud past midnight.',
        'NOISE',
        'OPEN',
        ST_SetSRID(ST_MakePoint(126.9244, 37.5575), 4326),
        'Hongdae Street'
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        '00000000-0000-0000-0000-000000000002',
        'Broken streetlight',
        'The light at the corner is flickering.',
        'FACILITY',
        'IN_PROGRESS',
        ST_SetSRID(ST_MakePoint(126.9250, 37.5580), 4326),
        'Near Exit 9'
    ),
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        '00000000-0000-0000-0000-000000000001',
        'Illegal Parking',
        'Blocking the fire hydrant.',
        'TRAFFIC',
        'RESOLVED',
        ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326),
        'Gangnam Station Exit 1'
    );

-- 3. Insert Test Comments
INSERT INTO public.comments (report_id, user_id, content)
VALUES
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '00000000-0000-0000-0000-000000000001',
        'I will look into this. - Admin'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '00000000-0000-0000-0000-000000000002',
        'Thank you!'
    );

-- 4. Insert Test Votes
INSERT INTO public.votes (report_id, user_id)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000001');
