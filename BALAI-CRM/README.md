# BALAI Customer Relationship Management

Clean-start BALAI CRM interface for companies, people contacts, company profiles, deals, follow-up tasks, services, import/export backups, and browser-saved data. The interface uses BALAI branding with a cream, navy, and gold visual style.

The home page can switch between a BALAI-centered orbit map and a classy world map. Companies surround the logo by priority in the orbit view, and company markers appear on the world map by saved city/country location. The Contacts section can switch between people and company profiles, with both types editable. Company profiles support location, pictures, and priority.

## Open

Open `index.html` in a browser.

To open it from a launcher page, open `open-crm.html` and click **Open CRM in new tab**.

## Data

The CRM starts empty. Data is saved in browser local storage after edits. Use **Export** regularly to download a JSON backup and **Import** to restore it.

## Check

```sh
npm run check
```

The app has no runtime dependencies. The check command only verifies the JavaScript syntax with Node.
