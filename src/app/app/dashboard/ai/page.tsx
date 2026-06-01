import { useEffect, useState } from "react";
import { Check, ExternalLink, Sparkles, Settings } from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DeepSeekLogo from "@/components/ai/icon/IconDeepseek";
import IconDoubao from "@/components/ai/icon/IconDoubao";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { cn } from "@/lib/utils";
import IconOpenAi from "@/components/ai/icon/IconOpenAi";

const AISettingsPage = () => {
  const {
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    geminiApiKey,
    geminiModelId,
    customApiKey,
    customModelId,
    customApiEndpoint,
    setDoubaoApiKey,
    setDoubaoModelId,
    setDeepseekApiKey,
    setOpenaiApiKey,
    setOpenaiModelId,
    setOpenaiApiEndpoint,
    setGeminiApiKey,
    setGeminiModelId,
    setCustomApiKey,
    setCustomModelId,
    setCustomApiEndpoint,
    selectedModel,
    setSelectedModel,
  } = useAIConfigStore();
  const [currentModel, setCurrentModel] = useState(selectedModel);

  const t = useTranslations();

  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  const handleApiKeyChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const newApiKey = e.target.value;
    if (type === "doubao") {
      setDoubaoApiKey(newApiKey);
    } else if (type === "deepseek") {
      setDeepseekApiKey(newApiKey);
    } else if (type === "gemini") {
      setGeminiApiKey(newApiKey);
    } else if (type === "openai") {
      setOpenaiApiKey(newApiKey);
    } else if (type === "custom") {
      setCustomApiKey(newApiKey);
    }
  };

  const handleModelIdChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const newModelId = e.target.value;
    if (type === "doubao") {
      setDoubaoModelId(newModelId);
    } else if (type === "openai") {
      setOpenaiModelId(newModelId);
    } else if (type === "gemini") {
      setGeminiModelId(newModelId);
    } else if (type === "custom") {
      setCustomModelId(newModelId);
    }
  };

  const handleApiEndpointChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const newApiEndpoint = e.target.value;
    if (type === "openai") {
      setOpenaiApiEndpoint(newApiEndpoint);
    } else if (type === "custom") {
      setCustomApiEndpoint(newApiEndpoint);
    }
  };

  const models = [
    {
      id: "deepseek",
      name: t("dashboard.settings.ai.deepseek.title"),
      description: t("dashboard.settings.ai.deepseek.description"),
      icon: DeepSeekLogo,
      link: "https://platform.deepseek.com",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      isConfigured: !!deepseekApiKey,
    },
    {
      id: "doubao",
      name: t("dashboard.settings.ai.doubao.title"),
      description: t("dashboard.settings.ai.doubao.description"),
      icon: IconDoubao,
      link: "https://console.volcengine.com/ark",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      isConfigured: !!(doubaoApiKey && doubaoModelId),
    },
    {
      id: "openai",
      name: t("dashboard.settings.ai.openai.title"),
      description: t("dashboard.settings.ai.openai.description"),
      icon: IconOpenAi,
      link: "https://platform.openai.com/api-keys",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      isConfigured: !!(openaiApiKey && openaiModelId && openaiApiEndpoint),
    },
    {
      id: "gemini",
      name: t("dashboard.settings.ai.gemini.title"),
      description: t("dashboard.settings.ai.gemini.description"),
      icon: Sparkles,
      link: "https://aistudio.google.com/app/apikey",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      isConfigured: !!(geminiApiKey && geminiModelId),
    },
    {
      id: "custom",
      name: "自定义服务商",
      description: "使用任何兼容 OpenAI API 格式的服务商",
      icon: Settings,
      link: "",
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-950/50",
      isConfigured: !!(customApiKey && customModelId && customApiEndpoint),
    },
  ];

  const getApiKey = (modelId: string) => {
    switch (modelId) {
      case "doubao": return doubaoApiKey;
      case "deepseek": return deepseekApiKey;
      case "openai": return openaiApiKey;
      case "gemini": return geminiApiKey;
      case "custom": return customApiKey;
      default: return "";
    }
  };

  const getModelId = (modelId: string) => {
    switch (modelId) {
      case "doubao": return doubaoModelId;
      case "openai": return openaiModelId;
      case "gemini": return geminiModelId;
      case "custom": return customModelId;
      default: return "";
    }
  };

  const getApiEndpoint = (modelId: string) => {
    switch (modelId) {
      case "openai": return openaiApiEndpoint;
      case "custom": return customApiEndpoint;
      default: return "";
    }
  };

  return (
    <div className="mx-auto py-4 px-4">
      <div className="flex gap-8">
        <div className="w-64 space-y-6">
          <div className="flex flex-col space-y-1">
            {models.map((model) => {
              const Icon = model.icon;
              const isChecked = selectedModel === model.id;
              const isViewing = currentModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    setCurrentModel(model.id as typeof currentModel);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left border",
                    "transition-all duration-200 cursor-pointer",
                    "hover:bg-primary/10 hover:border-primary/30",
                    isViewing
                      ? "bg-primary/10 border-primary/40"
                      : "border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0",
                      isViewing ? "text-primary" : "text-muted-foreground"
                    )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    <span
                      className={cn(
                        "font-medium text-sm",
                        isViewing && "text-primary"
                      )}
                    >
                      {model.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {model.isConfigured
                        ? t("common.configured")
                        : t("common.notConfigured")}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Select ${model.name}`}
                    onClick={() => {
                      setSelectedModel(model.id as any);
                      setCurrentModel(model.id as any);
                    }}
                    className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center border transition-all",
                      "shrink-0",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-transparent border-muted-foreground/40 text-transparent hover:border-primary/40"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-2xl">
          {models.map(
            (model) =>
              model.id === currentModel && (
                <div key={model.id} className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <div className={cn("shrink-0", model.color)}>
                        <model.icon className="h-6 w-6" />
                      </div>
                      {model.name}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      {model.description}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          {model.id === "custom" ? "API Key" : t(`dashboard.settings.ai.${model.id}.apiKey`)}
                        </Label>
                        {model.link && (
                          <a
                            href={model.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            {t("dashboard.settings.ai.getApiKey")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <Input
                        value={getApiKey(model.id)}
                        onChange={(e) => handleApiKeyChange(e, model.id)}
                        type="password"
                        placeholder={model.id === "custom" ? "sk-..." : t(`dashboard.settings.ai.${model.id}.apiKey`)}
                        className={cn(
                          "h-11",
                          "bg-white dark:bg-gray-900",
                          "border-gray-200 dark:border-gray-800",
                          "focus:ring-2 focus:ring-primary/20"
                        )}
                      />
                    </div>

                    {(model.id === "doubao" || model.id === "openai" || model.id === "gemini" || model.id === "custom") && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {model.id === "custom" ? "模型名称" : t(`dashboard.settings.ai.${model.id}.modelId`)}
                        </Label>
                        <Input
                          value={getModelId(model.id)}
                          onChange={(e) => handleModelIdChange(e, model.id)}
                          placeholder={model.id === "custom" ? "gpt-4o / claude-3-5-sonnet / ..." : t(`dashboard.settings.ai.${model.id}.modelId`)}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {(model.id === "openai" || model.id === "custom") && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {model.id === "custom" ? "API 端点" : t(`dashboard.settings.ai.openai.apiEndpoint`)}
                        </Label>
                        <Input
                          value={getApiEndpoint(model.id)}
                          onChange={(e) => handleApiEndpointChange(e, model.id)}
                          placeholder={model.id === "custom" ? "https://api.example.com/v1" : t(`dashboard.settings.ai.openai.apiEndpoint`)}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                        {model.id === "custom" && (
                          <p className="text-xs text-muted-foreground">
                            填写兼容 OpenAI API 格式的端点地址，例如：
                            <br />
                            • OpenAI: https://api.openai.com/v1
                            <br />
                            • 本地 Ollama: http://localhost:11434/v1
                            <br />
                            • 其他兼容服务: https://your-api.com/v1
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
};
export const runtime = "edge";

export default AISettingsPage;
