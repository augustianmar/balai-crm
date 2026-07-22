# BALAI Customer Relationship Management

Clean-start BALAI CRM interface for companies, people contacts, company profiles, deals, follow-up tasks, services, import/export backups, and browser-saved data. The interface uses BALAI branding with a cream, navy, and gold visual style.

The home page can switch between a BALAI-centered orbit map and a poster-style global SVG world map without Antarctica. Each view includes a short explanation: the orbit map shows relationship priority around BALAI, and the world map shows company markers by saved city/country location. Company bubbles stay small by default, expand on hover, and can be manually dragged into place from the map options menu on either home view. The Contacts section can switch between people and company profiles, with both types editable. Company profiles support location, pictures, and priority.

## Open

Open `index.html` in a browser.

To open it from a launcher page, open `open-crm.html` and click **Open CRM in new tab**.

## Mobile

The CRM now has a responsive mobile layout. On phones, the sidebar becomes a bottom navigation bar, pages stack into single-column cards, contacts and company profiles open as mobile-friendly sections, forms behave like bottom sheets, and the Orbit/World maps resize for touch use. The app also includes a web manifest and service worker file for install-to-home-screen style use when hosted on GitHub Pages or another HTTPS host.

## Data

The CRM starts empty. Data is saved in browser local storage after edits. Use **Export** regularly to download a JSON backup and **Import** to restore it.

## Check

```sh
npm run check
```

The app has no runtime dependencies. The check command only verifies the JavaScript syntax with Node.
