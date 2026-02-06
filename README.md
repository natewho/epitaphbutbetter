# Delaware Court of Chancery Opinion Watch

This is a simple, single-page website. You can run it locally in two easy ways.

## Option 1: Open the file directly (simplest)

1. Open the folder in your file explorer.
2. Double-click `index.html`.

Your browser will open the page.

## Option 2: Run a tiny local web server (recommended)

This keeps the page running the same way it would on a real website.

### If you have Python installed

```bash
cd /workspace/epitaphbutbetter
python -m http.server 8000
```

Then open your browser and go to:

```
http://localhost:8000
```

### If you do **not** have Python installed

You can still use Option 1 above by double-clicking `index.html`.

## What you should see

- A “Refresh opinions” button at the top.
- Search, category, and sort controls.
- A list of recent opinions (or sample ones if the court site blocks access).
