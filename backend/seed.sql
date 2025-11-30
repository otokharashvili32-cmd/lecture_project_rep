-- Initial user matching your frontend login
INSERT INTO users (email, password)
VALUES ('thespectator@gmail.com', 'otartotari')
ON CONFLICT (email) DO NOTHING;

-- Initial shows
INSERT INTO shows (date, city, venue) VALUES
  ('2025-03-01', 'Berlin', 'Unknown Hall'),
  ('2025-04-10', 'Paris', 'Hidden Theatre'),
  ('2025-05-21', 'London', 'Basement 13')
ON CONFLICT DO NOTHING;

-- Initial merch
INSERT INTO merch (name, price) VALUES
  ('T-Shirt', 35),
  ('Vinyl', 95),
  ('Guitar', 1999)
ON CONFLICT DO NOTHING;

-- Initial album
INSERT INTO albums (title, year, cover_image) VALUES
  ('AMAO', 2025, 'b6968f9d-a967-4ec7-b907-1bcdd8c25a9b.jpg')
ON CONFLICT DO NOTHING;


