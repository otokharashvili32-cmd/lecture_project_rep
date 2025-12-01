-- Create visitor counter table
CREATE TABLE IF NOT EXISTS visitor_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count INTEGER DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row (if it doesn't exist)
INSERT INTO visitor_counter (id, count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

