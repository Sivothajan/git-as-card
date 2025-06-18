# git-as-card

A modern, minimal web app to display GitHub user repositories as beautiful, shareable cards.

## Features

- Search for any GitHub username and view their public repositories as cards
- Responsive, clean UI with smooth transitions and gradients
- Advanced filtering: by language, stars, type (fork/original/archived), license, and issues
- Sort repositories by stars, name, last updated, or created date
- View social preview images for repositories (where available)
- Error handling for not found users and API issues
- Local caching for faster repeat searches
- Built with React 19, Vite, and modern CSS modules

## Roadmap / Planned Features

- Dark mode toggle
- Customizable card themes
- Export card as image (PNG/SVG)
- Show pinned repositories
- Add social links (Twitter, LinkedIn, etc.)
- Support for organizations and teams
- Progressive Web App (PWA) support
- Localization (multi-language)

## Getting Started

1. Clone the repo:
   ```sh
   git clone https://github.com/your-username/git-as-card.git
   cd git-as-card
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
4. Build for production:
   ```sh
   npm run build
   ```
5. Preview the production build:
   ```sh
   npm run preview
   ```

## Usage

1. Enter a GitHub username in the search bar and press Enter or click Search.
2. Browse the user’s public repositories as cards.
3. Use the filter bar to filter by language, stars, type, license, or issues.
4. Click a card to open the repository on GitHub.
5. Use the Clear button to reset to the default user (torvalds).

## Technologies Used

- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- Modern CSS Modules

## License

[MIT](LICENSE)
