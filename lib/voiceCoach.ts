// ============================================
// Blaze — Voice Coach System
// ============================================
// Uses expo-speech to announce workout phases,
// exercises, and provide motivation via Groq.
//
// CRITICAL: On Android, TTS (expo-speech) and STT
// (expo-speech-recognition) cannot share audio focus.
// This module exposes lifecycle hooks so the voice
// commands system can stop the recognizer BEFORE
// TTS starts and restart AFTER TTS finishes.
// ============================================

import * as Speech from 'expo-speech';

class VoiceCoach {
  private enabled: boolean = true;
  public isSpeaking: boolean = false;

  // Audio ducking callback (lower music volume while speaking)
  public onSpeechStateChange?: (isSpeaking: boolean) => void;

  // STT lifecycle hooks — set by useVoiceCommands
  // Called BEFORE TTS starts to give STT time to stop
  public onBeforeSpeak?: () => Promise<void> | void;
  // Called AFTER TTS finishes to let STT restart
  public onAfterSpeak?: () => void;

  // Configuration options for the coach voice
  private options: Speech.SpeechOptions = {
    language: 'en-US',
    rate: 1.05,
    pitch: 1.0,
  };

  private speakingTimeout: any = null;

  /** Toggle whether voice is enabled or muted */
  public setVoiceEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  private setSpeakingState(state: boolean) {
    this.isSpeaking = state;
    if (this.onSpeechStateChange) {
      this.onSpeechStateChange(state);
    }
  }

  /** Stop any currently playing speech */
  public stop() {
    try {
      Speech.stop();
    } catch (e) {
      console.warn('[VoiceCoach] Speech.stop failed:', e);
    }
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
    this.setSpeakingState(false);
  }

  private handleSpeechDone() {
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
    this.setSpeakingState(false);

    // Notify STT to restart after TTS is completely done
    if (this.onAfterSpeak) {
      // Small delay to let Android fully release audio focus
      setTimeout(() => {
        if (this.onAfterSpeak) {
          this.onAfterSpeak();
        }
      }, 300);
    }
  }

  /** Speak a phrase if enabled.
   *  This method coordinates with the STT system:
   *  1. Calls onBeforeSpeak() to stop the recognizer
   *  2. Waits a short delay for Android to release the mic
   *  3. Plays TTS
   *  4. On completion, calls onAfterSpeak() to restart the recognizer
   */
  public async speak(text: string, forceStop: boolean = true) {
    if (!this.enabled) return;

    // Step 1: Stop any previous speech
    if (forceStop) {
      this.stop();
    }

    // Step 2: Tell STT to stop BEFORE we start TTS
    if (this.onBeforeSpeak) {
      try {
        await this.onBeforeSpeak();
      } catch (e) {
        console.warn('[VoiceCoach] onBeforeSpeak failed:', e);
      }
    }

    this.setSpeakingState(true);

    // Calculate safety timeout
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estimatedDurationMs = Math.max(2000, (wordCount * 400) + 1000);

    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
    }

    this.speakingTimeout = setTimeout(() => {
      if (this.isSpeaking) {
        console.log('[VoiceCoach] Safety fallback triggered: resetting isSpeaking to false');
        this.handleSpeechDone();
      }
      this.speakingTimeout = null;
    }, estimatedDurationMs);

    // Step 3: Small delay for Android to release mic before TTS
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      Speech.speak(text, {
        ...this.options,
        onDone: () => {
          this.handleSpeechDone();
        },
        onStopped: () => {
          this.handleSpeechDone();
        },
        onError: (err) => {
          console.warn('[VoiceCoach] Speech error callback:', err);
          this.handleSpeechDone();
        },
      });
    } catch (e) {
      console.error('[VoiceCoach] Speech.speak invocation failed:', e);
      this.handleSpeechDone();
    }
  }

  // ==========================================
  // WORKOUT CUES
  // ==========================================

  /** Announce the start of a new exercise */
  public announceExercise(exerciseName: string) {
    this.speak(`Next up: ${exerciseName}. Let's go!`);
  }

  /** Announce a countdown (usually during prepare phase) */
  public announceCountdown() {
    this.speak('3, 2, 1, Go!');
  }

  /** Announce the halfway point of an active exercise, potentially using Groq LLM */
  public async announceMidway(exerciseName: string, petName: string) {
    const defaultPhrases = [
      "Halfway there! Keep it up!",
      "You're halfway! Push through!",
      "Doing great! Halfway done!",
    ];
    let phrase = defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];

    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    console.log(`[VoiceCoach] Groq API Key present: ${!!apiKey}`);

    if (apiKey) {
      try {
        console.log(`[VoiceCoach] Sending request to Groq for exercise: ${exerciseName}`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{
              role: 'system',
              content: `You are an intense, hype-man fitness coach. The user is halfway through doing ${exerciseName}. Their virtual pet is ${petName}. Give a single, short, punchy sentence (under 10 words) of intense motivation. Do not use hashtags or emojis.`
            }],
            temperature: 0.8,
            max_tokens: 30
          })
        });

        const data = await response.json();
        console.log(`[VoiceCoach] Groq Response Status: ${response.status}`);
        console.log(`[VoiceCoach] Groq Response Data:`, JSON.stringify(data, null, 2));

        if (data.choices && data.choices[0].message.content) {
          phrase = data.choices[0].message.content.trim().replace(/['"]/g, '');
        } else {
          console.log('[VoiceCoach] Groq Response did not contain choices. Falling back.');
        }
      } catch (e) {
        console.error('[VoiceCoach] Groq API fetch error:', e);
      }
    }

    this.speak(phrase, false);
  }

  /** Announce rest period and the upcoming exercise */
  public announceRest(nextExerciseName?: string) {
    if (nextExerciseName) {
      this.speak(`Rest. Next exercise: ${nextExerciseName}.`);
    } else {
      this.speak(`Rest. You've earned it.`);
    }
  }

  /** Announce completion of the entire workout */
  public announceWorkoutComplete() {
    this.speak(`Workout complete! Amazing job today!`);
  }

  /** Announce when the user beats a personal record */
  public announceNewRecord() {
    this.speak(`New personal record! You are crushing it!`);
  }
}

// Export a singleton instance
export const voiceCoach = new VoiceCoach();
