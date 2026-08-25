export interface Category {
  id: string;              
  title: string;
  slug: string;             
  description?: string;
  range?: number;         
  featured: boolean;
  image?: string;         
}