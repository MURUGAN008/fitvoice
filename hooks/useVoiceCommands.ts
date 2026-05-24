import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface VoiceCommandsProps {
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}

export function useVoiceCommands({
  isActive,
  onPause,
  onResume,
  onNext,
  onBack,
  onExit,
}: VoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false);
  const isActiveRef = useRef(isActive);
  const lastRestartTime = useRef(0);

  // Sync ref with state to avoid closure scope issues in event callbacks
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }
  }, [isActive]);

  const startListening = async () => {
    // Prevent rapid restart loops (e.g. if permissions are denied)
    const now = Date.now();
    if (now - lastRestartTime.current < 1000) {
      return;
    }
    lastRestartTime.current = now;

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (granted && isActiveRef.current) {
        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });
        setIsListening(true);
        console.log('[Voice Navigation] Started listening...');
      }
    } catch (error) {
      console.error('[Voice Navigation] Start listening failed: ', error);
    }
  };

  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      console.log('[Voice Navigation] Stopped listening...');
    } catch (error) {
      console.error('[Voice Navigation] Stop listening failed: ', error);
    }
  };

  // Register event listeners using the expo-speech-recognition hooks
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // Restart listening if active to keep it continuous
    if (isActiveRef.current) {
      startListening();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[Voice Navigation] Speech error event: ', event.error, event.message);
    setIsListening(false);
    // Automatically restart on typical transient timeout or silence errors
    if (isActiveRef.current) {
      setTimeout(() => {
        if (isActiveRef.current) {
          startListening();
        }
      }, 500);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      // Get the latest transcript result from the array
      const transcript = event.results[0]?.transcript?.toLowerCase() || '';
      console.log('[Voice Navigation] Transcribed speech: ', transcript);

      // Word matching for command shortcuts
      if (transcript.includes('pause') || transcript.includes('wait') || transcript.includes('hold')) {
        console.log('[Voice Navigation] Command MATCHED: Pause');
        onPause();
      } else if (
        transcript.includes('resume') || 
        transcript.includes('continue') || 
        transcript.includes('play') || 
        transcript.includes('start')
      ) {
        console.log('[Voice Navigation] Command MATCHED: Resume');
        onResume();
      } else if (transcript.includes('skip') || transcript.includes('next')) {
        console.log('[Voice Navigation] Command MATCHED: Next');
        onNext();
      } else if (transcript.includes('back') || transcript.includes('previous') || transcript.includes('prev')) {
        console.log('[Voice Navigation] Command MATCHED: Back');
        onBack();
      } else if (
        transcript.includes('stop') || 
        transcript.includes('exit') || 
        transcript.includes('quit') || 
        transcript.includes('cancel')
      ) {
        console.log('[Voice Navigation] Command MATCHED: Exit');
        onExit();
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  return { isListening };
}
