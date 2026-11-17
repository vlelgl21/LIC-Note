import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface VoiceDictationControlProps {
  onAppendTranscript: (text: string) => void;
}

export const VoiceDictationControl: React.FC<VoiceDictationControlProps> = ({
  onAppendTranscript,
}) => {
  const [lang, setLang] = useState<'bn-IN' | 'en-IN'>('bn-IN');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onAppendRef = useRef(onAppendTranscript);
  onAppendRef.current = onAppendTranscript;

  const getSpeechConstructor = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as WindowWithSpeech;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  };

  const isSupported = Boolean(getSpeechConstructor());

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
    setInterimText('');
  };

  const startDictation = () => {
    const SpeechRec = getSpeechConstructor();
    if (!SpeechRec) {
      setErrorMsg('Voice typing is not supported in this browser.');
      return;
    }

    setErrorMsg('');
    setInterimText('');

    const recognition = new SpeechRec();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      setInterimText(interimChunk.trim());
      if (finalChunk.trim()) {
        onAppendRef.current(finalChunk.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMsg('Microphone permission denied. Please allow mic access in browser settings.');
      } else if (event.error === 'no-speech') {
        setErrorMsg('No speech detected. Tap Speak Note and try again.');
      } else if (event.error === 'network') {
        setErrorMsg('Voice recognition requires internet signal on this device.');
      } else if (event.error !== 'aborted') {
        setErrorMsg(`Voice input stopped (${event.error}).`);
      }
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setErrorMsg('Could not start microphone.');
      setIsListening(false);
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  const handleLangChange = (nextLang: 'bn-IN' | 'en-IN') => {
    if (isListening) {
      stopDictation();
    }
    setLang(nextLang);
    setErrorMsg('');
  };

  if (!isSupported) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
        <MicOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Voice dictation unavailable in this browser; type notes above.</span>
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => handleLangChange('bn-IN')}
            className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              lang === 'bn-IN'
                ? 'bg-[#00529B] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            বাংলা
          </button>
          <button
            type="button"
            onClick={() => handleLangChange('en-IN')}
            className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              lang === 'en-IN'
                ? 'bg-[#00529B] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={isListening}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
            isListening
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-[#00529B] bg-sky-50 text-[#00529B] hover:bg-sky-100'
          }`}
        >
          {isListening ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>Speak Note (ভয়েস নোট)</span>
            </>
          )}
        </button>
      </div>

      {isListening && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-[#003B73]">
          <span className="font-semibold">
            Listening ({lang === 'bn-IN' ? 'Bengali' : 'English'})...
          </span>{' '}
          {interimText ? (
            <span className="italic text-slate-700">&ldquo;{interimText}&rdquo;</span>
          ) : (
            <span className="text-slate-600">Speak clearly near the phone mic.</span>
          )}
        </p>
      )}

      {errorMsg && (
        <p className="text-xs font-medium text-red-700" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
};
