# BALAI Customer Relationship Management — Superior Final

A private, browser-based CRM for BALAI with a refined dark neo-soul and
Japanese editorial interface.

## What is included

- Companies and people contacts
- Deals and follow-up tasks
- Services and product templates
- Orbit and world relationship maps
- Import and export backups
- Automatic local recovery snapshots
- Undo after deleting contacts or companies
- Responsive desktop and mobile layouts
- Latest BALAI vector emblem

## Data preservation

The application continues to use:

`balai-crm-store-v4`

Replacing the application files on the same domain and path does not erase
existing browser-saved contacts. Export a JSON backup before deployment as
normal good practice.

## Launch

Open `index.html` through your web host. `balai-crm-standalone.html` is also
included for a single-file deployment.

## Quality checks

- JavaScript syntax check passed
- Desktop home, world map and contacts rendered without runtime errors
- Mobile home, world map and contacts rendered without runtime errors
- Add-contact workflow tested
- Modal Escape behaviour tested
- Delete and Undo workflow tested
- Search keyboard shortcut tested