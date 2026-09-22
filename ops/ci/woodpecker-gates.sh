#!/bin/bash
# The gate for msp-from-ss: lint, the production build, and the vitest unit
# suite with its coverage thresholds.
#
# This is the TeamCity build `backend_MspFromSsCi` minus one thing. That build
# ran lint, build, unit tests AND `npm run e2e` inside a Playwright Apptainer
# image (playwright-v1.62.1-noble.sif) kept on quobyte. Neither half of that
# arrangement survives the move:
#
#   * the Woodpecker agent runs inside its own Apptainer image and binds only
#     /tmp, the CI directory and two git-credential files, so the quobyte SIF
#     is not reachable from a step at all; and
#   * `npx playwright install chromium` downloads the browser fine without
#     root, but the browser will not START in the agent image -- nine shared
#     libraries are missing (measured 2026-09-22 on kvm-node-5):
#       libatk-1.0.so.0 libatk-bridge-2.0.so.0 libatspi.so.0 libgbm.so.1
#       libxkbcommon.so.0 libasound.so.2 libXcomposite.so.1 libXdamage.so.1
#       libXfixes.so.3
#     and `playwright install --with-deps` needs apt and root, which a step
#     does not have.
#
# So THE E2E SUITE IS NOT RUN HERE. It is not disabled, weakened or made
# conditional -- it is absent, and this comment is the only record of it, so
# read the absence as a gap rather than as a pass. Restoring it is an operator
# change to the agent image (add the nine packages above to ci.def), not a
# change to this file; see the issue linked from the pull request that added
# this gate.
#
# RUN IT LOCALLY: `bash ops/ci/woodpecker-gates.sh` from a clean checkout.
set -euo pipefail

# The node the image ships (22) is NOT the node this repository pins, so the
# pinned major is fetched per build. Exact version + checksum rather than
# "latest 24.x": a gate that silently changes toolchain between two runs of
# the same commit cannot tell you what it proved.
#
# BUMPING .nvmrc WITHOUT BUMPING THIS FAILS THE BUILD, by design -- the assert
# in the toolchain step below compares the two. That is the same assert the
# TeamCity step carried, kept for the same reason.
NODE_VERSION=24.18.0
NODE_SHA256=55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742

journal=""
for candidate in "${WOODPECKER_JOURNAL_DIR:-}" /home/wohlgemuth/woodpecker/logs; do
  [ -n "$candidate" ] || continue
  if mkdir -p "$candidate" 2>/dev/null && [ -w "$candidate" ]; then
    journal="$candidate/msp-gates-${CI_COMMIT_SHA:-local}-$(date +%s).log"
    break
  fi
done

# A scratch directory this run owns, holding HOME and the npm cache.
#
# Woodpecker builds a clean environment for every step and gives each one its
# own HOME, and npm needs a writable one. Deliberately NOT a shared cache
# under /tmp: several agents run concurrently on one node and share its /tmp,
# and a cache one of them is evicting while another reads it is a flake that
# reproduces nowhere. `npm ci` cold is 24 s here; that is not worth a race.
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/msp-gates-XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT
mkdir -p "$SCRATCH/home" "$SCRATCH/npm-cache"
export HOME="$SCRATCH/home"
export npm_config_cache="$SCRATCH/npm-cache"
# The TeamCity step exported CI=1 into the container; keep it, so the suites
# take the same branches they took there.
export CI=1

# The run goes through a PIPELINE, not `exec > >(tee ...)`.
#
# Process substitution does not make the shell wait for the reader: a script
# that fails in seconds exits before tee drains its pipe, and the agent then
# records nothing at all. A dropped log on a fast failure is the worst case --
# it loses exactly the runs that need explaining. A pipeline is waited on, and
# PIPESTATUS carries the body's status past tee, which would otherwise mask it.
main() {

  echo "commit:  ${CI_COMMIT_SHA:-<local>}"
  step() { echo; echo "=== $* ==="; }

  step "node toolchain (.nvmrc)"
  want_major="$(tr -dc '0-9.' < .nvmrc | cut -d. -f1)"
  have_major="$(node --version | sed 's/^v//' | cut -d. -f1)"
  if [ "$want_major" != "$have_major" ]; then
    echo "agent node is $have_major, .nvmrc pins $want_major -- fetching v$NODE_VERSION"
    curl -fsSL -o "$SCRATCH/node.tar.xz" \
      "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
    echo "${NODE_SHA256}  ${SCRATCH}/node.tar.xz" | sha256sum -c -
    mkdir -p "$SCRATCH/node"
    tar -C "$SCRATCH/node" --strip-components=1 -xJf "$SCRATCH/node.tar.xz"
    PATH="$SCRATCH/node/bin:$PATH"
    export PATH
  fi
  have="$(node --version | sed 's/^v//')"
  [ "${have%%.*}" = "$want_major" ] || {
    echo "FATAL: node major mismatch: .nvmrc=$want_major running=$have" >&2
    echo "       Bump NODE_VERSION/NODE_SHA256 at the top of this script." >&2
    exit 1
  }
  echo "node $have (satisfies .nvmrc $want_major), npm $(npm --version)"

  step "npm ci"
  npm ci

  step "lint"
  npm run lint

  step "build"
  npm run build

  step "unit tests + coverage"
  # --pool=forks is a DELIBERATE, ROOT-CAUSED override inherited from the
  # TeamCity step, not a workaround. @analogjs/vite-plugin-angular forces
  # `test.pool = 'vmThreads'`, and `isolate` has no effect under VM pools, so
  # whether the spec files each get a fresh module registry depends on the
  # worker count vitest derives from os.availableParallelism() -- which
  # differs between a laptop, a TeamCity agent and an 8-CPU Slurm allocation.
  # Under vmThreads with a low count, 7 of 8 spec files fail with Angular's
  # "Cannot set base providers because it has already been called". forks
  # gives true per-file process isolation and does not depend on CPU count.
  # Measured here: 8 files, 126 tests, 88.98% statements -- identical to the
  # TeamCity run and to GitHub Actions before it.
  npm run test:coverage -- --pool=forks

  echo
  echo "GATES PASSED"
}

if [ -n "$journal" ]; then
  echo "journal: $journal"
  main 2>&1 | tee -a "$journal"
  exit "${PIPESTATUS[0]}"
fi
main
