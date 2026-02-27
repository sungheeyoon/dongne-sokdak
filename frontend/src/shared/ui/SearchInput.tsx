'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, MapPin, X, FileText, Loader2 } from 'lucide-react';

export interface SearchResult {
  id: string;
  type: 'location' | 'text';
  title: string;
  subtitle?: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  category?: string;
}

export interface SearchInputProps {
  mode: 'location' | 'text' | 'unified';
  placeholder?: string;
  results?: SearchResult[];
  isLoading?: boolean;
  showResults?: boolean;
  onSearch: (query: string, mode: 'location' | 'text') => void;
  onResultSelect?: (result: SearchResult) => void;
  onClear?: () => void;
  onModeChange?: (mode: 'location' | 'text') => void;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLDivElement, SearchInputProps>(
  ({ 
    mode,
    placeholder,
    results = [],
    isLoading = false,
    showResults = false,
    onSearch,
    onResultSelect,
    onClear,
    onModeChange,
    className,
    ...props 
  }, ref) => {
    const [query, setQuery] = useState('');
    const [currentMode, setCurrentMode] = useState<'location' | 'text'>(
      mode === 'unified' ? 'location' : mode
    );
    const [isResultsVisible, setIsResultsVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // 디바운스 검색
    useEffect(() => {
      if (query.length < 2) {
        setIsResultsVisible(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        onSearch(query, currentMode);
        setIsResultsVisible(true);
      }, 300);

      return () => clearTimeout(timeoutId);
    }, [query, currentMode, onSearch]);

    // 결과 표시 상태 업데이트
    useEffect(() => {
      setIsResultsVisible(showResults);
    }, [showResults]);

    // 외부 클릭 시 결과창 닫기
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
          setIsResultsVisible(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModeChange = (newMode: 'location' | 'text') => {
      setCurrentMode(newMode);
      setQuery('');
      setIsResultsVisible(false);
      onModeChange?.(newMode);
      inputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim(), currentMode);
      }
    };

    const handleClear = () => {
      setQuery('');
      setIsResultsVisible(false);
      onClear?.();
      inputRef.current?.focus();
    };

    const handleResultClick = (result: SearchResult) => {
      setQuery(result.title);
      setIsResultsVisible(false);
      onResultSelect?.(result);
    };

    const getPlaceholder = () => {
      if (placeholder) return placeholder;
      return currentMode === 'location' 
        ? "동네, 건물명, 지번을 검색하세요"
        : "제보 제목이나 내용으로 검색...";
    };

    const getIcon = () => {
      return currentMode === 'location' ? MapPin : FileText;
    };

    const Icon = getIcon();

    return (
      <div className={clsx('relative', className)} ref={ref} {...props}>
        {/* Mode Toggle (Unified mode only) */}
        {mode === 'unified' && (
          <div className="flex mb-3 bg-gray-100 rounded-lg p-1 max-w-lg">
            {(['location', 'text'] as const).map((tabMode) => (
              <button
                key={tabMode}
                onClick={() => handleModeChange(tabMode)}
                className={clsx(
                  'flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all flex-1 justify-center',
                  currentMode === tabMode
                    ? 'bg-[rgb(var(--primary-white))] text-[rgb(var(--primary-blue))] shadow-sm'
                    : 'text-[rgba(var(--primary-dark-brown),_0.7)] hover:'
                )}
              >
                {tabMode === 'location' ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{tabMode === 'location' ? '위치 검색' : '제보 검색'}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-[rgb(var(--primary-blue))]" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) {
                setIsResultsVisible(true);
              }
            }}
            className={clsx(
              'w-full pl-10 pr-16 py-3',
              'border-2 border-blue-200',
              'rounded-lg',
              'focus:outline-none focus:border-[rgb(var(--primary-blue))] focus:ring-2 focus:ring-blue-200',
              ' font-medium',
              'placeholder:text-[rgba(var(--primary-dark-brown),_0.5)] placeholder:font-normal',
              'transition-all duration-[var(--transition-fast)]'
            )}
            placeholder={getPlaceholder()}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="mr-2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {currentMode === 'text' && (
              <button
                type="submit"
                className={clsx(
                  'bg-[rgb(var(--primary-blue))] hover:bg-blue-700',
                  'text-[rgb(var(--primary-white))]',
                  'px-3 rounded-r-lg font-semibold',
                  'transition-colors duration-[var(--transition-fast)]',
                  'h-full'
                )}
              >
                검색
              </button>
            )}
            
            {currentMode === 'location' && isLoading && (
              <div className="pr-3">
                <Loader2 className="h-5 w-5 text-[rgb(var(--primary-blue))] animate-spin" />
              </div>
            )}
          </div>
        </form>

        {/* Search Results */}
        {currentMode === 'location' && isResultsVisible && (
          <div 
            ref={resultsRef}
            className={clsx(
              'absolute top-full left-0 right-0 mt-1',
              'bg-[rgb(var(--primary-white))]',
              'border border-gray-200',
              'rounded-lg shadow-lg z-50',
              'max-h-80 overflow-y-auto'
            )}
          >
            {isLoading ? (
              <div className="p-4 text-center text-[rgba(var(--primary-dark-brown),_0.6)]">
                <Loader2 className="h-6 w-6 text-[rgb(var(--primary-blue))] animate-spin mx-auto mb-2" />
                검색 중...
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={clsx(
                      'w-full px-4 py-3 text-left',
                      'hover:bg-[rgba(var(--primary-light-beige),_0.5)]',
                      'border-b border-gray-100 last:border-b-0',
                      'transition-colors duration-[var(--transition-fast)]'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-[rgb(var(--primary-blue))] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium  truncate">
                            {result.title}
                          </div>
                          {result.category && (
                            <div className="text-xs text-[rgb(var(--primary-blue))] bg-blue-50 px-2 py-1 rounded">
                              {result.category}
                            </div>
                          )}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-[rgba(var(--primary-dark-brown),_0.7)] truncate">
                            {result.subtitle}
                          </div>
                        )}
                        {result.description && (
                          <div className="text-xs text-[rgba(var(--primary-dark-brown),_0.5)] mt-1">
                            {result.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-[rgba(var(--primary-dark-brown),_0.6)]">
                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>'{query}' 검색 결과가 없습니다</p>
                <p className="text-sm text-[rgba(var(--primary-dark-brown),_0.4)] mt-1">
                  다른 키워드로 검색해보세요
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';