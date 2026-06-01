import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useResumeStore } from "@/store/useResumeStore";
import { usePromptTemplateStore } from "@/store/usePromptTemplateStore";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import { extractJsonContent, createResumeFromAIResult } from "@/app/app/dashboard/resumes/utils";
import { ResumeData } from "@/types/resume";
import {
  Sparkles,
  Loader2,
  FileText,
  FileEdit,
  FilePlus,
  Check,
  Clipboard,
  Maximize2,
  Minimize2,
  RotateCcw,
  StopCircle,
  Settings2,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

// 生成带 AI 标识的简历名
const generateAIFilename = (originalName: string): string => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${originalName}-AI优化-${month}${day}`;
};

// 解析 AI 返回的 JSON 为预览数据
const parseAIPreview = (jsonStr: string): Partial<ResumeData> | null => {
  try {
    const parsed = extractJsonContent(jsonStr);
    if (!parsed) return null;

    return {
      basic: {
        name: parsed.basic?.name || "",
        title: parsed.basic?.title || "",
        email: parsed.basic?.email || "",
        phone: parsed.basic?.phone || "",
        location: parsed.basic?.location || "",
        birthDate: "",
        icons: {},
        employementStatus: "",
        photo: "",
        photoConfig: {
          width: 90,
          height: 120,
          aspectRatio: "1:1" as const,
          borderRadius: "none" as const,
          customBorderRadius: 0,
          visible: true
        },
        customFields: [],
        githubKey: "",
        githubUseName: "",
        githubContributionsVisible: false
      },
      experience: Array.isArray(parsed.experience) ? parsed.experience.map((exp: any) => ({
        id: exp.id || crypto.randomUUID(),
        company: exp.company || "",
        position: exp.position || "",
        date: exp.date || "",
        details: Array.isArray(exp.details)
          ? `<ul>${exp.details.map((d: string) => `<li>${d}</li>`).join("")}</ul>`
          : exp.details || "",
        visible: true
      })) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((proj: any) => ({
        id: proj.id || crypto.randomUUID(),
        name: proj.name || "",
        role: proj.role || "",
        date: proj.date || "",
        description: Array.isArray(proj.description)
          ? `<ul>${proj.description.map((d: string) => `<li>${d}</li>`).join("")}</ul>`
          : proj.description || "",
        visible: true,
        link: "",
        linkLabel: ""
      })) : [],
      education: Array.isArray(parsed.education) ? parsed.education.map((edu: any) => ({
        id: edu.id || crypto.randomUUID(),
        school: edu.school || "",
        major: edu.major || "",
        degree: edu.degree || "",
        startDate: edu.startDate || "",
        endDate: edu.endDate || "",
        description: edu.description || "",
        visible: true
      })) : [],
      skillContent: Array.isArray(parsed.skills)
        ? `<ul>${parsed.skills.map((s: string) => `<li>${s}</li>`).join("")}</ul>`
        : parsed.skillContent || "",
      selfEvaluationContent: parsed.selfEvaluation || "",
      certificates: [],
      customData: {}
    };
  } catch {
    return null;
  }
};

type Mode = "optimize" | "generate";

// 将简历数据转换为 Markdown 格式
const resumeToMarkdown = (resume: ResumeData): string => {
  const parts: string[] = [];

  if (resume.basic.name) {
    parts.push(`# ${resume.basic.name}`);
    if (resume.basic.title) parts.push(`**${resume.basic.title}**`);
    const contactInfo = [resume.basic.email, resume.basic.phone, resume.basic.location].filter(Boolean);
    if (contactInfo.length) parts.push(contactInfo.join(" | "));
    parts.push("");
  }

  if (resume.experience.length > 0) {
    parts.push("## 工作经历");
    resume.experience.forEach((exp) => {
      if (exp.visible === false) return;
      parts.push(`### ${exp.company} | ${exp.position}`);
      if (exp.date) parts.push(`*${exp.date}*`);
      const detailsText = exp.details.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
      if (detailsText) parts.push(detailsText);
      parts.push("");
    });
  }

  if (resume.projects.length > 0) {
    parts.push("## 项目经历");
    resume.projects.forEach((proj) => {
      if (proj.visible === false) return;
      parts.push(`### ${proj.name} | ${proj.role}`);
      if (proj.date) parts.push(`*${proj.date}*`);
      const descText = proj.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
      if (descText) parts.push(descText);
      parts.push("");
    });
  }

  if (resume.education.length > 0) {
    parts.push("## 教育经历");
    resume.education.forEach((edu) => {
      if (edu.visible === false) return;
      parts.push(`### ${edu.school}`);
      const eduInfo = [edu.major, edu.degree].filter(Boolean).join(" | ");
      if (eduInfo) parts.push(eduInfo);
      if (edu.startDate || edu.endDate) parts.push(`*${edu.startDate} - ${edu.endDate}*`);
      if (edu.description) {
        const descText = edu.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
        parts.push(descText);
      }
      parts.push("");
    });
  }

  if (resume.skillContent) {
    parts.push("## 技能");
    parts.push(resume.skillContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "));
    parts.push("");
  }

  if (resume.selfEvaluationContent) {
    parts.push("## 自我评价");
    parts.push(resume.selfEvaluationContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "));
    parts.push("");
  }

  return parts.join("\n");
};

export default function AIOptimizePage() {
  const router = useRouter();
  const { addResume, updateResume, resumes } = useResumeStore();
  const {
    selectedModel,
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    deepseekModelId,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    geminiApiKey,
    geminiModelId,
    customApiKey,
    customModelId,
    customApiEndpoint,
    isConfigured
  } = useAIConfigStore();

  const {
    optimizePrompt,
    generatePrompt,
    setOptimizePrompt,
    setGeneratePrompt,
    resetToDefault
  } = usePromptTemplateStore();

  // 状态
  const [jd, setJd] = useState("");
  const [mode, setMode] = useState<Mode>("optimize");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [experience, setExperience] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<ResumeData> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const resumeList = Object.values(resumes).filter(r => r.title);

  // 清理 AbortController
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (result && resultRef.current) {
      const container = resultRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [result]);

  const handleGenerate = async () => {
    try {
      if (!isConfigured()) {
        toast.error("请先配置 AI 模型");
        router.push("/app/dashboard/ai");
        return;
      }

      let experienceContent = experience;
      if (mode === "optimize" && selectedResumeId) {
        const selectedResume = resumes[selectedResumeId];
        if (selectedResume) {
          experienceContent = resumeToMarkdown(selectedResume);
        }
      }

      if (!experienceContent.trim()) {
        toast.error("请提供经历内容");
        return;
      }

      setIsGenerating(true);
      setResult("");
      setShowPreview(false);
      setPreviewData(null);
      abortControllerRef.current = new AbortController();

      const config = AI_MODEL_CONFIGS[selectedModel];
      const apiKey = selectedModel === "doubao" ? doubaoApiKey
        : selectedModel === "openai" ? openaiApiKey
        : selectedModel === "gemini" ? geminiApiKey
        : selectedModel === "custom" ? customApiKey
        : deepseekApiKey;
      const modelId = selectedModel === "doubao" ? doubaoModelId
        : selectedModel === "openai" ? openaiModelId
        : selectedModel === "gemini" ? geminiModelId
        : selectedModel === "custom" ? customModelId
        : deepseekModelId;
      const apiEndpoint = selectedModel === "openai" ? openaiApiEndpoint
        : selectedModel === "custom" ? customApiEndpoint
        : undefined;

      // 使用对应的提示词模板
      const systemPrompt = mode === "optimize" ? optimizePrompt : generatePrompt;

      const userPrompt = `## 岗位 JD

${jd}

## 我的过往经历

${experienceContent}`;

      // 直接调用 AI API（不经过服务器代理）
      const url = config.url(apiEndpoint);
      const headers = config.headers(apiKey);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.requiresModelId ? modelId : config.defaultModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorMessage = `请求失败 (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let fullResult = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          try {
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            const data = JSON.parse(payload);
            if (data.error?.message) {
              throw new Error(data.error.message);
            }

            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullResult += content;
              setResult(fullResult);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "No response body") {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }

      // 处理剩余数据
      const tail = (pending + decoder.decode()).trim();
      if (tail.startsWith("data:")) {
        const payload = tail.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          try {
            const data = JSON.parse(payload);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullResult += content;
              setResult(fullResult);
            }
          } catch {}
        }
      }

      // 生成完成后解析预览
      const preview = parseAIPreview(fullResult);
      if (preview) {
        setPreviewData(preview);
        setShowPreview(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleApply = () => {
    try {
      const parsed = extractJsonContent(result);
      if (!parsed) {
        toast.error("解析 AI 结果失败，请重试");
        return;
      }

      // 生成带 AI 标识的简历名
      let title = "新简历";
      if (mode === "optimize" && selectedResumeId) {
        const selectedResume = resumes[selectedResumeId];
        if (selectedResume) {
          title = generateAIFilename(selectedResume.title);
        }
      } else {
        title = generateAIFilename("新简历");
      }

      const now = new Date().toISOString();

      // 构建完整的简历数据
      const resumeData: ResumeData = {
        id: crypto.randomUUID(),
        title,
        createdAt: now,
        updatedAt: now,
        templateId: "classic",
        basic: {
          name: parsed.basic?.name || "",
          title: parsed.basic?.title || "",
          email: parsed.basic?.email || "",
          phone: parsed.basic?.phone || "",
          location: parsed.basic?.location || "",
          birthDate: "",
          icons: {
            email: "Mail",
            phone: "Phone",
            location: "MapPin"
          },
          employementStatus: "",
          photo: "",
          photoConfig: {
            width: 90,
            height: 120,
            aspectRatio: "1:1",
            borderRadius: "none",
            customBorderRadius: 0,
            visible: true
          },
          customFields: [],
          githubKey: "",
          githubUseName: "",
          githubContributionsVisible: false
        },
        experience: Array.isArray(parsed.experience) ? parsed.experience.map((exp: any) => ({
          id: exp.id || crypto.randomUUID(),
          company: exp.company || "",
          position: exp.position || "",
          date: exp.date || "",
          details: Array.isArray(exp.details)
            ? `<ul>${exp.details.map((d: string) => `<li>${d}</li>`).join("")}</ul>`
            : exp.details || "",
          visible: true
        })) : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects.map((proj: any) => ({
          id: proj.id || crypto.randomUUID(),
          name: proj.name || "",
          role: proj.role || "",
          date: proj.date || "",
          description: Array.isArray(proj.description)
            ? `<ul>${proj.description.map((d: string) => `<li>${d}</li>`).join("")}</ul>`
            : proj.description || "",
          visible: true
        })) : [],
        education: Array.isArray(parsed.education) ? parsed.education.map((edu: any) => ({
          id: edu.id || crypto.randomUUID(),
          school: edu.school || "",
          major: edu.major || "",
          degree: edu.degree || "",
          startDate: edu.startDate || "",
          endDate: edu.endDate || "",
          description: edu.description || "",
          visible: true
        })) : [],
        skillContent: Array.isArray(parsed.skills)
          ? `<ul>${parsed.skills.map((s: string) => `<li>${s}</li>`).join("")}</ul>`
          : parsed.skillContent || "",
        selfEvaluationContent: parsed.selfEvaluation || "",
        certificates: [],
        customData: {},
        activeSection: "basic",
        draggingProjectId: null,
        menuSections: [
          { id: "basic", title: "基本信息", icon: "👤", enabled: true, order: 0 },
          { id: "skills", title: "专业技能", icon: "⚡", enabled: true, order: 1 },
          { id: "experience", title: "工作经验", icon: "💼", enabled: true, order: 2 },
          { id: "projects", title: "项目经历", icon: "🚀", enabled: true, order: 3 },
          { id: "education", title: "教育经历", icon: "🎓", enabled: true, order: 4 },
        ],
        globalSettings: {
          baseFontSize: 16,
          pagePadding: 32,
          paragraphSpacing: 12,
          lineHeight: 1.5,
          sectionSpacing: 10,
          headerSize: 18,
          subheaderSize: 16,
          useIconMode: true,
          themeColor: "#000000",
          centerSubtitle: true,
        }
      };

      // 创建新简历（不覆盖原简历）
      const resumeId = addResume(resumeData);
      toast.success(`已创建新简历：${title}`);
      router.push(`/app/workbench/${resumeId}`);
    } catch (error) {
      console.error("Apply error:", error);
      toast.error("解析 AI 结果失败，请重试");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setExperience(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const currentPrompt = mode === "optimize" ? optimizePrompt : generatePrompt;
  const setCurrentPrompt = mode === "optimize" ? setOptimizePrompt : setGeneratePrompt;

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto px-6 py-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            AI 简历优化
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            输入目标岗位 JD，选择数据来源，AI 帮你生成针对性的简历
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPromptEditor(!showPromptEditor)}
          className={cn(
            "gap-2",
            showPromptEditor && "border-primary text-primary"
          )}
        >
          <Settings2 className="h-4 w-4" />
          提示词模板
        </Button>
      </div>

      {/* 提示词编辑器 */}
      {showPromptEditor && (
        <div className="mb-4 p-4 rounded-lg border bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {mode === "optimize" ? "优化模式" : "生成模式"}提示词
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="h-7 px-2 text-xs"
              >
                恢复默认
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptEditor(false)}
                className="h-7 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            className="min-h-[200px] resize-none font-mono text-xs"
            placeholder="输入提示词..."
          />
          <p className="text-xs text-neutral-400 mt-2">
            提示词会自动保存到本地，下次使用时自动加载
          </p>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* 左侧：输入区 */}
        <div className="flex flex-col gap-4 overflow-auto">
          {/* JD 输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              岗位描述 (JD)
            </label>
            <Textarea
              placeholder="粘贴目标岗位的 JD..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="min-h-[120px] resize-none rounded-lg"
            />
          </div>

          {/* 模式选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              数据来源
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("optimize")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm transition-all",
                  mode === "optimize"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-primary/30"
                )}
              >
                <FileEdit className="h-4 w-4" />
                <span>优化已有简历</span>
                {mode === "optimize" && <Check className="h-4 w-4 ml-auto" />}
              </button>
              <button
                onClick={() => setMode("generate")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm transition-all",
                  mode === "generate"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-primary/30"
                )}
              >
                <FilePlus className="h-4 w-4" />
                <span>上传新经历</span>
                {mode === "generate" && <Check className="h-4 w-4 ml-auto" />}
              </button>
            </div>
          </div>

          {/* 根据模式显示内容 */}
          {mode === "optimize" ? (
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                选择简历
              </label>
              {resumeList.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-sm">
                  暂无简历，请先创建一份
                </div>
              ) : (
                <div className="grid gap-2 max-h-[200px] overflow-auto">
                  {resumeList.map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => setSelectedResumeId(resume.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all",
                        selectedResumeId === resume.id
                          ? "border-primary bg-primary/5"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-primary/30"
                      )}
                    >
                      <FileText className={cn(
                        "h-4 w-4 shrink-0",
                        selectedResumeId === resume.id ? "text-primary" : "text-neutral-400"
                      )} />
                      <span className="truncate">{resume.title}</span>
                      {selectedResumeId === resume.id && (
                        <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  过往经历
                </label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="h-7 px-2 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    粘贴
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-7 px-2 text-xs"
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Maximize2 className="h-3 w-3 mr-1" />
                    )}
                    {isExpanded ? "收起" : "展开"}
                  </Button>
                </div>
              </div>
              <Textarea
                placeholder="粘贴或输入你的过往经历（支持 Markdown）..."
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className={cn(
                  "resize-none rounded-lg transition-all",
                  isExpanded ? "min-h-[400px]" : "min-h-[150px]"
                )}
              />
            </div>
          )}

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={
              !jd.trim() ||
              (mode === "optimize" ? !selectedResumeId : !experience.trim()) ||
              isGenerating
            }
            className="w-full bg-gradient-to-r from-[#9333EA] to-[#EC4899] hover:opacity-90 text-white h-11 shadow-lg shadow-purple-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {mode === "optimize" ? "优化简历" : "生成简历"}
              </>
            )}
          </Button>
        </div>

        {/* 右侧：结果区 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isGenerating ? "bg-primary animate-pulse" : result ? "bg-green-500" : "bg-neutral-300"
              )} />
              生成结果
            </label>
            {result && !isGenerating && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7 px-2 text-xs"
                >
                  {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showPreview ? "原始" : "预览"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setResult(""); setShowPreview(false); setPreviewData(null); handleGenerate(); }}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  重新生成
                </Button>
              </div>
            )}
          </div>

          <div
            ref={resultRef}
            className={cn(
              "flex-1 rounded-lg border p-4 overflow-auto",
              result
                ? "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                : "bg-neutral-50 dark:bg-neutral-800/50 border-dashed border-neutral-300 dark:border-neutral-700"
            )}
          >
            {result ? (
              showPreview && previewData ? (
                // 预览模式
                <div className="space-y-4">
                  {/* 基本信息 */}
                  {previewData.basic && (
                    <div className="border-b pb-3">
                      <h3 className="text-lg font-bold">{previewData.basic.name || "未填写姓名"}</h3>
                      {previewData.basic.title && <p className="text-primary">{previewData.basic.title}</p>}
                      <div className="flex gap-3 text-xs text-neutral-500 mt-1">
                        {previewData.basic.email && <span>{previewData.basic.email}</span>}
                        {previewData.basic.phone && <span>{previewData.basic.phone}</span>}
                        {previewData.basic.location && <span>{previewData.basic.location}</span>}
                      </div>
                    </div>
                  )}

                  {/* 工作经历 */}
                  {previewData.experience && previewData.experience.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">工作经历</h4>
                      {previewData.experience.map((exp) => (
                        <div key={exp.id} className="mb-2 pl-3 border-l-2 border-primary/30">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{exp.company}</span>
                            <span className="text-xs text-neutral-500">{exp.date}</span>
                          </div>
                          <p className="text-xs text-primary">{exp.position}</p>
                          {exp.details && (
                            <div className="text-xs mt-1 prose prose-xs dark:prose-invert" dangerouslySetInnerHTML={{ __html: exp.details }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 项目经历 */}
                  {previewData.projects && previewData.projects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">项目经历</h4>
                      {previewData.projects.map((proj) => (
                        <div key={proj.id} className="mb-2 pl-3 border-l-2 border-green-500/30">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{proj.name}</span>
                            <span className="text-xs text-neutral-500">{proj.date}</span>
                          </div>
                          <p className="text-xs text-green-600">{proj.role}</p>
                          {proj.description && (
                            <div className="text-xs mt-1 prose prose-xs dark:prose-invert" dangerouslySetInnerHTML={{ __html: proj.description }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 教育经历 */}
                  {previewData.education && previewData.education.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">教育经历</h4>
                      {previewData.education.map((edu) => (
                        <div key={edu.id} className="mb-2 pl-3 border-l-2 border-blue-500/30">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{edu.school}</span>
                            <span className="text-xs text-neutral-500">{edu.startDate} - {edu.endDate}</span>
                          </div>
                          <p className="text-xs text-blue-600">{edu.major} {edu.degree}</p>
                          {edu.description && <p className="text-xs mt-1">{edu.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 技能 */}
                  {previewData.skillContent && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">技能</h4>
                      <div className="text-xs prose prose-xs dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewData.skillContent }} />
                    </div>
                  )}

                  {/* 自我评价 */}
                  {previewData.selfEvaluationContent && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">自我评价</h4>
                      <p className="text-xs">{previewData.selfEvaluationContent}</p>
                    </div>
                  )}
                </div>
              ) : (
                // 原始 JSON 模式
                <Streamdown
                  animated
                  isAnimating={isGenerating}
                  className="prose dark:prose-invert max-w-none text-sm"
                >
                  {result}
                </Streamdown>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                <FileText className="h-12 w-12 mb-3" />
                <p className="text-sm">填写左侧信息后点击生成</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {result && !isGenerating && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => { setResult(""); setShowPreview(false); setPreviewData(null); }}
                className="flex-1"
              >
                清空结果
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                {mode === "optimize" ? "创建优化简历" : "创建新简历"}
              </Button>
            </div>
          )}

          {isGenerating && (
            <Button
              variant="destructive"
              onClick={handleAbort}
              className="mt-4"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              停止生成
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
