/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✅ Dark mode support
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'ui-sans-serif', 'system-ui'], // ✅ Unified Arabic font
      },
      colors: {
        // ✅ Apple-inspired palette
        apple: {
          bg: '#f9f9f9',
          text: {
            primary: '#1f1f1f',
            secondary: '#6b7280',
          },
          accent: {
            blue: '#007aff', // iOS blue
          },
          border: '#e5e7eb',
        },
        // ✅ Sudan theme (can be expanded)
        sudan: {
          500: '#2c3e50',
        },
      },
      spacing: {
        header: '4rem',
        section: '2rem',
        gap: '1.5rem',
      },
      fontSize: {
        base: ['1rem', '1.75rem'],
        lg: ['1.125rem', '1.875rem'],
        xl: ['1.25rem', '2rem'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.05)',
        apple: '0 0 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),  // Form styling
    require('tailwindcss-rtl'),     // RTL support
  ],
};
