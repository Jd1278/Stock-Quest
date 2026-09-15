export type Role = "APRENDIZ" | "LIDER" | "GESTOR_PEDAGOGICO";
export interface User {
  id: string;
  name: string;
  email: string;
  document: string;
  company: string;
  phone: string | null;
  role: Role;
  active: boolean;
}
export interface Challenge {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
}
export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  body: string;
  position: number;
  minutes: number;
  contents: { id: string; youtubeId: string; title: string }[];
  challenges: Challenge[];
  completed: boolean;
  unlocked: boolean;
}
export interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  published: boolean;
  lessons: Lesson[];
}
export interface Progress {
  completed: number;
  total: number;
  percent: number;
  xp: number;
  level: number;
  passed: boolean;
  simulations: number;
  topics: {
    id: string;
    title: string;
    completed: number;
    total: number;
    score: number | null;
    needsReview: boolean;
  }[];
  achievements: { key: string; earnedAt: string }[];
  recommendations: string[];
}
export interface Scenario {
  id: string;
  title: string;
  description: string;
  initialStock: number;
  leadTime: number;
  demand?: number[];
  unitCost?: number;
  salePrice?: number;
  holdingCost?: number;
  shortageCost?: number;
  orderCost?: number;
  maxOrder?: number;
  published?: boolean;
}
export interface Day {
  day: number;
  demand: number;
  received: number;
  ordered: number;
  sold: number;
  lost: number;
  stock: number;
  revenue: number;
  cost: number;
  profit: number;
}
export interface Run {
  id: string;
  title: string;
  description: string;
  day: number;
  days: number;
  leadTime: number;
  initialStock: number;
  unitCost: number;
  salePrice: number;
  holdingCost: number;
  shortageCost: number;
  orderCost: number;
  maxOrder: number;
  demandRange: number[];
  stock: number;
  profit: number;
  serviceRate: number;
  score: number;
  feedback: string;
  timeline: Day[];
  finished: boolean;
  pending: { quantity: number; arrivalDay: number }[];
}
export interface Employee extends User {
  progress: Progress;
  activities?: {
    id: string;
    score: number;
    createdAt: string;
    challenge: { question: string };
  }[];
}
export interface Group {
  id: string;
  name: string;
  members: { userId: string; user: User }[];
}
