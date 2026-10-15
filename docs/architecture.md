# Architecture

One `src/` backs two products that people and agents use:\
the `gh vulpes-shapeup` CLI and the board Action.\
The hill chart is drawn by the [vulpes-shapeup](https://github.com/vulpes-facility/vulpes-shapeup) App,\
which imports the modules both sides share through `exports`.\
`README.md` is the user-facing specification of every command, refusal and input;\
read it before changing behavior.

## Entry points

- **CLI**: `bin/shapeup.mjs` calls `main` in `src/cli.mjs`,\
  which finds the config, asks `gh` for the token and repository,\
  and runs `Cli.run`.
- **Board Action**: `board/action.yml` runs `board/main.mjs`,\
  which calls `main` in `src/board-action.mjs`.\
  It does not reimplement commands.\
  It validates the inputs, turns them into CLI arguments with `cliArgs`,\
  and runs the same `Cli`,\
  whose file reads `markdownReader` answers from the `body`, `reason` and `report` inputs.

## Layers

- `GitHub` is the only transport.\
  It holds two tokens:\
  `request(..., { project: true })` uses the project token,\
  so every GraphQL call does;\
  REST calls use the repository token.
- `Board` reads and changes the GitHub Project (Projects v2).\
  `load()` MUST run before any option, iteration or mutation lookup,\
  since it resolves the field and option ids.\
  Issues and their field values are read from the issue side,\
  because the board's item listing lags behind.
- `domain.mjs` holds what the CLI and the App share about the hill:\
  positions, and the block between `<!-- hill:start -->` and `<!-- hill:end -->` in a pitch body.\
  The App writes that block with `withHill` and `hillBlock`;\
  its `<!-- hill:values ... -->` line records what was last drawn,\
  which `audit` reads with `drawnValues`.

## Exports

`package.json` exports what the App imports, and nothing else,\
so that a change elsewhere in `src/` is not a breaking change:

| Export | Module | Holds |
| --- | --- | --- |
| `gh-vulpes-shapeup/config` | `src/config.mjs` | `parseConfig`, `loadConfig` and the defaults |
| `gh-vulpes-shapeup/domain` | `src/domain.mjs` | `ShapeUpError`, the positions and the hill block |
| `gh-vulpes-shapeup/github` | `src/github.mjs` | The `GitHub` transport |

Changing or removing anything these modules export is a breaking change.

## Rules every CLI command follows

- Every check that can refuse the command comes before its first change.\
  A status the command will set is looked up first with `requireStatus`.
- A command computes only the changes that differ from its result, as a list of `steps`,\
  and runs them through `Cli.apply`.\
  `apply` rolls nothing back.\
  A failure after the first step throws `ShapeUpError('partial')`,\
  listing what was made, what failed and what was not attempted.
- When no step differs,\
  a state command MUST throw with the code `holds` (the `holds` helper).\
  The board Action turns that code alone into a notice with `result=unchanged`;\
  any other refusal fails the step.
- A `new` command runs `apply` with `rerun: false`,\
  because running it again would create another issue;\
  its partial failure lists the changes left to make by hand instead.
- The reason or completion report is read and checked before any change,\
  and `explain` posts it last, as one comment.

## Errors and logging

- Throw `ShapeUpError(code, message)` for anything a user should read.\
  Entry points print only a `ShapeUpError`'s message,\
  and a generic internal error for anything else.
- `GitHub` replaces HTTP, GraphQL and network failures with its own messages,\
  so no API response reaches the output.
- The board Action MUST NOT log tokens, API response bodies or the Markdown inputs.
- The CLI exits with 0, with 1 when `audit` finds something, and with 2 on any error.\
  The board Action fails with 1.
