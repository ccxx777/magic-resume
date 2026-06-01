import { useState } from "react";
import { FolderOpen, Check, AlertCircle, HardDrive } from "lucide-react";
import { useSetupStore } from "@/store/useSetupStore";
import { storeFileHandle, storeConfig } from "@/utils/fileSystem";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SetupDialog({ open, onOpenChange }: SetupDialogProps) {
  const { setSetupComplete, setSyncDirectory } = useSetupStore();
  const [selectedPath, setSelectedPath] = useState("");
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState("");

  const handleSelectDirectory = async () => {
    try {
      setIsSelecting(true);
      setError("");

      // 检查浏览器是否支持 File System Access API
      if (!("showDirectoryPicker" in window)) {
        setError("您的浏览器不支持文件系统访问功能，请使用 Chrome/Edge 浏览器");
        return;
      }

      // 让用户选择目录
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "downloads",
      });

      // 尝试创建子文件夹
      let targetHandle = handle;
      const defaultFolderName = "Magic-Resume-Files";

      try {
        // 尝试获取或创建子文件夹
        targetHandle = await handle.getDirectoryHandle(defaultFolderName, {
          create: true,
        });
        setSelectedPath(`${handle.name}/${defaultFolderName}`);
      } catch (e) {
        // 如果创建子文件夹失败，使用根目录
        setSelectedPath(handle.name);
        targetHandle = handle;
      }

      setDirectoryHandle(targetHandle);
    } catch (e: any) {
      if (e.name === "AbortError") {
        // 用户取消选择
        return;
      }
      console.error("选择目录失败:", e);
      setError("选择目录失败，请重试");
    } finally {
      setIsSelecting(false);
    }
  };

  const handleConfirm = async () => {
    if (!directoryHandle) {
      setError("请先选择一个文件夹");
      return;
    }

    try {
      // 存储文件句柄到 IndexedDB
      await storeFileHandle("syncDirectory", directoryHandle);
      await storeConfig("syncDirectoryPath", selectedPath);

      // 更新状态
      setSyncDirectory(selectedPath);
      setSetupComplete(true);

      toast.success("设置完成！");
      onOpenChange(false);
    } catch (e) {
      console.error("保存设置失败:", e);
      setError("保存设置失败，请重试");
    }
  };

  const handleSkip = () => {
    setSetupComplete(true);
    onOpenChange(false);
    toast("已跳过设置，您可以稍后在设置中配置");
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HardDrive className="h-5 w-5 text-primary" />
            欢迎使用 Magic Resume
          </DialogTitle>
          <DialogDescription className="text-base">
            请选择一个文件夹来保存您的简历数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 说明 */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>简历数据将保存在您选择的文件夹中：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>支持自动同步到本地文件</li>
                  <li>数据完全存储在您的电脑上</li>
                  <li>可随时备份和迁移</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 选择目录 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">保存位置</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={selectedPath}
                  placeholder="点击右侧按钮选择文件夹..."
                  readOnly
                  className={cn(
                    "h-11 pr-10",
                    error && "border-red-500"
                  )}
                />
                <FolderOpen className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                variant="outline"
                onClick={handleSelectDirectory}
                disabled={isSelecting}
                className="h-11 px-4"
              >
                {isSelecting ? "选择中..." : "选择"}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}

            {selectedPath && !error && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                已选择：{selectedPath}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            暂时跳过
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!directoryHandle}
            className="bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4 mr-2" />
            确认设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
