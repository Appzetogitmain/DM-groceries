import React, { useEffect, useState } from "react";
import { Bell, BellOff, ArrowRight, CalendarClock } from "lucide-react";
import Modal from "@/shared/components/ui/Modal";
import { cn } from "@/lib/utils";

// Keep in sync with LIST_REMINDER_DAY_OPTIONS in
// backend/app/validation/customerListValidation.js
export const LIST_REMINDER_DAY_CHOICES = [3, 5, 7, 10, 15, 30];
const DEFAULT_REMINDER_DAYS = 7;

/**
 * Asked right before "Order Basket Now": after how many days should we
 * remind the customer to restock this basket?
 *
 * onConfirm(days) — days is one of LIST_REMINDER_DAY_CHOICES, or 0 for
 * "don't remind me".
 */
const ListReminderPickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialDays,
  listName,
  isSubmitting = false,
}) => {
  const [selectedDays, setSelectedDays] = useState(DEFAULT_REMINDER_DAYS);

  useEffect(() => {
    if (!isOpen) return;
    const initial = Number(initialDays);
    setSelectedDays(
      LIST_REMINDER_DAY_CHOICES.includes(initial) ? initial : DEFAULT_REMINDER_DAYS
    );
  }, [isOpen, initialDays]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Before you order"
      size="sm"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900">My List reminders</h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#1A4516] px-2 py-0.5 rounded-full">
              New
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            When should we remind you to restock
            {listName ? (
              <>
                {" "}
                <strong className="text-slate-700">{listName}</strong>
              </>
            ) : (
              " this basket"
            )}
            ?
          </p>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white border border-slate-200/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#1A4516]" />
              <span className="text-sm font-bold text-slate-800">App notification</span>
            </div>
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              On
            </span>
          </div>

          <p className="mt-4 mb-2 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CalendarClock size={13} />
            Remind me after
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LIST_REMINDER_DAY_CHOICES.map((days) => {
              const active = selectedDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSelectedDays(days)}
                  disabled={isSubmitting}
                  className={cn(
                    "py-2.5 rounded-2xl text-sm font-bold border transition active:scale-95",
                    active
                      ? "border-[#1A4516] border-2 bg-emerald-50 text-[#1A4516]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {days} days
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-slate-400 font-medium leading-relaxed">
            We'll send one reminder {selectedDays} days after this order. You can
            reorder in one tap or ask us to remind you later.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onConfirm(0)}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <BellOff size={14} />
            Don't remind me
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedDays)}
            disabled={isSubmitting}
            className="flex-1 px-5 py-2.5 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? "Please wait..." : "Set reminder & order"}
            {!isSubmitting && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ListReminderPickerModal;
