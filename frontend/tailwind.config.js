/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'playfair': ['"Playfair Display"', 'Georgia', 'serif'],
        'outfit': ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Obsidian Luxe 色系
        obsidian: '#050505',
        cream: '#F0EBE3',
        gold: {
          DEFAULT: '#C9A96E',
          light: '#D4BA85',
          dark: '#A8893F',
        },
        // iOS 26 基础色系
        ios: {
          black: '#000000',
          gray: {
            50: '#F2F2F7',
            100: '#E5E5EA',
            200: '#D1D1D6',
            300: '#C7C7CC',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#3A3A3C',
            850: '#2C2C2E',
            900: '#1C1C1E',
            950: '#161618',
          },
          blue: {
            DEFAULT: '#0A84FF',
            light: '#64D2FF',
            dark: '#0056CC',
          },
          green: '#30D158',
          red: '#FF453A',
          orange: '#FF9F0A',
          purple: '#BF5AF2',
          yellow: '#FFD60A',
          pink: '#FF375F',
          cyan: '#64D2FF',
        },
        // 保留主色兼容
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0A84FF',
          600: '#0056CC',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      borderRadius: {
        'ios': {
          sm: '10px',
          md: '14px',
          lg: '18px',
          xl: '22px',
          '2xl': '28px',
        },
      },
      boxShadow: {
        'ios': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'ios-sm': '0 2px 12px rgba(0, 0, 0, 0.3)',
        'ios-glow': '0 0 20px rgba(10, 132, 255, 0.25)',
        'ios-glow-sm': '0 0 12px rgba(10, 132, 255, 0.15)',
        // 液态玻璃阴影 - iOS 26 风格
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-heavy': '0 12px 48px rgba(0, 0, 0, 0.4)',
        'glass-glow': '0 0 40px rgba(10, 132, 255, 0.15)',
        // iOS 26 强调色阴影
        'glass-blue': '0 4px 24px rgba(10, 132, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-purple': '0 4px 24px rgba(191, 90, 242, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-cyan': '0 4px 24px rgba(100, 210, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-green': '0 4px 24px rgba(48, 209, 88, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      },
      animation: {
        'gold-pulse': 'goldPulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'ios-spring': 'iosSpring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ios-fade-in': 'iosFadeIn 0.3s ease-out',
        // 液态玻璃动画 - 更微妙
        'liquid-shine': 'liquidShine 4s ease-in-out infinite',
        'liquid-float': 'liquidFloat 5s ease-in-out infinite',
        'liquid-breath': 'liquidBreath 8s ease-in-out infinite',
        'glass-edge-glow': 'glassEdgeGlow 6s ease-in-out infinite',
      },
      keyframes: {
        goldPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 169, 110, 0)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(201, 169, 110, 0.15)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosSpring: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // 液态玻璃关键帧 - 更微妙
        liquidShine: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' },
        },
        liquidFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        liquidBreath: {
          '0%, 100%': { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
          '50%': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        },
        glassEdgeGlow: {
          '0%, 100%': { boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 8px rgba(10, 132, 255, 0.05)' },
          '50%': { boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 16px rgba(10, 132, 255, 0.1)' },
        },
      },
      backdropBlur: {
        'ios': '20px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '20px',
        'xl': '30px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-shine': 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.03) 100%)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.12)',
        'glass-light': 'rgba(255, 255, 255, 0.06)',
      },
    },
  },
  plugins: [],
}
