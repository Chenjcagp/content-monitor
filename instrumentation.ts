// Next.js 启动钩子：进程启动时执行一次
// 用来注册 cron、初始化 DB 等"只能跑一次"的工作
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 Node.js 运行时（不是 edge）执行
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // 动态 import 避免在 edge 运行时打包
  const { startCron } = await import("./lib/cron");
  await startCron();
}
