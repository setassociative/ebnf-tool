export const EXAMPLE_GRAMMARS = {
    equation: `Equation         ::= BinaryOperation | Term
Term             ::= "(" RULE_WHITESPACE Equation RULE_WHITESPACE ")" | "(" RULE_WHITESPACE Number RULE_WHITESPACE ")" | RULE_WHITESPACE Number RULE_WHITESPACE
BinaryOperation  ::= Term RULE_WHITESPACE Operator RULE_WHITESPACE Term

Operator         ::= [+*/^-]
Number           ::= RULE_NEGATIVE? RULE_NON_ZERO RULE_DIGIT*

RULE_NEGATIVE    ::= "-"
RULE_NON_ZERO    ::= [1-9]
RULE_DIGIT       ::= "0" | RULE_NON_ZERO
RULE_WHITESPACE  ::= RULE_WS | ""
RULE_WS          ::= " " RULE_WHITESPACE | EOL RULE_WHITESPACE | " " | EOL`,
  
    json: `json   ::= object | array | quoted_string | number | "true" | "false" | "null"
object ::= "{" (pair ("," pair)*)? "}"
pair   ::= quoted_string ":" json
array  ::= "[" (json ("," json)*)? "]"
quoted_string ::= '"' string '"'
string ::= CHAR*
number ::= [1-9] DIGIT*
CHAR   ::= LETTER | DIGIT | " "
DIGIT  ::= [0-9]
LETTER ::= [a-zA-Z]`,
  
  advanced: `program    ::= statement*
statement  ::= assignment | expression ";"
assignment ::= identifier "=" expression ";"
expression ::= term (("+" | "-") term)*
term       ::= factor (("*" | "/") factor)*
factor     ::= number | identifier | "(" expression ")"
identifier ::= LETTER (LETTER | DIGIT)*
number     ::= DIGIT+
LETTER     ::= [a-zA-Z]
DIGIT      ::= [0-9]`
  };
  