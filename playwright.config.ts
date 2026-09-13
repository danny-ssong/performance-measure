import { defineConfig } from '@playwright/test'

/**
 * 성능 측정용 Playwright 설정.
 * 서버는 직접 띄운다 — 측정은 프로덕션 빌드 기준이어야 하므로: npm run build && npm run start
 */
export default defineConfig({
  testDir: './e2e',
  // 측정끼리 CPU를 나눠 쓰면 수치가 왜곡되므로 한 번에 하나씩, 정의한 순서대로 실행한다
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['./e2e/order-grid/responsiveness-summary-reporter.ts', { outputFile: 'perf-results/order-grid-responsiveness.json' }],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    // 트레이스·비디오 녹화는 메인 스레드 부하를 더해 측정값을 흔든다. 과정을 보려면 --ui 또는 --trace on으로 켠다
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // 헤드리스는 합성 비용이 실제와 다르다 — 같은 조건에서 Commit 최대값이 헤드리스 0.3ms / 헤디드 1.7ms였다.
        // 페인트·커밋을 재려면 실제 창으로 띄워야 한다
        headless: false,
        // 창을 화면 가득 띄우고 그 크기를 그대로 뷰포트로 쓴다 (viewport: null).
        // 화면이 클수록 가상화가 그리는 행도 늘어나므로 측정값은 실행한 기기의 화면 크기에 묶인다
        // — 결과를 비교할 때는 화면 크기를 함께 기록한다 (기준 수치는 2,560×1,440 화면의 2,480×1,328 뷰포트)
        viewport: null,
        launchOptions: { args: ['--start-maximized'] },
      },
    },
  ],
})
