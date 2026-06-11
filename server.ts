import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper for sending error response
const handleError = (res: express.Response, error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  res.status(500).json({
    error: `在${context}中发生错误: ${error.message || "未知错误"}`,
  });
};

// 1. Plan Generation API
app.post("/api/generate-plan", async (req, res) => {
  try {
    const { profile, book } = req.body;
    if (!profile || !book) {
      return res.status(400).json({ error: "Missing child profile or book data." });
    }

    const prompt = `
      你是一个极其专业的、懂儿童发展心理学和语文教育的【儿童语文精读系统搭建师】。
      现在有一位家长想让孩子精读一本书，请你根据孩子信息和书籍内容，定制一套【可以执行、可以复盘、可以复用】的家庭语文精读计划。

      ### 孩子信息
      - 年级: ${profile.grade}
      - 识字量/阅读能力: ${profile.readingAbility || "默认中等"}
      - 每日可支配阅读时间: ${profile.dailyTime}分钟
      - 家长想训练的核心目标: ${profile.targetGoals ? profile.targetGoals.join("、") : "理解 词句 兴趣"}

      ### 书籍信息
      - 书名: ${book.title}
      - 目录: ${book.catalog || "未提供，请根据常识和经典书目自行脑补或推拟目录"}
      - 页数: ${book.pages || "未提供"}
      - 精选/试读原文 snippets: ${book.snippets || "未提供"}

      ### 必须遵循的【精读设计铁律】：
      1. 评判适配度：这本书适合该孩子现阶段阅读吗？说明为什么，并给出合理增效或降低难度的操作建议。
      2. 周期判定：推荐今天起用几天完成？请根据规则合理定天数（绘本1-3天，桥梁书3-7天，中篇7-14天，长篇14-30天）。不允许默认胡乱设置为7天，理由要极其扎实！页数或章节很多时，切记只精读重点，其余泛读。
      3. 每天阅读量必须控制在符合该年级、该能力、且每日${profile.dailyTime}分钟内可完成。
      4. 每日任务包括：
         - 明确课时要读的范围。
         - 精读问答（3个）：所有问题必须【尽量回到原文】，引导孩子在第几段、哪个情节细节中寻找证据。问题类型可以包括事实提取、细节推断、词句情感体悟。
         - 为每个问题预留一个“求助提示”（clue）——它不能是直接答案，必须是好玩的谜语、引导语或定位指示（例如“找一找第三自然段妈妈递杯子时的神情哦”），不替孩子回答！
         - 每日词句积累：精选2-3个词语和1句优美句子或修辞句字，并给出简短生动的“亲子伴读引导词”。
         - 每日表达迁移（口述或小写作）：为今天拟定一个能紧密结合原文写作手法或故事逻辑的表达小任务。提供一个两到三点的思维脚手架，控制在10分钟内可完成。
      
      请按照以下 JSON 格式生成，确保不含 markdown 代码块以外的多余文字。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSuitable: { type: Type.BOOLEAN, description: "是否适合当前年级和能力" },
            suitabilityReason: { type: Type.STRING, description: "适配度深度解析与建议" },
            readingMode: { type: Type.STRING, description: "阅读模式 (如: 全本精读 / 部分章节精读+泛读 / 推荐泛读)" },
            readingModeDescription: { type: Type.STRING, description: "为什么选择该模式以及精讲章节的选择考量" },
            durationDays: { type: Type.INTEGER, description: "推荐精读总天数" },
            durationReason: { type: Type.STRING, description: "推荐该周期的深度教育性考量" },
            isVelocityReasonable: { type: Type.BOOLEAN, description: "每日配额是否合理" },
            velocityAssessment: { type: Type.STRING, description: "阅读量配额分析" },
            chaptersGrouped: {
              type: Type.ARRAY,
              description: "章节列表以及精读/泛读归类",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "章节名称或页码范围" },
                  type: { type: Type.STRING, description: "intensive(精读) 或 extensive(泛读)" },
                  reason: { type: Type.STRING, description: "为何如此划分" }
                },
                required: ["title", "type", "reason"]
              }
            },
            days: {
              type: Type.ARRAY,
              description: "每日详细阅读和互动任务",
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER, description: "天数序号，从1开始" },
                  readingScope: { type: Type.STRING, description: "本日阅读范围 (如：第1-3章，或者第12-25页)" },
                  goals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "今日精读核心目标" },
                  questions: {
                    type: Type.ARRAY,
                    description: "3个精读提问，必须回到原文，配给好玩的向导式提示而决不能出现标准答案",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "Q1, Q2, Q3" },
                        question: { type: Type.STRING, description: "深度提问，触及细节与推断" },
                        clue: { type: Type.STRING, description: "启发式的提示/配给线索，绝非直接答案" },
                        standardAnswerOutline: { type: Type.STRING, description: "提供给家长的核心踩分点/引导方向，不直接展示给孩子" }
                      },
                      required: ["id", "question", "clue", "standardAnswerOutline"]
                    }
                  },
                  vocabularyTask: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING, description: "词句积累要求" },
                      suggestedWords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "书中建议摘录的优秀词汇" },
                      suggestedSentences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "书中建议赏析的优美段落/句子" }
                    },
                    required: ["description", "suggestedWords", "suggestedSentences"]
                  },
                  retellingOrWritingTask: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "任务类型: 'retelling'(口头复述) 或 'writing'(小写作)" },
                      title: { type: Type.STRING, description: "任务主题" },
                      prompt: { type: Type.STRING, description: "具体表达任务及语境设计" },
                      scaffold: { type: Type.ARRAY, items: { type: Type.STRING }, description: "提供给孩子的2-3步思维脚手架/框架" }
                    },
                    required: ["type", "title", "prompt", "scaffold"]
                  }
                },
                required: ["dayNumber", "readingScope", "goals", "questions", "vocabularyTask", "retellingOrWritingTask"]
              }
            }
          },
          required: [
            "isSuitable",
            "suitabilityReason",
            "readingMode",
            "readingModeDescription",
            "durationDays",
            "durationReason",
            "isVelocityReasonable",
            "velocityAssessment",
            "chaptersGrouped",
            "days"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }
    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error) {
    handleError(res, error, "生成精读系统计划");
  }
});

// 2. Interactive Tutor Feedback and Hints API (Answers & Ask for Clue)
app.post("/api/tutor-feedback", async (req, res) => {
  try {
    const { question, studentAnswer, isAskingForClue, dayContext } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Missing question context." });
    }

    let prompt = "";
    if (isAskingForClue) {
      prompt = `
        你是一个温柔、幽默、充满儿童语文教育智慧的亲子讲读顾问。
        现在孩子在做关于【精读提问】的回答时遇到了卡壳，点击了“求助提示”。
        
        提问内容: "${question.question}"
        问题的线索背景: "${question.clue}"
        课时阅读范围及目标 context: "${dayContext}"
        
        请你生成一段【文字轻巧、妙趣横生】的“引路人”提示。
        - 坚决不能直接告诉孩子答案！
        - 应该像一个森林向导一样指指路，例如：“哎呀，小探险家，你记不记得，当小熊看到那棵金色大树时，手里拿的是什么礼物？偷偷翻一翻第5页最下面那行字，惊喜就在那里等着你呢！”
        - 语气要非常童趣、温暖，字数控制在60-120字左右，能快速安抚孩子的挫败感，让他重新找到看书找原文的兴趣。
      `;
    } else {
      prompt = `
        你是一个极其会夸奖并且引导孩子深入思考的【语文特级教师】。
        现在孩子提交了对于这个精读提问的回答，请你给予孩子精准的反馈和伴读提示。
        
        提问内容: "${question.question}"
        问题的参考踩分方向: "${question.standardAnswerOutline}"
        孩子写下的回答: "${studentAnswer || "（空，或者哼哈一两字）"}"
        
        请给出一个有爱的评估与精读升华：
        1. 肯定孩子的闪光点：即使回答很简短或者不着边际，也要找到能夸奖的点（如“能主动表达极其棒”、“看到了一个很有创意的细节”）。
        2. 给与【文本锚定】的智慧提示：指出如果想回答得更棒，可以去原文哪个地方找哪种证据（不能直接把标准答案甩给他，用选择题或反问句来引导。例如：“如果你能再去看看狐狸拍着胸脯说话时的那个神态词，你的答案还会更加神奇哦！你觉得狐狸当时是真心的，还是在动歪脑筋呢？”）。
        3. 用温纯亲切的中国话表达，避免任何冰冷死板的教科书打分。字数控制在150字以内。
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING, description: "给孩子的轻重合适、饱含温情的辅导反馈/启发提示" },
            clueHint: { type: Type.STRING, description: "针对提示申请而特制的森林导游化定位线索" },
            parentGuidance: { type: Type.STRING, description: "给家长的画外音小贴士（例如：‘此时可以摸摸孩子脑袋，如果他再次回答了xx，就说明他真的听懂了’）" }
          },
          required: ["feedback", "clueHint", "parentGuidance"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }
    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error) {
    handleError(res, error, "智能伴读互动辅导");
  }
});

// 3. Vocabulary Expansion API
app.post("/api/vocab-expansion", async (req, res) => {
  try {
    const { word, sentence, grade } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Missing word" });
    }

    const prompt = `
      请你为一名[${grade || "小学中年级"}]的孩子讲解词语“${word}”。
      ${sentence ? `在这句话中：“${sentence}”` : ""}
      
      请提供极其适合孩子的解释：
      1. 童趣形象化的字义：不要照搬字典！要用比喻或者生动场景，一两句解释他听得懂。
      2. 魔法造句（2句）：第一句是日常生活场景，第二句是富有画面感或童话韵味的场景。
      3. 写作迁移小配方：告诉孩子在写什么样的作文中（例如写难过、写天气、写做家务）可以用这个词，以及如何用这个词升华文章。
      
      请按照以下 JSON 格式输出。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            childExplanation: { type: Type.STRING, description: "针对孩子年级量身造的童趣化、画面化释义" },
            sentences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2句魔法生活与童趣造句" },
            writingTip: { type: Type.STRING, description: "该词如何在写作/看图写话中迁移使用的专属配方" }
          },
          required: ["childExplanation", "sentences", "writingTip"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }
    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error) {
    handleError(res, error, "词句互动解析拓展");
  }
});

// 4. Weekly Review Report API
app.post("/api/generate-review", async (req, res) => {
  try {
    const { profile, bookTitle, currentDay, totalDays, accumVocab, feedbackHistory, studentAnswers } = req.body;
    
    const prompt = `
      你是一个资深的家庭教育指导师兼儿童中文阅读教育专家。
      请根据孩子在这本《${bookTitle || "正在阅读的书"}》精读项目中的历史追踪数据，生成一份【温度与专业并存】的《孩子家庭语文精读诊断与复盘报告》。
      
      ### 基础概况:
      - 孩子画像: ${profile.grade}, 阅读力: ${profile.readingAbility || "未定"}
      - 精读进度: 执行了 ${currentDay}/${totalDays} 天的书籍进度。
      
      ### 精读追踪日志数据:
      - 孩子积累的词句 (${accumVocab ? accumVocab.length : 0}个): ${JSON.stringify(accumVocab || [])}
      - 孩子对精读问题回答的片段记事: ${JSON.stringify(studentAnswers || {})}
      - 家长每日反馈记录历史: ${JSON.stringify(feedbackHistory || {})}
      
      ### 报告内容深度要求：
      1. 【阅读能力与习惯诊断】：分析孩子当前的理解深度、文本回溯寻找线索的主动性、词句吸收和口头/书面表达的情绪状态。
      2. 【闪光之处与亮点成就】：孩子在哪些地方展现了出色的理解、哪些摘录表现出细腻的审美。
      3. 【亲子辅导诊断】：给家长一些改善提问方式、减少焦虑、营造轻松阅读场域的极富同理心的专业建议。
      4. 【下一步精细训练方向 & 推荐书目】：给出3条切实易行的精读小策略，并且【强力推荐三本符合该能力段的精讲好书/下期书单】，并说明为何推荐这几本。

      请按照下面的 JSON 结构进行组织：
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overviewTitle: { type: Type.STRING, description: "报告标题，如：‘小探险家[名字]的《小王子》精读成长诊断’" },
            overallDiagnostic: { type: Type.STRING, description: "阅读力与阅读习惯的专业诊断" },
            strengthsAchievements: { type: Type.STRING, description: "孩子在当前周期内的闪光点与具体成就" },
            coachingStrategy: { type: Type.STRING, description: "给家长的家庭伴读、提问语气策略改善指导" },
            nextLevelTasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3个核心的核心下一阶段具体的微训练行动点" },
            recommendedBooks: {
              type: Type.ARRAY,
              description: "下期精读推荐书目，需完全按契合度定做",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "书名" },
                  reason: { type: Type.STRING, description: "推荐理由（契合何种阅读痛点或能力迁移）" },
                  focusGoals: { type: Type.STRING, description: "针对这本书的下期训练重点（如：‘积累动态描写，掌握分段复述’）" }
                },
                required: ["title", "reason", "focusGoals"]
              }
            }
          },
          required: [
            "overviewTitle",
            "overallDiagnostic",
            "strengthsAchievements",
            "coachingStrategy",
            "nextLevelTasks",
            "recommendedBooks"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }
    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error) {
    handleError(res, error, "生成阶段复盘诊断");
  }
});

async function bootstrap() {
  // Configure Vite and static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start Server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
