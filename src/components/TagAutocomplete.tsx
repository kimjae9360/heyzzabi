'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagAutocompleteProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: readonly string[];
  placeholder?: string;
  accent?: 'blue' | 'violet' | 'emerald';
}

const ACCENT = {
  blue: { chip: 'bg-blue-100 text-blue-700', ring: 'focus-within:ring-blue-100 focus-within:border-blue-500', check: 'accent-blue-600' },
  violet: { chip: 'bg-violet-100 text-violet-700', ring: 'focus-within:ring-violet-100 focus-within:border-violet-500', check: 'accent-violet-600' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', ring: 'focus-within:ring-emerald-100 focus-within:border-emerald-500', check: 'accent-emerald-600' },
};

export default function TagAutocomplete({ value, onChange, suggestions, placeholder, accent = 'blue' }: TagAutocompleteProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const colors = ACCENT[accent];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowBrowse(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (!value.some(v => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setInput('');
    setShowDropdown(false);
  };

  const removeTag = (tag: string) => onChange(value.filter(v => v !== tag));

  const toggleSuggestion = (s: string) => {
    if (value.some(v => v.toLowerCase() === s.toLowerCase())) removeTag(value.find(v => v.toLowerCase() === s.toLowerCase())!);
    else onChange([...value, s]);
  };

  const filtered = input.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(input.trim().toLowerCase()) && !value.some(v => v.toLowerCase() === s.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div ref={wrapRef} className="relative">
      <div className={cn("flex flex-wrap items-center gap-1.5 w-full border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:bg-white transition-all focus-within:ring-2", colors.ring)}>
        {value.map(tag => (
          <span key={tag} className={cn("flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-bold", colors.chip)}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-60"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(input); }
            else if (e.key === 'Backspace' && !input && value.length > 0) removeTag(value[value.length - 1]);
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm py-0.5"
        />
        <button
          type="button"
          onClick={() => { setShowBrowse(v => !v); setShowDropdown(false); }}
          title="전체 목록에서 찾아보기"
          className="shrink-0 p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
        >
          <ListFilter className="w-4 h-4" />
        </button>
      </div>

      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showBrowse && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-56 overflow-y-auto grid grid-cols-2 gap-x-2">
          {suggestions.map(s => (
            <label key={s} className="flex items-center gap-1.5 px-1.5 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={value.some(v => v.toLowerCase() === s.toLowerCase())}
                onChange={() => toggleSuggestion(s)}
                className={colors.check}
              />
              <span className="truncate">{s}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
