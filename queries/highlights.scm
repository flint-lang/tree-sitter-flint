;=============================
; Variables
;=============================

(identifier) @variable

((identifier) @constant
  (#match? @constant "^[A-Z_$][A-Z\\d_$]*$"))

;=============================
; Functions
;=============================

(function_declaration
  name: (identifier) @function)

(call_expression
  name: (identifier) @function)

;=============================
; Parameters
;=============================

(parameter
    name: (identifier) @variable)

;=============================
; Operators
;=============================

[
 "or"
 "and"
 "!="
 "=="
 ">="
 "<="
 ">"
 "<"
 "-"
 "+"
 "/"
 "*"
 "%"
 "**"
 "??"
 ".."
 ":="
 "="
] @operator

;=============================
; Types
;=============================

(enum_declaration
  name: (identifier) @enum)

(enum_constant
  name: (identifier) @constant)

(type_identifier) @type

((call_expression
  name: (identifier) @constructor)
(#match? @constructor "^[A-Z]"))

((field_access
  object: (identifier) @type)
(#match? @type "^[A-Z]"))

[
  (bool_type)
  (void_type)
  (str_type)
  (integral_type)
  (floating_point_type)
] @type

;=============================
; Literals
;=============================

(character_literal) @string

(escape_sequence) @string.escape

(string_literal) @string

(interpolated_string_literal) @string

[
  (integer_literal)
  (float_literal)
] @number


[
  (true)
  (false)
] @boolean

[(none) (default_val)] @constant

;=============================
; Keywords
;=============================

;=============================
; Control Flow
;=============================

[
  "if"
  "else"
  "switch"
] @keyword

[
  "for"
  "while"
  "do"
  "continue"
  "break"
] @keyword

;=============================
; Includes
;=============================

"use" @keyword

;=============================
; Punctuation
;=============================

[
  ";"
  "."
  ","
] @punctuation.delimiter

[
  "{"
  "}"
] @punctuation.bracket

[
  "["
  "]"
] @punctuation.bracket

[
  "("
  ")"
] @punctuation.bracket

;=============================
; Exceptions
;=============================

[
  "throw"
  "catch"
] @keyword

;=============================
; Fields
;=============================

(field_access
  property: (identifier) @property)

;=============================
; Comments
;=============================

[
  (line_comment)
  (block_comment)
] @comment
