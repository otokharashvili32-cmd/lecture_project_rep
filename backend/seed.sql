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
INSERT INTO merch (name, price, type, variant) VALUES
  -- Shirts
  ('Blue Shirt', 30, 'shirt', 'blue'),
  ('Black Shirt', 35, 'shirt', 'black'),
  ('Red Shirt', 35, 'shirt', 'red'),
  -- Guitars
  ('Custom Fender Stratocaster', 1400, 'guitar', 'Custom Fender Stratocaster'),
  ('Custom Fender Telecaster', 1500, 'guitar', 'Custom Fender Telecaster'),
  ('Custom Gibson Les Paul', 1999, 'guitar', 'Custom Gibson Les Paul'),
  -- Vinyls
  ('AMAO VINYL', 95, 'vinyl', 'AMAO'),
  ('AMAO disk 2 VINYL', 95, 'vinyl', 'AMAO disk 2'),
  ('AMAO live at Bassiani VINYL', 68, 'vinyl', 'AMAO live at Bassiani')
ON CONFLICT DO NOTHING;

-- Initial album
INSERT INTO albums (title, year, cover_image) VALUES
  ('AMAO', 2025, 'b6968f9d-a967-4ec7-b907-1bcdd8c25a9b.jpg')
ON CONFLICT DO NOTHING;

-- Songs for AMAO album (album_id = 1)
INSERT INTO songs (album_id, title, duration, track_number) VALUES
  (1, 'THE SPECTATOR', '4:30', 1),
  (1, 'THE CAVE', '6:21', 2),
  (1, 'INDULGENCE', '9:01', 3),
  (1, 'STRINGS', '3:56', 4),
  (1, 'PILATE''S COURT', '11:37', 5),
  (1, 'GETHSEMANE', '3:00', 6),
  (1, 'OUROBOROS', '6:56', 7),
  (1, 'DELIRIUM', '8:02', 8),
  (1, 'SAMSARA', '7:31', 9),
  (1, 'INFERNIAC', '6:20', 10),
  (1, 'MYALGIC ENCEPHALOMYELITIS', '2:24', 11),
  (1, 'SATORI', '3:04', 12),
  (1, 'AMAO', '13:00', 13)
ON CONFLICT (album_id, track_number) DO NOTHING;


