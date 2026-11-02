# aykutdagg.github.io

Portfolio of Aykut Dağ, architectural and computational designer.

The home page is a live *Physarum polycephalum* simulation (agent-based, after Jones 2010) running on WebGL2. Projects are food sources, the cursor disturbs the network and the organism rebuilds itself. Plain HTML, CSS and JavaScript, no build step.

Run locally: `python -m http.server 8765` in this folder, then open http://127.0.0.1:8765.

Before publishing, run `python stamp.py` so changed scripts and styles get new URLs.
Add `?debug` to the address for a diagnosis readout (frame rate, quality tier, errors).
