## QR Ticket System – Project Plan

Role: Project Manager  
Goal: Add QR-code based tickets for purchased shows, linked to `userId` and `showId`, integrated with your existing app.

---

### Phase 1 – Requirements & Design

1. **Clarify user flows**
   - As a **user**, when I purchase a ticket for a show, a **unique QR code ticket** is created for me.
   - As a **user**, on the **“My purchases”** page, I can see a list of shows I’ve bought and a **QR code** for each ticket.
   - As a **door staff / admin (future)**, I can scan a QR code and see whether that ticket is **valid** and **not already used**.

2. **Decide QR data format**
   - Use a simple string format that encodes the key info:
     - Example: `ticket:{ticketId};user:{userId};show:{showId}`
   - This string is what the QR will represent.  
   - The server will validate this data when scanned.

3. **Decide where QR is generated**
   - **Backend option (preferred for you):**
     - Use a Node library (e.g. `qrcode`) to generate a **PNG** or **data URL**.
     - Store either:
       - The **ticket ID + QR data string** in the database, or
       - Also the **QR image** as a data URL (no extra storage) or file path.
   - **Frontend option (alternative):**
     - Backend only stores the **ticketId / data string**.
     - Frontend uses a React QR component to render it.
   - For simplicity and fewer moving parts, we’ll start with: **backend stores the ticketId + data string; frontend renders QR with a React QR component.**

4. **Database design**
   - Add a new table `tickets`:
     ```sql
     CREATE TABLE tickets (
       id SERIAL PRIMARY KEY,
       user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
       ticket_code TEXT NOT NULL UNIQUE, -- the string we encode in the QR
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       used_at TIMESTAMPTZ                    -- null until checked in
     );
     ```
   - One ticket per **user + show** for now (same logic as your current “already purchased” rule).

---

### Phase 2 – Backend Implementation

**Task 1 – Schema update**
- Add SQL for the new `tickets` table into `backend/schema.sql`.
- Optionally add a one-time endpoint like `/api/create-tickets-table` similar to others you already have, so we can safely create it in Neon.

**Task 2 – Ticket creation on purchase**
- When a user successfully purchases a show (in `POST /api/shows/:showId/purchase`):
  - After the purchase record is written to `user_show_purchases`, create a **ticket**:
    - Generate a unique `ticketId` (use the `tickets.id` or a UUID-like string).
    - Build `ticket_code` string: `ticket:{ticketId};user:{userId};show:{showId}`.
    - Insert into `tickets (user_id, show_id, ticket_code)`.
- Ensure we **do not create duplicate tickets**:
  - Before inserting, check if a ticket already exists for that `user_id` + `show_id`. If yes, reuse it.

**Task 3 – API to fetch user tickets**
- New endpoint: `GET /api/users/:userId/tickets`
  - Returns an array of:
    ```json
    [
      {
        "ticketId": 123,
        "showId": 5,
        "ticketCode": "ticket:123;user:1;show:5",
        "usedAt": null
      }
    ]
    ```
  - Only returns tickets for that userId.
- Option: join with `shows` to also send city, venue, date, but we can keep that on the frontend by matching via `showId` against the `shows` list we already load.

**Task 4 – (Future) validation endpoint**
- New endpoint: `POST /api/tickets/validate`
  - Body: `{ "ticketCode": "ticket:123;user:1;show:5" }`
  - Server parses `ticketCode`, looks up ticket, checks:
    - Ticket exists
    - Belongs to expected user & show
    - Not already marked `used_at`
  - Responds with `{ success: true/false, reason?, show?, user? }`.
  - If we implement check-in, we can set `used_at = NOW()` on first valid scan.
- This is **optional for now**, but we design for it.

---

### Phase 3 – Frontend Integration

**Task 5 – Store tickets in frontend state**
- In `App.jsx`, add a new state: `const [tickets, setTickets] = useState([]);`
- After login / when loading main data (where we already fetch shows/merch/reservations/purchases):
  - If the user is logged in, call `GET /api/users/:userId/tickets` and store in `tickets` state.

**Task 6 – Render QR codes on “My purchases” page**
- Add a small React QR component library (e.g. `qrcode.react`) on the frontend:
  - `npm install qrcode.react`
  - Use `<QRCode value={ticket.ticketCode} />` to show a QR.
- In the **“My purchases”** section under “Shows → Tickets bought”:
  - For each purchased show, find the corresponding ticket (by `showId` + `userId`).
  - Display its QR code next to the show info:
    - Show name (city/venue/date)
    - A small QR image
    - Optional “Ticket ID: xxx” text.

**Task 7 – Handle no-ticket cases gracefully**
- If a user bought a show **before** we introduced tickets, there might be purchases with no ticket row.
  - In that case, show a small message “No QR ticket generated (old purchase)” or generate one on demand via a “Generate QR” button that calls a backend endpoint to create it.
- For now we can keep it simple:
  - When `tickets` don’t contain an entry for that show, hide the QR and just show the show details.

---

### Phase 4 – Admin / Future Enhancements (Optional)

**Task 8 – Admin view of tickets**
- Later, add an admin page showing tickets per show:
  - List of all users and their tickets for a given show.

**Task 9 – Check-in app / QR scanner**
- Create a simple web page (or use a mobile app) that:
  - Opens the camera, scans the QR, sends `ticketCode` to `/api/tickets/validate`.
  - Shows “VALID / ALREADY USED / INVALID” with show details.

**Task 10 – Security & obfuscation**
- Optionally obfuscate the `ticketCode`:
  - Instead of plain `ticket:123;user:1;show:5`, use a random token stored in DB.
- Add rate-limiting or API keys for the validation endpoint used at the venue.

---

### How to Give Tasks to the Developer Version of Me

You can now assign tasks step by step like this:

1. **“Do QR_TICKETS_PLAN.md – Task 1 only.”**  
   → I’ll add the `tickets` table to `schema.sql` and, if you want, create the `/api/create-tickets-table` endpoint.

2. **“Now do Task 2.”**  
   → I’ll hook ticket creation into the purchase flow.

3. **“Now Task 3,”** and so on.

This way we build the QR ticket feature in small, controlled steps, and you can test each stage on your localhost before moving on.


