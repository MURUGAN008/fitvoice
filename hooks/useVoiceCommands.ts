import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { voiceCoach } from '../lib/voiceCoach';

interface VoiceCommandsProps {
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}

// Dictionary of phonetic variants and homophones to catch different pronunciations
// Dictionary of command keywords, logical equivalents, and common phonetic misinterpretations
const COMMANDS = {
  PAUSE: [
    'pause', 'wait', 'hold', 'paused', 
    // Phonetic homophones / misrecognitions
    'pass', 'past', 'path', 'post', 'pose', 'paws', 'boss', 'pulse'
  ],
  RESUME: [
    'resume', 'continue', 'play', 'start', 'restart', 'resumed',
    // Phonetic homophones / misrecognitions
    'rezoom', 're-zoom', 'assume'
  ],
  NEXT: [
    'skip', 'next', 'skipped',
    // Phonetic homophones / misrecognitions
    'nex', 'necks', 'net'
  ],
  BACK: [
    'back', 'previous', 'prev',
    // Phonetic homophones / misrecognitions
    'pack', 'bag', 'bark', 'pac'
  ],
  EXIT: [
    'stop', 'exit', 'quit', 'cancel', 'stopped',
    // Phonetic homophones / misrecognitions
    'shop', 'top', 'quite'
  ]
};

const matchesCommand = (transcript: string, keywords: string[]): boolean => {
  return keywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(transcript);
  });
};

// Module-level singleton coordinator to prevent multi-mount cross-talk
let globalActiveInstanceId: string | null = null;

export function useVoiceCommands({
  isActive,
  onPause,
  onResume,
  onNext,
  onBack,
  onExit,
}: VoiceCommandsProps) {
  // Generate a stable unique identifier for this hook instance
  const instanceIdRef = useRef(Math.random().toString(36).substring(2, 9));
  
  const isActiveRef = useRef(isActive);
  const lastCommandTime = useRef(0);
  const isTtsSuppressedRef = useRef(false);
  const restartTimerRef = useRef<any>(null);

  // State machine for recognizer state: 'idle' | 'starting' | 'listening' | 'stopping'
  type RecognizerState = 'idle' | 'starting' | 'listening' | 'stopping';
  const recognizerStateRef = useRef<RecognizerState>('idle');

  // Back-off / Failure metrics to protect from infinite failure loops (e.g. if Google services are missing)
  const consecutiveFailuresRef = useRef(0);
  const lastStartAttemptTimeRef = useRef(0);
  const hadSystemErrorInSessionRef = useRef(false);

  // Helper to verify if this specific instance has permission to control native recognizer
  const isThisInstanceActive = useCallback(() => {
    return globalActiveInstanceId === instanceIdRef.current;
  }, []);

  // Sync ref with prop
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // ============================================================
  // CORE: Start / Stop speech recognition
  // ============================================================

  const startListening = useCallback(async () => {
    // Guard: Only the designated active instance can start
    if (!isThisInstanceActive()) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} blocked startListening: not the active instance`);
      return;
    }
    // Guard: don't start if TTS is currently speaking
    if (isTtsSuppressedRef.current) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} suppressed start: TTS active`);
      return;
    }
    // Guard: don't start if not active
    if (!isActiveRef.current) return;
    // Guard: only start from 'idle' state
    if (recognizerStateRef.current !== 'idle') {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} suppressed start: state is ${recognizerStateRef.current}`);
      return;
    }
    // Guard: check that app is in active foreground
    if (AppState.currentState !== 'active') {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} suppressed start: app is in background (currentState is ${AppState.currentState})`);
      return;
    }

    recognizerStateRef.current = 'starting';
    lastStartAttemptTimeRef.current = Date.now();
    hadSystemErrorInSessionRef.current = false;
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} state transition: starting`);

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted || !isActiveRef.current || isTtsSuppressedRef.current || AppState.currentState !== 'active' || !isThisInstanceActive()) {
        console.log(`[Voice Nav] Instance ${instanceIdRef.current} start aborted (permissions, inactive, TTS, background, or un-designated)`);
        recognizerStateRef.current = 'idle';
        return;
      }

      // Query available speech services purely for diagnostic logging
      try {
        const services = await ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
        console.log(`[Voice Nav] Instance ${instanceIdRef.current} available speech services:`, services);
      } catch (err) {
        console.warn(`[Voice Nav] Instance ${instanceIdRef.current} failed to query speech services:`, err);
      }

      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        contextualStrings: [
          'pause', 'resume', 'next', 'back', 'stop', 'skip', 'exit',
        ],
        iosTaskHint: 'confirmation',
      });
      // The 'start' event handler will transition state to 'listening'
    } catch (error) {
      console.error(`[Voice Nav] Instance ${instanceIdRef.current} ❌ Start failed:`, error);
      recognizerStateRef.current = 'idle';
    }
  }, [isThisInstanceActive]);

  const stopListening = useCallback(async () => {
    // Guard: Only the designated active instance can stop
    if (!isThisInstanceActive()) return;

    // Clear any pending restart
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const currentState = recognizerStateRef.current;
    if (currentState === 'idle' || currentState === 'stopping') {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} stop ignored: already ${currentState}`);
      return;
    }

    recognizerStateRef.current = 'stopping';
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} state transition: stopping`);

    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      console.warn(`[Voice Nav] Instance ${instanceIdRef.current} abort invocation failed:`, error);
      recognizerStateRef.current = 'idle';
    }
  }, [isThisInstanceActive]);

  // Schedule a restart with debounce protection
  const scheduleRestart = useCallback((delayMs: number = 800) => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (isActiveRef.current && !isTtsSuppressedRef.current && recognizerStateRef.current === 'idle' && isThisInstanceActive()) {
        startListening();
      }
    }, delayMs);
  }, [startListening, isThisInstanceActive]);

  // ============================================================
  // TTS COORDINATION: VoiceCoach lifecycle hooks
  // ============================================================

  useEffect(() => {
    // Only bind hooks if we are the active instance
    if (!isThisInstanceActive()) return;

    // Called BEFORE TTS starts — stop recognizer to release audio focus
    voiceCoach.onBeforeSpeak = async () => {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} 🔇 TTS starting — suppressing`);
      isTtsSuppressedRef.current = true;
      // Cancel any pending restart
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      await stopListening();
    };

    // Called AFTER TTS finishes — restart recognizer
    voiceCoach.onAfterSpeak = () => {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} 🔊 TTS done`);
      isTtsSuppressedRef.current = false;
      if (isActiveRef.current) {
        scheduleRestart(500);
      }
    };

    return () => {
      if (isThisInstanceActive()) {
        voiceCoach.onBeforeSpeak = undefined;
        voiceCoach.onAfterSpeak = undefined;
      }
    };
  }, [stopListening, scheduleRestart, isThisInstanceActive]);

  // ============================================================
  // LIFECYCLE: Designate active instance and start/stop
  // ============================================================

  useEffect(() => {
    if (isActive) {
      // Designate this instance as the global active coordinator
      globalActiveInstanceId = instanceIdRef.current;
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} became global ACTIVE`);
      startListening();
    } else {
      if (globalActiveInstanceId === instanceIdRef.current) {
        globalActiveInstanceId = null;
        console.log(`[Voice Nav] Instance ${instanceIdRef.current} released global active state`);
      }
      stopListening();
    }
  }, [isActive, startListening, stopListening]);

  // ============================================================
  // DEBOUNCED APPSTATE LISTENER:
  // On Android, starting speech recognition triggers a transient
  // AppState change (active -> background -> active).
  // We debounce the background transition by 1.5 seconds to filter
  // out these transient events, and only stop/start on real backgrounding.
  // ============================================================
  useEffect(() => {
    let backgroundTimeout: any = null;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Guard: ignore if this instance is not the active coordinator
      if (!isThisInstanceActive()) return;

      console.log(`[Voice Nav] Instance ${instanceIdRef.current} AppState changed to:`, nextAppState);

      if (nextAppState === 'background') {
        backgroundTimeout = setTimeout(() => {
          console.log(`[Voice Nav] Instance ${instanceIdRef.current} App confirmed in background, stopping recognition`);
          stopListening();
        }, 1500);
      } else if (nextAppState === 'active') {
        if (backgroundTimeout) {
          clearTimeout(backgroundTimeout);
          backgroundTimeout = null;
        }
        console.log(`[Voice Nav] Instance ${instanceIdRef.current} App returned to foreground, starting recognition`);
        if (isActiveRef.current && !isTtsSuppressedRef.current) {
          scheduleRestart(300);
        }
      }
    });

    return () => {
      if (backgroundTimeout) {
        clearTimeout(backgroundTimeout);
      }
      subscription.remove();
    };
  }, [scheduleRestart, stopListening, isThisInstanceActive]);

  // ============================================================
  // EVENT HANDLERS: expo-speech-recognition events
  // ============================================================

  useSpeechRecognitionEvent('start', () => {
    if (!isThisInstanceActive()) return;
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} Event: start`);
    recognizerStateRef.current = 'listening';
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isThisInstanceActive()) return;
    const sessionDuration = Date.now() - lastStartAttemptTimeRef.current;
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} Event: end (session lasted: ${sessionDuration}ms, previous state: ${recognizerStateRef.current})`);
    
    recognizerStateRef.current = 'idle';

    // If the session completed without any system errors, reset failures
    if (!hadSystemErrorInSessionRef.current) {
      consecutiveFailuresRef.current = 0;
    }

    // Auto-restart if still active and NOT suppressed by TTS
    if (isActiveRef.current && !isTtsSuppressedRef.current) {
      if (consecutiveFailuresRef.current >= 3) {
        console.warn(`[Voice Nav] Instance ${instanceIdRef.current} ⚠️ Too many consecutive system errors. Backing off restart to 15 seconds to prevent CPU overload.`);
        scheduleRestart(15000); // Back off for 15 seconds
      } else {
        scheduleRestart(800); // Gentle 800ms restart delay
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isThisInstanceActive()) return;
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} Event: error -`, event.error, event.message);
    
    // Ignore normal timeouts ('no-speech') and explicit user cancel/aborts ('aborted')
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      hadSystemErrorInSessionRef.current = true;
      consecutiveFailuresRef.current += 1;
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} System error: ${event.error}. Consecutive failures: ${consecutiveFailuresRef.current}`);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!isThisInstanceActive()) return;

    // Guard: Ignore if voice coach is speaking
    if (voiceCoach.isSpeaking || isTtsSuppressedRef.current) {
      return;
    }

    if (!event.results || event.results.length === 0) return;

    const latestResult = event.results[event.results.length - 1];
    const transcript = latestResult?.transcript?.toLowerCase() || '';
    
    // Log transcript with interim state information
    console.log(`[Voice Nav] Instance ${instanceIdRef.current} 📝 Result (isFinal: ${event.isFinal}): "${transcript}"`);

    if (!transcript.trim()) return;

    // Debounce: 1.5s
    const now = Date.now();
    if (now - lastCommandTime.current < 1500) return;

    let matched = false;

    if (matchesCommand(transcript, COMMANDS.PAUSE)) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} ✅ PAUSE matched in: "${transcript}"`);
      onPause();
      matched = true;
    } else if (matchesCommand(transcript, COMMANDS.RESUME)) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} ✅ RESUME matched in: "${transcript}"`);
      onResume();
      matched = true;
    } else if (matchesCommand(transcript, COMMANDS.NEXT)) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} ✅ NEXT/SKIP matched in: "${transcript}"`);
      onNext();
      matched = true;
    } else if (matchesCommand(transcript, COMMANDS.BACK)) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} ✅ BACK matched in: "${transcript}"`);
      onBack();
      matched = true;
    } else if (matchesCommand(transcript, COMMANDS.EXIT)) {
      console.log(`[Voice Nav] Instance ${instanceIdRef.current} ✅ EXIT matched in: "${transcript}"`);
      onExit();
      matched = true;
    }

    if (matched) {
      lastCommandTime.current = now;
      // Stop listening immediately to prevent further processing from the same utterance
      stopListening();
    }
  });

  // ============================================================
  // CLEANUP on unmount
  // ============================================================
  useEffect(() => {
    return () => {
      if (globalActiveInstanceId === instanceIdRef.current) {
        globalActiveInstanceId = null;
      }
      isActiveRef.current = false;
      isTtsSuppressedRef.current = false;
      recognizerStateRef.current = 'idle';
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    };
  }, []);

  return { isListening: recognizerStateRef.current === 'listening' && isThisInstanceActive() };
}
