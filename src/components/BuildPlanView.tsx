import React, { useState } from "react";
import { ChildProfile, ReadingPlan, BookProject } from "../types";
import { Sparkles, GraduationCap, Clock, BookOpen, ScrollText, Check, Award, AlertCircle, RefreshCcw } from "lucide-react";

interface BuildPlanViewProps {
  onPlanCreated: (project: BookProject) => void;
}

export default function BuildPlanView({ onPlanCreated }: BuildPlanViewProps) {
  // Child Profile States
  const [childName, setChildName] = useState<string>("");
  const [grade, setGrade] = useState<string>("小学二年级");
  const [readingAbility, setReadingAbility] = useState<string>("");
  const [dailyTime, setDailyTime] = useState<number>(20);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["理解", "阅读兴趣"]);

  // Book States
  const [bookTitle, setBookTitle] = useState<string>("");
  const [bookCatalog, setBookCatalog] = useState<string>("");
  const [bookPages, setBookPages] = useState<string>("");
  const [bookSnippets, setBookSnippets] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messageIndex, setMessageIndex] = useState<number>(0);

  const availableGoals = [
    { id: "理解", label: "理解 (文本细节、前因后果推测)" },
    { id: "复述", label: "复述 (口头表达、逻辑连贯拼图)" },
    { id: "词句积累", label: "词句积累 (好词佳句、词义迁移生活)" },
    { id: "写作迁移", label: "写作迁移 (仿写、看图写话及表达)" },
    { id: "阅读兴趣", label: "阅读兴趣 (减轻畏难情绪、快乐伴读)" }
  ];

  const loadingMessages = [
    "正在分析小读者的阅读水平和年级适配度...",
    "正在翻阅该书籍的经典篇目与章节构成...",
    "正在根据经典精读指标划分『精读』与『泛读』段落...",
    "正在为每日课表精准设计『回到原文』的精析提问...",
    "正在配置伴读小药箱：设计不给直接答案的引路提示...",
    "儿童名师个性化『精读课时日历』定制成功，正在渲染保存..."
  ];

  const toggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  // Run the generator
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) {
      alert("请输入书籍的名称。");
      return;
    }

    setIsGenerating(true);
    setMessageIndex(0);

    // Rotate loading messages
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      const profile: ChildProfile = {
        name: childName.trim() || "宝贝",
        grade,
        readingAbility: readingAbility.trim() || "基本能自主阅读中偏上难度，识字量正常",
        dailyTime,
        targetGoals: selectedGoals
      };

      const book = {
        title: bookTitle,
        catalog: bookCatalog,
        pages: bookPages,
        snippets: bookSnippets
      };

      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, book })
      });

      const data = await response.json();
      clearInterval(interval);

      if (data.error) {
        alert(data.error);
        setIsGenerating(false);
        return;
      }

      // Pack generated result into BookProject type
      const newPlan: ReadingPlan = {
        id: `plan-${Date.now()}`,
        title: `《${bookTitle}》定制家庭精读特训营`,
        ...data
      };

      const newProject: BookProject = {
        id: `project-${Date.now()}`,
        profile,
        bookTitle,
        bookCatalog: bookCatalog || undefined,
        bookPages: bookPages || undefined,
        bookSnippets: bookSnippets || undefined,
        plan: newPlan,
        progress: {
          currentDay: 1,
          feedbackHistory: {},
          studentAnswers: {},
          accumVocab: []
        },
        createdAt: new Date().toISOString()
      };

      onPlanCreated(newProject);
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      alert("语文精读计划定制失败，这可能是网络波动，请点击重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-emerald-50 overflow-hidden relative">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 lg:p-8 text-white relative">
        <div className="absolute right-6 top-6 opacity-10">
          <ScrollText className="w-32 h-32" />
        </div>
        <span className="bg-emerald-700/60 text-emerald-100 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          家庭核心语文素养工具箱
        </span>
        <h1 className="font-serif font-bold text-2xl lg:text-3xl mt-2">
          定制全新的家庭语文精读系统
        </h1>
        <p className="text-emerald-100/80 text-xs md:text-sm mt-1 max-w-xl font-sans">
          根据宝贝当前阶段的识字情况，融合大语文名师的『原文回溯』方法论，
          定制一套包含每日提问、不给答案启发指南、词句积累及仿写表达迁移的深度伴读系统。
        </p>
      </div>

      {isGenerating ? (
        /* LOADING / GENERATION STATE */
        <div className="p-10 lg:p-20 text-center space-y-6 flex flex-col items-center justify-center min-h-[500px]">
          <div className="relative">
            <span className="p-5 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center animate-pulse">
              <RefreshCcw className="w-12 h-12 animate-spin text-emerald-800" />
            </span>
            <span className="absolute -top-1 -right-1 bg-amber-400 p-1.5 rounded-full text-white shadow-lg">
              <Sparkles className="w-4 h-4 animate-bounce" />
            </span>
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="font-serif font-bold text-emerald-900 text-lg md:text-xl">
              语文大名师正在定制伴读系统...
            </h3>
            <p className="text-gray-400 text-xs font-mono tracking-widest uppercase">
              {loadingMessages[messageIndex]}
            </p>
          </div>

          <div className="w-64 bg-gray-100 h-1 rounded-full overflow-hidden mx-auto mt-4">
            <div
              className="bg-emerald-700 h-full rounded-full transition-all duration-300"
              style={{ width: `${((messageIndex + 1) / loadingMessages.length) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        /* FORM STATE */
        <form onSubmit={handleGeneratePlan} className="p-6 lg:p-8 space-y-8">
          
          {/* STEP 1: CHILD PROFILE */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-gray-900 text-lg flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="w-6 h-6 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center font-mono text-xs font-bold">1</span>
              第一步：孩子语文阅读画像 (个性化分析依据)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  孩子昵称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="child-name-input"
                  required
                  placeholder="如：乐乐、小太阳"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  孩子所在年级
                </label>
                <select
                  value={grade}
                  id="child-grade-select"
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                >
                  <option value="学前班/大班">幼儿园大班 / 学前桥梁期</option>
                  <option value="小学一年级">小学一年级</option>
                  <option value="小学二年级">小学二年级</option>
                  <option value="小学三年级">小学三年级</option>
                  <option value="小学四年级">小学四年级</option>
                  <option value="小学五年级">小学五年级</option>
                  <option value="小学六年级">小学六年级</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  每日可用于精读的时间
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <select
                    value={dailyTime}
                    id="child-daily-time-select"
                    onChange={(e) => setDailyTime(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                  >
                    <option value={15}>15 分钟 (高效重点解析)</option>
                    <option value={20}>20 分钟 (标准精读营模式)</option>
                    <option value={30}>30 分钟 (中长篇全景精读)</option>
                    <option value={45}>45 分钟 (深度仿写小练笔)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">
                阅读能力与字词现状 (可填识字量、孩子看书习惯、是否抗拒等)
              </label>
              <textarea
                rows={2}
                id="child-reading-ability-input"
                placeholder="例如：识字量大概800字，喜欢漫画书，看到全是密密麻麻文字的小说就会抗拒害怕，需要亲子朗读辅导..."
                value={readingAbility}
                onChange={(e) => setReadingAbility(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700 block">
                家长想要重点关照的语文精读目标 (多选):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {availableGoals.map((g) => {
                  const isChecked = selectedGoals.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      id={`target-goal-btn-${g.id}`}
                      onClick={() => toggleGoal(g.id)}
                      className={`text-xs p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                        isChecked
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                          : "bg-white border-gray-150 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span>{g.label}</span>
                      <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[10px] ${
                        isChecked ? "bg-emerald-750 text-white border-transparent" : "border-gray-300 text-transparent"
                      }`}>
                        {isChecked && <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: BOOK METADATA */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-gray-900 text-lg flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="w-6 h-6 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center font-mono text-xs font-bold">2</span>
              第二步：书籍信息录入 (精益求精的基础)
            </h3>

            <div className="bg-amber-50/50 p-4 rounded-2xl flex items-start gap-2.5 border border-amber-100/50">
              <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <p className="text-amber-900 text-[11px] leading-relaxed font-sans">
                <strong>温馨提示：</strong>
                家长朋友们，如果您有
                <strong>书籍目录、或者一部分原文段落(Snippets)</strong>，
                强烈建议您黏贴在下方的对话框中！这样AI能挖掘出真正原文级别的、精准在第几页第几段的妙词佳句。直接根据书名也会自适应推荐最经典的课表，后期可补充。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-8 space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  书籍名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="book-title-input"
                  placeholder="如：《没头脑和不高兴》、《神奇树屋：恐龙谷历险记》"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  预计页数或版本说明
                </label>
                <input
                  type="text"
                  id="book-pages-input"
                  placeholder="如：大约120页 / 部编版推荐"
                  value={bookPages}
                  onChange={(e) => setBookPages(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  书籍目录 (如果有，强烈建议带上每一章节标题)
                </label>
                <textarea
                  rows={4}
                  id="book-catalog-input"
                  placeholder="例如：
第一章：小熊的奇妙早晨
第二章：在郁金香花园里迷路
第三章：寻找会飞的黄金杯..."
                  value={bookCatalog}
                  onChange={(e) => setBookCatalog(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  选段原文/精彩段落试读 (黏贴一部分内容效果翻倍)
                </label>
                <textarea
                  rows={4}
                  id="book-snippets-input"
                  placeholder="例如：
‘没头脑’做事情总是丢三落四的。今天早晨，他刚从家里出来，就发现钥匙忘记在桌上了。他一扭身说：哎呀！不好了。急匆匆又跑回去..."
                  value={bookSnippets}
                  onChange={(e) => setBookSnippets(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              id="submit-build-plan-btn"
              className="w-full md:w-auto bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-950 hover:to-black text-white font-serif font-bold py-4 px-10 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/10"
            >
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>立即使用 AI 定制专属精读系统</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
