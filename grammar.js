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
    // 1. Remove fragments (alpha/digit) from top-level choice to avoid conflicts
    source_file: ($) => repeat(choice($.number, $.string, $.identifier)),

    // 2. Wrap lexical rules in token() so they are treated as single atoms
    //    This prevents "123" from being parsed as [digit, digit, digit]
    number: ($) =>
      token(
        seq(
          /[0-9]+/, // One or more digits
          optional(seq(".", /[0-9]+/)), // Optional decimals
        ),
      ),

    string: ($) => token(seq('"', repeat(/[^"]/), '"')),

    // 3. Identifiers start with alpha, followed by alphanumeric
    identifier: ($) => token(seq(/[a-zA-Z_]/, repeat(/[a-zA-Z0-9_]/))),
  },
});
