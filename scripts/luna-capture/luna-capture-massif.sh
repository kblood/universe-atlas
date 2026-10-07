#!/bin/sh
# GATE-5 massif-targeted Luna sheet. Policy (O6, docs/luna-gate-policy-2026-10-07.md): at the gate Luna is CAPTURE ONLY
# (build + capture + archive + hashes), NO VOTE, until a question is calibrated on tests/visual-controls/<feature>.json
# with >= 2 good and >= 2 bad controls. An explicit LUNA_VOTE=1 may still vote; the result is VISUAL-ADVISORY and is
# citable only when luna-vote stamps it CALIBRATED (LUNA_CALIBRATION + LUNA_QUESTION).
#
# Steps: build, then capture, per arm, each under ONE test-slot level (the capture takes the GPU lock itself: slot -> GPU,
# never nested slots); then archive the capture reports, logs, exits and the sha256 of every PNG into $OUT/archive/.
# The capture script is capture-massif.browser.mjs (view `massifAxis`, aimed at a FROZEN_MASSIF_TILE_SET axis station).
#
# Usage: REF=<reference checkout> CAND=<candidate checkout> OUT=<evidence dir> TILESET=<mountain-tile-set.mjs path>
#        sh scripts/luna-capture/luna-capture-massif.sh
# Env:   VIEWS (default massifAxis)
#        ARCHIVE_ONLY=1   re-archive and re-hash an existing $OUT (no build, no capture, no vote; REF/CAND/TILESET not needed)
#        LUNA_VOTE=1      also vote (advisory). Needs LUNA_PROMPT_FILE; optional LUNA_ASKS (>= 3, default 3),
#                         LUNA_ELEMENTS (comma list), LUNA_CALIBRATION=<controls result.json> with LUNA_QUESTION=<id>.
#                         Without LUNA_CALIBRATION the vote is recorded NOT-CHECKED (never cite it as pass/fail).
# Real exit codes go to $OUT/luna-exits.log. Run it only while the machine GPU lock and the test slot are free.
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
: "${OUT:?set OUT}"
SLOT=$REPO/tests/helpers/test-slot.mjs
CAP=$REPO/scripts/luna-capture/capture-massif.browser.mjs
VOTE=$REPO/scripts/luna-vote.mjs
VIEWS=${VIEWS:-massifAxis}
ARMS="refmain wired"

case "${LUNA_VOTE:-0}" in 0|1) ;; *) echo "LUNA_VOTE must be 0 or 1, got '$LUNA_VOTE'" >&2; exit 64;; esac
if [ "${LUNA_VOTE:-0}" = 1 ]; then
  : "${LUNA_PROMPT_FILE:?LUNA_VOTE=1 needs LUNA_PROMPT_FILE (the exact prompt text that was or will be calibrated)}"
  [ -f "$LUNA_PROMPT_FILE" ] || { echo "LUNA_PROMPT_FILE not found: $LUNA_PROMPT_FILE" >&2; exit 66; }
  if [ -n "${LUNA_CALIBRATION:-}" ] && [ -z "${LUNA_QUESTION:-}" ]; then echo "LUNA_CALIBRATION needs LUNA_QUESTION" >&2; exit 64; fi
fi

archive() {
  A=$OUT/archive
  mkdir -p "$A"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$A/archived-at.txt"
  for f in "$OUT"/luna-exits.log "$OUT"/luna-build-*.log "$OUT"/luna-capture-*.log "$OUT"/luna-vote-*.json "$OUT"/luna-vote-*.log "$OUT"/window.txt; do
    [ -f "$f" ] && cp "$f" "$A/"
  done
  for tag in $ARMS; do
    for f in "$OUT/luna-sheet/$tag"/capture-*.json; do [ -f "$f" ] && cp "$f" "$A/"; done
  done
  # sha256 of every PNG, paths relative to $OUT (same format as docs/quiet-window-2026-10-07/gate5/luna-sheet-png.sha256).
  (cd "$OUT" && find luna-sheet -name '*.png' -type f 2>/dev/null | LC_ALL=C sort | while read -r p; do sha256sum -b "$p"; done) > "$A/luna-sheet-png.sha256"
  n=$(wc -l < "$A/luna-sheet-png.sha256" | tr -d ' ')
  echo "archive: $A ($n PNG hashes)"
}

if [ "${ARCHIVE_ONLY:-0}" = 1 ]; then archive; exit 0; fi

: "${REF:?set REF}" "${CAND:?set CAND}" "${TILESET:?set TILESET}"
mkdir -p "$OUT"
: > "$OUT/luna-exits.log"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/window.txt"
for arm in refmain:$REF wired:$CAND; do
  tag=${arm%%:*}; root=${arm#*:}
  (cd "$root" && node "$SLOT" -- node node_modules/vite/bin/vite.js build > "$OUT/luna-build-$tag.log" 2>&1); echo "build $tag exit=$?" >> "$OUT/luna-exits.log"
  (cd "$root" && node "$SLOT" -- node "$CAP" --tag "$tag" --out "$OUT/luna-sheet/$tag" --views "$VIEWS" --noclouds-views "$VIEWS" --root "$root" --tileset "$TILESET" > "$OUT/luna-capture-$tag.log" 2>&1); echo "capture $tag exit=$?" >> "$OUT/luna-exits.log"
done
date -u +%Y-%m-%dT%H:%M:%SZ >> "$OUT/window.txt"

if [ "${LUNA_VOTE:-0}" = 1 ]; then
  # Gate bar (stricter than luna-vote's own >= 1 good / >= 1 bad): the question is CALIBRATED on the exact prompt with
  # >= 2 good and >= 2 bad controls. Recorded in luna-exits.log; the vote below runs either way (it is advisory).
  if [ -n "${LUNA_CALIBRATION:-}" ]; then
    node -e '
      const fs=require("fs"),[cal,q,promptFile]=process.argv.slice(1);
      let r;try{r=JSON.parse(fs.readFileSync(cal,"utf8"));}catch(e){console.log("gate-bar NOT met: cannot read calibration "+cal);process.exit(0);}
      const e=(r.questions||[]).find(x=>x.id===q),prompt=fs.readFileSync(promptFile,"utf8").trim();
      const goods=e?.rows?.filter(x=>x.expect==="PASS").length??0,bads=e?.rows?.filter(x=>x.expect==="FAIL").length??0;
      const why=!e?"question "+q+" not in calibration":e.status!=="CALIBRATED"?"status "+e.status:String(e.prompt).trim()!==prompt?"prompt differs from the calibrated prompt":goods<2||bads<2?"controls "+goods+" good / "+bads+" bad, need >= 2 / >= 2":"";
      console.log(why?"gate-bar NOT met ("+why+"): vote is advisory and not citable at the gate":"gate-bar met: question "+q+" CALIBRATED with "+goods+" good / "+bads+" bad controls");
    ' "$LUNA_CALIBRATION" "$LUNA_QUESTION" "$LUNA_PROMPT_FILE" >> "$OUT/luna-exits.log"
  else
    echo "gate-bar NOT met (no LUNA_CALIBRATION): vote is NOT-CHECKED, never cite it" >> "$OUT/luna-exits.log"
  fi
  # Advisory only: luna-vote exits 0 for every verdict and 2 when Luna is unavailable ("visual check NOT done").
  for tag in $ARMS; do
    set --
    for p in "$OUT/luna-sheet/$tag"/*.png; do [ -f "$p" ] && set -- "$@" "$p"; done
    [ $# -gt 0 ] || { echo "vote $tag skipped: no PNG" >> "$OUT/luna-exits.log"; continue; }
    [ -n "${LUNA_ELEMENTS:-}" ] && set -- --elements "$LUNA_ELEMENTS" "$@"
    [ -n "${LUNA_CALIBRATION:-}" ] && set -- --calibration "$LUNA_CALIBRATION" --question "$LUNA_QUESTION" "$@"
    node "$VOTE" --prompt-file "$LUNA_PROMPT_FILE" --asks "${LUNA_ASKS:-3}" --json "$OUT/luna-vote-$tag.json" "$@" > "$OUT/luna-vote-$tag.log" 2>&1
    echo "vote $tag exit=$? (VISUAL-ADVISORY; citable only if stamped CALIBRATED)" >> "$OUT/luna-exits.log"
  done
else
  echo "vote skipped: capture only (docs/luna-gate-policy-2026-10-07.md; set LUNA_VOTE=1 for an advisory vote)" >> "$OUT/luna-exits.log"
fi
archive
echo done >> "$OUT/luna-exits.log"
cp "$OUT/luna-exits.log" "$OUT/archive/"
