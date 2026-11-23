import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import MicIcon from "@mui/icons-material/Mic";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

const getRecognitionClass = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Status → translation key (search.voice.*)
const STATUS_KEYS = {
  listening: "search.voice.listening",
  done: "search.voice.done",
  nomatch: "search.voice.nomatch",
  denied: "search.voice.denied",
  unsupported: "search.voice.unsupported",
  error: "search.voice.error",
};

/**
 * Full-screen "listening" screen for voice search.
 * Starts listening as soon as it opens; when speech ends with a result,
 * calls onResult(transcript).
 */
const VoiceSearchOverlay = ({ onClose, onResult }) => {
  const { t } = useTranslation();
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const [status, setStatus] = useState(() =>
    getRecognitionClass() ? "listening" : "unsupported",
  );
  const [transcript, setTranscript] = useState("");

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = rec.onend = rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  // Creates and starts a recognition session. Never sets state synchronously,
  // so it can run on mount; state changes happen in the recognition callbacks.
  const startRecognition = useCallback(() => {
    stop();
    transcriptRef.current = "";
    const Recognition = getRecognitionClass();
    if (!Recognition) return;

    const rec = new Recognition();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      transcriptRef.current = text;
      setTranscript(text);
    };
    rec.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setStatus("denied");
      } else if (event.error === "no-speech" || event.error === "aborted") {
        setStatus("nomatch");
      } else {
        setStatus("error");
      }
    };
    rec.onend = () => {
      recognitionRef.current = null;
      const text = transcriptRef.current.trim();
      if (text) {
        setStatus("done");
        setTimeout(() => onResult(text), 350);
      } else {
        setStatus((s) => (s === "listening" ? "nomatch" : s));
      }
    };

    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      setTimeout(() => setStatus("error"), 0);
    }
  }, [onResult, stop]);

  // "Try again" (from a tap)
  const retry = () => {
    setTranscript("");
    setStatus(getRecognitionClass() ? "listening" : "unsupported");
    startRecognition();
  };

  // Start listening as soon as the screen opens; stop when it closes
  useEffect(() => {
    startRecognition();
    return stop;
  }, [startRecognition, stop]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isListening = status === "listening";
  const canRetry = status === "nomatch" || status === "error";

  return createPortal(
    <motion.div
      key="voice-search"
      role="dialog"
      aria-modal="true"
      aria-label={t("search.voiceSearch")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-white px-6"
    >
      <button
        type="button"
        aria-label={t("search.closeVoiceSearch")}
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
      >
        <CloseIcon />
      </button>

      <p className="mb-10 min-h-[2.5rem] max-w-md text-center text-2xl font-bold text-slate-800">
        {transcript || (isListening ? t("search.voice.speakNow") : "")}
      </p>

      <div className="relative flex h-40 w-40 items-center justify-center">
        {isListening &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full bg-primary/20"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeOut",
              }}
            />
          ))}
        <motion.button
          type="button"
          aria-label={canRetry ? t("common.tryAgain") : t("search.voice.listeningShort")}
          onClick={canRetry ? retry : undefined}
          whileTap={{ scale: 0.92 }}
          animate={isListening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={
            isListening ? { duration: 1.2, repeat: Infinity } : undefined
          }
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl ${
            isListening || status === "done" ? "bg-primary" : "bg-slate-400"
          }`}
        >
          <MicIcon sx={{ fontSize: 44 }} />
        </motion.button>
      </div>

      <p className="mt-10 max-w-xs text-center text-sm font-medium text-slate-500">
        {STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : null}
      </p>
    </motion.div>,
    document.body,
  );
};

export default VoiceSearchOverlay;
