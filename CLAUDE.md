# CLAUDE.md

gh-vulpes-shapeup runs Shape Up on GitHub Issues and Projects.\
One dependency-free `src/` backs the `gh vulpes-shapeup` CLI and the board Action,\
and a Claude Code plugin drives the CLI.\
The hill chart is drawn by the vulpes-shapeup App, which imports the shared modules through `exports`.

## Index

- `docs/architecture.md` - How the CLI and the board Action share `src/`, what `exports` offers the App, and the rules every command and log line follows.
- `docs/development.md` - The test and build commands, the testing setup and the files that must change together.
- `docs/git.md` - GitHub Flow, commit messages and how a release is cut.
- `README.md` - The user-facing specification of every command, refusal and input.
- `bin/shapeup.mjs` - The CLI's executable, which runs `main` in `src/cli.mjs` and sets the exit code.
- `board/action.yml` - The board Action's metadata, inputs and outputs, running `board/main.mjs`.
- `board/main.mjs` - The board Action's entry point, which reports any failure as a sanitized workflow annotation.
- `src/cli.mjs` - The argument parser, the `Cli` class with every command, and the lookup of the config, token and repository.
- `src/board-action.mjs` - The board Action's input checks and its translation of inputs into a `Cli` run.
- `src/github.mjs` - The REST and GraphQL transport with its repository and project tokens.
- `src/board.mjs` - The GitHub Project reads and mutations for Status, Appetite, Cycle and Hill Position.
- `src/domain.mjs` - `ShapeUpError`, hill positions and the hill markers that the App writes between.
- `src/templates.mjs` - Issue bodies as preamble, `## ` sections and footnotes, and completion report checks.
- `src/config.mjs` - Config defaults, validation and the reserved parameter names.
- `src/audit.mjs` - Pure checks that find drift between issues and the board.
- `src/init.mjs` - The `init` command, which creates or restores the labels, project and fields.
- `config.schema.json` - The JSON Schema for `.github/shapeup.json`.
- `package.json` - The version, the CLI's entry and the `exports` that the vulpes-shapeup App imports.
- `examples/` - The config, issue templates and workflows that users copy, also read by the tests.
- `test/cli-fixture.mjs` - The fake repository and board shared by the CLI and board Action tests.
- `script/build.sh` - The Bun build of one gh extension binary per platform.
- `plugins/gh-vulpes-shapeup/` - The Claude Code plugin whose skill turns a request into a `gh vulpes-shapeup` command.
- `.github/workflows/` - CI for the tests and the tag-triggered release of the binaries.
