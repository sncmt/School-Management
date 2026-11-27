const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // older phone browsers (Chrome before 111, Samsung Internet before 21, Safari before 15.4)
    // can't read oklch(): every such colour, and the colour tokens, also get an rgb() copy, so
    // the accent backgrounds (the bottom bar, the header panels) don't vanish there
    "@csstools/postcss-oklab-function": { preserve: true },
  },
};

export default config;
