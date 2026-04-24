import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Status colors
                status: {
                    backlog: {
                        DEFAULT: '#3B82F6',
                        light: '#DBEAFE',
                        dark: '#1E40AF',
                    },
                    todo: {
                        DEFAULT: '#3B82F6',
                        light: '#DBEAFE',
                        dark: '#1E40AF',
                    },
                    inProgress: {
                        DEFAULT: '#F59E0B',
                        light: '#FEF3C7',
                        dark: '#B45309',
                    },
                    review: {
                        DEFAULT: '#F59E0B',
                        light: '#FEF3C7',
                        dark: '#B45309',
                    },
                    blocked: {
                        DEFAULT: '#EF4444',
                        light: '#FEE2E2',
                        dark: '#B91C1C',
                    },
                    done: {
                        DEFAULT: '#22C55E',
                        light: '#DCFCE7',
                        dark: '#15803D',
                    },
                },
                // Priority colors
                priority: {
                    low: '#6B7280',
                    medium: '#3B82F6',
                    high: '#F59E0B',
                    critical: '#EF4444',
                },
                // Brand colors
                brand: {
                    50: '#EEF2FF',
                    100: '#E0E7FF',
                    200: '#C7D2FE',
                    300: '#A5B4FC',
                    400: '#818CF8',
                    500: '#6366F1',
                    600: '#4F46E5',
                    700: '#4338CA',
                    800: '#3730A3',
                    900: '#312E81',
                    950: '#1E1B4B',
                },
                // Glass effect
                glass: {
                    white: 'rgba(255, 255, 255, 0.8)',
                    dark: 'rgba(15, 23, 42, 0.8)',
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                base: ['16px', '24px'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            backdropBlur: {
                'glass': '10px',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "slide-in-right": {
                    from: { transform: "translateX(100%)" },
                    to: { transform: "translateX(0)" },
                },
                "slide-out-right": {
                    from: { transform: "translateX(0)" },
                    to: { transform: "translateX(100%)" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "slide-in-right": "slide-in-right 0.3s ease-out",
                "slide-out-right": "slide-out-right 0.3s ease-out",
                "fade-in": "fade-in 0.2s ease-out",
            },
        },
    },
    plugins: [
        typography,
    ],
}
