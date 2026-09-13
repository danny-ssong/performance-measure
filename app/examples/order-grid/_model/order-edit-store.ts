import type { OrderRowResponse, OrderStringField } from './types'

export type OrderRowEdits = Partial<Pick<OrderRowResponse, OrderStringField>>

export type OrderEditStore = {
  getEdits: (rowId: string) => OrderRowEdits | undefined
  recordEdit: (rowId: string, field: OrderStringField, value: string) => void
}

/**
 * 행 id별 편집값 보관소.
 *
 * 가상화 테이블은 화면 밖으로 나간 행을 언마운트하므로, 비제어 셀의 DOM에만 남아 있던 입력값이 사라진다.
 * 입력값을 여기에 적어두고 행이 다시 마운트될 때 defaultValue로 되돌려준다.
 * React 상태가 아니므로 입력해도 테이블이 리렌더되지 않는다.
 */
export function createOrderEditStore(): OrderEditStore {
  const editsByRowId = new Map<string, OrderRowEdits>()

  return {
    getEdits: (rowId) => editsByRowId.get(rowId),
    recordEdit: (rowId, field, value) => {
      editsByRowId.set(rowId, { ...editsByRowId.get(rowId), [field]: value })
    },
  }
}
