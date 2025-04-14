export interface NewsItem {
  uniquekey: string;
  title: string;
  date: string;
  category: string;
  author_name: string;
  url: string;
  thumbnail_pic_s?: string;
  thumbnail_pic_s02?: string;
  thumbnail_pic_s03?: string;
  is_content: number;
}

export interface NewsResponse {
  stat: string;
  data: NewsItem[];
  page: number;
  pageSize: number;
  total?: number;
}

export interface NewsContent {
  uniquekey: string;
  title: string;
  date: string;
  category: string;
  author_name: string;
  content: string;
  url: string;
} 