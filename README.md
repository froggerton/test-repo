# spark

Render numbers as terminal sparklines and bar charts. Zero dependencies, one file of logic.

## Usage

```
spark [options] [values...]
```

Values come from arguments or stdin, separated by whitespace or commas. Any value may
carry a label as `label=value`.

```console
$ spark 1 5 22 13 5
▁▂█▅▂

$ spark --bars mon=12 tue=19 wed=7 thu=25 fri=3
mon 12 ███████████████████▎
tue 19 ██████████████████████████████▍
wed  7 ███████████▎
thu 25 ████████████████████████████████████████
fri  3 ████▊

$ cut -d' ' -f2 latency.log | spark
▂▁▃▂▇█▄▂
```

## Options

| Option | Description |
| --- | --- |
| `-b`, `--bars` | render a horizontal bar chart instead of a sparkline |
| `-w`, `--width <n>` | bar chart width in characters (default 40) |
| `-h`, `--help` | show usage |

## Scaling

Sparklines spread the series across all eight tick heights, so they show shape rather
than magnitude: a flat series renders as a flat mid-height line.

Bar charts anchor at zero whenever every value is non-negative, which keeps bar length
proportional to value. Negative values move the baseline to the series minimum, since a
bar cannot be shorter than nothing.

## Development

```console
$ npm test
```
