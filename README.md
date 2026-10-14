# vezart

Ana Vezmar's portfolio — nine works on a single grid, click any one to see it
full size. Plain static files, no build step, no dependencies.

## Layout

```
index.html      the gallery — nine figures, each a thumbnail plus a caption
about.html      text page
contact.html    text page
style.css       one stylesheet for all three pages
script.js       one script: lightbox, paging, theme toggle
images/         the nine full plates
images/thumbs/  the nine thumbnails the pages actually load first
```

Links between pages are relative, so the folder works as it sits on disk and
the same way once it is served over HTTP.

## Running it

Open `index.html` directly, or serve the folder:

```powershell
python -m http.server 8000 --directory c:\Users\samsug\Documents\Portfolio
```

To reach it from other devices on the same network, bind to every interface
rather than to localhost, then open the address on the phone or laptop:

```powershell
python -m http.server 8000 --bind 0.0.0.0 --directory c:\Users\samsug\Documents\Portfolio
```

Get the address to share with:

```powershell
ipconfig | findstr "IPv4"
```

Then visit `http://<that-ip>:8000/` from the other device. The server stops
when the terminal is closed or with `Ctrl+C`; a public link needs a tunnel
(Cloudflare Tunnel, ngrok) or a real host.

## What the site does

- **Click-to-enlarge.** A thumbnail opens the full plate on a dark veil.
  Clicking the veil closes it.
- **Paging while open.** Arrow keys and horizontal touch swipes move the plate
  to the neighbouring work in grid order, wrapping at the ends. While the plate
  is open the page behind the veil is locked, so nothing scrolls under it.
- **Theme.** The site follows the OS colour scheme until the header button is
  used; after that the stored choice wins. The choice is applied in an inline
  script before first paint, so a stored theme cannot flash the wrong palette
  while `script.js` loads.
- **Reduced motion.** The entrance stagger and the plate's scale-in are dropped
  when the visitor asks for it.

## Accessibility work

Keyboard focus, which the site had largely left to the browser:

- `style.css` gives every focusable thing on every page the same ring —
  2px at a 3px offset — instead of the browser's default. That covers the
  wordmark, the nav, the gallery images and the links on the text pages.
- The wordmark's hover only changed its colour, which sits just over 2:1
  against the ink it replaces; under the 3:1 a focus indicator needs against
  the unfocused state. The ring was added beside the colour change, not
  traded for it.
- The open veil is focusable, so it needs an indicator. The browser would
  draw one at the viewport edge, against the bezel where nobody is looking,
  so the ring lives on the plate instead. Its colour, `--veil-ring`, is
  deliberately outside the palette blocks: the veil is near-black in either
  theme and the light theme's accent clears 3:1 against it by too little,
  while one fixed light ink answers both veils at 13:1 or better.

The veil as a dialog, in `script.js`:

- It takes `role="dialog"` and `aria-modal="true"` while open, and is named
  by the work's own `figcaption`, so assistive tech announces the work rather
  than an unnamed overlay.
- While closed it is `aria-hidden` and not focusable; while open it is
  reachable and carries `tabindex="0"`.
- Closing with `Escape` returns focus to the thumbnail that opened the plate
  rather than leaving the visitor at the top of the page.
- Space is suppressed while the plate is open, since it would otherwise
  scroll the page under the veil.

`index.html` also gained Open Graph and canonical tags. Their URLs still use
the `EXAMPLE.com` placeholder — they need the real domain before the page is
shared anywhere.

## Still open

- Replace the `EXAMPLE.com` placeholder in the OG and canonical tags.
- No browser accessibility validation has been run; the contrast and focus
  figures above are computed, not measured.
- No public host or tunnel is set up yet.

