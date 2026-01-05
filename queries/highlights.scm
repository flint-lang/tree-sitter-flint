; Variables

(identifier) @variable

(parameters
  (variable_declarator_id
    name: (identifier) @variable.parameter))

(field_access
  field: (identifier) @property)

(grouped_field_access
  (group_expression
    (identifier) @property))

(optional_chain
  field: (identifier) @property)

((scoped_identifier
   name: (identifier) @constant)
 (#match? @constant "^[A-Z]"))

; Functions

(function_declaration
  name: (identifier) @function)

(function_invocation
  name: (identifier) @function)

(function_invocation
  name: (field_access
    field: (identifier) @function.method))

; Types

(type_identifier) @type

(enum_declaration
  name: (identifier) @type)

((identifier) @type (#match? @type "^[A-Z]"))

[
  (bool_type)
  (void_type)
  (str_type)
  (floating_point_type)
  (integral_type)
] @type.builtin

; Literals
[
  (decimal_integer_literal)
  (decimal_floating_point_literal)
] @number

(character_literal) @character

(string_literal) @string

(escape_sequence) @string.escape

(interpolated_string_literal) @string

(
  (interpolated_string_literal
    "{" @punctuation.special
    "}" @punctuation.special)
)

[
  (true)
  (false)
  (none)
  (default_val)
] @constant.builtin

[
  (line_comment)
  (block_comment)
] @comment

; Keywords

[
  "aligned"
  "as"
  "async"
  "break"
  "catch"
  "const"
  "continue"
  "data"
  "def"
  "do"
  "else"
  "entity"
  "enum"
  "error"
  "export"
  "extends"
  "extern"
  "for"
  "func"
  "hook"
  "if"
  "link"
  "lock"
  "mut"
  "parallel"
  "persistent"
  "requires"
  "return"
  "shared"
  "spawn"
  "switch"
  "sync"
  "test"
  "throw"
  "type"
  "use"
  "variant"
  "while"
] @keyword

; Operators

[
  "+" "-" "*" "/" "%" "**"
  "=" "+=" "-=" "*=" "/="
  "==" "!=" "<" ">" "<=" ">="
  "->" ":=" "!" "?" "?." ".."
  "and"
  "or"
  "not"
  "in"
] @operator

; Punctuations

[
  "(" ")" "[" "]" "{" "}"
] @punctuation.bracket

[
  "." "," ":" ";"
] @punctuation.delimiter