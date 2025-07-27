# Module Structure

This document describes the structure of the client-side codebase for the IUTverse web application.

## Main Folders

- **src/**
  - **assets/**: Static assets such as images and SVGs.
  - **components/**: Reusable React components (buttons, cards, etc.).
  - **pages/**: Top-level pages/views of the app (e.g., Login, Homepage, Profile).
    - **Login/**: Login and signup page module (Login.jsx, Login.css).
    - **homepage/**: Homepage module.
    - **Profile/**: User profile page module.
  - **App.jsx**: Main app component, organizes page routing.
  - **App.css**: Global styles for the app shell.
  - **index.css**: Tailwind and global resets.
  - **main.jsx**: Entry point for React rendering.

- **public/**: Static files served directly (e.g., favicon, vite.svg).

- **.vite/**: Vite build cache (auto-generated, ignored by git).

## Example Directory Tree

```
client/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   ├── login.png
│   │   └── react.svg
│   ├── components/
│   ├── pages/
│   │   ├── Login/
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   ├── homepage/
│   │   │   └── Homepage.jsx
│   │   └── Profile/
│   │       └── Profile.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Notes
- **Routing** is handled in `App.jsx` using `react-router-dom`.
- **Each page** (e.g., Login, Homepage, Profile) is modularized in its own folder under `pages/`.
- **Component reusability**: Place shared UI elements in `components/`.
- **Styling**: Page-specific styles go in their respective folders; global styles in `App.css` and `index.css`.

---
This structure helps keep the codebase modular, maintainable, and scalable for future development. 