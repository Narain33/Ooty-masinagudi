# Ooty & Masinagudi

A photo and video journal from two days in the Nilgiris with Mom, 22–23 November 2026.
It is a plain static website (HTML, CSS and JavaScript, no build step), so it runs on GitHub Pages as it is.

## What's inside

```
index.html          the page
assets/style.css    design (colours, type, layout)
assets/app.js       builds the timeline, the winding road, the filter and the full-screen viewer
assets/trip.js      ALL the text and the list of photos/videos: edit this one to change captions
assets/fonts/       Young Serif + Figtree (self-hosted, SIL Open Font License)
media/photos/       full-size photos (WebP, 2000px, location data removed)
media/thumbs/       small photos used in the grid
media/videos/       videos compressed to 720p MP4
media/posters/      a still frame for each video
```

## Change the text

Open `assets/trip.js`. Each day has a `date` and `summary`; each moment has a `time`, `title` and `caption`.
Change the words, save, and refresh the page. To remove a photo, delete its `{ ... }` entry from `items`.

## Preview on your computer

```bash
cd website
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` by double-clicking also works in most browsers.

## Put it on GitHub Pages

1. Go to https://github.com/new and create a repository, for example `ooty-masinagudi-trip`.
   Leave "Add a README" unticked. On a free GitHub account the repository must be **Public** for Pages to work.
2. In this folder, connect it and push (replace `YOUR-USERNAME`):

   ```bash
   git remote add origin git@github.com:YOUR-USERNAME/ooty-masinagudi-trip.git
   git push -u origin main
   ```

3. On GitHub open the repository, go to **Settings → Pages**, and under "Build and deployment" choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at
   `https://YOUR-USERNAME.github.io/ooty-masinagudi-trip/`.

The whole site is about 220 MB. The largest file is 35 MB, well under GitHub's 100 MB per-file limit.

> A public Pages site can be opened by anyone who has the link. Share the link only with people you want to see the photos.
