import React from "react";
import { BookProject } from "../types";
import { demoProjects } from "../data";
import { BookOpen, Calendar, GraduationCap, Clock, CheckCircle2, UserCheck, Flame, PlusCircle } from "lucide-react";

interface LibraryViewProps {
  onLoadProject: (project: BookProject) => void;
  activeProjectId?: string;
  customProjects: BookProject[];
  onNavigateToBuild: () => void;
}

export default function LibraryView({ onLoadProject, activeProjectId, customProjects, onNavigateToBuild }: LibraryViewProps) {
  
  // Combine custom projects and demos
  const allProjects = [...customProjects, ...demoProjects];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 flex-1">
          <h3 className="font-serif font-bold text-gray-900 text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            快速进入精讲：海量课时系统库 ({allProjects.length})
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            您可以随时选择我们的经典儿童精读特训模型进行测试体验，
            也可以点击右侧的定制按钮，定制一套前所未有的、极其符合您孩子阶段的语文专属精读器。
          </p>
        </div>

        <button
          onClick={onNavigateToBuild}
          className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold py-3 px-5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all self-stretch md:self-auto justify-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>定制我的新书</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const { profile, plan } = project;

          return (
            <div
              key={project.id}
              className={`bg-white rounded-3xl p-6 border relative transition-all duration-300 flex flex-col justify-between space-y-4 ${
                isActive
                  ? "ring-2 ring-emerald-700 border-transparent shadow-md"
                  : "border-gray-150 hover:border-emerald-200 hover:shadow-xs"
              }`}
            >
              {/* Top info and status */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  {isActive ? (
                    <span className="bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 fill-white text-emerald-700" />
                      当前正在伴读
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full font-serif font-bold">
                      {project.id.startsWith("demo") ? "内置精校版" : "我的自建版"}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-gray-900 text-lg leading-snug">
                    {project.bookTitle}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium font-sans">
                    {plan.title}
                  </p>
                </div>

                {/* Kid Profile Highlights */}
                <div className="bg-gray-50/50 p-3 rounded-2xl text-xs space-y-1.5 border border-gray-100/50">
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                    <span>讲读者：{profile.name} ({profile.grade})</span>
                  </div>
                  <p className="text-gray-400 text-[10px] leading-relaxed font-sans line-clamp-2">
                    阅读现状：{profile.readingAbility || "暂未录入细节状况"}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1 font-sans">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{plan.durationDays}日精读</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>日均 {profile.dailyTime}分钟</span>
                  </div>
                </div>
              </div>

              {/* Bottom selection button */}
              <button
                type="button"
                id={`load-project-btn-${project.id}`}
                onClick={() => {
                  onLoadProject(project);
                  alert(`成功加载《${project.bookTitle}》精读特训系统进程！请切换到【当前执行计划】查看和互动。`);
                }}
                className={`w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border-emerald-250 border"
                    : "bg-emerald-800 hover:bg-emerald-900 text-white"
                }`}
              >
                {isActive ? "正在精读中 (点击在此刷新)" : "加载并启用此精读特训营"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
