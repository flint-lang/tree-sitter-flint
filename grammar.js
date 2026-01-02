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
  UNARY: 10,
};

export default grammar({
  name: "flint",

  // =================================================================
  // Extras
  // =================================================================
  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  // =================================================================
  // Supertypes
  // =================================================================
  supertypes: ($) => [$.expression],

  // =================================================================
  // Externals
  // =================================================================
  externals: ($) => [$._newline, $._indent, $._dedent],

  // =================================================================
  // Inline
  // =================================================================
  inline: ($) => [$._name],

  word: ($) => $.identifier,

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
        $.default_val,
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
    default_val: (_) => "_",

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

    expression: ($) =>
      choice(
        $.assignment_expression,
        $.binary_expression,
        $.update_expression,
        $.primary_expression,
        $.unary_expression,
        $.cast,
      ),

    assignment_expression: ($) =>
      prec.right(
        PREC.ASSIGN,
        seq(
          field(
            "left",
            choice(
              $.identifier,
              $.field_access, // TODO: to be implemented
              $.array_access_expression,
            ),
          ),
          field("operator", choice("=", "+=", "-=", "*=", "/=", ":=")),
          field("right", $.expression),
        ),
      ),

    binary_expression: ($) =>
      choice(
        ...[
          ["or", PREC.OR],
          ["and", PREC.AND],
          ["!=", PREC.NOT_EQUAL],
          ["==", PREC.EQUALITY],
          [">=", PREC.GREATER_EQUAL],
          ["<=", PREC.LESS_EQUAL],
          [">", PREC.GREATER],
          ["<", PREC.LESS],
          ["-", PREC.MINUS],
          ["+", PREC.PLUS],
          ["/", PREC.DIV],
          ["*", PREC.MULT],
          ["%", PREC.MOD],
          ["**", PREC.POW],
          ["??", PREC.DEFAULT_OP],
        ].map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq(
              field("left", $.expression),
              // @ts-ignore
              field("operator", operator),
              field("right", $.expression),
            ),
          ),
        ),
      ),

    unary_expression: ($) =>
      choice(
        ...[
          ["+", PREC.UNARY],
          ["-", PREC.UNARY],
          ["not", PREC.NOT],
        ].map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq(
              // @ts-ignore
              field("operator", operator),
              field("operand", $.expression),
            ),
          ),
        ),
      ),

    update_expression: ($) =>
      prec.left(
        PREC.UNARY,
        choice(
          seq($.expression, "++"),
          seq($.expression, "--"),
          seq("++", $.expression),
          seq("--", $.expression),
        ),
      ),

    cast: ($) =>
      seq(field("type", $._type), "(", field("value", $.expression), ")"),

    primary_expression: ($) =>
      choice(
        $._literal,
        $.identifier,
        $.field_access,
        $.array_access_expression,
        $.array_creation_expression,
        $.function_invocation,
      ),

    array_access_expression: ($) =>
      seq(
        field("array", $.primary_expression),
        "[",
        sep1(field("index", $.expression), ","),
        "]",
      ),

    array_creation_expression: ($) =>
      prec.right(
        seq(
          field("type", $._simple_type),
          $.dimension_expression,
          $.group_expression,
        ),
      ),

    dimension_expression: ($) => seq("[", sep1($.expression, ","), "]"),
    group_expression: ($) => seq("(", sep1($.expression, ","), ")"),

    function_invocation: ($) =>
      seq(
        choice(
          field("name", $.identifier),
          // Different invocations, e.g. with generic types can be added here
        ),
        field("arguments", $.argument_list),
      ),

    argument_list: ($) => seq("(", sep($.expression, ","), ")"),

    field_access: ($) =>
      seq(
        field("dataobj", $.primary_expression),
        ".",
        field("field", $.identifier),
      ),

    grouped_field_access: ($) =>
      seq(
        field("dataobj", $.primary_expression),
        ".",
        field("group", $.group_expression),
      ),

    initializer: ($) =>
      seq(field("type", $._simple_type), field("values", $.group_expression)),

    optional_chain: ($) =>
      seq(
        field("optional", $.primary_expression),
        "?.",
        field("field", $.identifier),
      ),

    unwrap: ($) =>
      choice(
        seq($.expression, "!"),
        seq($.expression, "!", $.group_expression),
      ),

    extraction: ($) => seq($.expression, "?", $.group_expression),

    range_expression: ($) =>
      seq(optional($.expression), "..", optional($.expression)),

    switch_expression: ($) =>
      seq(
        "switch",
        sep1(field("subject", $.expression), ","),
        ":",
        field("body", $.switch_block),
      ),

    // =================================================================
    // Blocks
    // =================================================================

    switch_block: ($) =>
      choice(
        seq($._indent, repeat(field("alternative", $.switch_rule)), $._dedent),
        $._newline,
      ),

    switch_rule: ($) =>
      seq(
        choice($.identifier, $._literal),
        "->",
        choice($.expression_statement, $.block, $.throw_statement),
      ),

    // =================================================================
    // Statements
    // =================================================================

    statement: ($) => choice($.block, $.expression_statement, ";"),

    block: ($) => seq(repeat($.statement), $._dedent),

    expression_statement: ($) => seq($.expression, ";"),

    throw_statement: ($) => seq("throw", $.expression, ";"),

    // =================================================================
    // Types
    // =================================================================

    _type: ($) =>
      choice(
        $._unannotated_type,
        // TODO: add support for annotated types
      ),

    _unannotated_type: ($) => choice($._simple_type),

    _simple_type: ($) =>
      choice(
        alias($.identifier, $.type_identifier),
        // TODO: add more types
      ),

    // =================================================================
    // Inline
    // =================================================================

    _name: ($) => choice($.identifier),

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
 * Creates a rule to match one or more occurences of `rule` separated by `seperator`
 *
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} seperator
 * @returns {SeqRule}
 */
function sep1(rule, seperator) {
  return seq(rule, repeat(seq(seperator, rule)));
}

/**
 * Creates a rule to match zero or more occurences of `rule` separated by `seperator`
 *
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} seperator
 * @returns {ChoiceRule}
 */
function sep(rule, seperator) {
  return optional(sep1(rule, seperator));
}
