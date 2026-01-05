; Definitions

(typed_variable_declaration
  (_variable_declarator_id
    name: (identifier) @name)) @definition.variable

(inferred_variable_declaration
  (_variable_declarator_id
    name: (identifier) @name)) @definition.variable

(enhanced_for_statement
  (_variable_declarator_id
    name: (identifier) @name)) @definition.variable

(parameters
  (_variable_declarator_id
    name: (identifier) @name)) @definition.parameter

(function_declaration
  name: (identifier) @definition.function)

(enum_declaration
  name: (identifier) @definition.type)

(test_declaration
  name: (identifier), @definition.test)

; References

(function_invocation
  name: (identifier) @reference.call)

(function_invocation
  name: (scoped_identifier
    name: (identifier) @name)) @reference.call

(type_identifier) @name @reference.type

(array_creation_expression
  type: (_) @name) @reference.type

(use_clause
  (identifier) @name) @reference.import

(use_clause
  (scoped_identifier) @name) @reference.import
