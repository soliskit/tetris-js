# Historical model self-checks

These commands run the preserved self-checks for revisions 1 to 4. They do not test the game, certify a rule or make an old partial model the current oracle.

Run from the repository root with Python 3. Each self-check uses its own model-derived predicates and placeholder choices. Known errors and limits remain in the corresponding notes and reconciliation record.

```sh
python3 docs/o8-reference-model/rev1/selftest.py
```

Revision 2's unchanged self-check imports the revision-1 module name. Stage the revision-2 bytes under that name in a temporary directory rather than editing the frozen files:

```sh
(
  stage=$(mktemp -d) || exit "$?"
  trap 'rm -rf "$stage"' EXIT
  cp docs/o8-reference-model/rev2/o8_reference_model_rev2.py "$stage/o8_reference_model.py" || exit "$?"
  cp docs/o8-reference-model/rev2/selftest_rev2.py "$stage/selftest_rev2.py" || exit "$?"
  python3 "$stage/selftest_rev2.py"
  status=$?
  exit "$status"
)
```

Revisions 3 and 4 need an explicit geometry-table location to avoid their historical scratch-path defaults:

```sh
O8_TABLE="$PWD/docs/o8-model-input-pack/2-srs_table.txt" \
  python3 docs/o8-reference-model/rev3/selftest_rev3.py
O8_TABLE="$PWD/docs/o8-model-input-pack/2-srs_table.txt" \
  O8_MODEL="$PWD/docs/o8-reference-model/rev4/o8_reference_model_rev4.py" \
  python3 docs/o8-reference-model/rev4/selftest_rev4.py
```

These recipes have not been run for this publication preparation. Any later result must record the exact source identities, command, environment and outcome separately. No geometry, expected value, frozen source, test threshold or model reading is changed by staging a filename or supplying the approved table path.
