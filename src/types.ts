export interface Skill {
  id: string;
  authorId: string;
  name: string;
  offer: string;
  category: string;
  want: string;
  bio: string;
  createdAt: number;
}

export type Category = 'all' | 'tech' | 'design' | 'music' | 'language' | 'cooking' | 'fitness';
