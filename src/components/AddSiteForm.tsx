import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Search, X, Globe, ExternalLink, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from "../lib/utils";

interface AddSiteFormProps {
  onAdd: (name: string, url: string) => Promise<void>;
}

interface Suggestion {
  name: string;
  url: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function AddSiteForm({ onAdd }: AddSiteFormProps) {
  const [queryInput, setQueryInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 2 || input.includes("://") || input.includes("www.")) {
      return;
    }

    setIsFetchingSuggestions(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide 5 official website URL suggestions for the term "${input}". 
                   Return ONLY a JSON array of objects with "name" and "url" properties.
                   Example: [{"name": "YouTube", "url": "https://www.youtube.com"}, {"name": "YouTube Music", "url": "https://music.youtube.com"}]
                   Ensure the URLs are real, official, and include https://.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["name", "url"]
            }
          }
        }
      });

      const text = response.text || "[]";
      let data = JSON.parse(text);
      
      // Ensure all suggested URLs have a TLD
      data = data.map((s: Suggestion) => {
        if (!s.url.includes(".")) s.url += ".com";
        return s;
      });

      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryInput && !queryInput.includes(".") && !queryInput.includes("://")) {
        fetchSuggestions(queryInput);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [queryInput, fetchSuggestions]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput || isSubmitting) return;

    // Check if it's a valid URL format
    const isFullUrl = queryInput.includes(".") && (queryInput.startsWith("http") || queryInput.split(".").length >= 2);
    
    if (isFullUrl) {
      setIsSubmitting(true);
      let finalUrl = queryInput;
      if (!finalUrl.startsWith("http")) finalUrl = `https://${finalUrl}`;
      
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Extract the official brand name for this URL: ${finalUrl}. Reply ONLY with the name (e.g. "Google").`,
        });
        const name = response.text?.trim() || queryInput;
        await onAdd(name, finalUrl);
        setQueryInput("");
      } catch (err) {
        console.error("Error adding direct URL:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setIsSubmitting(true);
    setQueryInput(suggestion.name);
    setShowSuggestions(false);
    try {
      await onAdd(suggestion.name, suggestion.url);
      setQueryInput("");
      setSuggestions([]);
    } catch (err) {
      console.error("Error adding from suggestion:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFullUrl = queryInput.includes(".") && queryInput.length > 3;

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-12" id="add-site-form-container">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-white rounded-3xl shadow-xl border-2 border-gray-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden p-1.5">
          <div className="pl-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            {isFetchingSuggestions ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search app name (e.g. 'YouTube') or type URL..."
            className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-lg placeholder:text-gray-400 font-medium text-gray-900"
            disabled={isSubmitting}
            id="site-input"
          />

          <div className="flex items-center gap-2 pr-2">
            {queryInput && (
              <button
                type="button"
                onClick={() => {
                  setQueryInput("");
                  setSuggestions([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                id="clear-input"
              >
                <X size={18} />
              </button>
            )}
            
            <button
              type="submit"
              disabled={!isFullUrl || isSubmitting}
              className={cn(
                "px-6 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-0 disabled:pointer-events-none",
                "bg-gray-900 text-white hover:bg-black"
              )}
              id="add-site-btn"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden z-[60] py-2"
              id="suggestions-dropdown"
            >
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
                <Globe size={10} />
                <span>AI Suggestions</span>
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.url}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-5 py-3 flex items-center justify-between text-left transition-all hover:bg-blue-50 group/item"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/item:border-blue-200 group-hover/item:bg-white transition-colors">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(suggestion.url).hostname}&sz=64`}
                        alt=""
                        className="w-6 h-6 object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${suggestion.name}&background=random`;
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover/item:text-blue-600 transition-colors">{suggestion.name}</h4>
                      <p className="text-xs text-gray-400 font-mono truncate">{new URL(suggestion.url).hostname}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-blue-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <span className="text-xs font-bold">Select</span>
                    <ExternalLink size={14} />
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Helper text */}
      {!showSuggestions && !isFullUrl && queryInput.length > 0 && !isFetchingSuggestions && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-sm text-gray-400 font-medium"
        >
          Select from suggestions above or enter a full URL
        </motion.p>
      )}
    </div>
  );
}
