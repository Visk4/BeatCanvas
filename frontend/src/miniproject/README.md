BeatCanvas MiniProject UI import

This folder mirrors the UI structure from https://github.com/madhura1205/MiniProject (frontend) and is namespaced under `src/miniproject` to avoid collisions. It includes:

- pages/: Home, Dashboard, TemplateExtraction, BeatDetection, VideoEditor
- components/: Navbar, HamburgerMenu, SplineScene, etc.
- styles/: CSS files used by the pages and components

Notes
- Image assets (music1.jpg, music2.jpg) are referenced via remote URLs to avoid bundling binaries here.
- Two new dependencies were added to package.json: `@splinetool/react-spline` and `react-icons`.

How to preview
1) Ensure packages are installed:
   - In frontend folder, run: npm install
2) Temporarily wire routes in your app (optional). Example:
   import MPHome from "./src/miniproject/pages/Home";
   ... add a route like: <Route path="/mp" element={<MPHome />} />
   Or route to any imported page/component.

Backend endpoints
- BeatDetection.jsx expects an endpoint POST /detect-beats returning { beats: number[], duration: number, tempo: number }.
- Until wired, it falls back to mock data for UI demonstration.

Remove or adapt later as needed.
