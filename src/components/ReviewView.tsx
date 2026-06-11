import React, { useState } from "react";
import { BookProject, ReviewReport, ParentFeedback } from "../types";
import { Sparkles, Calendar, BookOpen, AlertCircle, TrendingUp, Award, BarChart2, Star, CheckSquare, BrainCircuit, RefreshCcw } from "lucide-react";

interface ReviewViewProps {
  project: BookProject;
}

export default function ReviewView({ project }: ReviewViewProps) {
  const { plan, progress, profile } = project;
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  // Quick stats extraction
  const loggedDaysCount = Object.keys(progress.feedbackHistory).length;
  const accumVocabCount = progress.accumVocab.length;

  // Compute average ratings
  const feedbackList = Object.values(progress.feedbackHistory);
  const avgInterest = feedbackList.length > 0 
    ? (feedbackList.reduce((acc, curr) => acc + curr.interestRating, 0) / feedbackList.length).toFixed(1)
    : "尚未打分";
  const avgFocus = feedbackList.length > 0 
    ? (feedbackList.reduce((acc, curr) => acc + curr.focusRating, 0) / feedbackList.length).toFixed(1)
    : "尚未打分";
  const avgComprehension = feedbackList.length > 0 
    ? (feedbackList.reduce((acc, curr) => acc + curr.comprehensionRating, 0) / feedbackList.length).toFixed(1)
    : "尚未打分";

  // Quick Checkmarks distribution
  const allUsedChecks = feedbackList.flatMap(f => f.checkmarks);
  const checkCounts: Record<string, number> = {};
  allUsedChecks.forEach(c => {
    checkCounts[c] = (checkCounts[c] || 0) + 1;
  });

  const handleCompileReport = async () => {
    setIsCompiling(true);
    try {
      const response = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          bookTitle: project.bookTitle,
          currentDay: loggedDaysCount,
          totalDays: plan.durationDays,
          accumVocab: progress.accumVocab,
          feedbackHistory: progress.feedbackHistory,
          studentAnswers: progress.studentAnswers
        })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setIsCompiling(false);
        return;
      }

      setReport(data);
    } catch (err) {
      console.error(err);
      alert("生成精读诊断失败。");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: MASTER STATISTICS BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* STAT 1: LOG STATUS */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-50/50 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">阅读课程进度</span>
            <h4 className="font-serif font-bold text-gray-800 text-base">打卡/总天数</h4>
          </div>
          <div className="py-2.5">
            <span className="text-3xl font-mono font-bold text-emerald-800">{loggedDaysCount}</span>
            <span className="text-gray-400 text-sm"> / {plan.durationDays} 天</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-700 h-full rounded-full"
              style={{ width: `${(loggedDaysCount / plan.durationDays) * 100}%` }}
            />
          </div>
        </div>

        {/* STAT 2: VOCAB ACCUMULATED */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-50/50 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">词汇量吸养</span>
            <h4 className="font-serif font-bold text-gray-800 text-base">本日积攒字词</h4>
          </div>
          <div className="py-2.5">
            <span className="text-3xl font-mono font-bold text-teal-800">{accumVocabCount}</span>
            <span className="text-gray-400 text-sm"> 个重点字词</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-normal">
            孩子已建立字词理解拼图，随时可用于小写作中。
          </p>
        </div>

        {/* STAT 3: AVERAGE RATINGS BOX */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-50/50 shadow-2xs md:col-span-2 space-y-4">
          <h4 className="font-serif font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-emerald-700" /> 课时平均素养等级 (家长评定)
          </h4>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-orange-50/35 p-3 rounded-2xl border border-orange-100/50">
              <span className="text-[10px] text-gray-400 block mb-1">阅读兴趣</span>
              <span className="text-lg font-mono font-bold text-orange-800">{avgInterest === "尚未打分" ? "-" : `${avgInterest}⭐`}</span>
            </div>

            <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100/50">
              <span className="text-[10px] text-gray-400 block mb-1">专注注意力</span>
              <span className="text-lg font-mono font-bold text-emerald-800">{avgFocus === "尚未打分" ? "-" : `${avgFocus}⭐`}</span>
            </div>

            <div className="bg-indigo-50/30 p-3 rounded-2xl border border-indigo-150/50">
              <span className="text-[10px] text-gray-400 block mb-1">课文理解力</span>
              <span className="text-lg font-mono font-bold text-indigo-800">{avgComprehension === "尚未打分" ? "-" : `${avgComprehension}⭐`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COMPILER PANEL: DIAGNOSIS & REVIEWS */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xs border border-emerald-50">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
              <div>
                <h3 className="font-serif font-bold text-gray-900 text-lg">
                  📘 智能家庭语文精读诊断报告
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">根据亲子伴读卡、学生回答及家长笔记，由AI生成科学复盘</p>
              </div>

              {!report && (
                <button
                  id="btn-trigger-review"
                  onClick={handleCompileReport}
                  disabled={isCompiling || loggedDaysCount === 0}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold py-2.5 px-5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/10 transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isCompiling ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{isCompiling ? "深度分析编译中..." : "启动 AI 素养诊断"}</span>
                </button>
              )}
            </div>

            {loggedDaysCount === 0 ? (
              <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">
                  没有找到打卡日志
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  请先返回『当前执行计划』 tab 页，在第 1 天或对应日期的
                  <strong>『家长反馈模板』</strong>
                  中评分、打星并点击“保存今日反馈”后，即可在这里汇聚分析！
                </p>
              </div>
            ) : report ? (
              /* THE GENERATED DIAGNOSIS STRUCTURE */
              <div className="space-y-6 animate-fade-in">
                
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 rounded-2xl text-white">
                  <span className="text-[10px] bg-emerald-700 text-emerald-100 font-bold px-2.5 py-0.5 rounded-full">
                    成长诊断专报
                  </span>
                  <h4 className="font-serif font-bold text-lg mt-1">{report.overviewTitle}</h4>
                </div>

                <div className="space-y-4">
                  {/* Subsection 1: Diagnosis */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-emerald-750" />
                      阅读理解力与阅读习惯诊断
                    </h5>
                    <p className="text-xs text-gray-700 leading-relaxed font-sans whitespace-pre-line">
                      {report.overallDiagnostic}
                    </p>
                  </div>

                  {/* Subsection 2: Achievements */}
                  <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/40">
                    <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-700" />
                      突出的语文闪光细节与成就
                    </h5>
                    <p className="text-xs text-emerald-900 leading-relaxed font-sans whitespace-pre-line">
                      {report.strengthsAchievements}
                    </p>
                  </div>

                  {/* Subsection 3: Coaching strategy */}
                  <div className="p-4 bg-amber-50/20 rounded-2xl border border-amber-100/30">
                    <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      给家长的陪伴提问语气改善指导 (画外音)
                    </h5>
                    <p className="text-xs text-amber-950 leading-relaxed font-sans whitespace-pre-line">
                      {report.coachingStrategy}
                    </p>
                  </div>

                  {/* Subsection 4: Next steps */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      下一阶段微习惯行动点 & 技巧突破：
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {report.nextLevelTasks.map((task, i) => (
                        <div key={i} className="p-3.5 bg-white border border-gray-150 rounded-xl text-xs space-y-1">
                          <span className="font-mono text-xs font-bold text-emerald-700 block">建议 {i + 1}：</span>
                          <p className="text-gray-700 leading-relaxed font-sans">{task}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subsection 5: Recommended Books */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h5 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                      📖 下期契合度最高的名作书单强劲推荐
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {report.recommendedBooks.map((b, idx) => (
                        <div key={idx} className="p-4 bg-emerald-50/40 border border-emerald-100/40 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="font-serif font-bold text-emerald-950 block text-sm">
                              {b.title}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-0.5">针对痛点推荐：{b.focusGoals}</p>
                            <p className="text-xs text-gray-600 mt-2 font-sans leading-relaxed">
                              {b.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setReport(null);
                    }}
                    className="text-xs text-emerald-700 hover:underline cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    重新生成诊断
                  </button>
                </div>

              </div>
            ) : (
              /* INITIAL PLACEHOLDER */
              <div className="p-14 text-center bg-emerald-50/30 border border-emerald-100/40 rounded-3xl space-y-3">
                <Sparkles className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <h4 className="font-serif font-bold text-gray-900 text-md">
                  准备生成宝贝的语文诊断专报
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  系统会自动汇聚收集到的 {loggedDaysCount} 篇伴读打卡日志，
                  在词语维度、句法维度、阅读回溯维度，一键汇合定制语文能力成长报告！
                </p>
                <button
                  type="button"
                  id="btn-tutor-diagnose-setup"
                  onClick={handleCompileReport}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold py-2.5 px-6 rounded-2xl cursor-pointer"
                >
                  一键启动成长诊断报告
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: WORDS WALL GALLERY */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-emerald-50">
            <h4 className="font-serif font-bold text-gray-900 text-base mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4.5 h-4.5 text-royal-700" />
              字词积累星光墙 ({accumVocabCount})
            </h4>
            <p className="text-xs text-gray-400 leading-normal mb-4">
              这些词汇是宝贝在这个周期内通过精选摘录以及AI讲解得来的语文珍藏：
            </p>

            {progress.accumVocab.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-8 italic font-sans">
                宝贝尚未添加过字词哦，在看书中发现好词时，快塞到“词句积累营”里吧。
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {progress.accumVocab.map((v, i) => (
                  <div key={i} className="p-3.5 bg-gray-50 hover:bg-emerald-50/30 transition-all rounded-2xl border border-gray-150 relative">
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md absolute right-3 top-3">
                      DAY {v.dayNumber}
                    </span>
                    <strong className="text-gray-900 font-serif text-sm">{v.word}</strong>
                    {v.sentence && (
                      <p className="text-[10px] text-gray-400 mt-1 italic leading-relaxed">
                        “{v.sentence}”
                      </p>
                    )}
                    {v.aiExplanation && (
                      <div className="mt-2 text-[10px] text-gray-600 bg-white p-2 rounded-xl border border-gray-100">
                        <strong className="text-emerald-800 font-bold block mb-0.5">释义：</strong>
                        {v.aiExplanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick parent feedback stats */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-emerald-50 space-y-3">
            <h4 className="font-serif font-bold text-gray-900 text-sm flex items-center gap-1">
              <CheckSquare className="w-4 h-4 text-emerald-800" /> 伴读闪光点统计
            </h4>
            {allUsedChecks.length === 0 ? (
              <p className="text-xs text-gray-450 italic font-sans py-4 text-center">空</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(checkCounts).map(([item, count]) => (
                  <div key={item} className="flex justify-between items-center text-xs text-gray-700">
                    <span className="font-sans">🔸 {item}</span>
                    <span className="font-mono bg-emerald-50 font-bold text-emerald-800 px-2 py-0.5 rounded-md">
                      {count} 次
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
