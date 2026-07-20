# Bookumark Requirements

## Overview

Bookumark is a Firefox bookmark panel extension. It uses activity data, including visit counts and last-visited timestamps, to visually emphasize frequently accessed bookmarks.

## Implementation

- Implement Bookumark as a Firefox WebExtension add-on.
  - A user script cannot access privileged APIs such as `browser.bookmarks` and `browser.history`.
  - Support desktop Firefox only. Although sharing an implementation between desktop and mobile could be beneficial, avoiding a reduced mobile UI also avoids the associated increase in testing effort.
- Use Manifest V3.

## Technology Stack

- Language: TypeScript, using the same stack as YTBlocker.
- UI: Consider native Web Components as the primary approach.
  - Prefer a structure that extends familiar DOM manipulation because the project does not assume prior experience with frameworks such as React, Vue, or Svelte.
  - Design replaceable styling and docking points using Shadow DOM `::part()` selectors and CSS custom properties.
  - Avoid hard-coded styling. Provide componentized official CSS that can be replaced by themes.
  - Allow users to set a background image within the add-on independently of the Firefox theme.
  - Bookmark items remain draggable and can be repositioned after disabling the free-movement lock. Repositioning an item changes the active sort mode to `custom` and persists that selection.

## Functional Requirements

### Default Display Mode

- Open as a speed-dial interface by default.

### Filtering

- Filter bookmarks by tabs and attributes.
- Provide text search as the primary way to narrow down displayed bookmark icons.

### Sorting

Support ascending and descending order for each of the following criteria:

- Last-accessed timestamp
- Visit count
- Alphabetical order
- Date added

### View Types

Allow users to switch between five view types:

- Panel
- Icon
- Card
- Title
- Detail

#### Panel View

- When the selected sort criterion is scalable, such as visit count, reflect its value in the icon scale.
- When the selected criterion is not scalable, such as alphabetical order, display all items at a uniform size.

## Design Direction

- Prioritize a modern appearance.
- Use a design language suited to each view type:
  - **Icon-oriented views (Panel and Icon):** a Notion-like direction with card grids, generous spacing, and visual emphasis.
  - **Text-oriented views (Title and Detail):** a Raycast-like direction with dense command lists and emphasis on textual information.
  - Position the Card view between the icon-oriented and text-oriented approaches.

## Repository Information

- Description: `under construction - customizable bookmark firefox add-on`
