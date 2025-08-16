export const EXAMPLE_GRAMMARS = {
    equation: `Equation         ::= BinaryOperation | Term
Term             ::= "(" RULE_WS* Equation RULE_WS* ")"
                   | "(" RULE_WS* Number RULE_WS* ")"
                   | RULE_WS* Number RULE_WS*
BinaryOperation  ::= Term RULE_WS* Operator RULE_WS* Term

Operator         ::= [+*/^-]
Number           ::= RULE_NEGATIVE? RULE_NON_ZERO RULE_DIGIT*

RULE_NEGATIVE    ::= "-"
RULE_NON_ZERO    ::= [1-9]
RULE_DIGIT       ::= "0" | RULE_NON_ZERO
RULE_WS          ::= [#x20#x09#x0A#x0D]   /* Space | Tab | \n | \r */`,
  
    json: `json   ::= object | array | quoted_string | number | "true" | "false" | "null"
object ::= "{" WS* (pair (WS* "," WS* pair)*)? WS* "}"
pair   ::= quoted_string WS* ":" WS* json
array  ::= "[" WS* (json (WS* "," WS* json)*)? WS* "]"
quoted_string ::= '"' string '"'
string ::= CHAR*
number ::= [1-9] DIGIT*
CHAR   ::= LETTER | DIGIT | " "
DIGIT  ::= [0-9]
LETTER ::= [a-zA-Z]
WS     ::= NBWS | EOL
NBWS   ::= [#x20#x09]   /* Space | Tab */
EOL    ::= [#x0A#x0D]   /* \\n | \\r */`,
  
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
  
export const EXAMPLE_INPUTS = {
  equation: "(100 + 200) / 3",
  json: `{
	"name": "setassociative",
	"dependencies": [
		"react",
		"vite",
		"typescript",
		"ebnf"
	]
}`,
  advanced: "",
}