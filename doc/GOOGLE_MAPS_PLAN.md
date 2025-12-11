# Google Maps Integration for Shows - Project Plan

## Overview
Add Google Maps integration to shows so users can view the location of each show on Google Maps.

## Technical Approach
**Simplest Implementation:**
- Add a `location` TEXT field to the `shows` table
- Store full address as a string (e.g., "123 Main Street, New York, NY 10001")
- Use Google Maps search URL format: `https://www.google.com/maps/search/?api=1&query={encoded_address}`
- No API keys needed - just direct links to Google Maps

## Task Breakdown

### Task 1: Database Schema
**Description:** Add location field to shows table
- Add `location` TEXT column to `shows` table
- Make it optional (nullable) so existing shows don't break
- Auto-create column on backend server startup

**Acceptance Criteria:**
- Column exists in database
- Column is nullable
- Backend automatically creates column on startup

---

### Task 2: Backend API - GET Shows
**Description:** Update GET /api/shows to return location field
- Modify the SELECT query to include `location` field
- Return it as `location` in the JSON response

**Acceptance Criteria:**
- GET /api/shows returns location field for each show
- Location is null/undefined for shows without location

---

### Task 3: Backend API - Create Show
**Description:** Update POST /api/admin/shows to accept location
- Add `location` to the request body parameters
- Save location to database when creating new show
- Location is optional

**Acceptance Criteria:**
- Can create show with location
- Can create show without location (null)
- Location is saved correctly

---

### Task 4: Backend API - Update Show
**Description:** Update PUT /api/admin/shows/:showId to allow editing location
- Add `location` to the update fields
- Allow setting location to null/empty to remove it
- Location update works independently of other fields

**Acceptance Criteria:**
- Can update show location
- Can remove location (set to null)
- Location update doesn't affect other fields

---

### Task 5: Frontend - Admin Create Show Form
**Description:** Add location input field to "Add Show" form
- Add text input field labeled "Location" or "Address"
- Place it after venue field
- Make it optional (not required)
- Style it to match existing form inputs

**Acceptance Criteria:**
- Location field appears in create show form
- Can enter address text
- Field is optional
- Matches existing form styling

---

### Task 6: Frontend - Admin Edit Show Form
**Description:** Add location input field to "Edit Show" inline form
- Add location input to the edit form
- Pre-populate with existing location value
- Allow clearing location (empty string)
- Style consistently with other edit fields

**Acceptance Criteria:**
- Location field appears when editing show
- Shows current location value
- Can update location
- Can clear location

---

### Task 7: Frontend - "See Location" Button
**Description:** Add "See Location" button to each show display
- Add button next to each show item
- Only show button if show has a location
- Button text: "See Location" or similar
- Style to match existing buttons (dark theme)

**Acceptance Criteria:**
- Button appears for shows with location
- Button hidden for shows without location
- Button styling matches site theme

---

### Task 8: Frontend - Google Maps URL Generation
**Description:** Implement function to generate Google Maps URL and open it
- Create helper function to encode address for URL
- Format: `https://www.google.com/maps/search/?api=1&query={encoded_address}`
- Open URL in new tab/window when button clicked
- Handle special characters in address (URL encoding)

**Acceptance Criteria:**
- Clicking button opens Google Maps in new tab
- Location is correctly pinned on map
- Address with special characters works correctly
- URL is properly encoded

---

### Task 9: Testing & Edge Cases
**Description:** Test various scenarios
- Test with full address
- Test with partial address
- Test with special characters
- Test with no location (button hidden)
- Test creating/editing shows with and without location

**Acceptance Criteria:**
- All scenarios work correctly
- No errors in console
- Google Maps opens correctly for all address formats

---

## Implementation Notes

### Google Maps URL Format
- **Search Query (Recommended):** `https://www.google.com/maps/search/?api=1&query={encoded_address}`
- This works with any address format and Google will geocode it
- No API key required
- Opens in user's default browser

### Location Field Format
- Accept any text string
- Examples:
  - "Madison Square Garden, New York, NY"
  - "123 Main Street, Los Angeles, CA 90001"
  - "The O2 Arena, London, UK"
- Let Google Maps handle the geocoding

### Database Column
- Name: `location`
- Type: `TEXT`
- Nullable: `YES` (optional field)

---

## Task Order
1. Task 1: Database Schema
2. Task 2: Backend API - GET Shows
3. Task 3: Backend API - Create Show
4. Task 4: Backend API - Update Show
5. Task 5: Frontend - Admin Create Show Form
6. Task 6: Frontend - Admin Edit Show Form
7. Task 7: Frontend - "See Location" Button
8. Task 8: Frontend - Google Maps URL Generation
9. Task 9: Testing & Edge Cases

---

## Ready for Implementation
Each task can be implemented independently. Start with Task 1 and proceed sequentially.

