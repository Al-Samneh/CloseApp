import { Profile } from '../scoring/compatibility';

// Removed due to it taking a long time to connect, inefficient if we're using BLE


// Removed API usage from client app. Keep server-side if needed.
const OPENROUTER_API_KEY = '';
const OPENROUTER_BASE_URL = '';

export type CompatibilityResult = {
  score: number; // 0-100
  explanation: string;
  shouldMatch: boolean;
};

export async function checkCompatibilityWithAI(
  myProfile: Profile,
  peerProfile: Profile
): Promise<CompatibilityResult> {
  try {
    const prompt = `Rate dating compatibility from 0-100. Respond ONLY with the number.

Person A: ${myProfile.age}yo ${myProfile.sex}, wants ${myProfile.preferences.gender.join('/')} aged ${myProfile.preferences.age_min}-${myProfile.preferences.age_max}, interests: ${myProfile.interests.join(', ')}

Person B: ${peerProfile.age}yo ${peerProfile.sex}, wants ${peerProfile.preferences.gender.join('/')} aged ${peerProfile.preferences.age_min}-${peerProfile.preferences.age_max}, interests: ${peerProfile.interests.join(', ')}

Reply ONLY with a number 0-100. No text, no explanation, just the number.`;

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://close.app', // Optional: for OpenRouter analytics
        'X-Title': 'Close App', // Optional: for OpenRouter analytics
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast:free', // Free tier model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    

    // Extract just the number from the response
    const numberMatch = content.match(/\d+/);
    const score = numberMatch ? parseInt(numberMatch[0], 10) : 0;

    // Clamp score between 0-100
    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      explanation: finalScore >= 70 ? 'Good match!' : 'Low compatibility',
      shouldMatch: finalScore >= 70,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Fallback: use basic algorithm
    return {
      score: 0,
      explanation: `AI check failed: ${errorMessage}`,
      shouldMatch: false,
    };
  }
}
