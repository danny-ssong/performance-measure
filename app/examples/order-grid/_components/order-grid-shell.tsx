'use client'

import { useDeferredValue, useState, type ReactNode } from 'react'
import { useQueryResponsiveness } from '@/hooks/use-query-responsiveness'
import { cn } from '@/lib/utils'
import { useOrderList } from '../_hooks/use-order-list'
import type { OrderRowCount } from '../_model/options'
import type { OrderRowResponse } from '../_model/types'
import { OrderSearchBar } from './order-search-bar'

/**
 * 결과 렌더의 우선순위.
 * - `urgent`: 응답을 받은 프레임에서 그대로 그린다
 * - `deferred`: useDeferredValue로 급하지 않은 작업으로 미뤄, 렌더 도중 들어온 입력을 먼저 처리하게 한다.
 *   React는 재조정을 작은 태스크로 쪼개 양보하므로 입력이 막히는 시간이 줄어든다.
 *   다만 커밋(DOM 삽입)과 그 뒤의 스타일·레이아웃은 쪼개지지 않으므로, 그리는 노드 수 자체가 많으면 효과가 제한된다
 */
export type ResultPriority = 'urgent' | 'deferred'

type OrderGridShellProps = {
  /** 측정 이벤트에서 어느 그리드인지 구분하는 이름 (예: 'order-grid/virtualized') */
  measurementScope: string
  /**
   * 결과 렌더를 미룰지 여부. 기본은 미루지 않는다.
   *
   * 테이블 구현이 아니라 셸이 들고 있는 이유가 두 가지다.
   * 1. 트랜지션 적용 여부는 테이블의 성질이 아니라 측정 시나리오의 축이다 — 같은 테이블에 켜고 끌 수 있어야 한다
   * 2. 셸이 미루기를 직접 해야 "결과가 언제 실제로 화면에 있는지"를 알 수 있다.
   *    이 시각이 측정 구간의 끝이고, 테이블 안에서 미루면 셸은 그 시점을 알 수 없다
   */
  resultPriority?: ResultPriority
  /** 조회된 행을 어떤 테이블로 그릴지 — 일반/가상화 등 테이블 구현만 갈아끼울 수 있게 열어둔 슬롯 */
  renderTable: (rows: OrderRowResponse[]) => ReactNode
}

/** 조회 조건·조회 상태·결과 요약을 담당하는 주문 그리드 공통 틀 */
export function OrderGridShell({
  measurementScope,
  resultPriority = 'urgent',
  renderTable,
}: OrderGridShellProps) {
  // 선택만 한 건수(draft)와 조회 버튼으로 확정된 건수(applied)를 분리 — 라디오를 바꾸는 것만으로는 요청하지 않는다
  const [draftRowCount, setDraftRowCount] = useState<OrderRowCount>(200)
  const [appliedRowCount, setAppliedRowCount] = useState<OrderRowCount | null>(null)
  const { data, isFetching, isError, refetch } = useOrderList(appliedRowCount)

  const rows = data?.items ?? null
  // 훅은 조건 없이 부르고 결과만 골라 쓴다. 초기값을 null로 넘겨야 캐시가 이미 채워진 채 마운트될 때도 첫 렌더를 미룬다
  const deferredRows = useDeferredValue(rows, null)
  const renderedRows = resultPriority === 'deferred' ? deferredRows : rows

  // 결과는 화면에 그리지 않고 분석 도구·자동화 측정으로만 내보낸다. 상태를 두지 않아 이 셸을 리렌더하지 않는다
  useQueryResponsiveness({
    isQuerying: isFetching,
    // 구간의 끝은 "조회 완료"가 아니라 "이 행들이 화면에 그려진 뒤"다 — 미룬 렌더가 구간 밖으로 빠지지 않게 한다
    renderedResult: renderedRows,
    // 미룬 렌더가 아직 따라잡지 못했으면 화면에 있는 건 최신 결과가 아니다
    isResultSettled: renderedRows === rows,
    analyticsContext: { scope: measurementScope, rowCount: appliedRowCount ?? 0 },
  })

  const handleSearch = () => {
    // 같은 조건으로 다시 누르면 쿼리 키가 그대로라 상태 변경만으로는 요청이 나가지 않으므로 직접 refetch
    if (draftRowCount === appliedRowCount) {
      void refetch()
      return
    }
    setAppliedRowCount(draftRowCount)
  }

  return (
    <div className="flex flex-col gap-3">
      <OrderSearchBar
        rowCount={draftRowCount}
        onRowCountChange={setDraftRowCount}
        onSearch={handleSearch}
        isSearching={isFetching}
      />

      <p className="text-sm text-muted-foreground">
        {data ? `총 ${data.total.toLocaleString('ko-KR')}건` : '조회 버튼을 눌러 주문 목록을 불러오세요.'}
      </p>

      {isError && <p className="text-sm text-destructive">주문 목록을 불러오지 못했습니다.</p>}

      {renderedRows && (
        <div className={cn('transition-opacity', isFetching && 'opacity-50')}>
          {renderTable(renderedRows)}
        </div>
      )}
    </div>
  )
}
