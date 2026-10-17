import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isValid, startOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import 'react-day-picker/style.css';

const MIN_YEAR = 1920;
const DEFAULT_START = new Date(2000, 0, 1);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Date-of-birth field with a calendar popup.
 * Header pills open a year grid / month grid, so picking an old year is two taps
 * instead of scrolling a native <select>. No future dates.
 * value / onChange use ISO "yyyy-MM-dd" strings, same as <input type="date">.
 */
const DobPicker = ({ value, onChange, placeholder = 'Date of Birth (Optional)', themeColor = '#1A4516' }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
    const [month, setMonth] = useState(DEFAULT_START);
    const wrapperRef = useRef(null);
    const yearsRef = useRef(null);
    const activeYearRef = useRef(null);

    const selected = value && isValid(parseISO(value)) ? parseISO(value) : undefined;
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => currentYear - i);

    const openPicker = () => {
        setMonth(selected ? startOfMonth(selected) : DEFAULT_START);
        setView('days');
        setOpen(true);
    };

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // Bring the opened calendar into view on small screens.
    useEffect(() => {
        if (!open) return undefined;
        const t = setTimeout(() => wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        return () => clearTimeout(t);
    }, [open]);

    // In the year grid, scroll the grid itself (not the page) so the active year is centred.
    useEffect(() => {
        if (view !== 'years') return;
        const box = yearsRef.current;
        const el = activeYearRef.current;
        if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    }, [view]);

    const handleSelect = (date) => {
        onChange(date ? format(date, 'yyyy-MM-dd') : '');
        setOpen(false);
    };

    const clampToToday = (date) => (date > today ? startOfMonth(today) : date);
    const pickYear = (year) => {
        setMonth(clampToToday(new Date(year, month.getMonth(), 1)));
        setView('months');
    };
    const pickMonth = (monthIndex) => {
        setMonth(new Date(month.getFullYear(), monthIndex, 1));
        setView('days');
    };

    const canGoPrev =
        view === 'days'
            ? month > new Date(MIN_YEAR, 0, 1)
            : month.getFullYear() > MIN_YEAR;
    const canGoNext =
        view === 'days'
            ? month < startOfMonth(today)
            : month.getFullYear() < currentYear;
    const shift = (dir) => {
        const next = view === 'days'
            ? new Date(month.getFullYear(), month.getMonth() + dir, 1)
            : clampToToday(new Date(month.getFullYear() + dir, month.getMonth(), 1));
        setMonth(next);
    };

    const accentSoft = `color-mix(in srgb, ${themeColor} 14%, white)`;
    const pillClass =
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold text-gray-800 hover:bg-gray-100 transition-colors';
    const cellClass = 'rounded-xl py-2.5 text-sm font-bold transition-colors';
    const navClass =
        'h-9 w-9 inline-flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent';

    return (
        <div className="relative group" ref={wrapperRef}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                <CalendarIcon size={18} style={open ? { color: themeColor } : undefined} />
            </div>

            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : openPicker())}
                className={`w-full text-left bg-gray-50 border rounded-2xl pl-12 pr-11 py-4 text-sm font-bold outline-none transition-all ${
                    selected ? 'text-gray-800' : 'text-[#757575]'
                } ${open ? 'bg-white' : 'border-gray-100'}`}
                style={open ? { borderColor: themeColor } : undefined}
            >
                {selected ? format(selected, 'dd MMM yyyy') : placeholder}
            </button>

            {selected && (
                <button
                    type="button"
                    aria-label="Clear date of birth"
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                    <X size={16} />
                </button>
            )}

            {open && (
                <div
                    role="dialog"
                    aria-label="Choose date of birth"
                    className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-2xl"
                    style={{
                        '--rdp-accent-color': themeColor,
                        '--rdp-accent-background-color': accentSoft,
                        '--rdp-day-height': '38px',
                        '--rdp-day-width': '38px',
                    }}
                >
                    {/* Header: prev | month | year | next */}
                    <div className="mb-2 flex items-center justify-between">
                        <button
                            type="button"
                            aria-label="Previous"
                            className={`${navClass} ${view === 'years' ? 'invisible' : ''}`}
                            disabled={!canGoPrev}
                            onClick={() => shift(-1)}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                className={pillClass}
                                style={view === 'months' ? { background: accentSoft, color: themeColor } : undefined}
                                onClick={() => setView(view === 'months' ? 'days' : 'months')}
                            >
                                {MONTHS[month.getMonth()]}
                                <ChevronDown size={14} />
                            </button>
                            <button
                                type="button"
                                className={pillClass}
                                style={view === 'years' ? { background: accentSoft, color: themeColor } : undefined}
                                onClick={() => setView(view === 'years' ? 'days' : 'years')}
                            >
                                {month.getFullYear()}
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        <button
                            type="button"
                            aria-label="Next"
                            className={`${navClass} ${view === 'years' ? 'invisible' : ''}`}
                            disabled={!canGoNext}
                            onClick={() => shift(1)}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {view === 'days' && (
                        <div className="flex justify-center">
                            <DayPicker
                                mode="single"
                                selected={selected}
                                onSelect={handleSelect}
                                month={month}
                                onMonthChange={setMonth}
                                hideNavigation
                                components={{ MonthCaption: () => null }}
                                startMonth={new Date(MIN_YEAR, 0)}
                                endMonth={today}
                                disabled={{ after: today }}
                                showOutsideDays
                            />
                        </div>
                    )}

                    {view === 'months' && (
                        <div className="grid grid-cols-3 gap-2 py-1">
                            {MONTHS.map((name, index) => {
                                const isFuture = new Date(month.getFullYear(), index, 1) > today;
                                const isActive = index === month.getMonth();
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        disabled={isFuture}
                                        onClick={() => pickMonth(index)}
                                        className={`${cellClass} ${isActive ? 'text-white' : 'text-gray-700 hover:bg-gray-100'} disabled:opacity-30 disabled:hover:bg-transparent`}
                                        style={isActive ? { background: themeColor } : undefined}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {view === 'years' && (
                        <div ref={yearsRef} className="relative grid max-h-[232px] grid-cols-4 gap-2 overflow-y-auto py-1 pr-1">
                            {years.map((year) => {
                                const isActive = year === month.getFullYear();
                                return (
                                    <button
                                        key={year}
                                        type="button"
                                        ref={isActive ? activeYearRef : undefined}
                                        onClick={() => pickYear(year)}
                                        className={`${cellClass} ${isActive ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                        style={isActive ? { background: themeColor } : undefined}
                                    >
                                        {year}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DobPicker;
