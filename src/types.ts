/**
 * Shared Types for 儿童语文精读系统
 */

export interface ChildProfile {
  name: string;
  grade: string;
  readingAbility: string;
  dailyTime: number; // minutes
  targetGoals: string[]; // ['理解', '复述', '积攒', '表达', '兴趣']
}

export interface ChapterGroup {
  title: string;
  type: 'intensive' | 'extensive';
  reason: string;
}

export interface Question {
  id: string; // "Q1", "Q2", "Q3"
  question: string;
  clue: string;
  standardAnswerOutline: string;
}

export interface VocabularyTask {
  description: string;
  suggestedWords: string[];
  suggestedSentences: string[];
}

export interface RetellingOrWritingTask {
  type: 'retelling' | 'writing';
  title: string;
  prompt: string;
  scaffold: string[];
}

export interface DayPlan {
  dayNumber: number;
  readingScope: string;
  goals: string[];
  questions: Question[];
  vocabularyTask: VocabularyTask;
  retellingOrWritingTask: RetellingOrWritingTask;
}

export interface ReadingPlan {
  id: string;
  title: string;
  isSuitable: boolean;
  suitabilityReason: string;
  readingMode: string;
  readingModeDescription: string;
  durationDays: number;
  durationReason: string;
  isVelocityReasonable: boolean;
  velocityAssessment: string;
  chaptersGrouped: ChapterGroup[];
  days: DayPlan[];
}

// Parent Log and student tracking per active project
export interface StudentAnswerLog {
  answer: string;
  aiFeedback?: string;
  aiClue?: string;
  status: 'empty' | 'answered' | 'hinted';
}

export interface ParentFeedback {
  dayNumber: number;
  interestRating: number; // 1-5
  focusRating: number; // 1-5
  comprehensionRating: number; // 1-5
  checkmarks: string[]; // ["定位原文", "表达流利", "积累了词汇"]
  notes: string;
  loggedAt: string;
}

export interface VocabularyAccumulation {
  dayNumber: number;
  word: string;
  sentence?: string;
  aiExplanation?: string;
  aiSentences?: string[];
  aiWritingTip?: string;
}

export interface BookmarkProgress {
  currentDay: number;
  feedbackHistory: Record<number, ParentFeedback>;
  studentAnswers: Record<string, StudentAnswerLog>; // key is "day-{dayNumber}-question-{id}"
  accumVocab: VocabularyAccumulation[];
}

export interface BookProject {
  id: string;
  profile: ChildProfile;
  bookTitle: string;
  bookCatalog?: string;
  bookPages?: string;
  bookSnippets?: string;
  plan: ReadingPlan;
  progress: BookmarkProgress;
  createdAt: string;
}

export interface ReviewReport {
  overviewTitle: string;
  overallDiagnostic: string;
  strengthsAchievements: string;
  coachingStrategy: string;
  nextLevelTasks: string[];
  recommendedBooks: {
    title: string;
    reason: string;
    focusGoals: string;
  }[];
}
