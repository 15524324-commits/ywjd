import React, { useState, useEffect } from "react";
import { BookProject } from "./types";
import { demoProjects } from "./data";
import LibraryView from "./components/LibraryView";
import BuildPlanView from "./components/BuildPlanView";
import ActivePlanView from "./components/ActivePlanView";
import ReviewView from "./components/ReviewView";
import { BookMarked, Settings, Compass, ClipboardList, PenTool, Flame, RefreshCw, Feather } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("library");
  const [customProjects, setCustomProjects] = useState<BookProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("demo-metounao");

  // Load state from localStorage on init
  useEffect(() => {
    try {
      const storedCustom = localStorage.getItem("chinese_reading_custom_projects");
      if (storedCustom) {
        setCustomProjects(JSON.parse(storedCustom));
      }

      const storedActiveId = localStorage.getItem("chinese_reading_active_project_id");
      if (storedActiveId) {
        setActiveProjectId(storedActiveId);
      }
    } catch (err) {
      console.error("加载本地存储错：", err);
    }
  }, []);

  // Sync state to localStorage
  const handleUpdateCustomProjects = (updatedList: BookProject[]) => {
    setCustomProjects(updatedList);
    try {
      localStorage.setItem("chinese_reading_custom_projects", JSON.stringify(updatedList));
    } catch (err) {
      console.error("同步至本地存储出错：", err);
    }
  };

  const handleSetActiveProjectId = (id: string) => {
    setActiveProjectId(id);
    try {
      localStorage.setItem("chinese_reading_active_project_id", id);
    } catch (err) {
      console.error("同步活动ID出错：", err);
    }
  };

  // Get active project
  const allProjects = [...customProjects, ...demoProjects];
  const activeProject = allProjects.find(p => p.id === activeProjectId) || allProjects[0];

  // Load a selected project and focus on execution
  const handleLoadProject = (project: BookProject) => {
    handleSetActiveProjectId(project.id);
    setActiveTab("active");
  };

  // Callback when user generates a new plan
  const handlePlanCreated = (newProject: BookProject) => {
    const updatedList = [newProject, ...customProjects];
    handleUpdateCustomProjects(updatedList);
    handleSetActiveProjectId(newProject.id);
    setActiveTab("active");
    alert(`成功为您生成《${newProject.bookTitle}》家庭语文精读系统计划！`);
  };

  // Callback when day-to-day active log gets updated
  const handleUpdateActiveProject = (updated: BookProject) => {
    // If it's a custom project, update customProjects
    if (customProjects.some(p => p.id === updated.id)) {
      const updatedList = customProjects.map(p => (p.id === updated.id ? updated : p));
      handleUpdateCustomProjects(updatedList);
    } else {
      // It's a demo project: store modified demo projects as custom so parents can save progress on pre-built books!
      const updatedList = [updated, ...customProjects.filter(p => p.id !== updated.id)];
      handleUpdateCustomProjects(updatedList);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans text-sm selection:bg-emerald-150 flex flex-col justify-between">
      
      {/* TOP DECORATIVE HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* LOGO */}
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-800 text-white rounded-xl">
                <BookMarked className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-serif font-black text-emerald-950 text-base md:text-lg flex items-center gap-1">
                  儿童语文精读系统 <span className="font-sans text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">精学辅导版</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-medium">家庭语文精细化阅读与反馈伴读实验室</p>
              </div>
            </div>

            {/* TAB INTERACTIVES */}
            <div className="hidden md:flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/50">
              <button
                id="tab-btn-library"
                onClick={() => setActiveTab("library")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "library"
                    ? "bg-white text-emerald-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>精读选本库</span>
              </button>

              <button
                id="tab-btn-build"
                onClick={() => setActiveTab("build")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "build"
                    ? "bg-white text-emerald-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>定制新精读</span>
              </button>

              <button
                id="tab-btn-active"
                onClick={() => setActiveTab("active")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "active"
                    ? "bg-white text-emerald-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>计划执行计划</span>
              </button>

              <button
                id="tab-btn-review"
                onClick={() => setActiveTab("review")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "review"
                    ? "bg-white text-emerald-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                <span>阅读素养诊断</span>
              </button>
            </div>

            {/* QUICK BRAND BADGE */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-gray-400 block font-bold">当前伴读对象</span>
                <span className="text-xs font-sans text-gray-700 font-bold">
                  {activeProject ? `${activeProject.profile.name} (${activeProject.profile.grade})` : "暂无对象"}
                </span>
              </div>
              <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-serif text-sm font-bold text-emerald-850">
                {activeProject ? activeProject.profile.name[0] : "精"}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE TAB BAR */}
      <div className="md:hidden bg-white border-b border-gray-150 grid grid-cols-4 divide-x divide-gray-100 py-1 sticky top-16 z-40 shadow-xs">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex flex-col items-center py-2 text-[10px] font-bold ${
            activeTab === "library" ? "text-emerald-800 font-black" : "text-gray-400"
          }`}
        >
          <Compass className="w-4.5 h-4.5 mb-1" />
          精读选本库
        </button>
        <button
          onClick={() => setActiveTab("build")}
          className={`flex flex-col items-center py-2 text-[10px] font-bold ${
            activeTab === "build" ? "text-emerald-800 font-black" : "text-gray-400"
          }`}
        >
          <PenTool className="w-4.5 h-4.5 mb-1" />
          定制新书
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`flex flex-col items-center py-2 text-[10px] font-bold relative ${
            activeTab === "active" ? "text-emerald-800 font-black" : "text-gray-400"
          }`}
        >
          <ClipboardList className="w-4.5 h-4.5 mb-1" />
          执行计划
        </button>
        <button
          onClick={() => setActiveTab("review")}
          className={`flex flex-col items-center py-2 text-[10px] font-bold ${
            activeTab === "review" ? "text-emerald-800 font-black" : "text-gray-400"
          }`}
        >
          <Feather className="w-4.5 h-4.5 mb-1" />
          素养诊断
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {activeTab === "library" && (
          <LibraryView
            onLoadProject={handleLoadProject}
            activeProjectId={activeProjectId}
            customProjects={customProjects}
            onNavigateToBuild={() => setActiveTab("build")}
          />
        )}

        {activeTab === "build" && (
          <BuildPlanView onPlanCreated={handlePlanCreated} />
        )}

        {activeTab === "active" && activeProject && (
          <ActivePlanView
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onNavigateToReview={() => setActiveTab("review")}
          />
        )}

        {activeTab === "review" && activeProject && (
          <ReviewView project={activeProject} />
        )}
      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-white border-t border-gray-150 py-8 mt-12 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="font-serif font-black text-gray-500">少儿大语文精读法：定位原文 • 启发提示 • 融会积累 • 写作表达</p>
          <p className="font-sans leading-relaxed max-w-lg mx-auto">
            本语文精读系统不直接提供标准答案、不代替思考。采用启发方式，当孩子在卡壳时给予合理的段落提示与引导，
            帮助孩子在愉悦、专注的成长空间中建立终身有益的阅读底色。
          </p>
          <div className="pt-2 flex items-center justify-center gap-1 font-mono font-bold text-[10px] text-gray-300">
            <span>METHODOLOGY: LITERAL READING AND RETENTION MODEL</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
