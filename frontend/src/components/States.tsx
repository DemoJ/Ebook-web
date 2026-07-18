import { BookOpen, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export function FullPageLoader() {
  return <div className="full-loader"><span className="brand-mark"><BookOpen /></span><LoaderCircle className="spin" /></div>;
}

export function LoadingState({ label = "正在整理书页…" }: { label?: string }) {
  return <div className="state-box"><LoaderCircle className="spin" /><p>{label}</p></div>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="state-box empty"><BookOpen /><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-box error"><h3>这一页没有加载成功</h3><p>{message}</p>{retry && <button className="button secondary" onClick={retry}><RefreshCw size={16} />重试</button>}</div>;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "发生了未知错误，请稍后再试";
}
