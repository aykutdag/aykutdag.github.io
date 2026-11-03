# aykutdag.github.io

Portfolio of Aykut Dağ, architectural and computational designer.

The home page is a live *Physarum polycephalum* simulation (agent-based, after Jones 2010) running on WebGL2. Projects are food sources, the cursor disturbs the network and the organism rebuilds itself. Plain HTML, CSS and JavaScript; project data lives in `projects.js`.

Run locally: `python -m http.server 8765` in this folder, then open http://127.0.0.1:8765.

Before publishing, run `python tools/build.py` (needs Node and Pillow). It stamps changed scripts and styles with new URLs (`stamp.py`), writes one page per project at `projects/<slug>/` (own title, description, share image and text for search engines), `sitemap.xml` and the preview images in `img/thumb/`. Commit the generated files with the rest.
Check layouts with `python tools/check_layout.py` (overlaps, off-screen elements and overflow at 11 screen sizes).
Add `?debug` to the address for a diagnosis readout (frame rate, quality tier, errors).

After changing the field's look or the colony positions, regenerate the still posters (`python tools/make_posters.py`, with the local server running) and the share image and icons (`python tools/make_images.py`).
