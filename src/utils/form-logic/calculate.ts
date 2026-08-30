/**
 * Tiny safe arithmetic expression evaluator for form calculation variables.
 *
 * Supports numbers, `@name` references, the operators + - * / % ^ and
 * parentheses, with unary minus. It is a hand-written tokenizer plus a
 * recursive-descent parser — no `eval` / `new Function` — so expressions
 * authored in the Logic Builder can never execute arbitrary code.
 */

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { kind: "paren"; value: "(" | ")" };

const OPERATORS = new Set(["+", "-", "*", "/", "%", "^"]);
const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_]/;

/** Split an expression into tokens. Throws ExpressionError on bad input. */
export const tokenizeExpression = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }

    // `@name` or bare `name` — both resolve through the resolver callback.
    if (ch === "@" || NAME_START.test(ch)) {
      let j = ch === "@" ? i + 1 : i;
      if (ch === "@" && !NAME_START.test(input[j] ?? "")) {
        throw new ExpressionError(`Invalid variable reference at position ${i}`);
      }
      let name = "";
      while (j < input.length && NAME_CHAR.test(input[j])) {
        name += input[j];
        j += 1;
      }
      if (!name) {
        throw new ExpressionError(`Invalid variable reference at position ${i}`);
      }
      tokens.push({ kind: "name", value: name });
      i = j;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      let num = "";
      while (j < input.length && /[0-9.]/.test(input[j])) {
        num += input[j];
        j += 1;
      }
      const value = Number(num);
      if (!Number.isFinite(value)) {
        throw new ExpressionError(`Invalid number "${num}"`);
      }
      tokens.push({ kind: "number", value });
      i = j;
      continue;
    }

    if (OPERATORS.has(ch)) {
      tokens.push({
        kind: "op",
        value: ch as "+" | "-" | "*" | "/" | "%" | "^",
      });
      i += 1;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ kind: "paren", value: ch });
      i += 1;
      continue;
    }

    throw new ExpressionError(`Unexpected character "${ch}" at position ${i}`);
  }
  return tokens;
};

/** Resolves a referenced name to its numeric value, or undefined when unknown. */
export type ExpressionResolver = (name: string) => number | undefined;

const parseTokens = (tokens: Token[], resolve: ExpressionResolver): number => {
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];

  const parsePrimary = (): number => {
    const token = peek();
    if (!token) throw new ExpressionError("Unexpected end of expression");

    if (token.kind === "number") {
      pos += 1;
      return token.value;
    }

    if (token.kind === "name") {
      pos += 1;
      const value = resolve(token.value);
      if (value === undefined || !Number.isFinite(value)) {
        throw new ExpressionError(
          `Unknown or non-numeric value for @${token.value}`,
        );
      }
      return value;
    }

    if (token.kind === "paren" && token.value === "(") {
      pos += 1;
      const value = parseAdditive();
      const close = peek();
      if (!close || close.kind !== "paren" || close.value !== ")") {
        throw new ExpressionError("Missing closing parenthesis");
      }
      pos += 1;
      return value;
    }

    throw new ExpressionError("Unexpected token in expression");
  };

  const parseUnary = (): number => {
    const token = peek();
    if (
      token &&
      token.kind === "op" &&
      (token.value === "-" || token.value === "+")
    ) {
      pos += 1;
      const value = parseUnary();
      return token.value === "-" ? -value : value;
    }
    return parsePrimary();
  };

  const parsePower = (): number => {
    const base = parseUnary();
    const token = peek();
    if (token && token.kind === "op" && token.value === "^") {
      pos += 1;
      return Math.pow(base, parsePower()); // right-associative
    }
    return base;
  };

  const parseMultiplicative = (): number => {
    let left = parsePower();
    for (;;) {
      const token = peek();
      if (
        token &&
        token.kind === "op" &&
        (token.value === "*" || token.value === "/" || token.value === "%")
      ) {
        pos += 1;
        const right = parsePower();
        left =
          token.value === "*"
            ? left * right
            : token.value === "/"
              ? left / right
              : left % right;
        continue;
      }
      return left;
    }
  };

  const parseAdditive = (): number => {
    let left = parseMultiplicative();
    for (;;) {
      const token = peek();
      if (
        token &&
        token.kind === "op" &&
        (token.value === "+" || token.value === "-")
      ) {
        pos += 1;
        const right = parseMultiplicative();
        left = token.value === "+" ? left + right : left - right;
        continue;
      }
      return left;
    }
  };

  const result = parseAdditive();
  if (pos !== tokens.length) {
    throw new ExpressionError("Unexpected trailing tokens in expression");
  }
  return result;
};

/** Evaluate an arithmetic expression, resolving @name tokens via `resolve`. */
export const evaluateExpression = (
  expression: string,
  resolve: ExpressionResolver,
): number => {
  const tokens = tokenizeExpression(expression);
  if (tokens.length === 0) throw new ExpressionError("Expression is empty");
  const result = parseTokens(tokens, resolve);
  if (!Number.isFinite(result)) {
    throw new ExpressionError("Expression result is not a finite number");
  }
  return result;
};

/**
 * Syntax-only check used by API validation. Every name resolves to 1, so
 * only the structure of the expression is verified.
 */
export const validateExpressionSyntax = (expression: string): void => {
  const tokens = tokenizeExpression(expression);
  if (tokens.length === 0) throw new ExpressionError("Expression is empty");
  parseTokens(tokens, () => 1);
};
