import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Play, Book, AlertCircle, CheckCircle, Save, Download, Upload, Trash2 } from 'lucide-react';
import { Grammars, IRule, IToken } from "ebnf";

const EXAMPLE_GRAMMARS = {
  equation: `<Equation>         ::= <BinaryOperation> | <Term>
<Term>             ::= "(" <RULE_WHITESPACE> <Equation> <RULE_WHITESPACE> ")" | "(" <RULE_WHITESPACE> <Number> <RULE_WHITESPACE> ")" | <RULE_WHITESPACE> <Number> <RULE_WHITESPACE>
<BinaryOperation>  ::= <Term> <RULE_WHITESPACE> <Operator> <RULE_WHITESPACE> <Term>

<Number>           ::= <RULE_NEGATIVE> <RULE_NON_ZERO> <RULE_NUMBER_LIST> | <RULE_NON_ZERO> <RULE_NUMBER_LIST> | <RULE_DIGIT>
<Operator>         ::= "+" | "-" | "*" | "/" | "^"

<RULE_NUMBER_LIST> ::= <RULE_DIGIT> <RULE_NUMBER_LIST> | <RULE_DIGIT>
<RULE_NEGATIVE>    ::= "-"
<RULE_NON_ZERO>    ::= "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
<RULE_DIGIT>       ::= "0" | <RULE_NON_ZERO>
<RULE_WHITESPACE>  ::= <RULE_WS> | ""
<RULE_WS>          ::= " " <RULE_WHITESPACE> | <EOL> <RULE_WHITESPACE> | " " | <EOL>`,
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
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-blue-50 rounded ${isHighlighted ? 'bg-blue-100 border border-blue-300' : ''
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
  const [grammar, setGrammar] = useState(EXAMPLE_GRAMMARS.equation);
  const [input, setInput] = useState('');
  const [parseTree, setParseTree] = useState<IToken | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [compiledParser, setCompiledParser] = useState<Grammars.BNF.Parser | null>(null);
  const [grammarError, setGrammarError] = useState<null | string>(null);
  const [isGrammarValid, setIsGrammarValid] = useState(false);
  const [selectedRule, setSelectedRule] = useState('');
  const [availableRules, setAvailableRules] = useState<IRule[]>([]);
  const [savedGrammars, setSavedGrammars] = useState({});
  const [saveGrammarName, setSaveGrammarName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load saved grammars from localStorage on component mount
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('ebnf-saved-grammars');
        if (saved) {
          setSavedGrammars(JSON.parse(saved));
        }
      }
    } catch (e) {
      console.error('Failed to load saved grammars:', e);
    }
  }, []);

  // Save grammars to localStorage whenever savedGrammars changes
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ebnf-saved-grammars', JSON.stringify(savedGrammars));
      }
    } catch (e) {
      console.error('Failed to save grammars:', e);
    }
  }, [savedGrammars]);

  const invalidateGrammar = (err: null | string) => {
    setCompiledParser(null);
    setGrammarError(err);
    setIsGrammarValid(false);
    setAvailableRules([]);
    setSelectedRule('');
    setParseTree(null);
    setIsValid(false);
    setParseError(null);
    setHighlightedNode(null);
  };

  const compileGrammar = () => {
    try {
      invalidateGrammar(null);
      // const parser = new EBNFParser(grammar);
      const processedGrammar = grammar.trim() + "\n";
      const parser = new Grammars.BNF.Parser(processedGrammar);
      setCompiledParser(parser);
      setGrammarError(null);
      setIsGrammarValid(true);

      // Extract available rules for the selector
      const rules = parser.grammarRules;
      setAvailableRules(rules);

      // Set default rule if none selected or if selected rule no longer exists
      if (!selectedRule || !rules.find(r => r.name === selectedRule)) {
        setSelectedRule(rules[0].name || '');
      }
    } catch (error) {
      invalidateGrammar(error.message);
    }
  };

  const invalidParse = (msg: string) => {
    setParseTree(null);
    setIsValid(false);
    setParseError(msg);
  };

  const parseInput = (parser = compiledParser) => {
    if (!parser) {
      setParseError('Please compile the grammar first');
      return;
    }
    
    try {
      input.trim();
      setParseTree(null);
      setIsValid(false);
      setParseError(null);

      const ruleToUse = selectedRule;
      if (!ruleToUse) {
        setParseError('No rule selected for parsing');
        return;
      }

      // Temporarily override the start rule if different
      const tree = parser.getAST(input, ruleToUse)
      console.log(`parsing: ${input}`, tree);
      if (!tree.errors || tree.errors.length === 0) {
        setIsValid(true);
        setParseError(null);
        setParseTree(tree);
      } else {
        invalidParse(tree.errors.map(e => e.message).join("\n"));
      }
    } catch (error) {
      invalidParse(error.message);
    }
  };

  useEffect(() => {
    // When grammar changes, invalidate compiled state
    invalidateGrammar(null);
  }, [grammar]);

  useEffect(() => {
    // Auto-parse input when it changes or when selected rule changes
    if (isGrammarValid && compiledParser && selectedRule) {
      parseInput();
    }
  }, [input, selectedRule]);

  const handleNodeClick = (node) => {
    setHighlightedNode(node);
    if (node.start !== undefined && node.end !== undefined) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(node.start, node.end);
      }
    }
  };

  const saveGrammar = () => {
    if (!saveGrammarName.trim()) return;

    setSavedGrammars(prev => ({
      ...prev,
      [saveGrammarName]: grammar
    }));
    setSaveGrammarName('');
    setShowSaveDialog(false);
  };

  const loadSavedGrammar = (name) => {
    if (savedGrammars[name]) {
      setGrammar(savedGrammars[name]);
    }
  };

  const deleteSavedGrammar = (name) => {
    setSavedGrammars(prev => {
      const newSaved = { ...prev };
      delete newSaved[name];
      return newSaved;
    });
  };

  const downloadGrammar = () => {
    const blob = new Blob([grammar], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grammar.ebnf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadGrammar = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGrammar(e.target.result);
      };
      reader.readAsText(file);
    }
    // Reset the file input
    event.target.value = '';
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

            {/* Saved Grammars Dropdown */}
            {Object.keys(savedGrammars).length > 0 && (
              <select
                className="px-3 py-2 border rounded-lg bg-white"
                onChange={(e) => e.target.value && loadSavedGrammar(e.target.value)}
                value=""
              >
                <option value="">Load Saved...</option>
                {Object.keys(savedGrammars).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {/* Grammar Management Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
                title="Save Grammar"
              >
                <Save size={16} />
              </button>

              <button
                onClick={downloadGrammar}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                title="Download Grammar"
              >
                <Download size={16} />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1"
                title="Upload Grammar"
              >
                <Upload size={16} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ebnf,.txt"
                onChange={uploadGrammar}
                className="hidden"
              />
            </div>
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
                  Full EBNF support: ::= | () [] { } * + ? "terminals" comments
                </p>
              </div>
              <button
                onClick={compileGrammar}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${isGrammarValid
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-gray-800">Test Input</h2>

                  {/* Rule Selector */}
                  {availableRules.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Parse as:</label>
                      <select
                        value={selectedRule}
                        onChange={(e) => setSelectedRule(e.target.value)}
                        className="px-2 py-1 border rounded text-sm bg-white"
                      >
                        {availableRules.map(rule => (
                          <option key={rule.name} value={rule.name}>{rule.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => parseInput()}
                  disabled={!isGrammarValid}
                  className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${isGrammarValid
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <Play size={14} />
                  Parse
                </button>
              </div>

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

      {/* Save Grammar Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Grammar</h3>
            <input
              type="text"
              value={saveGrammarName}
              onChange={(e) => setSaveGrammarName(e.target.value)}
              placeholder="Enter grammar name..."
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && saveGrammar()}
              autoFocus
            />

            {/* Show existing saved grammars for deletion */}
            {Object.keys(savedGrammars).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Grammars:</h4>
                <div className="max-h-32 overflow-y-auto">
                  {Object.keys(savedGrammars).map(name => (
                    <div key={name} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600">{name}</span>
                      <button
                        onClick={() => deleteSavedGrammar(name)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveGrammarName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveGrammar}
                disabled={!saveGrammarName.trim()}
                className={`px-4 py-2 rounded-lg ${saveGrammarName.trim()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}