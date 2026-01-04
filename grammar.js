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
  DECL: 2,
  OR: 3,
  AND: 4,
  NOT: 5,
  NOT_EQUAL: 6,
  EQUALITY: 6,
  GREATER_EQUAL: 6,
  LESS_EQUAL: 6,
  GREATER: 6,
  LESS: 6,
  PLUS: 7,
  MINUS: 7,
  MULT: 8,
  DIV: 8,
  POW: 9,
  MOD: 9,
  DEFAULT_OP: 10,
  UNARY: 11,
  ARRAY: 12,
  FIELD_ACCESS: 13,
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
  supertypes: ($) => [
    $.expression,
    $.declaration,
    $.primary_expression,
    $.statement,
    $._literal,
    $._type,
    $._simple_type,
    $._unannotated_type,
  ],

  // =================================================================
  // Externals
  // =================================================================
  externals: ($) => [$._newline, $._indent, $._dedent],

  // =================================================================
  // Inline
  // =================================================================

  conflicts: ($) => [
    [$._simple_type, $.primary_expression],
    [$.compound_statement, $.expression],
  ],

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

    _toplevel_statement: ($) => choice($.statement),

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

    string_literal: ($) =>
      choice($._string_literal, $._interpolated_string_literal),

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

    _string_interpolation: ($) => seq("{", $.expression, "}"),

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
        $.switch_expression,
      ),

    assignment_expression: ($) =>
      prec.right(
        PREC.ASSIGN,
        seq(
          field(
            "left",
            choice($.identifier, $.field_access, $.array_access_expression),
          ),
          field("operator", choice("=", "+=", "-=", "*=", "/=")),
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

    primary_expression: ($) =>
      choice(
        $._literal,
        $.identifier,
        $.field_access,
        $.array_access_expression,
        $.array_creation_expression,
        $.function_invocation,
        $.group_expression,
        $.grouped_field_access,
        $.initializer,
        $.optional_chain,
        $.unwrap,
        $.extraction,
        $.range_expression,
      ),

    array_access_expression: ($) =>
      prec(
        PREC.ARRAY,
        seq(field("array", $.primary_expression), $.array_rank_specifier),
      ),

    array_creation_expression: ($) =>
      prec.right(
        seq(
          field("type", $._simple_type),
          $.array_rank_specifier,
          $.group_expression,
        ),
      ),

    group_expression: ($) => seq("(", sep($.expression, ","), ")"),

    function_invocation: ($) =>
      prec(
        PREC.UNARY,
        seq(
          choice(
            field("name", $.primary_expression),
            // Different invocations, e.g. with generic types can be added here
          ),
          field("arguments", $.group_expression),
        ),
      ),

    field_access: ($) =>
      prec(
        PREC.FIELD_ACCESS,
        seq(
          field("dataobj", $.primary_expression),
          ".",
          field("field", $.identifier),
        ),
      ),

    grouped_field_access: ($) =>
      prec(
        PREC.FIELD_ACCESS,
        seq(
          field("dataobj", $.primary_expression),
          ".",
          field("group", $.group_expression),
        ),
      ),

    initializer: ($) =>
      seq(field("type", $._simple_type), field("values", $.group_expression)),

    optional_chain: ($) =>
      prec(
        PREC.FIELD_ACCESS,
        seq(
          field("optional", $.primary_expression),
          "?.",
          field("field", $.identifier),
        ),
      ),

    unwrap: ($) =>
      prec.right(seq($.expression, "!", optional($.group_expression))),

    extraction: ($) => seq($.expression, "?", $.group_expression),

    range_expression: ($) =>
      prec.right(seq(optional($.expression), "..", optional($.expression))),

    switch_expression: ($) =>
      seq(
        "switch",
        sep1(field("subject", $.expression), ","),
        ":",
        field("body", alias($.switch_block, $.block)),
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
      prec(
        1,
        seq(
          choice($.identifier, $._literal),
          "->",
          choice($.expression_statement, $.block, $.throw_statement),
        ),
      ),

    // =================================================================
    // Clauses
    // =================================================================

    // TODO: Don't forget about those :)

    // =================================================================
    // Statements
    // =================================================================

    statement: ($) => choice($.simple_statement, $.compound_statement),

    simple_statement: ($) =>
      choice($.expression_statement, $.break_statement, ";"),

    block: ($) => seq(repeat($.statement), $._dedent),

    break_statement: ($) => seq("break", ";"),

    // =================================================================
    // Compound Statements
    // =================================================================

    compound_statement: ($) =>
      choice($.declaration, $.if_statement, $.switch_expression),

    if_statement: ($) =>
      prec.right(
        seq(
          "if",
          field("condition", $.expression),
          ":",
          field("consequence", $._suite),
          repeat(field("alternative", $.else_if_clause)),
          optional(field("alternative", $.else_clause)),
        ),
      ),

    else_if_clause: ($) =>
      seq(
        "else if",
        field("condition", $.expression),
        ":",
        field("consequence", $._suite),
      ),

    else_clause: ($) => seq("else", ":", field("body", $._suite)),

    expression_statement: ($) => seq($.expression, ";"),

    throw_statement: ($) => seq("throw", $.expression),

    // =================================================================
    // Declarations
    // =================================================================

    declaration: ($) =>
      prec(
        PREC.DECL,
        choice($.enum_declaration),
        // TODO: Add declarations
      ),

    enum_declaration: ($) =>
      seq("enum", field("name", $.identifier), ":", field("body", $.enum_body)),

    enum_body: ($) =>
      choice(
        seq($._indent, sep($.identifier, ","), optional(","), ";", $._dedent),
        $._newline,
      ),

    // =================================================================
    // Types
    // =================================================================

    _type: ($) =>
      choice(
        $._unannotated_type,
        // TODO: add support for annotated types
      ),

    _unannotated_type: ($) => choice($._simple_type, $.array_type),

    _simple_type: ($) =>
      choice(
        $.integral_type,
        $.floating_point_type,
        $.bool_type,
        $.void_type,
        alias($.identifier, $.type_identifier),
      ),

    array_type: ($) =>
      seq(
        field("element", $._unannotated_type),
        field("dimensions", $.array_rank_specifier),
      ),

    array_rank_specifier: ($) =>
      seq("[", sep(optional($.expression), ","), "]"),

    integral_type: ($) =>
      choice(
        "u8",
        "u32",
        "u32x2",
        "u32x3",
        "u32x4",
        "u32x8",
        "u64",
        "u64x2",
        "u64x3",
        "u64x4",
        "i32",
        "i64",
        "i32x2",
        "i32x3",
        "i32x4",
        "i32x8",
        "i64x2",
        "i64x3",
        "i64x4",
      ),

    floating_point_type: ($) =>
      choice(
        "f32",
        "f32x3",
        "f32x4",
        "f32x8",
        "f64",
        "f64x2",
        "f64x3",
        "f64x4",
      ),

    bool_type: (_) => "bool",
    void_type: (_) => "void",

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
    // Util
    // =================================================================

    _suite: ($) =>
      choice(
        alias($.simple_statement, $.block),
        seq($._indent, $.block),
        alias($._newline, $.block),
      ),

    dotted_name: ($) => prec(1, sep1($.identifier, ".")),

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
