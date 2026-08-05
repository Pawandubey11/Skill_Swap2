import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    mermaid.contentLoaded();
  }, [content]);

  return (
    <div className="prose prose-invert prose-lime max-w-none">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match && match[1] === 'mermaid';

            if (!inline && isMermaid) {
              return (
                <div className="mermaid flex justify-center py-8">
                  {String(children).replace(/\n$/, '')}
                </div>
              );
            }

            return !inline ? (
              <pre className="bg-navy-3 border border-white/10 p-4 rounded-xl overflow-x-auto text-sm">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-white/10 text-lime px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt }) {
            return (
              <img 
                src={src} 
                alt={alt} 
                className="rounded-2xl border border-white/10 w-full shadow-xl shadow-black/40 my-8 max-h-[500px] object-cover" 
              />
            );
          },
          h1({ children }) {
            return <h1 className="font-playfair text-4xl font-bold mt-12 mb-6 border-b border-white/10 pb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="font-playfair text-2xl font-bold mt-10 mb-4 text-lime">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="font-bold text-xl mt-8 mb-3 text-gold">{children}</h3>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
