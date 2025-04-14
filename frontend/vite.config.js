// vite.config.js
export default ({ mode }) => {
  const isDev = mode === 'development';

  return {
    server: {
      proxy: {
        '/api': {
          target: isDev
            ? 'http://localhost:3000'
            : 'https://pic-of-the-day.paulwoisard.fr',
          changeOrigin: true,
          secure: !isDev
        }
      }
    }
  };
};
