import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Main portal — institutional palette
        gov: {
          navy: '#0F172A', // headers, primary ink
          royal: '#1E3A8A', // navigation, primary actions, primary data series
          'royal-hover': '#1E40AF',
          'royal-tint': '#EFF4FF',
          canvas: '#F8FAFC', // page background
          line: '#E2E8F0', // card + table borders
          'line-strong': '#CBD5E1',
          ink: '#0F172A',
          sub: '#475569', // secondary text
          muted: '#64748B',
          funded: '#15803D', // approved / funded allocations
          'funded-tint': '#F0FDF4',
          'funded-line': '#BBF7D0',
          amber: '#D97706', // budget constraint, warnings, partial funding
          'amber-tint': '#FFFBEB',
          'amber-line': '#FDE68A',
          deferred: '#475569',
          'deferred-tint': '#F1F5F9',
          danger: '#B91C1C',
          focus: '#2563EB',
        },
        // Behind the Scenes inspector — dark "engine room"
        bts: {
          bg: '#0F172A',
          panel: '#141F35',
          raised: '#1A2741',
          line: '#26344F',
          'line-soft': '#1F2C46',
          ink: '#E2E8F0',
          sub: '#94A3B8',
          muted: '#64748B',
          sky: '#38BDF8',
          emerald: '#34D399',
          amber: '#FBBF24',
          rose: '#FB7185',
          violet: '#A5B4FC',
        },
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', '"Public Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        drawer: '-24px 0 48px -12px rgba(15, 23, 42, 0.45)',
        modal: '0 24px 64px -16px rgba(15, 23, 42, 0.35)',
        popover: '0 8px 24px -8px rgba(15, 23, 42, 0.25)',
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 160ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
      },
    },
  },
  plugins: [containerQueries],
};
