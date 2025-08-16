import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { IToken } from 'ebnf';

export interface TreeNodeProps {
    node: IToken;
    depth: number;
    onNodeClick: (node: IToken) => void;
    highlightedNode: IToken | null;
};

const TreeNode = ({ node, depth = 0, onNodeClick, highlightedNode }: TreeNodeProps) => {
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

export default TreeNode;