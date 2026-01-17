// Custom hook for text-to-speech functionality
// Provides speech synthesis capabilities using the Web Speech API
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for text-to-speech using Web Speech Synthesis API
 * @returns {Object} TTS state and controls
 */
export const useTextToSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [rate, setRate] = useState(() => {
        // Load from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('tts_rate');
            return saved ? parseFloat(saved) : 1.0;
        }
        return 1.0;
    }); // Speech rate (0.1 to 10)
    const [pitch, setPitch] = useState(() => {
        // Load from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('tts_pitch');
            return saved ? parseFloat(saved) : 1.0;
        }
        return 1.0;
    }); // Pitch (0 to 2)
    const [volume, setVolume] = useState(() => {
        // Load from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('tts_volume');
            return saved ? parseFloat(saved) : 1.0;
        }
        return 1.0;
    }); // Volume (0 to 1)
    const [isSupported, setIsSupported] = useState(false); // Start as false to avoid hydration mismatch
    const utteranceRef = useRef(null);

    useEffect(() => {
        // Check support only on client side to avoid hydration mismatch
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);
        } else {
            setIsSupported(false);
            return;
        }

        // Load available voices
        const loadVoices = () => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
            
            const availableVoices = window.speechSynthesis.getVoices();
            
            // Only update if we have voices (some browsers load them asynchronously)
            if (availableVoices.length === 0) return;
            
            setVoices(availableVoices);
            
            // Update selected voice if it exists, or set default
            const savedVoiceName = localStorage.getItem('tts_voice_name');
            let voiceToUse = null;
            
            if (savedVoiceName) {
                voiceToUse = availableVoices.find(v => v.name === savedVoiceName);
            }
            
            // If saved voice not found or not saved, use default
            if (!voiceToUse) {
                // Prefer Google voices if available, then English voices
                voiceToUse = availableVoices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
                             availableVoices.find(v => v.lang.startsWith('en')) ||
                             availableVoices[0];
            }
            
            // Only update if voice changed or if we don't have a selected voice
            if (!selectedVoice || (voiceToUse && voiceToUse.name !== selectedVoice.name)) {
                setSelectedVoice(voiceToUse);
            }
        };

        loadVoices();
        
        // Some browsers (especially Chrome with Google voices) load voices asynchronously
        if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // Also try loading voices after a short delay (for browsers that load them late)
        const timeoutId = setTimeout(() => {
            loadVoices();
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
            if (typeof window !== 'undefined' && utteranceRef.current) {
                window.speechSynthesis.cancel();
            }
        };

    }, [selectedVoice]);

    const speak = (text, options = {}) => {
        if (!isSupported || typeof window === 'undefined' || !('speechSynthesis' in window)) {
            console.warn('Speech synthesis is not supported in your browser.');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Get fresh voices list - important for Google voices which may need fresh references
        const currentVoices = window.speechSynthesis.getVoices();
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice - re-fetch from current voices to avoid stale references
        // This is especially important for Google voices
        let voiceToUse = null;
        if (options.voice) {
            // If a voice object is provided, try to find it in current voices
            voiceToUse = currentVoices.find(v => v.name === options.voice.name) || options.voice;
        } else if (selectedVoice) {
            // Re-fetch the voice from current voices list to ensure it's not stale
            voiceToUse = currentVoices.find(v => v.name === selectedVoice.name);
            // If voice not found, try to find any voice with similar name (for Google voices)
            if (!voiceToUse && selectedVoice.name) {
                voiceToUse = currentVoices.find(v => 
                    v.name.toLowerCase().includes(selectedVoice.name.toLowerCase()) ||
                    selectedVoice.name.toLowerCase().includes(v.name.toLowerCase())
                );
            }
            // Fallback to selectedVoice if still not found
            if (!voiceToUse) {
                voiceToUse = selectedVoice;
            }
        }
        
        if (voiceToUse) {
            utterance.voice = voiceToUse;
            utterance.lang = voiceToUse.lang;
        } else {
            utterance.lang = options.lang || 'en-US';
        }
        
        // Set speech parameters
        utterance.rate = options.rate || rate;
        utterance.pitch = options.pitch || pitch;
        utterance.volume = options.volume || volume;

        // Event handlers
        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
            if (options.onstart) options.onstart();
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            utteranceRef.current = null;
            if (options.onend) options.onend();
        };

        utterance.onerror = (event) => {
            // "interrupted" is not a real error - it happens when speech is cancelled
            // which is expected behavior when starting new speech or stopping
            if (event.error !== 'interrupted') {
                console.error('Speech synthesis error:', event.error);
            }
            setIsSpeaking(false);
            setIsPaused(false);
            utteranceRef.current = null;
            if (options.onerror && event.error !== 'interrupted') {
                options.onerror(event);
            }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const pause = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                window.speechSynthesis.pause();
                setIsPaused(true);
            }
        }
    };

    const resume = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setIsPaused(false);
            }
        }
    };

    const stop = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
    };

    const toggle = () => {
        if (isSpeaking) {
            if (isPaused) {
                resume();
            } else {
                pause();
            }
        }
    };

    // Wrapper functions to persist settings to localStorage
    const handleSetSelectedVoice = (voice) => {
        setSelectedVoice(voice);
        if (typeof window !== 'undefined' && voice) {
            localStorage.setItem('tts_voice_name', voice.name);
        }
    };

    const handleSetRate = (newRate) => {
        setRate(newRate);
        if (typeof window !== 'undefined') {
            localStorage.setItem('tts_rate', newRate.toString());
        }
    };

    const handleSetPitch = (newPitch) => {
        setPitch(newPitch);
        if (typeof window !== 'undefined') {
            localStorage.setItem('tts_pitch', newPitch.toString());
        }
    };

    const handleSetVolume = (newVolume) => {
        setVolume(newVolume);
        if (typeof window !== 'undefined') {
            localStorage.setItem('tts_volume', newVolume.toString());
        }
    };

    return {
        isSupported,
        isSpeaking,
        isPaused,
        voices,
        selectedVoice,
        rate,
        pitch,
        volume,
        speak,
        pause,
        resume,
        stop,
        toggle,
        setSelectedVoice: handleSetSelectedVoice,
        setRate: handleSetRate,
        setPitch: handleSetPitch,
        setVolume: handleSetVolume,
    };
};

