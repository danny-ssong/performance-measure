import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로파일링용 — 프로덕션 번들의 minify된 함수명을 DevTools에서 원본으로 복원하기 위해 켠다.
  // 성능 측정이 끝나면 꺼도 된다 (빌드 시간·메모리 증가, 소스 노출)
  productionBrowserSourceMaps: true,
};

export default nextConfig;
