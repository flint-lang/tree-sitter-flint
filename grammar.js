/**
 * @file Tree Sitter grammar for the Flint programming language
 * @author Julius Grünberg <ghastcrafthd@troense.de>
 * @license MIT
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
    [$._compound_statement, $.expression],
    [$.primary_expression, $.scoped_identifier],
    [$.expression, $.call_expression],
    [$.primary_expression, $._unannotated_type],
    [$._variable_declarator_id, $._unannotated_type],
    [$.array_creation_expression, $.array_type],
  ],

  // =================================================================
  // Inline
  // =================================================================
  inline: ($) => [$._name, $._simple_type],

  word: ($) => $.identifier,

  rules: {
    // =================================================================
    // Top Level
    // =================================================================

    file: ($) => repeat($._toplevel_statement),

    _toplevel_statement: ($) => choice($.statement, $.clause),

    // =================================================================
    // Literals
    // =================================================================

    _literal: ($) =>
      choice(
        $.integer_literal,
        $.float_literal,
        $.true,
        $.false,
        $.none,
        $.default_val,
        $.character_literal,
        $._string_literal,
      ),

    integer_literal: (_) => token(seq(DIGITS)),

    float_literal: (_) =>
      token(
        choice(
          seq(DECIMAL_DIGITS, ".", DECIMAL_DIGITS, optional(/[fFdD]/)),
          seq(".", DECIMAL_DIGITS, optional(/[fFdD]/)),
        ),
      ),

    true: (_) => "true",
    false: (_) => "false",
    none: (_) => "none",
    default_val: (_) => "_",

    character_literal: (_) =>
      token(seq("'", choice(/[^\\'\n]/, /\\./, /\\\n/), "'")),

    _string_literal: ($) =>
      choice($.string_literal, $.interpolated_string_literal),

    interpolated_string_literal: ($) =>
      seq(
        '$"',
        repeat(
          choice($.string_fragment, $.string_interpolation, $.escape_sequence),
        ),
        '"',
      ),

    string_literal: ($) =>
      seq('"', repeat(choice($.string_fragment, $.escape_sequence)), '"'),

    string_fragment: (_) => token.immediate(prec(1, /[^"\\{}]+/)),

    string_interpolation: ($) =>
      field("interpolation", seq("{", $.expression, "}")),

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[\{\}]/, // interpoolation
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
            choice(
              $.identifier,
              $.field_access,
              $.array_access_expression,
              $.group_expression,
              $.grouped_field_access,
            ),
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
        $.call_expression,
        $.group_expression,
        $.grouped_field_access,
        $.optional_chain,
        $.unwrap,
        $.extraction,
        $.range_expression,
      ),

    array_access_expression: ($) =>
      prec(
        PREC.ARRAY,
        seq(field("array", $._variable_declarator_id), $.array_rank_specifier),
      ),

    array_creation_expression: ($) =>
      prec.right(
        seq(
          field("type", $._unannotated_type),
          $.array_rank_specifier,
          $.argument_list,
        ),
      ),

    group_expression: ($) =>
      seq(
        "(",
        sep(
          field("group_member", choice($.expression, $._unannotated_type)),
          ",",
        ),
        ")",
      ),

    call_expression: ($) =>
      seq(
        field("name", choice($.primary_expression, $._unannotated_type)),

        field("arguments", $.argument_list),
      ),

    field_access: ($) =>
      prec(
        PREC.FIELD_ACCESS,
        seq(
          field("object", $.primary_expression),
          ".",
          field("property", $.identifier),
        ),
      ),

    grouped_field_access: ($) =>
      prec(
        PREC.FIELD_ACCESS,
        seq(
          field("object", $.primary_expression),
          ".",
          field("group", $.group_expression),
        ),
      ),

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
      prec.right(
        PREC.FIELD_ACCESS,
        seq(optional($.expression), "..", optional($.expression)),
      ),

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
          choice("->", ":"),
          choice($.expression_statement, $._suite, $.throw_statement),
        ),
      ),

    block: ($) => seq(repeat($.statement), $._dedent),

    // =================================================================
    // Clauses
    // =================================================================

    clause: ($) => choice($.use_clause),

    use_clause: ($) => seq("use", choice($._name, $._string_literal)),

    // =================================================================
    // Statements
    // =================================================================

    statement: ($) =>
      choice($._simple_statement, $._compound_statement, $.reserved),

    _simple_statement: ($) =>
      choice(
        $.expression_statement,
        $.break_statement,
        ";",
        $.throw_statement,
        $.return_statement,
      ),

    break_statement: ($) => seq("break", ";"),

    return_statement: ($) => seq("return", $.expression, ";"),

    expression_statement: ($) => seq($.expression, ";"),

    throw_statement: ($) => seq("throw", $.expression),

    // =================================================================
    // Compound Statements
    // =================================================================

    _compound_statement: ($) =>
      choice(
        $.declaration,
        $.if_statement,
        $.switch_expression,
        $.do_statement,
        $.while_statement,
        $.enhanced_for_statement,
        $.catch_statement,
      ),

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

    do_statement: ($) =>
      seq(
        "do",
        ":",
        field("body", $._suite),
        "while",
        field("condition", $.expression),
        ";",
      ),

    while_statement: ($) =>
      seq(
        "while",
        field("condition", $.expression),
        ":",
        field("body", $._suite),
      ),

    enhanced_for_statement: ($) =>
      seq(
        "for",
        sep1(choice($.typed_variable_declarator, $.default_val), ","),
        "in",
        field("value", $.expression),
        ":",
        field("body", $._suite),
      ),

    catch_statement: ($) =>
      seq(
        $.call_expression,
        "catch",
        $.group_expression,
        ":",
        field("body", $._suite),
      ),

    // =================================================================
    // Declarations
    // =================================================================

    declaration: ($) =>
      prec(
        PREC.DECL,
        choice(
          $.enum_declaration,
          $.variable_declaration,
          $.function_declaration,
          $.test_declaration,
        ),
        // TODO: Add declarations
      ),

    enum_declaration: ($) =>
      seq("enum", field("name", $.identifier), ":", field("body", $.enum_body)),

    enum_constant: ($) => field("name", $.identifier),

    enum_body: ($) =>
      choice(
        seq(
          $._indent,
          sep($.enum_constant, ","),
          optional(","),
          ";",
          $._dedent,
        ),
        $._newline,
      ),

    variable_declaration: ($) =>
      seq(
        optional("mut"),
        field(
          "declarator",
          choice($.typed_variable_declarator, $.inferred_variable_declarator),
        ),
      ),

    typed_variable_declarator: ($) =>
      seq(
        field("type", $._unannotated_type),
        $._variable_declarator_id,
        optional(seq("=", field("value", $._variable_initializer))),
      ),

    inferred_variable_declarator: ($) =>
      seq(
        choice($._variable_declarator_id, $.group_expression),
        ":=",
        field("value", $._variable_initializer),
      ),

    _variable_declarator_id: ($) =>
      field("name", choice($.identifier, $.default_val)),

    _variable_initializer: ($) => $.expression,

    test_declaration: ($) =>
      seq(
        "test",
        field("name", $._string_literal),
        ":",
        field("body", $._suite),
      ),

    function_declaration: ($) =>
      seq(
        "def",
        field("name", $.identifier),
        field("parameters", $.parameters),
        optional(seq("->", field("return_type", $._type))),
        ":",
        field("body", $._suite),
      ),

    parameters: ($) => seq("(", sep($.parameter, ","), ")"),

    parameter: ($) =>
      seq(
        optional("mut"),
        field("type", $._unannotated_type),
        field("name", $._variable_declarator_id),
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
        prec(1, $.integral_type),
        prec(1, $.floating_point_type),
        prec(1, $.bool_type),
        prec(1, $.void_type),
        prec(1, $.str_type),
        alias($.identifier, $.type_identifier),
        $.scoped_identifier,
      ),

    array_type: ($) =>
      seq(
        field("element", $._unannotated_type),
        field("dimensions", $.array_rank_specifier),
      ),

    array_rank_specifier: ($) =>
      seq("[", sep(field("rank", optional($.expression)), ","), "]"),

    integral_type: ($) =>
      choice(
        "bool8",
        "u8",
        "u8x2",
        "u8x3",
        "u8x4",
        "u8x8",
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
        "f32x2",
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
    str_type: (_) => "str",

    // =================================================================
    // Inline
    // =================================================================

    _name: ($) => choice($.identifier, $.scoped_identifier),

    // =================================================================
    // Identifier
    // =================================================================

    // https://docs.oracle.com/javase/specs/jls/se8/html/jls-3.html#jls-IdentifierChars
    identifier: (_) => /[\p{XID_Start}_$][\p{XID_Continue}_$]*/u,

    scoped_identifier: ($) =>
      seq(field("scope", $._name), ".", field("name", $.identifier)),

    // =================================================================
    // Util
    // =================================================================

    argument_list: ($) =>
      seq("(", sep(field("argument", $.expression), ","), ")"),

    _suite: ($) =>
      choice(
        alias($._simple_statement, $.block),
        seq($._indent, $.block),
        alias($._newline, $.block),
      ),

    dotted_name: ($) => prec(1, sep1($.identifier, ".")),

    reserved: (_) =>
      prec(
        -5,
        choice(
          "aligned",
          "as",
          "async",
          "break",
          "catch",
          "const",
          "continue",
          "data",
          "def",
          "do",
          "else",
          "entity",
          "enum",
          "error",
          "export",
          "extends",
          "extern",
          "for",
          "func",
          "hook",
          "if",
          "link",
          "lock",
          "mut",
          "parallel",
          "persistent",
          "requires",
          "return",
          "shared",
          "spawn",
          "switch",
          "sync",
          "test",
          "throw",
          "type",
          "use",
          "variant",
          "while",
        ),
      ),

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
