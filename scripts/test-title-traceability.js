import ts from 'typescript';

/**
 * @param {string} source
 * @param {string} where
 */
export function extractTestTitles(source, where) {
  const file = ts.createSourceFile(
    where,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  // TS 6 still sets parseDiagnostics at runtime but no longer declares it
  // on SourceFile; read it reflectively and fail closed if it disappears.
  /** @type {unknown} */
  const parseDiagnostics = Reflect.get(file, 'parseDiagnostics');
  if (!Array.isArray(parseDiagnostics))
    throw new Error('TypeScript parse diagnostics unavailable: ' + where);
  if (parseDiagnostics.length) {
    throw new Error('Cannot parse test source: ' + where);
  }
  /** @type {{ where: string, line: string, tags: string[] }[]} */
  const tests = [];
  /**
   * @param {import('typescript').Node | undefined} node
   * @returns {string}
   */
  function titleParts(node) {
    if (!node) throw new Error('Missing test title: ' + where);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (ts.isParenthesizedExpression(node)) return titleParts(node.expression);
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      return titleParts(node.left) + titleParts(node.right);
    }
    // Dynamic interpolation is never evaluated or credited with tags.
    // Current scope-loop tests concatenate the identifier `scope` with tags.
    if (ts.isIdentifier(node)) return '\0';
    if (ts.isTemplateExpression(node)) {
      return (
        node.head.text +
        node.templateSpans
          .map((span) => {
            return '\0' + span.literal.text;
          })
          .join('')
      );
    }
    throw new Error('Unsupported test title expression: ' + where);
  }
  /** @param {import('typescript').Node} node */
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'test'
    ) {
      const title = titleParts(node.arguments[0]);
      const start = file.getLineAndCharacterOfPosition(node.getStart(file));
      tests.push({
        where: where + ':' + String(start.line + 1),
        line: title,
        tags: [...title.matchAll(/\[([A-Z]{2,3}-\d+)\]/g)].map(
          (match) => match[1]
        )
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return tests;
}
