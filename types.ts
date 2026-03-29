
export interface CocktailRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  glassware: string;
  garnish: string;
  visualPrompt: string;
}

export interface GeneratedCocktail extends CocktailRecipe {
  imageUrl?: string;
}

export interface SavedCocktail extends GeneratedCocktail {
  id: string;
  createdAt: number;
}

export interface UserSelections {
  ingredients: string[];
  mood: string;
  flavor: string;
  visualStyle: string;
  glassType: string;
  icePreference: string;
  isNonAlcoholic: boolean;
  isCVS: boolean;
}

export enum Step {
  SELECTION = 'SELECTION',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT',
}

export interface SelectionItem {
  id: string;
  label: string;
  emoji?: string;
}
