// ============================================
// Blaze — Voice Coach System
// ============================================
// Uses expo-speech to announce workout phases,
// exercises, and provide motivation via Groq.
// ============================================

import * as Speech from 'expo-speech';

class VoiceCoach {
  private enabled: boolean = true;
  public isSpeaking: boolean = false;
  public onSpeechStateChange?: (isSpeaking: boolean) => void;

  // Configuration options for the coach voice
  private options: Speech.SpeechOptions = {
    language: 'en-US',
    rate: 1.05, // slightly faster for energy
    pitch: 1.0,
  };

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
    Speech.stop();
    this.setSpeakingState(false);
  }

  /** Speak a phrase if enabled */
  public speak(text: string, forceStop: boolean = true) {
    if (!this.enabled) return;
    
    // Default behavior is to interrupt previous speech for time-sensitive workout cues
    if (forceStop) {
      this.stop();
    }
    
    this.setSpeakingState(true);
    Speech.speak(text, {
      ...this.options,
      onDone: () => this.setSpeakingState(false),
      onStopped: () => this.setSpeakingState(false),
      onError: () => this.setSpeakingState(false),
    });
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

    this.speak(phrase, false); // false = don't interrupt if already speaking
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
