import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Newspaper, LayoutGrid } from 'lucide-react';
import { NewsAnalysis } from '../types';

type Suggestion = {
  type: 'news' | 'category';
  text: string;
  value: string;
  subtitle?: string;
};

interface SearchAutocompleteProps {
  allNews: NewsAnalysis[];
  categories: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectCategory: (c: string) => void;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  allNews,
  categories,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync inputValue when searchQuery is reset externally (e.g. top-bar clear)
  useEffect(() => {
    if (searchQuery === '' && inputValue !== '') {
      setInputValue('');
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [searchQuery]);

  const computeSuggestions = useCallback(
    (query: string): Suggestion[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const catMatches: Suggestion[] = categories
        .filter(c => c !== 'Todos' && c.toLowerCase().includes(q))
        .map(c => ({ type: 'category', text: c, value: c, subtitle: 'Categoria' }));

      const seenTitles = new Set<string>();
      const newsMatches: Suggestion[] = [];
      for (const n of allNews) {
        const title = n.title?.trim();
        if (!title || seenTitles.has(title)) continue;
        if (title.toLowerCase().includes(q)) {
          seenTitles.add(title);
          newsMatches.push({
            type: 'news',
            text: title,
            value: title,
            subtitle: n.category,
          });
        }
      }

      return [...catMatches, ...newsMatches].slice(0, 5);
    },
    [allNews, categories]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    debounceRef.current = setTimeout(() => {
      const computed = computeSuggestions(val);
      setSuggestions(computed);
      setIsOpen(true);
    }, 200);
  };

  const selectSuggestion = (s: Suggestion) => {
    setInputValue(s.value);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightIndex(-1);
    if (s.type === 'category') {
      onSelectCategory(s.value);
      setSearchQuery('');
    } else {
      setSearchQuery(s.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Cancel any pending debounce so dropdown won't open after Enter
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (isOpen && highlightIndex >= 0 && suggestions[highlightIndex]) {
        selectSuggestion(suggestions[highlightIndex]);
      } else {
        setIsOpen(false);
        setSuggestions([]);
        setSearchQuery(inputValue);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setIsOpen(false);
      setSuggestions([]);
      setInputValue('');
      setSearchQuery('');
      setHighlightIndex(-1);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : -1));
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightIndex(-1);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && inputValue.trim().length > 0;

  return (
    <div ref={containerRef} className="relative px-4 pb-2">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          data-testid="search-autocomplete-input"
          type="text"
          placeholder="Buscar notícias..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 pr-7 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-slate-700 placeholder-slate-400"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-slate-600 transition"
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          data-testid="search-suggestions-dropdown"
          className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {suggestions.length === 0 ? (
            <div
              data-testid="search-no-results"
              className="px-4 py-3 text-xs text-slate-400 italic"
            >
              Nenhum resultado
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={`${s.type}-${s.value}`}
                data-testid="search-suggestion-item"
                onClick={() => selectSuggestion(s)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === highlightIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.type === 'category' ? (
                  <LayoutGrid size={14} className="shrink-0 text-blue-500" />
                ) : (
                  <Newspaper size={14} className="shrink-0 text-slate-400" />
                )}
                <span className="truncate flex-1">{s.text}</span>
                {s.type === 'category' && (
                  <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">
                    Categoria
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
