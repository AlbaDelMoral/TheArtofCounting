// colors.js — single place to tweak fixed colors used across the sketches.
// All values are HSB arrays [H(0-360), S(0-100), B(0-100)], matching colorMode(HSB,360,100,100,255).
//
// The main digit/ring palette is NOT here — it's data-driven from CSVs so it can
// have many rows: data/palette.csv (swatches), data/palette2.csv (digit ring colors),
// data/palette3.csv (digit bg colors). Edit those CSVs to change that palette.

const COLORS = {
  // Numbers page — background circle behind every number (null = use digit-based palette3.csv color)
  bgCircle: [0, 0, 98],
  //bgCircle: [50, 2, 98],//

  // Numbers page — tick marks around each ring (null = use the ticks swatch from palette.csv)
  tickMarks: [0, 0, 25],

  // Numbers page — outline of the bg circle (null = no outline)
  bgCircleOutline: null,
};
