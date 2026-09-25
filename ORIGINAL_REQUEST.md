# Original User Request

## 2026-09-22T21:49:21Z

This is a single self-contained fix; keep it small and focused.

Refactoring the screen/telão layout of an interactive EV charger clicker game to add a new 256×512px portrait layout for a physical LED panel at an event booth, while keeping the existing 16:9 landscape layout intact.

Working directory: /Users/gabrielgenaro/Developer/Romasol/Bateria
Integrity mode: demo

## Context

The project is a Node.js + Socket.io interactive game displayed on a screen at a trade show booth. Visitors scan a QR code, tap their phone to "charge" a virtual EV battery, and the score is displayed in real-time on a telão (large screen).

### Current Architecture
- **Server**: `server.js` — Express + Socket.io + SQLite. Serves `/screen` route for the telão.
- **Screen frontend**: `public/screen/` — `index.html`, `style.css`, `app.js`. Currently designed for 16:9 landscape (1672×941 aspect ratio).
- **Background image**: `public/assets/ev-charger.png` — A 16:9 illustration of an EV charger with a white display area (canvas) where game content is rendered, and a Romasol logo below the display.
- **Game display area ("device-display")**: Positioned via CSS (`left: 40.07%; top: 13.28%; width: 18.84%; height: 34.11%`) to overlay the white screen area in the charger image. Has 3 states: idle (QR code), playing (battery animation + timer), result (final score + prize).
- **Ranking panel**: Currently positioned at `top: 50%; left: 15%` over the background image.

### Reference image
The user uploaded a reference image showing the desired portrait crop: the charger centered, the white display/canvas at the top half, the Romasol logo below it, and the charging plug/cable at the bottom. The ranking should appear below the Romasol logo, overlaid on the image with a semi-transparent background.

Reference image path: `/Users/gabrielgenaro/.gemini/antigravity/brain/f432f327-10b9-49ea-8cf7-74c89bdd12b1/.user_uploaded/media_1790109158692.png`

## Requirements

### R1. New Portrait Panel Layout (256×512px)

Add a new route `/panel` (and alias `/painel`) that serves a portrait-oriented layout optimized for a 256×512px physical LED panel. The layout must:
- Use the existing `ev-charger.png` image, cropped/repositioned via CSS to show only the charger body in portrait orientation (as shown in the reference image).
- Position the game display area (QR code / gameplay / results) to align with the white screen area of the cropped charger image.
- Display the TOP 5 ranking scoreboard **below the Romasol logo** (which is below the white screen area in the charger image), overlaid on the background with a semi-transparent background.
- The root viewport must be exactly 256×512px with no scrolling. All content must fit within these dimensions.
- All three display states (idle, playing, result) must be fully visible and functional within the display area.
- Real-time Socket.io connectivity must work identically to the existing `/screen` route.

### R2. Preserve Existing Landscape Layout

The existing `/screen` route and its 16:9 landscape layout must remain completely unchanged and fully functional. No modifications to existing files in `public/screen/` unless absolutely necessary for shared logic.

### R3. Code Organization

The new panel layout should reuse the existing `app.js` game logic (Socket.io events, battery color interpolation, countdown, etc.) to avoid code duplication. The new layout only needs its own HTML and CSS files. If the JS logic needs to be shared, extract it to a common module or simply reference the existing `app.js` from the new HTML.

## Acceptance Criteria

### Layout & Visual
- [ ] Navigating to `/panel` serves a page with a 256×512px viewport that shows the charger in portrait orientation
- [ ] The game canvas (white display area) is correctly aligned over the charger's screen area in the cropped image
- [ ] The Romasol logo is visible below the game canvas
- [ ] The TOP 5 ranking is displayed below the Romasol logo with a semi-transparent background
- [ ] No scrollbars appear; all content fits within 256×512px
- [ ] All text is legible at the 256px width (font sizes appropriate for a physical LED panel)

### Functionality
- [ ] The idle state shows a QR code and "ESCANEIE PARA JOGAR" text
- [ ] The playing state shows the battery animation, countdown timer, and player name
- [ ] The result state shows final percentage, prize info, and instructions
- [ ] Real-time updates via Socket.io work identically to `/screen`
- [ ] The ranking updates in real-time when a game ends

### Preservation
- [ ] The existing `/screen` route continues to work with the original 16:9 landscape layout
- [ ] The existing `/screen` files (`index.html`, `style.css`, `app.js`) are either unchanged or minimally modified
- [ ] Server routes `/`, `/screen`, `/telao`, `/mobile`, `/celular` all continue to work as before

## Verification Plan

### Automated Tests
- Run `node server.js` and verify the server starts without errors
- Verify HTTP GET to `/panel` returns 200
- Verify HTTP GET to `/painel` redirects to `/panel`
- Verify HTTP GET to `/screen` still returns 200
- Verify HTTP GET to `/mobile` still returns 200

### Manual Verification
- Open `/panel` in a browser window sized to 256×512 and visually confirm:
  - The charger is displayed in portrait, centered
  - The game canvas aligns with the white display area
  - The ranking appears below the Romasol logo
  - No content overflows or requires scrolling
