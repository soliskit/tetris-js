// Port of Model/Position.swift. Positions are treated as immutable values,
// matching Swift struct semantics: always create a new one instead of mutating.

export function position(row, column) {
  return { row, column };
}

export function below(pos) {
  return position(pos.row + 1, pos.column);
}
