const TICKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const PARTIAL_BLOCKS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
const FULL_BLOCK = "█";

export function tokenize(input) {
  return input.split(/[\s,]+/).filter((token) => token !== "");
}

export function parseSeries(tokens) {
  return tokens.map((token) => {
    const separator = token.lastIndexOf("=");
    const label = separator === -1 ? "" : token.slice(0, separator);
    const rawValue = separator === -1 ? token : token.slice(separator + 1);
    const value = Number(rawValue);
    if (rawValue.trim() === "" || !Number.isFinite(value)) {
      throw new Error(`not a number: ${token}`);
    }
    return { label, value };
  });
}

export function sparkline(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return TICKS[Math.floor(TICKS.length / 2)].repeat(values.length);
  }
  return values
    .map((value) => {
      const level = Math.round(((value - min) / (max - min)) * (TICKS.length - 1));
      return TICKS[level];
    })
    .join("");
}

export function barChart(series, width) {
  const values = series.map((entry) => entry.value);
  // Anchoring at zero keeps bar length proportional to value, which is what a bar
  // chart claims to show. Only negative data forces the baseline off zero.
  const baseline = Math.min(0, ...values);
  const span = Math.max(...values) - baseline;
  const labelWidth = Math.max(...series.map((entry) => entry.label.length));
  const valueWidth = Math.max(...values.map((value) => String(value).length));

  return series
    .map(({ label, value }) => {
      const filled = span === 0 ? 0 : ((value - baseline) / span) * width;
      const eighths = Math.round(filled * 8);
      const bar =
        FULL_BLOCK.repeat(Math.floor(eighths / 8)) + PARTIAL_BLOCKS[eighths % 8];
      const prefix = labelWidth === 0 ? "" : `${label.padEnd(labelWidth)} `;
      return `${prefix}${String(value).padStart(valueWidth)} ${bar}`.trimEnd();
    })
    .join("\n");
}
