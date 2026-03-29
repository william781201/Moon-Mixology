
import { GoogleGenAI, Type } from "@google/genai";
import { CocktailRecipe, UserSelections } from "../types";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

const STYLE_PROMPTS: Record<string, string> = {
  studio: "High-end product photography, soft studio lighting, sharp focus, clean solid background, 8k resolution, commercial look",
  cyberpunk: "Cyberpunk aesthetic, neon lighting, pink and blue hues, futuristic bar setting, glowing liquid, dark background, cinematic reflection",
  vintage: "Vintage 1980s film style, polaroid texture, warm tones, slight film grain, retro bar atmosphere, cozy lighting",
  tropical: "Bright natural sunlight, tropical garden background, vibrant colors, fresh fruits, tiki style, bokeh, outdoor setting",
  dark: "Dark moody atmosphere, dramatic chiaroscuro lighting, luxury speakeasy, velvet textures, smoke, mysterious vibe",
  sketch: "Artistic colored pencil sketch, rough paper texture, hand-drawn illustration style, white background, detailed shading"
};

export const generateCocktailRecipe = async (selections: UserSelections): Promise<CocktailRecipe> => {
  const ai = getClient();
  
  const { ingredients, mood, flavor, isNonAlcoholic, isCVS, glassType, icePreference } = selections;
  
  const prompt = `
    You are a world-class mixologist. Create a unique, creative ${isNonAlcoholic ? 'NON-ALCOHOLIC mocktail' : 'cocktail'} recipe based on:
    
    - User Mood: ${mood || "Surprise me"}
    - Flavor Profile: ${flavor || "Balanced"}
    - Preferred Glass: ${glassType || "Recommended by bartender"}
    - Ice Type: ${icePreference || "Standard"}
    - Available Ingredients: ${ingredients.length > 0 ? ingredients.join(', ') : "Any"}
    
    ${isCVS ? 
      "CRITICAL: Convenience Store Mode. Use ingredients found in Taiwan's 7-11 or FamilyMart. No bar-only bitters or niche liqueurs." 
      : "Professional bar setting."}

    The drink should reflect the mood. Provide response in Traditional Chinese (zh-TW).
    Also provide a 'visualPrompt' in English for image generation.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Updated model
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          glassware: { type: Type.STRING },
          garnish: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        },
        required: ["name", "description", "ingredients", "instructions", "glassware", "garnish", "visualPrompt"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as CocktailRecipe;
};

export const generateCocktailImage = async (visualPrompt: string, styleId?: string): Promise<string | undefined> => {
  const ai = getClient();
  const styleModifier = styleId && STYLE_PROMPTS[styleId] ? STYLE_PROMPTS[styleId] : "Professional cocktail photography";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: `${visualPrompt}. ${styleModifier}` }],
      },
      config: { 
        imageConfig: { 
          aspectRatio: "1:1",
          imageSize: "512px"
        } 
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.error("Image generation failed:", error);
    return undefined;
  }
  return undefined;
};
