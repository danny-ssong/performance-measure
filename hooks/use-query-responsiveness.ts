'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { reportToAnalytics, type AnalyticsContext } from '@/lib/analytics'
import {
  isFrameBlockingSupported,
  observeFrameBlocking,
  type FrameBlockingReport,
} from '@/lib/performance/frame-blocking'
import { INP_GOOD_THRESHOLD_MS, rateInp } from '@/lib/performance/inp-rating'
import {
  isInteractionTimingSupported,
  observeInteractions,
  type InteractionEventReport,
} from '@/lib/performance/interaction-timing'
import {
  isLongTaskSupported,
  observeLongTasks,
  type LongTaskReport,
} from '@/lib/performance/long-task'
import { runAfterNextPaint } from '@/lib/performance/next-paint'
import { publishResponsivenessReport } from '@/lib/performance/responsiveness-probe'
import { createResponsivenessTracker } from '@/lib/performance/responsiveness-tracker'

// 구간이 끝나고 메인 스레드가 풀린 뒤, 늦게 도착하는 Event Timing·LoAF 기록을 이만큼 기다렸다가 느린 상호작용을 보고한다
const FINALIZE_DELAY_MS = 1000

type UseQueryResponsivenessOptions = {
  /** 측정 구간을 여는 신호 — 조회가 진행 중인지 */
  isQuerying: boolean
  /**
   * 화면에 그려질 결과. 이 값으로 커밋된 뒤 페인트까지 끝나면 측정 구간을 닫는다.
   *
   * 조회 종료(isQuerying이 false가 되는 시점)로 구간을 닫으면 안 되는 이유:
   * 결과 렌더를 트랜지션으로 미루면 그 렌더가 isQuerying이 내려간 **뒤에** 온다.
   * 그러면 정작 재려던 비용이 구간 밖으로 빠져, 트랜지션을 켠 구현이 실제보다 빠르게 측정된다.
   * 그래서 "언제 요청이 끝났나"가 아니라 "언제 결과가 화면에 있나"로 닫는다.
   */
  renderedResult: unknown
  /**
   * `renderedResult`가 최신 결과인지. false면 아직 그릴 것이 남았다는 뜻이라 구간을 닫지 않는다.
   *
   * 이 값이 따로 필요한 이유: 트랜지션을 쓰면 응답이 도착해 조회가 끝난 뒤에도 화면에는 아직
   * **이전 결과(또는 빈 화면)**가 있다. 그 상태의 페인트로 구간을 닫으면 정작 재려던 렌더가 구간 밖으로 빠진다.
   * "결과가 그려졌다"와 "**최신** 결과가 그려졌다"를 구분해야 한다
   */
  isResultSettled: boolean
  /** 분석 이벤트에 함께 실어 보낼 식별 정보 — 어느 화면·조건에서 난 지연인지 구분한다 */
  analyticsContext: AnalyticsContext
  /** 이 시간(ms) 이상이면 분석 도구로 보낸다. 기본값은 INP "좋음" 기준(200ms) */
  reportThreshold?: number
}

// 셋 중 하나라도 없으면 측정하지 않는다. 특히 Long Tasks가 빠지면 추정 INP가 태스크를 "50ms 미만"으로
// 잘못 가정해 크게 과소 추정된다 — 다행히 Long Tasks(58+)가 LoAF(123+)보다 먼저 들어와 실제로는 함께 지원된다
function isResponsivenessMeasurementSupported(): boolean {
  return isFrameBlockingSupported() && isLongTaskSupported() && isInteractionTimingSupported()
}

/**
 * 조회 결과가 화면에 그려지기까지의 반응성을 측정한다 — 가장 느린 상호작용(INP 방식)과 입력 차단(LoAF).
 *
 * 측정 구간은 `조회 시작 ~ 결과가 그려진 뒤`다. 끝을 조회 종료가 아니라 페인트로 잡는 이유는
 * renderedResult 설명에 있다.
 *
 * 관찰자를 구간에 맞춰 켜고 끄지 않는 이유:
 * 세 API 모두 기록이 프레임·화면 표시 뒤에 비동기로 도착하므로, 구간이 닫힐 때 관찰을 끊으면
 * 가장 무거운 프레임의 기록을 놓친다. 그래서 관찰자는 마운트 내내 유지하고, 구간 판정은 시각으로 한다.
 *
 * 결과는 화면에 그리지 않고 두 곳으로만 내보낸다: 느린 건은 분석 도구로, 요약 전체는 자동화 측정 통로로.
 * React 상태를 거치지 않으므로 기록이 도착해도 리렌더가 일어나지 않아, 측정이 측정 대상(렌더 비용)을 부풀리지 않는다
 */
export function useQueryResponsiveness({
  isQuerying,
  renderedResult,
  isResultSettled,
  analyticsContext,
  reportThreshold = INP_GOOD_THRESHOLD_MS,
}: UseQueryResponsivenessOptions): void {
  const [tracker] = useState(createResponsivenessTracker)

  // 구간 상태와 최신 요약을 함께 보낸다 — 자동화 측정이 구간 시작·종료와 값 안정 여부를 이것으로 판단한다
  const publishReport = useEffectEvent(() => {
    if (!isResponsivenessMeasurementSupported()) {
      publishResponsivenessReport({ status: 'unsupported' })
      return
    }
    publishResponsivenessReport({
      // 조회 상태가 아니라 구간 상태다 — 트랜지션에서는 조회가 끝난 뒤에도 구간이 열려 있다
      status: tracker.isWindowOpen() ? 'measuring' : 'idle',
      summary: tracker.getSnapshot(),
    })
  })

  useEffect(() => {
    if (isQuerying) tracker.startWindow()
    // 마운트 직후 첫 보고(지원 여부)도 여기서 겸한다
    publishReport()
  }, [isQuerying, tracker])

  // 최신 결과가 화면에 그려지면 구간을 닫는다.
  //
  // 세 조건이 모두 필요하다.
  // - isQuerying: 조회 중이면 아직 그릴 결과가 오지 않았다 (직전 결과의 페인트로 새 구간을 끊지 않게 한다)
  // - isResultSettled: 트랜지션이 아직 따라잡지 못했으면 화면의 결과는 최신이 아니다 — 정작 재려던 렌더가 남아 있다
  // - runAfterNextPaint: 커밋이 아니라 페인트까지 끝나야 스타일·레이아웃 비용이 구간에 들어온다
  useEffect(() => {
    if (isQuerying || !isResultSettled) return

    return runAfterNextPaint(() => {
      tracker.endWindow()
      // endWindow는 요약을 바꾸지 않아 구독 알림이 없으므로 직접 알린다
      publishReport()
    })
  }, [renderedResult, isQuerying, isResultSettled, tracker])

  useEffect(() => tracker.subscribe(() => publishReport()), [tracker])

  // 최신 analyticsContext·reportThreshold를 읽되, 바뀔 때마다 관찰자를 다시 만들지 않는다
  const handleFrame = useEffectEvent((frame: FrameBlockingReport) => {
    const isRecorded = tracker.recordFrame(frame)
    if (isRecorded && frame.blockingDuration >= reportThreshold) {
      reportToAnalytics('frame-blocked', { ...frame, context: analyticsContext })
    }
  })

  const handleLongTask = useEffectEvent((task: LongTaskReport) => {
    tracker.recordLongTask(task)
  })

  const handleInteractionEvent = useEffectEvent((event: InteractionEventReport) => {
    tracker.recordInteractionEvent(event)
  })

  useEffect(() => {
    const stopObservingFrames = observeFrameBlocking((frame) => handleFrame(frame))
    const stopObservingLongTasks = observeLongTasks((task) => handleLongTask(task))
    const stopObservingInteractions = observeInteractions((event) => handleInteractionEvent(event))
    return () => {
      stopObservingFrames()
      stopObservingLongTasks()
      stopObservingInteractions()
    }
  }, [])

  const reportWorstInteraction = useEffectEvent(() => {
    const worst = tracker.getSnapshot()?.worstInteraction
    if (!worst || worst.duration < reportThreshold) return

    reportToAnalytics('slow-interaction', {
      ...worst,
      rating: rateInp(worst.duration),
      culprits: tracker.framesDuring(worst).flatMap((frame) => frame.culprits),
      context: analyticsContext,
    })
  })

  // 한 상호작용의 이벤트들이 여러 번에 나눠 도착하므로, 구간이 끝나고 기록이 모인 뒤 한 번만 보낸다.
  // 그 전에 다음 조회가 시작되거나 언마운트되면 cleanup에서 바로 보낸다 (cleanup은 새 구간이 열리기 전에 실행된다)
  useEffect(() => {
    if (isQuerying) return

    let isReported = false
    const reportOnce = () => {
      if (isReported) return
      isReported = true
      reportWorstInteraction()
    }

    // 이 effect는 결과 렌더 직후, 메인 스레드가 아직 막혀 있을 때 실행될 수 있다.
    // 여기서 바로 타이머를 걸면 막혀 있는 동안 시간이 다 흘러, 렌더 도중 들어온 입력의 기록보다 먼저 보고해 버린다.
    // 그래서 막힘이 풀린 다음 프레임부터 기다린다
    let timer: ReturnType<typeof setTimeout> | undefined
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(reportOnce, FINALIZE_DELAY_MS)
    })

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      reportOnce()
    }
  }, [isQuerying])
}
