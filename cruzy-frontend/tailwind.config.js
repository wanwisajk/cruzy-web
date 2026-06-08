export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading-1': ['24px', { lineHeight: '32px' }],
        'heading-2': ['20px', { lineHeight: '28px' }],
        'heading-3': ['18px', { lineHeight: '28px' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-small': ['12px', { lineHeight: '16px' }],
        caption: ['12px', { lineHeight: '16px' }],
        'stat-number': ['24px', { lineHeight: '28px' }],
        'stat-label': ['12px', { lineHeight: '16px' }],
      },
      lineHeight: {
        'heading-1': '32px',
        'heading-2': '28px',
        'heading-3': '28px',
        body: '20px',
        caption: '16px',
        stat: '28px',
      },
    },
  },
};
