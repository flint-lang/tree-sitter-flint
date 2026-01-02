/**
 * @file Tree Sitter grammar for the Flint programming language
 * @author Julius Grünberg <ghastcrafthd@troense.de>
 * @license Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const DIGITS = token(
  choice("0", seq(/[1-9]/, optional(seq(optional("_"), sep1(/[0-9]+/, /_+/))))),
);
const DECIMAL_DIGITS = token(sep1(/[0-9]+/, "_"));

const PREC = {
  COMMENT: 0,
  ASSIGN: 1,
  OR: 2,
  AND: 3,
  NOT: 4,
  NOT_EQUAL: 5,
  EQUALITY: 5,
  GREATER_EQUAL: 5,
  LESS_EQUAL: 5,
  GREATER: 5,
  LESS: 5,
  PLUS: 6,
  MINUS: 6,
  MULT: 7,
  DIV: 7,
  POW: 8,
  MOD: 8,
  DEFAULT_OP: 9,
};

export default grammar({
  name: "flint",

  // =================================================================
  // Extras
  // =================================================================
  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  rules: {
    // =================================================================
    // Top Level
    // =================================================================

    flint_file: ($) => repeat($._toplevel_statement),

    _toplevel_statement: ($) => choice(),
    // TODO: add statements :)

    // =================================================================
    // Literals
    // =================================================================

    _literal: ($) =>
      choice(
        $.decimal_integer_literal,
        $.decimal_floating_point_literal,
        $.true,
        $.false,
        $.none,
        $.character_literal,
        $.string_literal,
      ),

    decimal_integer_literal: (_) => token(seq(DIGITS)),

    decimal_floating_point_literal: (_) =>
      token(
        choice(
          seq(
            DECIMAL_DIGITS,
            ".",
            optional(DECIMAL_DIGITS),
            optional(/[fFdD]/),
          ),
          seq(".", DECIMAL_DIGITS, optional(/[fFdD]/)),
        ),
      ),

    true: (_) => "true",
    false: (_) => "false",
    none: (_) => "none",

    character_literal: (_) =>
      token(seq("'", choice(/[^\\'\n]/, /\\./, /\\\n/), "'")),

    string_literal: ($) => choice($._string_literal),

    _interpolated_string_literal: ($) =>
      seq(
        '$"',
        repeat(
          choice(
            $._string_fragment,
            $._string_interpolation,
            $.escape_sequence,
          ),
        ),
        '"',
      ),

    _string_literal: ($) =>
      seq('"', repeat(choice($._string_fragment, $.escape_sequence)), '"'),

    _string_fragment: (_) => token.immediate(prec(1, /[^"\\]+/)),

    _string_interpolation: ($) => seq("{", $.expression, "}"), // TODO: Add expressions

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/, // octal
            /x[0-9a-fA-F]{2}/, // hex
            /u[0-9a-fA-F]{4}/, // unicode fixed
            /u\{[0-9a-fA-F]+\}/, // unicode extended
          ),
        ),
      ),

    // =================================================================
    // Expressions
    // =================================================================

    expression: ($) => choice(),

    // =================================================================
    // Identifier
    // =================================================================

    // https://docs.oracle.com/javase/specs/jls/se8/html/jls-3.html#jls-IdentifierChars
    identifier: (_) => /[\p{XID_Start}_$][\p{XID_Continue}_$]*/u,

    // =================================================================
    // Comments
    // =================================================================

    line_comment: (_) => token(prec(PREC.COMMENT, seq("//", /[^\n]*/))),

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    block_comment: (_) =>
      token(prec(PREC.COMMENT, seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"))),
  },
});

/**
 * Creates a rule to match one or more occurenced of `rule` separated by `seperator`
 *
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} seperator
 * @returns {SeqRule}
 */
function sep1(rule, seperator) {
  return seq(rule, repeat(seq(seperator, rule)));
}
