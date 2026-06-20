import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80';

export default function CoffeeSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [coffeeInfo, setCoffeeInfo] = useState(null);

  // Default initial search
  useEffect(() => {
    handleSearch('Cappuccino');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (coffeeName) => {
    const searchName = coffeeName || query;
    if (!searchName || searchName.trim() === '') {
      setError('Please enter a coffee name.');
      setSuccessMsg('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setCoffeeInfo(null);

    try {
      const response = await fetch('https://api.sampleapis.com/coffee/hot');
      if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
      }

      const data = await response.json();
      const nameLower = searchName.trim().toLowerCase();
      const match = data.find(item => 
        item.title.toLowerCase().includes(nameLower) || 
        nameLower.includes(item.title.toLowerCase())
      );

      if (match && match.image) {
        setImageSrc(match.image);
        setCoffeeInfo(match);
        setSuccessMsg(`Found: ${match.title}`);
      } else {
        setImageSrc(FALLBACK_IMAGE_URL);
        setError(`Coffee "${searchName}" not found. Showing default.`);
      }
    } catch (err) {
      console.error(err);
      setImageSrc(FALLBACK_IMAGE_URL);
      setError('Failed to fetch from API. Showing default coffee image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-4">
      {/* Decorative Blur Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl p-6 md:p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-950" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8h1a4 4 0 010 8h-1"/>
                <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
                <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/>
                <line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Coffee Directory
              </h1>
              <p className="text-xs text-gray-400">Discover and preview beverages</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/pos')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/80 text-xs font-semibold rounded-xl transition-all duration-200"
          >
            ← Back to POS
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search coffee by name (e.g. Latte, Espresso, Cortado)..."
            className="flex-1 bg-gray-800/85 border border-gray-700/80 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all duration-200 text-sm"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-bold px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
            ) : 'Search'}
          </button>
        </div>

        {/* Results layout */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Image Frame */}
          <div className="relative aspect-video md:aspect-square w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              </div>
            )}
            
            {imageSrc ? (
              <img
                id="coffee-image"
                src={imageSrc}
                alt={coffeeInfo ? coffeeInfo.title : 'Coffee Preview'}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={() => {
                  setImageSrc(FALLBACK_IMAGE_URL);
                  setError('Image failed to load. Using fallback.');
                }}
              />
            ) : (
              <div className="text-gray-600 text-6xl">☕</div>
            )}
          </div>

          {/* Details & Info */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="bg-gray-800/40 border border-gray-800/80 rounded-2xl p-5 flex-1 flex flex-col justify-center">
              {coffeeInfo ? (
                <div className="space-y-3">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-400/10 rounded-full border border-amber-400/20">
                    Active Match
                  </span>
                  <h2 className="text-xl font-bold text-white">{coffeeInfo.title}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed">{coffeeInfo.description}</p>
                  
                  {coffeeInfo.ingredients && coffeeInfo.ingredients.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ingredients</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {coffeeInfo.ingredients.map((ing, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-gray-800/80 border border-gray-700/60 rounded-lg text-gray-300">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6">
                  <p className="text-sm">Search for a coffee to view information & ingredients</p>
                </div>
              )}
            </div>

            {/* Notification messages */}
            {(error || successMsg) && (
              <div className={`p-4 rounded-xl border text-sm flex items-center gap-2.5 transition-all ${
                error 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <span>{error ? '⚠' : '✓'}</span>
                <span>{error || successMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Pills */}
        <div className="mt-6 pt-5 border-t border-gray-800/80">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center md:text-left">
            Popular Searches
          </h4>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {['Black Coffee', 'Latte', 'Cappuccino', 'Americano', 'Macchiato', 'Irish Coffee'].map((name) => (
              <button
                key={name}
                onClick={() => {
                  setQuery(name);
                  handleSearch(name);
                }}
                className="text-xs px-3.5 py-1.5 bg-gray-800/50 hover:bg-amber-500/15 border border-gray-700/50 hover:border-amber-500/50 hover:text-amber-400 rounded-full transition-all duration-200"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
