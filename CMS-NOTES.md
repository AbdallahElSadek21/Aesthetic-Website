# CMS Notes

This website now has a simple local Content Management System at `/cms.html`.

Important rule: whenever a new section, dropdown, product field, banner, or content block is added to the main website, add the matching editable field in the CMS too. The website and CMS must stay paired so non-technical users can manage the site without editing code.

Run the system with:

```bash
npm start
```

Then open:

- Website: `http://127.0.0.1:8010/`
- CMS: `http://127.0.0.1:8010/cms.html`

The local CMS password is stored in `CMS-PASSWORD.txt`. The server creates this file automatically the first time it starts. To change the password, replace the first line in that file and restart the CMS server.

Editor workflow:

- Save draft keeps changes out of the live website.
- Preview opens the website using the current CMS changes from your browser.
- Publish live validates the content, updates the website files, and clears the saved draft.

Safety notes:

- Product IDs must be unique.
- Links must stay inside this website, such as `dermal-fillers.html?filter=skin-boosters` or `#categories`.
- Uploaded and selected images must be PNG, JPG, GIF, or WebP files inside `assets/images`, `assets/uploads`, or `Logo`.
- Published files are backed up in `assets/data/backups`.
