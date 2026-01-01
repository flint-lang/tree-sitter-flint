/**
 * @file Tree Sitter grammar for the Flint programming language
 * @author Julius Grünberg <ghastcrafthd@troense.de>
 * @license Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "flint",

  rules: {
    _reserved_identifier: (_) =>
      choice(
        "def",
        "data",
        "func",
        "entity",
        "enum",
        "variant",
        "error",
        "test",
        "extern",
        "export",
      ),

    // Definition of the number literal rule
    // Contains rules for integer and floating point number literals
    number_literal: (_) => {
      const sign = /[-\+]/;
      const seperator = "_";
      const decimal = /[0-9]/;
      const firstDecimal = /[0-9]/;
      const intDecimalDigits = seq(
        firstDecimal,
        repeat(decimal),
        repeat(seq(seperator, repeat1(decimal))),
      );
      const floatDecimalDigits = seq(
        repeat1(decimal),
        repeat(seq(seperator, repeat1(decimal))),
      );

      return token(
        seq(
          optional(sign), // + or - in front of the number
          choice(
            seq(
              choice(intDecimalDigits), // integer definition
              // optional int suffixes can be defined here
            ),
            seq(
              choice(
                seq(floatDecimalDigits, ".", optional(floatDecimalDigits)), // float definition like 3.5
                seq(".", floatDecimalDigits), // float denifition like .5
              ),
              // optional float suffixes can be added here
            ),
          ),
        ),
      );
    },

    // Definition of comments in flint
    comment: (_) =>
      token(
        choice(
          seq("//", /[^\n\r]*/), // single line comments
          seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"), // multiline comments
        ),
      ),
  },
});
