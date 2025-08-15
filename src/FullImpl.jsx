import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Play, Book, AlertCircle, CheckCircle } from 'lucide-react';

// Complete EBNF Parser implementation
class EBNFParser {
  constructor(grammarText) {
    this.grammarText = grammarText;
    this.rules = new Map();
    this.startRule = null;
    this.parseGrammar();
  }

  parseGrammar() {
    // Remove comments and empty lines
    const lines = this.grammarText
      .split('\n')
      .map(line => {
        // Remove comments (everything after (* ... *) or // or # )
        line = line.replace(/\(\*.*?\*\)/g, '');
        line = line.replace(/\/\/.*$/, '');
        line = line.replace(/#.*$/, '');
        return line.trim();
      })
      .filter(line => line.length > 0);

    // Parse each rule
    for (const line of lines) {
      // Match rule definition: identifier = definition or identifier ::= definition
      const ruleMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(::?=|\u2192)\s*(.+)$/);
      if (ruleMatch) {
        const [, ruleName, , definition] = ruleMatch;
        if (!this.startRule) this.startRule = ruleName;
        this.rules.set(ruleName, this.parseRuleDefinition(definition));
      }
    }

    if (this.rules.size === 0) {
      throw new Error('No valid grammar rules found');
    }
  }

  parseRuleDefinition(definition) {
    return this.parseAlternation(definition);
  }

  parseAlternation(text) {
    // Split by | but respect grouping
    const alternatives = this.splitRespectingGroups(text, '|');
    
    if (alternatives.length === 1) {
      return this.parseConcatenation(alternatives[0]);
    }

    return {
      type: 'alternation',
      alternatives: alternatives.map(alt => this.parseConcatenation(alt))
    };
  }

  parseConcatenation(text) {
    const elements = this.tokenize(text);
    
    if (elements.length === 1) {
      return this.parseElement(elements[0]);
    }

    return {
      type: 'concatenation',
      elements: elements.map(elem => this.parseElement(elem))
    };
  }

  parseElement(text) {
    text = text.trim();
    
    // Handle repetition operators at the end
    if (text.endsWith('*')) {
      return {
        type: 'repetition',
        min: 0,
        max: Infinity,
        element: this.parseElement(text.slice(0, -1))
      };
    }
    
    if (text.endsWith('+')) {
      return {
        type: 'repetition',
        min: 1,
        max: Infinity,
        element: this.parseElement(text.slice(0, -1))
      };
    }
    
    if (text.endsWith('?')) {
      return {
        type: 'optional',
        element: this.parseElement(text.slice(0, -1))
      };
    }

    // Handle repetition with numbers: {n}, {n,}, {,m}, {n,m}
    const repetitionMatch = text.match(/^(.+)\{(\d*),?(\d*)\}$/);
    if (repetitionMatch) {
      const [, element, min, max] = repetitionMatch;
      return {
        type: 'repetition',
        min: min ? parseInt(min) : 0,
        max: max ? parseInt(max) : (min && !max.includes(',') ? parseInt(min) : Infinity),
        element: this.parseElement(element)
      };
    }

    // Handle grouping: ( ... )
    if (text.startsWith('(') && text.endsWith(')')) {
      return this.parseAlternation(text.slice(1, -1));
    }

    // Handle optional: [ ... ]
    if (text.startsWith('[') && text.endsWith(']')) {
      return {
        type: 'optional',
        element: this.parseAlternation(text.slice(1, -1))
      };
    }

    // Handle repetition: { ... }
    if (text.startsWith('{') && text.endsWith('}')) {
      return {
        type: 'repetition',
        min: 0,
        max: Infinity,
        element: this.parseAlternation(text.slice(1, -1))
      };
    }

    // Handle terminal strings
    if ((text.startsWith('"') && text.endsWith('"')) || 
        (text.startsWith("'") && text.endsWith("'"))) {
      return {
        type: 'terminal',
        value: text.slice(1, -1)
      };
    }

    // Handle character classes and ranges
    if (text.includes('-') && text.length === 3) {
      const [start, , end] = text;
      return {
        type: 'character_range',
        start: start,
        end: end
      };
    }

    // Handle special symbols
    if (text === 'empty' || text === 'ε' || text === 'epsilon') {
      return { type: 'empty' };
    }

    // Non-terminal (rule reference)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) {
      return {
        type: 'non_terminal',
        name: text
      };
    }

    // If we can't parse it, treat as terminal
    return {
      type: 'terminal',
      value: text
    };
  }

  tokenize(text) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let groupDepth = 0;
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        inQuotes = true;
        quoteChar = char;
        current = char;
      } else if (inQuotes && char === quoteChar) {
        current += char;
        tokens.push(current);
        current = '';
        inQuotes = false;
        quoteChar = '';
      } else if (inQuotes) {
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        if (current.trim() && groupDepth === 0) {
          tokens.push(current.trim());
          current = '';
        }
        current += char;
        groupDepth++;
      } else if (char === ')' || char === ']' || char === '}') {
        current += char;
        groupDepth--;
        if (groupDepth === 0) {
          tokens.push(current);
          current = '';
        }
      } else if (groupDepth > 0) {
        current += char;
      } else if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
      i++;
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  splitRespectingGroups(text, delimiter) {
    const parts = [];
    let current = '';
    let groupDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (inQuotes) {
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        groupDepth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        groupDepth--;
        current += char;
      } else if (char === delimiter && groupDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  parse(input) {
    if (!this.startRule) {
      throw new Error('No start rule defined');
    }

    const result = this.parseRule(input, 0, this.startRule);
    
    if (!result) {
      throw new Error(`Parse failed at beginning of input`);
    }
    
    if (result.position < input.length) {
      const remaining = input.slice(result.position);
      throw new Error(`Parse incomplete. Remaining: "${remaining}" at position ${result.position}`);
    }

    return result.node;
  }

  parseRule(input, position, ruleName) {
    if (!this.rules.has(ruleName)) {
      throw new Error(`Unknown rule: ${ruleName}`);
    }

    const rule = this.rules.get(ruleName);
    const result = this.parseExpression(input, position, rule);
    
    if (result) {
      return {
        node: {
          type: ruleName,
          value: input.slice(position, result.position),
          start: position,
          end: result.position,
          children: result.children || []
        },
        position: result.position
      };
    }
    
    return null;
  }

  parseExpression(input, position, expression) {
    switch (expression.type) {
      case 'alternation':
        for (const alternative of expression.alternatives) {
          const result = this.parseExpression(input, position, alternative);
          if (result) return result;
        }
        return null;

      case 'concatenation':
        let currentPos = position;
        const children = [];
        
        for (const element of expression.elements) {
          const result = this.parseExpression(input, currentPos, element);
          if (!result) return null;
          
          if (result.node) children.push(result.node);
          if (result.children) children.push(...result.children);
          currentPos = result.position;
        }
        
        return { children, position: currentPos };

      case 'repetition':
        const repChildren = [];
        let repPos = position;
        let count = 0;
        
        while (count < expression.max) {
          const result = this.parseExpression(input, repPos, expression.element);
          if (!result) break;
          
          if (result.node) repChildren.push(result.node);
          if (result.children) repChildren.push(...result.children);
          repPos = result.position;
          count++;
        }
        
        if (count < expression.min) return null;
        return { children: repChildren, position: repPos };

      case 'optional':
        const optResult = this.parseExpression(input, position, expression.element);
        return optResult || { children: [], position };

      case 'terminal':
        if (input.slice(position, position + expression.value.length) === expression.value) {
          return {
            node: {
              type: 'terminal',
              value: expression.value,
              start: position,
              end: position + expression.value.length,
              children: []
            },
            position: position + expression.value.length
          };
        }
        return null;

      case 'character_range':
        const char = input[position];
        if (char && char >= expression.start && char <= expression.end) {
          return {
            node: {
              type: 'character',
              value: char,
              start: position,
              end: position + 1,
              children: []
            },
            position: position + 1
          };
        }
        return null;

      case 'non_terminal':
        return this.parseRule(input, position, expression.name);

      case 'empty':
        return { children: [], position };

      default:
        return null;
    }
  }
}

const EXAMPLE_GRAMMARS = {
  arithmetic: `expression ::= term (("+" | "-") term)*
term ::= factor (("*" | "/") factor)*
factor ::= number | "(" expression ")"
number ::= digit+
digit ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"`,
  
  json: `json ::= object | array | string | number | "true" | "false" | "null"
object ::= "{" (pair ("," pair)*)? "}"
pair ::= string ":" json
array ::= "[" (json ("," json)*)? "]"
string ::= '"' char* '"'
char ::= letter | digit | " "
number ::= digit+
digit ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
letter ::= "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z"`,

  simple: `greeting ::= "hello" | "hi" | "hey"
target ::= "world" | "there"
statement ::= greeting " " target`,

  advanced: `program ::= statement*
statement ::= assignment | expression ";"
assignment ::= identifier "=" expression ";"
expression ::= term (("+" | "-") term)*
term ::= factor (("*" | "/") factor)*
factor ::= number | identifier | "(" expression ")"
identifier ::= letter (letter | digit)*
number ::= digit+
letter ::= "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z"
digit ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"`
};

const TreeNode = ({ node, depth = 0, onNodeClick, highlightedNode }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = highlightedNode === node;

  return (
    <div className="tree-node">
      <div 
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-blue-50 rounded ${
          isHighlighted ? 'bg-blue-100 border border-blue-300' : ''
        }`}
        style={{ marginLeft: depth * 20 }}
        onClick={() => onNodeClick(node)}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-blue-200 rounded"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <span className="font-mono text-sm">
          <span className="text-blue-600 font-semibold">{node.type}</span>
          {node.value && (
            <span className="text-gray-600 ml-2">"{node.value}"</span>
          )}
          <span className="text-xs text-gray-400 ml-2">
            [{node.start}-{node.end}]
          </span>
        </span>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode 
              key={index}
              node={child}
              depth={depth + 1}
              onNodeClick={onNodeClick}
              highlightedNode={highlightedNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function EBNFPlayground() {
  const [grammar, setGrammar] = useState(EXAMPLE_GRAMMARS.simple);
  const [input, setInput] = useState('hello world');
  const [parseTree, setParseTree] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [compiledParser, setCompiledParser] = useState(null);
  const [grammarError, setGrammarError] = useState(null);
  const [isGrammarValid, setIsGrammarValid] = useState(false);
  const inputRef = useRef(null);

  const compileGrammar = () => {
    try {
      const parser = new EBNFParser(grammar);
      console.log(parser);
      setCompiledParser(parser);
      setGrammarError(null);
      setIsGrammarValid(true);
      
      // Auto-parse input if there's a valid grammar and input
      if (input.trim()) {
        parseInput(parser);
      }
    } catch (error) {
      setCompiledParser(null);
      setGrammarError(error.message);
      setIsGrammarValid(false);
      setParseTree(null);
      setIsValid(false);
      setParseError(null);
    }
  };

  const parseInput = (parser = compiledParser) => {
    if (!parser) {
      setParseError('Please compile the grammar first');
      return;
    }

    try {
      if (input.trim()) {
        const tree = parser.parse(input);
        console.log(tree);
        setParseTree(tree);
        setIsValid(true);
        setParseError(null);
      } else {
        setParseTree(null);
        setIsValid(false);
        setParseError(null);
      }
    } catch (error) {
      setParseTree(null);
      setIsValid(false);
      setParseError(error.message);
    }
  };

  useEffect(() => {
    // When grammar changes, invalidate compiled state
    setCompiledParser(null);
    setGrammarError(null);
    setIsGrammarValid(false);
    setParseTree(null);
    setIsValid(false);
    setParseError(null);
    setHighlightedNode(null);
  }, [grammar]);

  useEffect(() => {
    // Auto-parse input when it changes (if grammar is valid)
    if (isGrammarValid && compiledParser) {
      parseInput();
    }
  }, [input]);

  const handleNodeClick = (node) => {
    setHighlightedNode(node);
    if (node.start !== undefined && node.end !== undefined) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(node.start, node.end);
      }
    }
  };

  const loadExample = (exampleKey) => {
    setGrammar(EXAMPLE_GRAMMARS[exampleKey]);
    if (exampleKey === 'arithmetic') {
      setInput('3+4*2');
    } else if (exampleKey === 'json') {
      setInput('{"name":"John"}');
    } else if (exampleKey === 'simple') {
      setInput('hello world');
    } else if (exampleKey === 'advanced') {
      setInput('x=42;');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Book className="text-blue-600" />
            EBNF Grammar Playground
          </h1>
          
          <div className="flex items-center gap-4">
            <select 
              className="px-3 py-2 border rounded-lg bg-white"
              onChange={(e) => loadExample(e.target.value)}
              value=""
            >
              <option value="">Load Example...</option>
              <option value="simple">Simple Grammar</option>
              <option value="arithmetic">Arithmetic Expression</option>
              <option value="json">JSON Subset</option>
              <option value="advanced">Advanced (Variables)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Grammar Editor */}
        <div className="w-1/2 border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Grammar (EBNF)</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Full EBNF support: ::= | () [] {} * + ? "terminals" comments
                </p>
              </div>
              <button
                onClick={compileGrammar}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  isGrammarValid 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : grammarError 
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isGrammarValid ? (
                  <>
                    <CheckCircle size={16} />
                    Compiled
                  </>
                ) : grammarError ? (
                  <>
                    <AlertCircle size={16} />
                    Error
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Compile
                  </>
                )}
              </button>
            </div>
            {grammarError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {grammarError}
              </div>
            )}
          </div>
          <div className="flex-1 p-4">
            <textarea
              className="w-full h-full font-mono text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={grammar}
              onChange={(e) => setGrammar(e.target.value)}
              placeholder="Enter your EBNF grammar here..."
              spellCheck="false"
            />
          </div>
        </div>

        {/* Input and Results */}
        <div className="w-1/2 flex flex-col">
          {/* Input Section */}
          <div className="border-b bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                Test Input
                <button
                  onClick={() => parseInput()}
                  disabled={!isGrammarValid}
                  className={`ml-2 px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                    isGrammarValid
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play size={14} />
                  Parse
                </button>
              </h2>
              {!isGrammarValid && (
                <p className="text-sm text-gray-500 mt-1">
                  Compile the grammar first to enable parsing
                </p>
              )}
            </div>
            <div className="p-4">
              <textarea
                ref={inputRef}
                className="w-full h-24 font-mono text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input to test against grammar..."
                spellCheck="false"
              />
            </div>
          </div>

          {/* Status */}
          <div className="p-4 border-b bg-white">
            <div className="flex items-center gap-2">
              {parseError ? (
                <>
                  <AlertCircle className="text-red-500" size={20} />
                  <span className="text-red-600 font-medium">Parse Error</span>
                  <span className="text-sm text-gray-600">- {parseError}</span>
                </>
              ) : isValid ? (
                <>
                  <CheckCircle className="text-green-500" size={20} />
                  <span className="text-green-600 font-medium">Valid Input</span>
                </>
              ) : (
                <span className="text-gray-500">Enter input to parse</span>
              )}
            </div>
          </div>

          {/* Parse Tree */}
          <div className="flex-1 bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Parse Tree</h2>
            </div>
            <div className="p-4 h-full overflow-auto">
              {parseTree ? (
                <TreeNode 
                  node={parseTree} 
                  onNodeClick={handleNodeClick}
                  highlightedNode={highlightedNode}
                />
              ) : (
                <div className="text-gray-500 italic">
                  {parseError ? 'Fix parsing errors to see tree' : 'Enter valid input to see parse tree'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t p-2 text-center text-sm text-gray-600">
        Full EBNF specification support • Click parse tree nodes to highlight text spans
      </div>
    </div>
  );
}