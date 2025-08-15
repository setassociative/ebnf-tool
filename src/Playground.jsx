import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Play, Book, AlertCircle, CheckCircle } from 'lucide-react';
import { Grammars } from 'ebnf';

const EBNF = Grammars.BNF;

const EXAMPLE_GRAMMARS = {
  bnf: `<Equation>         ::= <BinaryOperation> | <Term>
<Term>             ::= "(" <RULE_WHITESPACE> <Equation> <RULE_WHITESPACE> ")" | "(" <RULE_WHITESPACE> <Number> <RULE_WHITESPACE> ")" | <RULE_WHITESPACE> <Number> <RULE_WHITESPACE>
<BinaryOperation>  ::= <Term> <RULE_WHITESPACE> <Operator> <RULE_WHITESPACE> <Term>

<Number>           ::= <RULE_NEGATIVE> <RULE_NON_ZERO> <RULE_NUMBER_LIST> | <RULE_NON_ZERO> <RULE_NUMBER_LIST> | <RULE_DIGIT>
<Operator>         ::= "+" | "-" | "*" | "/" | "^"

<RULE_NUMBER_LIST> ::= <RULE_DIGIT> <RULE_NUMBER_LIST> | <RULE_DIGIT>
<RULE_NEGATIVE>    ::= "-"
<RULE_NON_ZERO>    ::= "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
<RULE_DIGIT>       ::= "0" | <RULE_NON_ZERO>
<RULE_WHITESPACE>  ::= <RULE_WS> | ""
<RULE_WS>          ::= " " <RULE_WHITESPACE> | <EOL> <RULE_WHITESPACE> | " " | <EOL>
`,
  arithmetic: `expression ::= term (("+" | "-") term)*
term ::= factor (("*" | "/") factor)*
factor ::= number | "(" expression ")"
number ::= [0-9]+`,
  
  json: `json ::= object | array | string | number | "true" | "false" | "null"
object ::= "{" (pair ("," pair)*)? "}"
pair ::= string ":" json
array ::= "[" (json ("," json)*)? "]"
string ::= '"' [^"]* '"'
number ::= [0-9]+`,

  simple: `greeting ::= "hello" | "hi" | "hey"
target ::= "world" | "there"
statement ::= greeting target?`
};

// Convert EBNF parse result to our tree format
const convertToTreeNode = (node, input, start = 0) => {
  if (typeof node === 'string') {
    return {
      type: 'terminal',
      value: node,
      start: start,
      end: start + node.length,
      children: []
    };
  }

  if (Array.isArray(node)) {
    let currentPos = start;
    const children = [];
    
    for (const child of node) {
      const childNode = convertToTreeNode(child, input, currentPos);
      children.push(childNode);
      currentPos = childNode.end;
    }
    
    return {
      type: 'sequence',
      value: input.slice(start, currentPos),
      start: start,
      end: currentPos,
      children: children
    };
  }

  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if (keys.length === 1) {
      const ruleName = keys[0];
      const ruleValue = node[ruleName];
      const childNode = convertToTreeNode(ruleValue, input, start);
      
      return {
        type: ruleName,
        value: input.slice(start, childNode.end),
        start: start,
        end: childNode.end,
        children: Array.isArray(ruleValue) ? childNode.children : [childNode]
      };
    }
  }

  return {
    type: 'unknown',
    value: String(node),
    start: start,
    end: start + String(node).length,
    children: []
  };
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
  const [grammar, setGrammar] = useState(EXAMPLE_GRAMMARS.bnf);
  const [input, setInput] = useState('');
  const [parseTree, setParseTree] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [parser, setParser] = useState(null);
  const inputRef = useRef(null);


  const compileGrammar = () => {
      try {
        setParser(null);
        const newParser = new EBNF.Parser(grammar);
        setParser(newParser);
      } catch (error) {
        setParseError("Invalid Grammar: " + error.message);
        console.log(grammar)
        console.log(error)
      }
  };

  const parseInput = (parser, input) => {
    if (!parser) {
      setIsValid(false);
      setParseError("No valid grammar, compile first");
      return;
    }

    try {
      if (input.trim()) {
        // Parse the input
        const result = parser.getAST(input);
        console.log(result);
        
        // Convert to our tree format
        const tree = convertToTreeNode(result, input, 0);
        setParseTree(tree);
        setIsValid(true);
        setParseError(null);
      } else {
        setParseTree(null);
        setIsValid(false);
        setParseError(null);
      }
    } catch (error) {
      console.log(error);
      setParseTree(null);
      setIsValid(false);
      setParseError(error.message);
    }
  };

  const handleNodeClick = (node) => {
    setHighlightedNode(node);
    if (node.start !== undefined && node.end !== undefined) {
      // Highlight text in input area
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(node.start, node.end);
      }
    }
  };

  const loadExample = (exampleKey) => {
    setGrammar(EXAMPLE_GRAMMARS[exampleKey]);
    // Set appropriate example input
    if (exampleKey === 'arithmetic') {
      setInput('3+4*2');
    } else if (exampleKey === 'json') {
      setInput('{"name":"John"}');
    } else if (exampleKey === 'simple') {
      setInput('hello world');
    } else { 
      setInput("");
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
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
              <option value="bnf">BNF Default</option>
              <option value="simple">Simple Grammar</option>
              <option value="arithmetic">Arithmetic Expression</option>
              <option value="json">JSON Subset</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Grammar Editor */}
        <div id="editor-div" className="border-r bg-white flex flex-col" style={{width: "80%"}}>
          <div className="p-4 border-b bg-gray-50 flex flex-row">
            <h2 className="flex font-semibold text-gray-800">Grammar (EBNF)</h2>
            <div className="flex items-end inline-flex">
              <button
                onClick={compileGrammar}
                className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <Play size={14} />
                Compile
              </button>
            </div>
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
                  onClick={() => parseInput(parser, input)}
                  className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                >
                  <Play size={14} />
                  Parse
                </button>
              </h2>
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
        Click on parse tree nodes to highlight corresponding text • Real EBNF parsing with position tracking
      </div>
    </div>
  );
}