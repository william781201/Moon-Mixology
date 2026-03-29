
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  city?: string;
  country?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface CommunityRecipe extends GeneratedCocktail {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto: string;
  authorCity?: string;
  authorCountry?: string;
  averageRating: number;
  reviewCount: number;
  createdAt: any;
  updatedAt?: any;
  notes?: string;
}

export interface Review {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto: string;
  authorCity?: string;
  authorCountry?: string;
  rating: number;
  comment: string;
  createdAt: any;
  updatedAt: any;
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
