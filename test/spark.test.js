import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { barChart, parseSeries, sparkline, tokenize } from "../src/spark.js";

const CLI = fileURLToPath(new URL("../bin/spark.js", import.meta.url));
const run = promisify(execFile);

test("tokenize splits on whitespace and commas", () => {
  assert.deepEqual(tokenize(" 1, 2\n3\t4 "), ["1", "2", "3", "4"]);
  assert.deepEqual(tokenize("   "), []);
});

test("parseSeries reads bare numbers and labelled values", () => {
  assert.deepEqual(parseSeries(["3", "mon=12", "-1.5"]), [
    { label: "", value: 3 },
    { label: "mon", value: 12 },
    { label: "", value: -1.5 },
  ]);
});

test("parseSeries splits on the last equals sign", () => {
  assert.deepEqual(parseSeries(["a=b=7"]), [{ label: "a=b", value: 7 }]);
});

test("parseSeries rejects values that are not finite numbers", () => {
  for (const token of ["abc", "mon=", "1e999", "NaN", ""]) {
    assert.throws(() => parseSeries([token]), /not a number/);
  }
});

test("sparkline spans the full tick range", () => {
  assert.equal(sparkline([0, 1, 2, 3, 4, 5, 6, 7]), "▁▂▃▄▅▆▇█");
  assert.equal(sparkline([1, 5, 22, 13, 5]), "▁▂█▅▂");
});

test("sparkline renders flat data at a mid tick", () => {
  assert.equal(sparkline([4, 4, 4]), "▅▅▅");
  assert.equal(sparkline([0]), "▅");
});

test("sparkline scales negative values against the series minimum", () => {
  assert.equal(sparkline([-10, 0, 10]), "▁▅█");
});

test("barChart anchors positive data at zero", () => {
  assert.equal(
    barChart([{ label: "", value: 50 }, { label: "", value: 100 }], 10),
    [" 50 █████", "100 ██████████"].join("\n"),
  );
});

test("barChart uses the data minimum once values go negative", () => {
  assert.equal(
    barChart([{ label: "", value: -10 }, { label: "", value: 10 }], 4),
    ["-10", " 10 ████"].join("\n"),
  );
});

test("barChart pads labels into a column", () => {
  assert.equal(
    barChart([{ label: "mon", value: 1 }, { label: "friday", value: 2 }], 2),
    ["mon    1 █", "friday 2 ██"].join("\n"),
  );
});

test("barChart renders partial blocks for sub-character lengths", () => {
  assert.equal(barChart([{ label: "", value: 1 }], 1).trim(), "1 █");
  assert.equal(barChart([{ label: "", value: 0 }], 1), "0");
});

test("barChart draws empty bars when every value is zero", () => {
  assert.equal(
    barChart([{ label: "", value: 0 }, { label: "", value: 0 }], 8),
    ["0", "0"].join("\n"),
  );
});

test("cli renders a sparkline from arguments", async () => {
  const { stdout } = await run(process.execPath, [CLI, "1", "5", "22", "13", "5"]);
  assert.equal(stdout, "▁▂█▅▂\n");
});

test("cli reads values from stdin", async () => {
  const child = run(process.execPath, [CLI]);
  child.child.stdin.end("0,1,2,3,4,5,6,7\n");
  const { stdout } = await child;
  assert.equal(stdout, "▁▂▃▄▅▆▇█\n");
});

test("cli treats negative arguments as data, not flags", async () => {
  const { stdout } = await run(process.execPath, [CLI, "-10", "0", "10"]);
  assert.equal(stdout, "▁▅█\n");
});

test("cli renders bars at the requested width", async () => {
  const { stdout } = await run(process.execPath, [
    CLI,
    "--bars",
    "--width",
    "10",
    "mon=5",
    "tue=10",
  ]);
  assert.equal(stdout, "mon  5 █████\ntue 10 ██████████\n");
});

test("cli exits non-zero on an unparseable value", async () => {
  const error = await run(process.execPath, [CLI, "nope"]).catch((err) => err);
  assert.equal(error.code, 1);
  assert.match(error.stderr, /spark: not a number: nope/);
});

test("cli exits non-zero on an unknown option", async () => {
  const error = await run(process.execPath, [CLI, "--nope"]).catch((err) => err);
  assert.equal(error.code, 1);
  assert.match(error.stderr, /spark: unknown option: --nope/);
});

test("cli exits non-zero on a bad width", async () => {
  const error = await run(process.execPath, [CLI, "-w", "0", "1"]).catch((err) => err);
  assert.equal(error.code, 1);
  assert.match(error.stderr, /--width needs a positive integer/);
});

test("cli prints usage on --help", async () => {
  const { stdout } = await run(process.execPath, [CLI, "--help"]);
  assert.match(stdout, /^Usage: spark/);
});

test("cli honours --help ahead of a later bad option", async () => {
  const { stdout } = await run(process.execPath, [CLI, "--help", "--nope"]);
  assert.match(stdout, /^Usage: spark/);
});

test("cli exits non-zero when stdin is empty", async () => {
  const child = run(process.execPath, [CLI]);
  child.child.stdin.end("");
  const error = await child.catch((err) => err);
  assert.equal(error.code, 1);
  assert.match(error.stderr, /^Usage: spark/);
});
