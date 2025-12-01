# Project Management Plan - THE SPECTATOR Website

**Project Manager:** AI Assistant  
**Date Created:** 2025-01-27  
**Status:** Planning Phase - NOT STARTED

---

## Overview

This document outlines all planned features and tasks for the THE SPECTATOR website. Tasks are organized by feature area with detailed requirements, database needs, and implementation notes.

**⚠️ IMPORTANT: This is a planning document. No code changes should be made until tasks are explicitly approved and started.**

---

## DISCOGRAPHY

### Task 1: Display Song List
**Priority:** High  
**Status:** Not Started

**Requirements:**
- Add song list below the "AMAO" album picture
- Display songs vertically in order
- Use capital letters for song titles
- Use Roman numerals (I, II, III, etc.) instead of Arabic numbers
- Format: `I) SONG TITLE (duration)`

**Song List (in order):**
1. THE SPECTATOR (4:30)
2. THE CAVE (6:21)
3. INDULGENCE (9:01)
4. STRINGS (3:56)
5. PILATE'S COURT (11:37)
6. GETHSEMANE (3:00)
7. OUROBOROS (6:56)
8. DELIRIUM (8:02)
9. SAMSARA (7:31)
10. INFERNIAC (6:20)
11. MYALGIC ENCEPHALOMYELITIS (2:24)
12. SATORI (3:04)
13. AMAO (13:00)

**Design Notes:**
- Show song duration on the right side of song titles
- Make duration text very small
- Use gray or muted color so it doesn't stand out

**Database Requirements:**
- New table: `songs`
  - `id` (INT, PRIMARY KEY)
  - `album_id` (INT, FK to albums)
  - `title` (TEXT)
  - `duration` (TEXT, e.g., "4:30")
  - `track_number` (INT, for ordering)

---

### Task 2: Favorite Song Feature
**Priority:** Medium  
**Status:** Not Started

**Requirements:**
- Users can "like" a song in the discography page
- Liked songs should be highlighted in green
- Store like status in database

**Database Requirements:**
- New table: `user_song_likes`
  - `user_id` (INT, FK to users)
  - `song_id` (INT, FK to songs)
  - `liked_at` (TIMESTAMPTZ)
  - PRIMARY KEY (user_id, song_id)

**API Endpoints Needed:**
- `POST /api/songs/:songId/like` - Add like
- `DELETE /api/songs/:songId/like` - Remove like
- `GET /api/songs/:songId/liked` - Check if user liked song
- `GET /api/users/:userId/liked-songs` - Get all liked songs for user

---

### Task 3: Unlike Song Feature
**Priority:** Medium  
**Status:** Not Started

**Requirements:**
- Users can unlike a song (remove the like)
- When unliked, green highlight is removed
- Store unliked status in database (removal from `user_song_likes` table)

**Implementation Notes:**
- This is essentially the reverse of Task 2
- Use DELETE endpoint to remove entry from `user_song_likes` table

---

### Task 4: Ratings With Comments System
**Priority:** High  
**Status:** Not Started

**Requirements:**
- Users can click on a song to open rating/comment interface
- Rating system: 1-5 stars
- Users can write comments
- Ratings and comments are visible to all users
- Display average rating (calculated from all user ratings)
- Example: If one user gives 5 stars and another gives 2 stars, display 3.5 stars

**Database Requirements:**
- New table: `song_ratings`
  - `id` (INT, PRIMARY KEY)
  - `user_id` (INT, FK to users)
  - `song_id` (INT, FK to songs)
  - `rating` (INT, 1-5)
  - `comment` (TEXT, nullable)
  - `rated_at` (TIMESTAMPTZ)
  - UNIQUE constraint on (user_id, song_id) - one rating per user per song

**API Endpoints Needed:**
- `POST /api/songs/:songId/ratings` - Submit rating/comment
- `GET /api/songs/:songId/ratings` - Get all ratings/comments for a song
- `GET /api/songs/:songId/rating-average` - Get average rating

**UI Requirements:**
- Clickable song opens modal/popup with:
  - Star rating selector (1-5)
  - Comment text area
  - Submit button
  - Display previous comments below
  - Display average rating prominently

---

## ABOUT

### Task 1: Social Media Buttons
**Priority:** Low  
**Status:** Not Started

**Requirements:**
- Add social media buttons in the About section
- "YouTube" button → links to: `https://youtu.be/dQw4w9WgXcQ?si=aTecWSyUQJ0WyPXS`
- "Instagram" button → links to: `https://www.instagram.com/officialrickastley?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==`

**Implementation Notes:**
- Simple anchor tags with `target="_blank"` for external links
- Style buttons to match the dark/cryptic theme

---

## SHOWS

### Task 1: Search Bar
**Priority:** Medium  
**Status:** Not Started

**Requirements:**
- Add search bar to Shows page
- Users can search for shows by name (city or venue name)
- Filter shows in real-time as user types

**Implementation Notes:**
- Frontend-only filtering (no backend endpoint needed initially)
- Search should be case-insensitive
- Search by city name or venue name

---

### Task 2: Sort Options
**Priority:** Low  
**Status:** Not Started

**Requirements:**
- Add sort dropdown/filter to Shows page
- Sort by: Price (low → high)

**Implementation Notes:**
- Note: Shows don't currently have prices. Need to add price field to shows table or clarify requirement.

**Database Requirements:**
- Add `price` column to `shows` table (DECIMAL or INT)

---

### Task 3: Show Availability Counter
**Priority:** High  
**Status:** Completed

**Requirements:**
- Display availability for each show:
  - "15 seats left" (when seats available)
  - "Sold out" (when no seats available)
- Initial state:
  - All shows start with 30 spots EXCEPT the first show (2025-02-28T20:00:00.000Z, Berlin — Unknown Hall) which should be "Sold out"
- When a user "buys" a ticket, decrease the counter
- Other users should see updated count (e.g., 29 instead of 30)
- If sold out, other users cannot purchase

**Database Requirements:**
- Add `available_seats` column to `shows` table (INT, default 30)
- Update `available_seats` when ticket is purchased
- Add constraint: `available_seats >= 0`

**API Endpoints Needed:**
- `GET /api/shows` - Include `available_seats` in response
- `POST /api/shows/:showId/purchase` - Decrease `available_seats` by 1
- Check if `available_seats > 0` before allowing purchase

---

### Task 4: Buying System for Shows
**Priority:** High  
**Status:** Completed

**Requirements:**
- Add "Get" button on each show
- When clicked:
  - Button turns green
  - Button text changes to "Going"
  - Decrease available seats counter (see Task 3)
- Store purchase in database

**Database Requirements:**
- New table: `user_show_purchases` (or extend `user_show_reservations`)
  - `user_id` (INT, FK to users)
  - `show_id` (INT, FK to shows)
  - `purchased_at` (TIMESTAMPTZ)
  - PRIMARY KEY (user_id, show_id)

**API Endpoints Needed:**
- `POST /api/shows/:showId/purchase` - Purchase ticket (decrease seats, add to purchases)
- `GET /api/users/:userId/purchased-shows` - Get all shows user purchased
- `DELETE /api/shows/:showId/purchase` - Cancel purchase (optional, increase seats back)

**UI Requirements:**
- Button states:
  - Default: "Get" (normal color)
  - Purchased: "Going" (green)
  - Disabled if sold out

---

## MERCH

### Task 1: Search Bar
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- Add search bar to Merch page
- Users can search for merch items by name
- Filter items in real-time as user types

**Implementation Notes:**
- Frontend-only filtering
- Case-insensitive search

---

### Task 2: Filters
**Priority:** Low  
**Status:** Not Started

**Requirements:**
- Add filter options for merch items
- (Specific filter types to be determined - may be covered in Task 4)

---

### Task 3: Expand Merch Items
**Priority:** High  
**Status:** Completed

**Requirements:**
- Currently: 3 shirts, 3 vinyls, 3 guitars
- Expand to show variations:

**Shirts (3 items):**
- Blue shirt
- Black shirt
- Red shirt

**Guitars (3 items):**
1. Custom Fender Stratocaster
2. Custom Fender Telecaster
3. Custom Gibson Les Paul

**Vinyls (3 items):**
1. AMAO
2. AMAO disk 2
3. AMAO live at Bassiani

**Database Requirements:**
- Update `merch` table to include:
  - `name` (TEXT) - full name of item
  - `type` (TEXT) - "shirt", "vinyl", "guitar"
  - `variant` (TEXT) - color for shirts, model name for guitars, album name for vinyls
- Or create separate entries for each variant

---

### Task 4: Update Prices and Sort Options
**Priority:** High  
**Status:** Completed

**Requirements:**
- Update prices:
  - Blue shirt: $30 ✓
  - Custom Fender Stratocaster: $1400 ✓
  - AMAO live at Bassiani: $68 ✓
- Add sort dropdown/filter:
  - Sort by: Price (low → high) ✓

**Database Requirements:**
- Update `price` column in `merch` table for specific items ✓

**Implementation Notes:**
- Frontend sorting or backend endpoint for sorted results ✓

---

### Task 5: Add to Wishlist
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- If user is logged in, show star icon on each merch item
- Clicking star saves item to wishlist
- Visual indication when item is in wishlist (filled star)

**Database Requirements:**
- New table: `user_merch_wishlist`
  - `user_id` (INT, FK to users)
  - `merch_id` (INT, FK to merch)
  - `added_at` (TIMESTAMPTZ)
  - PRIMARY KEY (user_id, merch_id)

**API Endpoints Needed:**
- `POST /api/merch/:merchId/wishlist` - Add to wishlist
- `DELETE /api/merch/:merchId/wishlist` - Remove from wishlist
- `GET /api/users/:userId/wishlist` - Get all wishlist items

---

### Task 6: Show Availability Counter
**Priority:** High  
**Status:** Completed

**Requirements:**
- Display availability for each merch item:
  - "15 left" (when items available)
  - "Sold out" (when no items available)
- Initial state:
  - All items start with 20 items EXCEPT "AMAO Live At Bassiani" which should be "Sold out"
- When a user "buys" an item, decrease the counter
- Other users should see updated count (e.g., 19 instead of 20)
- If sold out, other users cannot purchase

**Database Requirements:**
- Add `available_quantity` column to `merch` table (INT, default 20)
- Update `available_quantity` when item is purchased
- Add constraint: `available_quantity >= 0`

**API Endpoints Needed:**
- `GET /api/merch` - Include `available_quantity` in response
- `POST /api/merch/:merchId/purchase` - Decrease `available_quantity` by 1
- Check if `available_quantity > 0` before allowing purchase

---

### Task 7: Buying System for Merch
**Priority:** High  
**Status:** Completed

**Requirements:**
- Add "Get" button on each merch item
- When clicked:
  - Button turns green
  - Button text changes to "Arriving soon"
  - Decrease available quantity counter (see Task 6)
- Store purchase in database

**Database Requirements:**
- New table: `user_merch_purchases`
  - `user_id` (INT, FK to users)
  - `merch_id` (INT, FK to merch)
  - `purchased_at` (TIMESTAMPTZ)
  - PRIMARY KEY (user_id, merch_id)

**API Endpoints Needed:**
- `POST /api/merch/:merchId/purchase` - Purchase item (decrease quantity, add to purchases)
- `GET /api/users/:userId/purchased-merch` - Get all merch user purchased
- `DELETE /api/merch/:merchId/purchase` - Cancel purchase (optional, increase quantity back)

**UI Requirements:**
- Button states:
  - Default: "Get" (normal color)
  - Purchased: "Arriving soon" (green)
  - Disabled if sold out

---

### Task 8: Discount Codes
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- Add "Promo Code" input bar in merch page
- If user enters "SPECTATOR10":
  - Display "successful" message
  - All prices decrease by 10%
- Discount applies to all displayed prices

**Implementation Notes:**
- Frontend calculation (no backend needed initially)
- Store applied discount in state
- Recalculate all prices when discount is applied
- Display original price with strikethrough and discounted price

**Database Requirements (Optional - for tracking):**
- New table: `promo_codes`
  - `code` (TEXT, PRIMARY KEY)
  - `discount_percent` (INT)
  - `active` (BOOLEAN)

---

## GENERAL

### Task 1: Scroll to Top Button
**Priority:** Low  
**Status:** Completed

**Requirements:**
- Add small arrow button that appears when user scrolls down
- Clicking button scrolls page back to top
- Button should be visible only after scrolling down a certain amount

**Implementation Notes:**
- Use `window.scrollY` to detect scroll position
- Smooth scroll animation
- Position: fixed, bottom-right corner

---

### Task 2: Animated Loading Screen
**Priority:** Low  
**Status:** Completed

**Requirements:**
- Show loading spinner or AMAO logo while pages load
- Display during initial page load and API calls

**Implementation Notes:**
- Use React state to track loading state
- Show spinner/logo overlay during loading
- Hide when content is ready

---

### Task 3: Settings Icon
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- Add settings icon in top right corner
- Icon should be visible on main page (when logged in or not)

**Implementation Notes:**
- Position: top-right, next to profile icon (if logged in)
- Click opens settings menu/modal

---

### Task 4: Light Mode / Dark Mode Toggle
**Priority:** High  
**Status:** Completed

**Requirements:**
- In settings, add switch for Light Mode/Dark Mode
- Dark mode = current design
- Create new light mode design
- When user signs out, mode preference is remembered
- When user logs back in, previous mode is restored
- Store preference in database

**Database Requirements:**
- Add `theme_preference` column to `users` table
  - `theme_preference` (TEXT) - "light" or "dark", default "dark"

**API Endpoints Needed:**
- `PUT /api/users/:userId/theme` - Update theme preference
- `GET /api/users/:userId/theme` - Get theme preference (or include in user object)

**Implementation Notes:**
- Use CSS variables or theme context in React
- Apply theme class to root element
- Persist theme in localStorage as backup

---

## ACCOUNT

### Task 1: Sign Out
**Priority:** High  
**Status:** Completed

**Requirements:**
- Add "Sign Out" button/option
- When clicked, user is logged out
- Redirect to login page or main page (not logged in state)

**Implementation Notes:**
- Clear `currentUser` state
- Clear `isLoggedIn` state
- Optionally clear localStorage/sessionStorage

---

### Task 2: Profile Editing - Username
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- When clicking profile icon, show options:
  - "Add username"
  - "Change username"

**Add Username:**
- If user is logged in and clicks "Add username":
  - Show input bar
  - User can type anything
  - Username displays next to profile icon after saving
  - Store in database with user_id
  - Persist across logins

**Change Username:**
- If user is logged in and clicks "Change username":
  - Show input bar with previous username pre-filled
  - User can delete and type new username
  - New username displays next to profile icon after saving
  - Update in database

**Database Requirements:**
- Add `username` column to `users` table (TEXT, nullable)

**API Endpoints Needed:**
- `PUT /api/users/:userId/username` - Update username
- `GET /api/users/:userId` - Include username in response

**UI Requirements:**
- Profile icon click opens dropdown/modal with:
  - "Add username" or "Change username" (depending on if username exists)
  - Input field
  - Save button
- Display username next to profile icon in header

---

### Task 3: Delete Account Button
**Priority:** Medium  
**Status:** Completed

**Requirements:**
- Add "Delete Account" button in account settings
- When clicked, show confirmation popup: "Are you sure?"
- If confirmed, remove user from database
- Log user out and redirect

**Database Requirements:**
- Use `DELETE` on `users` table
- Ensure CASCADE deletes work for related tables:
  - `user_show_reservations`
  - `user_show_purchases`
  - `user_merch_purchases`
  - `user_merch_wishlist`
  - `user_song_likes`
  - `song_ratings`

**API Endpoints Needed:**
- `DELETE /api/users/:userId` - Delete user account

**Security Notes:**
- Verify user is authenticated
- Verify user can only delete their own account

---

### Task 4: Show/Hide Password
**Priority:** Low  
**Status:** Completed

**Requirements:**
- Add eye icon in login/signup password fields
- When eye icon is clicked:
  - Password characters show as "*" (masked)
  - Toggle between visible and masked
- Default: password is masked

**Implementation Notes:**
- Use `type="password"` for masked, `type="text"` for visible
- Toggle between the two types on icon click
- Icon changes (eye open/closed) to indicate state

---

## MAIN PAGE

### Task 1: Visitor Counter
**Priority:** Low  
**Status:** Completed

**Requirements:**
- Add small visitor counter under "THE SPECTATOR" text
- Display: "523 people have visited this page"
- Store count in database
- Every time someone visits the website, increase count by 1

**Database Requirements:**
- New table: `visitor_counter`
  - `id` (INT, PRIMARY KEY, always 1)
  - `count` (INT, default 0)
- Or use a single row that gets updated

**API Endpoints Needed:**
- `POST /api/visitor/increment` - Increment counter (called on page load)
- `GET /api/visitor/count` - Get current count

**Implementation Notes:**
- Call increment endpoint on main page load (useEffect)
- Display count from API response
- Consider debouncing to prevent multiple increments on refresh

---

## Database Schema Summary

### New Tables Needed:
1. `songs` - Song listings
2. `user_song_likes` - User song favorites
3. `song_ratings` - Song ratings and comments
4. `user_show_purchases` - Show ticket purchases
5. `user_merch_purchases` - Merch item purchases
6. `user_merch_wishlist` - Merch wishlist
7. `visitor_counter` - Page visit counter
8. `promo_codes` (optional) - Discount codes

### Tables to Modify:
1. `users` - Add `username`, `theme_preference`
2. `shows` - Add `price`, `available_seats`
3. `merch` - Add `available_quantity`, update items and prices

---

## Implementation Priority

### Phase 1 (Critical):
- DISCOGRAPHY Task 1 (Song List)
- SHOWS Task 3 & 4 (Availability & Buying)
- MERCH Task 3, 4, 6 & 7 (Items, Prices, Availability & Buying)
- ACCOUNT Task 1 (Sign Out)
- GENERAL Task 4 (Light/Dark Mode)

### Phase 2 (Important):
- DISCOGRAPHY Task 2, 3, 4 (Favorites & Ratings)
- MERCH Task 5 & 8 (Wishlist & Discount Codes)
- ACCOUNT Task 2 (Username)
- MAIN PAGE Task 1 (Visitor Counter)

### Phase 3 (Nice to Have):
- SHOWS Task 1 & 2 (Search & Sort)
- MERCH Task 1 & 2 (Search & Filters)
- GENERAL Task 1, 2, 3 (Scroll to Top, Loading, Settings Icon)
- ACCOUNT Task 3 & 4 (Delete Account, Show/Hide Password)
- ABOUT Task 1 (Social Media Buttons)

---

## Notes

- All tasks should be implemented one at a time
- Test each feature before moving to the next
- Update this document as tasks are completed
- Database migrations should be created for all schema changes
- API endpoints should follow RESTful conventions
- Frontend should handle loading states and errors gracefully

---

**Last Updated:** 2025-01-27  
**Next Review:** After Phase 1 completion

