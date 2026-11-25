import '@testing-library/jest-dom/vitest';

// jsdom reports an English browser, which would switch the page to English on first load. UI tests find
// elements by their Romanian text, so they run as a Romanian browser unless a test says otherwise.
Object.defineProperty(window.navigator, 'languages', { value: ['ro-RO', 'ro'], configurable: true });
