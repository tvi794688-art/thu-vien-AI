/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Butter Yellow & Ivory Theme
        butter: {
          DEFAULT: '#F4D77B', // Primary Butter Yellow
          50: '#FDFBF2',
          100: '#FAF4D7',
          200: '#F7EBB8',
          300: '#F4D77B', // Main Primary
          400: '#EFC754',
          500: '#DEB333',
          600: '#BE921A',
          700: '#946F13',
          800: '#725410',
          900: '#523C0E',
        },
        cream: {
          DEFAULT: '#FFF0BC', // Secondary Cream Yellow
          50: '#FFFEFA',
          100: '#FFFDF5',
          200: '#FFF8DD',
          300: '#FFF0BC', // Main Secondary
          400: '#FDE494',
          500: '#F7D46D',
          600: '#E0B647',
          700: '#B68D29',
          800: '#89671B',
          900: '#5C4410',
        },
        ivory: {
          DEFAULT: '#FFFCF3', // Main Canvas Background
          50: '#FFFFFF',
          100: '#FFFEFB',
          200: '#FFFDF7',
          300: '#FFFCF3', // Base background
          400: '#F7F2E2',
          500: '#EDE5CD',
          600: '#D9CFB2',
          700: '#BDB191',
          800: '#958A6D',
          900: '#685F47',
        },
        sage: {
          DEFAULT: '#A7C4A0', // Accent Sage Green
          50: '#F6F9F5',
          100: '#EDF4EC',
          200: '#DBE7DA',
          300: '#C2D7BF',
          400: '#A7C4A0', // Main Accent
          500: '#8EAE87',
          600: '#71926A',
          700: '#587452',
          800: '#42583E',
          900: '#2F402C',
        },
        charcoal: {
          DEFAULT: '#2C2A24', // Main Warm Dark Text
          50: '#F9F8F6',
          100: '#F1EFEA',
          200: '#E0DDD4',
          300: '#C2BEAF',
          400: '#989380',
          500: '#706B58',
          600: '#524E3F',
          700: '#3D3A2F',
          800: '#2C2A24', // Deep readable body/heading
          900: '#1F1E19',
          950: '#141310',
        },
        terracotta: {
          DEFAULT: '#C85A48', // Soft danger/overdue
          50: '#FDF6F5',
          100: '#FAECE9',
          200: '#F4D5CF',
          300: '#EBB4AB',
          400: '#DC887B',
          500: '#C85A48',
          600: '#B34735',
          700: '#8E3324',
          800: '#6C2518',
          900: '#4D1A10',
        },
        // Legacy backward compatibility aliases
        forest: {
          50: '#F6F9F5',
          100: '#EDF4EC',
          200: '#DBE7DA',
          300: '#C2D7BF',
          400: '#A7C4A0',
          500: '#8EAE87',
          600: '#71926A',
          700: '#587452',
          800: '#3D553A',
          900: '#2C3E2A',
          950: '#1F2C1D',
        },
        gold: {
          DEFAULT: '#F4D77B',
          50: '#FDFBF2',
          100: '#FAF4D7',
          200: '#F7EBB8',
          300: '#F4D77B',
          400: '#EFC754',
          500: '#DEB333',
          600: '#BE921A',
          700: '#946F13',
          800: '#725410',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Merriweather', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm-xs': '0 1px 2px rgba(44, 42, 36, 0.04)',
        'warm-sm': '0 2px 4px rgba(44, 42, 36, 0.04), 0 1px 2px rgba(44, 42, 36, 0.02)',
        'warm': '0 4px 16px -2px rgba(44, 42, 36, 0.05), 0 2px 6px -1px rgba(44, 42, 36, 0.03)',
        'warm-md': '0 8px 24px -3px rgba(44, 42, 36, 0.06), 0 3px 8px -1px rgba(44, 42, 36, 0.03)',
        'warm-lg': '0 16px 36px -4px rgba(44, 42, 36, 0.08), 0 6px 14px -2px rgba(44, 42, 36, 0.04)',
        'butter-glow': '0 0 24px rgba(244, 215, 123, 0.4)',
        'sage-glow': '0 0 20px rgba(167, 196, 160, 0.35)',
        // Legacy shadow compatibility
        'library-sm': '0 2px 4px rgba(44, 42, 36, 0.04), 0 1px 2px rgba(44, 42, 36, 0.02)',
        'library': '0 4px 16px -2px rgba(44, 42, 36, 0.05), 0 2px 6px -1px rgba(44, 42, 36, 0.03)',
        'library-lg': '0 16px 36px -4px rgba(44, 42, 36, 0.08), 0 6px 14px -2px rgba(44, 42, 36, 0.04)',
        'gold-glow': '0 0 24px rgba(244, 215, 123, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
