import React, { useState } from "react";
import { BookProject, DayPlan, Question, VocabularyAccumulation, StudentAnswerLog, ParentFeedback } from "../types";
import { BookOpen, Sparkles, HelpCircle, FileText, CheckCircle, Award, Star, List, PenTool, Flame, RefreshCcw } from "lucide-react";

interface ActivePlanViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onNavigateToReview: () => void;
}

export default function ActivePlanView({ project, onUpdateProject, onNavigateToReview }: ActivePlanViewProps) {
  const { plan, progress } = project;
  const [selectedDayNum, setSelectedDayNum] = useState<number>(progress.currentDay || 1);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("Q1");
  const [typingAnswer, setTypingAnswer] = useState<string>("");
  const [isCallingTutor, setIsCallingTutor] = useState<boolean>(false);
  
  // Custom user vocabulary word entry
  const [customWord, setCustomWord] = useState<string>("");
  const [customWordSentence, setCustomWordSentence] = useState<string>("");
  const [isExpandingWord, setIsExpandingWord] = useState<boolean>(false);
  const [expandedWordResult, setExpandedWordResult] = useState<any>(null);

  // Oral retelling entry
  const [oralText, setOralText] = useState<string>("");
  const [isRecordingSim, setIsRecordingSim] = useState<boolean>(false);

  // Parent ratings
  const [interestRating, setInterestRating] = useState<number>(3);
  const [focusRating, setFocusRating] = useState<number>(3);
  const [comprehensionRating, setComprehensionRating] = useState<number>(3);
  const [selectedCheckmarks, setSelectedCheckmarks] = useState<string[]>([]);
  const [parentNotes, setParentNotes] = useState<string>("");
  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);

  // Locate selected Day Plan
  const currentDayPlan = plan.days.find(d => d.dayNumber === selectedDayNum) || plan.days[0];

  if (!currentDayPlan) {
    return <div className="p-8 text-center text-gray-500">未找到本日精读课表内容。</div>;
  }

  // Answer key inside student answers state
  const getAnswerKey = (day: number, qId: string) => `day-${day}-question-${qId}`;
  const getAnswerLog = (day: number, qId: string): StudentAnswerLog => {
    return progress.studentAnswers[getAnswerKey(day, qId)] || { answer: "", status: "empty" };
  };

  const handleUpdateAnswerState = (qId: string, updatedLog: Partial<StudentAnswerLog>) => {
    const key = getAnswerKey(selectedDayNum, qId);
    const existingLog = getAnswerLog(selectedDayNum, qId);
    const updatedAnswers = {
      ...progress.studentAnswers,
      [key]: { ...existingLog, ...updatedLog } as StudentAnswerLog
    };

    onUpdateProject({
      ...project,
      progress: {
        ...progress,
        studentAnswers: updatedAnswers
      }
    });
  };

  // 1. Submit Child Answer to Gemini for warm feedback
  const handleSubmitAnswer = async (qId: string, questionObj: Question) => {
    const kidAnswer = typingAnswer.trim();
    if (!kidAnswer) return;

    setIsCallingTutor(true);
    try {
      const response = await fetch("/api/tutor-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionObj,
          studentAnswer: kidAnswer,
          isAskingForClue: false,
          dayContext: `第${selectedDayNum}天阅读范围: ${currentDayPlan.readingScope}`
        })
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      handleUpdateAnswerState(qId, {
        answer: kidAnswer,
        aiFeedback: data.feedback,
        status: "answered"
      });
      setTypingAnswer("");
    } catch (err) {
      console.error(err);
      alert("智能伴读获取反馈失败，请稍后重试。");
    } finally {
      setIsCallingTutor(false);
    }
  };

  // 2. Request educational clue from Gemini
  const handleRequestClue = async (qId: string, questionObj: Question) => {
    setIsCallingTutor(true);
    try {
      const response = await fetch("/api/tutor-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionObj,
          studentAnswer: "",
          isAskingForClue: true,
          dayContext: `第${selectedDayNum}天阅读范围: ${currentDayPlan.readingScope}`
        })
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      handleUpdateAnswerState(qId, {
        aiClue: data.clueHint,
        status: "hinted"
      });
    } catch (err) {
      console.error(err);
      alert("智能索取提示失败。");
    } finally {
      setIsCallingTutor(false);
    }
  };

  // 3. Clear feedback and reset question card
  const handleResetQuestionCard = (qId: string) => {
    const key = getAnswerKey(selectedDayNum, qId);
    const updatedAnswers = { ...progress.studentAnswers };
    delete updatedAnswers[key];

    onUpdateProject({
      ...project,
      progress: {
        ...progress,
        studentAnswers: updatedAnswers
      }
    });
    setTypingAnswer("");
  };

  // 4. Vocab word expansion
  const handleExpandWord = async (word: string, fallbackSentence: string) => {
    setIsExpandingWord(true);
    setExpandedWordResult(null);
    try {
      const response = await fetch("/api/vocab-expansion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          sentence: fallbackSentence,
          grade: project.profile.grade
        })
      });
      const data = await response.json();
      setExpandedWordResult({
        word,
        childExplanation: data.childExplanation,
        sentences: data.sentences,
        writingTip: data.writingTip
      });
    } catch (err) {
      console.error(err);
      alert("智能词句拓展失败");
    } finally {
      setIsExpandingWord(false);
    }
  };

  // 5. Save custom word to child accumulation list
  const handleAddCustomVocab = () => {
    if (!customWord.trim()) return;

    let newAccum: VocabularyAccumulation;
    if (expandedWordResult && expandedWordResult.word.trim() === customWord.trim()) {
      newAccum = {
        dayNumber: selectedDayNum,
        word: customWord.trim(),
        sentence: customWordSentence.trim() || undefined,
        aiExplanation: expandedWordResult.childExplanation,
        aiSentences: expandedWordResult.sentences,
        aiWritingTip: expandedWordResult.writingTip
      };
    } else {
      newAccum = {
        dayNumber: selectedDayNum,
        word: customWord.trim(),
        sentence: customWordSentence.trim() || undefined
      };
    }

    onUpdateProject({
      ...project,
      progress: {
        ...progress,
        accumVocab: [...progress.accumVocab, newAccum]
      }
    });

    setCustomWord("");
    setCustomWordSentence("");
    setExpandedWordResult(null);
  };

  // Quick helper to remove a word from accumulation
  const handleRemoveVocab = (index: number) => {
    const updated = [...progress.accumVocab];
    updated.splice(index, 1);
    onUpdateProject({
      ...project,
      progress: {
        ...progress,
        accumVocab: updated
      }
    });
  };

  // 6. Save parent checklist and log progress
  const handleSaveParentFeedback = () => {
    setIsSavingFeedback(true);
    
    // Check constraints and save
    const newFeedbackObj: ParentFeedback = {
      dayNumber: selectedDayNum,
      interestRating,
      focusRating,
      comprehensionRating,
      checkmarks: selectedCheckmarks,
      notes: parentNotes,
      loggedAt: new Date().toISOString()
    };

    const newHistory = {
      ...progress.feedbackHistory,
      [selectedDayNum]: newFeedbackObj
    };

    // Auto bookmark page logic: if this was the current day, advance to the next day if allowed
    let nextDay = progress.currentDay;
    if (selectedDayNum === progress.currentDay && progress.currentDay < plan.durationDays) {
      nextDay = progress.currentDay + 1;
    }

    setTimeout(() => {
      onUpdateProject({
        ...project,
        progress: {
          ...progress,
          currentDay: nextDay,
          feedbackHistory: newHistory
        }
      });
      setIsSavingFeedback(false);
      // Clean temporary feedback entries
      setParentNotes("");
      setSelectedCheckmarks([]);
      alert(`第 ${selectedDayNum} 天精读反馈及进度已成功保存并同步！`);
    }, 400);
  };

  const currentDayFeedback = progress.feedbackHistory[selectedDayNum];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT: PLAN METRIC PANEL */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-emerald-50">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif font-bold text-gray-900 text-lg">{plan.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">书籍进度跟踪与个性化设置</p>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-gray-100">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>总精读进度</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {Math.round((Object.keys(progress.feedbackHistory).length / plan.durationDays) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(Object.keys(progress.feedbackHistory).length / plan.durationDays) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 font-mono text-right">
                已结课 / 总时长：{Object.keys(progress.feedbackHistory).length} / {plan.durationDays} 天
              </p>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl text-xs space-y-2 border border-emerald-100/50">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span>精读者专家定制适配度</span>
              </div>
              <p className="text-gray-600 leading-relaxed font-sans">{plan.suitabilityReason}</p>
            </div>

            <div className="bg-amber-50/40 p-4 rounded-2xl text-xs space-y-2 border border-amber-100/50">
              <span className="text-amber-800 font-bold">本周推荐精读周期说</span>
              <p className="text-gray-600 leading-relaxed font-sans">{plan.durationReason}</p>
            </div>
          </div>
        </div>

        {/* DAY SELECTOR CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-emerald-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-serif font-bold text-gray-800 flex items-center gap-2">
              <List className="w-4 h-4 text-emerald-700" /> 课时日程表
            </h4>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-sans font-medium">
              推荐：第{progress.currentDay}天
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: plan.durationDays }).map((_, i) => {
              const dNum = i + 1;
              const isCompleted = !!progress.feedbackHistory[dNum];
              const isActive = selectedDayNum === dNum;
              const isBookmark = progress.currentDay === dNum;

              let btnStyle = "bg-gray-50 border-gray-100/80 text-gray-600 hover:bg-gray-100";
              if (isCompleted) {
                btnStyle = "bg-emerald-50 text-emerald-800 border-emerald-200/50 hover:bg-emerald-100";
              }
              if (isBookmark) {
                btnStyle = "bg-amber-50/60 border-amber-300 text-amber-900 font-bold";
              }
              if (isActive) {
                btnStyle = "bg-emerald-800 text-white border-emerald-900 font-bold ring-2 ring-emerald-600/30";
              }

              return (
                <button
                  key={dNum}
                  id={`day-select-btn-${dNum}`}
                  onClick={() => setSelectedDayNum(dNum)}
                  className={`py-3 px-1 rounded-2xl border text-sm font-mono flex flex-col items-center justify-between transition-all duration-250 cursor-pointer ${btnStyle}`}
                >
                  <span className="text-[10px] opacity-70">DAY</span>
                  <span className="text-base">{dNum}</span>
                  {isCompleted && <CheckCircle className="w-3 h-3 text-emerald-600 fill-white mt-1" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h5 className="text-xs font-bold text-gray-700 mb-2">章节精泛划分：</h5>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {plan.chaptersGrouped.map((chapter, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-xl border text-xs flex justify-between items-start ${
                    chapter.type === "intensive"
                      ? "bg-rose-50/40 border-rose-100/50"
                      : "bg-gray-50/60 border-gray-100"
                  }`}
                >
                  <div className="flex-1 mr-3">
                    <p className="font-medium text-gray-800">{chapter.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{chapter.reason}</p>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-sans font-bold flex-shrink-0 ${
                      chapter.type === "intensive"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {chapter.type === "intensive" ? "重点精读" : "快速泛读"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: DETAILED INTERACTIVE DAY PLAN */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xs border border-emerald-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-800 text-white font-mono text-xs font-bold px-3 py-1 rounded-full">
                  第 {selectedDayNum} 天任务
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 font-sans px-2.5 py-1 rounded-md">
                  预计时常：极简伴读 {project.profile.dailyTime}分钟
                </span>
              </div>
              <h2 className="font-serif font-bold text-gray-900 text-xl md:text-2xl mt-2 flex items-center gap-2">
                阅读范围：{currentDayPlan.readingScope}
              </h2>
            </div>
          </div>

          {/* Core goals of today */}
          <div className="mt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">本期精读指引目标</h4>
            <div className="flex flex-wrap gap-2">
              {currentDayPlan.goals.map((goal, i) => (
                <span key={i} className="text-xs bg-emerald-50/80 border border-emerald-100/80 text-emerald-800 px-3 py-1.5 rounded-full">
                  🎯 {goal}
                </span>
              ))}
            </div>
          </div>

          {/* QUESTION SECTION */}
          <div className="mt-8 bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-gray-800 flex items-center gap-2 text-md">
                <HelpCircle className="w-5 h-5 text-emerald-800" />
                第一关：亲子精讲提问 (回到原文线索)
              </h3>
              <div className="flex gap-1.5 bg-gray-100 p-0.5 rounded-lg">
                {currentDayPlan.questions.map(q => {
                  const log = getAnswerLog(selectedDayNum, q.id);
                  const isAnswered = log.status === "answered";
                  return (
                    <button
                      key={q.id}
                      id={`question-tab-${q.id}`}
                      onClick={() => {
                        setActiveQuestionId(q.id);
                        setTypingAnswer("");
                      }}
                      className={`px-3 py-1 text-xs rounded-md transition-all font-mono font-bold cursor-pointer ${
                        activeQuestionId === q.id
                          ? "bg-white text-emerald-950 shadow-xs"
                          : isAnswered
                          ? "text-emerald-700/80"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {q.id}
                      {isAnswered && " ✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Question Card */}
            {currentDayPlan.questions.map(q => {
              if (q.id !== activeQuestionId) return null;

              const log = getAnswerLog(selectedDayNum, q.id);

              return (
                <div key={q.id} className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <span className="font-mono text-xs font-bold text-rose-600 block mb-1">精读核心问：</span>
                    <p className="text-gray-900 font-medium text-base leading-relaxed">{q.question}</p>
                    
                    {log.aiClue && (
                      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2 animate-fade-in">
                        <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="font-bold">✨ AI 探险包提示：</strong>
                          {log.aiClue}
                        </div>
                      </div>
                    )}
                  </div>

                  {log.status === "empty" || log.status === "hinted" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                          孩子今天是怎么表达的？(请大声听孩子说，您可以帮他打字记录原文哦)：
                        </label>
                        <textarea
                          rows={3}
                          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none bg-white font-sans transition-all"
                          placeholder="例如：孩子说不高兴当时演老虎不肯趴下受重击，还气呼呼地喊不高兴不高兴..."
                          value={typingAnswer}
                          onChange={(e) => setTypingAnswer(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          id="btn-tutor-hint"
                          onClick={() => handleRequestClue(q.id, q)}
                          disabled={isCallingTutor}
                          className="bg-amber-100 hover:bg-amber-100/80 text-amber-900 font-bold px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          求助启发提示 (不给答案)
                        </button>

                        <button
                          type="button"
                          id="btn-tutor-submit"
                          onClick={() => handleSubmitAnswer(q.id, q)}
                          disabled={isCallingTutor || !typingAnswer.trim()}
                          className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold px-5 py-2 text-xs rounded-xl flex items-center gap-1.5 transition-all flex-1 justify-center cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {isCallingTutor ? (
                            <span className="flex items-center gap-1">
                              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              AI 伴读者分析中...
                            </span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              分析孩子表达 (获取温情评语/指引)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display AI structured Feedback */
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-emerald-50">
                        <span className="text-xs text-gray-500 font-bold">孩子录入的文字：</span>
                        <button
                          onClick={() => handleResetQuestionCard(q.id)}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          重新回答
                        </button>
                      </div>
                      <p className="text-xs text-gray-800 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                        "{log.answer}"
                      </p>

                      <div className="space-y-2 pt-2 border-t border-emerald-100/50">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                          <Award className="w-4 h-4 text-emerald-700" />
                          <span>特级名师语文反馈 (写给孩子)：</span>
                        </div>
                        <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                          {log.aiFeedback}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parent Reference Box */}
                  <div className="p-3 bg-slate-100/60 rounded-xl text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">💡 亲子伴读锦囊(供家长参考，不对孩子念)：</span>
                    <p className="mt-1 font-sans">{q.standardAnswerOutline}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VOCABULARY SECTION */}
          <div className="mt-8 border-t border-gray-100 pt-8">
            <h3 className="font-serif font-bold text-gray-800 flex items-center gap-2 text-md mb-4">
              <FileText className="w-5 h-5 text-emerald-800" />
              第二关：词句精读积累营
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50/30 border border-emerald-100/40 rounded-2xl p-4">
                <span className="text-xs font-bold text-emerald-800 block mb-2">🎈 书中精选词汇 (点击智能解析)：</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentDayPlan.vocabularyTask.suggestedWords.map((word, idx) => (
                    <button
                      key={idx}
                      id={`suggested-word-${word}`}
                      onClick={() => handleExpandWord(word, currentDayPlan.vocabularyTask.suggestedSentences[0] || "")}
                      className="bg-white hover:bg-emerald-50 transition-all border border-emerald-100 text-xs text-emerald-900 font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <span>{word}</span>
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <span className="text-xs font-bold text-emerald-800 block mb-1">📖 建议赏析美句：</span>
                  <div className="space-y-1.5">
                    {currentDayPlan.vocabularyTask.suggestedSentences.map((sentence, idx) => (
                      <p key={idx} className="text-xs text-gray-700 leading-relaxed font-sans bg-white p-2 rounded-xl border border-gray-100">
                        "{sentence}"
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add Custom Child Vocab */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-2">🖋️ 孩子今天摘录的美词美句：</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      id="input-custom-word"
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      placeholder="录入孩子喜欢的新词语..."
                      className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white outline-none"
                    />
                    <input
                      type="text"
                      id="input-custom-sentence"
                      value={customWordSentence}
                      onChange={(e) => setCustomWordSentence(e.target.value)}
                      placeholder="在哪一句话中看到的？(选填)..."
                      className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white outline-none"
                    />
                    
                    {customWord.trim() && (
                      <button
                        type="button"
                        id="btn-ai-explain-word"
                        onClick={() => handleExpandWord(customWord, customWordSentence)}
                        disabled={isExpandingWord}
                        className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        {isExpandingWord ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-700" />}
                        使用 AI 辅导生成童趣解释和造句
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleAddCustomVocab}
                  disabled={!customWord.trim()}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs mt-3 cursor-pointer disabled:opacity-50"
                >
                  存入今日词句本
                </button>
              </div>
            </div>

            {/* Display Expanded AI Vocabulary Tutor Output */}
            {expandedWordResult && (
              <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3 animate-fade-in shadow-2xs">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    【{expandedWordResult.word}】汉字语文秘笈精讲：
                  </h5>
                  <button onClick={() => setExpandedWordResult(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ 关闭</button>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-gray-800 font-sans leading-relaxed bg-white/70 p-2.5 rounded-xl border border-emerald-50">
                    <strong className="text-emerald-900">📚 孩子听得懂的解释：</strong> {expandedWordResult.childExplanation}
                  </p>
                  <div>
                    <strong className="text-emerald-900">✨ 魔法生活造句：</strong>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-700 font-sans">
                      {expandedWordResult.sentences.map((s: string, idx: number) => (
                        <li key={idx}>"{s}"</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-gray-800 font-sans leading-relaxed bg-amber-50/45 p-2.5 rounded-xl border border-amber-100/50">
                    <strong className="text-amber-900 font-bold">💡 看图写话/写作迁移处方：</strong> {expandedWordResult.writingTip}
                  </p>
                </div>
              </div>
            )}

            {/* Collected vocabulary repository for this project */}
            {progress.accumVocab.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-semibold text-gray-400 block mb-2">已收录的精读词句：</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {progress.accumVocab.map((vocab, index) => (
                    <div key={index} className="p-2 bg-white border border-gray-100 rounded-xl relative group text-xs">
                      <div className="flex justify-between">
                        <strong className="text-emerald-800">#{vocab.dayNumber} {vocab.word}</strong>
                        <button
                          onClick={() => handleRemoveVocab(index)}
                          className="text-[10px] text-gray-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                      {vocab.sentence && <p className="text-[10px] text-gray-400 mt-1 italic">“{vocab.sentence}”</p>}
                      {vocab.aiExplanation && (
                        <p className="text-[10px] text-gray-600 mt-1 bg-gray-50 p-1.5 rounded-md font-sans leading-normal">
                          {vocab.aiExplanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SPEAKING / WRITING TRANSFER WORKSHOP */}
          <div className="mt-8 border-t border-gray-100 pt-8">
            <h3 className="font-serif font-bold text-gray-800 flex items-center gap-2 text-md mb-4">
              <PenTool className="w-5 h-5 text-emerald-850 animate-pulse" />
              第三关：表达力与小写作迁移
            </h3>

            <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  currentDayPlan.retellingOrWritingTask.type === "retelling"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-purple-100 text-purple-800"
                }`}>
                  {currentDayPlan.retellingOrWritingTask.type === "retelling" ? "口头复述表达" : "每日小写作迁移"}
                </span>
                <h4 className="text-sm font-bold text-gray-800">{currentDayPlan.retellingOrWritingTask.title}</h4>
              </div>

              <p className="text-xs text-gray-700 leading-relaxed font-sans mb-4">
                {currentDayPlan.retellingOrWritingTask.prompt}
              </p>

              <div>
                <span className="text-xs font-bold text-amber-900 block mb-2">🌿 给孩子的思维轮廓（表达脚手架）：</span>
                <div className="space-y-1.5">
                  {currentDayPlan.retellingOrWritingTask.scaffold.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-mono font-bold bg-amber-100 text-amber-900 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-sans">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interacting with Speaking Text */}
              <div className="mt-4 pt-4 border-t border-amber-100">
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  孩子说的或写下的文字 (您可以随时记录在此，作为复盘素材)：
                </label>
                <textarea
                  rows={2}
                  value={oralText}
                  onChange={(e) => setOralText(e.target.value)}
                  placeholder="例如：乐乐一早睁开眼，他的两只鞋子都是反着的！他跳着出了房门..."
                  className="w-full text-xs border border-amber-200/50 rounded-xl p-2.5 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* PARENT RATINGS AND CONVERT FEEDBACK TEMPLATE */}
          <div className="mt-8 border-t border-gray-100 pt-8 bg-emerald-50/10 p-6 rounded-3xl border border-emerald-100/30">
            <h3 className="font-serif font-bold text-emerald-950 flex items-center gap-2 text-md mb-4">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              第 4 步：今日家庭伴读书房日志（家长反馈模板）
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Interest rating */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-600 block">🧡 孩子的阅读兴趣：</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      onClick={() => setInterestRating(val)}
                      className={`p-1 bg-white rounded-lg border cursor-pointer transition-all ${
                        interestRating >= val ? "text-amber-500 border-amber-200" : "text-gray-300 border-gray-150"
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus evaluation */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-600 block">🧠 孩子的专注度 (伴读定力)：</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      onClick={() => setFocusRating(val)}
                      className={`p-1 bg-white rounded-lg border cursor-pointer transition-all ${
                        focusRating >= val ? "text-amber-500 border-amber-200" : "text-gray-300 border-gray-150"
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comprehension Rating */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-600 block">📚 今日理解/答客观题顺畅度：</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      onClick={() => setComprehensionRating(val)}
                      className={`p-1 bg-white rounded-lg border cursor-pointer transition-all ${
                        comprehensionRating >= val ? "text-amber-500 border-amber-200" : "text-gray-300 border-gray-150"
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick checkmarks */}
            <div className="mb-4">
              <span className="text-xs font-bold text-gray-600 block mb-2">💡 伴读亮点速记 (多选)：</span>
              <div className="flex flex-wrap gap-2">
                {["定位原文迅速", "能主动用自己的话复述", "自觉发现了好词美句", "始终保持高度欢笑兴趣", "没有产生阅读畏难情绪"].map((tag) => {
                  const isChecked = selectedCheckmarks.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedCheckmarks(selectedCheckmarks.filter(t => t !== tag));
                        } else {
                          setSelectedCheckmarks([...selectedCheckmarks, tag]);
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-emerald-800 text-white border-emerald-900 font-bold"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 block">✍️ 家长的亲子观察小记 / 复盘笔记：</label>
              <textarea
                rows={2}
                value={parentNotes}
                onChange={(e) => setParentNotes(e.target.value)}
                placeholder="例如：乐乐今天对‘武打老虎不高兴’这一章模仿得活灵活现。虽然没有读懂老虎作为反派不遵守规则的危害，但理解了故事剧情..."
                className="w-full text-xs border border-gray-200 rounded-xl p-3 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {/* Save current day feedback */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleSaveParentFeedback}
                disabled={isSavingFeedback}
                className="flex-1 bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-3 px-6 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/10 transition-all font-sans"
              >
                {isSavingFeedback ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                保存今日日志，打卡升级本书
              </button>

              <button
                onClick={onNavigateToReview}
                className="bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1 cursor-pointer transition-all font-sans border border-amber-200/50"
              >
                <span>进入总复盘诊断报表</span>
              </button>
            </div>

            {/* Render saved history details for this Day if exists */}
            {currentDayFeedback && (
              <div className="mt-4 p-3.5 bg-amber-50/50 border border-amber-250/20 rounded-2xl text-xs text-amber-950">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Award className="w-4 h-4 text-emerald-700" />
                  已保存的今日家庭反馈数据首项：
                </span>
                <p className="mt-1">兴趣星：{currentDayFeedback.interestRating}，专注星：{currentDayFeedback.focusRating}，理解星：{currentDayFeedback.comprehensionRating}</p>
                {currentDayFeedback.notes && <p className="mt-1 font-sans italic text-gray-600">"复盘：{currentDayFeedback.notes}"</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
