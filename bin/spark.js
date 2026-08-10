#!/usr/bin/env node
import { barChart, parseSeries, sparkline, tokenize } from "../src/spark.js";

const USAGE = `Usage: spark [options] [values...]

Render numbers as a terminal sparkline or bar chart. Values may be given as
arguments or on stdin, separated by whitespace or commas. A value may carry a
label as label=value.

Options:
  -b, --bars        render a horizontal bar chart instead of a sparkline
  -w, --width <n>   bar chart width in characters (default 40)
  -h, --help        show this message

Examples:
  spark 1 5 22 13 5
  spark --bars mon=12 tue=19 wed=7
  cat latency.txt | spark`;

function parseArgs(argv) {
  const options = { bars: false, width: 40, help: false };
  const values = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // A bare negative number is data, not a flag.
    const isFlag = arg.startsWith("-") && !Number.isFinite(Number(arg));
    if (!isFlag) {
      values.push(arg);
      continue;
    }
    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        return { options, values };
      case "-b":
      case "--bars":
        options.bars = true;
        break;
      case "-w":
      case "--width": {
        const width = Number(argv[++i]);
        if (!Number.isInteger(width) || width < 1) {
          throw new Error(`--width needs a positive integer, got: ${argv[i]}`);
        }
        options.width = width;
        break;
      }
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  return { options, values };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const { options, values } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const tokens =
    values.length > 0
      ? values.flatMap(tokenize)
      : process.stdin.isTTY
        ? []
        : tokenize(await readStdin());

  if (tokens.length === 0) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const series = parseSeries(tokens);
  console.log(
    options.bars
      ? barChart(series, options.width)
      : sparkline(series.map((entry) => entry.value)),
  );
}

main().catch((error) => {
  console.error(`spark: ${error.message}`);
  process.exitCode = 1;
});
