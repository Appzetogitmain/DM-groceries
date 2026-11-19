import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import VoiceSearchOverlay from "./VoiceSearchOverlay";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import MicIcon from "@mui/icons-material/Mic";
import HistoryIcon from "@mui/icons-material/History";
import NorthWestIcon from "@mui/icons-material/NorthWest";
import { customerApi } from "../../services/customerApi";
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { getJSON, setJSON, STORAGE_KEYS } from "@core/utils/storage";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { cn } from "@/lib/utils";

const MAX_PRODUCT_SUGGESTIONS = 8;
const MAX_RECENT = 4;
const DEBOUNCE_MS = 200;

const readRecent = () => {
  const saved = getJSON(STORAGE_KEYS.RECENT_SEARCHES, []);
  return Array.isArray(saved) ? saved.filter((s) => typeof s === "string") : [];
};

const saveRecent = (term) => {
  const t = term.trim();
  if (!t) return;
  const updated = [t, ...readRecent().filter((s) => s !== t)].slice(0, 10);
  setJSON(STORAGE_KEYS.RECENT_SEARCHES, updated);
};

const extractProducts = (data) => {
  const raw = data?.result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw)) return raw;
  return [];
};

/** Bold the part of `text` that matches `query` (case-insensitive). */
const Highlight = ({ text, query }) => {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="font-extrabold text-slate-900">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
};

/**
 * Header search input with a live suggestion dropdown.
 * As the user types (even a single letter), matching products are fetched and
 * shown below the bar; picking one, or pressing Enter, opens the search page.
 */
const HeaderSearchBox = ({ variant = "desktop", placeholder, backgroundColor }) => {
  const navigate = useNavigate();
  const { currentLocation } = useAppLocation();
  const isMobile = variant === "mobile";

  const formRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState(null);

  const trimmed = query.trim();
  const lat = currentLocation?.latitude;
  const lng = currentLocation?.longitude;

  // Fetch product suggestions (debounced, latest request wins)
  useEffect(() => {
    if (!trimmed) {
      setProducts([]);
      setIsLoading(false);
      return undefined;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = { search: trimmed, limit: 20 };
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          params.lat = lat;
          params.lng = lng;
        }
        const response = await customerApi.getProducts(params);
        if (requestId !== requestIdRef.current) return;
        const term = trimmed.toLowerCase();
        const items = extractProducts(response?.data)
          .filter((p) => p?.name)
          // Names that start with the typed text come first, then the rest
          .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(term) ? 0 : 1;
            const bStarts = b.name.toLowerCase().startsWith(term) ? 0 : 1;
            return aStarts - bStarts || a.name.localeCompare(b.name);
          })
          .slice(0, MAX_PRODUCT_SUGGESTIONS);
        setProducts(items);
      } catch {
        if (requestId === requestIdRef.current) setProducts([]);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, lat, lng]);

  const matchingRecent = useMemo(() => {
    const term = trimmed.toLowerCase();
    return recent
      .filter((s) => !term || s.toLowerCase().includes(term))
      .slice(0, MAX_RECENT);
  }, [recent, trimmed]);

  // Flat list of options for keyboard navigation
  const options = useMemo(
    () => [
      ...matchingRecent.map((term) => ({ type: "recent", key: `r-${term}`, term })),
      ...products.map((p) => ({ type: "product", key: `p-${p._id || p.id}`, term: p.name, product: p })),
    ],
    [matchingRecent, products],
  );

  useEffect(() => setActiveIndex(-1), [trimmed]);

  const showDropdown =
    isFocused && (options.length > 0 || (trimmed && (isLoading || products.length === 0)));

  // Keep the dropdown anchored under the bar (header animates on scroll)
  useLayoutEffect(() => {
    if (!showDropdown) return undefined;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (formRef.current) setRect(formRef.current.getBoundingClientRect());
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [showDropdown]);

  const goToSearch = (term) => {
    const t = term.trim();
    if (!t) return;
    saveRecent(t);
    setRecent(readRecent());
    setIsFocused(false);
    inputRef.current?.blur();
    navigate(`/user/search?q=${encodeURIComponent(t)}`, { state: { query: t } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const picked = activeIndex >= 0 ? options[activeIndex] : null;
    goToSearch(picked ? picked.term : query);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || options.length === 0) {
      if (e.key === "Escape") inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSearchIconClick = (e) => {
    e.preventDefault();
    if (trimmed) goToSearch(query);
    else inputRef.current?.focus();
  };

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const handleMicClick = (e) => {
    e.preventDefault();
    inputRef.current?.blur();
    setIsVoiceOpen(true);
  };

  const closeVoice = useCallback(() => setIsVoiceOpen(false), []);

  const handleVoiceResult = useCallback(
    (text) => {
      setIsVoiceOpen(false);
      setQuery(text);
      goToSearch(text);
    },
    // goToSearch only uses stable setters/navigate
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const listboxId = `header-search-suggestions-${variant}`;

  const dropdown =
    showDropdown && rect
      ? createPortal(
          <div
            id={listboxId}
            role="listbox"
            // Keep input focus while tapping inside the dropdown
            onMouseDown={(e) => e.preventDefault()}
            style={{
              position: "fixed",
              top: rect.bottom + 6,
              left: rect.left,
              width: rect.width,
              maxHeight: `calc(100vh - ${Math.round(rect.bottom) + 24}px)`,
            }}
            className="z-[300] overflow-y-auto rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl">
            {matchingRecent.length > 0 && (
              <p className="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recent searches
              </p>
            )}
            {options.map((opt, index) => {
              const isActive = index === activeIndex;
              const isFirstProduct = opt.type === "product" && index === matchingRecent.length;
              return (
                <React.Fragment key={opt.key}>
                  {isFirstProduct && (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Suggestions
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToSearch(opt.term)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-600 transition-colors",
                      isActive ? "bg-slate-100" : "hover:bg-slate-50",
                    )}>
                    {opt.type === "recent" ? (
                      <HistoryIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                    ) : opt.product.mainImage || opt.product.image ? (
                      <img
                        src={applyCloudinaryTransform(
                          opt.product.mainImage || opt.product.image,
                          "f_auto,q_auto,w_80",
                        )}
                        alt=""
                        loading="lazy"
                        className="h-8 w-8 shrink-0 rounded-md bg-slate-50 object-contain"
                      />
                    ) : (
                      <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                    )}
                    <span className="flex-1 truncate font-medium">
                      <Highlight text={opt.term} query={trimmed} />
                    </span>
                    <NorthWestIcon
                      sx={{ fontSize: 16, color: "#cbd5e1" }}
                      onClick={(e) => {
                        // Fill the input with this suggestion without searching yet
                        e.stopPropagation();
                        setQuery(opt.term);
                        inputRef.current?.focus();
                      }}
                    />
                  </button>
                </React.Fragment>
              );
            })}
            {trimmed && isLoading && products.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Searching…</p>
            )}
            {trimmed && !isLoading && products.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">
                No products found for “{trimmed}”
              </p>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <motion.form
        ref={formRef}
        role="search"
        onSubmit={handleSubmit}
        whileHover={isMobile ? undefined : { scale: 1.01 }}
        style={{ backgroundColor }}
        className={cn(
          "flex items-center border border-white/50 shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-400/60",
          isMobile ? "flex-1 h-10 rounded-[10px] px-3" : "h-11 rounded-full px-4",
        )}>
        <button
          type="button"
          aria-label="Search"
          onClick={handleSearchIconClick}
          className="flex cursor-pointer items-center border-0 bg-transparent p-0">
          <SearchIcon sx={{ color: "#000000", fontSize: isMobile ? 18 : 20 }} />
        </button>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={Boolean(showDropdown)}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setRecent(readRecent());
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Search Products..."}
          className={cn(
            "flex-1 border-none bg-transparent pl-2 font-semibold text-slate-800 outline-none placeholder:text-black",
            isMobile ? "text-[16px]" : "text-[15px]",
          )}
        />
        <button
          type="button"
          aria-label="Voice search"
          onClick={handleMicClick}
          className={cn(
            "flex cursor-pointer items-center gap-2 border-0 border-l border-slate-100 bg-transparent",
            isMobile ? "pl-2.5" : "pl-3",
          )}>
          <MicIcon sx={{ color: "#000000", fontSize: isMobile ? 18 : 20 }} />
        </button>
      </motion.form>
      {dropdown}
      {isVoiceOpen && (
        <VoiceSearchOverlay onClose={closeVoice} onResult={handleVoiceResult} />
      )}
    </>
  );
};

export default HeaderSearchBox;
