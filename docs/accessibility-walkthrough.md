# Accessibility walkthrough

This is the manual companion to the automated axe scans. Run it before a release
in at least one desktop pairing (NVDA + Chrome or Firefox) and one mobile pairing
(VoiceOver + Safari). axe remains the structural safety net; this walkthrough
checks intent, reading order, focus movement and announcements that rules engines
cannot infer.

## Test record

Record the date, app version, operating system, browser, assistive technology and
result for each run. For every failure, include the step, actual announcement or
focus target, expected result and issue link. Do not record account emails or
workout content from a real user.

## Keyboard-only

Start with a clean browser profile and keep the pointer unused throughout.

### Authentication gate

1. Load the app while signed out. The first Tab reaches the sign-in mode button
   and every visible control has a visible focus indicator.
2. Reach sign-up and sign-in with Tab, activate each with Enter or Space, and
   confirm that the selected state changes without moving focus unexpectedly.
3. Traverse Google, email, password, forgot-password and guest controls in visual
   order. Native validation and the recovery path must remain reachable.
4. Activate guest mode. The gate disappears without trapping focus in hidden
   content and the application becomes keyboard reachable.

### Guest reminder

1. Confirm that the reminder appears without taking focus or blocking the page.
2. Continue tabbing through the application, then activate **Not now**. The
   reminder disappears and the next Tab stays in the application.
3. Repeat from clean storage and activate **Create account**. The sign-up form
   opens and focus lands on its email field.

### Navigation and workout logging

1. Activate the menu ribbon. Focus moves to **Close menu** and cannot reach inert
   page content while the menu is open.
2. Choose **Log**, select a free workout, add an exercise and complete one set.
   Every input is reached in reading order and its visible label is announced.
3. Activate **Complete workout**. The save confirmation is announced and remains
   visible above the guest reminder.
4. Open the menu again, close it with its button and verify focus returns to the
   menu ribbon.

### History dialog

1. Open **History**, choose a recorded workout and verify focus enters the detail
   dialog at its close button.
2. Traverse the dialog in document order. Background controls must not receive
   focus.
3. Press Escape; the dialog closes and focus returns to the workout that opened
   it.

### Account and destructive confirmation

1. As a signed-in test account, open the menu and then the account card. Focus
   enters the account dialog and stays inside it.
2. Open account deletion. Focus lands on **Cancel**, the irreversible warning is
   available before the action buttons, and Escape closes the confirmation while
   deletion is idle.
3. Cancel; focus returns to the account surface. Do not complete deletion against
   a non-disposable account.

## Screen reader

Repeat the same flows with browse and focus modes, adding these checks:

1. Page title, one primary heading per view, landmarks and controls give a useful
   outline without requiring visual context.
2. The authentication gate exposes its current status, labels every field and
   announces errors once without reading hidden forms.
3. **Guest reminder:** after guest entry, the complete reminder is announced once
   as a polite update; it does not interrupt current speech and does not move the
   virtual cursor. Its labelled region is discoverable afterwards.
4. Menu expanded state, active mode buttons, current carousel item and pressed
   states are announced with state as well as name.
5. **Workout logging:** exercise headings, set controls, units and the completion
   action are unambiguous when heard without surrounding layout. The toast is
   announced once after saving.
6. **History dialog:** the dialog name and workout content are announced on entry;
   background content is unavailable until close; return focus is meaningful.
7. **Account and destructive confirmation:** dialog names, status messages and
   destructive action wording are announced before activation.

## Automated support

npm run test:unit protects the live-region attributes, stylesheet cascade,
breakpoint vocabulary and existence of this script. Playwright covers real focus
movement in the menu and dialogs, while the critical rendered views are scanned
with axe. A passing automated suite never replaces the two manual screen-reader
pairings above.
